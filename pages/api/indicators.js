/**
 * INDICATORS API (robust)
 * - BTC/ETH prices via CoinGecko (public)
 * - ETH & Base gas via multiple endpoints + multiple methods + timeout
 * - Exposes which endpoint/method worked for transparency
 */

import { hexToGweiSafe } from '../../lib/format';

export const config = { api: { bodyParser: false } };

const CG_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true';

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

async function rpcCall(endpoint, method, params = [], timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'user-agent': 'mood-board/1.0'
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: ctrl.signal,
      cache: 'no-store'
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error || !('result' in j)) throw new Error(j?.error?.message || `RPC ${method} failed`);
    return j.result;
  } finally {
    clearTimeout(t);
  }
}

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

async function getGasGwei(endpoints) {
  // prefer feeHistory → gasPrice → latest.baseFee
  // return { gwei, via: { endpoint, method } } or { gwei: null, via: null }
  const tryOrder = [
    { method: 'eth_feeHistory', params: ['0x5', 'latest', []], parser: feeHistoryToGwei },
    { method: 'eth_gasPrice', params: [], parser: (r) => {
        const g = hexToGweiSafe(r); return g && g > 0 ? g : null;
      } },
    { method: 'eth_getBlockByNumber', params: ['latest', false], parser: (r) => {
        const g = hexToGweiSafe(r?.baseFeePerGas); return g && g > 0 ? g : null;
      } }
  ];

  for (const { method, params, parser } of tryOrder) {
    for (const ep of endpoints) {
      try {
        const result = await rpcCall(ep, method, params);
        const gwei = parser(result);
        if (gwei != null) return { gwei, via: { endpoint: ep, method } };
      } catch {
        // try next
      }
    }
  }
  return { gwei: null, via: null };
}

export default async function handler(_req, res) {
  try {
    const priceResp = await fetch(CG_URL, { headers: { accept: 'application/json' }, cache: 'no-store' });
    const cg = await priceResp.json().catch(() => ({}));

    const btcUsd = cg?.bitcoin?.usd ?? null;
    const btcChange24h = cg?.bitcoin?.usd_24h_change ?? null;
    const ethUsd = cg?.ethereum?.usd ?? null;
    const ethChange24h = cg?.ethereum?.usd_24h_change ?? null;

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
