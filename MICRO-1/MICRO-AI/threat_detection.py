import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report
import joblib

def generate_dataset(num_samples=300):
    """
    Generates a synthetic network traffic dataset.
    Features: duration, src_bytes, dst_bytes, failed_logins.
    Labeling: LOW, SUSPICIOUS, MALICIOUS based on threat heuristic.
    """
    # Seed for reproducibility
    np.random.seed(42)
    
    # Generate random features
    # duration in seconds
    duration = np.random.exponential(scale=10, size=num_samples) 
    
    # src_bytes and dst_bytes
    src_bytes = np.random.lognormal(mean=7, sigma=2, size=num_samples)
    dst_bytes = np.random.lognormal(mean=7, sigma=2, size=num_samples)
    
    # failed_logins (mostly 0, some up to 5)
    failed_logins = np.random.poisson(lam=0.5, size=num_samples)
    
    df = pd.DataFrame({
        'duration': duration,
        'src_bytes': src_bytes,
        'dst_bytes': dst_bytes,
        'failed_logins': failed_logins
    })
    
    # Labeling Logic: Assign labels based on a computed threat score
    def assign_label(row):
        score = 0
        if row['duration'] > 20: 
            score += 1
        if row['src_bytes'] > 50000 or row['dst_bytes'] > 50000:
            score += 1
        if row['failed_logins'] == 1:
            score += 2
        elif row['failed_logins'] > 1:
            score += 4
            
        # Rules:
        # LOW -> score <= 1 (low traffic + low anomalies)
        # SUSPICIOUS -> score 2 or 3 (moderate traffic or anomalies)
        # MALICIOUS -> score >= 4 (high traffic + multiple anomalies)
        if score <= 1:
            return 'LOW'
        elif score <= 3:
            return 'SUSPICIOUS'
        else:
            return 'MALICIOUS'
            
    df['label'] = df.apply(assign_label, axis=1)
    return df

def train_model(df):
    """
    Trains a Random Forest Classifier on the dataset.
    """
    # Features and labels
    X = df[['duration', 'src_bytes', 'dst_bytes', 'failed_logins']]
    y = df['label']
    
    # Split the dataset
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train the Random Forest Model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    
    print(f"Model Accuracy: {accuracy * 100:.2f}%\n")
    
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, predictions))
    print("\nClassification Report:")
    print(classification_report(y_test, predictions))

    return model, X_test, y_test

def save_model(model, filename='threat_model.pkl'):
    """
    Saves the trained model using joblib.
    """
    joblib.dump(model, filename)
    print(f"Model successfully saved as '{filename}'")

def predict_threat(model, features):
    """
    Takes input features and returns the predicted label, confidence, and routing action.
    """
    # Convert input to DataFrame if it's a list or array
    if isinstance(features, (list, np.ndarray)):
        features = pd.DataFrame(features, columns=['duration', 'src_bytes', 'dst_bytes', 'failed_logins'])
        
    predictions = model.predict(features)
    probabilities = model.predict_proba(features)
    
    results = []
    
    for i in range(len(predictions)):
        label = predictions[i]
        # Maximum probability is the confidence score
        confidence = max(probabilities[i])
        
        # Future Integration: Routing logic based on prediction
        if label == 'LOW':
            routing = 'Route to AES Module'
        elif label == 'SUSPICIOUS':
            routing = 'Route to QKD Module'
        elif label == 'MALICIOUS':
            routing = 'Route to PQC Module'
        else:
            routing = 'Unknown'
            
        results.append({
            'Predicted Label': label,
            'Confidence': f"{confidence * 100:.2f}%",
            'Routing Action': routing
        })
        
    return results

def main():
    print("=== AI-Based Network Traffic Threat Detection ===\n")
    
    # 1. Generate Dataset
    print("[1] Generating Synthetic Dataset...")
    df = generate_dataset(300)
    print(f"Generated {len(df)} samples.")
    print("Class Distribution:")
    print(df['label'].value_counts())
    print("-" * 50)
    
    # 2. Train Model
    print("\n[2] Training Random Forest Classifier...")
    model, X_test, y_test = train_model(df)
    print("-" * 50)
    
    # 3. Optional: Feature Importance Explanation
    print("\n[3] Feature Importance (Why the model makes decisions):")
    feature_importances = pd.Series(model.feature_importances_, index=['duration', 'src_bytes', 'dst_bytes', 'failed_logins'])
    print(feature_importances.sort_values(ascending=False))
    print("-" * 50)
    
    # 4. Show Sample Predictions & Routing
    print("\n[4] Sample Predictions (simulating real-time inputs):")
    sample_features = X_test.head(5)
    sample_actual = y_test.head(5).values
    predictions = predict_threat(model, sample_features)
    
    for i in range(len(predictions)):
        print(f"Traffic Sample #{i+1}:")
        # Format the features beautifully for output
        features_dict = sample_features.iloc[i].to_dict()
        formatted_features = ", ".join([f"{k}: {v:.2f}" for k, v in features_dict.items()])
        print(f"  > Features: {formatted_features}")
        print(f"  > Actual Label: {sample_actual[i]}")
        print(f"  > Predicted: {predictions[i]['Predicted Label']} (Confidence: {predictions[i]['Confidence']})")
        print(f"  > Integration: {predictions[i]['Routing Action']}\n")
        
    # 5. Save the Model
    print("[5] Saving Model...")
    save_model(model, 'threat_model.pkl')
    
if __name__ == "__main__":
    main()
