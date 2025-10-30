// ThreeCanvas.jsx
import * as THREE from "three";
import React, { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Trail, Text } from "@react-three/drei";

// Full-screen styles: make SURE the canvas has space to render
const fullScreenStyle = {
  position: "fixed",
  inset: 0,
};

function Background() {
  const { viewport } = useThree();
  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#9aa7b1") },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision mediump float;
        const float speed = .5;
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;

        vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
        float snoise(vec3 v){
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          i = mod289(i);
          vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4( x.xy, y.xy );
          vec4 b1 = vec4( x.zw, y.zw );
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
        }

        void main(){
          float a = length(vec2(abs(15. * fract(pow(vUv.x , 2.) * 10000. + uTime * speed)), .0));
          a += length(vec2(abs(15. * fract(pow(vUv.y, 2.) * 10000. + uTime * speed)), .0));
          a -= pow(a - snoise(vec3(vUv * a, uTime)), 4.) * abs(sin(uTime * 2.)) * 4e-5;
          // OPAQUE for visibility:
          gl_FragColor = vec4(uColor, 1.0);
          // If you prefer translucency later, change the alpha from 1.0 back to min(1. - a, 1.)
        }
      `,
      transparent: false, // opaque so you definitely see it
      toneMapped: false,
    });
  }, []);

  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.getElapsedTime();
  });

  return (
    <mesh renderOrder={-1}>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <primitive attach="material" object={mat} />
    </mesh>
  );
}

function Marquee({ text = " Loading Loading", speed = -50 }) {
  const { viewport } = useThree();
  const widthRef = useRef(0);

  const mat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uX: { value: 0 },
        uWidth: { value: 0 },
        uColor: { value: new THREE.Color("#066bbd") },
      },
      vertexShader: /* glsl */ `
        uniform float uX;
        uniform float uWidth;
        varying vec3 vPos;
        void main() {
          vec3 pos = position;
          pos.x += mod(uX, uWidth);
          if (pos.x >= uWidth * .5) pos.x -= uWidth * 2.;
          vPos = pos;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uWidth;
        uniform vec3 uColor;
        varying vec3 vPos;
        void main() {
          float a1 = smoothstep(1., .9, (vPos.x + uWidth * .5) / uWidth);
          float a2 = smoothstep(.0, .1, (vPos.x + uWidth * .5) / uWidth);
          float a = a1 * a2;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      toneMapped: false,
    });
  }, []);

  const u = speed * viewport.width * 0.0006;
  useFrame((state) => {
    mat.uniforms.uX.value = u * state.clock.getElapsedTime();
    mat.uniforms.uWidth.value = 0.5 * (widthRef.current || 0);
  });

  return (
    <>
      <Text
        // remove font prop for now to avoid missing-file issues
        fontSize={Math.max(Math.round(0.008 * viewport.width), 12)}
        anchorX="center"
        anchorY="middle"
        onSync={(t) => {
          if (!t.geometry.boundingBox) t.geometry.computeBoundingBox();
          const bb = t.geometry.boundingBox;
          if (bb) widthRef.current = Math.abs(bb.min.x - bb.max.x);
        }}
      >
        {text}
        <meshBasicMaterial visible={false} />
      </Text>
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[viewport.width, 0.25]} />
        <primitive attach="material" object={mat} />
      </mesh>
    </>
  );
}

function CursorTrail() {
  const mesh = useRef(null);
  const { size } = useThree();
  useFrame(({ pointer }) => {
    if (!mesh.current) return;
    mesh.current.position.x = pointer.x * size.width * 0.5;
    mesh.current.position.y = pointer.y * size.height * 0.5;
  });
  return (
    <Trail color="#066bbd" interval={12} attenuation={(n) => 0.15 * n}>
      <mesh ref={mesh} />
    </Trail>
  );
}

export default function ThreeCanvas() {
  return (
    <Canvas
      style={fullScreenStyle}
      dpr={[1, 2]}
      orthographic
      camera={{ position: [0, 0, 10], zoom: 100 }}
      onCreated={({ gl, scene }) => {
        // fallback solid bg so you always see the canvas
        gl.setClearColor("#0a0a0a", 1);
      }}
    >
      <Background />
      <CursorTrail />
      <Marquee text=" Loading Loading" />
    </Canvas>
  );
}
