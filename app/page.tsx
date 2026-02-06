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
  'Custom',
];

const TONES: Tone[] = [
  'Calm',
  'Powerful',
  'Emotional',
  'Soft & Nurturing',
  'Bold & Confident',
  'Cinematic',
  'Relatable/Conversational',
];

const PLATFORMS: Platform[] = ['Suno', 'YouTube', 'TikTok/Reels', 'Podcast', 'Meditation App', 'ElevenLabs'];

const STRUCTURES: ScriptStructure[] = [
  'Hook → Message → Close',
  'Affirmation Loop',
  'Story-Based',
  'Guided Reflection',
  'Prayer-Style',
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
  { label: '60 minutes (max)', seconds: 3600 },
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
  return [
    `${base} journaling`,
    `${base} calm morning`,
    `${base} hands writing notebook`,
    `${base} peaceful nature`,
    `${base} cozy desk workspace`,
  ];
}

// --- captions helpers ---
function formatSrtTime(seconds: number) {
  const s = Math.max(0, seconds);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.floor((s - Math.floor(s)) * 1000);

  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)},${pad(ms, 3)}`;
}

function formatVttTime(seconds: number) {
  const s = Math.max(0, seconds);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.floor((s - Math.floor(s)) * 1000);

  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}.${pad(ms, 3)}`;
}

