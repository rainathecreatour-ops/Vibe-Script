'use client';

import React, { useMemo, useState } from 'react';
import type { Input, Topic, Tone, Platform, ScriptStructure, Aspect } from '@/lib/builders';

const TOPICS: Topic[] = [
  'Money Affirmations',
  'Motivation',
  'Spiritual (Non-Religious)',
  'Religious (Faith/Bible)',
  'Relatable Everyday',
  'Healing/Anxiety Relief',
  'Confidence/Self-Worth',
  'Custom'
];

const TONES: Tone[] = [
  'Calm',
  'Powerful',
  'Emotional',
  'Soft & Nurturing',
  'Bold & Confident',
  'Cinematic',
  'Relatable/Conversational'
];

const PLATFORMS: Platform[] = ['Suno', 'YouTube', 'TikTok/Reels', 'Podcast', 'Meditation App', 'ElevenLabs'];

const STRUCTURES: ScriptStructure[] = [
  'Hook → Message → Close',
  'Affirmation Loop',
  'Story-Based',
  'Guided Reflection',
  'Prayer-Style'
];

const ASPECTS: Aspect[] = ['Vertical 9:16', 'Square 1:1', 'Horizontal 16:9'];

const DURATIONS = [
  { label: '30 seconds', seconds: 30 },
  { label: '1 minute', seconds: 60 },
  { label: '2 minutes', seconds: 120 },
  { label: '5 minutes', seconds: 300 },
  { label: '10 minutes', seconds: 600 },
  { label: '20 minutes', seconds: 1200 },
  { label: '30 minutes', seconds: 1800 },
  { label: '60 minutes (max)', seconds: 3600 }
];

