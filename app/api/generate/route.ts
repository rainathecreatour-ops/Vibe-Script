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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing ANTHROPIC_API_KEY' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `${buildSystemPrompt()}\n\n${buildUserPrompt(body.input)}`
          }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: 'Anthropic request failed', details: text.slice(0, 1200) },
        { status: 500 }
      );
    }

    const data = await response.json();

    const output =
      data?.content?.map((c: any) => c?.text).join('\n') || '';

    if (!output) {
      return NextResponse.json(
        { error: 'Empty response from Anthropic' },
        { status: 500 }
      );
    }

    return NextResponse.json({ result: output });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Server error', details: String(err?.message || err) },
      { status: 500 }
    );
  }
}
