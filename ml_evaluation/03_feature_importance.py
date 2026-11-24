"""
SentinelAI ML Evaluation - Feature Importance Analysis

This script analyzes the feature importance of the trained Random Forest model
and generates visualizations and reports.

Requirements:
- Calculate Random Forest feature_importances_
- Generate feature importance table
- Sorted feature rankings
- Visualization of important parameters
- Short explanation of what each important feature means
"""

import json
import os
import pickle
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import RandomForestClassifier

# Configuration
MODEL_PATH = 'ml_evaluation/models/random_forest_model.pkl'
OUTPUT_DIR = 'ml_evaluation/feature_importance'

def load_model(model_path: str = MODEL_PATH):
    """Load the trained Random Forest model."""
    print(f"Loading model from {model_path}")
    with open(model_path, 'rb') as f:
        model_data = pickle.load(f)
    
    model = model_data['model']
    feature_names = model_data['feature_names']
    
    print(f"Model loaded: {type(model).__name__}")
    print(f"Features: {len(feature_names)}")
    
    return model, feature_names

def calculate_feature_importance(model: RandomForestClassifier, feature_names: list):
    """Calculate and rank feature importance."""
    print("\n" + "=" * 60)
    print("Calculating Feature Importance")
    print("=" * 60)
    
    # Get feature importances
    importances = model.feature_importances_
    
    # Create DataFrame
    importance_df = pd.DataFrame({
        'feature': feature_names,
        'importance': importances
    })
    
    # Sort by importance
    importance_df = importance_df.sort_values('importance', ascending=False).reset_index(drop=True)
    
    # Add rank
    importance_df['rank'] = range(1, len(importance_df) + 1)
    
    # Add percentage
    importance_df['importance_pct'] = (importance_df['importance'] / importance_df['importance'].sum()) * 100
    
    print(f"Feature importance calculated for {len(feature_names)} features")
    print(f"\nTop 5 most important features:")
    print(importance_df.head(5).to_string(index=False))
    
    return importance_df

