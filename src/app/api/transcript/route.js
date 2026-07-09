import { YoutubeTranscript } from 'youtube-transcript';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Merges raw YouTube transcript fragments into natural sentences.
 *
 * Strategy:
 *  1. Accumulate fragments into a text buffer, tracking the start time of
 *     the first fragment and the end time of the last fragment in the group.
 *  2. After appending each fragment, check whether the buffer should be
 *     flushed (= turned into a finished sentence). Flush when:
 *       a. The text ends with sentence-ending punctuation (. ! ?)
 *       b. The text is longer than SOFT_MAX and ends at a clause-level
 *          punctuation mark (, ; : –)
 *       c. The text exceeds HARD_MAX (force-flush to avoid overly long lines
 *          even if there is no punctuation)
 *  3. Any leftover text after the loop is flushed as a final sentence.
 */
const SOFT_MAX = 80;   // chars – prefer to split here if a comma/colon is found
const HARD_MAX = 150;  // chars – force-split even without any punctuation

function groupIntoSentences(rawItems) {
  const sentences = [];

  let buffer = '';
  let startTime = 0;   // ms
  let endTime = 0;      // ms

  const flush = () => {
    const text = buffer.trim();
    if (text.length === 0) return;
    sentences.push({
      text,
      start: startTime / 1000,
      end: endTime / 1000,
    });
    buffer = '';
  };

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];
    const fragment = item.text.replace(/\n/g, ' ').trim();
    if (!fragment) continue;

    // Calculate end time for this fragment
    let fragEnd = item.offset + item.duration;
    const nextItem = rawItems[i + 1];
    if (nextItem && nextItem.offset < fragEnd) {
      fragEnd = nextItem.offset; // prevent overlap
    }

    // Start a new group if buffer is empty
    if (buffer.length === 0) {
      startTime = item.offset;
    }
    endTime = fragEnd;

    // Append fragment to buffer (add space separator if needed)
    if (buffer.length > 0 && !buffer.endsWith(' ')) {
      buffer += ' ';
    }
    buffer += fragment;

    // --- Decide whether to flush ---

    // a. Sentence-ending punctuation
    if (/[.!?]["'»)\]]?$/.test(buffer)) {
      flush();
      continue;
    }

    // b. Clause-level punctuation when text is already moderately long
    if (buffer.length >= SOFT_MAX && /[,;:–]$/.test(buffer)) {
      flush();
      continue;
    }

    // c. Hard limit – force split at the last space to avoid breaking words
    if (buffer.length >= HARD_MAX) {
      const lastSpace = buffer.lastIndexOf(' ', HARD_MAX);
      if (lastSpace > SOFT_MAX / 2) {
        // Split at the last reasonable space
        const overflow = buffer.slice(lastSpace + 1);
        buffer = buffer.slice(0, lastSpace);
        flush();
        // Put the overflow back in the buffer for the next sentence
        buffer = overflow;
        startTime = item.offset; // approximate – use current fragment's start
      } else {
        // No good space to split at – just flush everything
        flush();
      }
      continue;
    }
  }

  // Flush whatever is left
  flush();

  return sentences;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(url, { lang: 'en' });

    const processedTranscript = groupIntoSentences(transcript);

    return NextResponse.json({ transcript: processedTranscript });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json({ error: 'Failed to fetch transcript. The video might not have closed captions.' }, { status: 500 });
  }
}
