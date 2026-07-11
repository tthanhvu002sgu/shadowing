import { NextResponse } from 'next/server';
import ytSearch from 'yt-search';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  
  if (!q) {
    return NextResponse.json({ error: 'Query or URL is required' }, { status: 400 });
  }

  try {
    // Perform search using yt-search
    const result = await ytSearch({ search: q, type: 'channel' });
    
    if (!result.channels || result.channels.length === 0) {
        // Try searching broadly if channel specific search fails, though ytSearch usually handles URL directly.
        const fallback = await ytSearch(q);
        if (fallback.channels && fallback.channels.length > 0) {
            const channel = fallback.channels[0];
            return NextResponse.json({ 
                channel: {
                    id: channel.id,
                    name: channel.name,
                    url: channel.url,
                    thumbnail: channel.thumbnail || channel.image,
                    about: channel.about || channel.title
                } 
            });
        }
        return NextResponse.json({ error: 'No channel found for this query.' }, { status: 404 });
    }

    const channel = result.channels[0];

    return NextResponse.json({ 
        channel: {
            id: channel.id,
            name: channel.name,
            url: channel.url,
            thumbnail: channel.thumbnail || channel.image,
            about: channel.about || channel.title
        } 
    });
  } catch (error) {
    console.error('Error fetching channel details:', error);
    return NextResponse.json({ error: 'Failed to fetch channel details.' }, { status: 500 });
  }
}
