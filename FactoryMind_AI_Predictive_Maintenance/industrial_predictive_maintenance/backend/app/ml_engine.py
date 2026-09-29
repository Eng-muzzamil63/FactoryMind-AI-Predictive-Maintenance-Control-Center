from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, mean_absolute_error

FEATURES = [
    "temperature_c",
    "vibration_mm_s",
    "pressure_bar",
    "rpm",
    "voltage_v",
    "operating_hours",
    "days_since_service",
    "load_pct",
]

DISPLAY_NAMES = {
    "temperature_c": "Temperature",
    "vibration_mm_s": "Vibration",
    "pressure_bar": "Pressure",
    "rpm": "RPM",
    "voltage_v": "Voltage",
    "operating_hours": "Operating hours",
    "days_since_service": "Service age",
    "load_pct": "Load",
}

@dataclass
class ModelBundle:
    classifier: RandomForestClassifier
    regressor: RandomForestRegressor
    anomaly: IsolationForest
    auc: float
    mae: float


def seed_data(n: int = 140, seed: int = 23) -> list[dict[str, Any]]:
    rng = np.random.default_rng(seed)
    machine_types = ["CNC Mill", "Hydraulic Press", "Compressor", "Conveyor Drive", "Injection Molder"]
    sites = ["Plant North", "Plant East", "Plant Central", "Plant West"]
    raw: list[dict[str, Any]] = []
    risk_scores: list[float] = []
    now = datetime.now(timezone.utc)

    for i in range(1, n + 1):
        mtype = machine_types[(i - 1) % len(machine_types)]
        site = sites[(i - 1) % len(sites)]
        age_factor = rng.uniform(0.35, 1.45)
        operating_hours = int(rng.uniform(450, 12500))
        days_since_service = int(np.clip(rng.normal(45 + 25 * age_factor, 18), 1, 180))
        load = float(np.clip(rng.normal(70, 17), 20, 99))
        temp = float(np.clip(rng.normal(70 + 7 * age_factor + 0.12 * (load - 65), 7.5), 45, 115))
        vib = float(np.clip(rng.normal(2.6 + 0.75 * age_factor + 0.020 * max(load - 65, 0), 0.8), 0.5, 9.5))
        pressure = float(np.clip(rng.normal(7.4 - 0.30 * age_factor, 0.6), 4.2, 9.5))
        rpm = float(np.clip(rng.normal(1760, 160), 1000, 2300))
        voltage = float(np.clip(rng.normal(400, 12), 350, 450))

        # Synthetic but learnable failure mechanism: near-term failure is driven by measurable stress signals.
        risk_score = (
            (temp - 70) / 8
            + (vib - 2.5) / 1.2
            + (7.0 - pressure) / 1.2
            + (days_since_service - 40) / 50
            + (load - 65) / 25
            + max(operating_hours - 6000, 0) / 6000
            + abs(voltage - 400) / 20
            + rng.normal(0, 0.10)
        )
        risk_scores.append(float(risk_score))
        raw.append({
            "id": f"M-{i:03d}",
            "name": f"{mtype} {i:03d}",
            "type": mtype,
            "site": site,
            "temperature_c": round(temp, 1),
            "vibration_mm_s": round(vib, 2),
            "pressure_bar": round(pressure, 2),
            "rpm": round(rpm),
            "voltage_v": round(voltage, 1),
            "operating_hours": operating_hours,
            "days_since_service": days_since_service,
            "load_pct": round(load, 1),
            "last_service": (now - timedelta(days=days_since_service)).date().isoformat(),
        })

    threshold = float(np.quantile(np.array(risk_scores), 0.78))
    for row, score in zip(raw, risk_scores):
        failure = int(score >= threshold)
        # Small realistic label noise prevents a perfectly deterministic toy dataset.
        if rng.random() < 0.025:
            failure = 1 - failure
        row["failed_soon"] = failure
        row["true_rul_days"] = round(float(np.clip(105 - 16 * score + rng.normal(0, 5), 5, 120)), 1)
    return raw


def build_models(rows: list[dict[str, Any]], seed: int = 23) -> ModelBundle:
    X = np.array([[r[f] for f in FEATURES] for r in rows], dtype=float)
    y = np.array([r["failed_soon"] for r in rows], dtype=int)
    rul = np.array([r["true_rul_days"] for r in rows], dtype=float)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=seed, stratify=y
    )
    clf = RandomForestClassifier(
        n_estimators=180,
        max_depth=10,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=seed,
        n_jobs=1,
    )
    clf.fit(X_train, y_train)
    auc = roc_auc_score(y_test, clf.predict_proba(X_test)[:, 1])

    reg = RandomForestRegressor(
        n_estimators=140, max_depth=12, min_samples_leaf=2, random_state=seed, n_jobs=1
    )
    reg.fit(X, rul)
    mae = mean_absolute_error(rul, reg.predict(X))

    anomaly = IsolationForest(contamination=0.10, n_estimators=120, random_state=seed)
    anomaly.fit(X)
    return ModelBundle(clf, reg, anomaly, float(auc), float(mae))


