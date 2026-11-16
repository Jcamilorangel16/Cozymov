"use client";

// Cursor personalizado: punto inmediato y anillo con retraso suave.
import { useEffect, useRef } from "react";
import "./CustomCursor.css";

/** Factor de interpolación del anillo (0-1). Menor = más retraso. */
const RING_LERP = 0.15;

const CLICKABLE =
  'a, button, [role="button"], input[type="button"], input[type="submit"], ' +
  'input[type="checkbox"], input[type="radio"], select, summary, label[for], ' +
  '[onclick], [tabindex]:not([tabindex="-1"])';

/**
 * Renderiza el cursor personalizado. Solo se activa con mouse.
 * @returns Elementos visuales del cursor.
 */
export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return undefined;
    }

    const dot = dotRef.current;
    const ring = ringRef.current;
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let started = false;
    let frame = 0;

    const onMove = (event) => {
      target.x = event.clientX;
      target.y = event.clientY;
      dot.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
      if (!started) {
        started = true;
        current.x = target.x;
        current.y = target.y;
        dot.classList.add("custom-cursor-visible");
        ring.classList.add("custom-cursor-visible");
      }
    };

    const onOver = (event) => {
      const clickable =
        event.target instanceof Element && event.target.closest(CLICKABLE);
      ring.classList.toggle("custom-cursor-hover", Boolean(clickable));
    };

    const onLeave = () => {
      dot.classList.remove("custom-cursor-visible");
      ring.classList.remove("custom-cursor-visible");
      started = false;
    };

    const tick = () => {
      current.x += (target.x - current.x) * RING_LERP;
      current.y += (target.y - current.y) * RING_LERP;
      ring.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    document.documentElement.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <>
      <div ref={ringRef} className="custom-cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="custom-cursor-dot" aria-hidden="true" />
    </>
  );
}
