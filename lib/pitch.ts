// Monophonic pitch detection via McLeod Pitch Method (MPM), powered by the
// `pitchy` library. MPM is from the same DSP family as YIN but uses a
// normalised square-difference function with parabolic interpolation; on voice
// signals it gives noticeably better clarity scores and fewer octave errors
// than vanilla YIN with no model download.
import { PitchDetector } from "pitchy";

const MIN_RMS = 0.005;
const MIN_CLARITY = 0.55;

export type PitchResult = {
  freq: number;
  clarity: number;
  rms: number;
} | null;

let detector: PitchDetector<Float32Array> | null = null;
let detectorLength = 0;

function getDetector(length: number): PitchDetector<Float32Array> {
  if (!detector || detectorLength !== length) {
    detector = PitchDetector.forFloat32Array(length);
    // The MPM paper recommends 0.8–1.0 for the clarity threshold; we let
    // individual readings pass and gate on clarity downstream in the
    // segmenter, so leave the threshold at the library default.
    detectorLength = length;
  }
  return detector;
}

export function detectPitch(
  buffer: Float32Array,
  sampleRate: number
): PitchResult {
  let rms = 0;
  for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / buffer.length);
  if (rms < MIN_RMS) return null;

  const [freq, clarity] = getDetector(buffer.length).findPitch(
    buffer,
    sampleRate
  );
  if (freq <= 0 || clarity < MIN_CLARITY) return null;
  return { freq, clarity, rms };
}
