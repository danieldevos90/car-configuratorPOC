export type Finish = {
  id: string;
  label: string;
  color: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  sheen?: string;
};

export const paints: Finish[] = [
  {
    id: "sahara",
    label: "Sahara Gold",
    color: "#fccd68",
    roughness: 0.28,
    metalness: 0.18,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
  },
  {
    id: "obsidian",
    label: "Obsidian",
    color: "#111111",
    roughness: 0.22,
    metalness: 0.35,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
  },
  {
    id: "arctic",
    label: "Arctic White",
    color: "#f4f1ea",
    roughness: 0.3,
    metalness: 0.12,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  },
  {
    id: "nardo",
    label: "Nardo Grey",
    color: "#6e7276",
    roughness: 0.42,
    metalness: 0.2,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
  },
  {
    id: "gmanufaktur",
    label: "G Manufaktur Green",
    color: "#2f4a38",
    roughness: 0.26,
    metalness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  },
  {
    id: "midnight",
    label: "Midnight Blue",
    color: "#152238",
    roughness: 0.24,
    metalness: 0.28,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  },
  {
    id: "rosso",
    label: "Rosso",
    color: "#8b1e1e",
    roughness: 0.25,
    metalness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  },
  {
    id: "bronze",
    label: "Desert Bronze",
    color: "#8a6a43",
    roughness: 0.38,
    metalness: 0.4,
    clearcoat: 0.7,
    clearcoatRoughness: 0.14,
  },
];

export const interiors: Finish[] = [
  {
    id: "saddle",
    label: "Saddle leather",
    color: "#5f4b3a",
    roughness: 0.62,
    metalness: 0,
    clearcoat: 0.05,
    clearcoatRoughness: 0.5,
    sheen: "#c4a882",
  },
  {
    id: "espresso",
    label: "Espresso",
    color: "#2a1d16",
    roughness: 0.68,
    metalness: 0,
    clearcoat: 0.04,
    clearcoatRoughness: 0.55,
    sheen: "#6b4f3a",
  },
  {
    id: "ivory",
    label: "Ivory",
    color: "#d9cfc0",
    roughness: 0.7,
    metalness: 0,
    clearcoat: 0.04,
    clearcoatRoughness: 0.6,
    sheen: "#f2eadb",
  },
  {
    id: "black",
    label: "Black nappa",
    color: "#141414",
    roughness: 0.58,
    metalness: 0,
    clearcoat: 0.08,
    clearcoatRoughness: 0.45,
    sheen: "#3a3a3a",
  },
];

export const calipers: Finish[] = [
  {
    id: "gunmetal",
    label: "Gunmetal",
    color: "#404040",
    roughness: 0.35,
    metalness: 0.55,
    clearcoat: 0.4,
    clearcoatRoughness: 0.25,
  },
  {
    id: "red",
    label: "Signal red",
    color: "#c23b2a",
    roughness: 0.28,
    metalness: 0.2,
    clearcoat: 0.8,
    clearcoatRoughness: 0.12,
  },
  {
    id: "gold",
    label: "Werke gold",
    color: "#c9a227",
    roughness: 0.3,
    metalness: 0.35,
    clearcoat: 0.7,
    clearcoatRoughness: 0.14,
  },
  {
    id: "yellow",
    label: "Acid yellow",
    color: "#d6c312",
    roughness: 0.32,
    metalness: 0.15,
    clearcoat: 0.75,
    clearcoatRoughness: 0.12,
  },
];

export const studioPresets = [
  { id: "road", label: "Outdoor" },
  { id: "daylight", label: "Daylight studio" },
] as const;

export type StudioId = (typeof studioPresets)[number]["id"];

export const cameraPresets = [
  { id: "hero", label: "Hero", position: [4.8, 1.7, 5.4], target: [0, 0.7, 0] },
  { id: "front", label: "Front", position: [0, 1.15, 7.2], target: [0, 0.8, 0] },
  { id: "rear", label: "Rear", position: [0, 1.3, -7.4], target: [0, 0.85, 0] },
  { id: "side", label: "Side", position: [7.6, 1.2, 0.4], target: [0, 0.7, 0] },
  {
    id: "three-quarter",
    label: "3/4",
    position: [-4.6, 1.5, 5.2],
    target: [0, 0.7, 0],
  },
  {
    id: "wheels",
    label: "Wheels",
    position: [3.4, 0.55, 3.6],
    target: [0.9, 0.35, 1.4],
  },
  {
    id: "cabin",
    label: "Cabin",
    position: [0.42, 1.27, 0.02],
    target: [0.18, 1.16, 0.5],
  },
  { id: "top", label: "Plan", position: [0.2, 9.5, 0.1], target: [0, 0, 0] },
  {
    id: "road",
    label: "Wide",
    position: [6.4, 2.15, 7.4],
    target: [0, 0.65, 0],
  },
] as const;

export type CameraId = (typeof cameraPresets)[number]["id"];
