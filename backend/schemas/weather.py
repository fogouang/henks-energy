"""Weather schemas for OpenWeather API integration."""
from typing import Literal

from pydantic import BaseModel, Field


class WeatherData(BaseModel):
    """Weather data for a specific day."""

    temperature: float = Field(..., description="Temperature in Celsius")
    wind_speed: float = Field(..., description="Wind speed in km/h")
    wind_direction: str = Field(..., description="Wind direction (E, W, N, S, NE, NW, SE, SW)")
    rain_chance: float = Field(..., description="Precipitation probability as percentage (0-100)")
    icon: Literal["cloud", "sun", "rain", "snow"] = Field(..., description="Weather icon type")
    date: str = Field(..., description="Date in ISO format")


class WeatherResponse(BaseModel):
    """Weather response with today and tomorrow forecast."""

    today: WeatherData
    tomorrow: WeatherData

