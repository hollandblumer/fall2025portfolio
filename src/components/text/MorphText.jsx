// src/components/text/MorphText.jsx
import { useEffect, useRef, useId, useMemo } from "react";

export default function MorphText({ texts = [], className = "" }) {
  const text1Ref = useRef(null);
  const text2Ref = useRef(null);
  const filterId = useId();

  // Longest string defines the inline width so siblings don't overlap
  const longest = useMemo(() => {
    if (!texts || !texts.length) return "";
    return texts.reduce((a, b) => (b.length > a.length ? b : a));
  }, [texts]);

  useEffect(() => {
    if (!texts || texts.length < 2) return;

    const el1 = text1Ref.current;
    const el2 = text2Ref.current;
    if (!el1 || !el2) return;

    const morphTime = 1;
    const cooldownTime = 0.25;

    let textIndex = texts.length - 1;
    let time = new Date();
    let morph = 0;
    let cooldown = cooldownTime;
    let frameId;

    function initTexts() {
      el1.textContent = texts[textIndex % texts.length];
      el2.textContent = texts[(textIndex + 1) % texts.length];
    }

    initTexts();

    function setMorph(fraction) {
      el2.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
      el2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

      fraction = 1 - fraction;

      el1.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
      el1.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;

      el1.textContent = texts[textIndex % texts.length];
      el2.textContent = texts[(textIndex + 1) % texts.length];
    }

    function doMorph() {
      morph -= cooldown;
      cooldown = 0;

      let fraction = morph / morphTime;
      if (fraction > 1) {
        cooldown = cooldownTime;
        fraction = 1;
      }
      setMorph(fraction);
    }

    function doCooldown() {
      morph = 0;
      el2.style.filter = "";
      el2.style.opacity = "100%";
      el1.style.filter = "";
      el1.style.opacity = "0%";
    }

    function animate() {
      frameId = requestAnimationFrame(animate);

      const newTime = new Date();
      const dt = (newTime - time) / 1000;
      time = newTime;

      const shouldIncrementIndex = cooldown > 0;
      cooldown -= dt;

      if (cooldown <= 0) {
        if (shouldIncrementIndex) textIndex++;
        doMorph();
      } else {
        doCooldown();
      }
    }

    animate();

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [texts]);

  return (
    <>
      {/* Scoped filter for this instance */}
      <svg width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <filter id={filterId}>
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 255 -140
              "
            />
          </filter>
        </defs>
      </svg>

      <span
        className={`morph-text ${className}`}
        style={{ filter: `url(#${filterId}) blur(0.6px)` }}
      >
        {/* Invisible sizer defines the width */}
        <span className="morph-sizer">{longest}</span>

        {/* Two overlapping layers */}
        <span ref={text1Ref} className="morph-layer morph-layer-1" />
        <span ref={text2Ref} className="morph-layer morph-layer-2" />
      </span>
    </>
  );
}
