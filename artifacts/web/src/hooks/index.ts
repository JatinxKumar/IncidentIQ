/**
 * hooks/index.ts — Custom React hooks barrel
 *
 * Re-exports all custom hooks used across multiple features.
 * Each hook is a thin wrapper that composes React Query, browser APIs,
 * or global state into a reusable interface.
 *
 * Hooks are added here as they are built, module by module:
 *
 *   Phase 2 — Auth:
 *     export { useAuth }             from './useAuth';
 *     export { useCurrentUser }      from './useCurrentUser';
 *
 *   Phase 3 — Anomaly stream:
 *     export { useAnomalyStream }    from './useAnomalyStream';  (SSE)
 *
 *   Phase 4 — Data:
 *     export { useSystemHealth }     from './useSystemHealth';
 *     export { useAnomalyTrend }     from './useAnomalyTrend';
 *
 *   Phase 5 — ML:
 *     export { useModelMetrics }     from './useModelMetrics';
 *
 * Rules:
 * - Every hook must have a single, well-defined purpose
 * - Hooks that fetch data must use React Query (never raw useState + useEffect)
 * - Hooks must not contain JSX — they return data, not components
 */

export {};
