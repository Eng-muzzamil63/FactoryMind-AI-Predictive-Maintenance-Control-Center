from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .ml_engine import FEATURES, build_models, feature_importance, predict, seed_data

app = FastAPI(title="FactoryMind AI", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROWS = seed_data()
MODEL = build_models(ROWS)
PREDICTIONS = [predict(row, MODEL) for row in ROWS]

class SensorPayload(BaseModel):
    temperature_c: float = Field(..., ge=0, le=180)
    vibration_mm_s: float = Field(..., ge=0, le=20)
    pressure_bar: float = Field(..., ge=0, le=20)
    rpm: float = Field(..., ge=0, le=5000)
    voltage_v: float = Field(..., ge=250, le=500)
    operating_hours: int = Field(..., ge=0, le=100000)
    days_since_service: int = Field(..., ge=0, le=1000)
    load_pct: float = Field(..., ge=0, le=120)


def _score_key(p: dict[str, Any]) -> tuple:
    return (-p["failure_probability"], -p["anomaly_score"])

@app.get("/")
def root():
    return {"name": "FactoryMind AI", "status": "online", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.get("/api/health")
def health():
    return {"status": "healthy", "models": {"classifier_auc": round(MODEL.auc, 3), "rul_mae_days": round(MODEL.mae, 2)}}

@app.get("/api/dashboard")
def dashboard():
    statuses = {k: sum(1 for p in PREDICTIONS if p["status"] == k) for k in ["Healthy", "Warning", "Critical"]}
    avg_risk = sum(p["failure_probability"] for p in PREDICTIONS) / len(PREDICTIONS)
    avg_rul = sum(p["rul_days"] for p in PREDICTIONS) / len(PREDICTIONS)
    alerts = sorted(PREDICTIONS, key=_score_key)[:8]

    weekly = []
    for week in range(8, 0, -1):
        base = 9.2 + week * 0.35
        weekly.append({
            "label": f"W-{week}",
            "risk": round(base + (week % 3) * 0.25, 1),
            "availability": round(98.5 - (8 - week) * 0.35, 1),
        })

    site_summary = []
    for site in sorted({r["site"] for r in PREDICTIONS}):
        items = [p for p in PREDICTIONS if p["site"] == site]
        site_summary.append({
            "site": site,
            "machines": len(items),
            "critical": sum(p["status"] == "Critical" for p in items),
            "warning": sum(p["status"] == "Warning" for p in items),
            "avg_risk": round(sum(p["failure_probability"] for p in items) / len(items) * 100, 1),
        })

    return {
        "kpis": {
            "machines": len(PREDICTIONS),
            "critical": statuses["Critical"],
            "warning": statuses["Warning"],
            "healthy": statuses["Healthy"],
            "avg_risk_pct": round(avg_risk * 100, 1),
            "avg_rul_days": round(avg_rul, 1),
            "fleet_availability": 96.8,
            "maintenance_saved_pct": 17.4,
        },
        "alerts": alerts,
        "weekly": weekly,
        "sites": site_summary,
        "model": {"auc": round(MODEL.auc, 3), "rul_mae_days": round(MODEL.mae, 2)},
    }

@app.get("/api/machines")
def machines(status: str | None = None, site: str | None = None):
    items = PREDICTIONS
    if status:
        items = [p for p in items if p["status"].lower() == status.lower()]
    if site:
        items = [p for p in items if p["site"].lower() == site.lower()]
    return sorted(items, key=_score_key)

@app.get("/api/machines/{machine_id}")
def machine(machine_id: str):
    item = next((p for p in PREDICTIONS if p["id"] == machine_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Machine not found")
    trend = []
    for i in range(14, -1, -1):
        # deterministic trend derived from current condition
        drift = (14 - i) * 0.6
        trend.append({
            "day": f"D-{i}",
            "temperature": round(max(45, item["temperature_c"] - drift * 0.35), 1),
            "vibration": round(max(0.5, item["vibration_mm_s"] - drift * 0.04), 2),
            "load": round(max(20, item["load_pct"] - drift * 0.8), 1),
        })
    return {"machine": item, "trend": trend}

@app.post("/api/predict")
def custom_predict(payload: SensorPayload):
    row = payload.model_dump()
    row.update({
        "id": "CUSTOM",
        "name": "Custom Sensor Snapshot",
        "type": "Custom Machine",
        "site": "Live Analysis",
        "last_service": datetime.now(timezone.utc).date().isoformat(),
        "failed_soon": 0,
        "true_rul_days": 0,
    })
    return predict(row, MODEL)

@app.get("/api/insights")
def insights():
    return {
        "feature_importance": feature_importance(MODEL),
        "recommendations": [
            "Inspect high-vibration assets before their next production cycle.",
            "Prioritize machines with long service intervals and high load.",
            "Use RUL estimates to shift from calendar-based to condition-based maintenance.",
        ],
    }
