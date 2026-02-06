import { NextResponse } from 'next/server';
import { isValidAccessCode, normalizeCode } from '@/lib/validators';
import { buildSystemPrompt, buildUserPrompt, Input } from '@/lib/builders';

export const runtime = 'nodejs';

type Body = {
  accessCode: string;
  input: Input;
};

function pickAnthropicModel() {
  // Default to a current, documented alias
  // You can override with a Vercel env var: ANTHROPIC_MODEL=claude-opus-4-6 (or other)
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';
}

function maxTokensFor(input: Input) {
  // Keep it safe; Sonnet supports large outputs, but you still want an MVP-friendly cap.
  // You can bump this later if desired.
  const base = 6000;
  const bump = Math.floor((input.durationSeconds || 60) / 60) * 500; // +500 per minute
  return Math.min(12000, base + bump);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const accessCode = normalizeCode(body.accessCode);

    if (!isValidAccessCode(accessCode)) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 });
    }

    const model = pickAnthropicModel();

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokensFor(body.input),
        system: buildSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: buildUserPrompt(body.input),
          },
        ],
      }),
    });

    // If Anthropic rejects it, surface the real reason
    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        {
          error: 'Anthropic request failed',
          details: text.slice(0, 2000),
          modelUsed: model,
        },
        { status: 500 }
      );
    }

    const data = await resp.json();
    const output = (data?.content || [])
      .map((c: any) => (c?.type === 'text' ? c?.text : ''))
      .join('\n')
      .trim();

    if (!output) {
      return NextResponse.json(
        { error: 'Empty response from Anthropic', modelUsed: model },
        { status: 500 }
      );
    }

    return NextResponse.json({ result: output, modelUsed: model });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Server error', details: String(err?.message || err) },
      { status: 500 }
    );
  }
}
