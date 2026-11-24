/**
 * features/anomalies/index.ts — Anomaly Detection feature barrel
 *
 * This feature covers:
 * - Real-time anomaly feed (SSE stream)
 * - Anomaly list with filters (service, severity, time range)
 * - Anomaly detail page with ML explanation and contributing factors
 *
 * Exports are added here as the Anomalies module is built:
 *
 *   export { AnomaliesPage }          from './AnomaliesPage';
 *   export { AnomalyDetailPage }      from './AnomalyDetailPage';
 *   export { AnomalyFeed }            from './components/AnomalyFeed';
 *   export { AnomalyCard }            from './components/AnomalyCard';
 *   export { AnomalyFilters }         from './components/AnomalyFilters';
 *   export { RCAExplanationCard }     from './components/RCAExplanationCard';
 *   export { useAnomalyStream }       from './hooks/useAnomalyStream';
 *
 * API hooks used by this feature:
 *   - useGetAnomalies(params)
 *   - useGetAnomaly(id)
 *   - GET /api/anomalies/stream (SSE — not React Query)
 */

export {};
