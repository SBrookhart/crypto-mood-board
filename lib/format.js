export function hexWeiToGwei(hex) {
  // hex string like "0x59682f00" => decimal gwei
  const wei = BigInt(hex);
  const gwei = Number(wei / 1000000000n);
  return gwei;
}

export function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
