/**
 * Robust indicators API:
 * - Prices (CoinGecko public)
 * - ETH & Base gas with multiple endpoints + multiple methods + timeouts
 * - Returns null ("— gwei") only if *all* attempts fail
 *
 * Works on Vercel (Node runtime). No keys, no personal info.
 */

import { hexToGweiSafe } from '../../lib/format';

export const config = { api: { bodyParser: false } }; // keep default node runtime

const CG_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true';

// Multiple public RPCs (no key, rate-limited; we’ll try them in order)
const ETH_RPCS = [
  'https://cloudflare-eth.com',
  'https://rpc.ankr.com/eth',
  'https://ethereum.publicnode.com'
];

const BASE_RPCS = [
  'https://mainnet.base.org',
  'https://rpc.ankr.com/base',
  'https://base.publicnode.com'
];

// Basic JSON-RPC call with timeout and simple UA
async function rpcCall(endpoint, method, params = [], timeoutMs = 8000) {
  const body = { jsonrpc: '2.0', id: 1, method, params };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'user-agent': 'mood-board/1.0'
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      cache: 'no-store'
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error || !('result' in j)) {
      throw new Error(j?.error?.message || `RPC ${method} failed`);
    }
    return j.result;
  } finally {
    clearTimeout(timer);
  }
}

// Try an array of endpoints for a specific method, return first good result
async function tryEndpoints(endpoints, method, params = []) {
  for (const ep of endpoints) {
    try {
      const res = await rpcCall(ep, method, params);
      return { endpoint: ep, result: res };
    } catch {
      // try next
    }
  }
  return { endpoint: null, result: null };
}

// Convert arrays of hexs to a reasonable gwei estimate
function feeHistoryToGwei(feeHistory) {
  try {
    // EIP-1559 feeHistory returns baseFeePerGas array (hex)
    const arr = feeHistory?.baseFeePerGas;
    if (Array.isArray(arr) && arr.length > 0) {
      const lastHex = arr[arr.length - 1];
      const g = hexToGweiSafe(lastHex);
      return g && g > 0 ? g : null;
    }
  } catch {}
  return null;
}

// Get gas in gwei using robust strategy
async function getGasGwei(endpoints) {
  // 1) Try feeHistory (most reliable base fee)
  try {
    const { result } = await tryEndpoints(endpoints, 'eth_feeHistory', ['0x5', 'latest', []]);
    const g = feeHistoryToGwei(result);
    if (g) return g;
  } catch {}

  // 2) Try eth_gasPrice (legacy single number)
  try {
    const { result } = await tryEndpoints(endpoints, 'eth_gasPrice', []);
    const g = hexToGweiSafe(result);
    if (g && g > 0) return g;
  } catch {}

  // 3) Fallback: latest block baseFeePerGas
  try {
    const { result } = await tryEndpoints(endpoints, 'eth_getBlockByNumber', ['latest', false]);
    const g = hexToGweiSafe(result?.baseFeePerGas);
    if (g && g > 0) return g;
  } catch {}

  return null; // give up
}

export default async function handler(_req, res) {
  try {
    // 1) Prices
    const priceResp = await fetch(CG_URL, {
      headers: { accept: 'application/json', 'user-agent': 'mood-board/1.0' },
      cache: 'no-store'
    });
    const cg = await priceResp.json().catch(() => ({}));

    const btcUsd = cg?.bitcoin?.usd ?? null;
    const btcChange24h = cg?.bitcoin?.usd_24h_change ?? null;
    const ethUsd = cg?.ethereum?.usd ?? null;
    const ethChange24h = cg?.ethereum?.usd_24h_change ?? null;

    // 2) Gas with retries / fallbacks
    const [ethGasGwei, baseGasGwei] = await Promise.all([
      getGasGwei(ETH_RPCS),
      getGasGwei(BASE_RPCS)
    ]);

    res.status(200).json({
      btcUsd, btcChange24h,
      ethUsd, ethChange24h,
      ethGasGwei, baseGasGwei
    });
  } catch (err) {
    res.status(200).json({
      btcUsd: null, btcChange24h: null,
      ethUsd: null, ethChange24h: null,
      ethGasGwei: null, baseGasGwei: null,
      error: err?.message || 'unknown error'
    });
  }
}
