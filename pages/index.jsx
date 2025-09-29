import { useEffect, useState } from 'react';
import { computeMood } from '../lib/mood';
import { fmtUsd } from '../lib/format';

function Card({ title, value, sub }) {
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: 16,
      padding: 16,
      background: '#fff',
      boxShadow: '0 1px 12px rgba(0,0,0,0.04)',
      flex: 1, minWidth: 220
    }}>
      <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function Home() {
  const [ind, setInd] = useState(null);
  const [mood, setMood] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch('/api/indicators', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || 'Failed to load');
      setInd(j);
      const m = computeMood({
        btcChange: j.btcChange24h ?? 0,
        ethChange: j.ethChange24h ?? 0,
        ethGasGwei: j.ethGasGwei ?? undefined,
        baseGasGwei: j.baseGasGwei ?? undefined
      });
      setMood(m);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const bg = mood ? `radial-gradient(1200px 600px at 20% -10%, ${mood.color}22, #ffffff)` : '#fff';

  const pct = (n) => (n == null ? '—' : `${Number(n).toFixed(2)}%`);
  const hostOrDash = (u) => {
    try { return u ? new URL(u).host : '—'; } catch { return '—'; }
  };

  return (
    <div style={{ minHeight: '100vh', background: bg, padding: 24, fontFamily: 'ui-sans-serif, system-ui' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, marginBottom: 4 }}>Crypto Fear & Greed Mood Board</h1>
          <p style={{ color: '#6b7280' }}>
            Purely public data. No wallets. No keys. Not financial advice—just vibes from volatility, trends, and gas heat.
          </p>
        </header>

        {loading && <div>Loading latest vibes…</div>}
        {err && <div style={{ color: '#ef4444', fontWeight: 600 }}>Error: {err}</div>}

        {ind && mood && !loading && (
          <>
            <section style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
              <div style={{
                border: '2px solid #e5e7eb', borderRadius: 18, padding: 20,
                background: '#ffffffcc', backdropFilter: 'blur(2px)'
              }}>
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Current Mood</div>
                <div style={{ fontSize: 36, fontWeight: 800 }}>
                  {mood.bucket} <span style={{ fontSize: 18, color: '#6b7280', fontWeight: 600 }}>({mood.score}/100)</span>
                </div>
                <div style={{ marginTop: 8, color: '#374151' }}>{mood.blurb}</div>
                <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
                  Volatility: {mood.details.volatility}% · Trend: {mood.details.trend}% · Heat: {mood.details.heat}%
                </div>
                <div style={{ marginTop: 12 }}>
                  <button onClick={load} style={{
                    padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb',
                    background: '#111827', color: '#fff', fontWeight: 600, cursor: 'pointer'
                  }}>Refresh</button>
                </div>
              </div>
            </section>

            <section style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Card
                title="BTC"
                value={`${fmtUsd(ind.btcUsd)} (${pct(ind.btcChange24h)})`}
                sub="24h price change (CoinGecko)"
              />
              <Card
                title="ETH"
                value={`${fmtUsd(ind.ethUsd)} (${pct(ind.ethChange24h)})`}
                sub="24h price change (CoinGecko)"
              />
              <Card
                title="Ethereum Gas"
                value={`${ind.ethGasGwei == null ? '—' : ind.ethGasGwei} gwei`}
                sub={`Source: ${hostOrDash(ind.sources?.eth?.endpoint)} · ${ind.sources?.eth?.method || '—'}`}
              />
              <Card
                title="Base Gas"
                value={`${ind.baseGasGwei == null ? '—' : ind.baseGasGwei} gwei`}
                sub={`Source: ${hostOrDash(ind.sources?.base?.endpoint)} · ${ind.sources?.base?.method || '—'}`}
              />
            </section>

            <footer style={{ marginTop: 28, color: '#9ca3af', fontSize: 12 }}>
              Data: CoinGecko (prices), Cloudflare/Ankr/PublicNode & Base RPCs (gas). Public endpoints can rate-limit; refresh if a source temporarily fails.
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
