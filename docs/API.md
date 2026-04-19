# API Documentation

The JSEnergy Dashboard API is a RESTful API built with FastAPI. Interactive API documentation is available at `/docs` when the backend is running.

## Base URL

- **Staging API**: `http://jsenergyapi.aitech.work/api`
- **Staging Dashboard**: `http://jsenergy.aitech.work`
- **Development**: `http://localhost:8000/api`
- **Production**: Configured via environment variables

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Endpoints

### Authentication

#### POST `/api/auth/login`
Login and receive JWT tokens.

**Request:**
```json
{
  "email": "admin@jsenergy.nl",
  "password": "password"
}
```

**Response:**
```json
{
  "access_token": "...",
  "refresh_token": "...",
  "token_type": "bearer",
  "expires_in": 900
}
```

#### POST `/api/auth/refresh`
Refresh access token.

**Request:**
```json
{
  "refresh_token": "..."
}
```

#### GET `/api/auth/me`
Get current user information.

**Headers:** `Authorization: Bearer <token>`

### User Management (Admin Only)

All user management endpoints require admin authentication.

#### GET `/api/users`
List all users (admin only). By default returns only non-deleted users.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `role` (optional): Filter by role (`admin` or `customer`)
- `is_active` (optional): Filter by active status (`true` or `false`)
- `include_deleted` (optional): If `true`, include soft-deleted users in the list. Default is `false`.

**Response:**
User objects include `deleted_at` (ISO 8601 datetime or `null`). When `include_deleted` is `true`, deleted users have a non-null `deleted_at`.

```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "role": "customer",
      "is_active": true,
      "full_name": "John Doe",
      "phone": "+31 6 12345678",
      "language_preference": "nl",
      "last_login_at": "2025-01-11T16:00:00Z",
      "created_at": "2025-01-10T10:00:00Z",
      "updated_at": "2025-01-11T16:00:00Z",
      "deleted_at": null
    }
  ],
  "total": 1
}
```

#### GET `/api/users/{user_id}`
Get user details.

**Headers:** `Authorization: Bearer <token>`

#### GET `/api/users/{user_id}/installations`
Get all installations for a specific user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "installations": [
    {
      "id": 1,
      "name": "Office Building A",
      "location": "Amsterdam, Netherlands",
      "timezone": "Europe/Amsterdam",
      "has_pv": true,
      "has_battery": true,
      "has_generator": false,
      "has_ev_chargers": false,
      "inverter_count": 2,
      "charger_count": 0,
      "created_at": "2025-01-10T10:00:00Z",
      "updated_at": "2025-01-10T10:00:00Z",
      "owner_email": "user@example.com"
    }
  ],
  "total": 1
}
```

#### POST `/api/users`
Create a new user account.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword123",
  "role": "customer",
  "is_active": true,
  "full_name": "Jane Doe",
  "phone": "+31 6 12345678",
  "language_preference": "nl"
}
```

**Note:** If `password` is not provided or empty, a random password will be generated.

**Response:**
```json
{
  "email": "newuser@example.com",
  "password": "generated-or-provided-password",
  "message": "Save these credentials - the password will not be shown again"
}
```

**Important:** The password is only returned once on creation. Save it immediately.

