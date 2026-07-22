import json
import random
import time
import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT = 1883

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="mock-gym-devices")
client.connect(BROKER, PORT, 60)
client.loop_start()

print("Sending mock telemetry... Press Ctrl+C to stop.")

try:
    while True:
        treadmill_payload = {
            "device_id": "treadmill-01",
            "username": "Cherry",
            "device_type": "treadmill",
            "heart_rate": random.randint(110, 170),
            "speed": round(random.uniform(4.0, 9.0), 1),
            "incline": round(random.uniform(0, 8), 1),
            "fatigue_score": round(random.uniform(0.2, 0.9), 2),
            "calories": round(random.uniform(50, 180), 1),
            "status": "active"
        }

        strength_payload = {
            "device_id": "bench-01",
            "username": "Cherry",
            "device_type": "strength_machine",
            "heart_rate": random.randint(95, 160),
            "resistance": round(random.uniform(20, 80), 1),
            "rep_speed": round(random.uniform(0.8, 2.5), 2),
            "fatigue_score": round(random.uniform(0.2, 0.95), 2),
            "calories": round(random.uniform(20, 70), 1),
            "status": "active"
        }

        client.publish("gym/treadmill-01/telemetry", json.dumps(treadmill_payload), qos=1)
        client.publish("gym/bench-01/telemetry", json.dumps(strength_payload), qos=1)

        print("Published treadmill:", treadmill_payload)
        print("Published bench:", strength_payload)
        time.sleep(3)

except KeyboardInterrupt:
    print("Stopped publisher.")
finally:
    client.loop_stop()
    client.disconnect()