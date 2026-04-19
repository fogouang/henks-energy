"""WebSocket service for real-time updates using Pusher HTTP API (Soketi-compatible)."""
import asyncio
import logging
from typing import Optional

import pusher

from backend.config import settings

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections for real-time updates using Pusher HTTP API."""

    def __init__(self):
        """Initialize WebSocket manager (lazy initialization of Pusher client)."""
        self._pusher_client: Optional[pusher.Pusher] = None
        self._initialized = False

    def _ensure_initialized(self):
        """Lazy initialization of Pusher client - only create when needed."""
        if self._initialized:
            return
        
        print(f"[WEBSOCKET] Initializing Pusher client with configuration: {settings.SOKETI_APP_ID}, {settings.SOKETI_APP_KEY}, {settings.SOKETI_APP_SECRET}, {settings.SOKETI_HOST}, {settings.SOKETI_PORT}")
        logger.info(f"Initializing Pusher client with configuration: {settings.SOKETI_APP_ID}, {settings.SOKETI_APP_KEY}, {settings.SOKETI_APP_SECRET}, {settings.SOKETI_HOST}, {settings.SOKETI_PORT}")
        
        try:
            # Initialize Pusher client with Soketi configuration
            # Soketi is Pusher-compatible, so we can use the Pusher library directly
            self._pusher_client = pusher.Pusher(
                app_id=settings.SOKETI_APP_ID,
                key=settings.SOKETI_APP_KEY,
                secret=settings.SOKETI_APP_SECRET,
                host=settings.SOKETI_HOST,
                port=settings.SOKETI_PORT,
                ssl=False,  # Soketi uses HTTP in development
                cluster=settings.SOKETI_CLUSTER,
            )
            self._initialized = True
            logger.info(
                f"WebSocket manager initialized with Pusher client for Soketi at {settings.SOKETI_HOST}:{settings.SOKETI_PORT}"
            )
        except Exception as e:
            logger.error(
                f"Failed to initialize Pusher client for Soketi: {e}. \n"
                f"WebSocket broadcasts will be disabled. Check Soketi configuration. \n"
                f"SOKETI_APP_ID: {settings.SOKETI_APP_ID}\n"
                f"SOKETI_APP_KEY: {settings.SOKETI_APP_KEY}\n"
                f"SOKETI_APP_SECRET: {settings.SOKETI_APP_SECRET}\n"
                f"SOKETI_HOST: {settings.SOKETI_HOST}\n"
                f"SOKETI_PORT: {settings.SOKETI_PORT}\n"
                f"SOKETI_CLUSTER: {settings.SOKETI_CLUSTER}\n"
            )
            # Set initialized to True to prevent repeated attempts
            self._initialized = True
            self._pusher_client = None

    async def broadcast(self, installation_id: int, event: str, data: dict):
        """Broadcast data to all connected clients for an installation."""
        # Lazy initialization - only create Pusher client when actually needed
        self._ensure_initialized()
        
        if self._pusher_client is None:
            logger.warning(
                f"WebSocket manager not initialized, skipping broadcast of {event} "
                f"to installation {installation_id}"
            )
            return
        
        channel_name = f"installation-{installation_id}"
        try:
            logger.info(
                f"📡 Broadcasting {event} to channel {channel_name} for installation {installation_id}"
            )
            logger.debug(f"Broadcast data: {data}")
            
            # Pusher library is synchronous, so we wrap it in asyncio.to_thread()
            # to avoid blocking the async event loop
            def _trigger():
                """Synchronous trigger function to run in thread pool."""
                print(f"[WEBSOCKET] Triggering event {event} on channel {channel_name} with data {data}")
                return self._pusher_client.trigger(
                    [channel_name],
                    event,
                    data,
                )
            
            # Run the synchronous trigger in a thread pool
            response = await asyncio.to_thread(_trigger)
            
            logger.info(
                f"✅ Successfully broadcasted {event} to channel {channel_name} for installation {installation_id}"
            )
            logger.debug(f"Pusher response: {response}")
            
        except ConnectionError as e:
            error_msg = (
                f"Connection error broadcasting to Soketi via Pusher at {settings.SOKETI_HOST}:{settings.SOKETI_PORT}: {e}. "
                f"Check if Soketi is running and accessible from the backend container."
            )
            logger.error(error_msg)
            raise
        except TimeoutError as e:
            error_msg = f"Timeout error broadcasting to Soketi via Pusher: {e}"
            logger.error(error_msg)
            raise
        except ValueError as e:
            # Pusher library may raise ValueError for invalid parameters
            error_msg = f"Invalid parameters for Pusher trigger: {e}"
            logger.error(error_msg)
            raise
        except Exception as e:
            # Catch any other exceptions (HTTP errors, etc.)
            error_msg = f"Error broadcasting to Soketi via Pusher: {e}"
            logger.error(error_msg, exc_info=True)
            raise


# Global WebSocket manager
websocket_manager = WebSocketManager()
