"""Comprehensive edge device API endpoint testing script."""
import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple

import httpx

# Test configuration
API_URL = "http://localhost:8000"
INSTALLATION_ID = 37
DEVICE_TOKEN = "Rym06bfqYbMrZnaiitzVKTIWU1CqP9Gc0P6qqjLmpRc"

# Test results tracking
test_results = {
    "passed": [],
    "failed": [],
    "skipped": []
}


class Colors:
    """ANSI color codes for terminal output."""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_test(name: str, status: str, message: str = ""):
    """Print test result with color coding."""
    if status == "PASS":
        print(f"{Colors.GREEN}✓{Colors.RESET} {name}")
        test_results["passed"].append(name)
    elif status == "FAIL":
        print(f"{Colors.RED}✗{Colors.RESET} {name}: {message}")
        test_results["failed"].append((name, message))
    elif status == "SKIP":
        print(f"{Colors.YELLOW}⊘{Colors.RESET} {name}: {message}")
        test_results["skipped"].append((name, message))
    else:
        print(f"{Colors.BLUE}ℹ{Colors.RESET} {name}: {message}")


async def make_request(
    client: httpx.AsyncClient,
    method: str,
    url: str,
    device_token: Optional[str] = None,
    json_data: Optional[list | Dict] = None,
    expected_status: int = 200,
    description: str = ""
) -> Tuple[bool, Optional[Dict | list], Optional[str]]:
    """Make HTTP request and validate response."""
    headers = {
        "Content-Type": "application/json"
    }
    if device_token:
        headers["X-Device-Token"] = device_token
    
    try:
        response = await client.request(
            method=method,
            url=url,
            headers=headers,
            json=json_data,
            timeout=10.0
        )
        
        success = response.status_code == expected_status
        error_msg = ""
        
        if not success:
            try:
                error_detail = response.json().get("detail", response.text)
                error_msg = f"Expected {expected_status}, got {response.status_code}. {error_detail}"
            except:
                error_msg = f"Expected {expected_status}, got {response.status_code}. {response.text[:200]}"
        
        try:
            data = response.json() if response.content else None
        except:
            data = None
        
        return success, data, error_msg
        
    except Exception as e:
        return False, None, f"Request failed: {str(e)}"


async def test_device_configuration(client: httpx.AsyncClient):
    """Test device configuration endpoints."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== Device Configuration Tests ==={Colors.RESET}")
    
    # Get inverters
    success, data, error = await make_request(
        client, "GET", f"{API_URL}/api/installations/{INSTALLATION_ID}/inverters",
        device_token=DEVICE_TOKEN,
        expected_status=200,
        description="Get inverters"
    )
    if success and data:
        print_test("GET /api/installations/{id}/inverters", "PASS")
        inverters = data.get("inverters", []) if isinstance(data, dict) else data
        inverter_id = inverters[0]["id"] if inverters else None
    else:
        print_test("GET /api/installations/{id}/inverters", "FAIL", error)
        inverter_id = None
    
    # Get EV chargers
    success, data, error = await make_request(
        client, "GET", f"{API_URL}/api/installations/{INSTALLATION_ID}/chargers",
        device_token=DEVICE_TOKEN,
        expected_status=200,
        description="Get EV chargers"
    )
    if success and data:
        print_test("GET /api/installations/{id}/chargers", "PASS")
        chargers = data.get("chargers", []) if isinstance(data, dict) else data
        charger_id = chargers[0]["id"] if chargers else None
    else:
        print_test("GET /api/installations/{id}/chargers", "FAIL", error)
        charger_id = None
    
    return inverter_id, charger_id


async def test_battery_measurements(client: httpx.AsyncClient):
    """Test battery measurement endpoints."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== Battery Measurement Tests ==={Colors.RESET}")
    
    now = datetime.utcnow()
    measurements = [
        {
            "soc_percentage": 65.5,
            "power_kw": -2.3,
            "voltage": 48.0,
            "temperature": 25.5,
            "timestamp": (now - timedelta(seconds=10)).isoformat() + "Z"
        },
        {
            "soc_percentage": 66.0,
            "power_kw": -2.1,
            "voltage": 48.1,
            "temperature": 25.6,
            "timestamp": (now - timedelta(seconds=5)).isoformat() + "Z"
        }
    ]
    
    success, data, error = await make_request(
        client, "POST", f"{API_URL}/api/installations/{INSTALLATION_ID}/measurements/battery",
        device_token=DEVICE_TOKEN,
        json_data=measurements,
        expected_status=201,
        description="Send battery measurements"
    )
    if success and data:
        print_test("POST /api/installations/{id}/measurements/battery", "PASS")
        return True
    else:
        print_test("POST /api/installations/{id}/measurements/battery", "FAIL", error)
        return False


