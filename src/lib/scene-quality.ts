export const DESKTOP_MEDIA = "(min-width: 901px)";

export function isCompactViewport() {
  return !window.matchMedia(DESKTOP_MEDIA).matches;
}

const DESKTOP_DPR_CAP = 2;
/** Floor so AdaptiveDpr can drop below 1 while orbiting. */
const MOBILE_DPR_MIN = 0.65;
const MOBILE_DPR_CAP = 1;

/** Match physical pixels on HiDPI without oversampling the whole framebuffer. */
export function cappedDevicePixelRatio(cap: number) {
  if (typeof window === "undefined") return cap;
  return Math.min(cap, Math.max(1, window.devicePixelRatio || 1));
}

/** Canvas DPR range: desktop stays sharp; mobile stays within GPU budget. */
export function sceneDprRange(
  isCompactDevice: boolean,
  _highDetail: boolean,
): [number, number] {
  if (isCompactDevice) return [MOBILE_DPR_MIN, MOBILE_DPR_CAP];
  return [1, cappedDevicePixelRatio(DESKTOP_DPR_CAP)];
}

/**
 * Desktop 3D always uses the top tier (4K maps, full anisotropy, full IBL).
 * Compact viewports never mount the 3D stage.
 */
export function shouldLoadHighDetail(isCompactDevice: boolean) {
  return !isCompactDevice;
}

export function textureCap(isCompactDevice: boolean, highDetail: boolean) {
  if (isCompactDevice) return 512;
  return highDetail ? 4096 : 2048;
}

/** PMREM cube face size. 1024 is ~24 MB of IBL; phones stay at 256. */
export function iblResolution(isCompactDevice: boolean) {
  return isCompactDevice ? 256 : 1024;
}
