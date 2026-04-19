"""Weather data caching service using Redis."""
import json
import logging
from datetime import timedelta
from typing import Optional

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None  # type: ignore

from backend.config import settings
from backend.schemas.weather import WeatherResponse

logger = logging.getLogger(__name__)


class WeatherCache:
    """Redis-based cache for weather data with TTL."""

    def __init__(self):
        """Initialize the Redis cache."""
        self._redis_client: Optional[redis.Redis] = None
        self._redis_connected = False
        # Cache TTL: 30 minutes (1800 seconds)
        self._ttl_seconds = 1800  # 30 minutes
        
        if not REDIS_AVAILABLE:
            logger.warning("Redis module not available. Using in-memory cache.")
            self._redis_client = None
            self._redis_connected = False
            self._fallback_cache: dict[str, tuple[WeatherResponse, float]] = {}
            return
        
        try:
            self._redis_client = redis.from_url(  # type: ignore
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )
            # Test connection
            self._redis_client.ping()
            self._redis_connected = True
            logger.info(f"Connected to Redis at {settings.REDIS_URL}")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}. Falling back to in-memory cache.")
            self._redis_client = None
            self._redis_connected = False
            # Fallback to in-memory cache
            self._fallback_cache: dict[str, tuple[WeatherResponse, float]] = {}

    def _get_cache_key(self, installation_id: int, location: str, date: str) -> str:
        """Generate cache key from installation ID, location, and date."""
        return f"weather:{installation_id}:{location}:{date}"

    def get(
        self, installation_id: int, location: str, today_date: str, tomorrow_date: str
    ) -> Optional[WeatherResponse]:
        """
        Get cached weather data if available and not expired.
        
        Returns:
            WeatherResponse if cached data exists and is valid, None otherwise
        """
        cache_key = self._get_cache_key(installation_id, location, today_date)
        
        if self._redis_connected and self._redis_client:
            try:
                cached_data = self._redis_client.get(cache_key)
                if cached_data:
                    weather_dict = json.loads(cached_data)
                    weather_response = WeatherResponse(**weather_dict)
                    logger.info(
                        f"Redis cache hit for installation {installation_id}, location {location}"
                    )
                    return weather_response
            except Exception as e:
                logger.warning(f"Error reading from Redis cache: {e}")
                # Fall through to fallback cache
        
        # Fallback to in-memory cache if Redis is not available
        if not self._redis_connected:
            import time
            cached_entry = self._fallback_cache.get(cache_key)
            if cached_entry:
                weather_response, timestamp = cached_entry
                current_time = time.time()
                if (current_time - timestamp) < self._ttl_seconds:
                    logger.info(
                        f"In-memory cache hit for installation {installation_id}, location {location}"
                    )
                    return weather_response
                else:
                    # Remove expired entry
                    self._fallback_cache.pop(cache_key, None)

        logger.debug(f"Cache miss for installation {installation_id}, location {location}")
        return None

    def set(
        self,
        installation_id: int,
        location: str,
        today_date: str,
        tomorrow_date: str,
        weather_response: WeatherResponse,
    ) -> None:
        """
        Store weather data in cache.
        
        Args:
            installation_id: Installation ID
            location: Location string
            today_date: Today's date string (ISO format)
            tomorrow_date: Tomorrow's date string (ISO format)
            weather_response: Weather response to cache
        """
        cache_key = self._get_cache_key(installation_id, location, today_date)
        
        if self._redis_connected and self._redis_client:
            try:
                # Convert WeatherResponse to dict for JSON serialization
                weather_dict = weather_response.model_dump()
                cached_data = json.dumps(weather_dict)
                # Store in Redis with TTL
                self._redis_client.setex(cache_key, self._ttl_seconds, cached_data)
                logger.info(
                    f"Cached weather data in Redis for installation {installation_id}, location {location}"
                )
                return
            except Exception as e:
                logger.warning(f"Error writing to Redis cache: {e}")
                # Fall through to fallback cache
        
        # Fallback to in-memory cache if Redis is not available
        if not self._redis_connected:
            import time
            self._fallback_cache[cache_key] = (weather_response, time.time())
            logger.info(
                f"Cached weather data in memory for installation {installation_id}, location {location}"
            )

    def clear_expired(self) -> int:
        """
        Remove expired entries from cache.
        Redis handles TTL automatically, so this mainly cleans up fallback cache.
        
        Returns:
            Number of entries removed
        """
        if not self._redis_connected:
            import time
            expired_keys = []
            current_time = time.time()
            
            for key, (_, timestamp) in self._fallback_cache.items():
                if (current_time - timestamp) > self._ttl_seconds:
                    expired_keys.append(key)
            
            for key in expired_keys:
                self._fallback_cache.pop(key, None)
            
            if expired_keys:
                logger.debug(f"Cleared {len(expired_keys)} expired cache entries from fallback cache")
            
            return len(expired_keys)
        
        # Redis handles expiration automatically via TTL
        return 0

    def clear_all(self) -> None:
        """Clear all cached data."""
        if self._redis_connected and self._redis_client:
            try:
                # Delete all weather cache keys
                keys = self._redis_client.keys("weather:*")
                if keys:
                    self._redis_client.delete(*keys)
                    logger.info(f"Cleared {len(keys)} entries from Redis cache")
            except Exception as e:
                logger.warning(f"Error clearing Redis cache: {e}")
        else:
            count = len(self._fallback_cache)
            self._fallback_cache.clear()
            logger.info(f"Cleared all weather cache ({count} entries) from fallback cache")

    def get_stats(self) -> dict:
        """Get cache statistics."""
        if self._redis_connected and self._redis_client:
            try:
                keys = self._redis_client.keys("weather:*")
                return {
                    "total_entries": len(keys),
                    "backend": "redis",
                    "connected": True,
                }
            except Exception as e:
                logger.warning(f"Error getting Redis stats: {e}")
                return {"backend": "redis", "connected": False, "total_entries": 0}
        else:
            import time
            current_time = time.time()
            valid_count = sum(
                1
                for _, (_, timestamp) in self._fallback_cache.items()
                if (current_time - timestamp) < self._ttl_seconds
            )
            return {
                "total_entries": len(self._fallback_cache),
                "valid_entries": valid_count,
                "expired_entries": len(self._fallback_cache) - valid_count,
                "backend": "memory",
                "connected": False,
            }


# Global cache instance
weather_cache = WeatherCache()

