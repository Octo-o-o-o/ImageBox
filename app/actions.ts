'use server';

import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { mapParametersForAPI } from '@/lib/modelParameters';
import sharp from 'sharp';

// Thumbnail configuration
const THUMBNAIL_SIZE = 384; // px - good balance between quality and size
const THUMBNAIL_QUALITY = 80; // JPEG quality

// --- Types ---

// --- Settings & Models ---

export async function getSettings() {
  const settings = await prisma.setting.findMany();
  return settings.reduce((acc: Record<string, string>, curr: { key: string; value: string }) => ({ ...acc, [curr.key]: curr.value }), {} as Record<string, string>);
}

export async function saveSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

// --- Providers ---

export async function getProviders() {
  return await prisma.provider.findMany({ orderBy: { name: 'asc' } });
}

export async function saveProvider(data: { 
    id?: string; 
    name: string; 
    type: string; 
    baseUrl?: string; 
    apiKey?: string;
    localBackend?: string;
    localModelPath?: string;
}) {
    if (data.id) {
        return await prisma.provider.update({ where: { id: data.id }, data });
    } else {
        return await prisma.provider.create({ data });
    }
}

export async function deleteProvider(id: string) {
    return await prisma.provider.delete({ where: { id } });
}

// --- Models ---

export async function getModels() {
  return await prisma.aIModel.findMany({ 
      orderBy: { name: 'asc' },
      include: { provider: true }
  });
}

export async function saveModel(data: { id?: string; name: string; modelIdentifier: string; type: string; providerId: string; parameterConfig?: string }) {
  // Extract only the fields that should be saved (exclude id, createdAt, and any relation objects)
  const { id, name, modelIdentifier, type, providerId, parameterConfig } = data;
  const saveData = { name, modelIdentifier, type, providerId, parameterConfig };

  if (id) {
    return await prisma.aIModel.update({ where: { id }, data: saveData });
  } else {
    return await prisma.aIModel.create({ data: saveData });
  }
}

export async function deleteModel(id: string) {
  return await prisma.aIModel.delete({ where: { id } });
}

export async function hasImageGenerationModel() {
  const count = await prisma.aIModel.count({
    where: { type: 'IMAGE' }
  });
  return count > 0;
}

// --- Templates ---

export async function getTemplates() {
  return await prisma.template.findMany({ 
    orderBy: { createdAt: 'desc' },
    include: { promptGenerator: true, imageGenerator: true }
  });
}

export async function createTemplate(data: { name: string; promptTemplate: string; promptGeneratorId?: string; imageGeneratorId?: string; defaultParams: string; systemPrompt?: string }) {
  return await prisma.template.create({ data });
}

export async function deleteTemplate(id: string) {
  return await prisma.template.delete({ where: { id } });
}

export async function updateTemplate(id: string, data: { name: string; promptTemplate: string; promptGeneratorId?: string; imageGeneratorId?: string; defaultParams: string; systemPrompt?: string }) {
  return await prisma.template.update({ where: { id }, data });
}

// --- Logic Helpers ---

async function getClientForModel(modelId: string) {
  const modelDef = await prisma.aIModel.findUnique({
      where: { id: modelId },
      include: { provider: true }
  });

  if (!modelDef || !modelDef.provider) throw new Error('未找到模型或服务商配置');

  const provider = modelDef.provider;
  const globalSettings = await getSettings();

  // Determine API Key: Provider Specific > Global Fallback (for backward compat if needed, though we moved to providers)
  // Logic: Use Provider Key. If provider key is empty, check if it's "Official" Gemini/OpenAI and try global key.
  let apiKey = provider.apiKey;
  if (!apiKey) {
      if (provider.type === 'GEMINI') apiKey = globalSettings['GEMINI_API_KEY'];
      if (provider.type === 'OPENAI') apiKey = globalSettings['OPENAI_API_KEY'];
  }

  if (provider.type === 'GEMINI') {
    if (!apiKey) throw new Error('未设置 Gemini 的 API 密钥');

    // Always use official Google Gemini SDK for GEMINI type
    const genAI = new GoogleGenerativeAI(apiKey);
    return { type: 'GEMINI', client: genAI, modelId: modelDef.modelIdentifier, baseUrl: provider.baseUrl };
  }

  if (provider.type === 'OPENAI') {
    // OpenAI Compatible
    const client = new OpenAI({
      apiKey: apiKey || 'ignore',
      baseURL: provider.baseUrl || undefined,
    });
    return { type: 'OPENAI', client, modelId: modelDef.modelIdentifier, baseUrl: provider.baseUrl };
  }

  if (provider.type === 'LOCAL') {
    // Local model - uses OpenAI-compatible API without auth
    const client = new OpenAI({
      apiKey: 'not-needed',
      baseURL: provider.baseUrl || 'http://127.0.0.1:8080',
    });
    return { 
      type: 'LOCAL', 
      client, 
      modelId: modelDef.modelIdentifier, 
      baseUrl: provider.baseUrl,
      localBackend: provider.localBackend
    };
  }

  throw new Error(`Unknown provider type: ${provider.type}`);
}

// --- Generation Actions ---

export async function generateTextAction(modelId: string, prompt: string, systemInstruction?: string, configParams: any = {}) {
  const startTime = Date.now();
  let runLogId = '';

  try {
    // Fetch model and provider info for logging
    const modelDef = await prisma.aIModel.findUnique({
      where: { id: modelId },
      include: { provider: true }
    });
    const modelDisplayName = modelDef?.provider?.name && modelDef?.name
      ? `${modelDef.provider.name}+${modelDef.name}`
      : modelDef?.name || modelId;

    // 1. Start Log
    const log = await prisma.runLog.create({
      data: {
        type: 'PROMPT_GEN',
        status: 'RUNNING',
        modelUsed: modelDisplayName,
        actualInput: prompt,
        configParams: JSON.stringify(configParams),
      }
    });
    runLogId = log.id;

    const wrapper = await getClientForModel(modelId);
    let outputText = '';

    if (wrapper.type === 'GEMINI') {
      const requestOptions: any = {};
      if (wrapper.baseUrl) requestOptions.baseUrl = wrapper.baseUrl;

      const model = (wrapper.client as GoogleGenerativeAI).getGenerativeModel({ 
        model: wrapper.modelId,
        systemInstruction: systemInstruction || undefined
      }, requestOptions);
      const result = await model.generateContent(prompt);
      outputText = result.response.text();
    } 
    else if (wrapper.type === 'OPENAI') {
      const messages: any[] = [];
      if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
      messages.push({ role: 'user', content: prompt });
      
      const completion = await (wrapper.client as OpenAI).chat.completions.create({
        model: wrapper.modelId,
        messages,
      });
      outputText = completion.choices[0].message.content || '';
    }
    else {
        throw new Error('当前服务商类型暂未实现文本生成');
    }

    // 2. Success Log
    await prisma.runLog.update({
      where: { id: runLogId },
      data: {
        status: 'SUCCESS',
        output: outputText,
        completionTime: new Date(),
        duration: Date.now() - startTime
      }
    });

    return { success: true, text: outputText, runId: runLogId };

  } catch (e: any) {
    console.error("文本生成出错:", e);
    // 3. Error Log
    if (runLogId) {
        await prisma.runLog.update({
            where: { id: runLogId },
            data: {
                status: 'FAILURE',
                output: e.message,
                completionTime: new Date(),
                duration: Date.now() - startTime
            }
        });
    }
    return { success: false, error: e.message };
  }
}

