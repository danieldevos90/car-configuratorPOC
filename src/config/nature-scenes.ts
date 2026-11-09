import type { CameraId, StudioId } from "@/config/finishes";

export const natureStudios = [
  { id: "alm", label: "Alm" },
  { id: "wald", label: "Bergwald" },
] as const;

export type NatureStudioId = (typeof natureStudios)[number]["id"];

export const wheelStillKeys = [
  "oem",
  "oem-black",
  "retro",
  "retro-black",
  "retro-bronze",
  "retro-paint",
] as const;

export function isNatureStudio(id: string): id is NatureStudioId {
  return id === "alm" || id === "wald";
}

/** Still captured from the live wheels camera in that studio. */
/** Bump when the wheel photographs change, so a refresh does not keep the previous file. */
const WHEEL_STILL_REV = "6";
const VIEW_STILL_REV = "4";

export function angleThumbSrc(camera: CameraId) {
  return `/renders/views/${camera}/gmanufaktur-retro-daylight.jpg?v=${VIEW_STILL_REV}`;
}

export function wheelRenderSrc(partId: string, studio: StudioId) {
  const key = partId.endsWith("-wheels") ? partId.slice(0, -"-wheels".length) : "";
  if (!wheelStillKeys.includes(key as (typeof wheelStillKeys)[number])) return null;
  return `/renders/wheels/${key}-${studio}.jpg?v=${WHEEL_STILL_REV}`;
}

export function allWheelStillSrcs() {
  const studios: StudioId[] = ["alm", "wald", "road", "daylight"];
  return studios.flatMap((studio) =>
    wheelStillKeys.map((key) => `/renders/wheels/${key}-${studio}.jpg?v=${WHEEL_STILL_REV}`),
  );
}

export function viewStillSrc(
  camera: CameraId,
  paint: string,
  wheel: string,
  studio: StudioId,
) {
  return `/renders/views/${camera}/${paint}-${wheel}-${studio}.jpg?v=${VIEW_STILL_REV}`;
}

export function cabinStillSrc(interior: string) {
  return `/renders/views/cabin/${interior}-daylight.jpg?v=${VIEW_STILL_REV}`;
}

/**
 * Daylight studio only. Wide angles keep the normal RETRO wheels and only
 * follow the body colour. The rim design is shown on the wheels close-up.
 */
export function viewStillCandidates(
  camera: CameraId,
  paint: string,
  wheel: string,
  _studio: StudioId,
  interior = "saddle",
) {
  if (camera === "cabin") {
    return [...new Set([
      cabinStillSrc(interior),
      cabinStillSrc("saddle"),
      viewStillSrc(camera, "gmanufaktur", "retro", "daylight"),
    ])];
  }
  if (camera !== "wheels") {
    const sources = [viewStillSrc(camera, paint, wheel, "daylight")];
    if (paint !== "gmanufaktur") {
      sources.push(viewStillSrc(camera, "gmanufaktur", wheel, "daylight"));
    }
    return sources;
  }
  const sources = [viewStillSrc(camera, paint, wheel, "daylight")];
  if (paint !== "gmanufaktur") sources.push(viewStillSrc(camera, "gmanufaktur", wheel, "daylight"));
  sources.push(`/renders/wheels/${wheel}-daylight.jpg?v=${WHEEL_STILL_REV}`);
  return [...new Set(sources)];
}
