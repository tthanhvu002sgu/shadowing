import { YoutubeTranscript } from 'youtube-transcript';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url, { lang: 'en' });
    
    // Process transcript to group into sentences and add end times
    const processedTranscript = transcript.map((item, index) => {
      const nextItem = transcript[index + 1];
      // Try to determine the end time, either from the next item or from duration
      let endTime = item.offset + item.duration;
      if (nextItem && nextItem.offset < endTime) {
         // Prevent overlap: end this sentence exactly when the next one starts
         endTime = nextItem.offset;
      }
      
      return {
        text: item.text,
        start: item.offset / 1000, // convert ms to seconds
        end: endTime / 1000,
      };
    });

    return NextResponse.json({ transcript: processedTranscript });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json({ error: 'Failed to fetch transcript. The video might not have closed captions.' }, { status: 500 });
  }
}
