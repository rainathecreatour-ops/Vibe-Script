'use client';

import React, { useState } from 'react';

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

export default function Page() {
  const [accessCode, setAccessCode] = useState('');
  const [query, setQuery] = useState('calm morning journaling');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [brollResults, setBRollResults] = useState<BRollResult[]>([]);

  async function fetchBRoll() {
    setLoading(true);
    setError('');
    setBRollResults([]);

    try {
      const res = await fetch('/api/broll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessCode,
          queries: [query],
          perQuery: 4,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to fetch B-roll');
        return;
      }

      setBRollResults(data.results || []);
    } catch (err: any) {
      setError(err?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 32, fontWeight: 800 }}>VibeScript – B-Roll Browser</h1>
      <p style={{ opacity: 0.8, marginBottom: 20 }}>
        Fetch real videos and photos from Pexels
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="Access code"
          style={{ flex: 1, padding: 10 }}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search query (e.g. calm journaling)"
          style={{ flex: 2, padding: 10 }}
        />
        <button onClick={fetchBRoll} disabled={loading}>
          {loading ? 'Loading…' : 'Fetch B-roll'}
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: 20 }}>{error}</div>}

      {/* Results */}
      {brollResults.map((r, idx) => (
        <div key={idx} style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>
            Results for: <span style={{ opacity: 0.8 }}>{r.query}</span>
          </h2>

          {/* VIDEOS */}
          {r.videos.length > 0 && (
            <>
              <h3 style={{ marginBottom: 8 }}>Videos</h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                {r.videos.map((v) => (
                  <div
                    key={`video-${v.id}`}
                    style={{
                      border: '1px solid #333',
                      borderRadius: 12,
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={v.image}
                      alt="video thumbnail"
                      style={{ width: '100%', height: 140, objectFit: 'cover' }}
                    />
                    <div style={{ padding: 10 }}>
                      {v.duration && (
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                          {v.duration}s
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                        <a href={v.downloadUrl} target="_blank" rel="noreferrer">
                          Download
                        </a>
                        <a href={v.pageUrl} target="_blank" rel="noreferrer">
                          View
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* PHOTOS */}
          {r.photos.length > 0 && (
            <>
              <h3 style={{ marginBottom: 8 }}>Photos</h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12,
                }}
              >
                {r.photos.map((p) => (
                  <div
                    key={`photo-${p.id}`}
                    style={{
                      border: '1px solid #333',
                      borderRadius: 12,
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={p.image}
                      alt="photo thumbnail"
                      style={{ width: '100%', height: 140, objectFit: 'cover' }}
                    />
                    <div style={{ padding: 10 }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <a href={p.downloadUrl} target="_blank" rel="noreferrer">
                          Download
                        </a>
                        <a href={p.pageUrl} target="_blank" rel="noreferrer">
                          View
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </main>
  );
}
