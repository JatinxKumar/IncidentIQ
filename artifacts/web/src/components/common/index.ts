/**
 * components/common/index.ts — Shared app-level component barrel
 *
 * Re-exports all shared, app-specific components that are used across
 * multiple features. These are built on top of the shadcn/ui primitives
 * in src/components/ui/ but contain IncidentIQ-specific logic and styling.
 *
 * Components are added here as they are built, module by module:
 *
 *   Phase 2:
 *     export { PageHeader }       from './PageHeader';
 *     export { SeverityBadge }    from './SeverityBadge';
 *     export { StatusIndicator }  from './StatusIndicator';
 *     export { EmptyState }       from './EmptyState';
 *     export { LoadingSpinner }   from './LoadingSpinner';
 *     export { ConfirmDialog }    from './ConfirmDialog';
 *     export { DataTable }        from './DataTable';
 *     export { TimeAgo }          from './TimeAgo';
 *
 * Do not export shadcn primitives from here — import them directly
 * from '@/components/ui/*' in the feature files.
 */

export {};
