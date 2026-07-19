import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';

interface XRayShaderProps {
  videoElement: HTMLVideoElement | null;
  corners: number[][]; // [BL, BR, TL, TR] in [0, 1] space
  mode: 'particle' | 'xray';
  resolution: [number, number];
  visible?: boolean;
}

const VERTEX_SHADER = `
  uniform vec2 uCornerBL;
  uniform vec2 uCornerBR;
  uniform vec2 uCornerTL;
  uniform vec2 uCornerTR;
  varying vec2 vUv;
  varying vec2 vVideoUv;

  void main() {
    vUv = uv;
    
    // Bilinear interpolation
    vec2 pos = mix(
      mix(uCornerBL, uCornerBR, uv.x),
      mix(uCornerTL, uCornerTR, uv.x),
      uv.y
    );
    
    vVideoUv = pos;
    
    // Convert pos from [0, 1] screen space to [-1, 1] clip space
    gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform sampler2D tDiffuse;
  uniform vec2 resolution;
  uniform float time;
  uniform float uMode;
  varying vec2 vUv;
  varying vec2 vVideoUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    // Mirror horizontally to match mirrored background camera element
    vec2 videoUv = vec2(1.0 - vVideoUv.x, vVideoUv.y);
    
    vec4 videoColor = texture2D(tDiffuse, videoUv);
    float brightness = dot(videoColor.rgb, vec3(0.299, 0.587, 0.114));
    
    // MODE 0: Particle Mode
    // 1. Topographic contours
    float contourVal = brightness * 12.0 - time * 2.5;
    float contour = smoothstep(0.85, 1.0, sin(contourVal * 3.14159));
    vec3 contourColor = vec3(0.0, 0.45, 1.0) * contour * 0.7;
    
    // 2. 90x90 Twinkling grid
    vec2 gridCount = vec2(90.0);
    vec2 gridUv = fract(vUv * gridCount);
    vec2 cellId = floor(vUv * gridCount);
    
    float square = step(0.18, gridUv.x) * step(0.18, gridUv.y) * 
                   step(gridUv.x, 0.82) * step(gridUv.y, 0.82);
    
    float cellHash = hash(cellId);
    float twinkle = sin(time * 15.0 + cellHash * 6.283) * 0.5 + 0.5;
    
    float cycle = fract(time * 1.5 + cellHash * 0.5);
    vec3 particleColor;
    if (cycle < 0.33) {
      particleColor = mix(vec3(1.0, 0.0, 1.0), vec3(1.0, 1.0, 0.0), cycle / 0.33);
    } else if (cycle < 0.66) {
      particleColor = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0), (cycle - 0.33) / 0.33);
    } else {
      particleColor = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.0, 1.0), (cycle - 0.66) / 0.34);
    }
    
    float threshold = step(0.12, brightness);
    vec3 gridColor = particleColor * square * twinkle * threshold * 1.5;
    
    // 3. Blue glow
    vec3 blueGlow = vec3(0.0, 0.35, 1.0) * pow(brightness, 1.8) * 0.8;
    vec3 colorMode0 = contourColor + gridColor + blueGlow;
    
    // MODE 1: X-Ray Mode
    // 1. Volume mapping (brighter = denser cyan)
    vec3 volColor = mix(vec3(0.0, 0.02, 0.12), vec3(0.2, 0.7, 1.0), brightness);
    
    // 2. Sobel edge detection
    vec2 texelSize = 1.0 / resolution;
    float s00 = dot(texture2D(tDiffuse, vec2(1.0 - (vVideoUv.x - texelSize.x), vVideoUv.y - texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));
    float s01 = dot(texture2D(tDiffuse, vec2(1.0 - vVideoUv.x, vVideoUv.y - texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));
    float s02 = dot(texture2D(tDiffuse, vec2(1.0 - (vVideoUv.x + texelSize.x), vVideoUv.y - texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));
    
    float s10 = dot(texture2D(tDiffuse, vec2(1.0 - (vVideoUv.x - texelSize.x), vVideoUv.y)).rgb, vec3(0.299, 0.587, 0.114));
    float s12 = dot(texture2D(tDiffuse, vec2(1.0 - (vVideoUv.x + texelSize.x), vVideoUv.y)).rgb, vec3(0.299, 0.587, 0.114));
    
    float s20 = dot(texture2D(tDiffuse, vec2(1.0 - (vVideoUv.x - texelSize.x), vVideoUv.y + texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));
    float s21 = dot(texture2D(tDiffuse, vec2(1.0 - vVideoUv.x, vVideoUv.y + texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));
    float s22 = dot(texture2D(tDiffuse, vec2(1.0 - (vVideoUv.x + texelSize.x), vVideoUv.y + texelSize.y)).rgb, vec3(0.299, 0.587, 0.114));
    
    float sx = s02 + 2.0 * s12 + s22 - (s00 + 2.0 * s10 + s20);
    float sy = s20 + 2.0 * s21 + s22 - (s00 + 2.0 * s01 + s02);
    float edge = sqrt(sx * sx + sy * sy);
    
    vec3 edgeColor = vec3(0.0, 0.95, 1.0) * smoothstep(0.07, 0.25, edge) * 2.0;
    
    // 3. Film grain noise
    float grain = (hash(vUv + time) - 0.5) * 0.1;
    
    // 4. Horizontal scanlines
    float scanline = sin(vUv.y * 320.0 + time * 12.0) * 0.04;
    
    vec3 colorMode1 = volColor + edgeColor + vec3(grain) + vec3(scanline);
    
    // Blend final color
    vec3 finalColor = mix(colorMode0, colorMode1, uMode);
    
    gl_FragColor = vec4(finalColor, 0.95);
  }
`;

