import { Alert } from 'react-native';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export const STABILITY_API_KEY = 'sk-V6jRl0spTOYsYTu5MLkrIdPkInB5h7mn6h0nD6sZtgOW4Jsz';
export const STABILITY_API_ENDPOINT = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';

export type CreateType = 'character' | 'scene';

interface ImageGenerationOptions {
  description: string;
  width: number;
  height: number;
  additionalPrompt?: string;
  negativePrompt?: string;
}

export const generateImage = async ({
  description,
  width,
  height,
  additionalPrompt = '',
  negativePrompt = "blurry, bad quality, distorted, disfigured, low resolution"
}: ImageGenerationOptions): Promise<string> => {
  try {
    const response = await fetch(STABILITY_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${STABILITY_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        text_prompts: [
          {
            text: `${description} ${additionalPrompt}`,
            weight: 1
          },
          {
            text: negativePrompt,
            weight: -1
          }
        ],
        cfg_scale: 7,
        height,
        width,
        steps: 30,
        samples: 1
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate image');
    }

    const data = await response.json();
    
    if (data.artifacts && data.artifacts.length > 0) {
      return `data:image/png;base64,${data.artifacts[0].base64}`;
    } else {
      throw new Error('No image generated');
    }
  } catch (error) {
    throw error;
  }
};

export const uploadImage = async (
    image: string,
    type: CreateType
  ): Promise<string> => {
    try {
      const base64FileData = await fetch(image)
        .then(response => response.blob())
        .then(blob => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        });
  
      if (typeof base64FileData !== 'string') {
        throw new Error('Failed to convert image to base64');
      }
  
      const base64Str = base64FileData.split(',')[1];
      const fileData = decode(base64Str);
      const fileName = `${Date.now()}.jpg`;
      const filePath = `${type}s/${fileName}`;
  
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, fileData, {
          contentType: 'image/jpeg'
        });
  
      if (uploadError) throw uploadError;
  
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
  
      return publicUrl;
    } catch (error) {
      throw error;
    }
  };
  
  export interface BaseCreateData {
    name: string;
    description: string;
    image: string | null;
  }
  
  export interface CharacterData extends BaseCreateData {
    avatar_url: string;
  }
  
  export interface SceneData extends BaseCreateData {
    image_url: string;
    max_characters: number;
  }
  
  export const validateBaseData = (data: BaseCreateData): boolean => {
    if (!data.name || !data.description || !data.image) {
      Alert.alert('Error', 'Please fill in all fields and select an image');
      return false;
    }
    return true;
  };
  
  export const getImageDimensions = (type: CreateType) => {
    switch (type) {
      case 'character':
        return { width: 1024, height: 1024 };
      case 'scene':
        return { width: 1792, height: 1024 };
    }
  };
  
  export const getPromptAdditions = (type: CreateType): string => {
    switch (type) {
      case 'character':
        return 'portrait, detailed face, high quality, trending on artstation';
      case 'scene':
        return 'wide landscape shot, environment art, concept art, trending on artstation';
    }
  };
  
  export const getImageAspectRatio = (type: CreateType): [number, number] => {
    return type === 'character' ? [1, 1] : [16, 9];
  };