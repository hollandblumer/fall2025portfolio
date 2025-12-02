// src/components/text/MeltyBrooklyn.jsx
import React, { useEffect, useRef } from "react";

export default function MeltyBrooklyn({ className }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const chars = root.querySelectorAll(".rotated-char");
    if (!chars.length) return;

    const letters = Array.from(chars).map((el) => ({
      el,
      base: Math.random() * 2 - 1, // -1deg to +1deg
      t: Math.random() * 1000,
    }));

    let frameId;

    function animate() {
      letters.forEach((letter) => {
        letter.t += 0.02;
        const wobble = Math.sin(letter.t) * 3; // +/- 3deg
        letter.el.style.transform = `rotate(${letter.base + wobble}deg)`;
      });

      frameId = requestAnimationFrame(animate);
    }

    animate();

    return () => cancelAnimationFrame(frameId);
  }, []);

  function renderMeltyWord(word, keyPrefix) {
    return (
      <span className="no-break-word melty-word" key={keyPrefix}>
        {word.split("").map((char, idx) => (
          <span
            key={`${keyPrefix}-c-${idx}`}
            className="rotated-char"
            // initial random tilt (wobble will take over)
            style={{
              transform: `rotate(${(6 * Math.random() - 3).toFixed(2)}deg)`,
            }}
          >
            {char}
          </span>
        ))}{" "}
      </span>
    );
  }

  return (
    <span ref={rootRef} className={className || ""}>
      {renderMeltyWord("BROOKLYN", "brooklyn")}
      {renderMeltyWord("NY", "ny")}
    </span>
  );
}
