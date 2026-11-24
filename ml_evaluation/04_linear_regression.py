"""
SentinelAI ML Evaluation - Linear Regression Experiment

This script implements a Linear Regression experiment to model the relationship
between CPU Usage (independent variable X) and Memory Usage (dependent variable Y).

Requirements:
- Identify X and Y explicitly
- Split training and testing data
- Train sklearn LinearRegression
- Calculate slope (m) and intercept (c)
- Generate regression equation y = mx + c
- Generate numerical predictions
- Compare actual vs predicted values
- Calculate MAE, MSE, RMSE and R²
- Plot scatter points and regression best-fit line
"""

import json
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Configuration
RANDOM_STATE = 42
TEST_SIZE = 0.2
X_FEATURE = 'cpu_usage'   # Independent variable
Y_FEATURE = 'memory_usage'  # Dependent variable

def load_dataset(data_path: str = 'ml_evaluation/synthetic_telemetry.csv'):
    """Load and validate the telemetry dataset."""
    print(f"Loading dataset from {data_path}")
    df = pd.read_csv(data_path)
    
    # Validate required columns
    if X_FEATURE not in df.columns:
        raise ValueError(f"Column '{X_FEATURE}' not found in dataset")
    if Y_FEATURE not in df.columns:
        raise ValueError(f"Column '{Y_FEATURE}' not found in dataset")
    
    # Select only the two features we need
    df_clean = df[[X_FEATURE, Y_FEATURE]].copy()
    
    # Handle missing values
    missing_values = df_clean.isnull().sum().sum()
    if missing_values > 0:
        print(f"Found {missing_values} missing values. Imputing with median...")
        df_clean = df_clean.fillna(df_clean.median())
    
    # Remove outliers (values outside reasonable ranges)
    df_clean = df_clean[
        (df_clean[X_FEATURE] >= 0) & (df_clean[X_FEATURE] <= 100) &
        (df_clean[Y_FEATURE] >= 0) & (df_clean[Y_FEATURE] <= 100)
    ]
    
    print(f"Dataset loaded: {len(df_clean)} samples")
    print(f"Independent variable (X): {X_FEATURE}")
    print(f"Dependent variable (Y): {Y_FEATURE}")
    print(f"X range: [{df_clean[X_FEATURE].min():.2f}, {df_clean[X_FEATURE].max():.2f}]")
    print(f"Y range: [{df_clean[Y_FEATURE].min():.2f}, {df_clean[Y_FEATURE].max():.2f}]")
    
    return df_clean

def train_and_evaluate(df: pd.DataFrame, model_save_path: str = 'ml_evaluation/models/linear_regression_model.pkl'):
    """Train Linear Regression and evaluate on test set."""
    print("\n" + "=" * 60)
    print("Training Linear Regression Model")
    print("=" * 60)
    
    # Prepare data
    X = df[[X_FEATURE]].values
    y = df[Y_FEATURE].values
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE
    )
    
    print(f"Training set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")
    
    # Train model
    print("Training Linear Regression...")
    model = LinearRegression()
    model.fit(X_train, y_train)
    
    # Get slope and intercept
    slope = model.coef_[0]
    intercept = model.intercept_
    
    print(f"\nRegression Equation: y = {slope:.4f} * x + {intercept:.4f}")
    print(f"Slope (m): {slope:.4f}")
    print(f"Intercept (c): {intercept:.4f}")
    
    # Save model
    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    import pickle
    with open(model_save_path, 'wb') as f:
        pickle.dump({
            'model': model,
            'slope': slope,
            'intercept': intercept,
            'x_feature': X_FEATURE,
            'y_feature': Y_FEATURE,
            'random_state': RANDOM_STATE,
            'test_size': TEST_SIZE
        }, f)
    print(f"Model saved to {model_save_path}")
    
    # Generate predictions
    print("Generating predictions on test set...")
    y_pred = model.predict(X_test)
    
    # Calculate metrics
    mae = mean_absolute_error(y_test, y_pred)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)
    
    print(f"\n" + "=" * 60)
    print("Linear Regression Evaluation Results")
    print("=" * 60)
    print(f"MAE:  {mae:.4f}")
    print(f"MSE:  {mse:.4f}")
    print(f"RMSE: {rmse:.4f}")
    print(f"R²:   {r2:.4f}")
    
    # Show sample predictions
    print(f"\nSample predictions (first 10 test samples):")
    sample_df = pd.DataFrame({
        'Actual_Y': y_test[:10],
        'Predicted_Y': y_pred[:10],
        'X_Value': X_test[:10].flatten()
    })
    print(sample_df.to_string(index=False))
    
    # Save metrics
    metrics = {
        'model_type': 'LinearRegression',
        'random_state': RANDOM_STATE,
        'test_size': TEST_SIZE,
        'x_feature': X_FEATURE,
        'y_feature': Y_FEATURE,
        'slope': float(slope),
        'intercept': float(intercept),
        'regression_equation': f'y = {slope:.4f} * x + {intercept:.4f}',
        'mae': float(mae),
        'mse': float(mse),
        'rmse': float(rmse),
        'r2_score': float(r2),
        'n_train': len(X_train),
        'n_test': len(X_test),
        'trained_at': pd.Timestamp.now().isoformat()
    }
    
    metrics_path = 'ml_evaluation/models/lr_metrics.json'
    os.makedirs(os.path.dirname(metrics_path), exist_ok=True)
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
    print(f"Metrics saved to {metrics_path}")
    
    # Save predictions
    predictions_df = pd.DataFrame({
        'X': X_test.flatten(),
        'Actual_Y': y_test,
        'Predicted_Y': y_pred
    })
    predictions_path = 'ml_evaluation/models/lr_predictions.csv'
    predictions_df.to_csv(predictions_path, index=False)
    print(f"Predictions saved to {predictions_path}")
    
    return {
        'model': model,
        'metrics': metrics,
        'X_test': X_test,
        'y_test': y_test,
        'y_pred': y_pred,
        'slope': slope,
        'intercept': intercept
    }

