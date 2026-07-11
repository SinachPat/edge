import { env } from './env';
import type { SharpApiEvResponse, SharpApiClvResponse } from '@/types/api';

const BASE_URL = 'https://api.sharpapi.io';
const RATE_LIMIT_DELAY_MS = 5000; // 12 requests/minute free tier

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${env.SHARPAPI_KEY}` };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getExpectedValue(
  sport: string,
  eventId: string,
  market: string,
  selection: string
): Promise<SharpApiEvResponse | null> {
  try {
    const url = new URL(`${BASE_URL}/v1/ev/${sport}/${eventId}`);
    url.searchParams.set('market', market);
    url.searchParams.set('selection', selection);

    const res = await fetch(url.toString(), { headers: authHeaders() });

    if (res.status === 429) {
      console.warn(`[sharpapi] rate limited on EV lookup for ${sport}/${eventId}`);
      return null;
    }
    if (!res.ok) {
      console.warn(`[sharpapi] EV lookup failed for ${sport}/${eventId}: HTTP ${res.status}`);
      return null;
    }

    return (await res.json()) as SharpApiEvResponse;
  } catch (err) {
    console.warn(`[sharpapi] EV lookup error for ${sport}/${eventId}:`, err);
    return null;
  }
}

export async function getClosingLineValue(
  eventId: string,
  betOdds: number,
  market: string
): Promise<SharpApiClvResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/v1/clv/${eventId}`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ betOdds, market }),
    });

    if (!res.ok) {
      console.warn(`[sharpapi] CLV lookup failed for ${eventId}: HTTP ${res.status}`);
      return null;
    }

    return (await res.json()) as SharpApiClvResponse;
  } catch (err) {
    console.warn(`[sharpapi] CLV lookup error for ${eventId}:`, err);
    return null;
  }
}

export async function batchGetEV(
  events: { sport: string; eventId: string; market: string; selection: string }[]
): Promise<(SharpApiEvResponse | null)[]> {
  const results: (SharpApiEvResponse | null)[] = [];
  for (let i = 0; i < events.length; i++) {
    const { sport, eventId, market, selection } = events[i];
    results.push(await getExpectedValue(sport, eventId, market, selection));
    if (i < events.length - 1) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  }
  return results;
}

export function isPositiveEV(ev: SharpApiEvResponse | null, minEdge = 4): boolean {
  return ev !== null && ev.ev >= minEdge;
}
