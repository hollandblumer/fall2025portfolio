import React, { useEffect, useRef } from "react";

const isSafari =
  typeof navigator !== "undefined" &&
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

export default function ElasticMenu({
  className,
  style,
  isOpen = false,
  onClick,
}) {
  const topRef = useRef(null);
  const middleRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!isSafari) return; // let SMIL handle non-Safari

    const topFrames = [
      "M 30,35 Q 50,35 70,35",
      "M 30,35 Q 50,45 70,35",
      "M 30,35 Q 50,30 70,35",
      "M 30,35 Q 50,40 70,35",
      "M 30,35 Q 50,33 70,35",
      "M 30,35 Q 50,37 70,35",
      "M 30,35 Q 50,34 70,35",
      "M 30,35 Q 50,36 70,35",
      "M 30,35 Q 50,35 70,35",
      "M 30,35 Q 60,35 70,35",
      "M 30,35 Q 40,35 70,35",
      "M 30,35 Q 60,35 70,35",
      "M 30,35 Q 40,35 70,35",
      "M 30,35 Q 60,35 70,35",
      "M 30,35 Q 40,35 70,35",
      "M 30,35 Q 60,35 70,35",
      "M 30,35 Q 40,35 70,35",
    ];

    const middleFrames = [
      "M 30,50 Q 50,50 70,50",
      "M 30,50 Q 50,60 70,50",
      "M 30,50 Q 50,45 70,50",
      "M 30,50 Q 50,55 70,50",
      "M 30,50 Q 50,48 70,50",
      "M 30,50 Q 50,52 70,50",
      "M 30,50 Q 50,49 70,50",
      "M 30,50 Q 50,51 70,50",
      "M 30,50 Q 50,50 70,50",
      "M 30,50 Q 60,50 70,50",
      "M 30,50 Q 40,50 70,50",
      "M 30,50 Q 60,50 70,50",
      "M 30,50 Q 40,50 70,50",
      "M 30,50 Q 60,50 70,50",
      "M 30,50 Q 40,50 70,50",
      "M 30,50 Q 60,50 70,50",
      "M 30,50 Q 40,50 70,50",
    ];

    const bottomFrames = [
      "M 30,65 Q 50,65 70,65",
      "M 30,65 Q 50,75 70,65",
      "M 30,65 Q 50,60 70,65",
      "M 30,65 Q 50,70 70,65",
      "M 30,65 Q 50,63 70,65",
      "M 30,65 Q 50,67 70,65",
      "M 30,65 Q 50,64 70,65",
      "M 30,65 Q 50,66 70,65",
      "M 30,65 Q 50,65 70,65",
      "M 30,65 Q 60,65 70,65",
      "M 30,65 Q 40,65 70,65",
      "M 30,65 Q 60,65 70,65",
      "M 30,65 Q 40,65 70,65",
      "M 30,65 Q 60,65 70,65",
      "M 30,65 Q 40,65 70,65",
      "M 30,65 Q 60,65 70,65",
      "M 30,65 Q 40,65 70,65",
    ];

    const totalDuration = 1500; // ms
    const frameCount = topFrames.length;
    const frameDuration = totalDuration / frameCount;

    let frame = 0;
    const intervalId = setInterval(() => {
      const top = topRef.current;
      const middle = middleRef.current;
      const bottom = bottomRef.current;
      if (!top || !middle || !bottom) return;

      // base frame
      top.setAttribute("d", topFrames[frame]);

      // stagger middle + bottom similar to begin="1.1s"/"1.2s"
      const middleIndex = (frame + 1) % frameCount;
      const bottomIndex = (frame + 2) % frameCount;

      middle.setAttribute("d", middleFrames[middleIndex]);
      bottom.setAttribute("d", bottomFrames[bottomIndex]);

      frame = (frame + 1) % frameCount;
    }, frameDuration);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        className ? `elastic-menu-button ${className}` : "elastic-menu-button"
      }
      style={style}
      aria-label={isOpen ? "Close menu" : "Open menu"}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        {/* TOP LINE */}
        <g
          className={
            "elastic-line elastic-line-top" + (isOpen ? " is-open" : "")
          }
        >
          <path
            ref={topRef}
            d="M 30,35 Q 50,35 70,35"
            stroke="#A5A5A5"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          >
            {!isSafari && (
              <animate
                attributeName="d"
                dur="1.5s"
                begin="1s"
                repeatCount="indefinite"
                values={`
                  M 30,35 Q 50,35 70,35;
                  M 30,35 Q 50,45 70,35;
                  M 30,35 Q 50,30 70,35;
                  M 30,35 Q 50,40 70,35;
                  M 30,35 Q 50,33 70,35;
                  M 30,35 Q 50,37 70,35;
                  M 30,35 Q 50,34 70,35;
                  M 30,35 Q 50,36 70,35;
                  M 30,35 Q 50,35 70,35;
                  M 30,35 Q 60,35 70,35;
                  M 30,35 Q 40,35 70,35;
                  M 30,35 Q 60,35 70,35;
                  M 30,35 Q 40,35 70,35;
                  M 30,35 Q 60,35 70,35;
                  M 30,35 Q 40,35 70,35;
                  M 30,35 Q 60,35 70,35;
                  M 30,35 Q 40,35 70,35;
                `}
                fill="freeze"
              />
            )}
          </path>
        </g>

        {/* MIDDLE LINE */}
        <g
          className={
            "elastic-line elastic-line-middle" + (isOpen ? " is-open" : "")
          }
        >
          <path
            ref={middleRef}
            d="M 30,50 Q 50,50 70,50"
            stroke="#A5A5A5"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          >
            {!isSafari && (
              <animate
                attributeName="d"
                dur="1.5s"
                begin="1.1s"
                repeatCount="indefinite"
                values={`
                  M 30,50 Q 50,50 70,50;
                  M 30,50 Q 50,60 70,50;
                  M 30,50 Q 50,45 70,50;
                  M 30,50 Q 50,55 70,50;
                  M 30,50 Q 50,48 70,50;
                  M 30,50 Q 50,52 70,50;
                  M 30,50 Q 50,49 70,50;
                  M 30,50 Q 50,51 70,50;
                  M 30,50 Q 50,50 70,50;
                  M 30,50 Q 60,50 70,50;
                  M 30,50 Q 40,50 70,50;
                  M 30,50 Q 60,50 70,50;
                  M 30,50 Q 40,50 70,50;
                  M 30,50 Q 60,50 70,50;
                  M 30,50 Q 40,50 70,50;
                  M 30,50 Q 60,50 70,50;
                  M 30,50 Q 40,50 70,50;
                `}
                fill="freeze"
              />
            )}
          </path>
        </g>

        {/* BOTTOM LINE */}
        <g
          className={
            "elastic-line elastic-line-bottom" + (isOpen ? " is-open" : "")
          }
        >
          <path
            ref={bottomRef}
            d="M 30,65 Q 50,65 70,65"
            stroke="#A5A5A5"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          >
            {!isSafari && (
              <animate
                attributeName="d"
                dur="1.5s"
                begin="1.2s"
                repeatCount="indefinite"
                values={`
                  M 30,65 Q 50,65 70,65;
                  M 30,65 Q 50,75 70,65;
                  M 30,65 Q 50,60 70,65;
                  M 30,65 Q 50,70 70,65;
                  M 30,65 Q 50,63 70,65;
                  M 30,65 Q 50,67 70,65;
                  M 30,65 Q 50,64 70,65;
                  M 30,65 Q 50,66 70,65;
                  M 30,65 Q 50,65 70,65;
                  M 30,65 Q 60,65 70,65;
                  M 30,65 Q 40,65 70,65;
                  M 30,65 Q 60,65 70,65;
                  M 30,65 Q 40,65 70,65;
                  M 30,65 Q 60,65 70,65;
                  M 30,65 Q 40,65 70,65;
                  M 30,65 Q 60,65 70,65;
                  M 30,65 Q 40,65 70,65;
                `}
                fill="freeze"
              />
            )}
          </path>
        </g>
      </svg>
    </button>
  );
}
