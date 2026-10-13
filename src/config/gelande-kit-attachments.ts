/** Pair each Gelände kit root with an OEM G550 anchor for runtime snapping. */

export type CentroidSnap = {
  type: "centroid";
  kitNode: string;
  oemNode: string;
};

export type GroundSnap = {
  type: "ground";
  kitNode: string;
  oemNode: string;
};

export type RoofSnap = {
  type: "roof-on-body";
  kitNodes: string[];
  oemNode: string;
};

export type GrilleSnap = {
  type: "grille-group";
  kitNodes: string[];
  oemNode: string;
};

export type WheelSnap = {
  type: "wheels";
  kitNode: string;
  coverNode?: string;
};

export type KitAttachmentRule =
  | CentroidSnap
  | GroundSnap
  | RoofSnap
  | GrilleSnap
  | WheelSnap;

export const GELANDE_KIT_ATTACHMENT_RULES: KitAttachmentRule[] = [
  { type: "wheels", kitNode: "New-wheels", coverNode: "Wheel-cover-rear" },
  {
    type: "centroid",
    kitNode: "Front-bumper-v4",
    oemNode: "Headlights",
  },
  { type: "ground", kitNode: "Skidplate-v1", oemNode: "Undercarriage" },
  { type: "ground", kitNode: "Side-step-v4", oemNode: "Undercarriage" },
  {
    type: "centroid",
    kitNode: "Front-fender-add-on-v3",
    oemNode: "WheelFrLeft",
  },
  {
    type: "grille-group",
    kitNodes: [
      "Grill-face",
      "Grille-new",
      "Front-grille",
      "Star",
      "Frame",
    ],
    oemNode: "Headlights",
  },
  { type: "centroid", kitNode: "Bonnet-grill v2", oemNode: "Bonnet" },
  {
    type: "roof-on-body",
    kitNodes: ["Roof-rack", "Roof-plates", "Ladder", "Tube", "Bracket"],
    oemNode: "Body",
  },
];
