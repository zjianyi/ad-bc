'use client';
import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useChat } from 'ai/react';
import SearchBar from './components/SearchBar';
import VideoList from './components/VideoList';
import { searchVideos, getVideoDetails, getVideoTranscript, findTranscriptSegmentAtTime, type TranscriptSegment, getVideoThumbnailUrl } from './services/youtube';
import { processVideoFrame } from './services/imageProcessing';

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [currentFrameAnalysis, setCurrentFrameAnalysis] = useState<string>('');
  const playerRef = useRef<HTMLIFrameElement>(null);
  const ytPlayerRef = useRef<YT.Player | null>(null);
  const playerInitialized = useRef(false);
  const [messages, setMessages] = useState<{role: string; content: string; id: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMessage, id: Date.now().toString() }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          body: {
            videoTitle,
            currentTranscript,
            currentTime,
            imageContext: currentFrameAnalysis
          }
        })
      });

      if (!response.ok) throw new Error(response.statusText);

      // This is the message we'll build up
      let currentMessage = { role: 'assistant', content: '', id: (Date.now() + 1).toString() };
      setMessages(msgs => [...msgs, currentMessage]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            
            try {
              const { text } = JSON.parse(data);
              currentMessage.content += text;
              setMessages(msgs => msgs.map(msg => 
                msg.id === currentMessage.id ? currentMessage : msg
              ));
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in chat:', error);
      setMessages(msgs => [...msgs, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.',
        id: Date.now().toString()
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, videoTitle, currentTranscript, currentTime, currentFrameAnalysis]);

  // Initialize YouTube API
  useEffect(() => {
    if (!playerInitialized.current) {
      // Load YouTube IFrame API
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      // Initialize player when API is ready
      window.onYouTubeIframeAPIReady = () => {
        if (selectedVideoId && playerRef.current) {
          ytPlayerRef.current = new window.YT.Player(playerRef.current, {
            events: {
              onStateChange: (event: YT.OnStateChangeEvent) => {
                if (event.data === window.YT.PlayerState.PLAYING) {
                  // Update time every second while playing
                  const interval = setInterval(() => {
                    if (ytPlayerRef.current) {
                      const time = ytPlayerRef.current.getCurrentTime();
                      setCurrentTime(time);
                    }
                  }, 1000);
                  return () => clearInterval(interval);
                }
              }
            }
          });
        }
      };
      playerInitialized.current = true;
    }
  }, [selectedVideoId]);

  // Function to analyze frame at current timestamp
  const analyzeCurrentFrame = async () => {
    if (!selectedVideoId) return;

    try {
      const thumbnailUrl = await getVideoThumbnailUrl(selectedVideoId, currentTime);
      const analysis = await processVideoFrame(thumbnailUrl);
      if (analysis.shouldProcess && analysis.imageUrl) {
        setCurrentFrameAnalysis(analysis.imageUrl);
      }
    } catch (error) {
      console.error('Error analyzing frame:', error);
    }
  };

  useEffect(() => {
    if (selectedVideoId) {
      getVideoTranscript(selectedVideoId).then(setTranscript);
    }
  }, [selectedVideoId]);

  useEffect(() => {
    const updateTranscript = async () => {
      const currentSegment = await findTranscriptSegmentAtTime(transcript, currentTime);
      if (currentSegment) {
        setCurrentTranscript(currentSegment.text);
      }
    };
    updateTranscript();
    // Also analyze the current frame when time updates
    analyzeCurrentFrame();
  }, [transcript, currentTime, selectedVideoId]);

  const handleSearch = async (query: string) => {
    const results = await searchVideos(query);
    setVideos(results);
    setSelectedVideoId(null);
    setTranscript([]);
    setCurrentTime(0);
    setCurrentTranscript('');
  };

  const handleVideoSelect = async (videoId: string) => {
    setSelectedVideoId(videoId);
    const videoDetails = await getVideoDetails(videoId);
    if (videoDetails?.snippet?.title) {
      setVideoTitle(videoDetails.snippet.title);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-[1920px] mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-center mb-16">
            <Image
              src="/adbclogo.png"
              alt="ADBC Logo"
              width={100}
              height={100}
              priority
            />
          </div>
          <SearchBar onSearch={handleSearch} />
        </div>
        
        {!selectedVideoId && videos.length > 0 && (
          <div className="max-w-3xl mx-auto">
            <VideoList
              videos={videos}
              onVideoSelect={handleVideoSelect}
            />
          </div>
        )}

        {selectedVideoId && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8">
              <div className="aspect-video w-full">
                <iframe
                  ref={playerRef}
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${selectedVideoId}?enablejsapi=1`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg shadow-lg"
                />
              </div>
              {videoTitle && (
                <h2 className="mt-4 text-xl font-semibold text-gray-900">{videoTitle}</h2>
              )}
              {currentTranscript && (
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700">{currentTranscript}</p>
                </div>
              )}
            </div>
            
            <div className="lg:col-span-4">
              <div className="bg-gray-50 rounded-lg p-4 h-[600px] flex flex-col">
                <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 max-w-[80%] ${
                          msg.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-200 text-gray-800 rounded-lg px-4 py-2">
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question about the video..."
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:border-blue-500"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-lg text-white transition-colors ${
                      isLoading 
                        ? 'bg-blue-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                    disabled={isLoading}
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
} 