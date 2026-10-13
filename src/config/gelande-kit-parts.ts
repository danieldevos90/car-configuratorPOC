import type { ConfigPart } from "@/config/catalog";

/** Retro GLB node roots exported into GW-gelande-kits.glb (see build-modular-vehicle.py). */
export const GELANDE_KIT_NODE_NAMES: string[] = [
  "Roof-rack",
  "Roof-plates",
  "Ladder",
  "Tube",
  "Bracket",
  "Front-bumper-v4",
  "Skidplate-v1",
  "Side-step-v4",
  "Front-fender-add-on-v3",
  "Grill-face",
  "Grille-new",
  "Front-grille",
  "Star",
  "Frame",
  "Bonnet-grill v2",
  "New-wheels",
  "Wheel-cover-rear",
];

export const GELANDE_KIT_PARTS: ConfigPart[] = [
  {
    id: "gelande-roof-rack",
    label: "Roof rack",
    nodeNames: ["Roof-rack", "Roof-plates", "Ladder", "Tube", "Bracket"],
    category: "kit",
    defaultVisible: false,
    module: "gelande",
  },
  {
    id: "gelande-front-bumper",
    label: "Front bumper v4",
    nodeNames: ["Front-bumper-v4"],
    category: "kit",
    defaultVisible: false,
    module: "gelande",
  },
  {
    id: "gelande-skidplate",
    label: "Skidplate",
    nodeNames: ["Skidplate-v1"],
    category: "kit",
    defaultVisible: false,
    module: "gelande",
  },
  {
    id: "gelande-side-steps",
    label: "Side steps",
    nodeNames: ["Side-step-v4"],
    category: "kit",
    defaultVisible: false,
    module: "gelande",
  },
  {
    id: "gelande-fender-addon",
    label: "Fender add-on",
    nodeNames: ["Front-fender-add-on-v3"],
    category: "kit",
    defaultVisible: false,
    module: "gelande",
  },
  {
    id: "gelande-grille",
    label: "Grille",
    nodeNames: ["Grill-face", "Grille-new", "Front-grille", "Star", "Frame"],
    category: "kit",
    defaultVisible: false,
    module: "gelande",
  },
  {
    id: "gelande-bonnet-grill",
    label: "Bonnet grill",
    nodeNames: ["Bonnet-grill v2"],
    category: "kit",
    defaultVisible: false,
    module: "gelande",
  },
  {
    id: "gelande-wheels",
    label: "Gelände wheels",
    nodeNames: ["New-wheels"],
    category: "wheels",
    defaultVisible: false,
    module: "gelande",
  },
  {
    id: "gelande-wheel-covers",
    label: "Rear wheel covers",
    nodeNames: ["Wheel-cover-rear"],
    category: "wheels",
    defaultVisible: false,
    module: "gelande",
  },
];

export const GELANDE_OPTION_PART_IDS = GELANDE_KIT_PARTS.map((part) => part.id);
