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
    console.log('Making request to OpenAI with key:', OPENAI_API_KEY?.slice(0, 10) + '...');
    
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
        max_tokens: 500
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
    
    // Handle function calls
    if (data.choices?.[0]?.message?.function_call) {
      const functionCall = data.choices[0].message.function_call;
      const args = JSON.parse(functionCall.arguments);

      let functionResult;
      if (functionCall.name === 'analyze_video_frame') {
        // Get frame analysis at the specified timestamp
        functionResult = context.imageContext || 'No visual context available for this timestamp';
      } else if (functionCall.name === 'get_transcript_segment') {
        // Get transcript at the specified timestamp
        functionResult = context.currentTranscript || 'No transcript available for this timestamp';
      }

      // Make a follow-up call to OpenAI with the function result
      const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            },
            {
              role: 'assistant',
              content: null,
              function_call: functionCall
            },
            {
              role: 'function',
              name: functionCall.name,
              content: JSON.stringify(functionResult)
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      const followUpData = await followUpResponse.json();
      if (!followUpData.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from OpenAI API in function call');
      }

      return followUpData.choices[0].message.content;
    }

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