#### PATCH `/api/users/{user_id}`
Update user information.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "email": "updated@example.com",
  "role": "admin",
  "is_active": true,
  "full_name": "Updated Name",
  "phone": "+31 6 87654321",
  "language_preference": "en",
  "password": "newpassword123"
}
```

**Note:** All fields are optional. Only include fields you want to update. Password must be at least 12 characters if provided.

#### PATCH `/api/users/{user_id}/activate`
Activate a user account.

**Headers:** `Authorization: Bearer <token>`

#### PATCH `/api/users/{user_id}/deactivate`
Deactivate a user account.

**Headers:** `Authorization: Bearer <token>`

**Note:** Admins cannot deactivate themselves.

#### DELETE `/api/users/{user_id}`
Soft delete a user account (admin only).

**Headers:** `Authorization: Bearer <token>`

**Behavior:**
- Sets the user's `deleted_at` and `is_active = false`.
- Soft-deletes all `UserInstallation` records linking this user to installations.
- For each installation that had only this user as an association, the installation is soft-deleted (`deleted_at` set). Edge devices of such installations can no longer post data (device auth requires non-deleted installation).

**Note:** Admins cannot delete themselves.

### Installations

#### GET `/api/installations`
List all installations accessible to the current user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "installations": [
    {
      "id": 1,
      "name": "Office Building A",
      "location": "Amsterdam, Netherlands",
      "timezone": "Europe/Amsterdam",
      "has_pv": true,
      "has_battery": true,
      "has_generator": false,
      "has_ev_chargers": false,
      "inverter_count": 2,
      "charger_count": 0,
      "created_at": "2025-01-10T10:00:00Z",
      "updated_at": "2025-01-10T10:00:00Z",
      "owner_email": "user@example.com"
    }
  ],
  "total": 1
}
```

**Note:** For admin users, `owner_email` is included. For regular users, `owner_email` is `null`.

#### GET `/api/installations/{id}`
Get installation details.

**Headers:** `Authorization: Bearer <token>`

#### GET `/api/installations/{id}/component-data`
Get inverters and chargers for an installation with a `has_measurements` flag per component. Used by the edit-installation UI to show a data-loss warning when the user decreases inverter or charger count (removed slots that have measurement data will lose it).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "inverters": [
    { "inverter_number": 1, "has_measurements": true },
    { "inverter_number": 2, "has_measurements": false }
  ],
  "chargers": [
    { "charger_number": 1, "has_measurements": false }
  ]
}
```

#### POST `/api/installations`
Create a new installation.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "Office Building A",
  "location": "Amsterdam, Netherlands",
  "user_id": 1,
  "timezone": "Europe/Amsterdam",
  "has_pv": true,
  "has_battery": true,
  "has_generator": false,
  "has_ev_chargers": false,
  "inverter_count": 2,
  "charger_count": 0
}
```

**Note:** `user_id` is required. Admin users can create installations for any user. Regular users can only create installations for themselves. When `has_battery` is `true` a Battery record is auto-created. When `has_generator` is `true` a Generator record is auto-created. When `inverter_count > 0` the corresponding Inverter rows are created. When `has_ev_chargers` is `true` and `charger_count > 0` the corresponding EVCharger rows are created.

**Response:**
```json
{
  "id": 1,
  "name": "Office Building A",
  "location": "Amsterdam, Netherlands",
  "timezone": "Europe/Amsterdam",
  "has_pv": true,
  "has_battery": true,
  "has_generator": false,
  "has_ev_chargers": false,
  "inverter_count": 2,
  "charger_count": 0,
  "created_at": "2025-01-10T10:00:00Z",
  "updated_at": "2025-01-10T10:00:00Z",
  "owner_email": null
}
```

#### PATCH `/api/installations/{id}`
Update installation details.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "Updated Name",
  "location": "Updated Location",
  "timezone": "Europe/London",
  "has_pv": true,
  "has_battery": true,
  "has_generator": true,
  "has_ev_chargers": true,
  "inverter_count": 3,
  "charger_count": 2
}
```

**Note:** All fields are optional. Requires CONFIGURE access level or admin role. When `inverter_count` or `charger_count` is increased, the server creates the corresponding new Inverter or EVCharger rows. When decreased, the server removes the highest-numbered Inverter or EVCharger rows (and their measurements are deleted via cascade). When `has_generator` is changed to `true`, a Generator record is created (or restored if previously soft-deleted). When changed to `false`, the Generator record is soft-deleted.

#### PATCH `/api/installations/{id}/activate`
Activate an installation.

**Headers:** `Authorization: Bearer <token>`

#### PATCH `/api/installations/{id}/deactivate`
Deactivate an installation.

**Headers:** `Authorization: Bearer <token>`

#### DELETE `/api/installations/{id}`
Soft delete an installation.

**Headers:** `Authorization: Bearer <token>`

#### GET `/api/installations/{id}/live`
Get live snapshot of all components.

**Headers:** `Authorization: Bearer <token>`

### Measurements

#### GET `/api/installations/{id}/history`
Get historical measurement data.

**Query Parameters:**
- `start` (datetime): Start time
- `end` (datetime): End time
- `resolution` (string): "5m", "1h", or "1d"
- `components` (array): List of components to include

**Headers:** `Authorization: Bearer <token>`

### Edge Devices

Edge devices must belong to an installation. The `installation_id` is required when creating a device.

#### GET `/api/installations/{installation_id}/edge-devices`
List all edge devices for an installation.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "devices": [
    {
      "id": 1,
      "installation_id": 1,
      "name": "Raspberry Pi 1",
      "description": "Main monitoring device",
      "is_active": true,
      "last_seen_at": "2025-01-11T16:00:00Z",
      "created_at": "2025-01-11T15:00:00Z",
      "updated_at": "2025-01-11T15:00:00Z",
      "reverse_ssh_enabled": true
    }
  ],
  "total": 1
}
```

