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

/**
 * High-detail car/scene extras (grass, clouds, 4K sampling) only on Wi‑Fi /
 * Ethernet. Cellular, Save-Data, and slow effective types stay lite.
 * Safari has no Network Information API — mobile then stays lite.
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
  return highDetail ? 4096 : 2048;
}

export function subscribeNetworkQuality(onChange: () => void) {
  const connection = getConnection();
  if (!connection?.addEventListener) return () => {};
  connection.addEventListener("change", onChange);
  return () => connection.removeEventListener?.("change", onChange);
}
