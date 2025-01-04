"use server";

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY
});

interface ChatContext {
  videoTitle?: string;
  currentTranscript?: string;
  currentTime?: number;
  imageContext?: string;
}

export async function getChatResponse(message: string, context: ChatContext) {
  const systemMessage = `You are an advanced AI tutor with real-time access to the video content the user is watching. You can:
1. See what's happening in the video through the current frame
2. Read the transcript at any timestamp
3. Know exactly where the user is in the video (${formatTime(context.currentTime || 0)})

Current context:
${context.videoTitle ? '📺 Video: ' + context.videoTitle : ''}
${context.currentTranscript ? '🗣 Current segment: ' + context.currentTranscript : ''}`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage },
  ];

  // Add the image if available
  if (context.imageContext) {
    messages.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: context.imageContext } },
        { type: 'text', text: 'This is the current frame of the video. Please use this visual context when answering questions.' }
      ]
    } as OpenAI.Chat.Completions.ChatCompletionMessageParam);
  }

  // Add the user's message
  messages.push({
    role: 'user',
    content: message,
  });

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 500,
    stream: true
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          controller.enqueue(encoder.encode(text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable);
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
} 