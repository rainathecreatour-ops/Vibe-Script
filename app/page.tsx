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

type Clip = {
  id: number;
  image: string;
  pageUrl: string;
  downloadUrl: string;
  duration?: number;
};

type BRollResult = {
  query: string;
  videos: Clip[];
  photos: Clip[];
};

function buildFallbackQueries(topic: string, keywords: string) {
  const base = `${topic} ${keywords || ''}`.trim();
  // 5 searches is enough; the API will fetch multiple results per query
  return [
    `${base} journaling`,
    `${base} calm morning`,
    `${base} hands writing notebook`,
    `${base} peaceful nature`,
    `${base} cozy desk workspace`,
  ];
}

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
  const [includeBRoll, setIncludeBRoll] = useState(true);

  const [keywords, setKeywords] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [brollLoading, setBRollLoading] = useState(false);

  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const [brollResults, setBRollResults] = useState<BRollResult[]>([]);

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

  async function fetchBRollClips() {
    if (!includeBRoll) {
      setBRollResults([]);
      return;
    }

    setBRollLoading(true);
    try {
      const topicFinal = topic === 'Custom' ? (customTopic || 'Custom Topic') : topic;
      const queries = buildFallbackQueries(topicFinal, keywords).slice(0, 5);

      const res = await fetch('/api/broll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode, queries, perQuery: 3 })
      });

      const data = await res.json();
      if (!res.ok) {
        setBRollResults([]);
        setError(data?.error || 'B-roll fetch failed');
        return;
      }

      setBRollResults(data?.results || []);
    } catch (e: any) {
      setBRollResults([]);
      setError(e?.message || 'B-roll network error');
    } finally {
      setBRollLoading(false);
    }
  }

  async function onGenerate() {
    setError('');
    setResult('');
    setBRollResults([]);
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

      const raw = data.result as string;

// fetch real media first (your /api/broll doesn't depend on the text list anymore)
await fetchBRollClips();

// remove any B-ROLL SHOT LIST section from what the user sees
const cleaned = raw
  .replace(
    /(^|\n)#{1,3}\s*B-ROLL\s*SHOT\s*LIST[\s\S]*?(?=(\n#{1,3}\s*VISUAL\s*PROMPTS|\n#{1,3}\s*VISUAL\s*PROMPTS\s*\(\s*\d+\s*\)|\n#{1,3}\s*INSTRUMENTAL|\nVISUAL\s*PROMPTS|\nINSTRUMENTAL|$))/i,
    '\n'
  )
  .trim();

setResult(cleaned);

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
          <div className="badge">Paid Access Code • Scripts, visuals, music prompts, and real B-roll media</div>
          <h1 className="h1" style={{ marginTop: 10 }}>VibeScript</h1>
          <div className="small">
            Generate scripts + visuals + music prompts {includeHooksCaptions ? '+ hooks/captions ' : ''}{includeBRoll ? '+ B-roll media ' : ''}in one click.
          </div>
        </div>

        <div className="card">
          <h2 className="h2">Access</h2>
          <div className="row">
            <div>
              <label>Access Code</label>
              <input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter your paid access code"
              />
              <div className="small" style={{ marginTop: 6 }}>Keep your API keys in Vercel env vars, not in the code.</div>
            </div>

            <div>
              <label>Platform</label>
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
                  <input
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="e.g., single mom encouragement for mornings"
                  />
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
                {['Warm Coach', 'Soft Narrator', 'Confident Narrator', 'Spiritual Guide'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Hook Strength</label>
              <select value={hookStrength} onChange={(e) => setHookStrength(e.target.value as any)}>
                {['Gentle', 'Balanced', 'Strong', 'Scroll-Stopping'].map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <div>
              <label>Audience</label>
              <select value={audience} onChange={(e) => setAudience(e.target.value as any)}>
                {['Everyone', 'Women', 'Men', 'Moms', 'Teens'].map(a => (
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

          <div style={{ marginTop: 12 }}>
            <label>Extras</label>

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
                <div style={{ fontWeight: 700 }}>Include B-roll Media</div>
                <div className="small">Fetches real videos + photos (thumbnails + download links) from Pexels.</div>
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
            <button
              className="secondary"
              onClick={() => { setResult(''); setError(''); setBRollResults([]); }}
              disabled={loading || brollLoading}
            >
              Clear
            </button>
          </div>

          {error && <div className="small" style={{ marginTop: 12, color: '#ffb4b4' }}>Error: {error}</div>}
        </div>

        <div className="card">
          <h2 className="h2">Your VibeScript Output</h2>

          {!result && <div className="small">Your output will appear here.</div>}

          {result && (
            <>
              <div className="row" style={{ marginBottom: 12 }}>
                <button onClick={() => navigator.clipboard.writeText(result)}>Copy Output</button>
                <button className="secondary" onClick={downloadTxt}>Download .txt</button>
              </div>

              <pre>{result}</pre>

              {includeBRoll && (
                <>
                  <hr />
                  <h2 className="h2">B-roll Media (Pexels)</h2>
                  <div className="small" style={{ marginBottom: 10 }}>
                    {brollLoading ? 'Fetching videos + photos…' : 'Videos and photos appear below. Click Download or View.'}
                  </div>

                  {brollResults.length === 0 && !brollLoading && (
                    <div className="small">No B-roll results yet. Generate a script with B-roll ON.</div>
                  )}

                  {brollResults.map((r, idx) => (
  <div
    key={idx}
    style={{
      marginBottom: 20
    }}
  >


                      {/* Videos */}
                      <div style={{ fontWeight: 700, marginTop: 6, marginBottom: 8 }}>Videos</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                        {(r.videos || []).map(v => (
                          <div key={`v-${v.id}`} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'rgba(0,0,0,0.25)' }}>
                            {v.image && (
                              <img src={v.image} alt="video thumbnail" style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
                            )}
                            <div style={{ padding: 10 }}>
                              <div className="small" style={{ marginBottom: 8 }}>
                                {typeof v.duration === 'number' ? `Duration: ${v.duration}s` : 'Video'}
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <a href={v.downloadUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--text)', textDecoration: 'underline' }}>
                                  Download
                                </a>
                                <a href={v.pageUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--text)', textDecoration: 'underline' }}>
                                  View
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Photos */}
                      <div style={{ fontWeight: 700, marginTop: 14, marginBottom: 8 }}>Photos</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                        {(r.photos || []).map(p => (
                          <div key={`p-${p.id}`} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'rgba(0,0,0,0.25)' }}>
                            {p.image && (
                              <img src={p.image} alt="photo thumbnail" style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
                            )}
                            <div style={{ padding: 10 }}>
                              <div className="small" style={{ marginBottom: 8 }}>Photo</div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <a href={p.downloadUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--text)', textDecoration: 'underline' }}>
                                  Download
                                </a>
                                <a href={p.pageUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--text)', textDecoration: 'underline' }}>
                                  View
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {(!r.videos || r.videos.length === 0) && (!r.photos || r.photos.length === 0) && (
                        <div className="small" style={{ marginTop: 10 }}>No media found for this query.</div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
