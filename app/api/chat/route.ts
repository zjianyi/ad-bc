import OpenAI from 'openai';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY
});

export async function POST(req: Request) {
  const { messages, body } = await req.json();
  const lastMessage = messages[messages.length - 1];

  const systemMessage = `You are an advanced AI tutor with real-time access to the video content the user is watching. You can:
1. See what's happening in the video through the current frame
2. Read the transcript at any timestamp
3. Know exactly where the user is in the video (${formatTime(body.currentTime || 0)})

Current context:
${body.videoTitle ? '📺 Video: ' + body.videoTitle : ''}
${body.currentTranscript ? '🗣 Current segment: ' + body.currentTranscript : ''}`;

  const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemMessage },
  ];

  // Add the image if available
  if (body.imageContext) {
    apiMessages.push({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: body.imageContext } },
        { type: 'text', text: 'This is the current frame of the video. Please use this visual context when answering questions.' }
      ]
    });
  }

  // Add the user's message
  apiMessages.push({
    role: 'user',
    content: lastMessage.content,
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4-0125-preview',
    messages: apiMessages,
    temperature: 0.7,
    max_tokens: 500,
    stream: true
  });

  // Transform the response into a text-event-stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      for await (const chunk of response) {
        const text = chunk.choices[0]?.delta?.content || '';
        if (text) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
} 