**Note:** Tokens are never returned in list responses for security. `reverse_ssh_enabled` is `true` if reverse SSH is enabled, or `false` if disabled or no configuration exists (default).

#### POST `/api/installations/{installation_id}/edge-devices`
Register a new edge device.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "Raspberry Pi 1",
  "installation_id": 1,
  "description": "Optional description"
}
```

**Note:** `installation_id` in the request body must match the `installation_id` in the URL path.

**Response:**
```json
{
  "id": 1,
  "device_id": 1,
  "installation_id": 1,
  "name": "Raspberry Pi 1",
  "token": "generated-secure-token-here",
  "description": "Optional description",
  "is_active": true,
  "last_seen_at": null,
  "created_at": "2025-01-11T15:00:00Z",
  "updated_at": "2025-01-11T15:00:00Z"
}
```

**⚠️ CRITICAL:** The token is only returned once on creation. Save it immediately - it cannot be retrieved later. If lost, you must regenerate the token.

#### GET `/api/installations/{installation_id}/edge-devices/{device_id}`
Get edge device details (without token).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": 1,
  "installation_id": 1,
  "name": "Raspberry Pi 1",
  "description": "Main monitoring device",
  "is_active": true,
  "last_seen_at": "2025-01-11T16:00:00Z",
  "created_at": "2025-01-11T15:00:00Z",
  "updated_at": "2025-01-11T15:00:00Z",
  "reverse_ssh_enabled": true
}
```

**Note:** `reverse_ssh_enabled` is `true` if reverse SSH is enabled, or `false` if disabled or no configuration exists (default).

#### PATCH `/api/installations/{installation_id}/edge-devices/{device_id}`
Update edge device.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "Updated name",
  "description": "Updated description",
  "is_active": true
}
```

#### DELETE `/api/installations/{installation_id}/edge-devices/{device_id}`
Delete edge device (soft delete).

**Headers:** `Authorization: Bearer <token>`

#### POST `/api/installations/{installation_id}/edge-devices/{device_id}/regenerate-token`
Regenerate device token.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": 1,
  "device_id": 1,
  "installation_id": 1,
  "name": "Raspberry Pi 1",
  "token": "new-generated-secure-token-here",
  "description": "Optional description",
  "is_active": true,
  "last_seen_at": "2025-01-11T16:00:00Z",
  "created_at": "2025-01-11T15:00:00Z",
  "updated_at": "2025-01-11T15:00:00Z"
}
```

**⚠️ CRITICAL:** The new token is only returned once on regeneration. Save it immediately - it cannot be retrieved later.

#### PATCH `/api/installations/{installation_id}/edge-devices/{device_id}/activate`
Activate an edge device.

**Headers:** `Authorization: Bearer <token>`

#### PATCH `/api/installations/{installation_id}/edge-devices/{device_id}/deactivate`
Deactivate an edge device.

**Headers:** `Authorization: Bearer <token>`

#### PATCH `/api/installations/{installation_id}/edge-devices/{device_id}/reverse-ssh/toggle`
Toggle Reverse SSH enabled/disabled state.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `enabled` (boolean, required): Set to `true` to enable or `false` to disable Reverse SSH

