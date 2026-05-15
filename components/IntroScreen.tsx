"use client";

import { useEffect, useState, useRef } from "react";

export default function IntroScreen() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"loading" | "done" | "hidden">("loading");
  const [lettersVisible, setLettersVisible] = useState(false);
  const animRef = useRef<number>(0);

  const brandName = "boozt.iq";
  const tagline = "PREMIUM LIFESTYLE · IRAQ";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const letterTimer = setTimeout(() => setLettersVisible(true), 250);

    const duration = 2800;
    let startTime: number | null = null;

    const tick = (now: number) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.floor(eased * 100));

      if (t < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        setProgress(100);
        setTimeout(() => {
          setPhase("done");
          setTimeout(() => setPhase("hidden"), 950);
        }, 600);
      }
    };

    animRef.current = requestAnimationFrame(tick);

    return () => {
      clearTimeout(letterTimer);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={[
        "boozt-intro",
        lettersVisible ? "boozt-intro--letters-visible" : "",
        phase === "done" ? "boozt-intro--exiting" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="boozt-intro__corner boozt-intro__corner-tl" aria-hidden />
      <div className="boozt-intro__corner boozt-intro__corner-tr" aria-hidden />
      <div className="boozt-intro__corner boozt-intro__corner-bl" aria-hidden />
      <div className="boozt-intro__corner boozt-intro__corner-br" aria-hidden />

      <div className="boozt-intro__content">
        <h1
          className={`boozt-intro__brand${lettersVisible ? " boozt-intro__brand--visible" : ""}`}
        >
          {brandName.split("").map((char, i) => (
            <span
              key={i}
              className={`boozt-intro__letter${char === "." ? " boozt-intro__dot" : ""}`}
              style={{ transitionDelay: `${i * 0.07}s` }}
            >
              {char}
            </span>
          ))}
        </h1>
        <p className="boozt-intro__tagline">{tagline}</p>
        <div className="boozt-intro__rule" aria-hidden />
      </div>

      <div className="boozt-intro__bottom">
        <div className="boozt-intro__status">
          {progress < 100 ? (
            <>
              System <span>Loading</span>
            </>
          ) : (
            <>
              Welcome to <span>boozt.iq</span>
            </>
          )}
        </div>
        <div className="boozt-intro__progress-wrap">
          <div className="boozt-intro__progress-num">{progress}%</div>
          <div className="boozt-intro__progress-bar">
            <div
              className="boozt-intro__progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
