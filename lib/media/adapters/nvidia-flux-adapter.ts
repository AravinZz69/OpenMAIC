/**
 * NVIDIA FLUX Image Generation Adapter
 *
 * Uses NVIDIA NIM API for FLUX.1-kontext-dev model.
 * Endpoint: https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-kontext-dev
 *
 * Supported models:
 * - flux.1-kontext-dev (context-aware image generation)
 *
 * Authentication: Bearer token via Authorization header
 *
 * API docs: https://build.nvidia.com/black-forest-labs/flux-1-kontext-dev
 */

import type {
  ImageGenerationConfig,
  ImageGenerationOptions,
  ImageGenerationResult,
} from '../types';

const DEFAULT_MODEL = 'black-forest-labs/flux.1-kontext-dev';
const DEFAULT_BASE_URL = 'https://ai.api.nvidia.com/v1/genai';

/**
 * Map aspect ratio to NVIDIA FLUX format
 */
function mapAspectRatio(ratio?: string): string {
  if (!ratio) return '16:9';
  return ratio; // FLUX supports standard ratios directly
}

/**
 * Lightweight connectivity test
 */
export async function testNvidiaFluxConnectivity(
  config: ImageGenerationConfig,
): Promise<{ success: boolean; message: string }> {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  const model = config.model || DEFAULT_MODEL;

  try {
    const response = await fetch(`${baseUrl}/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'Accept': 'application/json',
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
        message: `NVIDIA FLUX auth failed (${response.status}): ${text}`,
      };
    }

    return { success: true, message: 'Connected to NVIDIA FLUX' };
  } catch (err) {
    return { success: false, message: `NVIDIA FLUX connectivity error: ${err}` };
  }
}

export async function generateWithNvidiaFlux(
  config: ImageGenerationConfig,
  options: ImageGenerationOptions,
): Promise<ImageGenerationResult> {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  const model = config.model || DEFAULT_MODEL;

  const payload: Record<string, unknown> = {
    prompt: options.prompt,
    aspect_ratio: mapAspectRatio(options.aspectRatio),
    steps: 30,
    cfg_scale: 3.5,
    seed: 0,
  };

  const response = await fetch(`${baseUrl}/${model}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NVIDIA FLUX generation failed (${response.status}): ${text}`);
  }

  const data = await response.json();

  // NVIDIA FLUX returns image data in various formats
  // Check for common response structures
  if (data.image) {
    // Base64 format
    return {
      base64: data.image.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`,
      width: options.width || 1024,
      height: options.height || 576,
    };
  } else if (data.url) {
    // URL format
    return {
      url: data.url,
      width: options.width || 1024,
      height: options.height || 576,
    };
  } else if (data.data?.[0]) {
    // Array format (similar to OpenAI)
    const imageData = data.data[0];
    return {
      url: imageData.url,
      base64: imageData.b64_json,
      width: options.width || 1024,
      height: options.height || 576,
    };
  }

  throw new Error('NVIDIA FLUX returned unexpected response format');
}
