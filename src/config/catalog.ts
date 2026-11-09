import { GELANDE_KIT_PARTS } from "@/config/gelande-kit-parts";

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
 * The configured vehicle loads OEM base + optional Gelände kit GLB; exclusive
 * groups toggle visibility (e.g. wheel sets).
 */

export type VehicleId = "g550" | "retro" | "master" | "configured" | "gw";

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
  /** Loaded from the Gelände kit GLB module (not the OEM base). */
  module?: "gelande";
  /** Customer-facing add-on (on/off switch) rather than an inspector toggle. */
  accessory?: boolean;
  /** Camera angle used when the configurator flies to this part. */
  view?: PartView;
  /** Short option name inside a slot ("RETRO", "Gloss black"). */
  optionLabel?: string;
  /** UI swatch for the option card. */
  swatch?: string;
  /** Material variant applied while this option is visible (options may share geometry). */
  finish?: PartFinish;
};

export type FinishTone = {
  color: string;
  metalness: number;
  roughness: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
};

export type PartFinish = {
  /** Exact material names inside the part's nodes that receive the variant. */
  materials: string[];
  tone: "paint" | "contrast" | FinishTone;
};

/** Orbit angles (radians) around the car: azimuth 0 = front (+Z), polar 0 = top. */
export type PartView = { azimuth: number; polar: number; camera?: "wheels" };

export type VehicleModular = {
  kitSourceUrl: string;
  kitWebUrl: string;
};

/** Only one part in the group can be visible at a time (e.g. wheel sets). */
export type ExclusivePartGroup = {
  id: string;
  label: string;
  partIds: string[];
  /** A slot that always shows exactly one option (OEM ↔ RETRO swap). */
  required?: boolean;
};

/** One-click build: picks these options in every required slot. */
export type VehicleBuild = {
  id: string;
  label: string;
  description: string;
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
  /** Second colour (duo-tone roof, storage boxes) chosen separately from the body. */
  contrastPaintMaterials?: string[];
  leatherMaterials: string[];
  caliperMaterials: string[];
  glassMaterials: string[];
  emissiveMaterials: string[];
  parts: ConfigPart[];
  exclusiveGroups?: ExclusivePartGroup[];
  builds?: VehicleBuild[];
  modular?: VehicleModular;
  audit: VehicleAudit;
};

const MODELS_BASE = process.env.NEXT_PUBLIC_MODELS_BASE ?? "/models";

/** Bump when web GLBs are re-exported (`npm run optimize:glb`). */
export const WEB_MODEL_REV = "?v=12";

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
        label: "Stock wheels",
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

const configuredVehicle: VehicleDefinition = {
  id: "configured",
  name: "Mercedes-Benz G550",
  subtitle: "OEM base · Gelände Werke options",
  year: "2026",
  sourceUrl: g550Vehicle.sourceUrl,
  webUrl: g550Vehicle.webUrl,
  modular: {
    kitSourceUrl: `${MODELS_BASE}/source/GW-gelande-kits.glb`,
    kitWebUrl: `${MODELS_BASE}/web/GW-gelande-kits.glb${WEB_MODEL_REV}`,
  },
  paintMaterials: [
    ...g550Vehicle.paintMaterials,
    ...retroVehicle.paintMaterials,
    ...retroVehicle.accentPaintMaterials,
  ],
  accentPaintMaterials: retroVehicle.accentPaintMaterials,
  leatherMaterials: retroVehicle.leatherMaterials,
  caliperMaterials: retroVehicle.caliperMaterials,
  glassMaterials: retroVehicle.glassMaterials,
  emissiveMaterials: retroVehicle.emissiveMaterials,
  exclusiveGroups: [
    {
      id: "wheels",
      label: "Wheels",
      partIds: ["wheels", "gelande-wheels"],
    },
  ],
  parts: [...g550Vehicle.parts, ...GELANDE_KIT_PARTS],
  audit: {
    fileName: "GW-G550-base + GW-gelande-kits",
    sizeMb: g550Vehicle.audit.sizeMb,
    triangles: g550Vehicle.audit.triangles,
    vertices: g550Vehicle.audit.vertices,
    nodes: g550Vehicle.audit.nodes,
    meshes: g550Vehicle.audit.meshes,
    materials: g550Vehicle.audit.materials,
    textures: retroVehicle.audit.textures,
    textureMb: retroVehicle.audit.textureMb,
    issues: [
      "OEM G550 is the only full vehicle mesh; Gelände parts load from a separate kit GLB.",
      "Run npm run build:modular-glb after WIP or kit changes.",
    ],
  },
};

