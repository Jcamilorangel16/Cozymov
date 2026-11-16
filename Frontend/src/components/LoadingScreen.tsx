"use client";

import { useEffect, useState } from "react";
import styles from "./LoadingScreen.module.css";

const DISPLAY_AFTER_LOAD_MS = 5000;

export default function LoadingScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let hideTimeout: ReturnType<typeof setTimeout> | undefined;

    const hideAfterDelay = () => {
      hideTimeout = setTimeout(() => setIsVisible(false), DISPLAY_AFTER_LOAD_MS);
    };

    if (document.readyState === "complete") {
      hideAfterDelay();
    } else {
      window.addEventListener("load", hideAfterDelay, { once: true });
    }

    return () => {
      window.removeEventListener("load", hideAfterDelay);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className={styles.screen} role="status" aria-label="Cargando Cozymov">
      <svg
        className={styles.logo}
        viewBox="0 0 540 170"
        role="img"
        aria-label="CozyMov"
      >
        <text className={styles.caption} x="30" y="40">
          MOVILIDAD
        </text>

        <g className={styles.letters} transform="translate(30 52)">
          <g className={`${styles.letter} ${styles.letter0}`}>
            <path
              className={`${styles.path} ${styles.letterPath}`}
              pathLength="1"
              d="M47 23 A24 24 0 1 0 47 57"
            />
            <path
              className={`${styles.path} ${styles.letterOutline}`}
              pathLength="1"
              d="M47 23 A24 24 0 1 0 47 57"
            />
          </g>
          <g
            className={`${styles.letter} ${styles.letter1}`}
            transform="translate(70 0)"
          >
            <path
              className={`${styles.path} ${styles.letterPath}`}
              pathLength="1"
              d="M30 16 A24 24 0 1 0 30 64 A24 24 0 1 0 30 16"
            />
            <path
              className={`${styles.path} ${styles.letterOutline}`}
              pathLength="1"
              d="M30 16 A24 24 0 1 0 30 64 A24 24 0 1 0 30 16"
            />
            <path
              className={`${styles.path} ${styles.spoke}`}
              pathLength="1"
              d="M30 40 H14 M30 40 H46 M30 40 V56"
            />
            <path
              className={`${styles.path} ${styles.spokeOutline}`}
              pathLength="1"
              d="M30 40 H14 M30 40 H46 M30 40 V56"
            />
            <g className={styles.hub}>
              <circle cx="30" cy="40" r="8" className={styles.hubFill} />
              <circle cx="30" cy="40" r="4" className={styles.hubOutline} />
            </g>
          </g>
          <g
            className={`${styles.letter} ${styles.letter2}`}
            transform="translate(140 0)"
          >
            <path
              className={`${styles.path} ${styles.letterPath}`}
              pathLength="1"
              d="M8 18 H52 L8 62 H52"
            />
            <path
              className={`${styles.path} ${styles.letterOutline}`}
              pathLength="1"
              d="M8 18 H52 L8 62 H52"
            />
          </g>
          <g
            className={`${styles.letter} ${styles.letter3}`}
            transform="translate(210 0)"
          >
            <path
              className={`${styles.path} ${styles.letterPath}`}
              pathLength="1"
              d="M6 16 L30 42 L54 16 M30 42 V64"
            />
            <path
              className={`${styles.path} ${styles.letterOutline}`}
              pathLength="1"
              d="M6 16 L30 42 L54 16 M30 42 V64"
            />
          </g>
          <g
            className={`${styles.letter} ${styles.letter4}`}
            transform="translate(280 0)"
          >
            <path
              className={`${styles.path} ${styles.letterPath}`}
              pathLength="1"
              d="M8 64 V16 L30 44 L52 16 V64"
            />
            <path
              className={`${styles.path} ${styles.letterOutline}`}
              pathLength="1"
              d="M8 64 V16 L30 44 L52 16 V64"
            />
          </g>
          <g
            className={`${styles.letter} ${styles.letter5}`}
            transform="translate(350 0)"
          >
            <path
              className={`${styles.path} ${styles.letterPath}`}
              pathLength="1"
              d="M30 16 A24 24 0 1 0 30 64 A24 24 0 1 0 30 16"
            />
            <path
              className={`${styles.path} ${styles.letterOutline}`}
              pathLength="1"
              d="M30 16 A24 24 0 1 0 30 64 A24 24 0 1 0 30 16"
            />
            <path
              className={`${styles.path} ${styles.tireSpokes}`}
              pathLength="1"
              d="M30 40 L30 23 M30 40 L42 28 M30 40 L47 40 M30 40 L42 52 M30 40 L30 57 M30 40 L18 52 M30 40 L13 40 M30 40 L18 28"
            />
            <circle cx="30" cy="40" r="5" className={styles.tireHub} />
          </g>
          <g
            className={`${styles.letter} ${styles.letter6}`}
            transform="translate(420 0)"
          >
            <path
              className={`${styles.path} ${styles.letterPath}`}
              pathLength="1"
              d="M6 16 L30 64 L54 16"
            />
            <path
              className={`${styles.path} ${styles.letterOutline}`}
              pathLength="1"
              d="M6 16 L30 64 L54 16"
            />
          </g>
        </g>

        <text className={styles.caption} x="510" y="150" textAnchor="end">
          UNIVERSITARIA
        </text>
      </svg>
    </div>
  );
}
