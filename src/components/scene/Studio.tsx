"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Environment, Lightformer } from "@react-three/drei";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Uint32BufferAttribute,
} from "three";
import { iblResolution } from "@/lib/scene-quality";
import { useConfigurator } from "@/store/configurator-store";

/** Paper-white showroom. Unlit, so ACES on the car does not grey the cove. */
const SHOWROOM = {
  sky: "#eef0f2",
  floor: "#e6e9ed",
  wall: "#e8ebef",
  ring: "#b5bcc3",
  shaft: "#ffffff",
} as const;

const SHOWROOM_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const SHOWROOM_FRAG = /* glsl */ `
  varying vec3 vWorld;
  uniform vec3 uFloor;
  uniform vec3 uWall;
  uniform vec3 uRing;
  uniform vec3 uShaft;

  float ring(float radius) {
    float d = abs(length(vWorld.xz) - radius);
    return 1.0 - smoothstep(0.014, 0.042, d);
  }

  void main() {
    float y = vWorld.y;
    float r = length(vWorld.xz);
    float lift = smoothstep(0.02, 2.2, y);
    float edge = smoothstep(6.2, 8.8, r);
    vec3 color = mix(uFloor, uWall, clamp(max(lift, edge), 0.0, 1.0));

    float cove = smoothstep(0.0, 0.35, y) * (1.0 - smoothstep(0.9, 2.4, y));
    color *= 1.0 - cove * 0.035;

    float lines = 0.0;
    lines += ring(2.9) * 0.82;
    lines += ring(4.2) * 0.62;
    lines += ring(5.55) * 0.46;
    lines += ring(6.9) * 0.3;
    lines *= 1.0 - smoothstep(0.0, 0.35, y);
    color = mix(color, uRing, clamp(lines, 0.0, 0.85));

    float ang = atan(vWorld.z, vWorld.x);
    float delta = atan(sin(ang + 2.02), cos(ang + 2.02));
    float slant = delta + (y - 2.8) * 0.1;
    float width = mix(0.38, 0.95, smoothstep(0.3, 5.5, y));
    float shaft = 1.0 - smoothstep(width * 0.18, width, abs(slant));
    shaft *= smoothstep(0.2, 1.6, y);
    color = mix(color, uShaft, shaft * 0.92);

    float sky = smoothstep(3.5, 10.0, y);
    color = mix(color, uShaft, sky * 0.12);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function createShowroomGeometry(lite: boolean) {
  const floorRadius = 8.6;
  const curveRadius = 2.8;
  const wallHeight = 12;
  const radialSegments = lite ? 40 : 72;
  const floorSteps = 4;
  const curveSteps = lite ? 8 : 16;
  const wallSteps = 5;

  const profile: Array<[number, number]> = [];
  for (let i = 0; i <= floorSteps; i += 1) {
    profile.push([(i / floorSteps) * floorRadius, 0]);
  }
  for (let i = 1; i <= curveSteps; i += 1) {
    const t = (i / curveSteps) * (Math.PI / 2);
    profile.push([
      floorRadius + Math.sin(t) * curveRadius,
      curveRadius * (1 - Math.cos(t)),
    ]);
  }
  const wallR = floorRadius + curveRadius;
  for (let i = 1; i <= wallSteps; i += 1) {
    profile.push([wallR, curveRadius + (i / wallSteps) * wallHeight]);
  }

  const rows = profile.length;
  const positions = new Float32Array((radialSegments + 1) * rows * 3);
  let offset = 0;
  for (let a = 0; a <= radialSegments; a += 1) {
    const theta = (a / radialSegments) * Math.PI * 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    for (let i = 0; i < rows; i += 1) {
      const [radius, y] = profile[i];
      positions[offset++] = radius * cos;
      positions[offset++] = y;
      positions[offset++] = radius * sin;
    }
  }

  const indices = new Uint32Array(radialSegments * (rows - 1) * 6);
  let index = 0;
  for (let a = 0; a < radialSegments; a += 1) {
    for (let i = 0; i < rows - 1; i += 1) {
      const a0 = a * rows + i;
      const a1 = (a + 1) * rows + i;
      indices[index++] = a0;
      indices[index++] = a0 + 1;
      indices[index++] = a1;
      indices[index++] = a1;
      indices[index++] = a0 + 1;
      indices[index++] = a1 + 1;
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setIndex(new Uint32BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

function ShowroomCyclorama({ lite }: { lite: boolean }) {
  const geometry = useMemo(() => createShowroomGeometry(lite), [lite]);
  const uniforms = useMemo(
    () => ({
      uFloor: { value: new Color(SHOWROOM.floor) },
      uWall: { value: new Color(SHOWROOM.wall) },
      uRing: { value: new Color(SHOWROOM.ring) },
      uShaft: { value: new Color(SHOWROOM.shaft) },
    }),
    [],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} position={[0, -0.004, 0]} frustumCulled={false}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={SHOWROOM_VERT}
        fragmentShader={SHOWROOM_FRAG}
        side={DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Soft key light. The shadow map is the car's own silhouette on the floor. */
function StudioKeyLight() {
  const light = useRef<DirectionalLight>(null);
  useLayoutEffect(() => {
    const shadow = light.current?.shadow;
    if (!shadow) return;
    shadow.camera.updateProjectionMatrix();
    shadow.needsUpdate = true;
  }, []);
  return (
    <directionalLight
      ref={light}
      castShadow
      position={[-8.2, 7.2, -5.4]}
      intensity={1.8}
      color="#fffaf6"
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.00008}
      shadow-normalBias={0.004}
      shadow-radius={4}
      shadow-blurSamples={12}
      shadow-camera-near={1}
      shadow-camera-far={36}
      shadow-camera-left={-8}
      shadow-camera-right={8}
      shadow-camera-top={8}
      shadow-camera-bottom={-8}
    />
  );
}

/** Transparent catcher so the curved cove can stay unlit and still show the shadow. */
function FloorShadow() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.012, 0]}
      receiveShadow
      renderOrder={2}
    >
      <planeGeometry args={[14, 14]} />
      <shadowMaterial transparent opacity={0.55} depthWrite={false} />
    </mesh>
  );
}

/**
 * Procedural car-studio IBL: softbox strips give the paint the long, crisp
 * highlight lines of a photo studio. Rendered once into a cube map, so it
 * costs no download and no per-frame work.
 */
function StudioLightformers({ resolution }: { resolution: number }) {
  return (
    <Environment resolution={resolution} frames={1} environmentIntensity={0.85}>
      <color attach="background" args={["#e7eaee"]} />
      <Lightformer form="rect" intensity={5} position={[0, 4.4, 0.5]} rotation-x={Math.PI / 2} scale={[0.55, 9, 1]} />
      <Lightformer form="rect" intensity={0.45} position={[0, 6.8, 0]} rotation-x={Math.PI / 2} scale={[12, 7, 1]} />
      <Lightformer form="rect" intensity={1.4} position={[-7.2, 3.1, 1]} rotation-y={Math.PI / 2} scale={[11, 1.6, 1]} />
      <Lightformer form="rect" intensity={0.75} position={[7.2, 2.7, -0.4]} rotation-y={-Math.PI / 2} scale={[10, 1.4, 1]} />
      <Lightformer form="rect" intensity={0.55} position={[0, 3.2, 8]} scale={[7, 1.8, 1]} />
      <Lightformer form="rect" intensity={0.28} position={[0, 2.6, -8]} rotation-y={Math.PI} scale={[7, 1.6, 1]} />
      <Lightformer form="rect" color="#d8dee6" intensity={0.3} position={[0, -1, 0]} rotation-x={-Math.PI / 2} scale={[24, 24, 1]} />
    </Environment>
  );
}

/** White infinity cove: floor blends into the wall, with turntable rings and one window wash. */
function DaylightStudio({ lite }: { lite: boolean }) {
  const ibl = iblResolution(lite);
  return (
    <>
      <color attach="background" args={[SHOWROOM.sky]} />
      <hemisphereLight args={["#f7fbff", "#d5dbe2", lite ? 1.15 : 0.95]} />
      <StudioKeyLight />
      {lite ? null : (
        <>
          <spotLight
            position={[-5.5, 6.5, 2]}
            angle={0.75}
            penumbra={1}
            intensity={18}
            color="#eef3f8"
          />
          <spotLight
            position={[4, 7, -6]}
            angle={0.55}
            penumbra={1}
            intensity={22}
            color="#ffffff"
          />
        </>
      )}
      <StudioLightformers resolution={ibl} />
      <ShowroomCyclorama lite={lite} />
      <FloorShadow />
    </>
  );
}

export function Studio() {
  const isCompactDevice = useConfigurator((s) => s.isCompactDevice);
  return <DaylightStudio lite={isCompactDevice} />;
}