/** OEM ↔ RETRO slots in GW-configurator.glb (names from scripts/optimize-gw-configurator.mjs). */
const VIEW = {
  front: { azimuth: 0.55, polar: 1.32 },
  frontLow: { azimuth: 0.35, polar: 1.48 },
  frontFender: { azimuth: 0.95, polar: 1.3 },
  side: { azimuth: Math.PI / 2, polar: 1.38 },
  rear: { azimuth: Math.PI - 0.6, polar: 1.3 },
  roof: { azimuth: 0.75, polar: 0.9 },
  wheels: { azimuth: 1.22, polar: 1.28, camera: "wheels" },
} satisfies Record<string, PartView>;

/** One choice inside a slot; part id becomes `${key}-${slot.id}`. */
type SlotOption = {
  key: string;
  label: string;
  nodes: string[];
  description?: string;
  swatch?: string;
  finish?: PartFinish;
};

type SlotDef = {
  id: string;
  label: string;
  category: PartCategory;
  view: PartView;
  defaultKey: string;
  options: SlotOption[];
};

const TONE = {
  glossBlack: { color: "#0d0e10", metalness: 0.35, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 },
  satinBlack: { color: "#1a1b1d", metalness: 0.4, roughness: 0.48, clearcoat: 0.3, clearcoatRoughness: 0.4 },
  bronze: { color: "#6e5536", metalness: 0.85, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.12 },
} satisfies Record<string, FinishTone>;

const RETRO_RIM = ["WheelChrome [imported] (1)"];
const OEM_RIM = ["WheelRimAlumGlossy"];
const RETRO_ACCENT = ["CarPaint (1)"];

function oemRetro(oem: string[], retro: string[]): SlotOption[] {
  return [
    { key: "oem", label: "OEM", nodes: oem },
    { key: "retro", label: "RETRO", nodes: retro },
  ];
}

