"""Comprehensive API endpoint testing script."""
import asyncio
import json
import sys
from pathlib import Path
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta

import httpx

# Add /app to path so backend.* imports work
script_dir = Path(__file__).resolve().parent
app_dir = script_dir.parent  # /app
if str(app_dir) not in sys.path:
    sys.path.insert(0, str(app_dir))

from backend.config import settings

# Test configuration
BASE_URL = "http://localhost:8000"
API_PREFIX = "/api"
ADMIN_EMAIL = "admin@jsenergy.nl"
ADMIN_PASSWORD = "admin123"
TEST_USER_EMAIL = "testuser@example.com"
TEST_USER_PASSWORD = "super_secret"

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
    token: Optional[str] = None,
    json_data: Optional[Dict] = None,
    expected_status: int = 200,
    description: str = ""
) -> Tuple[bool, Optional[Dict], Optional[str]]:
    """Make HTTP request and validate response."""
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
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


async def test_authentication(client: httpx.AsyncClient) -> Optional[str]:
    """Test authentication endpoints and return access token."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== Authentication Tests ==={Colors.RESET}")
    
    # Test login
    success, data, error = await make_request(
        client, "POST", f"{BASE_URL}{API_PREFIX}/auth/login",
        json_data={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        expected_status=200,
        description="Login"
    )
    if success and data and "access_token" in data:
        print_test("POST /api/auth/login", "PASS")
        access_token = data["access_token"]
        refresh_token = data.get("refresh_token")
    else:
        print_test("POST /api/auth/login", "FAIL", error)
        return None
    
    # Test refresh token
    if refresh_token:
        success, data, error = await make_request(
            client, "POST", f"{BASE_URL}{API_PREFIX}/auth/refresh",
            json_data={"refresh_token": refresh_token},
            expected_status=200,
            description="Refresh token"
        )
        if success and data and "access_token" in data:
            print_test("POST /api/auth/refresh", "PASS")
            access_token = data["access_token"]  # Use new token
        else:
            print_test("POST /api/auth/refresh", "FAIL", error)
    
    # Test get current user
    success, data, error = await make_request(
        client, "GET", f"{BASE_URL}{API_PREFIX}/auth/me",
        token=access_token,
        expected_status=200,
        description="Get current user"
    )
    if success and data and "email" in data:
        print_test("GET /api/auth/me", "PASS")
    else:
        print_test("GET /api/auth/me", "FAIL", error)
    
    # Test invalid credentials
    success, _, _ = await make_request(
        client, "POST", f"{BASE_URL}{API_PREFIX}/auth/login",
        json_data={"email": ADMIN_EMAIL, "password": "wrong_password"},
        expected_status=401,
        description="Login with wrong password"
    )
    if success:
        print_test("POST /api/auth/login (invalid credentials)", "PASS")
    else:
        print_test("POST /api/auth/login (invalid credentials)", "FAIL", "Should return 401")
    
    return access_token


async def test_users(client: httpx.AsyncClient, admin_token: str):
    """Test user management endpoints."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== User Management Tests ==={Colors.RESET}")
    
    # List users
    success, data, error = await make_request(
        client, "GET", f"{BASE_URL}{API_PREFIX}/users",
        token=admin_token,
        expected_status=200,
        description="List users"
    )
    if success and data and "users" in data:
        print_test("GET /api/users", "PASS")
        user_id = data["users"][0]["id"] if data["users"] else None
    else:
        print_test("GET /api/users", "FAIL", error)
        return
    
    if not user_id:
        print_test("GET /api/users/{id}", "SKIP", "No users found")
        return
    
    # Get user by ID
    success, data, error = await make_request(
        client, "GET", f"{BASE_URL}{API_PREFIX}/users/{user_id}",
        token=admin_token,
        expected_status=200,
        description="Get user by ID"
    )
    if success and data and "id" in data:
        print_test(f"GET /api/users/{user_id}", "PASS")
    else:
        print_test(f"GET /api/users/{user_id}", "FAIL", error)
    
    # Get user installations
    success, data, error = await make_request(
        client, "GET", f"{BASE_URL}{API_PREFIX}/users/{user_id}/installations",
        token=admin_token,
        expected_status=200,
        description="Get user installations"
    )
    if success and data and "installations" in data:
        print_test(f"GET /api/users/{user_id}/installations", "PASS")
    else:
        print_test(f"GET /api/users/{user_id}/installations", "FAIL", error)
    
    # Create user
    test_email = f"test_{datetime.now().timestamp()}@example.com"
    success, data, error = await make_request(
        client, "POST", f"{BASE_URL}{API_PREFIX}/users",
        token=admin_token,
        json_data={
            "email": test_email,
            "role": "customer",
            "is_active": True,
            "full_name": "Test User",
            "language_preference": "nl"
        },
        expected_status=201,
        description="Create user"
    )
    if success and data and "email" in data:
        print_test("POST /api/users", "PASS")
        new_user_id = None  # We'd need to get this from the response or list
    else:
        print_test("POST /api/users", "FAIL", error)
    
    # Test 404 for non-existent user
    success, _, _ = await make_request(
        client, "GET", f"{BASE_URL}{API_PREFIX}/users/99999",
        token=admin_token,
        expected_status=404,
        description="Get non-existent user"
    )
    if success:
        print_test("GET /api/users/99999 (404)", "PASS")
    else:
        print_test("GET /api/users/99999 (404)", "FAIL", "Should return 404")


