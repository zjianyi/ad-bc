'use client';
import React from 'react';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: string;
}

interface VideoListProps {
  videos: Video[];
  onVideoSelect: (videoId: string) => void;
}

export default function VideoList({ videos, onVideoSelect }: VideoListProps) {
  return (
    <div className="space-y-4">
      {videos.map((video) => (
        <div
          key={video.id}
          className="flex gap-4 cursor-pointer hover:bg-gray-50/50 p-2 rounded-lg transition-colors"
          onClick={() => onVideoSelect(video.id)}
        >
          <div className="flex-shrink-0">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-40 h-24 object-cover rounded-lg"
            />
          </div>
          <div className="flex flex-col justify-between py-1">
            <div>
              <h3 className="font-medium text-gray-900 line-clamp-2">{video.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{video.channelTitle}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{video.viewCount} views</span>
              <span>•</span>
              <span>{video.publishedAt}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 