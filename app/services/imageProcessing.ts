"use server";

import * as tf from '@tensorflow/tfjs-node';
const Jimp = require('jimp');

const SIMILARITY_THRESHOLD = 0.85; // Adjust this value to control sensitivity
let previousImageTensor: tf.Tensor | null = null;
let lastProcessedTime = 0;
const PROCESS_INTERVAL = 1000; // Process every 1 second

export async function processVideoFrame(imageUrl: string, timestamp: number): Promise<{ shouldProcess: boolean; description?: string }> {
  try {
    // Rate limiting
    const currentTime = Date.now();
    if (currentTime - lastProcessedTime < PROCESS_INTERVAL) {
      return { shouldProcess: false };
    }
    lastProcessedTime = currentTime;

    // Load and preprocess image
    const image = await Jimp.read(imageUrl);
    image.resize(224, 224); // Resize to standard input size
    const imageData = new Float32Array(image.bitmap.data);
    const currentImageTensor = tf.tensor4d(imageData, [1, 224, 224, 4]);

    // If this is the first frame, always process it
    if (!previousImageTensor) {
      previousImageTensor = currentImageTensor;
      return { shouldProcess: true };
    }

    // Calculate similarity using cosine similarity
    const similarity = tf.metrics.cosineProximity(
      previousImageTensor.reshape([-1]),
      currentImageTensor.reshape([-1])
    ).dataSync()[0];

    // Clean up previous tensor
    previousImageTensor.dispose();
    previousImageTensor = currentImageTensor;

    // If similarity is below threshold, process the frame
    const shouldProcess = Math.abs(similarity) < SIMILARITY_THRESHOLD;

    if (shouldProcess) {
      // Load pre-trained MobileNet model for image classification
      const model = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json');
      
      // Normalize the image data
      const normalizedInput = currentImageTensor.div(255.0);
      
      // Get prediction
      const predictions = await model.predict(normalizedInput);
      const topPrediction = Array.from(await (predictions as tf.Tensor).data())
        .map((prob, i) => ({ probability: prob, className: i.toString() }))
        .sort((a, b) => b.probability - a.probability)[0];

      // Clean up
      model.dispose();
      normalizedInput.dispose();
      (predictions as tf.Tensor).dispose();

      return {
        shouldProcess: true,
        description: `Frame shows: ${topPrediction.className} (confidence: ${(topPrediction.probability * 100).toFixed(2)}%)`
      };
    }

    return { shouldProcess: false };
  } catch (error) {
    console.error('Error processing video frame:', error);
    return { shouldProcess: false };
  }
}

// Clean up function to be called when video playback ends
export function cleanupImageProcessing() {
  if (previousImageTensor) {
    previousImageTensor.dispose();
    previousImageTensor = null;
  }
} 