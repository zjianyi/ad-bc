'use client';
import React from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto relative">
      <div className="relative bg-blue-50/50 rounded-lg shadow-sm">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search or paste link to video"
          className="w-full px-4 py-2 bg-transparent focus:outline-none text-gray-800"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          )}
          <button
            type="submit"
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>
    </form>
  );
} 