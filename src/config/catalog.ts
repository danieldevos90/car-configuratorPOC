/**
 * Vehicle catalog — the contract between source GLBs and the configurator.
 *
 * Mapping rules (do not use mesh indices):
 *  1. Part visibility  → named scene nodes
 *  2. Paint / leather / calipers → material name patterns
 *  3. Cameras → world-space presets after the Z-up → Y-up correction
 *
 * Source GLBs live in public/models/source (or /glb). Web variants belong in
 * public/models/web after `npm run optimize:glb`. The loader prefers
 * the web URL and falls back to the source file.
 *
 * Build presets (OEM vs Retro) pick which GLB loads; parts and exclusive
 * groups toggle visibility inside that asset — see build-presets.ts.
 */

export type VehicleId = "g550" | "retro" | "master";

export type PartCategory =
  | "body"
  | "kit"
  | "wheels"
  | "lights"
  | "interior"
  | "mechanical";

export type ConfigPart = {
  id: string;
  label: string;
  nodeNames: string[];
  category: PartCategory;
  defaultVisible: boolean;
  description?: string;
  /** Limit node lookup to this root empty (combined master GLB). */
  presetRoot?: string;
};

/** Only one part in the group can be visible at a time (e.g. wheel sets). */
export type ExclusivePartGroup = {
  id: string;
  label: string;
  partIds: string[];
};

export type VehicleAudit = {
  fileName: string;
  sizeMb: number;
  triangles: number;
  vertices: number;
  nodes: number;
  meshes: number;
  materials: number;
  textures: number;
  textureMb: number;
  issues: string[];
};

export type VehicleDefinition = {
  id: VehicleId;
  name: string;
  subtitle: string;
  year: string;
  sourceUrl: string;
  webUrl: string;
  paintMaterials: string[];
  accentPaintMaterials: string[];
  leatherMaterials: string[];
  caliperMaterials: string[];
  glassMaterials: string[];
  emissiveMaterials: string[];
  parts: ConfigPart[];
  exclusiveGroups?: ExclusivePartGroup[];
  audit: VehicleAudit;
};

const MODELS_BASE = process.env.NEXT_PUBLIC_MODELS_BASE ?? "/models";

/** Bump when web GLBs are re-exported (`npm run optimize:glb`). */
export const WEB_MODEL_REV = "?v=4";

const MASTER_OEM_ROOT = "Build_OEM";
const MASTER_RETRO_ROOT = "Build_Retro";

function withPresetRoot(
  parts: ConfigPart[],
  presetRoot: string,
  idPrefix: string,
): ConfigPart[] {
  return parts.map((part) => ({
    ...part,
    id: `${idPrefix}-${part.id}`,
    presetRoot,
  }));
}

