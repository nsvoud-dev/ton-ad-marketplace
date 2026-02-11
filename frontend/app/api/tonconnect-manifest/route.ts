import { NextRequest, NextResponse } from 'next/server';

/**
 * Dynamic TonConnect manifest — url and iconUrl from request domain (no trailing slashes).
 * CORS header required for wallet fetches.
 */
export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || 'localhost:3000';
  const origin = process.env.NEXT_PUBLIC_APP_URL || `https://${host}`;
  const base = (origin || `https://${host}`).replace(/\/+$/, '') || `https://${host}`;
  const manifest = {
    url: base,
    name: 'Ton Ad Marketplace',
    iconUrl: `${base}/icon.png`,
  };
  return NextResponse.json(manifest, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