const GW_SLOTS: SlotDef[] = [
  {
    id: "front-bumper",
    label: "Front bumper",
    category: "kit",
    view: VIEW.front,
    defaultKey: "retro",
    options: [
      { key: "oem", label: "OEM", nodes: ["Front-bumper"] },
      { key: "retro", label: "RETRO", description: "Graphite accent", nodes: ["Front-bumper-v9"], swatch: "#3b3b3b" },
      { key: "retro-paint", label: "RETRO body colour", nodes: ["Front-bumper-v9"], finish: { materials: RETRO_ACCENT, tone: "paint" } },
    ],
  },
  { id: "grille", label: "Grille & front face", category: "kit", view: VIEW.front, defaultKey: "retro", options: oemRetro(["OEM-Front-face", "Front-central-grille"], ["Grill-face", "Grille-new"]) },
  { id: "bonnet-grill", label: "Bonnet grill", category: "kit", view: VIEW.front, defaultKey: "retro", options: oemRetro(["OEM-bonnet-grill"], ["Bonnet-grill-v2"]) },
  { id: "headlights", label: "Headlights", category: "lights", view: VIEW.front, defaultKey: "retro", options: oemRetro(["Headlights"], ["Front-headlights-new-position"]) },
  { id: "front-fenders", label: "Front fenders", category: "kit", view: VIEW.frontFender, defaultKey: "retro", options: oemRetro(["Fenders-front", "fender-liners"], ["Front-fenders-with-hole", "Front-fender-extension"]) },
  {
    id: "wheels",
    label: "Wheels",
    category: "wheels",
    view: VIEW.wheels,
    defaultKey: "retro",
    options: [
      { key: "oem", label: "OEM alloy", description: "Polished aluminium", nodes: ["OEM-wheels"], swatch: "#c7c9cc" },
      { key: "oem-black", label: "OEM black", nodes: ["OEM-wheels"], swatch: TONE.glossBlack.color, finish: { materials: OEM_RIM, tone: TONE.glossBlack } },
      { key: "retro", label: "RETRO chrome", description: "Steel rim, chrome", nodes: ["Wheel-RETRO-final"], swatch: "#e2e4e7" },
      { key: "retro-black", label: "RETRO black", nodes: ["Wheel-RETRO-final"], swatch: TONE.satinBlack.color, finish: { materials: RETRO_RIM, tone: TONE.satinBlack } },
      { key: "retro-bronze", label: "RETRO bronze", nodes: ["Wheel-RETRO-final"], swatch: TONE.bronze.color, finish: { materials: RETRO_RIM, tone: TONE.bronze } },
      { key: "retro-paint", label: "RETRO colour", description: "Rims in body colour", nodes: ["Wheel-RETRO-final"], finish: { materials: RETRO_RIM, tone: "paint" } },
    ],
  },
  {
    id: "side-steps",
    label: "Side steps",
    category: "kit",
    view: VIEW.side,
    defaultKey: "retro",
    options: [...oemRetro(["Original-side-step"], ["Side-step-v4"]), { key: "none", label: "None", nodes: [] }],
  },
  { id: "side-trim", label: "Side trim", category: "kit", view: VIEW.side, defaultKey: "retro", options: oemRetro(["Side-trim"], ["Side-trim-RETRO"]) },
  { id: "rear-fenders", label: "Rear fenders", category: "kit", view: VIEW.rear, defaultKey: "retro", options: oemRetro(["Fenders-rear"], ["Rear-fenders"]) },
  {
    id: "rear-bumper",
    label: "Rear bumper",
    category: "kit",
    view: VIEW.rear,
    defaultKey: "retro",
    options: [
      { key: "oem", label: "OEM", nodes: ["OEM-Rear-bumper"] },
      { key: "retro", label: "RETRO", description: "Graphite accent", nodes: ["Retro-Rear-bumper"], swatch: "#3b3b3b" },
      { key: "retro-paint", label: "RETRO body colour", nodes: ["Retro-Rear-bumper"], finish: { materials: RETRO_ACCENT, tone: "paint" } },
    ],
  },
  {
    id: "spare-wheel",
    label: "Spare wheel",
    category: "kit",
    view: VIEW.rear,
    defaultKey: "retro",
    options: [
      { key: "oem", label: "OEM cover", nodes: ["Trunk-wheel"] },
      { key: "retro", label: "RETRO compartment", nodes: ["Spare-Wheel-with-compartment"] },
      { key: "none", label: "None", nodes: [] },
    ],
  },
];

const slotPartId = (slot: SlotDef, key: string) => `${key}-${slot.id}`;

const gwSlotParts: ConfigPart[] = GW_SLOTS.flatMap((slot) =>
  slot.options.map((option) => ({
    id: slotPartId(slot, option.key),
    label: `${slot.label} · ${option.label}`,
    optionLabel: option.label,
    description: option.description,
    swatch: option.swatch,
    finish: option.finish,
    nodeNames: option.nodes,
    category: slot.category,
    defaultVisible: option.key === slot.defaultKey,
    view: slot.view,
  })),
);

/** Build option for a slot, falling back to the slot default when the build has no such key. */
function buildPartIds(key: string) {
  return GW_SLOTS.map((slot) =>
    slotPartId(slot, slot.options.some((o) => o.key === key) ? key : slot.defaultKey),
  );
}

