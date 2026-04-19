# Edge Device Integration Guide

This guide provides specifications for integrating Raspberry Pi edge devices with the JSEnergy Dashboard system via MQTT.

## MQTT Broker Connection

### Connection Details
- **Broker URL**: Configured via `MQTT_BROKER_URL` environment variable
- **Port**: 1883 (non-TLS) or 8883 (TLS)
- **Authentication**: Username/password (configured via `MQTT_USERNAME` and `MQTT_PASSWORD`)
- **TLS**: Optional, recommended for production

### Connection Requirements
- Use MQTT QoS level 1 (at least once delivery)
- Implement automatic reconnection with exponential backoff
- Publish messages every 3-5 seconds for real-time data
- Buffer messages locally during network outages

## Topic Structure

All topics follow the pattern: `installations/{installation_id}/{component}/{action}`

### Battery State
- **Topic**: `installations/{installation_id}/battery/state`
- **QoS**: 1
- **Frequency**: Every 5 seconds

### Inverter Power
- **Topic**: `installations/{installation_id}/inverters/{inverter_number}/power`
- **QoS**: 1
- **Frequency**: Every 5 seconds

### Meter Reading
- **Topic**: `installations/{installation_id}/meter/reading`
- **QoS**: 1
- **Frequency**: Every 5 seconds

### Generator Status (if enabled)
- **Topic**: `installations/{installation_id}/generator/status`
- **QoS**: 1
- **Frequency**: Every 1 minute

### EV Charger Session (if enabled)
- **Topic**: `installations/{installation_id}/chargers/{charger_number}/session`
- **QoS**: 1
- **Frequency**: Every 1 minute (or on state change)

## Message Format

All messages must be valid JSON with the following structure:

```json
{
  "timestamp": "2025-01-09T14:30:00Z",
  "installation_id": 1,
  "data": { ... }
}
```

### Timestamp Format
- ISO 8601 format with timezone (UTC)
- Example: `2025-01-09T14:30:00Z`

## Example Messages

See `edge-device/examples/example_messages.json` for complete examples of all message types.

## Error Handling

- Validate JSON before publishing
- Implement retry logic for failed publishes
- Log errors for debugging
- Use local buffer during network outages

## Security

- Use TLS for production deployments
- Authenticate with username/password
- Consider client certificates for additional security
- Never expose MQTT broker to public internet without proper security

