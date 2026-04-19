"""
Example MQTT publish pattern for Raspberry Pi developers.

This is a reference example only - not production code.
Developers should implement their own data collection and MQTT publishing logic.
"""
import json
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

# Configuration
INSTALLATION_ID = 1
MQTT_BROKER = "mqtt.example.com"
MQTT_PORT = 1884  # External port (maps to 1883 inside Docker container)
MQTT_USERNAME = "jsenergy"
MQTT_PASSWORD = "your_password"
MQTT_QOS = 1

# Create MQTT client
client = mqtt.Client()
client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)


def on_connect(client, userdata, flags, rc):
    """Handle MQTT connection."""
    if rc == 0:
        print("Connected to MQTT broker")
    else:
        print(f"Failed to connect: {rc}")


def publish_battery_state(soc_percentage, power_kw, voltage=None, temperature=None):
    """Publish battery state to MQTT."""
    topic = f"installations/{INSTALLATION_ID}/battery/state"
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "installation_id": INSTALLATION_ID,
        "soc_percentage": soc_percentage,
        "power_kw": power_kw,
        "voltage": voltage,
        "temperature": temperature,
        "status": "charging" if power_kw > 0 else "discharging" if power_kw < 0 else "idle",
    }
    client.publish(topic, json.dumps(payload), qos=MQTT_QOS)


def publish_inverter_power(inverter_number, power_kw, energy_kwh_daily=0.0, curtailment_percentage=0.0):
    """Publish inverter power to MQTT."""
    topic = f"installations/{INSTALLATION_ID}/inverters/{inverter_number}/power"
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "installation_id": INSTALLATION_ID,
        "inverter_number": inverter_number,
        "power_kw": power_kw,
        "energy_kwh_daily": energy_kwh_daily,
        "curtailment_percentage": curtailment_percentage,
        "status": "active",
    }
    client.publish(topic, json.dumps(payload), qos=MQTT_QOS)


def publish_meter_reading(import_kw, export_kw, import_kwh=0.0, export_kwh=0.0, l1_a=0.0, l2_a=0.0, l3_a=0.0):
    """Publish meter reading to MQTT."""
    topic = f"installations/{INSTALLATION_ID}/meter/reading"
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "installation_id": INSTALLATION_ID,
        "import_kw": import_kw,
        "export_kw": export_kw,
        "import_kwh": import_kwh,
        "export_kwh": export_kwh,
        "l1_a": l1_a,
        "l2_a": l2_a,
        "l3_a": l3_a,
    }
    client.publish(topic, json.dumps(payload), qos=MQTT_QOS)


# Main loop example
if __name__ == "__main__":
    client.on_connect = on_connect
    
    # Connect to broker
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()
    
    try:
        while True:
            # Example: Read sensor data and publish
            # Replace with actual sensor reading logic
            
            # Publish battery state
            publish_battery_state(soc_percentage=75.5, power_kw=2.5, voltage=48.2, temperature=25.3)
            
            # Publish inverter power
            publish_inverter_power(inverter_number=1, power_kw=4.2, energy_kwh_daily=12.5)
            
            # Publish meter reading
            publish_meter_reading(import_kw=0.5, export_kw=2.0, l1_a=2.1, l2_a=2.0, l3_a=2.2)
            
            # Wait 5 seconds before next publish
            time.sleep(5)
            
    except KeyboardInterrupt:
        print("Stopping...")
        client.loop_stop()
        client.disconnect()