async def test_inverter_measurements(client: httpx.AsyncClient, inverter_id: Optional[int]):
    """Test inverter measurement endpoints."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== Inverter Measurement Tests ==={Colors.RESET}")
    
    if not inverter_id:
        print_test("POST /api/installations/{id}/measurements/inverter/{inverter_id}", "SKIP", "No inverter available")
        return False
    
    now = datetime.utcnow()
    measurements = [
        {
            "power_kw": 3.2,
            "energy_kwh_daily": 12.5,
            "curtailment_percentage": 0.0,
            "timestamp": (now - timedelta(seconds=10)).isoformat() + "Z"
        },
        {
            "power_kw": 3.5,
            "energy_kwh_daily": 12.8,
            "curtailment_percentage": 0.0,
            "timestamp": (now - timedelta(seconds=5)).isoformat() + "Z"
        }
    ]
    
    success, data, error = await make_request(
        client, "POST", f"{API_URL}/api/installations/{INSTALLATION_ID}/measurements/inverter/{inverter_id}",
        device_token=DEVICE_TOKEN,
        json_data=measurements,
        expected_status=201,
        description="Send inverter measurements"
    )
    if success and data:
        print_test(f"POST /api/installations/{{id}}/measurements/inverter/{inverter_id}", "PASS")
        return True
    else:
        print_test(f"POST /api/installations/{{id}}/measurements/inverter/{inverter_id}", "FAIL", error)
        return False


async def test_meter_measurements(client: httpx.AsyncClient):
    """Test meter measurement endpoints."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== Meter Measurement Tests ==={Colors.RESET}")
    
    now = datetime.utcnow()
    measurements = [
        {
            "import_kw": 0.5,
            "export_kw": 1.2,
            "import_kwh": 12.5,
            "export_kwh": 28.8,
            "l1_a": 2.3,
            "l2_a": 2.1,
            "l3_a": 2.4,
            "timestamp": (now - timedelta(seconds=10)).isoformat() + "Z"
        },
        {
            "import_kw": 0.6,
            "export_kw": 1.3,
            "import_kwh": 12.6,
            "export_kwh": 28.9,
            "l1_a": 2.4,
            "l2_a": 2.2,
            "l3_a": 2.5,
            "timestamp": (now - timedelta(seconds=5)).isoformat() + "Z"
        }
    ]
    
    success, data, error = await make_request(
        client, "POST", f"{API_URL}/api/installations/{INSTALLATION_ID}/measurements/meter",
        device_token=DEVICE_TOKEN,
        json_data=measurements,
        expected_status=201,
        description="Send meter measurements"
    )
    if success and data:
        print_test("POST /api/installations/{id}/measurements/meter", "PASS")
        return True
    else:
        print_test("POST /api/installations/{id}/measurements/meter", "FAIL", error)
        return False


