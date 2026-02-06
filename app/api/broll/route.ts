import { NextResponse } from 'next/server';
import { isValidAccessCode, normalizeCode } from '@/lib/validators';

export const runtime = 'nodejs';

type Body = {
  accessCode: string;
  queries: string[]; // each query = 1 b-roll item
  perQuery?: number; // clips per b-roll item
};

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

    if (queries.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const results = await Promise.all(
      queries.map(async (q) => {
        const url = new URL('https://api.pexels.com/videos/search');
        url.searchParams.set('query', q);
        url.searchParams.set('per_page', String(perQuery));
        url.searchParams.set('orientation', 'portrait'); // good default for reels/shorts
        url.searchParams.set('size', 'medium');

        const resp = await fetch(url.toString(), {
          headers: { Authorization: key },
        });

        if (!resp.ok) {
          const text = await resp.text();
          return {
            query: q,
            error: `Pexels error (${resp.status})`,
            details: text.slice(0, 500),
            videos: [],
          };
        }

        const data = await resp.json();

        const videos = (data?.videos || []).map((v: any) => {
          // pick a decent MP4 file (usually the first is fine)
          const file =
            (v?.video_files || []).find((f: any) => f?.file_type === 'video/mp4') ||
            (v?.video_files || [])[0];

          return {
            id: v?.id,
            duration: v?.duration,
            image: v?.image, // thumbnail
            pageUrl: v?.url, // Pexels page
            downloadUrl: file?.link, // direct mp4
            width: file?.width,
            height: file?.height,
          };
        });

        return { query: q, videos };
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
