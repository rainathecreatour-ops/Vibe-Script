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
  duration: number;
  image: string;
  pageUrl: string;
  downloadUrl: string;
  width?: number;
  height?: number;
};

type BRollResult = {
  query: string;
  videos: Clip[];
  photos: Clip[];
  error?: string;
  details?: string;
};


function extractBRollQueries(output: string): string[] {
  // Looks for:
  // B-ROLL SHOT LIST (10):
  // 1) ...
  // 2) ...
  const lines = output.split('\n').map(l => l.trim());
  const startIdx = lines.findIndex(l => l.toUpperCase().startsWith('B-ROLL SHOT LIST'));
  if (startIdx === -1) return [];

  const queries: string[] = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];

    // stop if we hit another section header
    if (
      line.toUpperCase().startsWith('VISUAL PROMPTS') ||
      line.toUpperCase().startsWith('INSTRUMENTAL') ||
      line.toUpperCase().startsWith('TITLE:') ||
      line.toUpperCase().startsWith('SCRIPT:')
    ) break;

    const m = line.match(/^\d+\)\s*(.+)$/);
    if (m?.[1]) {
      const cleaned = m[1].trim();
      if (cleaned) queries.push(cleaned);
    }
  }

  return queries.slice(0, 10);
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

  async function fetchBRollClips(generatedText: string) {
   let queries = extractBRollQueries(generatedText);

// If you removed the B-ROLL list from AI output, generate queries here
if (queries.length === 0) {
  const base = `${topic} ${keywords || ''}`.trim();
  queries = [
    `${base} journaling`,
    `${base} calm morning`,
    `${base} hands writing notebook`,
    `${base} peaceful nature`,
    `${base} cozy desk workspace`
  ];
}


    setBRollLoading(true);
    try {
      const res = await fetch('/api/broll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode, queries, perQuery: 3 })
      });

      const data = await res.json();
      if (!res.ok) {
        setBRollResults([]);
        // show error in the main error area
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

      const text = data.result as string;
      setResult(text);

      // Fetch real b-roll clips after the script is generated
      await fetchBRollClips(text);
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
          <div className="badge">Paid Access Code • Scripts, visuals, music prompts, and real B-roll links</div>
          <h1 className="h1" style={{ marginTop: 10 }}>VibeScript</h1>
          <div className="small">
            Generate scripts + visuals + music prompts {includeHooksCaptions ? '+ hooks/captions ' : ''}{includeBRoll ? '+ real B-roll clips ' : ''}in one click.
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

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', border: '1px solid var(--border)', background: 'rgba(10, 10, 18, 0.6)', borderRadius: 12, padding: '10px 12px', marginBottom: 10 }}>
              <input type="checkbox" checked={includeHooksCaptions} onChange={(e) => setIncludeHooksCaptions(e.target.checked)} style={{ width: 18, height: 18 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Include Hooks & Captions</div>
                <div className="small">Adds 3 hooks + 3 captions to your output.</div>
              </div>
              <span className="badge">{includeHooksCaptions ? 'ON' : 'OFF'}</span>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', border: '1px solid var(--border)', background: 'rgba(10, 10, 18, 0.6)', borderRadius: 12, padding: '10px 12px' }}>
              <input type="checkbox" checked={includeBRoll} onChange={(e) => setIncludeBRoll(e.target.checked)} style={{ width: 18, height: 18 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Include Real B-roll Clips</div>
                <div className="small">Fetches real videos (thumbnails + download links) from Pexels.</div>
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
            <button className="secondary" onClick={() => { setResult(''); setError(''); setBRollResults([]); }} disabled={loading || brollLoading}>
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

              {/* Real B-roll clips */}
              {includeBRoll && (
                <>
                  <hr />
                  <h2 className="h2">Real B-roll Clips (Pexels)</h2>
                  <div className="small" style={{ marginBottom: 10 }}>
                    {brollLoading ? 'Fetching clips…' : 'Click Download or View on Pexels.'}
                  </div>

                  {brollResults.length === 0 && !brollLoading && (
                    <div className="small">No B-roll results yet (generate a script with B-roll ON).</div>
                  )}

                  {brollResults.map((r, idx) => (
                    <div key={idx} style={{ marginBottom: 16, border: '1px solid var(--border)', borderRadius: 12, padding: 12, background: 'rgba(10,10,18,0.35)' }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>{idx + 1}. {r.query}</div>

                      {r.error && (
                        <div className="small" style={{ color: '#ffb4b4' }}>
                          {r.error} {r.details ? `— ${r.details}` : ''}
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                        {r.videos.map(v => (
                          <div key={v.id} style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', background: 'rgba(0,0,0,0.25)' }}>
                            {v.image && (
                              // thumbnail
                              <img src={v.image} alt="b-roll thumbnail" style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
                            )}
                            <div style={{ padding: 10 }}>
                              <div className="small" style={{ marginBottom: 8 }}>Duration: {v.duration}s</div>
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
