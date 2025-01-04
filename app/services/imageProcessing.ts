"use server";

import * as tf from '@tensorflow/tfjs';
import './tfjs-setup';

const SIMILARITY_THRESHOLD = 0.85;
let previousImageTensor: tf.Tensor | null = null;

export async function processVideoFrame(imageUrl: string): Promise<{ shouldProcess: boolean; imageUrl?: string }> {
  try {
    // Load and process image
    const response = await fetch(imageUrl);
    const imageData = new Float32Array(await response.arrayBuffer());
    const currentImageTensor = tf.tensor(imageData);

    // First frame
    if (!previousImageTensor) {
      previousImageTensor = currentImageTensor;
      return { shouldProcess: true, imageUrl };
    }

    // Check similarity
    const similarity = tf.metrics.cosineProximity(
      previousImageTensor.reshape([-1]),
      currentImageTensor.reshape([-1])
    ).dataSync()[0];

    previousImageTensor.dispose();
    previousImageTensor = currentImageTensor;

    // Only process if frame is significantly different
    return {
      shouldProcess: Math.abs(similarity) < SIMILARITY_THRESHOLD,
      imageUrl: Math.abs(similarity) < SIMILARITY_THRESHOLD ? imageUrl : undefined
    };
  } catch (error) {
    console.error('Error processing frame:', error);
    return { shouldProcess: false };
  }
}

export async function cleanupImageProcessing() {
  if (previousImageTensor) {
    previousImageTensor.dispose();
    previousImageTensor = null;
  }
} 