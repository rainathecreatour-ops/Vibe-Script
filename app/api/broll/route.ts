import { NextResponse } from 'next/server';
import { isValidAccessCode, normalizeCode } from '@/lib/validators';

export const runtime = 'nodejs';

type Body = {
  accessCode: string;
  queries: string[];
  perQuery?: number;
};

type VideoClip = {
  id: number;
  duration?: number;
  image: string;       // thumbnail
  pageUrl: string;     // Pexels page
  downloadUrl: string; // mp4
  source: 'pexels-video';
};

type PhotoClip = {
  id: number;
  image: string;       // thumbnail
  pageUrl: string;     // Pexels page
  downloadUrl: string; // jpg/original
  photographer?: string;
  source: 'pexels-photo';
};

async function fetchPexelsVideos(key: string, q: string, per: number): Promise<VideoClip[]> {
  const url = new URL('https://api.pexels.com/videos/search');
  url.searchParams.set('query', q);
  url.searchParams.set('per_page', String(per));

  const resp = await fetch(url.toString(), { headers: { Authorization: key } });
  if (!resp.ok) return [];

  const data = await resp.json();
  const vids = (data?.videos || []).map((v: any) => {
    const file =
      (v?.video_files || []).find((f: any) => f?.file_type === 'video/mp4') ||
      (v?.video_files || [])[0];

    return {
      id: v?.id,
      duration: v?.duration,
      image: v?.image,
      pageUrl: v?.url,
      downloadUrl: file?.link,
      source: 'pexels-video' as const
    };
  });

  return vids.filter((x: VideoClip) => x.image && x.downloadUrl);
}

async function fetchPexelsPhotos(key: string, q: string, per: number): Promise<PhotoClip[]> {
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', q);
  url.searchParams.set('per_page', String(per));

  const resp = await fetch(url.toString(), { headers: { Authorization: key } });
  if (!resp.ok) return [];

  const data = await resp.json();
  const photos = (data?.photos || []).map((p: any) => ({
    id: p?.id,
    image: p?.src?.medium || p?.src?.small || p?.src?.original,
    pageUrl: p?.url,
    downloadUrl: p?.src?.original || p?.src?.large2x || p?.src?.large,
    photographer: p?.photographer,
    source: 'pexels-photo' as const
  }));

  return photos.filter((x: PhotoClip) => x.image && x.downloadUrl);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const accessCode = normalizeCode(body.accessCode);
    if (!isValidAccessCode(accessCode)) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 401 });
    }

    const key = process.env.PEXELS_API_KEY;
    if (!key) {
      return NextResponse.json({ error: 'Missing PEXELS_API_KEY' }, { status: 500 });
    }

    const perQuery = Math.min(Math.max(body.perQuery ?? 3, 1), 6);
    const queries = (body.queries || []).map(q => (q || '').trim()).filter(Boolean).slice(0, 12);

    const results = await Promise.all(
      queries.map(async (q) => {
        const [videos, photos] = await Promise.all([
          fetchPexelsVideos(key, q, perQuery),
          fetchPexelsPhotos(key, q, perQuery),
        ]);
        return { query: q, videos, photos };
      })
    );

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Server error', details: String(err?.message || err) },
      { status: 500 }
    );
  }
}
