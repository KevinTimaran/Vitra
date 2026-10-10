import { GarmentAnalysis } from './types';

/**
 * Analyzes a garment image using the FitGlassAI backend.
 */
export const analyzeGarment = async (imageUri: string): Promise<GarmentAnalysis> => {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is not defined in .env');
  }

  let mimeType = 'image/jpeg';
  let filename = 'garment.jpg';
  
  const lowerUri = imageUri.toLowerCase();
  if (lowerUri.endsWith('.png')) {
    mimeType = 'image/png';
    filename = 'garment.png';
  } else if (lowerUri.endsWith('.webp')) {
    mimeType = 'image/webp';
    filename = 'garment.webp';
  }

  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    name: filename,
    type: mimeType,
  } as any);

  try {
    const response = await fetch(`${baseUrl}/api/garments/analyze`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
      try {
        const errorText = await response.text();
        const errorJson = JSON.parse(errorText);
        if (errorJson.detail) {
          errorMessage += ` - Detail: ${JSON.stringify(errorJson.detail)}`;
        } else if (errorJson.error) {
          errorMessage += ` - Error: ${JSON.stringify(errorJson.error)}`;
        } else {
          errorMessage += ` - Body: ${errorText}`;
        }
      } catch (e) {
        // Fallback to basic message if not valid JSON
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();

    if (result.success === false) {
      throw new Error(result.error || 'Backend analysis failed');
    }

    const data = result.data;
    if (!data) {
      throw new Error('Invalid response structure: missing data field');
    }

    // Basic validation
    if (!data.category) {
      throw new Error('Invalid response: missing category');
    }

    return data as GarmentAnalysis;
  } catch (error) {
    console.error('Error analyzing garment:', error);
    throw error;
  }
};
