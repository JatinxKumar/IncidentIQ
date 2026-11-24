"""
app/models/ — ML Algorithm Classes
====================================
This package contains one class per ML algorithm used in IncidentIQ.
Each class wraps a scikit-learn estimator with a consistent interface:
  train(X_train, y_train) → trained model
  predict(X) → predictions
  evaluate(X_test, y_test) → ModelEvaluation

Added module by module (all require scikit-learn — installed in Module 4):

  Module 4:
    decision_tree.py    → DecisionTreeClassifier wrapper
    random_forest.py    → RandomForestClassifier wrapper
    knn.py              → KNeighborsClassifier wrapper
    svm.py              → SVC wrapper
    linear_regression.py → LinearRegression wrapper (baseline deviation)
    kmeans.py           → KMeans wrapper (unsupervised clustering)

  Module 4 also adds:
    ensemble.py         → Weighted voting ensemble combining all classifiers
    base.py             → Abstract base class enforcing the common interface
"""