**Example:** `PATCH /api/installations/1/edge-devices/1/reverse-ssh/toggle?enabled=true`

**Response:**
```json
{
  "id": 1,
  "installation_id": 1,
  "name": "Raspberry Pi 1",
  "description": "Main monitoring device",
  "is_active": true,
  "last_seen_at": "2025-01-11T16:00:00Z",
  "created_at": "2025-01-11T15:00:00Z",
  "updated_at": "2025-01-11T15:00:00Z",
  "reverse_ssh_enabled": true
}
```

**Note:** If no Reverse SSH configuration exists and enabling, automatically creates one with systemwide default settings. If disabling and no config exists, returns success (already disabled by default).

### Edge Device Provisioning

When you register a new edge device, you receive a unique authentication token. This token must be configured on your edge device to authenticate API requests.

#### Environment Variables

After device registration, configure your edge device with these environment variables:

```bash
TOKEN=<device_token>
API_URL=http://localhost:8000
INSTALLATION_ID=<installation_id>
DEVICE_ID=<device_id>
```

**Example:**
```bash
TOKEN=abc123xyz789...
API_URL=http://jsenergyapi.aitech.work
INSTALLATION_ID=1
DEVICE_ID=1
```

#### Token Security

- **Never commit tokens to version control**
- **Store tokens securely on the edge device**
- **Rotate tokens if compromised** (use regenerate endpoint)
- **Tokens are only shown once** - save them immediately

#### Device Authentication

Edge devices authenticate using the token in one of two ways:

1. **Header Method (Recommended):**
   ```
   X-Device-Token: <device_token>
   ```

2. **Authorization Header Method:**
   ```
   Authorization: Device <device_token>
   ```

### Edge Device Measurements

These endpoints are authenticated using device tokens, not user JWT tokens.

**Authentication:** `X-Device-Token: <token>` or `Authorization: Device <token>`

**Base URL:** Use the `API_URL` from your environment variables (e.g., `http://jsenergyapi.aitech.work` for staging or `http://localhost:8000` for development)

#### POST `/api/installations/{installation_id}/measurements/battery`
Create battery measurement.

**Headers:** `X-Device-Token: <device_token>`

**Request:**
```json
{
  "soc_percentage": 65.5,
  "power_kw": -2.3,
  "voltage": 48.0,
  "temperature": 25.5,
  "timestamp": "2025-01-11T16:00:00Z"
}
```

#### POST `/api/installations/{installation_id}/measurements/inverter/{inverter_id}`
Create inverter measurement.

**Headers:** `X-Device-Token: <device_token>`

**Request:**
```json
{
  "power_kw": 3.2,
  "energy_kwh_daily": 12.5,
  "curtailment_percentage": 0.0,
  "timestamp": "2025-01-11T16:00:00Z"
}
```

#### POST `/api/installations/{installation_id}/measurements/meter`
Create meter measurement.

**Headers:** `X-Device-Token: <device_token>`

**Request:**
```json
{
  "import_kw": 0.5,
  "export_kw": 1.2,
  "import_kwh": 12.5,
  "export_kwh": 28.8,
  "l1_a": 2.3,
  "l2_a": 2.1,
  "l3_a": 2.4,
  "timestamp": "2025-01-11T16:00:00Z"
}
```

#### POST `/api/installations/{installation_id}/measurements/generator`
Create generator measurement (if generator feature enabled).

**Headers:** `X-Device-Token: <device_token>`

**Request:**
```json
{
  "status": "off",
  "fuel_consumption_lph": 0.0,
  "charging_power_kw": 0.0,
  "timestamp": "2025-01-11T16:00:00Z"
}
```

#### POST `/api/installations/{installation_id}/measurements/charger/{charger_id}`
Create EV charger measurement (if EV chargers feature enabled).

**Headers:** `X-Device-Token: <device_token>`

**Request:**
```json
{
  "power_kw": 7.2,
  "energy_kwh": 15.5,
  "source": "battery",
  "revenue_eur": 6.23,
  "timestamp": "2025-01-11T16:00:00Z"
}
```