export default function Page() {
  const [accessCode, setAccessCode] = useState('');
  const [topic, setTopic] = useState<Topic>('Money Affirmations');
  const [customTopic, setCustomTopic] = useState('');
  const [tone, setTone] = useState<Tone>('Calm');
  const [platform, setPlatform] = useState<Platform>('Suno');
  const [structure, setStructure] = useState<ScriptStructure>('Hook → Message → Close');
  const [aspect, setAspect] = useState<Aspect>('Vertical 9:16');
  const [durationSeconds, setDurationSeconds] = useState<number>(60);

  const [voiceStyle, setVoiceStyle] =
    useState<'Warm Coach' | 'Soft Narrator' | 'Confident Narrator' | 'Spiritual Guide'>('Warm Coach');
  const [hookStrength, setHookStrength] =
    useState<'Gentle' | 'Balanced' | 'Strong' | 'Scroll-Stopping'>('Balanced');
  const [audience, setAudience] = useState<'Women' | 'Men' | 'Moms' | 'Teens' | 'Everyone'>('Everyone');

  const [includeHooksCaptions, setIncludeHooksCaptions] = useState(true);

  // ✅ NEW toggle
  const [includeBRoll, setIncludeBRoll] = useState(true);

  const [keywords, setKeywords] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const input: Input = useMemo(
    () => ({
      topic,
      customTopic: topic === 'Custom' ? customTopic : undefined,
      tone,
      platform,
      durationSeconds,
      structure,
      aspect,
      voiceStyle,
      hookStrength,
      audience,
      keywords,
      notes,
      includeHooksCaptions,
      includeBRoll
    }),
    [
      topic, customTopic, tone, platform, durationSeconds, structure, aspect,
      voiceStyle, hookStrength, audience, keywords, notes,
      includeHooksCaptions, includeBRoll
    ]
  );

  function downloadTxt() {
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vibescript_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onGenerate() {
    setError('');
    setResult('');
    setLoading(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode, input })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to generate');
        return;
      }

      setResult(data.result);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="grid">
        <div className="card">
          <div className="badge">Paid Access Code • Scripts, visuals, and music prompts that match your vibe</div>
          <h1 className="h1" style={{ marginTop: 10 }}>VibeScript</h1>
          <div className="small">
            Generate scripts + visuals + music prompts {includeHooksCaptions ? '+ hooks/captions ' : ''}{includeBRoll ? '+ B-roll shot list ' : ''}in one click.
          </div>
        </div>

        <div className="card">
          <h2 className="h2">Access</h2>
          <div className="row">
            <div>
              <label>Access Code</label>
              <input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="Enter your paid access code" />
              <div className="small" style={{ marginTop: 6 }}>Sell codes on Gumroad/Payhip and deliver via email.</div>
            </div>

            <div>
              <label>Platform (music/usage)</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <hr />

          <h2 className="h2">Script Settings</h2>
          <div className="row">
            <div>
              <label>Topic</label>
              <select value={topic} onChange={(e) => setTopic(e.target.value as Topic)}>
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              {topic === 'Custom' && (
                <div style={{ marginTop: 10 }}>
                  <label>Custom Topic</label>
                  <input value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} placeholder="e.g., 'Single mom encouragement for mornings'" />
                </div>
              )}
            </div>

            <div>
              <label>Tone</label>
              <select value={tone} onChange={(e) => setTone(e.target.value as Tone)}>
                {TONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <div>
              <label>Length</label>
              <select value={String(durationSeconds)} onChange={(e) => setDurationSeconds(Number(e.target.value))}>
                {DURATIONS.map(d => <option key={d.seconds} value={d.seconds}>{d.label}</option>)}
              </select>
            </div>

            <div>
              <label>Structure</label>
              <select value={structure} onChange={(e) => setStructure(e.target.value as ScriptStructure)}>
                {STRUCTURES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <div>
              <label>Voice Style</label>
              <select value={voiceStyle} onChange={(e) => setVoiceStyle(e.target.value as any)}>
                {['Warm Coach','Soft Narrator','Confident Narrator','Spiritual Guide'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Hook Strength</label>
              <select value={hookStrength} onChange={(e) => setHookStrength(e.target.value as any)}>
                {['Gentle','Balanced','Strong','Scroll-Stopping'].map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <div>
              <label>Audience</label>
              <select value={audience} onChange={(e) => setAudience(e.target.value as any)}>
                {['Everyone','Women','Men','Moms','Teens'].map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Visual aspect ratio</label>
              <select value={aspect} onChange={(e) => setAspect(e.target.value as Aspect)}>
                {ASPECTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Extras toggles */}
          <div style={{ marginTop: 12 }}>
            <label>Extras</label>

            {/* Hooks/Captions */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                border: '1px solid var(--border)',
                background: 'rgba(10, 10, 18, 0.6)',
                borderRadius: 12,
                padding: '10px 12px',
                marginBottom: 10
              }}
            >
              <input
                type="checkbox"
                checked={includeHooksCaptions}
                onChange={(e) => setIncludeHooksCaptions(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Include Hooks & Captions</div>
                <div className="small">Adds 3 hooks + 3 captions to your output.</div>
              </div>
              <span className="badge">{includeHooksCaptions ? 'ON' : 'OFF'}</span>
            </div>

            {/* ✅ B-roll */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                border: '1px solid var(--border)',
                background: 'rgba(10, 10, 18, 0.6)',
                borderRadius: 12,
                padding: '10px 12px'
              }}
            >
              <input
                type="checkbox"
                checked={includeBRoll}
                onChange={(e) => setIncludeBRoll(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Include B-roll Shot List</div>
                <div className="small">Adds 10 clip ideas (subject + shot type + motion + mood).</div>
              </div>
              <span className="badge">{includeBRoll ? 'ON' : 'OFF'}</span>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <div>
              <label>Keywords (optional)</label>
              <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g., abundance, discipline, peace, gratitude" />
            </div>
            <div>
              <label>Extra notes (optional)</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., include a CTA to save/share" />
            </div>
          </div>

          <div className="row" style={{ marginTop: 14 }}>
            <button onClick={onGenerate} disabled={loading}>
              {loading ? 'Generating...' : 'Generate VibeScript'}
            </button>
            <button className="secondary" onClick={() => { setResult(''); setError(''); }} disabled={loading}>
              Clear
            </button>
          </div>

          {error && <div className="small" style={{ marginTop: 12, color: '#ffb4b4' }}>Error: {error}</div>}
        </div>

        <div className="card">
          <h2 className="h2">Your VibeScript Output</h2>
          <div className="small" style={{ marginBottom: 10 }}>
            Includes script, 5 visual prompts, and a music prompt
            {includeHooksCaptions ? ' + hooks/captions' : ''}
            {includeBRoll ? ' + B-roll shot list' : ''}
            .
          </div>

          {!result && <div className="small">Your output will appear here.</div>}

          {result && (
            <>
              <div className="row" style={{ marginBottom: 12 }}>
                <button onClick={() => navigator.clipboard.writeText(result)}>Copy Output</button>
                <button className="secondary" onClick={downloadTxt}>Download .txt</button>
              </div>
              <pre>{result}</pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
