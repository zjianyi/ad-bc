const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
console.log('Loaded API Key:', YOUTUBE_API_KEY);
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

async function getVideoStats(videoIds: string[]) {
  try {
    const params = new URLSearchParams({
      part: 'statistics',
      id: videoIds.join(','),
      key: YOUTUBE_API_KEY || ''
    });

    const response = await fetch(`${BASE_URL}/videos?${params}`);
    const data = await response.json();
    
    return data.items?.reduce((acc: any, item: any) => {
      acc[item.id] = item.statistics;
      return acc;
    }, {}) || {};
  } catch (error) {
    console.error('Error fetching video stats:', error);
    return {};
  }
}

function formatViewCount(count: string) {
  const num = parseInt(count);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export async function searchVideos(query: string) {
  try {
    if (!query.trim()) return [];
    if (!YOUTUBE_API_KEY) {
      throw new Error('YouTube API key is not configured');
    }

    const params = new URLSearchParams({
      part: 'snippet',
      maxResults: '25',
      q: query,
      type: 'video',
      key: YOUTUBE_API_KEY
    });

    const response = await fetch(`${BASE_URL}/search?${params}`);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('YouTube API Error:', error);
      throw new Error(`YouTube API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data?.items) {
      console.error('Invalid API response:', data);
      return [];
    }

    // Get video stats for all videos
    const videoIds = data.items.map((item: any) => item.id.videoId);
    const videoStats = await getVideoStats(videoIds);
    
    return data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: new Date(item.snippet.publishedAt).toLocaleDateString(),
      viewCount: videoStats[item.id.videoId]?.viewCount ? 
        formatViewCount(videoStats[item.id.videoId].viewCount) : 'N/A'
    }));
  } catch (error) {
    console.error('Error fetching videos:', error);
    return [];
  }
}

export async function getVideoDetails(videoId: string) {
  try {
    const params = new URLSearchParams({
      part: 'snippet,statistics',
      id: videoId,
      key: YOUTUBE_API_KEY || ''
    });

    const response = await fetch(`${BASE_URL}/videos?${params}`);
    
    if (!response.ok) {
      const error = await response.json();
      console.error('YouTube API Error:', error);
      throw new Error(`YouTube API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.items?.[0] || null;
  } catch (error) {
    console.error('Error fetching video details:', error);
    return null;
  }
} 