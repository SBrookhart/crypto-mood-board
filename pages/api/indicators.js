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
  const body = { jsonrpc: '2.0'
