import { GarmentAnalysis } from './types';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

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

  try {
    let resultJson: any;

    if (Platform.OS === 'web') {
      // Fetch the local file as a Blob to append to FormData
      const imageFetchResponse = await fetch(finalUri);
      const rawBlob = await imageFetchResponse.blob();
      const blob = new Blob([rawBlob], { type: mimeType });

      const formData = new FormData();
      formData.append('file', blob, filename);

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
          errorMessage += ` - Error: ${JSON.stringify(errorJson)}`;
        } catch (e) {}
        throw new Error(errorMessage);
      }
      resultJson = await response.json();
    } else {
      // Use expo-file-system for native platforms to ensure correct multipart formatting
      const uploadResult = await FileSystem.uploadAsync(
        `${baseUrl}/api/garments/analyze`,
        finalUri,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          mimeType: mimeType,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        let errorMessage = `HTTP Error: ${uploadResult.status}`;
        try {
          const errorJson = JSON.parse(uploadResult.body);
          errorMessage += ` - Error: ${JSON.stringify(errorJson)}`;
        } catch (e) {
          errorMessage += ` - Body: ${uploadResult.body}`;
        }
        throw new Error(errorMessage);
      }
      resultJson = JSON.parse(uploadResult.body);
    }

    if (resultJson.success === false) {
      throw new Error(resultJson.error || 'Backend analysis failed');
    }

    const data = resultJson.data;
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