const retroVehicle: VehicleDefinition = {
    id: "retro",
    name: "Gelände Werke RETRO",
    subtitle: "G550 restomod · WIP scene",
    year: "2026",
    sourceUrl: `${MODELS_BASE}/source/WIP-gelande-werke-RETRO.glb`,
    webUrl: `${MODELS_BASE}/web/WIP-gelande-werke-RETRO.glb${WEB_MODEL_REV}`,
    paintMaterials: ["CarPaint", "CarPaint White"],
    accentPaintMaterials: ["CarPaint (1)"],
    leatherMaterials: [
      "intLeatherBrown",
      "intLeatherPatternSeat",
      "intLeatherPerforation",
    ],
    caliperMaterials: ["WheelBrakeCaliper"],
    glassMaterials: [
      "GlassWinds",
      "GlassTintedDark",
      "GlassLights",
      "GlassLights (1)",
      "GlassRedLights",
      "GlassClearTaillights",
      "GlassCameraLens",
      "GlassDetails",
      "intGlassDashboard",
      "intGlassDetailMatte",
      "FRlightLens",
      "RRpyramidsGlassBumpOPC",
    ],
    emissiveMaterials: [
      "LightEmissive",
      "LightEmissiveRed",
      "intAmbilightEmissive",
      "intLED",
      "intLEDAdd",
    ],
    parts: [
      {
        id: "body-shell",
        label: "Body",
        nodeNames: ["Body", "Mercedes-base-model", "Fenders-front", "Surface-v1"],
        category: "body",
        defaultVisible: true,
      },
      {
        id: "doors",
        label: "Doors",
        nodeNames: ["DoorFrLeft", "DoorFrRight", "DoorRearLeft", "DoorRearRight"],
        category: "body",
        defaultVisible: true,
      },
      {
        id: "bonnet",
        label: "Bonnet",
        nodeNames: ["Bonnet"],
        category: "body",
        defaultVisible: true,
      },
      {
        id: "trunk",
        label: "Trunk",
        nodeNames: ["Trunk"],
        category: "body",
        defaultVisible: true,
      },
      {
        id: "roof-rack",
        label: "Roof rack",
        nodeNames: ["Roof-rack", "Roof-plates", "Ladder", "Tube", "Bracket"],
        category: "kit",
        defaultVisible: true,
      },
      {
        id: "front-bumper",
        label: "Front bumper v4",
        nodeNames: ["Front-bumper-v4"],
        category: "kit",
        defaultVisible: true,
      },
      {
        id: "skidplate",
        label: "Skidplate",
        nodeNames: ["Skidplate-v1"],
        category: "kit",
        defaultVisible: true,
      },
      {
        id: "side-steps",
        label: "Side steps",
        nodeNames: ["Side-step-v4"],
        category: "kit",
        defaultVisible: true,
      },
      {
        id: "fender-addon",
        label: "Fender add-on",
        nodeNames: ["Front-fender-add-on-v3"],
        category: "kit",
        defaultVisible: true,
      },
      {
        id: "grille",
        label: "Grille",
        nodeNames: ["Grill-face", "Grille-new", "Front-grille", "Star", "Frame"],
        category: "kit",
        defaultVisible: true,
      },
      {
        id: "bonnet-grill",
        label: "Bonnet grill",
        nodeNames: ["Bonnet-grill v2"],
        category: "kit",
        defaultVisible: true,
      },
      {
        id: "wheels",
        label: "New wheels",
        nodeNames: ["New-wheels"],
        category: "wheels",
        defaultVisible: true,
      },
      {
        id: "wheel-covers",
        label: "Rear wheel covers",
        nodeNames: ["Wheel-cover-rear"],
        category: "wheels",
        defaultVisible: true,
      },
      {
        id: "headlights",
        label: "Headlights",
        nodeNames: ["Headlights", "Glass"],
        category: "lights",
        defaultVisible: true,
      },
      {
        id: "taillights",
        label: "Taillights",
        nodeNames: ["Taillights"],
        category: "lights",
        defaultVisible: true,
      },
      {
        id: "interior",
        label: "Interior",
        nodeNames: ["Interior", "Seats", "Dash", "SteeringWheel"],
        category: "interior",
        defaultVisible: true,
      },
      {
        id: "engine",
        label: "Engine",
        nodeNames: ["Engine"],
        category: "mechanical",
        defaultVisible: true,
      },
    ],
    audit: {
      fileName: "WIP-gelande-werke-RETRO.glb",
      sizeMb: 539.1,
      triangles: 6_315_830,
      vertices: 10_370_620,
      nodes: 1193,
      meshes: 1137,
      materials: 96,
      textures: 41,
      textureMb: 192.2,
      issues: [
        "Source file is 539 MB — too large for production web delivery.",
        "6.3M triangles are kept in the web export (Meshopt + WebP, textures capped at 4096).",
        "192 MB of uncompressed PNG textures; several exceed 12 MB.",
        "KHR_materials_transmission is applied to almost every material, including paint and plastic.",
        "Duplicate material names: CarPaint, CarPaint (1), PlasticBlack, WheelRimAlumGlossy.",
        "Inconsistent node naming: bolts vs Bolts, spaces in Rear-bumper - V2, typo Miscelenious.",
        "Generic leftover nodes: WORK, mesh, SUBD, SubD.",
        "Model is Z-up (CAD) rather than glTF Y-up.",
        "No animations, cameras, or Draco/meshopt compression.",
      ],
    },
  };