def generate_feature_importance_report(importance_df: pd.DataFrame, output_dir: str = OUTPUT_DIR):
    """Generate feature importance report and visualizations."""
    print("\n" + "=" * 60)
    print("Generating Feature Importance Report")
    print("=" * 60)
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Save importance table
    importance_path = os.path.join(output_dir, 'feature_importance.csv')
    importance_df.to_csv(importance_path, index=False)
    print(f"Feature importance table saved to {importance_path}")
    
    # Save JSON report
    report = {
        'feature_importance': importance_df.to_dict(orient='records'),
        'top_features': importance_df.head(10).to_dict(orient='records'),
        'total_features': len(importance_df),
        'generated_at': pd.Timestamp.now().isoformat()
    }
    
    report_path = os.path.join(output_dir, 'feature_importance_report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"Feature importance report saved to {report_path}")
    
    # Generate visualizations
    generate_importance_plots(importance_df, output_dir)
    
    # Generate feature descriptions
    generate_feature_descriptions(importance_df, output_dir)

def generate_importance_plots(importance_df: pd.DataFrame, output_dir: str):
    """Generate feature importance visualizations."""
    print("\nGenerating feature importance visualizations...")
    
    # Set style
    plt.style.use('seaborn-v0_8')
    sns.set_palette("husl")
    
    # 1. Horizontal bar chart
    fig, ax = plt.subplots(figsize=(12, 8))
    top_features = importance_df.head(15)
    bars = ax.barh(top_features['feature'], top_features['importance_pct'], color='skyblue')
    ax.set_xlabel('Importance (%)', fontsize=12)
    ax.set_ylabel('Feature', fontsize=12)
    ax.set_title('Top 15 Feature Importances - Random Forest', fontsize=14, fontweight='bold')
    ax.grid(axis='x', alpha=0.3)
    
    # Add value labels
    for bar in bars:
        width = bar.get_width()
        ax.text(width + 0.5, bar.get_y() + bar.get_height()/2, f'{width:.1f}%', 
                va='center', fontsize=9)
    
    plt.tight_layout()
    plot_path = os.path.join(output_dir, 'feature_importance_bar.png')
    plt.savefig(plot_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Bar chart saved to {plot_path}")
    
    # 2. Feature importance pie chart
    fig, ax = plt.subplots(figsize=(10, 10))
    top_10 = importance_df.head(10)
    other_importance = importance_df.iloc[10:]['importance_pct'].sum()
    
    labels = list(top_10['feature']) + ['Other']
    sizes = list(top_10['importance_pct']) + [other_importance]
    
    wedges, texts, autotexts = ax.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=90)
    ax.set_title('Feature Importance Distribution', fontsize=14, fontweight='bold')
    
    # Make text smaller
    for text in texts:
        text.set_fontsize(9)
    for autotext in autotexts:
        autotext.set_fontsize(8)
    
    plt.tight_layout()
    pie_path = os.path.join(output_dir, 'feature_importance_pie.png')
    plt.savefig(pie_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Pie chart saved to {pie_path}")
    
    # 3. Feature importance heatmap
    fig, ax = plt.subplots(figsize=(12, 6))
    importance_matrix = importance_df[['feature', 'importance_pct']].set_index('feature').T
    sns.heatmap(importance_matrix, annot=True, fmt='.1f', cmap='YlOrRd', ax=ax, cbar_kws={'label': 'Importance (%)'})
    ax.set_title('Feature Importance Heatmap', fontsize=14, fontweight='bold')
    ax.set_xlabel('Feature', fontsize=12)
    ax.set_ylabel('Importance (%)', fontsize=12)
    
    plt.tight_layout()
    heatmap_path = os.path.join(output_dir, 'feature_importance_heatmap.png')
    plt.savefig(heatmap_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Heatmap saved to {heatmap_path}")

def generate_feature_descriptions(importance_df: pd.DataFrame, output_dir: str):
    """Generate descriptions for each feature."""
    print("\nGenerating feature descriptions...")
    
    feature_descriptions = {
        'cpu_usage': 'CPU utilization percentage. High values indicate system load.',
        'memory_usage': 'Memory utilization percentage. High values indicate memory pressure.',
        'disk_usage': 'Disk space utilization percentage. High values indicate storage constraints.',
        'network_latency': 'Network latency in milliseconds. High values indicate network issues.',
        'request_rate': 'Number of requests per second. High values indicate high traffic.',
        'error_rate': 'Error rate as a fraction (0-1). High values indicate system errors.',
        'response_time': 'Average response time in milliseconds. High values indicate performance issues.',
        'http_status': 'HTTP status code. 5xx codes indicate server errors.',
        'service_availability': 'Service availability percentage. Low values indicate outages.',
        'db_connections': 'Number of database connections. High values indicate database load.',
        'query_latency': 'Database query latency in milliseconds. High values indicate slow queries.',
        'cache_hit_ratio': 'Cache hit ratio (0-1). Low values indicate cache inefficiency.',
        'restart_count': 'Number of service restarts. High values indicate instability.',
        'deployment_indicator': 'Deployment indicator (0/1). 1 indicates recent deployment.'
    }
    
    # Create descriptions DataFrame
    desc_df = importance_df.copy()
    desc_df['description'] = desc_df['feature'].map(feature_descriptions)
    
    # Save descriptions
    desc_path = os.path.join(output_dir, 'feature_descriptions.csv')
    desc_df.to_csv(desc_path, index=False)
    print(f"Feature descriptions saved to {desc_path}")
    
    # Save as JSON
    desc_json = {
        'feature_descriptions': desc_df.to_dict(orient='records'),
        'generated_at': pd.Timestamp.now().isoformat()
    }
    
    desc_json_path = os.path.join(output_dir, 'feature_descriptions.json')
    with open(desc_json_path, 'w') as f:
        json.dump(desc_json, f, indent=2)
    print(f"Feature descriptions JSON saved to {desc_json_path}")

def main():
    """Main function to analyze feature importance."""
    print("=" * 60)
    print("SentinelAI ML Evaluation - Feature Importance Analysis")
    print("=" * 60)
    
    # Load model
    model, feature_names = load_model()
    
    # Calculate feature importance
    importance_df = calculate_feature_importance(model, feature_names)
    
    # Generate report and visualizations
    generate_feature_importance_report(importance_df)
    
    print("\n" + "=" * 60)
    print("Feature Importance Analysis Completed Successfully")
    print("=" * 60)
    print(f"Output directory: {os.path.abspath(OUTPUT_DIR)}")
    print(f"Files generated:")
    print(f"  - feature_importance.csv")
    print(f"  - feature_importance_report.json")
    print(f"  - feature_importance_bar.png")
    print(f"  - feature_importance_pie.png")
    print(f"  - feature_importance_heatmap.png")
    print(f"  - feature_descriptions.csv")
    print(f"  - feature_descriptions.json")

if __name__ == "__main__":
    main()