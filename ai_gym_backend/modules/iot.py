from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db, IoTTelemetry
from modules.mqtt_service import latest_telemetry, mqtt_status, build_recommendation

router = APIRouter()


def row_to_dict(row: IoTTelemetry):
    return {
        "id": row.id,
        "device_id": row.device_id,
        "username": row.username,
        "device_type": row.device_type,
        "heart_rate": row.heart_rate,
        "resistance": row.resistance,
        "speed": row.speed,
        "incline": row.incline,
        "rep_speed": row.rep_speed,
        "fatigue_score": row.fatigue_score,
        "calories": row.calories,
        "status": row.status,
        "raw_payload": row.raw_payload,
        "created_at": row.created_at,
    }


@router.get("/health")
def health(db: Session = Depends(get_db)):
    count = db.query(IoTTelemetry).count()
    return {
        "status": "ok",
        "mqtt_connected": mqtt_status["connected"],
        "broker": mqtt_status["broker"],
        "port": mqtt_status["port"],
        "topic": mqtt_status["topic"],
        "device_cache_count": len(latest_telemetry),
        "db_rows": count,
    }


@router.get("/latest")
def latest():
    return {
        "count": len(latest_telemetry),
        "devices": list(latest_telemetry.values()),
    }


@router.get("/latest/{device_id}")
def latest_device(device_id: str, db: Session = Depends(get_db)):
    if device_id in latest_telemetry:
        return latest_telemetry[device_id]

    row = (
        db.query(IoTTelemetry)
        .filter(IoTTelemetry.device_id == device_id)
        .order_by(IoTTelemetry.created_at.desc())
        .first()
    )

    if not row:
        raise HTTPException(status_code=404, detail="No telemetry for this device")

    data = row_to_dict(row)
    data["recommendation"] = build_recommendation(data)
    return data


@router.get("/history/{device_id}")
def history(device_id: str, db: Session = Depends(get_db)):
    rows = (
        db.query(IoTTelemetry)
        .filter(IoTTelemetry.device_id == device_id)
        .order_by(IoTTelemetry.created_at.desc())
        .limit(20)
        .all()
    )
    return {
        "device_id": device_id,
        "items": [row_to_dict(r) for r in rows],
    }


@router.get("/recommend/{device_id}")
def recommend(device_id: str):
    payload = latest_telemetry.get(device_id)
    if not payload:
        raise HTTPException(status_code=404, detail="No live telemetry found")

    return {
        "device_id": device_id,
        "recommendation": build_recommendation(payload),
        "telemetry": payload,
    }