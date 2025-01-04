"use server";

export async function processVideoFrame(imageUrl: string): Promise<{ shouldProcess: boolean; imageUrl?: string }> {
  // Always process and return the image URL
  return { shouldProcess: true, imageUrl };
} 