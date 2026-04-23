"""FastAPI application main file."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database import close_db, init_db
from backend.routers import auth, edge_devices, installations, measurements, system_settings, users
from backend.routers.firmware import admin_router as firmware_admin_router
from backend.routers.firmware import device_router as firmware_device_router
from backend.services.scheduler import setup_scheduler
from backend.routers.epex import router as epex_router


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    await init_db()

    # Start scheduler
    scheduler = setup_scheduler()
    scheduler.start()
    logger.info("Background scheduler started.")

    yield

    # Shutdown
    scheduler.shutdown()
    logger.info("Background scheduler stopped.")
    await close_db()


app = FastAPI(
    title="JSEnergy Dashboard API",
    description="Battery & Solar Monitoring System API",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS middleware
if settings.CORS_ORIGINS == "*":
    cors_origins = ["*"]
    allow_credentials = False
    logger.warning("CORS_ORIGINS is set to '*'. allow_credentials will be set to False.")
else:
    cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
    allow_credentials = True

logger.info(f"CORS configured with origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(users.router, prefix=settings.API_V1_PREFIX)
app.include_router(system_settings.router, prefix=settings.API_V1_PREFIX)
app.include_router(edge_devices.router, prefix=settings.API_V1_PREFIX)
app.include_router(installations.router, prefix=settings.API_V1_PREFIX)
app.include_router(measurements.router, prefix=settings.API_V1_PREFIX)
app.include_router(firmware_admin_router, prefix=settings.API_V1_PREFIX)
app.include_router(firmware_device_router, prefix=settings.API_V1_PREFIX)
app.include_router(epex_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "JSEnergy Dashboard API", "version": "2.0.0"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}