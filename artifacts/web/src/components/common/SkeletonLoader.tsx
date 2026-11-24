import React from 'react';

export function SkeletonLoader({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-700 rounded animate-pulse"
        />
      ))}
    </div>
  );
}
