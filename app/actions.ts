'use server';

import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { mapParametersForAPI } from '@/lib/modelParameters';

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

export async function saveProvider(data: { id?: string; name: string; type: string; baseUrl?: string; apiKey?: string }) {
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

    if (wrapper.type === 'GEMINI') {
      const generationConfig: any = {};

      // Use mapped parameters from parameter mapping system
      if (mappedParams.responseModalities) {
        generationConfig.responseModalities = mappedParams.responseModalities;
      }

      if (mappedParams.numberOfImages) {
        generationConfig.numberOfImages = mappedParams.numberOfImages;
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
           if (mappedParams.aspectRatio || mappedParams.imageSize || mappedParams.numberOfImages) {
               if (!extraBody.image_config) extraBody.image_config = {};
               if (mappedParams.aspectRatio) extraBody.image_config.aspect_ratio = mappedParams.aspectRatio;
               if (mappedParams.imageSize) extraBody.image_config.image_size = mappedParams.imageSize;
               if (mappedParams.numberOfImages) extraBody.image_config.number_of_images = mappedParams.numberOfImages;
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
  const filename = `${Date.now()}-${uuidv4()}.png`;
  const relativePath = `/generated/${filename}`;
  const outputDir = path.join(process.cwd(), 'public', 'generated');

  try { await fs.access(outputDir); } catch { await fs.mkdir(outputDir, { recursive: true }); }

  await fs.writeFile(path.join(outputDir, filename), buffer);

  // If no folder specified, use default folder
  let targetFolderId = folderId;
  if (!targetFolderId) {
    const defaultFolder = await ensureDefaultFolder();
    targetFolderId = defaultFolder.id;
  }

  const image = await prisma.image.create({
    data: {
      path: relativePath,
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
        name: '默认文件夹',
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
  return await prisma.folder.create({
    data: { name }
  });
}

export async function updateFolder(id: string, name: string) {
  return await prisma.folder.update({
    where: { id },
    data: { name }
  });
}

export async function deleteFolder(id: string) {
  const folder = await prisma.folder.findUnique({ where: { id } });

  if (!folder) throw new Error('文件夹不存在');
  if (folder.isDefault) throw new Error('无法删除默认文件夹');

  // Move images to default folder before deletion
  const defaultFolder = await ensureDefaultFolder();
  await prisma.image.updateMany({
    where: { folderId: id },
    data: { folderId: defaultFolder.id }
  });

  return await prisma.folder.delete({ where: { id } });
}

export async function getImagesByFolder(folderId?: string) {
  return await prisma.image.findMany({
    where: folderId ? { folderId } : {},
    orderBy: { createdAt: 'desc' },
    include: { template: true, folder: true }
  });
}

export async function deleteImage(id: string) {
  const image = await prisma.image.findUnique({ where: { id } });
  if (!image) throw new Error('图片不存在');

  // Delete file from disk
  try {
    // Remove leading slash from path to avoid path.join truncation issue
    const cleanPath = image.path.replace(/^\//, '');
    const filePath = path.join(process.cwd(), 'public', cleanPath);
    await fs.unlink(filePath);
  } catch (e) {
    console.error('删除文件失败:', e);
    // Continue to delete DB record even if file deletion fails
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
  
  return await prisma.image.update({
    where: { id: imageId },
    data: { folderId }
  });
}