export async function generateImageAction(modelId: string, prompt: string, params: any, parentTaskId?: string, templateId?: string, folderId?: string) {
  const startTime = Date.now();
  let runLogId = '';

  try {
    // Fetch model and provider info for logging
    const modelDef = await prisma.aIModel.findUnique({
      where: { id: modelId },
      include: { provider: true }
    });
    const modelDisplayName = modelDef?.provider?.name && modelDef?.name
      ? `${modelDef.provider.name}+${modelDef.name}`
      : modelDef?.name || modelId;

    if (!modelDef || !modelDef.provider) {
      throw new Error('未找到模型或服务商配置');
    }

    // Map parameters based on provider type
    const mappedParams = mapParametersForAPI(
      modelDef.provider.type,
      modelDef.provider.baseUrl || null,
      params
    );

    // 1. Start Log
    const log = await prisma.runLog.create({
      data: {
        type: 'IMAGE_GEN',
        status: 'RUNNING',
        modelUsed: modelDisplayName,
        actualInput: prompt,
        parentTaskId: parentTaskId || null,
        configParams: JSON.stringify(mappedParams),
      }
    });
    runLogId = log.id;

    const wrapper = await getClientForModel(modelId);
    let base64Images: string[] = [];

    // Check if using Grsai custom API
    if (mappedParams._useGrsaiAPI) {
      const baseUrl = modelDef.provider.baseUrl;
      const apiKey = modelDef.provider.apiKey;

      if (!baseUrl || !apiKey) {
        throw new Error('Grsai API 需要配置 baseUrl 和 apiKey');
      }

      // Build Grsai API request
      const requestBody: any = {
        model: modelDef.modelIdentifier,
        prompt: prompt,
      };

      if (mappedParams.aspectRatio) {
        requestBody.aspectRatio = mappedParams.aspectRatio;
      }

      if (mappedParams.imageSize) {
        requestBody.imageSize = mappedParams.imageSize;
      }

      // Convert reference images from base64 data URLs to URLs or Base64
      if (mappedParams.refImages && Array.isArray(mappedParams.refImages)) {
        requestBody.urls = mappedParams.refImages;
      }

      // Use stream response (not webhook)
      // Don't set webHook parameter to use default stream response

      // Call Grsai API
      const apiUrl = `${baseUrl.replace(/\/$/, '')}/v1/draw/nano-banana`;

      console.log('[Grsai] Request URL:', apiUrl);
      console.log('[Grsai] Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Grsai API 错误 (${response.status}): ${errorText}`);
      }

      // Parse stream response (chunked JSON)
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: any = null;
      let allChunks: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        allChunks.push(chunk);
        buffer += chunk;

        // Try to parse each line as JSON
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              // Remove SSE "data: " prefix if present
              let jsonStr = line.trim();
              if (jsonStr.startsWith('data: ')) {
                jsonStr = jsonStr.substring(6); // Remove "data: "
              }

              if (!jsonStr) continue; // Skip empty lines

              const data = JSON.parse(jsonStr);
              console.log('[Grsai] Parsed chunk:', JSON.stringify(data, null, 2));
              finalResult = data; // Keep latest result

              // Check for errors
              if (data.status === 'failed') {
                throw new Error(`生成失败: ${data.failure_reason || data.error || '未知错误'}`);
              }
            } catch (e) {
              if (e instanceof Error && e.message.startsWith('生成失败')) {
                throw e;
              }
              console.log('[Grsai] Failed to parse line:', line);
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }

      // Process final buffer
      if (buffer.trim()) {
        console.log('[Grsai] Final buffer:', buffer);
        try {
          // Remove SSE "data: " prefix if present
          let jsonStr = buffer.trim();
          if (jsonStr.startsWith('data: ')) {
            jsonStr = jsonStr.substring(6);
          }

          if (jsonStr) {
            const data = JSON.parse(jsonStr);
            console.log('[Grsai] Final parsed data:', JSON.stringify(data, null, 2));
            finalResult = data;

            if (data.status === 'failed') {
              throw new Error(`生成失败: ${data.failure_reason || data.error || '未知错误'}`);
            }
          }
        } catch (e) {
          if (e instanceof Error && e.message.startsWith('生成失败')) {
            throw e;
          }
          console.log('[Grsai] Failed to parse final buffer');
        }
      }

      console.log('[Grsai] All chunks received:', allChunks.join(''));
      console.log('[Grsai] Final result:', JSON.stringify(finalResult, null, 2));

      if (!finalResult || !finalResult.results || finalResult.results.length === 0) {
        throw new Error('未获得图片返回');
      }

      // Download images and convert to base64
      for (const result of finalResult.results) {
        if (result.url) {
          const imgRes = await fetch(result.url);
          if (!imgRes.ok) {
            throw new Error(`下载图片失败 (${imgRes.status}): ${result.url}`);
          }
          const arrayBuffer = await imgRes.arrayBuffer();
          const b64 = Buffer.from(arrayBuffer).toString('base64');
          const mime = imgRes.headers.get('content-type') || 'image/png';
          base64Images.push(`data:${mime};base64,${b64}`);
        }
      }

      if (base64Images.length === 0) {
        throw new Error('未能从 Grsai 响应中提取图片');
      }
    }

    else if (wrapper.type === 'GEMINI') {
      const generationConfig: any = {};

      // Use mapped parameters from parameter mapping system
      if (mappedParams.responseModalities) {
        generationConfig.responseModalities = mappedParams.responseModalities;
      }

      // imageConfig (aspectRatio and/or imageSize)
      if (mappedParams.imageConfig) {
        generationConfig.imageConfig = mappedParams.imageConfig;
      }

      const requestOptions: any = {};
      // Pass baseUrl to requestOptions if present
      if ((wrapper as any).baseUrl) requestOptions.baseUrl = (wrapper as any).baseUrl;

      const model = (wrapper.client as GoogleGenerativeAI).getGenerativeModel({
        model: wrapper.modelId,
        generationConfig: Object.keys(generationConfig).length > 0 ? generationConfig : undefined
      }, requestOptions);

      // Construct Prompt Parts
      const parts: any[] = [{ text: prompt }];

      if (mappedParams.refImages && Array.isArray(mappedParams.refImages)) {
          for (const imgStr of mappedParams.refImages) {
              // imgStr is expected to be "data:image/png;base64,..."
              const match = imgStr.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
              if (match) {
                  parts.push({
                      inlineData: {
                          mimeType: match[1],
                          data: match[2]
                      }
                  });
              }
          }
      }

      const result = await model.generateContent(parts);
      const response = await result.response;

      if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
            base64Images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
          }
        }
      }
      if (base64Images.length === 0) throw new Error(`未获得图片返回，响应内容：${response.text().substring(0, 100)}`);
    }
    
    else if (wrapper.type === 'OPENAI') {
       const baseUrl = (wrapper as any).baseUrl;
       // Treat as official OpenAI if baseUrl is empty OR equals official OpenAI URL
       const isOfficialOpenAI = !baseUrl || baseUrl === 'https://api.openai.com/v1' || baseUrl === 'https://api.openai.com';

       // If using custom baseUrl (OpenRouter, etc.), use Chat Completions API
       // Official OpenAI DALL-E uses images.generate API
       if (!isOfficialOpenAI) {
           // Chat Completions API for OpenRouter and other compatible services
           const messages: any[] = [];

           const userContent: any[] = [{ type: 'text', text: prompt }];

           if (mappedParams.refImages && Array.isArray(mappedParams.refImages)) {
               mappedParams.refImages.forEach((img: string) => {
                   userContent.push({
                       type: 'image_url',
                       image_url: { url: img } // img is already base64 data url
                   });
               });
           }

           messages.push({ role: 'user', content: userContent });

           const extraBody: any = {};

           // Check if this is Gemini-specific (requires modalities)
           const isGemini = (wrapper as any).isGemini || wrapper.modelId.toLowerCase().includes('gemini');
           if (isGemini) {
               extraBody.modalities = ["image", "text"];
               extraBody.image_config = {};
           }

           // Add image generation parameters (works for most providers)
           if (mappedParams.aspectRatio || mappedParams.imageSize) {
               if (!extraBody.image_config) extraBody.image_config = {};
               if (mappedParams.aspectRatio) extraBody.image_config.aspect_ratio = mappedParams.aspectRatio;
               if (mappedParams.imageSize) extraBody.image_config.image_size = mappedParams.imageSize;
           }

           // Call Chat Completions API
           const completion = await (wrapper.client as any).chat.completions.create({
               model: wrapper.modelId,
               messages: messages,
               ...extraBody
           });

           // Try to extract image from response in multiple ways
           let imageFound = false;

           // Method 1: Check all choices for images
           for (const choice of completion.choices || []) {
               const message = choice.message;

               // Check for images array (OpenRouter Gemini format)
               if (Array.isArray(message?.images) && message.images.length > 0) {
                   for (const imgObj of message.images) {
                       if (imgObj.type === 'image_url' && imgObj.image_url?.url) {
                           const imageUrl = imgObj.image_url.url;

                           // If already base64 data URL
                           if (imageUrl.startsWith('data:image/')) {
                               base64Images.push(imageUrl);
                               imageFound = true;
                           }
                           // If HTTP URL, download it
                           else if (imageUrl.startsWith('http')) {
                               const imgRes = await fetch(imageUrl);
                               if (!imgRes.ok) {
                                   throw new Error(`下载图片失败 (${imgRes.status}): ${imageUrl}`);
                               }
                               const arrayBuffer = await imgRes.arrayBuffer();
                               const b64 = Buffer.from(arrayBuffer).toString('base64');
                               const mime = imgRes.headers.get('content-type') || 'image/png';
                               base64Images.push(`data:${mime};base64,${b64}`);
                               imageFound = true;
                           }
                       }
                   }
                   if (imageFound) break;
               }

               // Check if content is a string (fallback)
               if (!imageFound && typeof message?.content === 'string') {
                   const content = message.content;

                   // Try to extract URL (markdown or plain URL)
                   const urlMatch = content.match(/!\[.*?\]\((.*?)\)/) || content.match(/https?:\/\/[^\s)]+/);
                   if (urlMatch) {
                       const imageUrl = urlMatch[1] || urlMatch[0];

                       // Download image to convert to base64
                       const imgRes = await fetch(imageUrl);
                       if (!imgRes.ok) {
                           throw new Error(`下载图片失败 (${imgRes.status}): ${imageUrl}`);
                       }
                       const arrayBuffer = await imgRes.arrayBuffer();
                       const b64 = Buffer.from(arrayBuffer).toString('base64');
                       const mime = imgRes.headers.get('content-type') || 'image/png';
                       base64Images.push(`data:${mime};base64,${b64}`);
                       imageFound = true;
                       break;
                   }

                   // Check if content itself is base64 image data
                   if (content.length > 100 && /^[A-Za-z0-9+/=]+$/.test(content.substring(0, 100))) {
                       base64Images.push(`data:image/png;base64,${content}`);
                       imageFound = true;
                       break;
                   }
               }

               // Check if content is an array (OpenAI vision format)
               if (!imageFound && Array.isArray(message?.content)) {
                   for (const part of message.content) {
                       if (part.type === 'image_url' && part.image_url?.url) {
                           const imageUrl = part.image_url.url;

                           // If already base64 data URL
                           if (imageUrl.startsWith('data:image/')) {
                               base64Images.push(imageUrl);
                               imageFound = true;
                               break;
                           }

                           // If HTTP URL, download it
                           if (imageUrl.startsWith('http')) {
                               const imgRes = await fetch(imageUrl);
                               if (!imgRes.ok) {
                                   throw new Error(`下载图片失败 (${imgRes.status}): ${imageUrl}`);
                               }
                               const arrayBuffer = await imgRes.arrayBuffer();
                               const b64 = Buffer.from(arrayBuffer).toString('base64');
                               const mime = imgRes.headers.get('content-type') || 'image/png';
                               base64Images.push(`data:${mime};base64,${b64}`);
                               imageFound = true;
                               break;
                           }
                       }
                   }
                   if (imageFound) break;
               }
           }

           if (!imageFound) {
               // Detailed error with response structure
               const firstChoice = completion.choices?.[0];
               throw new Error(
                   `无法从响应中解析图片。\n` +
                   `Choices 数量: ${completion.choices?.length}\n` +
                   `第一个 choice 的 content 类型: ${typeof firstChoice?.message?.content}\n` +
                   `第一个 choice 的 content: ${JSON.stringify(firstChoice?.message?.content)?.substring(0, 200)}\n` +
                   `完整响应: ${JSON.stringify(completion, null, 2).substring(0, 1500)}`
               );
           }

       } else {
           // Official OpenAI DALL-E - use images.generate API
           const requestBody: any = {
             model: wrapper.modelId,
             prompt: prompt,
             n: 1,
             size: mappedParams.size || "1024x1024",
             response_format: "b64_json"
           };

           // Add quality and style if provided
           if (mappedParams.quality) requestBody.quality = mappedParams.quality;
           if (mappedParams.style) requestBody.style = mappedParams.style;

           const response = await (wrapper.client as OpenAI).images.generate(requestBody);
           base64Images = response.data?.map(d => `data:image/png;base64,${d.b64_json}`) || [];
       }
    }
    else if (wrapper.type === 'LOCAL') {
      // Local model - uses OpenAI-compatible API format
      // For stable-diffusion.cpp server or other local services
      const localBackend = (wrapper as any).localBackend || 'SD_CPP';
      
      if (localBackend === 'SD_CPP') {
        // stable-diffusion.cpp uses /txt2img endpoint
        const baseUrl = (wrapper as any).baseUrl || 'http://127.0.0.1:8080';
        
        // Calculate dimensions based on aspect ratio and image size
        const aspectRatio = params.aspectRatio || '1:1';
        const imageSize = params.imageSize || '1K';
        const [w, h] = aspectRatio.split(':').map(Number);
        const baseSize = imageSize === '2K' ? 2048 : imageSize === '4K' ? 4096 : 1024;
        
        let width: number, height: number;
        if (w > h) {
          width = baseSize;
          height = Math.round(baseSize * h / w);
        } else {
          height = baseSize;
          width = Math.round(baseSize * w / h);
        }
        // Round to multiple of 64 (required by diffusion models)
        width = Math.round(width / 64) * 64;
        height = Math.round(height / 64) * 64;
        
        const requestBody = {
          prompt: prompt,
          negative_prompt: params.negativePrompt || '',
          width: width,
          height: height,
          steps: params.steps || 8,
          cfg_scale: params.cfgScale || 0,
          seed: params.seed || -1,
          batch_size: params.numberOfImages || 1,
        };
        
        const response = await fetch(`${baseUrl}/txt2img`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`本地服务返回错误 (${response.status}): ${errorText}`);
        }
        
        const data = await response.json();
        
        // sd.cpp returns images in base64 format
        if (data.images && Array.isArray(data.images)) {
          for (const img of data.images) {
            if (typeof img === 'string') {
              // Already base64
              base64Images.push(img.startsWith('data:') ? img : `data:image/png;base64,${img}`);
            } else if (img.data) {
              base64Images.push(`data:image/png;base64,${img.data}`);
            }
          }
        } else if (data.image) {
          // Single image response
          base64Images.push(data.image.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`);
        }
        
        if (base64Images.length === 0) {
          throw new Error('本地服务未返回有效图片');
        }
      } else {
        // For COMFYUI or other local backends, use OpenAI-compatible API
        // Similar to OpenRouter handling
        const messages: any[] = [];
        const userContent: any[] = [{ type: 'text', text: prompt }];
        messages.push({ role: 'user', content: userContent });
        
        const completion = await (wrapper.client as OpenAI).chat.completions.create({
          model: wrapper.modelId,
          messages: messages,
        });
        
        // Try to extract image from response
        for (const choice of completion.choices || []) {
          const message = choice.message;
          if (typeof message?.content === 'string' && message.content.length > 100) {
            // Check if it's base64 image data
            if (/^[A-Za-z0-9+/=]+$/.test(message.content.substring(0, 100))) {
              base64Images.push(`data:image/png;base64,${message.content}`);
            }
          }
        }
        
        if (base64Images.length === 0) {
          throw new Error('本地服务未返回有效图片');
        }
      }
    }
    else {
        throw new Error('当前服务商类型暂未实现图像生成');
    }

    // 2. Save Images & Collect Paths
    const imageResults: { id: string, url: string, prompt: string }[] = [];
    const savedPaths: string[] = [];

    const modelName = (await prisma.aIModel.findUnique({ where: { id: modelId } }))?.name || '未知';

    for (const base64 of base64Images) {
        // Reuse saveGeneratedImage Logic internally
        const saved = await saveGeneratedImage(base64, prompt, modelName, JSON.stringify(params), templateId, folderId);
        imageResults.push({ id: saved.id, url: saved.path, prompt });
        savedPaths.push(saved.path);
    }

    // 3. Success Log
    await prisma.runLog.update({
        where: { id: runLogId },
        data: {
            status: 'SUCCESS',
            output: savedPaths.join(', '), // Store comma separated paths
            completionTime: new Date(),
            duration: Date.now() - startTime
        }
    });

    return { success: true, images: imageResults, runId: runLogId };

  } catch (e: any) {
    console.error("图像生成出错:", e);
     if (runLogId) {
         await prisma.runLog.update({
             where: { id: runLogId },
             data: {
                 status: 'FAILURE',
                 output: e.message,
                 completionTime: new Date(),
                 duration: Date.now() - startTime
             }
         });
     }
     return { success: false, error: e.message };
  }
}

export async function saveGeneratedImage(base64Data: string, finalPrompt: string, modelName: string, params: string, templateId?: string, folderId?: string) {
  const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ""), 'base64');
  // Determine target directory
  let targetFolderId = folderId;
  let subDir = '';
  
  if (targetFolderId) {
    const folder = await prisma.folder.findUnique({ where: { id: targetFolderId } });
    if (folder && !folder.isDefault) {
       subDir = folder.name; // Use folder name as subdirectory
    } else if (!folder) {
        // If provided folder ID is invalid, fallback to default
        targetFolderId = undefined;
    }
  }

  if (!targetFolderId) {
    const defaultFolder = await ensureDefaultFolder();
    targetFolderId = defaultFolder.id;
    // Default folder uses root directory (subDir = '')
  }

  const filename = `${Date.now()}-${uuidv4()}.png`;
  const thumbnailFilename = `thumb_${filename.replace('.png', '.jpg')}`; // Use JPEG for smaller size
  
  // Construct paths
  // If subDir is present, path is /generated/subDir/filename
  const relativePath = subDir 
      ? `/generated/${subDir}/${filename}`
      : `/generated/${filename}`;
  const thumbnailPath = `/generated/thumbnails/${thumbnailFilename}`;
  
  // Get storage path from config (for full-size images)
  const storagePath = await getActualStoragePath();
  const targetDir = subDir ? path.join(storagePath, subDir) : storagePath;
  
  // Thumbnails always go to project's public directory
  const thumbnailDir = path.join(process.cwd(), 'public', 'generated', 'thumbnails');

  // Ensure directories exist
  try { await fs.access(targetDir); } catch { await fs.mkdir(targetDir, { recursive: true }); }
  try { await fs.access(thumbnailDir); } catch { await fs.mkdir(thumbnailDir, { recursive: true }); }

  // Save original image to configured storage path
  await fs.writeFile(path.join(targetDir, filename), buffer);

  // Generate and save thumbnail
  try {
    await sharp(buffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'centre'
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toFile(path.join(thumbnailDir, thumbnailFilename));
  } catch (e) {
    console.error('Failed to generate thumbnail:', e);
    // Continue without thumbnail if it fails
  }

  const image = await prisma.image.create({
    data: {
      path: relativePath,
      thumbnailPath,
      finalPrompt,
      modelName,
      params,
      templateId,
      folderId: targetFolderId
    }
  });

  return image;
}

// --- Run Logs ---

export async function getRunLogs(filters?: { type?: string, status?: string, start?: Date, end?: Date }) {
  const where: any = {};
  if (filters?.type) where.type = filters.type;
  if (filters?.status) where.status = filters.status;
  if (filters?.start || filters?.end) {
    where.requestTime = {};
    if (filters.start) where.requestTime.gte = filters.start;
    if (filters.end) where.requestTime.lte = filters.end;
  }

  return await prisma.runLog.findMany({
    where,
    orderBy: { requestTime: 'desc' }
  });
}

// --- Folders ---

export async function ensureDefaultFolder() {
  const existing = await prisma.folder.findFirst({
    where: { isDefault: true }
  });

  if (!existing) {
    return await prisma.folder.create({
      data: {
        name: 'default',
        isDefault: true
      }
    });
  }

  return existing;
}

export async function getFolders() {
  // Ensure default folder exists before returning list
  await ensureDefaultFolder();

  return await prisma.folder.findMany({
    orderBy: [
      { isDefault: 'desc' },
      { createdAt: 'asc' }
    ],
    include: {
      _count: {
        select: { images: true }
      }
    }
  });
}

export async function createFolder(name: string) {
  // Create physical folder
  const storagePath = await getActualStoragePath();
  const folderPath = path.join(storagePath, name);
  
  try {
    await fs.mkdir(folderPath, { recursive: true });
  } catch (e) {
    console.error('Failed to create local folder:', e);
    // Proceed - maybe it exists or permission issue, but DB record can still be created?
    // User requested "also create same-name folder". If fails, we probably should warn but not block logic if safely ignoring.
  }

  return await prisma.folder.create({
    data: { name }
  });
}

export async function updateFolder(id: string, name: string) {
  const folder = await prisma.folder.findUnique({ where: { id } });
  if (!folder) throw new Error('Folder not found');
  
  if (folder.name !== name) {
      // Try to rename physical folder
      const storagePath = await getActualStoragePath();
      const oldPath = path.join(storagePath, folder.name);
      const newPath = path.join(storagePath, name);
      
      try {
          // Only rename if old path exists
          await fs.access(oldPath);
          await fs.rename(oldPath, newPath);
          
          // Should we update paths of images in DB?
          // Since image.path includes folder name (e.g. /generated/oldName/img.png), we MUST update them.
          const images = await prisma.image.findMany({ where: { folderId: id } });
          for (const img of images) {
              const filename = path.basename(img.path);
              // Old path in DB: /generated/oldName/filename OR /generated/filename (if migrated)
              // We construct new relative path
              const newRelativePath = `/generated/${name}/${filename}`;
              await prisma.image.update({
                  where: { id: img.id },
                  data: { path: newRelativePath }
              });
          }
      } catch (e) {
          console.error('Failed to rename local folder or update images:', e);
          // If old folder didn't exist, we might just be creating the new one?
          // If it failed, we proceed with DB update but warn?
      }
  }

  return await prisma.folder.update({
    where: { id },
    data: { name }
  });
}

export async function deleteFolder(id: string) {
  const folder = await prisma.folder.findUnique({ where: { id } });

  if (!folder) throw new Error('文件夹不存在');
  if (folder.isDefault) throw new Error('无法删除默认文件夹');

  // Move images to default folder
  const defaultFolder = await ensureDefaultFolder();
  const storagePath = await getActualStoragePath();
  
  // Find images in this folder
  const images = await prisma.image.findMany({ where: { folderId: id } });
  
  // Move physical files to root (default folder location)
  for (const img of images) {
      try {
          const filename = path.basename(img.path);
          // Current physical location: storagePath/folderName/filename
          const currentPath = path.join(storagePath, folder.name, filename);
          const newPath = path.join(storagePath, filename);
          
          // Check if file exists before moving
          await fs.access(currentPath);
          await fs.rename(currentPath, newPath);
          
          // Update DB path
          await prisma.image.update({
              where: { id: img.id },
              data: { 
                  folderId: defaultFolder.id,
                  path: `/generated/${filename}`
              }
          });
      } catch (e) {
          console.error(`Failed to move image ${img.id} during folder delete:`, e);
          // Fallback: just update DB folder ID, path remains broken or points to non-existent location?
          // If we update folderId but not path, image will be "lost" physically.
          // We still update folderId so they appear in default folder (albeit broken).
          await prisma.image.update({
              where: { id: img.id },
              data: { folderId: defaultFolder.id }
          });
      }
  }

  // Try to remove the empty directory
  try {
      const folderPath = path.join(storagePath, folder.name);
      await fs.rmdir(folderPath); // rmdir only works if empty
  } catch (e) {
      console.error('Failed to remove folder directory:', e);
  }

  return await prisma.folder.delete({ where: { id } });
}

export async function getImagesByFolder(folderId?: string) {
  const images = await prisma.image.findMany({
    where: folderId ? { folderId } : {},
    orderBy: { createdAt: 'desc' },
    include: { template: true, folder: true }
  });

  // Check if local files exist
  const storagePath = await getActualStoragePath();
  
  return await Promise.all(images.map(async (img) => {
    let fileExists = true;
    try {
      // Logic mirrors saveGeneratedImage: original is in storagePath/filename
      const filename = path.basename(img.path);
      // Resolve path properly based on img.path structure
      let relativePart = img.path;
      if (relativePart.startsWith('/generated/')) {
        relativePart = relativePart.replace(/^\/generated\//, '');
      }
      const absolutePath = path.join(storagePath, relativePart);
      await fs.access(absolutePath);
    } catch {
      fileExists = false;
    }
    return { ...img, fileMissing: !fileExists };
  }));
}

export async function openLocalFolder(folderId?: string) {
    const storagePath = await getActualStoragePath();
    let targetPath = storagePath;

    if (folderId) {
        const folder = await prisma.folder.findUnique({ where: { id: folderId } });
        if (folder && !folder.isDefault) {
            targetPath = path.join(storagePath, folder.name);
        }
    }
    
    // Create if not exists (for safer UX)
    try { await fs.access(targetPath); } catch { await fs.mkdir(targetPath, { recursive: true }); }
    
    const execPromise = promisify(exec);
    try {
        if (os.platform() === 'darwin') {
           await execPromise(`open "${targetPath}"`);
        } else if (os.platform() === 'win32') {
           await execPromise(`explorer "${targetPath}"`);
        } else {
           await execPromise(`xdg-open "${targetPath}"`);
        }
        return { success: true };
    } catch (e: any) {
         console.error('Failed to open folder:', e);
         throw new Error('Failed to open folder: ' + e.message);
    }
}

export async function openImageFolder(imageId: string) {
  const image = await prisma.image.findUnique({ where: { id: imageId } });
  if (!image) throw new Error('Image not found');

  const storagePath = await getActualStoragePath();
  const filename = path.basename(image.path);
  
  // Need to resolve subdir based on image path structure or DB lookup?
  // We can trust image.path serves as source of truth for relative structure.
  // image.path = /generated/SubFolder/file.png OR /generated/file.png
  
  // However, image.path might be just /generated/file.png if we are using custom storage path logic?
  // getImageUrl logic: if starts with /generated, it's relative.
  
  // Let's rely on file finding.
  // Actually, we can just use the logic: path.join(storagePath + relativePath_without_prefix)
  
  let relativePath = image.path;
  if (relativePath.startsWith('/generated/')) {
      relativePath = relativePath.replace(/^\/generated\//, '');
  }
  
  const absolutePath = path.join(storagePath, relativePath);

  const execPromise = promisify(exec);
  
  try {
    if (os.platform() === 'darwin') {
      await execPromise(`open -R "${absolutePath}"`);
    } else if (os.platform() === 'win32') {
       await execPromise(`explorer /select,"${absolutePath}"`);
    } else {
       // Linux/Other: try xdg-open on directory
       const dir = path.dirname(absolutePath);
       await execPromise(`xdg-open "${dir}"`);
    }
    return { success: true };
  } catch (e: any) {
    console.error('Failed to open folder:', e);
    throw new Error('Failed to open folder: ' + e.message);
  }
}

export async function deleteImage(id: string) {
  const image = await prisma.image.findUnique({ where: { id } });
  if (!image) throw new Error('图片不存在');

  // Get storage path from config
  const storagePath = await getActualStoragePath();

  // Resolve absolute path from DB path
  // image.path is e.g. /generated/SubDir/img.png OR /generated/img.png
  let relativePart = image.path;
  if (relativePart.startsWith('/generated/')) {
      relativePart = relativePart.replace(/^\/generated\//, '');
  }
  const filename = path.basename(image.path); // keep just for fallback logic if needed?
  // Actually we should use the resolved relative path to find the file
  

  // Delete original file from configured storage path
  try {
    const filePath = path.join(storagePath, relativePart);
    await fs.unlink(filePath);
  } catch (e) {
    console.error('删除文件失败:', e);
    // Continue to delete DB record even if file deletion fails
  }

  // Delete thumbnail from disk (always in default location)
  if (image.thumbnailPath) {
    try {
      const cleanThumbPath = image.thumbnailPath.replace(/^\//, '');
      const thumbFilePath = path.join(process.cwd(), 'public', cleanThumbPath);
      await fs.unlink(thumbFilePath);
    } catch (e) {
      console.error('删除缩略图失败:', e);
      // Continue even if thumbnail deletion fails
    }
  }

  // Delete DB record
  return await prisma.image.delete({ where: { id } });
}

export async function toggleFavorite(id: string) {
  const image = await prisma.image.findUnique({ where: { id } });
  if (!image) throw new Error('图片不存在');
  
  return await prisma.image.update({
    where: { id },
    data: { isFavorite: !image.isFavorite }
  });
}

export async function moveImageToFolder(imageId: string, folderId: string) {
  const image = await prisma.image.findUnique({ where: { id: imageId } });
  if (!image) throw new Error('图片不存在');
  
  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  if (!folder) throw new Error('目标文件夹不存在');
  
  // Calculate paths
  const storagePath = await getActualStoragePath();
  const filename = path.basename(image.path);
  
  // Resolve current physical path
  // Relies on image.path structure.
  let currentRelative = image.path.replace(/^\/generated\//, '');
  const currentPath = path.join(storagePath, currentRelative);
  
  // Resolve new physical path
  let newRelative = '';
  if (folder.isDefault) {
      newRelative = filename; // Root
  } else {
      newRelative = path.join(folder.name, filename);
  }
  const newPath = path.join(storagePath, newRelative);
  
  // New DB Path
  const newDbPath = `/generated/${newRelative}`;
  
  // Move file
  try {
      // Ensure specific subdir exists if not default
      if (!folder.isDefault) {
          await fs.mkdir(path.join(storagePath, folder.name), { recursive: true });
      }
      
      await fs.rename(currentPath, newPath);
  } catch (e) {
      console.error('Failed to move physical file:', e);
      // Fail gracefully? Or throw?
      // Since strict consistency is asked, we should probably throw.
      throw new Error('移动文件失败，请检查文件系统权限或文件是否存在');
  }

  return await prisma.image.update({
    where: { id: imageId },
    data: { 
        folderId,
        path: newDbPath
    }
  });
}

// --- Storage Configuration ---

/**
 * 获取默认存储路径
 */
function getDefaultStoragePath() {
  return path.join(process.cwd(), 'public', 'generated');
}

/**
 * 获取存储配置
 */
export async function getStorageConfig() {
  const type = await prisma.setting.findUnique({ where: { key: 'imageStorageType' } });
  const storagePath = await prisma.setting.findUnique({ where: { key: 'imageStoragePath' } });
  
  return {
    type: (type?.value || 'local') as 'local' | 'r2',
    path: storagePath?.value || '', // 空表示默认路径
    defaultPath: getDefaultStoragePath()
  };
}

/**
 * 获取实际存储路径
 */
export async function getActualStoragePath() {
  const config = await getStorageConfig();
  if (!config.path) {
    return getDefaultStoragePath();
  }
  return config.path;
}

/**
 * 验证存储路径是否有效
 */
export async function validateStoragePath(targetPath: string): Promise<{ valid: boolean; error?: string }> {
  // 空路径表示使用默认路径，总是有效
  if (!targetPath) {
    return { valid: true };
  }
  
  // 必须是绝对路径
  if (!path.isAbsolute(targetPath)) {
    return { valid: false, error: '路径必须是绝对路径' };
  }
  
  // 尝试创建目录以验证权限
  try {
    await fs.mkdir(targetPath, { recursive: true });
    // 尝试写入测试文件
    const testFile = path.join(targetPath, '.imagebox_test');
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    return { valid: true };
  } catch (e: any) {
    return { valid: false, error: `无法写入该路径: ${e.message}` };
  }
}

/**
 * 获取存储统计信息
 */
export async function getStorageStats() {
  const imageCount = await prisma.image.count();
  const config = await getStorageConfig();
  
  return {
    imageCount,
    storagePath: config.path || config.defaultPath,
    isCustomPath: !!config.path
  };
}

/**
 * 更新存储配置并可选地迁移图片
 */
export async function updateStoragePath(
  newPath: string, 
  options: { migrate: boolean }
): Promise<{ success: boolean; error?: string; migratedCount?: number; failedCount?: number }> {
  const oldPath = await getActualStoragePath();
  const actualNewPath = newPath || getDefaultStoragePath();
  
  // 如果路径相同，直接返回
  if (oldPath === actualNewPath) {
    return { success: true, migratedCount: 0, failedCount: 0 };
  }
  
  // 验证新路径
  if (newPath) {
    const validation = await validateStoragePath(newPath);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
  }
  
  let migratedCount = 0;
  let failedCount = 0;
  
  if (options.migrate) {
    // 获取所有图片
    const images = await prisma.image.findMany();
    
    // 确保新路径存在
    await fs.mkdir(actualNewPath, { recursive: true });
    
    for (const image of images) {
      // 从 path 中提取文件名
      const filename = path.basename(image.path);
      const oldFile = path.join(oldPath, filename);
      const newFile = path.join(actualNewPath, filename);
      
      try {
        // 检查源文件是否存在
        await fs.access(oldFile);
        // 复制到新位置
        await fs.copyFile(oldFile, newFile);
        // 删除旧文件
        await fs.unlink(oldFile);
        migratedCount++;
      } catch (e) {
        console.error(`迁移文件失败: ${filename}`, e);
        failedCount++;
      }
    }
  }
  
  // 更新配置
  await prisma.setting.upsert({
    where: { key: 'imageStorageType' },
    update: { value: 'local' },
    create: { key: 'imageStorageType', value: 'local' }
  });
  await prisma.setting.upsert({
    where: { key: 'imageStoragePath' },
    update: { value: newPath },
    create: { key: 'imageStoragePath', value: newPath }
  });
  
  return { success: true, migratedCount, failedCount };
}

// --- Remote Access ---

/**
 * 获取远程访问开关状态
 */
export async function getRemoteAccessEnabled(): Promise<boolean> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'remoteAccessEnabled' }
  });
  return setting?.value === 'true';
}

/**
 * 设置远程访问开关
 */
export async function setRemoteAccessEnabled(enabled: boolean) {
  await prisma.setting.upsert({
    where: { key: 'remoteAccessEnabled' },
    update: { value: enabled ? 'true' : 'false' },
    create: { key: 'remoteAccessEnabled', value: enabled ? 'true' : 'false' }
  });
}

/**
 * 生成随机授权码
 */
function generateToken(): string {
  // 排除容易混淆的字符: 0, O, o, 1, l, I
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * 获取所有授权码（返回完整token，个人项目无需隐藏）
 */
export async function getAccessTokens() {
  const tokens = await prisma.accessToken.findMany({
    orderBy: { createdAt: 'desc' }
  });
  
  return tokens.map(t => ({
    ...t,
    isExpired: t.expiresAt < new Date()
  }));
}

/**
 * 创建授权码（简化版，自动生成名称）
 * @param expiresIn 有效期（小时），-1 表示永久
 * @returns 包含完整 token 的对象
 */
export async function createAccessToken(expiresIn: number) {
  const token = generateToken();
  
  // 计算过期时间
  let expiresAt: Date;
  if (expiresIn === -1) {
    // 永久：设置为100年后
    expiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
  } else {
    expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);
  }
  
  // 自动生成名称：Token + 序号
  const count = await prisma.accessToken.count();
  const name = `Token ${count + 1}`;
  
  const accessToken = await prisma.accessToken.create({
    data: {
      name,
      token,
      expiresAt
    }
  });
  
  return {
    id: accessToken.id,
    name: accessToken.name,
    description: accessToken.description,
    token: accessToken.token,
    expiresAt: accessToken.expiresAt,
    createdAt: accessToken.createdAt
  };
}

/**
 * 更新授权码描述/备注
 */
export async function updateAccessTokenDescription(id: string, description: string) {
  return await prisma.accessToken.update({
    where: { id },
    data: { description: description || null }
  });
}

/**
 * 删除授权码
 */
export async function deleteAccessToken(id: string) {
  return await prisma.accessToken.delete({
    where: { id }
  });
}

/**
 * 撤销授权码（软删除）
 */
export async function revokeAccessToken(id: string) {
  return await prisma.accessToken.update({
    where: { id },
    data: { isRevoked: true }
  });
}

/**
 * 验证授权码
 * @returns 验证成功返回 token 信息，失败返回 null
 */
export async function validateAccessToken(token: string) {
  const accessToken = await prisma.accessToken.findUnique({
    where: { token }
  });
  
  if (!accessToken) return null;
  if (accessToken.isRevoked) return null;
  if (accessToken.expiresAt < new Date()) return null;
  
  // 更新最后使用时间
  await prisma.accessToken.update({
    where: { id: accessToken.id },
    data: { lastUsedAt: new Date() }
  });
  
  return {
    id: accessToken.id,
    name: accessToken.name
  };
}

/**
 * 获取本机局域网IP地址
 */
export async function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// === Local Model Actions ===

import { detectHardware, type HardwareInfo } from '@/lib/hardwareDetection';
import { discoverLocalServices, checkServiceUrl, type LocalService, type ServiceCheckResult } from '@/lib/localServiceDiscovery';

/**
 * Detect hardware capabilities for local model support
 */
export async function detectLocalHardwareAction(): Promise<HardwareInfo> {
  return await detectHardware();
}

/**
 * Discover locally running inference services
 */
export async function discoverLocalServicesAction(): Promise<LocalService[]> {
  return await discoverLocalServices();
}

/**
 * Check if a specific service URL is available
 */
export async function checkLocalServiceAction(url: string): Promise<ServiceCheckResult> {
  return await checkServiceUrl(url);
}

/**
 * Quick setup: Create a LOCAL provider and model in one action
 */
export async function quickSetupLocalModelAction(data: {
  providerName: string;
  serviceUrl: string;
  localBackend: string;
  modelName: string;
  modelIdentifier: string;
  parameterConfig: string;
}): Promise<{ success: boolean; providerId?: string; modelId?: string; error?: string }> {
  try {
    // First verify the service is available
    const check = await checkServiceUrl(data.serviceUrl);
    if (!check.available) {
      return { success: false, error: `无法连接到服务: ${check.error}` };
    }
    
    // Create provider
    const provider = await prisma.provider.create({
      data: {
        name: data.providerName,
        type: 'LOCAL',
        baseUrl: data.serviceUrl,
        localBackend: data.localBackend,
      }
    });
    
    // Create model
    const model = await prisma.aIModel.create({
      data: {
        name: data.modelName,
        modelIdentifier: data.modelIdentifier,
        type: 'IMAGE',
        providerId: provider.id,
        parameterConfig: data.parameterConfig,
      }
    });
    
    return { 
      success: true, 
      providerId: provider.id, 
      modelId: model.id 
    };
  } catch (error) {
    console.error('Quick setup local model failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '设置失败' 
    };
  }
}

/**
 * Check if a local provider's service is currently online
 */
export async function checkLocalProviderStatusAction(providerId: string): Promise<{ online: boolean; error?: string }> {
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: providerId }
    });
    
    if (!provider || provider.type !== 'LOCAL') {
      return { online: false, error: '非本地服务商' };
    }
    
    if (!provider.baseUrl) {
      return { online: false, error: '未配置服务地址' };
    }
    
    const check = await checkServiceUrl(provider.baseUrl);
    return { online: check.available, error: check.error };
  } catch (error) {
    return { online: false, error: error instanceof Error ? error.message : '检测失败' };
  }
}

// === Auto Deploy Actions ===

import { 
  checkPrerequisites, 
  getDefaultInstallDir, 
  getOneLinerScript, 
  getInstallCommands,
  runCommand,
  getEstimatedSize,
  type InstallConfig 
} from '@/lib/localModelInstaller';

/**
 * Check system prerequisites for local model installation
 */
export async function checkInstallPrerequisitesAction() {
  const prereqs = await checkPrerequisites();
  const installDir = getDefaultInstallDir();
  
  return {
    prerequisites: prereqs,
    installDir,
    platform: process.platform,
    arch: process.arch,
  };
}

/**
 * Install missing prerequisites
 */
export async function installPrerequisiteAction(
  tool: 'cmake' | 'huggingface' | 'brew'
): Promise<{ success: boolean; message: string; error?: string }> {
  const platform = process.platform;
  
  try {
    switch (tool) {
      case 'brew': {
        if (platform !== 'darwin') {
          return { success: false, message: 'Homebrew 仅支持 macOS', error: 'Not macOS' };
        }
        // Install Homebrew
        const result = await runCommand('/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"');
        return result.success 
          ? { success: true, message: 'Homebrew 安装成功' }
          : { success: false, message: 'Homebrew 安装失败', error: result.error };
      }
      
      case 'cmake': {
        if (platform === 'darwin') {
          // Try brew first
          let result = await runCommand('brew install cmake');
          if (result.success) {
            return { success: true, message: 'CMake 安装成功 (via Homebrew)' };
          }
          // Try to install brew first then cmake
          return { success: false, message: '请先安装 Homebrew', error: 'brew not found' };
        } else if (platform === 'linux') {
          // Try apt
          const result = await runCommand('sudo apt-get install -y cmake');
          return result.success 
            ? { success: true, message: 'CMake 安装成功' }
            : { success: false, message: 'CMake 安装失败', error: result.error };
        } else {
          return { success: false, message: '请手动安装 CMake', error: 'Unsupported platform' };
        }
      }
      
      case 'huggingface': {
        // Use pip to install huggingface_hub
        let result = await runCommand('pip3 install -U huggingface_hub');
        if (!result.success) {
          result = await runCommand('pip install -U huggingface_hub');
        }
        return result.success 
          ? { success: true, message: 'HuggingFace CLI 安装成功' }
          : { success: false, message: 'HuggingFace CLI 安装失败', error: result.error };
      }
      
      default:
        return { success: false, message: '未知工具', error: `Unknown tool: ${tool}` };
    }
  } catch (error) {
    return { 
      success: false, 
      message: '安装失败', 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * Get install commands for the current platform
 */
export async function getInstallCommandsAction(modelVariant: 'full' | 'q8' | 'q4' | 'q2' = 'q4', port: number = 8080) {
  const installDir = getDefaultInstallDir();
  const config: InstallConfig = { installDir, modelVariant, port };
  
  return {
    commands: getInstallCommands(config),
    oneLiner: getOneLinerScript(config),
    estimatedSize: getEstimatedSize(modelVariant),
    installDir,
  };
}

/**
 * Run a single install command
 */
export async function runInstallCommandAction(command: string, cwd?: string) {
  return await runCommand(command, cwd);
}

/**
 * Run the complete installation process
 * This is a long-running operation that should be called step by step
 */
export async function runAutoInstallStepAction(
  step: 'create-dir' | 'clone-repo' | 'build' | 'download-model' | 'verify',
  modelVariant: 'full' | 'q8' | 'q4' | 'q2' = 'q4'
): Promise<{ success: boolean; message: string; error?: string }> {
  const installDir = getDefaultInstallDir();
  const platform = process.platform;
  
  try {
    switch (step) {
      case 'create-dir': {
        await fs.mkdir(installDir, { recursive: true });
        return { success: true, message: `创建目录: ${installDir}` };
      }
      
      case 'clone-repo': {
        const result = await runCommand(
          'git clone --depth 1 https://github.com/leejet/stable-diffusion.cpp',
          installDir
        );
        if (!result.success) {
          // Check if already exists
          try {
            await fs.access(path.join(installDir, 'stable-diffusion.cpp'));
            return { success: true, message: '仓库已存在，跳过克隆' };
          } catch {
            return { success: false, message: '克隆失败', error: result.error };
          }
        }
        return { success: true, message: '克隆 stable-diffusion.cpp 完成' };
      }
      
      case 'build': {
        const sdcppDir = path.join(installDir, 'stable-diffusion.cpp');
        const buildDir = path.join(sdcppDir, 'build');
        
        // Create build directory
        await fs.mkdir(buildDir, { recursive: true });
        
        // Configure cmake
        const cmakeFlag = platform === 'darwin' ? '-DSD_METAL=ON' : '-DSD_CUDA=ON';
        let result = await runCommand(`cmake .. ${cmakeFlag} -DCMAKE_BUILD_TYPE=Release`, buildDir);
        if (!result.success) {
          return { success: false, message: 'CMake 配置失败', error: result.error };
        }
        
        // Build
        result = await runCommand('cmake --build . --config Release -j', buildDir);
        if (!result.success) {
          return { success: false, message: '编译失败', error: result.error };
        }
        
        return { success: true, message: '编译完成' };
      }
      
      case 'download-model': {
        const modelsDir = path.join(installDir, 'models');
        await fs.mkdir(modelsDir, { recursive: true });
        
        const modelName = modelVariant === 'full' ? 'Z-Image-Turbo' : `Z-Image-Turbo-${modelVariant.toUpperCase()}`;
        const result = await runCommand(
          `huggingface-cli download Tongyi-MAI/${modelName} --local-dir ${modelName}`,
          modelsDir
        );
        
        if (!result.success) {
          return { success: false, message: '模型下载失败', error: result.error };
        }
        
        return { success: true, message: `模型 ${modelName} 下载完成` };
      }
      
      case 'verify': {
        const sdcppDir = path.join(installDir, 'stable-diffusion.cpp', 'build', 'bin');
        const ext = platform === 'win32' ? '.exe' : '';
        
        try {
          await fs.access(path.join(sdcppDir, `sd${ext}`));
          return { success: true, message: '安装验证成功' };
        } catch {
          return { success: false, message: '找不到编译产物', error: '请检查编译是否成功' };
        }
      }
      
      default:
        return { success: false, message: '未知步骤', error: `Unknown step: ${step}` };
    }
  } catch (error) {
    return { 
      success: false, 
      message: '执行失败', 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}
