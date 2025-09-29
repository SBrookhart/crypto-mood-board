export default async function handler(_req, res) {
  try {
    // 1) Prices & 24h change from CoinGecko public API
    const cgUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true';
    const cgResp = await fetch(cgUrl, { headers: { 'accept': 'application/json' } });
    if (!cgResp.ok) throw new Error(`CoinGecko error: ${cgResp.status}`);
    const cg = await cgResp.json();

    const btc = {
      usd: cg?.bitcoin?.usd ?? null,
      change24h: cg?.bitcoin?.usd_24h_change ?? null
    };
    const eth = {
      usd: cg?.ethereum?.usd ?? null,
      change24h: cg?.ethereum?.usd_24h_change ?? null
    };

    // 2) Ethereum gas via Cloudflare Ethereum Gateway (public JSON-RPC)
    // Docs: https://developers.cloudflare.com/web3/ethereum-gateway/
    const rpcPayload = { jsonrpc: "2.0", id: 1, method: "eth_gasPrice", params: [] };

    const ethRpc = await fetch('https://cloudflare-eth.com', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(rpcPayload)
    });
    const ethJson = await ethRpc.json();
    const ethGasWeiHex = ethJson?.result ?? '0x0';

    // 3) Base gas via public RPC
    // Docs: https://docs.base.org/network-information  (endpoint in getting-started)
    const baseRpc = await fetch('https://mainnet.base.org', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(rpcPayload)
    });
    const baseJson = await baseRpc.json();
    const baseGasWeiHex = baseJson?.result ?? '0x0';

    // Helper: hex wei -> decimal gwei
    const hexToGwei = (hex) => Number((BigInt(hex) / 1000000000n));

    const indicators = {
      btcUsd: btc.usd,
      btcChange24h: btc.change24h,
      ethUsd: eth.usd,
      ethChange24h: eth.change24h,
      ethGasGwei: hexToGwei(ethGasWeiHex),
      baseGasGwei: hexToGwei(baseGasWeiHex)
    };

    res.status(200).json(indicators);
  } catch (err) {
    res.status(500).json({ error: err.message || 'unknown error' });
  }
}