def _risk_label(prob: float) -> str:
    if prob >= 0.72:
        return "Critical"
    if prob >= 0.45:
        return "High"
    if prob >= 0.22:
        return "Watch"
    return "Healthy"


def _top_factors(row: dict[str, Any], bundle: ModelBundle) -> list[dict[str, Any]]:
    X = np.array([[row[f] for f in FEATURES]], dtype=float)
    baseline = float(bundle.classifier.predict_proba(X)[0, 1])
    factors = []
    thresholds = {
        "temperature_c": 82,
        "vibration_mm_s": 4.3,
        "pressure_bar": 5.2,
        "days_since_service": 70,
        "load_pct": 88,
        "voltage_v": 418,
    }
    messages = {
        "temperature_c": "Temperature is above the preferred operating band.",
        "vibration_mm_s": "Vibration suggests possible mechanical wear or imbalance.",
        "pressure_bar": "Pressure is below the preferred operating window.",
        "days_since_service": "Service interval exceeds the target maintenance cadence.",
        "load_pct": "Sustained load is pushing the asset toward a high-stress state.",
        "voltage_v": "Voltage deviation can increase electrical stress.",
    }
    for feature in FEATURES:
        if feature not in thresholds and feature != "operating_hours":
            continue
        x = X.copy()
        idx = FEATURES.index(feature)
        value = float(row[feature])
        if feature == "temperature_c": x[0, idx] += 12
        elif feature == "vibration_mm_s": x[0, idx] += 1.8
        elif feature == "pressure_bar": x[0, idx] -= 1.3
        elif feature == "days_since_service": x[0, idx] += 45
        elif feature == "load_pct": x[0, idx] += 10
        elif feature == "voltage_v": x[0, idx] += 28
        else: x[0, idx] += 2500
        shifted = float(bundle.classifier.predict_proba(x)[0, 1])
        sensitivity = abs(shifted - baseline)
        if feature in thresholds:
            threshold = thresholds[feature]
            active = value > threshold if feature != "pressure_bar" else value < threshold
        else:
            active = value > 6000
        if active:
            factors.append({
                "feature": feature,
                "score": round(min(1.0, max(0.08, sensitivity * 5)), 3),
                "message": messages.get(feature, "High operating hours increase cumulative equipment stress."),
            })
    factors.sort(key=lambda x: x["score"], reverse=True)
    if not factors:
        factors = [{"feature": "operating_hours", "score": 0.06, "message": "No major threshold breach detected; continue condition monitoring."}]
    return factors[:3]


def predict(row: dict[str, Any], bundle: ModelBundle) -> dict[str, Any]:
    X = np.array([[row[f] for f in FEATURES]], dtype=float)
    prob = float(bundle.classifier.predict_proba(X)[0, 1])
    rul = float(bundle.regressor.predict(X)[0])
    anomaly_raw = float(bundle.anomaly.decision_function(X)[0])
    anomaly_score = float(np.clip((0.12 - anomaly_raw) * 3.2 + 0.45, 0.0, 1.0))
    risk = _risk_label(prob)
    status = "Critical" if risk == "Critical" else "Warning" if risk in {"High", "Watch"} else "Healthy"
    if status == "Critical":
        action = "Schedule maintenance within 24 hours and inspect the top failure drivers."
    elif status == "Warning":
        action = "Create a maintenance work order and inspect during the next planned window."
    else:
        action = "Continue condition monitoring; review sensor trend at the next shift handoff."
    return {
        **row,
        "failure_probability": round(prob, 4),
        "failure_risk": risk,
        "status": status,
        "rul_days": round(max(rul, 1), 1),
        "anomaly_score": round(anomaly_score, 3),
        "top_factors": _top_factors(row, bundle),
        "recommended_action": action,
    }


def feature_importance(bundle: ModelBundle) -> list[dict[str, Any]]:
    pairs = [
        {"feature": DISPLAY_NAMES[f], "weight": round(float(w), 3)}
        for f, w in zip(FEATURES, bundle.classifier.feature_importances_)
    ]
    pairs.sort(key=lambda x: x["weight"], reverse=True)
    return pairs
