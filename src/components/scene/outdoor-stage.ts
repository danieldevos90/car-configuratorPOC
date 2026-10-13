/** World-space focus around the centred vehicle (origin). */
export const OUTDOOR_FOCUS = {
  /** Keep road + shoulder + nearby trees. */
  meshRadiusXZ: 34,
  /** Drop heavy fill beyond this (e.g. large ground cards). */
  detailRadiusXZ: 22,
};

const ROAD_MESH = /road|rail|tramac|asphalt|soil|vert\.|lane|marking/i;

export function isOutdoorRoadMesh(name: string) {
  return ROAD_MESH.test(name);
}