function extractScriptBody(text: string) {
  const m =
    text.match(/(^|\n)#{1,3}\s*SCRIPT\s*:?\s*\n([\s\S]*?)(?=\n#{1,3}\s*[A-Z ]+|\n$)/i) ||
    text.match(/(^|\n)SCRIPT\s*:?\s*\n([\s\S]*?)(?=\n#{1,3}\s*[A-Z ]+|\n$)/i);

  const body = (m?.[2] ?? text).trim();

  return body
    .replace(/(^|\n)#{1,6}\s*(VISUAL PROMPTS|INSTRUMENTAL|MUSIC PROMPT|HOOKS|CAPTIONS)\b[\s\S]*$/i, '\n')
    .trim();
}

function splitIntoCaptionLines(script: string) {
  const cleaned = script.replace(/\s+/g, ' ').trim();
  const parts = cleaned
    .split(/(?<=[.!?])\s+|(?<=,)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const lines: string[] = [];
  for (const p of parts) {
    if (p.length <= 52) {
      lines.push(p);
    } else {
      let start = 0;
      while (start < p.length) {
        lines.push(p.slice(start, start + 52).trim());
        start += 52;
      }
    }
  }
  return lines.filter(Boolean);
}

function buildCaptionsFromScript(fullOutput: string, totalSeconds: number) {
  const script = extractScriptBody(fullOutput);
  const lines = splitIntoCaptionLines(script);

  const MAX_CAPTIONS = 140;
  const trimmed = lines.slice(0, MAX_CAPTIONS);

  const minDur = 1.2;
  const usableCount = Math.max(1, Math.min(trimmed.length, Math.floor(totalSeconds / minDur)));

  const finalLines = trimmed.slice(0, usableCount);
  const step = totalSeconds / finalLines.length;

  const cues = finalLines.map((text, i) => {
    const start = i * step;
    const end = Math.min(totalSeconds, (i + 1) * step);
    return { start, end, text };
  });

  const srt = cues
    .map((c, i) => `${i + 1}\n${formatSrtTime(c.start)} --> ${formatSrtTime(c.end)}\n${c.text}\n`)
    .join('\n');

  const vtt =
    `WEBVTT\n\n` +
    cues.map((c) => `${formatVttTime(c.start)} --> ${formatVttTime(c.end)}\n${c.text}\n`).join('\n');

  return { srt, vtt };
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

  // existing toggle: include hooks + social captions (text)
  const [includeHooksCaptions, setIncludeHooksCaptions] = useState(true);
  // b-roll media toggle
  const [includeBRoll, setIncludeBRoll] = useState(true);
  // NEW: timed captions (SRT/VTT) derived from script
  const [includeAutoCaptions, setIncludeAutoCaptions] = useState(true);

  const [keywords, setKeywords] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [brollLoading, setBRollLoading] = useState(false);

  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const [brollResults, setBRollResults] = useState<BRollResult[]>([]);

  // Auto-captions output
  const [captionsSrt, setCaptionsSrt] = useState('');
  const [captionsVtt, setCaptionsVtt] = useState('');
  const [captionsPreview, setCaptionsPreview] = useState<string[]>([]);

  // Select clips + download selected
  const [selectedMedia, setSelectedMedia] = useState<Record<string, boolean>>({});

  function mediaKey(kind: 'video' | 'photo', queryIndex: number, id: number) {
    return `${kind}:${queryIndex}:${id}`;
  }

  function toggleMedia(key: string) {
    setSelectedMedia((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function clearSelection() {
    setSelectedMedia({});
  }

  function selectedCount() {
    return Object.values(selectedMedia).filter(Boolean).length;
  }

  function getSelectedItems() {
    const items: Array<{
      kind: 'video' | 'photo';
      queryIndex: number;
      id: number;
      downloadUrl: string;
      pageUrl: string;
      thumb: string;
    }> = [];

    brollResults.forEach((r, qi) => {
      (r.videos || []).forEach((v: any) => {
        const k = mediaKey('video', qi, v.id);
        if (selectedMedia[k]) {
          items.push({
            kind: 'video',
            queryIndex: qi,
            id: v.id,
            downloadUrl: v.downloadUrl,
            pageUrl: v.pageUrl,
            thumb: v.image,
          });
        }
      });

      (r.photos || []).forEach((p: any) => {
        const k = mediaKey('photo', qi, p.id);
        if (selectedMedia[k]) {
          items.push({
            kind: 'photo',
            queryIndex: qi,
            id: p.id,
            downloadUrl: p.downloadUrl,
            pageUrl: p.pageUrl,
            thumb: p.image,
          });
        }
      });
    });

    return items;
  }

  async function downloadSelected() {
    const items = getSelectedItems();
    if (items.length === 0) {
      setError('Select at least 1 clip/photo first.');
      return;
    }

    // Always give a manifest (reliable even if browser blocks multi-download)
    const manifest = {
      savedAt: new Date().toISOString(),
      count: items.length,
      items,
    };

    downloadTextFile(`vibescript_selected_media_${Date.now()}.json`, JSON.stringify(manifest, null, 2));

    // Attempt to open downloads
    for (const item of items) {
      const link = document.createElement('a');
      link.href = item.downloadUrl;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.click();
      await new Promise((res) => setTimeout(res, 250));
    }

    setError('');
  }

  // Save/Load session
  const SESSION_KEY = 'vibescript:lastSession:v2';

  function saveSession() {
    try {
      const payload = {
        savedAt: new Date().toISOString(),
        input,
        result,
        brollResults,
        captionsSrt,
        captionsVtt,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to save session');
    }
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) {
        setError('No saved session found yet.');
        return;
      }

      const data = JSON.parse(raw);

      if (typeof data.result === 'string') setResult(data.result);
      if (Array.isArray(data.brollResults)) setBRollResults(data.brollResults);

      if (typeof data.captionsSrt === 'string') setCaptionsSrt(data.captionsSrt);
      if (typeof data.captionsVtt === 'string') setCaptionsVtt(data.captionsVtt);

      // preview from SRT
      if (typeof data.captionsSrt === 'string') {
        const previewLines = data.captionsSrt
          .split('\n')
          .filter((line: string) => line.trim() && !/^\d+$/.test(line) && !line.includes('-->'))
          .slice(0, 12);
        setCaptionsPreview(previewLines);
      }

      const i = data.input;
      if (i?.topic) setTopic(i.topic);
      if (i?.customTopic) setCustomTopic(i.customTopic);
      if (i?.tone) setTone(i.tone);
      if (i?.platform) setPlatform(i.platform);
      if (typeof i?.durationSeconds === 'number') setDurationSeconds(i.durationSeconds);
      if (i?.structure) setStructure(i.structure);
      if (i?.aspect) setAspect(i.aspect);
      if (i?.voiceStyle) setVoiceStyle(i.voiceStyle);
      if (i?.hookStrength) setHookStrength(i.hookStrength);
      if (i?.audience) setAudience(i.audience);
      if (typeof i?.includeHooksCaptions === 'boolean') setIncludeHooksCaptions(i.includeHooksCaptions);
      if (typeof i?.includeBRoll === 'boolean') setIncludeBRoll(i.includeBRoll);
      if (typeof i?.includeAutoCaptions === 'boolean') setIncludeAutoCaptions(i.includeAutoCaptions);
      if (typeof i?.keywords === 'string') setKeywords(i.keywords);
      if (typeof i?.notes === 'string') setNotes(i.notes);

      setError('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load session');
    }
  }

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
      includeBRoll,
      // includeAutoCaptions is UI-only; we don’t need to send to backend unless you want it there too
    }),
    [
      topic,
      customTopic,
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
      includeBRoll,
    ]
  );

  function downloadTxt() {
    downloadTextFile(`vibescript_${Date.now()}.txt`, result);
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
        body: JSON.stringify({ accessCode, queries, perQuery: 3 }),
      });

      const data = await res.json();
      if (!res.ok) {
        setBRollResults([]);
        setError(data?.error || 'B-roll fetch failed');
        return;
      }

      setBRollResults(data?.results || []);
      clearSelection();
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
    setCaptionsSrt('');
    setCaptionsVtt('');
    setCaptionsPreview([]);
    clearSelection();
    setLoading(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode, input }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to generate');
        return;
      }

      const raw = data.result as string;

      // fetch real media first (your /api/broll doesn't depend on the text list anymore)
      await fetchBRollClips();

      // remove any B-ROLL SHOT LIST section from what the user sees (catch all variants)
      const cleaned = raw
        .replace(
          /(^|\n)\s*(?:#{1,6}\s*)?B\s*-\s*ROLL\s*SHOT\s*LIST\s*:?\s*[\s\S]*?(?=(\n\s*(?:#{1,6}\s*)?(?:VISUAL\s*PROMPTS|INSTRUMENTAL|MUSIC\s*PROMPT|CAPTIONS|HOOKS)\b)|$)/i,
          '\n'
        )
        .trim();

      setResult(cleaned);

      // Auto captions derived from script
      if (includeAutoCaptions) {
        const { srt, vtt } = buildCaptionsFromScript(cleaned, durationSeconds);
        setCaptionsSrt(srt);
        setCaptionsVtt(vtt);

        const previewLines = srt
          .split('\n')
          .filter((line) => line.trim() && !/^\d+$/.test(line) && !line.includes('-->'))
          .slice(0, 12);

        setCaptionsPreview(previewLines);
      }
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="grid">
        {/* Header card */}
        <div className="card">
          <div className="badge">Paid Access Code • Scripts, visuals, music prompts, and real B-roll media</div>
          <h1 className="h1" style={{ marginTop: 10 }}>
            VibeScript
          </h1>
          <div className="small">
            Generate scripts + visuals + music prompts {includeHooksCaptions ? '+ hooks/captions ' : ''}
            {includeBRoll ? '+ B-roll media ' : ''}in one click.
          </div>
        </div>

        {/* Settings card */}
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
              <div className="small" style={{ marginTop: 6 }}>
                Keep your API keys in Vercel env vars, not in the code.
              </div>
            </div>

            <div>
              <label>Platform</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <hr />

          <h2 className="h2">Script Settings</h2>

          <div className="row">
            <div>
              <label>Topic</label>
              <select value={topic} onChange={(e) => setTopic(e.target.value as Topic)}>
                {TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
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
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <div>
              <label>Length</label>
              <select value={String(durationSeconds)} onChange={(e) => setDurationSeconds(Number(e.target.value))}>
                {DURATIONS.map((d) => (
                  <option key={d.seconds} value={d.seconds}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Structure</label>
              <select value={structure} onChange={(e) => setStructure(e.target.value as ScriptStructure)}>
                {STRUCTURES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <div>
              <label>Voice Style</label>
              <select value={voiceStyle} onChange={(e) => setVoiceStyle(e.target.value as any)}>
                {['Warm Coach', 'Soft Narrator', 'Confident Narrator', 'Spiritual Guide'].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Hook Strength</label>
              <select value={hookStrength} onChange={(e) => setHookStrength(e.target.value as any)}>
                {['Gentle', 'Balanced', 'Strong', 'Scroll-Stopping'].map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <div>
              <label>Audience</label>
              <select value={audience} onChange={(e) => setAudience(e.target.value as any)}>
                {['Everyone', 'Women', 'Men', 'Moms', 'Teens'].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Visual aspect ratio</label>
              <select value={aspect} onChange={(e) => setAspect(e.target.value as Aspect)}>
                {ASPECTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label>Extras</label>

            {/* Hooks + social captions toggle */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                border: '1px solid var(--border)',
                background: 'rgba(10, 10, 18, 0.6)',
                borderRadius: 12,
                padding: '10px 12px',
                marginBottom: 10,
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
                <div className="small">Adds 3 hooks + 3 captions to your script output.</div>
              </div>
              <span className="badge">{includeHooksCaptions ? 'ON' : 'OFF'}</span>
            </div>

            {/* B-roll media toggle */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                border: '1px solid var(--border)',
                background: 'rgba(10, 10, 18, 0.6)',
                borderRadius: 12,
                padding: '10px 12px',
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
                <div className="small">Fetches real videos + photos from Pexels.</div>
              </div>
              <span className="badge">{includeBRoll ? 'ON' : 'OFF'}</span>
            </div>

            {/* Auto captions toggle */}
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                border: '1px solid var(--border)',
                background: 'rgba(10, 10, 18, 0.6)',
                borderRadius: 12,
                padding: '10px 12px',
                marginTop: 10,
              }}
            >
              <input
                type="checkbox"
                checked={includeAutoCaptions}
                onChange={(e) => setIncludeAutoCaptions(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>Generate Timed Captions (SRT/VTT)</div>
                <div className="small">Creates captions from your script using your selected duration.</div>
              </div>
              <span className="badge">{includeAutoCaptions ? 'ON' : 'OFF'}</span>
            </div>
          </div>

          <div className="row" style={{ marginTop: 12 }}>
            <div>
              <label>Keywords (optional)</label>
              <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g., abundance, discipline, peaceOpening" />
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
              onClick={() => {
                setResult('');
                setError('');
                setBRollResults([]);
                setCaptionsSrt('');
                setCaptionsVtt('');
                setCaptionsPreview([]);
                clearSelection();
              }}
              disabled={loading || brollLoading}
            >
              Clear
            </button>
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <button className="secondary" onClick={saveSession} disabled={!result}>
              Save Session
            </button>
            <button className="secondary" onClick={loadSession}>
              Load Last Session
            </button>
          </div>

          {error && <div className="small" style={{ marginTop: 12, color: '#ffb4b4' }}>Error: {error}</div>}
        </div>

        {/* Output card */}
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

              {/* Captions preview + downloads */}
              {includeAutoCaptions && captionsPreview.length > 0 && (
                <>
                  <hr />
                  <h2 className="h2">Captions (Preview)</h2>
                  <div className="small" style={{ marginBottom: 10 }}>
                    Generated from your script using your selected duration.
                  </div>

                  <div className="row" style={{ marginBottom: 12 }}>
                    <button
                      className="secondary"
                      onClick={() => downloadTextFile(`vibescript_${Date.now()}.srt`, captionsSrt)}
                      disabled={!captionsSrt}
                    >
                      Download .srt
                    </button>
                    <button
                      className="secondary"
                      onClick={() => downloadTextFile(`vibescript_${Date.now()}.vtt`, captionsVtt)}
                      disabled={!captionsVtt}
                    >
                      Download .vtt
                    </button>
                  </div>

                  <div
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 12,
                      background: 'rgba(10,10,18,0.35)',
                    }}
                  >
                    {captionsPreview.map((line, i) => (
                      <div key={i} style={{ marginBottom: 6 }}>
                        {line}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* B-roll media section */}
              {includeBRoll && (
                <>
                  <hr />
                  <h2 className="h2">B-roll Media (Pexels)</h2>
                  <div className="small" style={{ marginBottom: 10 }}>
                    {brollLoading ? 'Fetching videos + photos…' : 'Select clips below, then download your selection.'}
                  </div>

                  {/* Select + download buttons */}
                  <div className="row" style={{ marginBottom: 12 }}>
                    <button onClick={downloadSelected} disabled={brollLoading || selectedCount() === 0}>
                      Download Selected ({selectedCount()})
                    </button>
                    <button className="secondary" onClick={clearSelection} disabled={brollLoading || selectedCount() === 0}>
                      Clear Selection
                    </button>
                  </div>

                  {brollResults.length === 0 && !brollLoading && (
                    <div className="small">No B-roll results yet. Generate a script with B-roll ON.</div>
                  )}

                  {brollResults.map((r, idx) => (
                    <div key={idx} style={{ marginBottom: 20 }}>
                      {/* Videos */}
                      <div style={{ fontWeight: 700, marginTop: 6, marginBottom: 8 }}>Videos</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                        {(r.videos || []).map((v: any) => {
                          const k = mediaKey('video', idx, v.id);
                          return (
                            <div
                              key={`v-${v.id}`}
                              style={{
                                position: 'relative',
                                border: '1px solid var(--border)',
                                borderRadius: 12,
                                overflow: 'hidden',
                                background: 'rgba(0,0,0,0.25)',
                              }}
                            >
                              <label
                                style={{
                                  position: 'absolute',
                                  top: 8,
                                  left: 8,
                                  zIndex: 2,
                                  display: 'flex',
                                  gap: 6,
                                  alignItems: 'center',
                                  background: 'rgba(0,0,0,0.65)',
                                  padding: '6px 8px',
                                  borderRadius: 10,
                                  cursor: 'pointer',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={!!selectedMedia[k]}
                                  onChange={() => toggleMedia(k)}
                                  style={{ width: 16, height: 16 }}
                                />
                                <span style={{ fontSize: 12 }}>Select</span>
                              </label>

                              {v.image && (
                                <img
                                  src={v.image}
                                  alt="video thumbnail"
                                  style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
                                />
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
                          );
                        })}
                      </div>

                      {/* Photos */}
                      <div style={{ fontWeight: 700, marginTop: 14, marginBottom: 8 }}>Photos</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                        {(r.photos || []).map((p: any) => {
                          const k = mediaKey('photo', idx, p.id);
                          return (
                            <div
                              key={`p-${p.id}`}
                              style={{
                                position: 'relative',
                                border: '1px solid var(--border)',
                                borderRadius: 12,
                                overflow: 'hidden',
                                background: 'rgba(0,0,0,0.25)',
                              }}
                            >
                              <label
                                style={{
                                  position: 'absolute',
                                  top: 8,
                                  left: 8,
                                  zIndex: 2,
                                  display: 'flex',
                                  gap: 6,
                                  alignItems: 'center',
                                  background: 'rgba(0,0,0,0.65)',
                                  padding: '6px 8px',
                                  borderRadius: 10,
                                  cursor: 'pointer',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={!!selectedMedia[k]}
                                  onChange={() => toggleMedia(k)}
                                  style={{ width: 16, height: 16 }}
                                />
                                <span style={{ fontSize: 12 }}>Select</span>
                              </label>

                              {p.image && (
                                <img
                                  src={p.image}
                                  alt="photo thumbnail"
                                  style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }}
                                />
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
                          );
                        })}
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
