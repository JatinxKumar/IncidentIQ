/**
 * features/incidents/index.ts — Incident Management feature barrel
 *
 * This feature covers:
 * - Incident list with status filters
 * - Incident detail with timeline, RCA, and comments
 * - Manual incident creation
 * - Status transitions (OPEN → INVESTIGATING → RESOLVED → CLOSED)
 * - MTTD / MTTR display
 *
 * Exports are added here as the Incidents module is built:
 *
 *   export { IncidentsPage }          from './IncidentsPage';
 *   export { IncidentDetailPage }     from './IncidentDetailPage';
 *   export { IncidentCard }           from './components/IncidentCard';
 *   export { IncidentTimeline }       from './components/IncidentTimeline';
 *   export { RCAPanel }               from './components/RCAPanel';
 *   export { StatusTransitionMenu }   from './components/StatusTransitionMenu';
 *   export { CommentThread }          from './components/CommentThread';
 *
 * API hooks used by this feature:
 *   - useGetIncidents(params)
 *   - useGetIncident(id)
 *   - useCreateIncident()
 *   - usePatchIncident()
 *   - useCreateIncidentComment(incidentId)
 */

export {};
