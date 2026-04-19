"""MQTT service for receiving data from edge devices."""
import json
import logging
from typing import Any

import paho.mqtt.client as mqtt

from backend.config import settings

logger = logging.getLogger(__name__)


class MQTTService:
    """MQTT service for subscribing to edge device messages."""

    def __init__(self):
        """Initialize MQTT service."""
        self.client = mqtt.Client()
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect

    def _on_connect(self, client: mqtt.Client, userdata: Any, flags: dict, rc: int):
        """Handle MQTT connection."""
        if rc == 0:
            logger.info("Connected to MQTT broker")
            # Subscribe to all installation topics
            client.subscribe("installations/+/battery/state", qos=1)
            client.subscribe("installations/+/inverters/+/power", qos=1)
            client.subscribe("installations/+/meter/reading", qos=1)
            if settings.ENABLE_GENERATOR:
                client.subscribe("installations/+/generator/status", qos=1)
            if settings.ENABLE_EV_CHARGERS:
                client.subscribe("installations/+/chargers/+/session", qos=1)
        else:
            logger.error(f"Failed to connect to MQTT broker: {rc}")

    def _on_message(self, client: mqtt.Client, userdata: Any, msg: mqtt.MQTTMessage):
        """Handle incoming MQTT message."""
        try:
            topic = msg.topic
            payload = json.loads(msg.payload.decode())
            logger.debug(f"Received message on {topic}: {payload}")
            
            # Route to appropriate handler
            self._handle_message(topic, payload)
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")

    def _on_disconnect(self, client: mqtt.Client, userdata: Any, rc: int):
        """Handle MQTT disconnection."""
        logger.warning(f"Disconnected from MQTT broker: {rc}")

    def _handle_message(self, topic: str, payload: dict):
        """Handle message based on topic pattern."""
        # Parse topic: installations/{id}/component/action
        parts = topic.split("/")
        if len(parts) < 3:
            return
        
        installation_id = int(parts[1])
        component = parts[2]
        
        # Route to database persistence (simplified)
        logger.info(f"Processing {component} data for installation {installation_id}")

    def start(self):
        """Start MQTT service."""
        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
        
        try:
            broker_url = settings.MQTT_BROKER_TLS_URL or settings.MQTT_BROKER_URL
            if broker_url.startswith("mqtts://"):
                self.client.tls_set()
                broker_url = broker_url.replace("mqtts://", "").replace("mqtt://", "")
            else:
                broker_url = broker_url.replace("mqtt://", "")
            
            host, port = broker_url.split(":") if ":" in broker_url else (broker_url, 1883)
            self.client.connect(host, int(port), 60)
            self.client.loop_start()
        except Exception as e:
            logger.error(f"Failed to start MQTT service: {e}")

    def stop(self):
        """Stop MQTT service."""
        self.client.loop_stop()
        self.client.disconnect()


# Global MQTT service instance
mqtt_service = MQTTService()