async def test_installations(client: httpx.AsyncClient, admin_token: str):
    """Test installation endpoints."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== Installation Tests ==={Colors.RESET}")
    
    # List installations
    success, data, error = await make_request(
        client, "GET", f"{BASE_URL}{API_PREFIX}/installations",
        token=admin_token,
        expected_status=200,
        description="List installations"
    )
    if success and data and "installations" in data:
        print_test("GET /api/installations", "PASS")
        installation_id = data["installations"][0]["id"] if data["installations"] else None
    else:
        print_test("GET /api/installations", "FAIL", error)
        return
    
    if not installation_id:
        print_test("GET /api/installations/{id}", "SKIP", "No installations found")
        return
    
    # Get installation by ID
    success, data, error = await make_request(
        client, "GET", f"{BASE_URL}{API_PREFIX}/installations/{installation_id}",
        token=admin_token,
        expected_status=200,
        description="Get installation by ID"
    )
    if success and data and "id" in data:
        print_test(f"GET /api/installations/{installation_id}", "PASS")
    else:
        print_test(f"GET /api/installations/{installation_id}", "FAIL", error)
    
    # Get live data
    success, data, error = await make_request(
        client, "GET", f"{BASE_URL}{API_PREFIX}/installations/{installation_id}/live",
        token=admin_token,
        expected_status=200,
        description="Get live installation data"
    )
    if success and data:
        print_test(f"GET /api/installations/{installation_id}/live", "PASS")
    else:
        print_test(f"GET /api/installations/{installation_id}/live", "FAIL", error)
    
    # Update installation
    success, data, error = await make_request(
        client, "PATCH", f"{BASE_URL}{API_PREFIX}/installations/{installation_id}",
        token=admin_token,
        json_data={"name": "Updated Test Installation"},
        expected_status=200,
        description="Update installation"
    )
    if success and data:
        print_test(f"PATCH /api/installations/{installation_id}", "PASS")
    else:
        print_test(f"PATCH /api/installations/{installation_id}", "FAIL", error)
    
    # Test 404 for non-existent installation
    success, _, _ = await make_request(
        client, "GET", f"{BASE_URL}{API_PREFIX}/installations/99999",
        token=admin_token,
        expected_status=404,
        description="Get non-existent installation"
    )
    if success:
        print_test("GET /api/installations/99999 (404)", "PASS")
    else:
        print_test("GET /api/installations/99999 (404)", "FAIL", "Should return 404")
    
    return installation_id


async def test_edge_devices(client: httpx.AsyncClient, admin_token: str, installation_id: int):
    """Test edge device endpoints - this is the critical test for the DELETE fix."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== Edge Device Tests ==={Colors.RESET}")
    
    # List edge devices
    success, data, error = await make_request(
        client, "GET", f"{BASE_URL}{API_PREFIX}/installations/{installation_id}/edge-devices",
        token=admin_token,
        expected_status=200,
        description="List edge devices"
    )
    if success and data and "devices" in data:
        print_test(f"GET /api/installations/{installation_id}/edge-devices", "PASS")
        device_id = data["devices"][0]["id"] if data["devices"] else None
    else:
        print_test(f"GET /api/installations/{installation_id}/edge-devices", "FAIL", error)
        device_id = None
    
    # Create edge device
    success, data, error = await make_request(
        client, "POST", f"{BASE_URL}{API_PREFIX}/installations/{installation_id}/edge-devices",
        token=admin_token,
        json_data={
            "name": f"Test Device {datetime.now().timestamp()}",
            "installation_id": installation_id,
            "description": "Test device for API testing"
        },
        expected_status=201,
        description="Create edge device"
    )
    if success and data and "id" in data:
        print_test(f"POST /api/installations/{installation_id}/edge-devices", "PASS")
        new_device_id = data["id"]
        device_token = data.get("token")
    else:
        print_test(f"POST /api/installations/{installation_id}/edge-devices", "FAIL", error)
        new_device_id = None
        device_token = None
    
    # Use existing device_id if available, otherwise use newly created one
    test_device_id = device_id or new_device_id
    
    if test_device_id:
        # Get edge device by ID
        success, data, error = await make_request(
            client, "GET", f"{BASE_URL}{API_PREFIX}/installations/{installation_id}/edge-devices/{test_device_id}",
            token=admin_token,
            expected_status=200,
            description="Get edge device by ID"
        )
        if success and data and "id" in data:
            print_test(f"GET /api/installations/{installation_id}/edge-devices/{test_device_id}", "PASS")
        else:
            print_test(f"GET /api/installations/{installation_id}/edge-devices/{test_device_id}", "FAIL", error)
        
        # Update edge device
        success, data, error = await make_request(
            client, "PATCH", f"{BASE_URL}{API_PREFIX}/installations/{installation_id}/edge-devices/{test_device_id}",
            token=admin_token,
            json_data={"name": "Updated Device Name"},
            expected_status=200,
            description="Update edge device"
        )
        if success and data:
            print_test(f"PATCH /api/installations/{installation_id}/edge-devices/{test_device_id}", "PASS")
        else:
            print_test(f"PATCH /api/installations/{installation_id}/edge-devices/{test_device_id}", "FAIL", error)
        
        # CRITICAL TEST: DELETE edge device - this was returning 404 before the fix
        success, data, error = await make_request(
            client, "DELETE", f"{BASE_URL}{API_PREFIX}/installations/{installation_id}/edge-devices/{test_device_id}",
            token=admin_token,
            expected_status=204,
            description="DELETE edge device (CRITICAL FIX TEST)"
        )
        if success:
            print_test(f"{Colors.GREEN}{Colors.BOLD}DELETE /api/installations/{installation_id}/edge-devices/{test_device_id} (FIXED!){Colors.RESET}", "PASS")
        else:
            print_test(f"{Colors.RED}{Colors.BOLD}DELETE /api/installations/{installation_id}/edge-devices/{test_device_id} (STILL BROKEN!){Colors.RESET}", "FAIL", error)
        
        # Test 404 for deleted/non-existent device
        success, _, _ = await make_request(
            client, "GET", f"{BASE_URL}{API_PREFIX}/installations/{installation_id}/edge-devices/{test_device_id}",
            token=admin_token,
            expected_status=404,
            description="Get deleted edge device (should be 404)"
        )
        if success:
            print_test(f"GET /api/installations/{installation_id}/edge-devices/{test_device_id} (404 after delete)", "PASS")
        else:
            print_test(f"GET /api/installations/{installation_id}/edge-devices/{test_device_id} (404 after delete)", "FAIL", "Should return 404")
    else:
        print_test("Edge device operations", "SKIP", "No device available for testing")
    
    # Test 404 for non-existent device
    success, _, _ = await make_request(
        client, "GET", f"{BASE_URL}{API_PREFIX}/installations/{installation_id}/edge-devices/99999",
        token=admin_token,
        expected_status=404,
        description="Get non-existent edge device"
    )
    if success:
        print_test("GET /api/installations/{id}/edge-devices/99999 (404)", "PASS")
    else:
        print_test("GET /api/installations/{id}/edge-devices/99999 (404)", "FAIL", "Should return 404")
    
    # Test DELETE on non-existent device (should return 404, not route error)
    success, _, _ = await make_request(
        client, "DELETE", f"{BASE_URL}{API_PREFIX}/installations/{installation_id}/edge-devices/99999",
        token=admin_token,
        expected_status=404,
        description="DELETE non-existent edge device"
    )
    if success:
        print_test("DELETE /api/installations/{id}/edge-devices/99999 (404)", "PASS")
    else:
        print_test("DELETE /api/installations/{id}/edge-devices/99999 (404)", "FAIL", "Should return 404, not routing error")


