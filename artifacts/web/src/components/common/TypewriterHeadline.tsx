import { useState, useEffect } from 'react';

const HEADLINES = [
  { prefix: 'Resolve incidents', highlight: 'before they become outages.' },
  { prefix: 'Detect anomalies', highlight: 'before they become incidents.' },
  { prefix: 'Find root causes', highlight: 'before engineers start guessing.' },
  { prefix: 'Know what broke', highlight: 'before your users do.' },
  { prefix: 'Turn telemetry', highlight: 'into actionable intelligence.' },
  { prefix: 'From anomaly detection', highlight: 'to root-cause analysis.' },
];

export function TypewriterHeadline() {
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const currentHeadline = HEADLINES[headlineIndex];
    const fullText = `${currentHeadline.prefix} ${currentHeadline.highlight}`;

    let timer: NodeJS.Timeout;

    if (!isDeleting) {
      if (charCount < fullText.length) {
        timer = setTimeout(() => {
          setCharCount((prev) => prev + 1);
        }, 55); // Deterministic 55ms per char
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2800); // 2.8s pause
      }
    } else {
      if (charCount > 0) {
        timer = setTimeout(() => {
          setCharCount((prev) => prev - 1);
        }, 35); // Deterministic 35ms per char
      } else {
        timer = setTimeout(() => {
          setIsDeleting(false);
          setHeadlineIndex((prev) => (prev + 1) % HEADLINES.length);
        }, 400); // 400ms pause between phrases
      }
    }

    return () => clearTimeout(timer);
  }, [charCount, isDeleting, headlineIndex, prefersReducedMotion]);

  if (prefersReducedMotion) {
    const current = HEADLINES[0];
    return (
      <div className="min-h-[150px] sm:min-h-[180px] lg:min-h-[210px] flex items-center justify-center">
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-[-0.04em] max-w-4xl mx-auto leading-[1.05] font-['Plus_Jakarta_Sans',sans-serif]">
          <span>{current.prefix}</span> <br className="hidden sm:inline" />
          <span className="text-cyan-700 font-bold">{current.highlight}</span>
        </h1>
      </div>
    );
  }

  const currentHeadline = HEADLINES[headlineIndex];
  const fullText = `${currentHeadline.prefix} ${currentHeadline.highlight}`;
  const prefixLength = currentHeadline.prefix.length;

  const visibleText = fullText.slice(0, charCount);
  const visiblePrefix = visibleText.slice(0, Math.min(charCount, prefixLength));
  const visibleHighlight = charCount > prefixLength + 1 ? visibleText.slice(prefixLength + 1) : '';

  return (
    <div className="min-h-[160px] sm:min-h-[190px] lg:min-h-[220px] flex items-center justify-center px-4">
      <div className="relative max-w-4xl mx-auto text-center font-['Plus_Jakarta_Sans',sans-serif]">
        {/* ── LAYER A: Visual Ghost Layer (Shifted, Blurred Cyan-Blue Tint) ── */}
        <div
          aria-hidden="true"
          className="absolute inset-0 select-none pointer-events-none text-3xl sm:text-5xl lg:text-6xl font-extrabold text-cyan-600/15 tracking-[-0.04em] leading-[1.05] blur-[2px] translate-x-[3px] translate-y-[2px] transition-all duration-75"
        >
          <span>{visiblePrefix}</span>
          {charCount > prefixLength && <br className="hidden sm:inline" />}
          {visibleHighlight && (
            <span className="text-cyan-600/20 font-bold ml-1.5 sm:ml-0">
              {visibleHighlight}
            </span>
          )}
        </div>

        {/* ── LAYER B: Sharp Real Text Layer + Ghost-Trail Character Spans ── */}
        <h1 className="relative z-10 text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-[-0.04em] leading-[1.05]">
          <span>
            {visiblePrefix.split('').map((char, index) => {
              const isRecent = !isDeleting && index >= visiblePrefix.length - 2 && index < visiblePrefix.length;
              return (
                <span
                  key={`p-${index}`}
                  className={isRecent ? 'text-slate-800 [text-shadow:0_0_10px_rgba(6,182,212,0.35)] transition-all duration-150' : 'text-slate-900'}
                >
                  {char}
                </span>
              );
            })}
          </span>

          {charCount > prefixLength && <br className="hidden sm:inline" />}

          {visibleHighlight && (
            <span className="text-cyan-700 font-bold ml-1.5 sm:ml-0">
              {visibleHighlight.split('').map((char, index) => {
                const globalIdx = prefixLength + 1 + index;
                const isRecent = !isDeleting && globalIdx >= charCount - 2 && globalIdx < charCount;
                return (
                  <span
                    key={`h-${index}`}
                    className={isRecent ? 'text-cyan-600 [text-shadow:0_0_12px_rgba(14,116,144,0.4)] transition-all duration-150' : 'text-cyan-700'}
                  >
                    {char}
                  </span>
                );
              })}
            </span>
          )}

          {/* ── Precision Ghost Writer Caret ── */}
          <span className="inline-block w-[2.5px] h-[0.78em] bg-cyan-700 ml-1.5 align-baseline rounded-sm animate-[pulse_1s_infinite] shadow-[0_0_6px_rgba(6,182,212,0.5)]" />
        </h1>
      </div>
    </div>
  );
}
