'use server';

import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { mapParametersForAPI } from '@/lib/modelParameters';
import { saveGeneratedImage } from './library';
import { getSettings } from './settings';
import { E } from '@/lib/errors';

// --- Logic Helpers ---

async function getClientForModel(modelId: string) {
  const modelDef = await prisma.aIModel.findUnique({
    where: { id: modelId },
    include: { provider: true }
  });

  if (!modelDef || !modelDef.provider) throw new Error(`[${E.MODEL_NOT_FOUND}]`);

  const provider = modelDef.provider;
  const globalSettings = await getSettings();

  // Determine API Key: Provider Specific > Global Fallback
  let apiKey = provider.apiKey;
  if (!apiKey) {
    if (provider.type === 'GEMINI') apiKey = globalSettings['GEMINI_API_KEY'];
    if (provider.type === 'OPENAI') apiKey = globalSettings['OPENAI_API_KEY'];
  }

  if (provider.type === 'GEMINI') {
    if (!apiKey) throw new Error(`[${E.GEMINI_KEY_MISSING}]`);

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
      throw new Error(`[${E.TEXT_GEN_UNSUPPORTED}]`);
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
    console.error("Text generation error:", e);
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
      throw new Error(`[${E.MODEL_NOT_FOUND}]`);
    }

    // Map parameters based on provider type and model configuration
    const mappedParams = mapParametersForAPI(
      modelDef.provider.type,
      modelDef.provider.baseUrl || null,
      params,
      modelDef.parameterConfig || null
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
    let base64Images: (string | Buffer)[] = [];

    // Check if using Grsai custom API
    if (mappedParams._useGrsaiAPI) {
      const baseUrl = modelDef.provider.baseUrl;
      const apiKey = modelDef.provider.apiKey;

      if (!baseUrl || !apiKey) {
        throw new Error(`[${E.GRSAI_CONFIG_MISSING}]`);
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
        throw new Error(`[${E.API_ERROR}]${response.status}: ${errorText.slice(0, 100)}`);
      }

      // Parse stream response (chunked JSON)
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error(`[${E.STREAM_READ_FAILED}]`);
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
                throw new Error(`[${E.GENERATION_FAILED}]${data.failure_reason || data.error || 'unknown'}`);
              }
            } catch (e) {
              if (e instanceof Error && e.message.startsWith(`[${E.GENERATION_FAILED}]`)) {
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
              throw new Error(`[${E.GENERATION_FAILED}]${data.failure_reason || data.error || 'unknown'}`);
            }
          }
        } catch (e) {
          if (e instanceof Error && e.message.startsWith(`[${E.GENERATION_FAILED}]`)) {
            throw e;
          }
          console.log('[Grsai] Failed to parse final buffer');
        }
      }

      console.log('[Grsai] All chunks received:', allChunks.join(''));
      console.log('[Grsai] Final result:', JSON.stringify(finalResult, null, 2));

      if (!finalResult || !finalResult.results || finalResult.results.length === 0) {
        throw new Error(`[${E.NO_IMAGE_RETURNED}]`);
      }

      // Download images directly as Buffer (faster, no base64 encoding needed)
      for (const result of finalResult.results) {
        if (result.url) {
          const imgRes = await fetch(result.url);
          if (!imgRes.ok) {
            throw new Error(`[${E.IMAGE_DOWNLOAD_FAILED}]${imgRes.status}: ${result.url.slice(0, 50)}`);
          }
          const arrayBuffer = await imgRes.arrayBuffer();
          // Directly use Buffer instead of converting to base64
          base64Images.push(Buffer.from(arrayBuffer));
        }
      }

      if (base64Images.length === 0) {
        throw new Error(`[${E.IMAGE_EXTRACT_FAILED}]`);
      }
    }

    // Check if using Ark Seedream API
    else if (mappedParams._useArkSeedreamAPI) {
      const baseUrl = modelDef.provider.baseUrl;
      const apiKey = modelDef.provider.apiKey;

      if (!baseUrl || !apiKey) {
        throw new Error(`[${E.GRSAI_CONFIG_MISSING}]`);  // Reuse error code for missing config
      }

      // Build Seedream API request (uses images.generate endpoint)
      const requestBody: any = {
        model: modelDef.modelIdentifier,
        prompt: prompt,
        n: 1,
        response_format: 'b64_json',
      };

      // Add size if specified
      if (mappedParams.size) {
        requestBody.size = mappedParams.size;
      }

      // Add aspect_ratio if specified (Seedream may use this instead of/in addition to size)
      if (mappedParams.aspect_ratio) {
        requestBody.aspect_ratio = mappedParams.aspect_ratio;
      }

      // Add reference images if provided
      if (mappedParams.image_urls && Array.isArray(mappedParams.image_urls) && mappedParams.image_urls.length > 0) {
        requestBody.image_urls = mappedParams.image_urls;
      }

      // Call Ark Seedream images.generate API
      const apiUrl = `${baseUrl.replace(/\/$/, '')}/images/generations`;

      console.log('[Ark Seedream] Request URL:', apiUrl);
      console.log('[Ark Seedream] Request body:', JSON.stringify({ ...requestBody, image_urls: requestBody.image_urls ? '[...images...]' : undefined }, null, 2));

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
        throw new Error(`[${E.API_ERROR}]${response.status}: ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();
      console.log('[Ark Seedream] Response:', JSON.stringify(data, null, 2).substring(0, 500));

      // Parse response (OpenAI images.generate format)
      if (data.data && Array.isArray(data.data)) {
        for (const item of data.data) {
          if (item.b64_json) {
            // Direct base64 image data
            base64Images.push(Buffer.from(item.b64_json, 'base64'));
          } else if (item.url) {
            // Download from URL
            const imgRes = await fetch(item.url);
            if (!imgRes.ok) {
              throw new Error(`[${E.IMAGE_DOWNLOAD_FAILED}]${imgRes.status}: ${item.url.slice(0, 50)}`);
            }
            const arrayBuffer = await imgRes.arrayBuffer();
            base64Images.push(Buffer.from(arrayBuffer));
          }
        }
      }

      if (base64Images.length === 0) {
        throw new Error(`[${E.NO_IMAGE_RETURNED}]`);
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
            // Directly convert base64 to Buffer (faster than string concatenation + parsing)
            base64Images.push(Buffer.from(part.inlineData.data, 'base64'));
          }
        }
      }
      if (base64Images.length === 0) throw new Error(`[${E.NO_IMAGE_RETURNED}]${response.text().substring(0, 100)}`);
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

                // If already base64 data URL, extract and convert to Buffer
                if (imageUrl.startsWith('data:image/')) {
                  const pureBase64 = imageUrl.replace(/^data:image\/\w+;base64,/, '');
                  base64Images.push(Buffer.from(pureBase64, 'base64'));
                  imageFound = true;
                }
                // If HTTP URL, download it directly as Buffer
                else if (imageUrl.startsWith('http')) {
                  const imgRes = await fetch(imageUrl);
                  if (!imgRes.ok) {
                    throw new Error(`[${E.IMAGE_DOWNLOAD_FAILED}]${imgRes.status}: ${imageUrl.slice(0, 50)}`);
                  }
                  const arrayBuffer = await imgRes.arrayBuffer();
                  // Use Buffer directly instead of base64 encoding
                  base64Images.push(Buffer.from(arrayBuffer));
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

              // Download image directly as Buffer
              const imgRes = await fetch(imageUrl);
              if (!imgRes.ok) {
                throw new Error(`[${E.IMAGE_DOWNLOAD_FAILED}]${imgRes.status}: ${imageUrl.slice(0, 50)}`);
              }
              const arrayBuffer = await imgRes.arrayBuffer();
              base64Images.push(Buffer.from(arrayBuffer));
              imageFound = true;
              break;
            }

            // Check if content itself is base64 image data
            if (content.length > 100 && /^[A-Za-z0-9+/=]+$/.test(content.substring(0, 100))) {
              // Directly convert to Buffer
              base64Images.push(Buffer.from(content, 'base64'));
              imageFound = true;
              break;
            }
          }

          // Check if content is an array (OpenAI vision format)
          if (!imageFound && Array.isArray(message?.content)) {
            for (const part of message.content) {
              if (part.type === 'image_url' && part.image_url?.url) {
                const imageUrl = part.image_url.url;

                // If already base64 data URL, extract and convert to Buffer
                if (imageUrl.startsWith('data:image/')) {
                  const pureBase64 = imageUrl.replace(/^data:image\/\w+;base64,/, '');
                  base64Images.push(Buffer.from(pureBase64, 'base64'));
                  imageFound = true;
                  break;
                }

                // If HTTP URL, download it directly as Buffer
                if (imageUrl.startsWith('http')) {
                  const imgRes = await fetch(imageUrl);
                  if (!imgRes.ok) {
                    throw new Error(`[${E.IMAGE_DOWNLOAD_FAILED}]${imgRes.status}: ${imageUrl.slice(0, 50)}`);
                  }
                  const arrayBuffer = await imgRes.arrayBuffer();
                  base64Images.push(Buffer.from(arrayBuffer));
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
            `Cannot parse image from response.\n` +
            `Choices count: ${completion.choices?.length}\n` +
            `First choice content type: ${typeof firstChoice?.message?.content}\n` +
            `First choice content: ${JSON.stringify(firstChoice?.message?.content)?.substring(0, 200)}\n` +
            `Full response: ${JSON.stringify(completion, null, 2).substring(0, 1500)}`
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
        // Directly convert base64 to Buffer (avoid string concatenation + parsing)
        base64Images = response.data?.map(d => Buffer.from(d.b64_json || '', 'base64')).filter(b => b.length > 0) || [];
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
          throw new Error(`[${E.LOCAL_SERVICE_ERROR}]${response.status}: ${errorText.slice(0, 100)}`);
        }

        const data = await response.json();

        // sd.cpp returns images in base64 format
        if (data.images && Array.isArray(data.images)) {
          for (const img of data.images) {
            if (typeof img === 'string') {
              // Extract pure base64 and convert to Buffer
              const pureBase64 = img.startsWith('data:')
                ? img.replace(/^data:image\/\w+;base64,/, '')
                : img;
              base64Images.push(Buffer.from(pureBase64, 'base64'));
            } else if (img.data) {
              base64Images.push(Buffer.from(img.data, 'base64'));
            }
          }
        } else if (data.image) {
          // Single image response
          const pureBase64 = data.image.startsWith('data:')
            ? data.image.replace(/^data:image\/\w+;base64,/, '')
            : data.image;
          base64Images.push(Buffer.from(pureBase64, 'base64'));
        }

        if (base64Images.length === 0) {
          throw new Error(`[${E.LOCAL_SERVICE_NO_IMAGE}]`);
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
              // Directly convert to Buffer
              base64Images.push(Buffer.from(message.content, 'base64'));
            }
          }
        }

        if (base64Images.length === 0) {
          throw new Error(`[${E.LOCAL_SERVICE_NO_IMAGE}]`);
        }
      }
    }
    else {
      throw new Error(`[${E.IMAGE_GEN_UNSUPPORTED}]`);
    }

    // 2. Save Images & Collect Paths
    const imageResults: { id: string, url: string, prompt: string }[] = [];
    const savedPaths: string[] = [];

    const modelName = (await prisma.aIModel.findUnique({ where: { id: modelId } }))?.name || 'Unknown';

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
    console.error("Image generation error:", e);
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
