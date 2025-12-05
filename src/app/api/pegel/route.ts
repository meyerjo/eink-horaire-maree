// API route to proxy Pegel data and avoid CORS issues
import { NextResponse } from 'next/server';

const PEGEL_API_URL = 'https://www.hochwasser.rlp.de/api/v1/measurement-site/2710080';

export async function GET() {
  try {
    const response = await fetch(PEGEL_API_URL, {
      headers: {
        'User-Agent': 'pegel-visualization-app',
      },
      // Revalidate every 15 minutes
      next: { revalidate: 900 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch Pegel data: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.error('Error fetching Pegel data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Pegel data' },
      { status: 500 }
    );
  }
}

