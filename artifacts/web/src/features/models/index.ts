/**
 * features/models/index.ts — ML Model Management feature barrel
 *
 * This feature covers:
 * - Model version list across all algorithms
 * - Model detail with full evaluation metrics
 * - Confusion matrix heatmap visualization
 * - Precision / Recall / F1 / ROC-AUC display
 * - Training job submission with hyperparameter configuration
 * - Model activation (promote to production)
 * - Side-by-side model comparison
 * - Feature importance bar chart
 *
 * Exports are added here as the Models module is built:
 *
 *   export { ModelsPage }             from './ModelsPage';
 *   export { ModelDetailPage }        from './ModelDetailPage';
 *   export { ConfusionMatrixHeatmap } from './components/ConfusionMatrixHeatmap';
 *   export { MetricScoreCard }        from './components/MetricScoreCard';
 *   export { FeatureImportanceChart } from './components/FeatureImportanceChart';
 *   export { TrainModelForm }         from './components/TrainModelForm';
 *   export { ModelComparisonTable }   from './components/ModelComparisonTable';
 *   export { TrainingJobStatus }      from './components/TrainingJobStatus';
 *
 * API hooks used by this feature:
 *   - useGetModels()
 *   - useGetModel(id)
 *   - useGetModelMetrics(id)
 *   - useTrainModel()
 *   - useActivateModel(id)
 *   - useGetModelComparison(idA, idB)
 *   - useGetAnalyticsFeatureImportance()
 */

export {};
