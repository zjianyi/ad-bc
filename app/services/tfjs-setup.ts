"use server";

import * as tf from '@tensorflow/tfjs';

// Initialize TensorFlow.js for server-side use
export async function initTensorFlow() {
  await tf.ready();
  
  // Set backend to CPU since we're running on the server
  await tf.setBackend('cpu');
}

// Initialize when the file is imported
initTensorFlow().catch(console.error); 