export const DESKTOP_MEDIA = "(min-width: 901px)";

type NetworkConnection = {
  type?: string;
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

function getConnection(): NetworkConnection | undefined {
  const nav = navigator as Navigator & {
    connection?: NetworkConnection;
    mozConnection?: NetworkConnection;
    webkitConnection?: NetworkConnection;
  };
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
}

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
 * High-detail extras (grass, clouds, 4K maps). Compact viewports stay on the
 * lite GPU path even on Wi‑Fi — connection speed is not fill-rate.
 */
export function shouldLoadHighDetail(isCompactDevice: boolean) {
  if (isCompactDevice) return false;
  const connection = getConnection();
  if (connection?.saveData) return false;

  const type = connection?.type;
  if (type === "cellular" || type === "wimax" || type === "bluetooth") return false;

  const effective = connection?.effectiveType;
  if (effective === "slow-2g" || effective === "2g" || effective === "3g") {
    return false;
  }
  if (typeof connection?.downlink === "number" && connection.downlink > 0 && connection.downlink < 1.5) {
    return false;
  }

  return true;
}

export function textureCap(isCompactDevice: boolean, highDetail: boolean) {
  if (isCompactDevice) return 512;
  return highDetail ? 4096 : 2048;
}

/** PMREM cube face size. 1024 is ~24 MB of IBL; phones stay at 256. */
export function iblResolution(isCompactDevice: boolean) {
  return isCompactDevice ? 256 : 1024;
}

export function subscribeNetworkQuality(onChange: () => void) {
  const connection = getConnection();
  if (!connection?.addEventListener) return () => {};
  connection.addEventListener("change", onChange);
  return () => connection.removeEventListener?.("change", onChange);
}
