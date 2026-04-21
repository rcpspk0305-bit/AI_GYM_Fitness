import json
import os
import paho.mqtt.client as mqtt

from database import SessionLocal, IoTTelemetry

MQTT_BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "gym/+/telemetry")

latest_telemetry = {}
mqtt_status = {
    "connected": False,
    "broker": MQTT_BROKER_HOST,
    "port": MQTT_BROKER_PORT,
    "topic": MQTT_TOPIC,
}

client_instance = None


def build_recommendation(data: dict) -> str:
    heart_rate = float(data.get("heart_rate") or 0)
    fatigue = float(data.get("fatigue_score") or 0)
    device_type = str(data.get("device_type", "")).lower()
    speed = float(data.get("speed") or 0)
    incline = float(data.get("incline") or 0)
    resistance = float(data.get("resistance") or 0)
    rep_speed = float(data.get("rep_speed") or 0)

    messages = []

    if fatigue >= 0.8 or heart_rate >= 170:
        messages.append("High fatigue detected. Reduce intensity and take longer rest.")
    elif fatigue >= 0.6 or heart_rate >= 150:
        messages.append("Moderate fatigue detected. Maintain form and rest briefly.")
    else:
        messages.append("Stable session. Current intensity looks safe.")

    if device_type == "treadmill":
        if heart_rate < 120 and speed < 6:
            messages.append("You may increase treadmill speed slightly.")
        if incline > 8 or heart_rate > 165:
            messages.append("Reduce incline or speed for recovery.")
    elif device_type == "strength_machine":
        if rep_speed < 1.0:
            messages.append("Rep speed is too slow. Lower resistance slightly.")
        elif rep_speed > 2.4 and fatigue < 0.5:
            messages.append("You can increase resistance slightly.")
        if resistance > 0:
            messages.append(f"Current resistance: {resistance}.")

    return " ".join(messages)


def save_telemetry(data: dict):
    db = SessionLocal()
    try:
        row = IoTTelemetry(
            device_id=data.get("device_id", "unknown"),
            username=data.get("username", "guest"),
            device_type=data.get("device_type", "unknown"),
            heart_rate=data.get("heart_rate"),
            resistance=data.get("resistance"),
            speed=data.get("speed"),
            incline=data.get("incline"),
            rep_speed=data.get("rep_speed"),
            fatigue_score=data.get("fatigue_score"),
            calories=data.get("calories"),
            status=data.get("status", "active"),
            raw_payload=json.dumps(data),
        )
        db.add(row)
        db.commit()
    except Exception as e:
        db.rollback()
        print("[MQTT][DB ERROR]", e)
    finally:
        db.close()


def on_connect(client, userdata, flags, reason_code, properties=None):
    if reason_code == 0:
        mqtt_status["connected"] = True
        client.subscribe(MQTT_TOPIC, qos=1)
        print(f"[MQTT] Connected to {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT}")
        print(f"[MQTT] Subscribed to {MQTT_TOPIC}")
    else:
        mqtt_status["connected"] = False
        print(f"[MQTT] Connection failed with code {reason_code}")


def on_disconnect(client, userdata, disconnect_flags, reason_code, properties=None):
    mqtt_status["connected"] = False
    print("[MQTT] Disconnected")


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
        parts = msg.topic.split("/")
        if len(parts) >= 3:
            payload["device_id"] = payload.get("device_id", parts[1])

        payload["recommendation"] = build_recommendation(payload)
        latest_telemetry[payload["device_id"]] = payload
        save_telemetry(payload)

        print(f"[MQTT] Received from {payload['device_id']}: {payload}")
    except Exception as e:
        print("[MQTT][MESSAGE ERROR]", e)


def start_mqtt():
    global client_instance
    if client_instance is not None:
        return

    try:
        client_instance = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="ai-gym-backend")
        client_instance.on_connect = on_connect
        client_instance.on_disconnect = on_disconnect
        client_instance.on_message = on_message
        client_instance.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, 60)
        client_instance.loop_start()
    except Exception as e:
        client_instance = None
        mqtt_status["connected"] = False
        print("[MQTT][START ERROR]", e)


def stop_mqtt():
    global client_instance
    if client_instance is not None:
        try:
            client_instance.loop_stop()
            client_instance.disconnect()
        except Exception as e:
            print("[MQTT][STOP ERROR]", e)
        finally:
            client_instance = None
            mqtt_status["connected"] = False