**Note:** All measurement endpoints support batch operations (arrays of measurements). Send an array of measurement objects instead of a single object to upload multiple measurements at once.

#### POST `/api/installations/{installation_id}/measurements/bulk`
Upload measurements for all device types in a single API call (bulk upload).

**Headers:** `X-Device-Token: <device_token>`

**Request:**
```json
{
  "battery": [
    {
      "soc_percentage": 65.5,
      "power_kw": -2.3,
      "voltage": 48.0,
      "temperature": 25.5,
      "timestamp": "2025-01-11T16:00:00Z"
    }
  ],
  "inverter": {
    "inverter_id": 1,
    "measurements": [
      {
        "power_kw": 3.2,
        "energy_kwh_daily": 12.5,
        "curtailment_percentage": 0.0,
        "timestamp": "2025-01-11T16:00:00Z"
      }
    ]
  },
  "meter": [
    {
      "import_kw": 0.5,
      "export_kw": 1.2,
      "import_kwh": 12.5,
      "export_kwh": 28.8,
      "l1_a": 2.3,
      "l2_a": 2.1,
      "l3_a": 2.4,
      "timestamp": "2025-01-11T16:00:00Z"
    }
  ],
  "generator": [
    {
      "status": "off",
      "fuel_consumption_lph": 0.0,
      "charging_power_kw": 0.0,
      "timestamp": "2025-01-11T16:00:00Z"
    }
  ],
  "ev_charger": {
    "charger_id": 1,
    "measurements": [
      {
        "power_kw": 7.2,
        "energy_kwh": 15.5,
        "source": "battery",
        "revenue_eur": 6.23,
        "timestamp": "2025-01-11T16:00:00Z"
      }
    ]
  }
}
```

**Response:**
```json
{
  "accepted": 5,
  "total_rows_added": 5,
  "version": "2.0.0",
  "battery": [...],
  "inverter": [...],
  "meter": [...],
  "generator": [...],
  "ev_charger": [...],
  "errors": []
}
```

**Note:** 
- At least one device type must be provided with at least one measurement
- All measurements are processed atomically in a single transaction
- If any device type fails validation, the entire operation is rolled back
- Reduces network overhead and improves efficiency when collecting data from multiple devices simultaneously

### WebSocket

#### WS `/api/installations/{id}/stream`
WebSocket endpoint for real-time updates.

**Connection:** `ws://localhost:8000/api/installations/{id}/stream`

**Headers:** `Authorization: Bearer <token>`

Messages are sent every 3-5 seconds with current installation state.

## Data Relationships

The system follows a hierarchical structure:

```
Admin Users
  └── Customer Users
      └── Installations
          └── Edge Devices
              └── Measurements
```

**Rules:**
- **Installations** must belong to a user (`user_id` required on creation)
- **Edge Devices** must belong to an installation (`installation_id` required on creation)
- **Measurements** are associated with installations via device authentication
- Admin users can manage all users, installations, and devices
- Regular users can only manage their own installations and devices

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `204` - No Content (successful deletion)
- `400` - Bad Request (validation error, business logic error)
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

**Common Error Messages:**
- `"Invalid authentication credentials"` - Token expired or invalid
- `"Invalid refresh token"` - Refresh token expired or invalid
- `"Access denied to this installation"` - User doesn't have access
- `"User not found"` - User ID doesn't exist
- `"Installation not found"` - Installation ID doesn't exist
- `"Edge device not found"` - Device ID doesn't exist
- `"Cannot deactivate yourself"` - Admin trying to deactivate own account
- `"Cannot delete yourself"` - Admin trying to delete own account
- `"Installation with this name already exists"` - Duplicate installation name
- `"User with this email already exists"` - Duplicate email address
- `"Email already in use"` - Email taken by another user
- `"You can only create installations for yourself"` - Non-admin user trying to create for another user

## Rate Limiting

- Standard endpoints: 100 requests/minute per user
- Authentication endpoints: 10 requests/minute per IP
- Edge device endpoints: 1000 requests/minute per device token
- WebSocket: 1 active connection per installation per user

