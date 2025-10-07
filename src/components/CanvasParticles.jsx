import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function CanvasParticles() {
  const ref = useRef(null);

  useEffect(() => {
    const container = ref.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    camera.position.set(0, 0, 6);

    // Renderer (no alpha banding on gradients)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(dpr);
    container.appendChild(renderer.domElement);

    // Particles
    const COUNT = 2500;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const vel = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      pos[i3 + 0] = (Math.random() - 0.5) * 12;
      pos[i3 + 1] = (Math.random() - 0.5) * 8;
      pos[i3 + 2] = (Math.random() - 0.5) * 6;

      // small drift
      vel[i3 + 0] = (Math.random() - 0.5) * 0.002;
      vel[i3 + 1] = (Math.random() - 0.5) * 0.0025;
      vel[i3 + 2] = (Math.random() - 0.5) * 0.002;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.03,
      color: 0xdec0a3, // warm champagne
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    // BG gradient (optional)
    const bg = document.createElement("div");
    bg.className = "canvas-bg";
    container.appendChild(bg);

    // Resize
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    // Animate
    let raf = 0;
    const tick = () => {
      const arr = geo.attributes.position.array;
      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        arr[i3 + 0] += vel[i3 + 0];
        arr[i3 + 1] += vel[i3 + 1];
        arr[i3 + 2] += vel[i3 + 2];

        // soft bounds
        if (arr[i3 + 0] > 6 || arr[i3 + 0] < -6) vel[i3 + 0] *= -1;
        if (arr[i3 + 1] > 4 || arr[i3 + 1] < -4) vel[i3 + 1] *= -1;
        if (arr[i3 + 2] > 3 || arr[i3 + 2] < -3) vel[i3 + 2] *= -1;
      }
      geo.attributes.position.needsUpdate = true;

      points.rotation.y += 0.0009; // subtle drift
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      container.innerHTML = ""; // remove canvas + bg
    };
  }, []);

  return <div ref={ref} className="canvas-wrap" aria-hidden="true" />;
}
