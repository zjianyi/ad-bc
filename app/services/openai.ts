"use server";

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

export async function getChatResponse(message: string, context: ChatContext) {
  try {
    console.log('Making request to OpenAI with key:', OPENAI_API_KEY?.slice(0, 10) + '...');
    
    const systemMessage = `You are a helpful AI tutor. ${
      context.videoTitle ? 'The user is watching a video about: ' + context.videoTitle : ''
    }${
      context.currentTranscript ? '\nCurrent transcript context: ' + context.currentTranscript : ''
    }${
      context.currentTime ? '\nCurrent video timestamp: ' + formatTime(context.currentTime) : ''
    }${
      context.imageContext ? '\nVisual context from current frame: ' + context.imageContext : ''
    }`;

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
        temperature: 0.7,
        max_tokens: 150
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('OpenAI API error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`OpenAI API error: ${response.status} - ${errorData?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenAI API response:', data);
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI API');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Detailed error in getChatResponse:', error);
    if (error instanceof Error) {
      return `Error: ${error.message}`;
    }
    return 'Sorry, I encountered an error processing your request.';
  }
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
} 