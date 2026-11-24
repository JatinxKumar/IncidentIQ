/**
 * features/dashboard/index.ts — Dashboard feature barrel
 *
 * The Dashboard is the main landing page for authenticated users.
 * It shows the real-time system health score, active incident count,
 * anomaly frequency chart, and quick-access to critical incidents.
 *
 * Exports are added here as the Dashboard module is built:
 *
 *   export { DashboardPage }          from './DashboardPage';
 *   export { SystemHealthGauge }      from './components/SystemHealthGauge';
 *   export { AnomalyTrendChart }      from './components/AnomalyTrendChart';
 *   export { ActiveIncidentsList }    from './components/ActiveIncidentsList';
 *   export { useSystemHealth }        from './hooks/useSystemHealth';
 *   export { useAnomalyTrend }        from './hooks/useAnomalyTrend';
 *
 * API hooks used by this feature:
 *   - useGetAnalyticsHealthScore()
 *   - useGetAnalyticsAnomalyTrend()
 *   - useGetIncidents({ status: 'OPEN' })
 */

export {};
