import pandas as pd
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score
from sklearn.pipeline import make_pipeline

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, 'heart.csv')
    
    if not os.path.exists(csv_path):
        print(f"Dataset not found at {csv_path}")
        return

    print("Loading dataset...")
    df = pd.read_csv(csv_path)
    df = df.dropna()
    
    # Features and Target
    X = df.drop('target', axis=1)
    y = df['target']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print(f"Training on {len(X_train)} samples, testing on {len(X_test)} samples.")
    
    # Define models to try (wrapped in pipelines with StandardScaler)
    models = {
        'Logistic Regression': make_pipeline(StandardScaler(), LogisticRegression()),
        'Random Forest': make_pipeline(StandardScaler(), RandomForestClassifier(n_estimators=100, random_state=42)),
        'Gradient Boosting': make_pipeline(StandardScaler(), GradientBoostingClassifier(random_state=42)),
        'Support Vector Machine': make_pipeline(StandardScaler(), SVC(probability=True, random_state=42))
    }
    
    best_model = None
    best_accuracy = 0
    best_model_name = ""
    
    for name, pipeline in models.items():
        pipeline.fit(X_train, y_train)
        preds = pipeline.predict(X_test)
        acc = accuracy_score(y_test, preds)
        print(f"{name} Accuracy: {acc * 100:.2f}%")
        
        if acc > best_accuracy:
            best_accuracy = acc
            best_model = pipeline
            best_model_name = name
            
    print(f"\nBest Model: {best_model_name} with Accuracy: {best_accuracy * 100:.2f}%")
    
    # Save the best pipeline
    model_path = os.path.join(base_dir, 'best_heart_model.pkl')
    joblib.dump(best_model, model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    main()
