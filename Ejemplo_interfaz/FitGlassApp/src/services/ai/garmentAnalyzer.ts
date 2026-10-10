import { GarmentAnalysis } from './types';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Analyzes a garment image using the FitGlassAI backend.
 */
export const analyzeGarment = async (imageUri: string): Promise<GarmentAnalysis> => {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is not defined in .env');
  }

  let finalUri = imageUri;

  try {
    // Convert the image to JPEG to ensure format compatibility (e.g. HEIC from iOS)
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    finalUri = manipResult.uri;
  } catch (error) {
    console.warn('Image manipulation failed, falling back to original URI:', error);
  }

  const mimeType = 'image/jpeg';
  const filename = 'garment.jpg';

  // Fetch the local file as a Blob to append to FormData
  const imageFetchResponse = await fetch(finalUri);
  const blob = await imageFetchResponse.blob();

  const formData = new FormData();
  formData.append('file', blob, filename);

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
