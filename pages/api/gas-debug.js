/**
 * GAS DEBUG ENDPOINT
 * Pings multiple ETH + Base RPC endpoints with three methods:
 *  - eth_feeHistory
 *  - eth_gasPrice
 *  - eth_getBlockByNumber (baseFeePerGas)
 * Returns raw results or errors so we can see what's failing on Vercel.
 */

export const config = { api: { bodyParser: false } };

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
    const text = await r.text(); // keep raw for easier debugging
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON? keep text */ }
    if (!r.ok) return { ok: false, status: r.status, body: text };
    if (json && json.error) return { ok: false, status: 200, body: json };
    return { ok: true, status: 200, body: json ?? text };
  } catch (e) {
    return { ok: false, status: 0, body: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

async function tryAll(endpoints, method, params) {
  const results = [];
  for (const ep of endpoints) {
    const res = await rpcCall(ep, method, params);
    results.push({ endpoint: ep, ...res });
  }
  return results;
}

export default async function handler(_req, res) {
  const out = {
    now: new Date().toISOString(),
    eth: {},
    base: {}
  };

  // ETH tests
  out.eth.feeHistory = await tryAll(ETH_RPCS, 'eth_feeHistory', ['0x5', 'latest', []]);
  out.eth.gasPrice   = await tryAll(ETH_RPCS, 'eth_gasPrice', []);
  out.eth.latest     = await tryAll(ETH_RPCS, 'eth_getBlockByNumber', ['latest', false]);

  // BASE tests
  out.base.feeHistory = await tryAll(BASE_RPCS, 'eth_feeHistory', ['0x5', 'latest', []]);
  out.base.gasPrice   = await tryAll(BASE_RPCS, 'eth_gasPrice', []);
  out.base.latest     = await tryAll(BASE_RPCS, 'eth_getBlockByNumber', ['latest', false]);

  res.status(200).json(out);
}
