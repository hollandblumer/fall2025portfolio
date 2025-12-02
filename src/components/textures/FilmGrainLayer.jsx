// src/components/FilmGrainLayer.jsx
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export default function FilmGrainLayer() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Transparent renderer so it just overlays grain
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
    });
    renderer.setClearColor(0x000000, 0);

    // Simple ortho camera + empty scene (just flat background for film pass)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x808080); // mid-grey for the grain texture
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    // FilmPass(intensity, scanlineIntensity, scanlineCount, grayscale)
    const filmPass = new FilmPass(0.26, 0.24, 648, false);
    composer.addPass(filmPass);
    composer.addPass(new OutputPass());

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      renderer.setPixelRatio(dpr);
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      composer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    let frameId;
    const loop = () => {
      composer.render();
      frameId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      composer.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      id="filmLayer"
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0, // 👈 behind your content
        pointerEvents: "none",
        mixBlendMode: "soft-light",
        opacity: 1, // tweak strength here
      }}
    />
  );
}