async def test_measurements(client: httpx.AsyncClient, admin_token: str, installation_id: int):
    """Test measurement endpoints."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== Measurement Tests ==={Colors.RESET}")
    
    # Get latest measurements
    success, data, error = await make_request(
        client, "GET", f"{BASE_URL}{API_PREFIX}/installations/{installation_id}/measurements/latest",
        token=admin_token,
        expected_status=200,
        description="Get latest measurements"
    )
    if success and data:
        print_test(f"GET /api/installations/{installation_id}/measurements/latest", "PASS")
    else:
        print_test(f"GET /api/installations/{installation_id}/measurements/latest", "FAIL", error)
    
    # Get historical data
    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=1)
    success, data, error = await make_request(
        client, "GET", f"{BASE_URL}{API_PREFIX}/installations/{installation_id}/history",
        token=admin_token,
        expected_status=200,
        description="Get historical data"
    )
    if success and data:
        print_test(f"GET /api/installations/{installation_id}/history", "PASS")
    else:
        print_test(f"GET /api/installations/{installation_id}/history", "FAIL", error)


async def test_error_handling(client: httpx.AsyncClient, admin_token: str):
    """Test error handling scenarios."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}=== Error Handling Tests ==={Colors.RESET}")
    
    # Test unauthorized access (no token)
    success, _, _ = await make_request(
        client, "GET", f"{BASE_URL}{API_PREFIX}/installations",
        token=None,
        expected_status=401,
        description="Access without token"
    )
    if success:
        print_test("GET /api/installations (no token, 401)", "PASS")
    else:
        print_test("GET /api/installations (no token, 401)", "FAIL", "Should return 401")
    
    # Test invalid token
    success, _, _ = await make_request(
        client, "GET", f"{BASE_URL}{API_PREFIX}/installations",
        token="invalid_token",
        expected_status=401,
        description="Access with invalid token"
    )
    if success:
        print_test("GET /api/installations (invalid token, 401)", "PASS")
    else:
        print_test("GET /api/installations (invalid token, 401)", "FAIL", "Should return 401")


async def main():
    """Run all API tests."""
    print(f"{Colors.BOLD}{Colors.BLUE}")
    print("=" * 60)
    print("JSEnergy Dashboard API - Comprehensive Endpoint Tests")
    print("=" * 60)
    print(f"{Colors.RESET}")
    
    async with httpx.AsyncClient() as client:
        # Test authentication and get token
        admin_token = await test_authentication(client)
        if not admin_token:
            print(f"\n{Colors.RED}Authentication failed. Cannot continue with other tests.{Colors.RESET}")
            return
        
        # Run all test suites
        await test_users(client, admin_token)
        installation_id = await test_installations(client, admin_token)
        if installation_id:
            await test_edge_devices(client, admin_token, installation_id)
            await test_measurements(client, admin_token, installation_id)
        await test_error_handling(client, admin_token)
    
    # Print summary
    print(f"\n{Colors.BOLD}{'=' * 60}{Colors.RESET}")
    print(f"{Colors.BOLD}Test Summary{Colors.RESET}")
    print(f"{Colors.BOLD}{'=' * 60}{Colors.RESET}")
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

