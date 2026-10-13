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
const MOBILE_DPR_CAP_HIGH = 1.5;
const MOBILE_DPR_CAP_LITE = 1;

/** Match physical pixels on HiDPI without oversampling the whole framebuffer. */
export function cappedDevicePixelRatio(cap: number) {
  if (typeof window === "undefined") return cap;
  return Math.min(cap, Math.max(1, window.devicePixelRatio || 1));
}

/** Canvas DPR range: desktop stays sharp; mobile stays within GPU budget. */
export function sceneDprRange(
  isCompactDevice: boolean,
  highDetail: boolean,
): [number, number] {
  if (isCompactDevice) {
    const cap = highDetail ? MOBILE_DPR_CAP_HIGH : MOBILE_DPR_CAP_LITE;
    return [1, cappedDevicePixelRatio(cap)];
  }
  return [1, cappedDevicePixelRatio(DESKTOP_DPR_CAP)];
}

/**
 * High-detail scene extras (grass, clouds, HDR sky) on good connections.
 * Does not gate desktop render sharpness — see textureCap / sceneDprRange.
 */
export function shouldLoadHighDetail(isCompactDevice: boolean) {
  const connection = getConnection();
  if (connection?.saveData) return false;

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (isCompactDevice && typeof memory === "number" && memory <= 2) return false;

  const type = connection?.type;
  if (type === "wifi" || type === "ethernet") return true;
  if (type === "cellular" || type === "wimax" || type === "bluetooth") return false;

  const effective = connection?.effectiveType;
  if (effective === "slow-2g" || effective === "2g" || effective === "3g") {
    return false;
  }
  if (typeof connection?.downlink === "number" && connection.downlink > 0 && connection.downlink < 1.5) {
    return false;
  }

  return !isCompactDevice;
}

export function textureCap(isCompactDevice: boolean, highDetail: boolean) {
  if (isCompactDevice) return highDetail ? 1024 : 512;
  return 4096;
}

export function subscribeNetworkQuality(onChange: () => void) {
  const connection = getConnection();
  if (!connection?.addEventListener) return () => {};
  connection.addEventListener("change", onChange);
  return () => connection.removeEventListener?.("change", onChange);
}
