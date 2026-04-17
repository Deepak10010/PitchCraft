// YIN fundamental-frequency detection (de Cheveigné & Kawahara, 2002).
// Runs in ~O(n^2/2) per call. Use a window of 2048 samples at 44.1 kHz
// for a good balance of accuracy (F_min ≈ 43 Hz) and cost.

const DEFAULT_THRESHOLD = 0.1;
const MIN_RMS = 0.01;

export type YinResult = {
  freq: number;
  clarity: number;
  rms: number;
} | null;

export function yinDetect(
  buffer: Float32Array,
  sampleRate: number,
  threshold = DEFAULT_THRESHOLD
): YinResult {
  const n = buffer.length;
  const halfN = Math.floor(n / 2);

  let rms = 0;
  for (let i = 0; i < n; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / n);
  if (rms < MIN_RMS) return null;

  const diff = new Float32Array(halfN);
  diff[0] = 1;

  let runningSum = 0;
  for (let tau = 1; tau < halfN; tau++) {
    let sum = 0;
    for (let i = 0; i < halfN; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    runningSum += sum;
    diff[tau] = runningSum > 0 ? (sum * tau) / runningSum : 1;
  }

  let tau = 2;
  while (tau < halfN) {
    if (diff[tau] < threshold) {
      while (tau + 1 < halfN && diff[tau + 1] < diff[tau]) tau++;
      break;
    }
    tau++;
  }

  if (tau === halfN || diff[tau] >= threshold) return null;

  let betterTau = tau;
  if (tau > 0 && tau < halfN - 1) {
    const s0 = diff[tau - 1];
    const s1 = diff[tau];
    const s2 = diff[tau + 1];
    const denom = 2 * s1 - s2 - s0;
    if (denom !== 0) {
      betterTau = tau + (0.5 * (s2 - s0)) / denom;
    }
  }

  const freq = sampleRate / betterTau;
  const clarity = 1 - diff[tau];
  return { freq, clarity, rms };
}
