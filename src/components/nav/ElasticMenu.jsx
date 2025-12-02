import React from "react";

export default function ElasticMenu({
  className,
  style,
  isOpen = false,
  onClick,
}) {
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
            d="M 30,35 Q 50,35 70,35"
            stroke="#A5A5A5"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          >
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
          </path>
        </g>

        {/* MIDDLE LINE */}
        <g
          className={
            "elastic-line elastic-line-middle" + (isOpen ? " is-open" : "")
          }
        >
          <path
            d="M 30,50 Q 50,50 70,50"
            stroke="#A5A5A5"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          >
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
          </path>
        </g>

        {/* BOTTOM LINE */}
        <g
          className={
            "elastic-line elastic-line-bottom" + (isOpen ? " is-open" : "")
          }
        >
          <path
            d="M 30,65 Q 50,65 70,65"
            stroke="#A5A5A5"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          >
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
          </path>
        </g>
      </svg>
    </button>
  );
}
