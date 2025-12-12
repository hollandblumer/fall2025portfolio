import React, { useId } from "react";

export default function LoadingBlobs({ show = true }) {
  const rid = useId().replace(/:/g, ""); // React ids can contain ":"; strip for safer url(#id)

  if (!show) return null;

  return (
    <div className="preload" role="status" aria-label="Loading">
      <svg className="goo" viewBox="0 0 300 140" aria-hidden="true">
        <defs>
          {/* Gooey merge */}
          <filter id={`cellMorph-${rid}`}>
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 19 -9
              "
              result="morph"
            />
            <feComposite in="SourceGraphic" in2="morph" operator="atop" />
          </filter>

          {/* Constant organic edge motion */}
          <filter
            id={`blobNoise-${rid}`}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015"
              numOctaves="1"
              seed="8"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                dur="3.5s"
                values="0.012;0.02;0.012"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="18"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          <linearGradient id={`blobGrad-${rid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f7eaac" />
            <stop offset="100%" stopColor="#f7eaac" />
          </linearGradient>
        </defs>

        {/* Rotation wrapper */}
        <g className="cell" filter={`url(#cellMorph-${rid})`}>
          {/* Fix bbox so rotation pivots at true center */}
          <rect
            x="0"
            y="0"
            width="300"
            height="140"
            fill="transparent"
            opacity="0"
          />

          <g transform="translate(150 70)">
            <g className="blob blob-a">
              <circle
                cx="0"
                cy="0"
                r="50"
                fill={`url(#blobGrad-${rid})`}
                filter={`url(#blobNoise-${rid})`}
              />
            </g>

            <g className="blob blob-b">
              <circle
                cx="0"
                cy="0"
                r="50"
                fill={`url(#blobGrad-${rid})`}
                filter={`url(#blobNoise-${rid})`}
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
