// src/components/about/About.jsx
import React, { useEffect, useRef, useState } from "react";
import p5 from "p5";

const COLOR = "#FABC2E";
const SPECK_COUNT_BASE = 30000; // ~30k at 1920×1080, scaled with area
const ALPHA = 85; // 0–255 (same as your p5 snippet)
const NOISE_SCALE = 0.01;
const SIZE_FACTOR = 0.002;

export default function About() {
  const hostRef = useRef(null);
  const p5Ref = useRef(null);

  // replayable on scroll: add class on enter, remove on exit
  const [playNow, setPlayNow] = useState(false);
  const DROP_DELAY_MS = 500;

  // Accept manual trigger from Hero (about:drop). We “prime” the next entry.
  const armedRef = useRef(false);
  useEffect(() => {
    const onDrop = () => {
      armedRef.current = true;
    };
    window.addEventListener("about:drop", onDrop);
    return () => window.removeEventListener("about:drop", onDrop);
  }, []);

  // IntersectionObserver: play on enter, reset on exit (so it replays next time)
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    let timer = null;
    const io = new IntersectionObserver(
      ([entry]) => {
        const vis = entry.isIntersecting && entry.intersectionRatio > 0.2;
        if (vis) {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => {
            setPlayNow(false); // force reflow (in case class was already true)
            requestAnimationFrame(() => setPlayNow(true));
          }, DROP_DELAY_MS);
          armedRef.current = false; // consume armed signal (one shot)
        } else {
          if (timer) clearTimeout(timer);
          setPlayNow(false);
        }
      },
      { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] }
    );

    io.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      io.disconnect();
    };
  }, []);

  /* ---------- p5 speckled background: EXACT same feel as your snippet ---------- */
  useEffect(() => {
    if (!hostRef.current || p5Ref.current) return;

    const sketch = (p) => {
      let pg,
        w = 0,
        h = 0;

      const computeCount = () => {
        const baseArea = 1920 * 1080; // scale ~30k at 1080p
        return Math.max(
          2000,
          Math.round(((w * h) / baseArea) * SPECK_COUNT_BASE)
        );
      };

      const styleCanvas = (cnv) => {
        cnv.style("position", "absolute");
        cnv.style("inset", "0");
        cnv.style("display", "block");
        cnv.style("zIndex", "0");
        cnv.style("pointerEvents", "none");
      };

      function makeSpeckLayer() {
        if (pg) pg.remove();
        pg = p.createGraphics(w, h);
        pg.noStroke();
        const COUNT = computeCount();
        for (let i = 0; i < COUNT; i++) {
          const x = p.random(w);
          const y = p.random(h);
          const n = p.noise(x * NOISE_SCALE, y * NOISE_SCALE) * w * SIZE_FACTOR;
          pg.fill(255, ALPHA);
          pg.ellipse(x, y, n, n);
        }
      }

      const resizeToHost = () => {
        const rect = hostRef.current.getBoundingClientRect();
        const newW = Math.max(1, Math.floor(rect.width));
        const newH = Math.max(1, Math.floor(rect.height));
        if (newW === w && newH === h) return;
        w = newW;
        h = newH;
        p.resizeCanvas(w, h, true);
        makeSpeckLayer();
      };

      p.setup = () => {
        const r = hostRef.current.getBoundingClientRect();
        w = Math.max(1, Math.floor(r.width));
        h = Math.max(1, Math.floor(r.height));
        const cnv = p.createCanvas(w, h);
        hostRef.current.appendChild(cnv.elt);
        styleCanvas(cnv);
        makeSpeckLayer();
        const ro = new ResizeObserver(resizeToHost);
        ro.observe(hostRef.current);
        cnv.elt._ro = ro;
        p.frameRate(30);
      };

      p.draw = () => {
        p.background(COLOR);
        if (pg) p.image(pg, 0, 0);
      };

      p.remove = () => {
        try {
          pg && pg.remove();
        } catch {}
      };
    };

    p5Ref.current = new p5(sketch);
    return () => {
      try {
        const cnv = hostRef.current?.querySelector("canvas");
        if (cnv && cnv._ro) cnv._ro.disconnect();
      } catch {}
      try {
        p5Ref.current?.remove();
      } catch {}
      p5Ref.current = null;
    };
  }, []);

  return (
    <section ref={hostRef} className="about-section">
      {/* Replayable: class toggled on each entry */}
      <h2 className={`about-label ${playNow ? "play" : ""}`}>ABOUT</h2>

      <div className={`about-copy ${playNow ? "play" : ""}`}>
        <p>
          I design and build digital worlds—websites, interactive art, and
          computational tools— guided by texture, color, and the tactile feeling
          of a space. I treat the screen like a room you can step into: not just
          something to look at, but something to <em>feel</em>.
        </p>
        <p>
          My work lives where intuition meets precision. Sometimes that means
          shaping a brand’s visual language through motion and atmosphere;
          sometimes it means crafting tools that help others create more freely.
          Always, it’s about making digital spaces warmer, more personal, more
          alive.
        </p>
        <p>
          I believe in curiosity, craft, and building experiences that invite
          people to linger. If you're exploring an immersive brand moment, a
          refined website with attitude, or an art-driven interactive
          piece—let’s make something meaningful together.
        </p>
      </div>
    </section>
  );
}
