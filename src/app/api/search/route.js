import { NextResponse } from 'next/server';
import ytSearch from 'yt-search';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  if (!q) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    // Perform search using yt-search
    const result = await ytSearch(q);
    
    // We only want videos, limit to top 20 results
    const videos = result.videos.slice(0, 20).map(video => ({
      videoId: video.videoId,
      title: video.title,
      url: video.url,
      thumbnail: video.thumbnail,
      timestamp: video.timestamp,
      author: {
        name: video.author.name,
        url: video.author.url
      },
      views: video.views
    }));

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Error fetching search results:', error);
    return NextResponse.json({ error: 'Failed to fetch search results.' }, { status: 500 });
  }
}
