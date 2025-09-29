/**
 * Serverless API route that fetches:
 * - BTC/ETH price + 24h change (CoinGecko public)
 * - ETH & Base gas (JSON-RPC), with fallback to latest block baseFeePerGas
 *
 * Notes:
 * - Public endpoints are rate-limited. If one fails, we return nulls for that field.
 * - On Vercel, logs appear in the project → Deployments → Logs.
 */

import { hexToGweiSafe } from '../../lib/format';

const ETH_RPC = 'https://cloudflare-eth.com';            // Cloudflare Ethereum Gateway
const BASE_RPC = 'https://mainnet.base.org';             // Base public RPC

async function rpcCall(endpoint, method, params = []) {
  const body = { jsonrpc: '2.0', id: 1, method, params };
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(j?.error?.message || `RPC ${method} failed`);
  return j.result;
}

async function getGasGwei(endpoint) {
  // 1) Try eth_gasPrice
  try {
    const gp = await rpcCall(endpoint, 'eth_gasPrice', []);
    const gwei = hexToGweiSafe(gp);
    if (gwei && gwei > 0) return gwei;
  } catch (_) { /* fall through */ }

  // 2) Fallback: read latest block's baseFeePerGas
  try {
    const block = await rpcCall(endpoint, 'eth_getBlockByNumber', ['latest', false]);
    const baseFee = block?.baseFeePerGas; // hex
    const gwei = hexToGweiSafe(baseFee);
    if (gwei && gwei > 0) return gwei;
  } catch (_) { /* fall through */ }

  return null; // show "—" in UI
}

export default async function handler(_req, res) {
  try {
    // CoinGecko: BTC/ETH prices + 24h change (public endpoint, light use)
    const cgUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true';
    const cgResp = await fetch(cgUrl, { headers: { 'accept': 'application/json' } });
    const cg = await cgResp.json().catch(() => ({}));

    const btcUsd = cg?.bitcoin?.usd ?? null;
    const btcChange24h = cg?.bitcoin?.usd_24h_change ?? null;
    const ethUsd = cg?.ethereum?.usd ?? null;
    const ethChange24h = cg?.ethereum?.usd_24h_change ?? null;

    // Gas (with robust fallbacks)
    const [ethGasGwei, baseGasGwei] = await Promise.all([
      getGasGwei(ETH_RPC),
      getGasGwei(BASE_RPC)
    ]);

    res.status(200).json({
      btcUsd, btcChange24h,
      ethUsd, ethChange24h,
      ethGasGwei, baseGasGwei
    });
  } catch (err) {
    // If absolutely everything fails:
    res.status(500).json({ error: err?.message || 'unknown error' });
  }
}