function ShaderMesh({ videoElement, corners, mode, resolution }: XRayShaderProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Create VideoTexture
  const videoTexture = useMemo(() => {
    if (!videoElement) return null;
    const tex = new THREE.VideoTexture(videoElement);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.format = THREE.RGBAFormat;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [videoElement]);

  // Set up initial uniforms
  const uniforms = useMemo(() => {
    return {
      tDiffuse: { value: null as THREE.VideoTexture | null },
      resolution: { value: new THREE.Vector2(resolution[0], resolution[1]) },
      time: { value: 0 },
      uMode: { value: mode === 'xray' ? 1.0 : 0.0 },
      uCornerBL: { value: new THREE.Vector2(corners[0][0], corners[0][1]) },
      uCornerBR: { value: new THREE.Vector2(corners[1][0], corners[1][1]) },
      uCornerTL: { value: new THREE.Vector2(corners[2][0], corners[2][1]) },
      uCornerTR: { value: new THREE.Vector2(corners[3][0], corners[3][1]) },
    };
  }, []);

  // Update static textures/resolution uniforms when props change
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.tDiffuse.value = videoTexture;
      materialRef.current.uniforms.resolution.value.set(resolution[0], resolution[1]);
    }
  }, [videoTexture, resolution]);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = clock.getElapsedTime();

      // Smoothly blend uMode between 0.0 (particle) and 1.0 (xray)
      const targetMode = mode === 'xray' ? 1.0 : 0.0;
      materialRef.current.uniforms.uMode.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uMode.value,
        targetMode,
        0.15
      );

      // Smoothly interpolate positions of corners to prevent jittering
      const lerpFactor = 0.45; // slightly smoothed
      const uBL = materialRef.current.uniforms.uCornerBL.value;
      const uBR = materialRef.current.uniforms.uCornerBR.value;
      const uTL = materialRef.current.uniforms.uCornerTL.value;
      const uTR = materialRef.current.uniforms.uCornerTR.value;

      uBL.set(THREE.MathUtils.lerp(uBL.x, corners[0][0], lerpFactor), THREE.MathUtils.lerp(uBL.y, corners[0][1], lerpFactor));
      uBR.set(THREE.MathUtils.lerp(uBR.x, corners[1][0], lerpFactor), THREE.MathUtils.lerp(uBR.y, corners[1][1], lerpFactor));
      uTL.set(THREE.MathUtils.lerp(uTL.x, corners[2][0], lerpFactor), THREE.MathUtils.lerp(uTL.y, corners[2][1], lerpFactor));
      uTR.set(THREE.MathUtils.lerp(uTR.x, corners[3][0], lerpFactor), THREE.MathUtils.lerp(uTR.y, corners[3][1], lerpFactor));
    }
  });

  return (
    <mesh>
      <planeGeometry args={[1, 1, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

export default function XRayShader({ videoElement, corners, mode, resolution, visible = true }: XRayShaderProps) {
  if (!videoElement) return null;

  return (
    <div className={`absolute inset-0 w-full h-full pointer-events-none z-10 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      <Canvas
        camera={{ position: [0, 0, 1] }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <ShaderMesh
          videoElement={videoElement}
          corners={corners}
          mode={mode}
          resolution={resolution}
        />
      </Canvas>
    </div>
  );
}
