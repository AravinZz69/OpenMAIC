/**
 * Flux Kontext Image Generation Adapter
 *
 * Uses NVIDIA NIM API for FLUX.1-kontext-dev model with image input support.
 * Endpoint: https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-kontext-dev
 *
 * This adapter supports context-aware image generation using an input image.
 */

import type { ImageGenerationConfig, ImageGenerationOptions, ImageGenerationResult } from '../types';

const DEFAULT_INVOKE_URL = 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-kontext-dev';

export async function generateWithFluxKontextImage(
  config: ImageGenerationConfig,
  options: ImageGenerationOptions,
): Promise<ImageGenerationResult> {
  const headers = {
    Authorization: `Bearer ${config.apiKey}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const payload: Record<string, unknown> = {
    prompt: options.prompt,
    aspect_ratio: options.aspectRatio || 'match_input_image',
    steps: 30,
    cfg_scale: 3.5,
    seed: 0,
  };

  // Add input image if provided
  if (options.image) {
    payload.image = options.image;
  }

  const response = await fetch(config.baseUrl || DEFAULT_INVOKE_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers,
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Flux Kontext Image generation failed (${response.status}): ${errBody}`);
  }

  const responseBody = (await response.json()) as Record<string, unknown>;

  // Handle different response formats from NVIDIA API
  if (responseBody.image) {
    const imageData = responseBody.image as string;
    return {
      base64: imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`,
      width: (responseBody.width as number) || options.width || 1024,
      height: (responseBody.height as number) || options.height || 1024,
    };
  } else if (responseBody.url || responseBody.image_url) {
    return {
      url: (responseBody.url || responseBody.image_url) as string,
      width: (responseBody.width as number) || options.width || 1024,
      height: (responseBody.height as number) || options.height || 1024,
    };
  } else if (responseBody.data && Array.isArray(responseBody.data) && responseBody.data[0]) {
    const imageData = responseBody.data[0] as Record<string, unknown>;
    return {
      url: imageData.url as string | undefined,
      base64: imageData.b64_json as string | undefined,
      width: (imageData.width as number) || options.width || 1024,
      height: (imageData.height as number) || options.height || 1024,
    };
  }

  throw new Error('Flux Kontext Image returned unexpected response format');
}

export async function testFluxKontextImageConnectivity(
  config: ImageGenerationConfig,
): Promise<{ success: boolean; message: string }> {
  const baseUrl = config.baseUrl || DEFAULT_INVOKE_URL;

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        prompt: 'test',
        aspect_ratio: '1:1',
        steps: 20,
        cfg_scale: 3.5,
      }),
    });

    if (response.status === 401 || response.status === 403) {
      const text = await response.text();
      return {
        success: false,
        message: `Flux Kontext Image auth failed (${response.status}): ${text}`,
      };
    }

    return { success: true, message: 'Connected to Flux Kontext Image' };
  } catch (err) {
    return { success: false, message: `Flux Kontext Image connectivity error: ${err}` };
  }
}
