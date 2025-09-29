/**
 * Mood algorithm (simple, explainable):
 * Inputs:
 *  - btcChange: BTC 24h % change (e.g., +3.2 or -2.1)
 *  - ethChange: ETH 24h % change
 *  - ethGasGwei: current Ethereum gas in gwei
 *  - baseGasGwei: current Base gas in gwei
 *
 * We compute:
 *  - volatility = average absolute % change of BTC & ETH
 *  - heat = average gas level normalized to buckets
 *  - trend = average signed % change (BTC & ETH)
 *
 * Score components (0–100):
 *  - volScore:  high vol increases fear (up to +40)
 *  - heatScore: high gas increases greed (up to +30)
 *  - trendScore: positive price trend increases greed, negative increases fear (up to ±30)
 *
 * Final mood buckets:
 *  0–25   = Capitulation 😵
 *  26–45  = Fear 😨
 *  46–55  = Neutral 😐
 *  56–75  = Greed 😏
 *  76–100 = Euphoria 🤩
 */

import { clamp } from './format.js';

export function computeMood({ btcChange, ethChange, ethGasGwei, baseGasGwei }) {
  const absB = Math.abs(btcChange || 0);
  const absE = Math.abs(ethChange || 0);
  const volatility = (absB + absE) / 2;

  const trend = ((btcChange || 0) + (ethChange || 0)) / 2;

  // Normalize gas: rough levels for UX, not economic advice
  const ethHeat = ethGasGwei <= 15 ? 0.2 : ethGasGwei <= 30 ? 0.5 : 1.0;
  const baseHeat = baseGasGwei <= 1 ? 0.2 : baseGasGwei <= 5 ? 0.5 : 1.0;
  const heat = (ethHeat + baseHeat) / 2;

  // Scores
  const volScore = clamp((volatility / 10) * 40, 0, 40);     // 0%→0, 10%+→40
  const heatScore = clamp(heat * 30, 0, 30);                 // 0→0, 1→30
  const trendScore = clamp((trend / 10) * 30, -30, 30);      // -10%→-30, +10%→+30

  let score = volScore + heatScore + (trendScore + 30);      // shift to 0–100-ish
  score = clamp(score, 0, 100);

  let bucket = "Neutral 😐", color = "#9ca3af", blurb = "Mixed signals.";
  if (score <= 25) { bucket = "Capitulation 😵"; color = "#1f2937"; blurb = "Risk-off, bruised sentiment."; }
  else if (score <= 45) { bucket = "Fear 😨"; color = "#ef4444"; blurb = "High vol or weak trend."; }
  else if (score <= 55) { bucket = "Neutral 😐"; color = "#9ca3af"; blurb = "Balanced forces."; }
  else if (score <= 75) { bucket = "Greed 😏"; color = "#f59e0b"; blurb = "Heat rising—fees/price climbing."; }
  else { bucket = "Euphoria 🤩"; color = "#10b981"; blurb = "Everything ripping—careful out there."; }

  return {
    score: Math.round(score),
    bucket,
    color,
    details: {
      volatility: Number(volatility.toFixed(2)),
      heat: Number((heat * 100).toFixed(0)),
      trend: Number(trend.toFixed(2))
    },
    blurb
  };
}
