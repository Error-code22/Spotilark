import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const dynamic = 'force-dynamic'; // Ensure dynamic rendering for API route

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  const artist = searchParams.get('artist');

  if (!title || !artist) {
    return NextResponse.json({ error: 'Missing title or artist parameters.' }, { status: 400 });
  }

  const GENIUS_ACCESS_TOKEN = process.env.GENIUS_CLIENT_ACCESS_TOKEN;

  if (!GENIUS_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'Genius API access token not configured.' }, { status: 500 });
  }

  try {
    // 1. Search for the song on Genius API
    const searchQuery = `${title} ${artist}`;
    const searchUrl = `https://api.genius.com/search?q=${encodeURIComponent(searchQuery)}`;

    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${GENIUS_ACCESS_TOKEN}`,
      },
    });

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('Genius API search error:', errorData);
      return NextResponse.json({ error: 'Failed to search for lyrics on Genius.' }, { status: searchResponse.status });
    }

    const searchData = await searchResponse.json();
    const hits = searchData.response.hits;

    if (!hits || hits.length === 0) {
      return NextResponse.json({ lyrics: 'No lyrics found for this song.' }, { status: 404 });
    }

    // Try to find the best match (e.g., matching title and artist more closely)
    // For simplicity, we'll take the first hit for now.
    const songPath = hits[0].result.path; // e.g., /artists/Drake/Hotline-bling

    if (!songPath) {
      return NextResponse.json({ lyrics: 'No lyrics page found for this song.' }, { status: 404 });
    }

    // 2. Scrape lyrics from the song page
    const geniusSongUrl = `https://genius.com${songPath}`;
    const songPageResponse = await fetch(geniusSongUrl);

    if (!songPageResponse.ok) {
      console.error('Failed to fetch Genius song page:', songPageResponse.statusText);
      return NextResponse.json({ error: 'Failed to retrieve lyrics from Genius page.' }, { status: songPageResponse.status });
    }

    const html = await songPageResponse.text();
    const $ = cheerio.load(html);

    // Genius lyrics are typically inside a div with data-lyrics-container="true"
    // or similar structure. This selector might need adjustment if Genius changes its HTML.
    const lyricsContainers = $('[data-lyrics-container="true"]');
    let lyrics = '';

    if (lyricsContainers.length) {
      lyricsContainers.each((i, el) => {
        // Replace <br> with newlines and </div> with newlines
        $(el).find('br').replaceWith('\n');
        lyrics += $(el).text() + '\n\n';
      });
      lyrics = lyrics.trim();
    } else {
      // Fallback selector
      lyrics = $('.lyrics').text().trim();
    }

    if (!lyrics) {
      return NextResponse.json({ lyrics: 'Could not extract lyrics from the page.' }, { status: 404 });
    }

    // Clean up lyrics (remove section headers like [Verse 1], [Chorus])
    lyrics = lyrics.replace(/\[.*?\]/g, '').trim();

    return NextResponse.json({ lyrics });

  } catch (error: any) {
    console.error('Error fetching lyrics:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred while fetching lyrics.' }, { status: 500 });
  }
}
