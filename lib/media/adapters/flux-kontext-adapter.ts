/**
 * Flux Kontext Video Generation Adapter
 *
 * Uses NVIDIA NIM API for FLUX.1-kontext-dev model.
 * Note: This adapter maps to the FLUX context-aware generation API.
 */

import type { VideoGenerationConfig, VideoGenerationOptions, VideoGenerationResult } from '../types';

const DEFAULT_INVOKE_URL = 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-kontext-dev';

export async function generateWithFluxKontext(
  config: VideoGenerationConfig,
  options: VideoGenerationOptions,
): Promise<VideoGenerationResult> {
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
    throw new Error(`Flux Kontext generation failed (${response.status}): ${errBody}`);
  }

  const responseBody = (await response.json()) as Record<string, unknown>;

  // Handle response - FLUX Kontext returns images, treating as video frames
  const url = (responseBody.url || responseBody.video_url || responseBody.image_url) as string | undefined;
  const width = (responseBody.width as number) || 1024;
  const height = (responseBody.height as number) || 1024;
  const duration = (responseBody.duration as number) || options.duration || 5;

  if (!url) {
    throw new Error('Flux Kontext returned no URL in response');
  }

  return {
    url,
    width,
    height,
    duration,
  };
}

export async function testFluxKontextConnectivity(
  config: VideoGenerationConfig,
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
        message: `Flux Kontext auth failed (${response.status}): ${text}`,
      };
    }

    return { success: true, message: 'Connected to Flux Kontext' };
  } catch (err) {
    return { success: false, message: `Flux Kontext connectivity error: ${err}` };
  }
}
