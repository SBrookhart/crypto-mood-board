export function hexToGweiSafe(hex) {
  try {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('0x')) return null;
    return Number(BigInt(hex) / 1000000000n);
  } catch {
    return null;
  }
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function fmtUsd(n) {
  if (n == null) return '—';
  try { return `$${Number(n).toLocaleString()}`; } catch { return '—'; }
}