async def test_generator_measurements(client: httpx.AsyncClient):
    """Test generator measurement endpoints."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== Generator Measurement Tests ==={Colors.RESET}")
    
    now = datetime.utcnow()
    measurements = [
        {
            "status": "off",
            "fuel_consumption_lph": 0.0,
            "charging_power_kw": 0.0,
            "timestamp": (now - timedelta(seconds=10)).isoformat() + "Z"
        }
    ]
    
    success, data, error = await make_request(
        client, "POST", f"{API_URL}/api/installations/{INSTALLATION_ID}/measurements/generator",
        device_token=DEVICE_TOKEN,
        json_data=measurements,
        expected_status=201,
        description="Send generator measurements"
    )
    if success and data:
        print_test("POST /api/installations/{id}/measurements/generator", "PASS")
        return True
    else:
        # Generator might not be enabled, so 404 is acceptable
        if error and "404" in error:
            print_test("POST /api/installations/{id}/measurements/generator", "SKIP", "Generator feature not enabled")
        else:
            print_test("POST /api/installations/{id}/measurements/generator", "FAIL", error)
        return False


async def test_ev_charger_measurements(client: httpx.AsyncClient, charger_id: Optional[int]):
    """Test EV charger measurement endpoints."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== EV Charger Measurement Tests ==={Colors.RESET}")
    
    if not charger_id:
        print_test("POST /api/installations/{id}/measurements/charger/{charger_id}", "SKIP", "No EV charger available")
        return False
    
    now = datetime.utcnow()
    measurements = [
        {
            "power_kw": 7.2,
            "energy_kwh": 15.5,
            "source": "battery",
            "revenue_eur": 6.23,
            "timestamp": (now - timedelta(seconds=10)).isoformat() + "Z"
        }
    ]
    
    success, data, error = await make_request(
        client, "POST", f"{API_URL}/api/installations/{INSTALLATION_ID}/measurements/charger/{charger_id}",
        device_token=DEVICE_TOKEN,
        json_data=measurements,
        expected_status=201,
        description="Send EV charger measurements"
    )
    if success and data:
        print_test(f"POST /api/installations/{{id}}/measurements/charger/{charger_id}", "PASS")
        return True
    else:
        # EV charger might not be enabled, so 404 is acceptable
        if error and "404" in error:
            print_test(f"POST /api/installations/{{id}}/measurements/charger/{charger_id}", "SKIP", "EV charger feature not enabled")
        else:
            print_test(f"POST /api/installations/{{id}}/measurements/charger/{charger_id}", "FAIL", error)
        return False


async def test_authentication(client: httpx.AsyncClient):
    """Test device authentication."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== Authentication Tests ==={Colors.RESET}")
    
    # Test with valid token
    success, data, error = await make_request(
        client, "GET", f"{API_URL}/api/installations/{INSTALLATION_ID}/inverters",
        device_token=DEVICE_TOKEN,
        expected_status=200,
        description="Authenticate with device token"
    )
    if success:
        print_test("Device authentication (valid token)", "PASS")
    else:
        print_test("Device authentication (valid token)", "FAIL", error)
        return False
    
    # Test with invalid token
    success, _, _ = await make_request(
        client, "GET", f"{API_URL}/api/installations/{INSTALLATION_ID}/inverters",
        device_token="invalid_token",
        expected_status=401,
        description="Authenticate with invalid token"
    )
    if success:
        print_test("Device authentication (invalid token, 401)", "PASS")
    else:
        print_test("Device authentication (invalid token, 401)", "FAIL", "Should return 401")
    
    # Test without token
    success, _, _ = await make_request(
        client, "GET", f"{API_URL}/api/installations/{INSTALLATION_ID}/inverters",
        device_token=None,
        expected_status=401,
        description="Authenticate without token"
    )
    if success:
        print_test("Device authentication (no token, 401)", "PASS")
    else:
        print_test("Device authentication (no token, 401)", "FAIL", "Should return 401")
    
    return True


async def test_batch_measurements(client: httpx.AsyncClient):
    """Test batch measurement sending."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== Batch Measurement Tests ==={Colors.RESET}")
    
    now = datetime.utcnow()
    # Create a batch of 5 battery measurements
    measurements = []
    for i in range(5):
        measurements.append({
            "soc_percentage": 65.0 + i * 0.5,
            "power_kw": -2.0 - i * 0.1,
            "voltage": 48.0 + i * 0.1,
            "temperature": 25.0 + i * 0.2,
            "timestamp": (now - timedelta(seconds=30-i*5)).isoformat() + "Z"
        })
    
    success, data, error = await make_request(
        client, "POST", f"{API_URL}/api/installations/{INSTALLATION_ID}/measurements/battery",
        device_token=DEVICE_TOKEN,
        json_data=measurements,
        expected_status=201,
        description="Send batch battery measurements"
    )
    if success and data:
        print_test("POST /api/installations/{id}/measurements/battery (batch of 5)", "PASS")
        return True
    else:
        print_test("POST /api/installations/{id}/measurements/battery (batch of 5)", "FAIL", error)
        return False