const gwVehicle: VehicleDefinition = {
  id: "gw",
  name: "Gelände Werke G550",
  subtitle: "RETRO kit · OEM parts · duo-tone",
  year: "2026",
  sourceUrl: `${MODELS_BASE}/source/gelande-werke-RETRO+OEMparts.glb`,
  webUrl: `${MODELS_BASE}/web/GW-configurator.glb${WEB_MODEL_REV}`,
  paintMaterials: ["CarPaint"],
  accentPaintMaterials: ["CarPaint (1)"],
  contrastPaintMaterials: ["CarPaint White"],
  leatherMaterials: retroVehicle.leatherMaterials,
  caliperMaterials: retroVehicle.caliperMaterials,
  glassMaterials: retroVehicle.glassMaterials,
  emissiveMaterials: retroVehicle.emissiveMaterials,
  exclusiveGroups: GW_SLOTS.map((slot) => ({
    id: slot.id,
    label: slot.label,
    partIds: slot.options.map((option) => slotPartId(slot, option.key)),
    required: true,
  })),
  builds: [
    {
      id: "retro",
      label: "RETRO",
      description: "Full Gelände Werke RETRO exterior",
      partIds: buildPartIds("retro"),
    },
    {
      id: "retro-paint",
      label: "Colour-coded",
      description: "RETRO kit with bumpers and rims in body colour",
      partIds: buildPartIds("retro-paint"),
    },
    {
      id: "oem",
      label: "OEM",
      description: "Original Mercedes-Benz G550 parts",
      partIds: buildPartIds("oem"),
    },
  ],
  parts: [
    {
      id: "body",
      label: "Body",
      nodeNames: ["Body", "Undercarriage", "Rain-rails-trim"],
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
    { id: "bonnet", label: "Bonnet", nodeNames: ["Bonnet"], category: "body", defaultVisible: true },
    { id: "trunk", label: "Trunk", nodeNames: ["Trunk"], category: "body", defaultVisible: true },
    {
      id: "duo-tone",
      label: "Duo-tone roof",
      nodeNames: ["GW-DuoTone"],
      category: "body",
      defaultVisible: true,
      description: "Roof in the contrast colour",
      accessory: true,
      view: VIEW.roof,
    },
    ...gwSlotParts,
    { id: "roof-rack", label: "Roof rack", description: "Wood-inlay expedition rack", nodeNames: ["Roof-rack"], category: "kit", defaultVisible: false, accessory: true, view: VIEW.roof },
    { id: "ladder", label: "Rear ladder", description: "Roof access", nodeNames: ["Ladder"], category: "kit", defaultVisible: false, accessory: true, view: VIEW.rear },
    { id: "skidplate", label: "Skidplate", description: "Front underbody protection", nodeNames: ["Skidplate"], category: "kit", defaultVisible: true, accessory: true, view: VIEW.frontLow },
    {
      id: "window-storage",
      label: "Window storage boxes",
      description: "Side-mounted, contrast colour",
      nodeNames: ["window-storage-L", "window-storage-R"],
      category: "kit",
      defaultVisible: true,
      accessory: true,
      view: VIEW.side,
    },
    {
      id: "window-delete",
      label: "Window delete plates",
      description: "Rear side windows closed",
      nodeNames: ["Side-window-delete-plate-L", "Side-window-delete-plate-R"],
      category: "kit",
      defaultVisible: true,
      accessory: true,
      view: VIEW.side,
    },
    {
      id: "taillights",
      label: "Taillights",
      nodeNames: ["Taillights"],
      category: "lights",
      defaultVisible: true,
    },
    {
      id: "indicators",
      label: "Front indicators",
      nodeNames: ["Front-indicators"],
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
    { id: "brakes", label: "Brakes", nodeNames: ["Brakes"], category: "mechanical", defaultVisible: true },
    { id: "engine", label: "Engine", nodeNames: ["Engine"], category: "mechanical", defaultVisible: true },
  ],
  audit: {
    fileName: "gelande-werke-RETRO+OEMparts.glb → GW-configurator.glb",
    sizeMb: 46.1,
    triangles: 6_530_000,
    vertices: 0,
    nodes: 448,
    meshes: 353,
    materials: 79,
    textures: 41,
    textureMb: 16.9,
    issues: [
      "Source 920 MB / 8.76M triangles / 7,799 primitives → web 46 MB / 6.5M triangles / 353 primitives.",
      "Primitives joined per named group; matte parts simplified at 0.00005 × mesh radius, paint/glass/chrome kept at full density.",
      "Textures: 8K maps capped at 4096 WebP; 64 → 41 after dedup.",
      "Duplicate source names renamed (Rear-bumper → OEM-/Retro-Rear-bumper, Tube, glass, frame, main-cover).",
      "KHR_materials_transmission on all 98 materials — stripped at runtime for non-glass.",
      "Re-export: npm run optimize:gw",
    ],
  },
};

export const vehicles: Record<VehicleId, VehicleDefinition> = {
  retro: retroVehicle,
  g550: g550Vehicle,
  master: masterVehicle,
  configured: configuredVehicle,
  gw: gwVehicle,
};

export const vehicleList = Object.values(vehicles);
