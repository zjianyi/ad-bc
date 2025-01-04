import { getChatResponse } from '../../services/openai';

export async function POST(req: Request) {
  const { messages, body } = await req.json();
  const lastMessage = messages[messages.length - 1];

  return getChatResponse(lastMessage.content, {
    videoTitle: body.videoTitle,
    currentTranscript: body.currentTranscript,
    currentTime: body.currentTime,
    imageContext: body.imageContext
  });
} 