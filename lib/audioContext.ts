// Platform-resolved by Metro to audioContext.web.ts on web.
// On native, this fallback returns null so audio is a silent no-op
// (the app is web-first; native is not supported.)
export function getAudioContext(): any {
  return null;
}

export function isAudioAvailable(): boolean {
  return false;
}
