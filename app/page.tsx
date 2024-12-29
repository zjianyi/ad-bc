'use client';
import React from 'react';
import { useState } from 'react';
import Image from 'next/image';
import SearchBar from './components/SearchBar';
import VideoList from './components/VideoList';
import { searchVideos, getVideoDetails } from './services/youtube';
import { getChatResponse } from './services/openai';

export default function Home() {
  const [videos, setVideos] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [messages, setMessages] = useState<{text: string, isUser: boolean}[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (query: string) => {
    const results = await searchVideos(query);
    setVideos(results);
    setSelectedVideoId(null);
  };

  const handleVideoSelect = async (videoId: string) => {
    setSelectedVideoId(videoId);
    const videoDetails = await getVideoDetails(videoId);
    if (videoDetails?.snippet?.title) {
      setVideoTitle(videoDetails.snippet.title);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setIsLoading(true);

    try {
      const response = await getChatResponse(userMessage, videoTitle);
      setMessages(prev => [...prev, { text: response, isUser: false }]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setMessages(prev => [...prev, { 
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
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
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${selectedVideoId}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="rounded-lg shadow-lg"
                />
              </div>
              {videoTitle && (
                <h2 className="mt-4 text-xl font-semibold text-gray-900">{videoTitle}</h2>
              )}
            </div>
            
            <div className="lg:col-span-4">
              <div className="bg-gray-50 rounded-lg p-4 h-[600px] flex flex-col">
                <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 max-w-[80%] ${
                          msg.isUser
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {msg.text}
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
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
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