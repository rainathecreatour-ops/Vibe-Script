import { NextResponse } from 'next/server';
import { isValidAccessCode, normalizeCode } from '@/lib/validators';
import { buildSystemPrompt, buildUserPrompt, Input } from '@/lib/builders';

export const runtime = 'nodejs';

type Body = {
  accessCode: string;
  input: Input;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const accessCode = normalizeCode(body.accessCode);

    if (!isValidAccessCode(accessCode)) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 401 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    }

    // OpenAI Responses API (works well). If you prefer Chat Completions, I can swap it.
    const resp = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(body.input) },
        ],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        { error: 'Model request failed', details: text.slice(0, 1200) },
        { status: 500 }
      );
    }

    const data = await resp.json();

    // Attempt to extract text from Responses API output
    const out =
      data?.output_text ||
      data?.output?.map((o: any) => o?.content?.map((c: any) => c?.text).join('\n')).join('\n') ||
      '';

    if (!out) {
      return NextResponse.json({ error: 'Empty output from model' }, { status: 500 });
    }

    return NextResponse.json({ result: out });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error', details: String(err?.message || err) }, { status: 500 });
  }
}
