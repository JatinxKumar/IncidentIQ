import { useState, useEffect } from 'react';

interface PremiumLoaderProps {
  onComplete: () => void;
}

export function PremiumLoader({ onComplete }: PremiumLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const duration = 3200; // ~3.2 seconds
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const elapsed = now - start;
      const raw = Math.min(1, elapsed / duration);
      // cubic ease-out for smooth deceleration
      const eased = 1 - Math.pow(1 - raw, 3);
      const pct = Math.round(eased * 100);
      setProgress(pct);

      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        setIsFadingOut(true);
        setTimeout(() => onComplete(), 500);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onComplete]);

  const size = 140;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#050a18',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        opacity: isFadingOut ? 0 : 1,
        transform: isFadingOut ? 'scale(1.02)' : 'scale(1)',
        pointerEvents: isFadingOut ? 'none' as const : 'auto' as const,
      }}
    >
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* SVG ring */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(148,163,184,0.08)"
            strokeWidth={stroke}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#loaderGrad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.08s linear' }}
          />
          <defs>
            <linearGradient id="loaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
        </svg>

        {/* Percentage */}
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, sans-serif",
            color: 'rgba(226,232,240,0.9)',
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
            userSelect: 'none',
          }}
        >
          {progress}
        </span>
      </div>
    </div>
  );
}
