"""Location schemas for countries, states, and cities."""
from typing import List

from pydantic import BaseModel, Field


class Country(BaseModel):
    """Country schema."""
    
    code: str = Field(..., description="ISO 3166-1 alpha-2 country code (e.g., 'NL', 'US')")
    name: str = Field(..., description="Country name")


class State(BaseModel):
    """State/Province schema."""
    
    code: str = Field(..., description="State/province code")
    name: str = Field(..., description="State/province name")


class City(BaseModel):
    """City schema."""
    
    name: str = Field(..., description="City name")


class CountryList(BaseModel):
    """List of countries."""
    
    countries: List[Country]


class StateList(BaseModel):
    """List of states/provinces."""
    
    states: List[State]


class CityList(BaseModel):
    """List of cities."""
    
    cities: List[City]