async def test_duplicate_timestamp_handling(client: httpx.AsyncClient):
    """Test that duplicate timestamps are rejected."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== Duplicate Timestamp Validation Tests ==={Colors.RESET}")
    
    now = datetime.utcnow()
    timestamp = (now - timedelta(seconds=1)).isoformat() + "Z"
    measurements = [
        {
            "soc_percentage": 65.0,
            "power_kw": -2.0,
            "voltage": 48.0,
            "temperature": 25.0,
            "timestamp": timestamp
        },
        {
            "soc_percentage": 66.0,
            "power_kw": -2.1,
            "voltage": 48.1,
            "temperature": 25.1,
            "timestamp": timestamp  # Duplicate timestamp
        }
    ]
    
    success, _, error = await make_request(
        client, "POST", f"{API_URL}/api/installations/{INSTALLATION_ID}/measurements/battery",
        device_token=DEVICE_TOKEN,
        json_data=measurements,
        expected_status=400,  # Should reject duplicate timestamps
        description="Reject duplicate timestamps"
    )
    if success:
        print_test("Duplicate timestamp rejection (400)", "PASS")
    else:
        print_test("Duplicate timestamp rejection (400)", "FAIL", error)


async def main():
    """Run all edge device API tests."""
    print(f"{Colors.BOLD}{Colors.BLUE}")
    print("=" * 70)
    print("JSEnergy Edge Device API - Comprehensive Endpoint Tests")
    print("=" * 70)
    print(f"{Colors.RESET}")
    print(f"API URL: {API_URL}")
    print(f"Installation ID: {INSTALLATION_ID}")
    print(f"Device Token: {DEVICE_TOKEN[:20]}...")
    
    async with httpx.AsyncClient() as client:
        # Test authentication first
        auth_success = await test_authentication(client)
        if not auth_success:
            print(f"\n{Colors.RED}Authentication failed. Cannot continue with other tests.{Colors.RESET}")
            return
        
        # Get device configuration
        inverter_id, charger_id = await test_device_configuration(client)
        
        # Test all measurement endpoints
        await test_battery_measurements(client)
        await test_inverter_measurements(client, inverter_id)
        await test_meter_measurements(client)
        await test_generator_measurements(client)
        await test_ev_charger_measurements(client, charger_id)
        
        # Test batch operations
        await test_batch_measurements(client)
        
        # Test validation
        await test_duplicate_timestamp_handling(client)
    
    # Print summary
    print(f"\n{Colors.BOLD}{'=' * 70}{Colors.RESET}")
    print(f"{Colors.BOLD}Test Summary{Colors.RESET}")
    print(f"{Colors.BOLD}{'=' * 70}{Colors.RESET}")
    print(f"{Colors.GREEN}Passed: {len(test_results['passed'])}{Colors.RESET}")
    print(f"{Colors.RED}Failed: {len(test_results['failed'])}{Colors.RESET}")
    print(f"{Colors.YELLOW}Skipped: {len(test_results['skipped'])}{Colors.RESET}")
    
    if test_results['failed']:
        print(f"\n{Colors.RED}{Colors.BOLD}Failed Tests:{Colors.RESET}")
        for name, error in test_results['failed']:
            print(f"  - {name}: {error}")
    
    total = len(test_results['passed']) + len(test_results['failed']) + len(test_results['skipped'])
    if total > 0:
        success_rate = (len(test_results['passed']) / total) * 100
        print(f"\n{Colors.BOLD}Success Rate: {success_rate:.1f}%{Colors.RESET}")
    
    # Exit with error code if any tests failed
    if test_results['failed']:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

