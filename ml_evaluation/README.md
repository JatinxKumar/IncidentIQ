# SentinelAI ML Evaluation

## Overview

This directory contains the complete Machine Learning evaluation pipeline for SentinelAI, implementing all five requirements for the academic AI/ML evaluation.

## Requirements Implemented

### 1. Create Machine Learning Model ✓
- **Random Forest Classifier** trained on synthetic telemetry data
- **Linear Regression** model trained for CPU vs Memory analysis
- Models saved as pickle files

### 2. Train/Test Split and Model Accuracy Evaluation ✓
- Proper train/test split (80/20) with stratification
- Reproducible random_state = 42
- Metrics: Accuracy, Precision, Recall, F1-Score, Confusion Matrix

### 3. Identify Impacting Parameters (Feature Importance) ✓
- Random Forest feature_importances_ calculated
- Feature importance table and rankings generated
- Visualizations created (bar, pie, heatmap)

### 4. Linear Regression with Numerical Output ✓
- Independent Variable (X): CPU Usage
- Dependent Variable (Y): Memory Usage
- Regression equation: y = mx + c
- Metrics: MAE, MSE, RMSE, R²

### 5. Clearly Identify Dependent and Independent Variables ✓
- Explicitly documented X and Y variables
- Clear separation in code and outputs

## Files Structure

```
ml_evaluation/
├── 01_generate_data.py              # Phase 1: Dataset generation
├── 02_train_random_forest.py        # Phase 2: Random Forest training
├── 03_feature_importance.py        # Phase 3: Feature importance
├── 04_linear_regression.py          # Phase 4: Linear regression
├── 05_run_all.sh                    # Phase 6: Main execution script
├── synthetic_telemetry.csv          # Generated dataset
├── synthetic_telemetry_metadata.json
├── models/                          # Trained models and metrics
│   ├── random_forest_model.pkl
│   ├── rf_metrics.json
│   ├── linear_regression_model.pkl
│   ├── lr_metrics.json
│   └── lr_predictions.csv
├── feature_importance/              # Feature importance outputs
│   ├── feature_importance.csv
│   ├── feature_importance_report.json
│   ├── feature_importance_bar.png
│   ├── feature_importance_pie.png
│   ├── feature_importance_heatmap.png
│   ├── feature_descriptions.csv
│   └── feature_descriptions.json
├── regression/                      # Regression outputs
│   ├── linear_regression_plot.png
│   └── actual_vs_predicted.png
├── evaluation_summary.json          # Evaluation summary
└── README.md                        # This file
```

## How to Run

### Prerequisites
```bash
pip install scikit-learn pandas numpy matplotlib
```

### Execute All Phases
```bash
cd ml_evaluation
./05_run_all.sh
```

### Execute Individual Phases
```bash
python 01_generate_data.py
python 02_train_random_forest.py
python 03_feature_importance.py
python 04_linear_regression.py
```

## Evaluation Results

### Phase 1: Dataset
- **Samples**: 10,000 synthetic telemetry records
- **Anomaly Rate**: 2.0% (200 anomalies)
- **Features**: 14 system metrics

### Phase 2: Random Forest
- **Model**: RandomForestClassifier (n_estimators=100, max_depth=10)
- **Train/Test Split**: 80/20 with stratification
- **Random State**: 42 (reproducible)

### Phase 3: Feature Importance
- **Top Features**: Calculated from model.feature_importances_
- **Visualizations**: Generated and saved

### Phase 4: Linear Regression
- **Independent Variable (X)**: CPU Usage
- **Dependent Variable (Y)**: Memory Usage
- **Equation**: y = mx + c
- **Metrics**: MAE, MSE, RMSE, R²

## Key Findings

1. **Random Forest** provides robust anomaly detection for multi-feature telemetry data.

2. **Feature Importance** identifies which system metrics most strongly correlate with anomalies.

3. **Linear Regression** models the linear relationship between CPU and Memory usage.

4. **All results** are reproducible with random_state=42.

## License

Academic evaluation - SentinelAI Project