const g550Vehicle: VehicleDefinition = {
    id: "g550",
    name: "Mercedes-Benz G550",
    subtitle: "Original donor model",
    year: "OEM",
    sourceUrl: `${MODELS_BASE}/source/MB-G550-original-model.glb`,
    webUrl: `${MODELS_BASE}/web/MB-G550-original-model.glb${WEB_MODEL_REV}`,
    paintMaterials: ["CarPaint-retro-G"],
    accentPaintMaterials: [],
    leatherMaterials: [],
    caliperMaterials: [],
    glassMaterials: [],
    emissiveMaterials: [],
    parts: [
      {
        id: "body",
        label: "Body",
        nodeNames: ["Body", "Undercarriage"],
        category: "body",
        defaultVisible: true,
      },
      {
        id: "bonnet",
        label: "Bonnet",
        nodeNames: ["Bonnet"],
        category: "body",
        defaultVisible: true,
      },
      {
        id: "doors",
        label: "Doors",
        nodeNames: ["DoorFrLeft", "DoorFrRight", "DoorRearLeft", "DoorRearRight"],
        category: "body",
        defaultVisible: true,
      },
      {
        id: "trunk",
        label: "Trunk",
        nodeNames: ["Trunk"],
        category: "body",
        defaultVisible: true,
      },
      {
        id: "wheels",
        label: "Wheels",
        nodeNames: [
          "WheelFrLeft",
          "WheelFrRight",
          "WheelRearLeft",
          "WheelRearRight",
        ],
        category: "wheels",
        defaultVisible: true,
      },
      {
        id: "brakes",
        label: "Brakes",
        nodeNames: [
          "BrakeFrLeft",
          "BrakeFrRight",
          "BrakeRearLeft",
          "BrakeRearRight",
        ],
        category: "mechanical",
        defaultVisible: true,
      },
      {
        id: "headlights",
        label: "Headlights",
        nodeNames: ["Headlights"],
        category: "lights",
        defaultVisible: true,
      },
      {
        id: "taillights",
        label: "Taillights",
        nodeNames: ["Taillights"],
        category: "lights",
        defaultVisible: true,
      },
      {
        id: "interior",
        label: "Interior",
        nodeNames: ["Interior", "Seats", "Dash", "SteeringWheel"],
        category: "interior",
        defaultVisible: true,
      },
      {
        id: "engine",
        label: "Engine",
        nodeNames: ["Engine"],
        category: "mechanical",
        defaultVisible: true,
      },
    ],
    audit: {
      fileName: "MB-G550-original-model.glb",
      sizeMb: 421.3,
      triangles: 5_808_696,
      vertices: 11_617_394,
      nodes: 306,
      meshes: 283,
      materials: 45,
      textures: 0,
      textureMb: 0,
      issues: [
        "Source file is 421 MB of uncompressed geometry (no textures).",
        "5.8M triangles; Body + seats + interior + dash already exceed 2.8M.",
        "Only one named material (CarPaint-retro-G); remaining 44 materials are unnamed.",
        "All 283 meshes are unnamed — configure via parent node groups only.",
        "One LINE primitive (mode 3) without normals.",
        "Model is Z-up (CAD) rather than glTF Y-up.",
        "No animations, cameras, or Draco/meshopt compression.",
      ],
    },
  };

const masterVehicle: VehicleDefinition = {
  id: "master",
  name: "Gelände Werke G550",
  subtitle: "OEM + Retro in one asset (Blender CLI master)",
  year: "2026",
  sourceUrl: `${MODELS_BASE}/source/GW-G550-configurator-master.glb`,
  webUrl: `${MODELS_BASE}/web/GW-G550-configurator-master.glb${WEB_MODEL_REV}`,
  paintMaterials: ["CarPaint", "CarPaint White", "CarPaint-retro-G"],
  accentPaintMaterials: ["CarPaint (1)"],
  leatherMaterials: retroVehicle.leatherMaterials,
  caliperMaterials: retroVehicle.caliperMaterials,
  glassMaterials: retroVehicle.glassMaterials,
  emissiveMaterials: retroVehicle.emissiveMaterials,
  exclusiveGroups: [
    {
      id: "build",
      label: "Build",
      partIds: ["preset-oem", "preset-retro"],
    },
  ],
  parts: [
    {
      id: "preset-oem",
      label: "OEM build",
      nodeNames: [MASTER_OEM_ROOT],
      category: "body",
      defaultVisible: true,
    },
    {
      id: "preset-retro",
      label: "Retro build",
      nodeNames: [MASTER_RETRO_ROOT],
      category: "body",
      defaultVisible: true,
    },
    ...withPresetRoot(g550Vehicle.parts, MASTER_OEM_ROOT, "oem"),
    ...withPresetRoot(retroVehicle.parts, MASTER_RETRO_ROOT, "retro"),
  ],
  audit: {
    fileName: "GW-G550-configurator-master.glb",
    sizeMb: 976,
    triangles: 12_124_526,
    vertices: 0,
    nodes: 0,
    meshes: 0,
    materials: 0,
    textures: 41,
    textureMb: 192.2,
    issues: [
      "Combined OEM + Retro from scripts/build-master-vehicle.py — both builds load in GPU memory.",
      "Run npm run build:master-glb then npm run optimize:glb for web delivery.",
      "Dedupe overlapping body meshes in Blender before treating as production master.",
    ],
  },
};

export const vehicles: Record<VehicleId, VehicleDefinition> = {
  retro: retroVehicle,
  g550: g550Vehicle,
  master: masterVehicle,
};

export const vehicleList = Object.values(vehicles);
