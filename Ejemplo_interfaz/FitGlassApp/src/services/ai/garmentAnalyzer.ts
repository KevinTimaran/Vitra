import { GarmentAnalysis } from './types';

/**
 * Mock implementation for analyzing a garment image.
 * This simulates a network request to an AI backend that would extract
 * attributes from the image.
 */
export const analyzeGarment = async (imageUri: string): Promise<GarmentAnalysis> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 3400));

  // Determine category randomly if not provided, or simply default to 'Tops'
  // In a real scenario, this would come from the AI backend.
  const categories = ['Tops', 'Outerwear', 'Pants'];
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];

  return {
    category: randomCategory,
    sleeve: 'Short',
    neck: 'Crew',
    fit: 'Regular',
    dominantColor: '#3B82F6', // A blue shade
    secondaryColors: ['#FFFFFF', '#1E40AF'],
    pattern: 'Solid',
    hasPocket: false,
    hasButtons: false,
    hasZipper: false,
    confidence: 0.95,
  };
};
