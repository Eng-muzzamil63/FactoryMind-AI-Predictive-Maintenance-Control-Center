# FactoryMind AI — Predictive Maintenance Control Center

A portfolio-grade machine learning system that predicts near-term industrial machine failure, estimates remaining useful life (RUL), detects anomalies, explains risk drivers, and turns predictions into maintenance actions.

## What this project demonstrates

- Synthetic industrial telemetry generation for 140 machines
- Supervised classification for near-term failure risk
- Regression for remaining useful life (days)
- Isolation Forest anomaly detection
- Model evaluation with ROC-AUC and MAE
- Explainable feature-signal analysis
- FastAPI inference APIs
- Modern Next.js dashboard with fleet overview, alert center, machine detail drawer, sensor trends, and model lab

## Architecture

Browser → Next.js / React → FastAPI → scikit-learn models → synthetic telemetry

## Backend

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Docs: http://127.0.0.1:8000/docs

## Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open: http://localhost:3000

## Main endpoints

- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/machines`
- `GET /api/machines/{machine_id}`
- `POST /api/predict`
- `GET /api/insights`

## Portfolio positioning

This is not only a model-training notebook. It is a complete ML decision-support product showing the flow: business problem → telemetry → ML → risk score → explanation → maintenance action → production UI/API.

## Important note

The demo data is synthetic. Production use would require validated plant sensor data, domain-specific failure labels, monitoring, recalibration, and operational safety review.