def generate_regression_plot(results: dict, output_dir: str = 'ml_evaluation/regression'):
    """Generate regression visualization."""
    print("\n" + "=" * 60)
    print("Generating Regression Visualization")
    print("=" * 60)
    
    os.makedirs(output_dir, exist_ok=True)
    
    X_test = results['X_test']
    y_test = results['y_test']
    y_pred = results['y_pred']
    slope = results['slope']
    intercept = results['intercept']
    
    # Create scatter plot with regression line
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Scatter plot
    ax.scatter(X_test, y_test, alpha=0.5, color='blue', label='Actual values', s=30)
    
    # Regression line
    x_line = np.linspace(X_test.min(), X_test.max(), 100)
    y_line = slope * x_line + intercept
    ax.plot(x_line, y_line, color='red', linewidth=2, label=f'Regression line: y = {slope:.4f}x + {intercept:.4f}')
    
    ax.set_xlabel(f'{X_FEATURE} (%)', fontsize=12)
    ax.set_ylabel(f'{Y_FEATURE} (%)', fontsize=12)
    ax.set_title(f'Linear Regression: {Y_FEATURE} vs {X_FEATURE}', fontsize=14, fontweight='bold')
    ax.legend()
    ax.grid(alpha=0.3)
    
    # Add R² annotation
    r2 = results['metrics']['r2_score']
    ax.text(0.05, 0.95, f'R² = {r2:.4f}', transform=ax.transAxes, 
            fontsize=12, verticalalignment='top', bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
    
    plt.tight_layout()
    plot_path = os.path.join(output_dir, 'linear_regression_plot.png')
    plt.savefig(plot_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Regression plot saved to {plot_path}")
    
    # Create actual vs predicted plot
    fig, ax = plt.subplots(figsize=(8, 8))
    ax.scatter(y_test, y_pred, alpha=0.5, color='green', s=30)
    
    # Perfect prediction line
    min_val = min(y_test.min(), y_pred.min())
    max_val = max(y_test.max(), y_pred.max())
    ax.plot([min_val, max_val], [min_val, max_val], color='red', linestyle='--', label='Perfect prediction')
    
    ax.set_xlabel(f'Actual {Y_FEATURE}', fontsize=12)
    ax.set_ylabel(f'Predicted {Y_FEATURE}', fontsize=12)
    ax.set_title(f'Actual vs Predicted {Y_FEATURE}', fontsize=14, fontweight='bold')
    ax.legend()
    ax.grid(alpha=0.3)
    
    plt.tight_layout()
    pred_plot_path = os.path.join(output_dir, 'actual_vs_predicted.png')
    plt.savefig(pred_plot_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Actual vs Predicted plot saved to {pred_plot_path}")

def main():
    """Main function to train and evaluate Linear Regression."""
    print("=" * 60)
    print("SentinelAI ML Evaluation - Linear Regression")
    print("=" * 60)
    
    # Load dataset
    df = load_dataset()
    
    # Train and evaluate
    results = train_and_evaluate(df)
    
    # Generate visualizations
    generate_regression_plot(results)
    
    print("\n" + "=" * 60)
    print("Linear Regression Completed Successfully")
    print("=" * 60)
    print(f"Model saved to: {os.path.abspath('ml_evaluation/models/linear_regression_model.pkl')}")
    print(f"Metrics saved to: {os.path.abspath('ml_evaluation/models/lr_metrics.json')}")
    print(f"Predictions saved to: {os.path.abspath('ml_evaluation/models/lr_predictions.csv')}")
    print(f"Plots saved to: {os.path.abspath('ml_evaluation/regression/')}")

if __name__ == "__main__":
    main()