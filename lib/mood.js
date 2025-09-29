import { clamp } from './format.js';

/**
 * Mood calc (simple & explainable):
 * Inputs:
 *  - btcChange, ethChange: 24h % changes (signed)
 *  - ethGasGwei, baseGasGwei: current gas estimates
 *
 * Scores 0–100 (higher ≈ greed/euphoria):
 *  - volScore: more volatility => more fear (adds up to +40)
 *  - heatScore: higher gas => more greed (adds up to +30)
 *  - trendScore: positive trend => greed, negative => fear (±30)
 */
export function computeMood({ btcChange, ethChange, ethGasGwei, baseGasGwei }) {
  const absB = Math.abs(btcChange ?? 0);
  const absE = Math.abs(ethChange ?? 0);
  const volatility = (absB + absE) / 2;
  const trend = ((btcChange ?? 0) + (ethChange ?? 0)) / 2;

  // Normalize gas into a [0..1] "heat" factor (very rough, just for vibes)
  const ethHeat = ethGasGwei == null ? 0.3 : (ethGasGwei <= 15 ? 0.2 : ethGasGwei <= 30 ? 0.5 : 1.0);
  const baseHeat = baseGasGwei == null ? 0.3 : (baseGasGwei <= 1 ? 0.2 : baseGasGwei <= 5 ? 0.5 : 1.0);
  const heat = (ethHeat + baseHeat) / 2;

  const volScore = clamp((volatility / 10) * 40, 0, 40);
  const heatScore = clamp(heat * 30, 0, 30);
  const trendScore = clamp((trend / 10) * 30, -30, 30);

  let score = volScore + heatScore + (trendScore + 30); // shift to ~0–100
  score = clamp(score, 0, 100);

  let bucket = 'Neutral 😐', color = '#9ca3af', blurb = 'Mixed signals.';
  if (score <= 25) { bucket = 'Capitulation 😵'; color = '#1f2937'; blurb = 'Risk-off, bruised sentiment.'; }
  else if (score <= 45) { bucket = 'Fear 😨'; color = '#ef4444'; blurb = 'High vol or weak trend.'; }
  else if (score <= 55) { bucket = 'Neutral 😐'; color = '#9ca3af'; blurb = 'Balanced forces.'; }
  else if (score <= 75) { bucket = 'Greed 😏'; color = '#f59e0b'; blurb = 'Heat rising—fees/price climbing.'; }
  else { bucket = 'Euphoria 🤩'; color = '#10b981'; blurb = 'Everything ripping—careful out there.'; }

  return {
    score: Math.round(score),
    bucket,
    color,
    blurb,
    details: {
      volatility: Number(volatility.toFixed(2)),
      trend: Number(trend.toFixed(2)),
      heat: Number((heat * 100).toFixed(0))
    }
  };
}
