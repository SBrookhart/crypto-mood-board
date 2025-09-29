/**
 * INDICATORS API (with env-priority RPCs)
 * - Prices: CoinGecko (public, no key)
 * - Gas: Prefer ETH_RPC_URL / BASE_RPC_URL (from Vercel env). If absent or throttled, fall back to public RPCs.
 * - Multiple methods: feeHistory → gasPrice → latest.baseFeePerGas
 * - Timeouts + no-store caching
 */

import { hexToGweiSafe } from '../../lib/format';

export const config = { api: { bodyParser: false } };

// 1) Prices endpoint (public)
const CG_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true';

// 2) RPC endpoint lists (env-first, then public fallbacks)
const ETH_RPCS = [
  process.env.ETH_RPC_URL,                          // your dedicated provider (recommended)
  'https://cloudflare-eth.com',
  'https://rpc.ankr.com/eth',
  'https://ethereum.publicnode.com',
].filter(Boolean);

const BASE_RPCS = [
  process.env.BASE_RPC_URL,                         // your dedicated provider (recommended)
  'https://mainnet.base.org',
  'https://rpc.ankr.com/base',
  'https://base.publicnode.com',
].filter(Boolean);

// --- Helper: RPC call with timeout and no-store cache
async function rpcCall(endpoint, method, params = [], timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'user-agent': 'mood-board/1.1'
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: ctrl.signal,
      cache: 'no-store'
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error || !('result' in j)) {
      throw new Error(j?.error?.message || `RPC ${method} failed`);
    }
    return j.result;
  } finally {
    clearTimeout(t);
  }
}

// --- Parsers for gas estimates
function feeHistoryToGwei(result) {
  try {
    const arr = result?.baseFeePerGas;
    if (Array.isArray(arr) && arr.length) {
      const last = arr[arr.length - 1];
      const g = hexToGweiSafe(last);
      return g && g > 0 ? g : null;
    }
  } catch {}
  return null;
}

function gasPriceToGwei(result) {
  const g = hexToGweiSafe(result);
  return g && g > 0 ? g : null;
}

function latestBlockToGwei(result) {
  const g = hexToGweiSafe(result?.baseFeePerGas);
  return g && g > 0 ? g : null;
}

// --- Try many endpoints & methods; return first good reading + provenance
async function getGasGwei(endpoints) {
  const tries = [
    { method: 'eth_feeHistory', params: ['0x5', 'latest', []], parse: feeHistoryToGwei },
    { method: 'eth_gasPrice',   params: [],                   parse: gasPriceToGwei     },
    { method: 'eth_getBlockByNumber', params: ['latest', false], parse: latestBlockToGwei }
  ];

  for (const { method, params, parse } of tries) {
    for (const ep of endpoints) {
      try {
        const result = await rpcCall(ep, method, params);
        const gwei = parse(result);
        if (gwei != null) {
          return { gwei, via: { endpoint: ep, method } };
        }
      } catch {
        // try next combo
      }
    }
  }
  return { gwei: null, via: null };
}

export default async function handler(_req, res) {
  try {
    // Prices
    const priceResp = await fetch(CG_URL, {
      headers: { accept: 'application/json' },
      cache: 'no-store'
    });
    const cg = await priceResp.json().catch(() => ({}));

    const btcUsd = cg?.bitcoin?.usd ?? null;
    const btcChange24h = cg?.bitcoin?.usd_24h_change ?? null;
    const ethUsd = cg?.ethereum?.usd ?? null;
    const ethChange24h = cg?.ethereum?.usd_24h_change ?? null;

    // Gas with robust strategy (env-first)
    const [ethGas, baseGas] = await Promise.all([
      getGasGwei(ETH_RPCS),
      getGasGwei(BASE_RPCS)
    ]);

    res.status(200).json({
      btcUsd, btcChange24h, ethUsd, ethChange24h,
      ethGasGwei: ethGas.gwei, baseGasGwei: baseGas.gwei,
      sources: {
        eth: ethGas.via,
        base: baseGas.via
      }
    });
  } catch (e) {
    res.status(200).json({
      btcUsd: null, btcChange24h: null, ethUsd: null, ethChange24h: null,
      ethGasGwei: null, baseGasGwei: null,
      sources: { eth: null, base: null },
      error: String(e?.message || e)
    });
  }
}
