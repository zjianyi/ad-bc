"use server";

import { OpenAIStream, StreamingTextResponse } from 'ai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('OpenAI API key is not configured');
}

interface ChatContext {
  videoTitle?: string;
  currentTranscript?: string;
  currentTime?: number;
  imageContext?: string;
}

const functions = [
  {
    name: "analyze_video_frame",
    description: "Analyze the current frame of the video to understand visual content",
    parameters: {
      type: "object",
      properties: {
        timestamp: {
          type: "number",
          description: "The timestamp in seconds to analyze"
        }
      },
      required: ["timestamp"]
    }
  },
  {
    name: "get_transcript_segment",
    description: "Get the transcript segment at a specific timestamp",
    parameters: {
      type: "object",
      properties: {
        timestamp: {
          type: "number",
          description: "The timestamp in seconds to get transcript for"
        }
      },
      required: ["timestamp"]
    }
  }
];

export async function getChatResponse(message: string, context: ChatContext) {
  try {
    const systemMessage = `You are an advanced AI tutor with real-time access to the video content the user is watching. You can:
1. See what's happening in the video through frame analysis
2. Read the transcript at any timestamp
3. Know exactly where the user is in the video (${formatTime(context.currentTime || 0)})

Current context:
${context.videoTitle ? '📺 Video: ' + context.videoTitle : ''}
${context.currentTranscript ? '🗣 Current segment: ' + context.currentTranscript : ''}
${context.imageContext ? '👁 Visual context: ' + context.imageContext : ''}

Use this information to provide detailed, contextual explanations. If you need to reference different parts of the video, you can use timestamps and analyze those specific moments.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: message
          }
        ],
        functions,
        function_call: 'auto',
        temperature: 0.7,
        max_tokens: 500,
        stream: true
      })
    });

    // Create a stream from the response
    const stream = OpenAIStream(response);
    
    // Return a streaming response
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Detailed error in getChatResponse:', error);
    if (error instanceof Error) {
      return new Response(`Error: ${error.message}`);
    }
    return new Response('Sorry, I encountered an error processing your request.');
  }
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
} 