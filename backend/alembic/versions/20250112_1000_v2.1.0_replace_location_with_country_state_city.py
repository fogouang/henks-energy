"""v2.1.0: Replace location field with country, state, city fields

Revision ID: 20250112_1000_v2.1.0
Revises: 20250111_1600_v2.0.0
Create Date: 2025-01-12 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20250112_1000_v2.1.0"
down_revision: Union[str, None] = "20250111_1600_v2.0.0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add new columns
    op.add_column("installations", sa.Column("country", sa.String(length=100), nullable=True))
    op.add_column("installations", sa.Column("state", sa.String(length=100), nullable=True))
    op.add_column("installations", sa.Column("city", sa.String(length=100), nullable=True))
    
    # Migrate existing location data
    # Try to parse common formats: "City, State, Country" or "City, Country"
    connection = op.get_bind()
    
    # Get all installations with location data
    result = connection.execute(
        sa.text("SELECT id, location FROM installations WHERE location IS NOT NULL AND location != ''")
    )
    installations = result.fetchall()
    
    # Common country mappings for migration
    country_mappings = {
        'netherlands': 'NL',
        'nederland': 'NL',
        'amsterdam': 'NL',
        'united states': 'US',
        'usa': 'US',
        'united kingdom': 'GB',
        'uk': 'GB',
        'germany': 'DE',
        'deutschland': 'DE',
        'france': 'FR',
        'spain': 'ES',
        'italy': 'IT',
        'belgium': 'BE',
        'poland': 'PL',
    }
    
    for installation_id, location in installations:
        location_lower = location.lower().strip()
        parts = [p.strip() for p in location.split(',')]
        
        # Try to parse the location
        country_code = None
        state_name = None
        city_name = None
        
        if len(parts) >= 3:
            # Format: "City, State, Country"
            city_name = parts[0]
            state_name = parts[1]
            country_part = parts[-1].lower()
        elif len(parts) == 2:
            # Format: "City, Country" or "City, State"
            city_name = parts[0]
            second_part = parts[1].lower()
            # Check if second part is a known country
            if second_part in country_mappings:
                country_code = country_mappings[second_part]
            else:
                # Assume it's a state/province, try to guess country
                state_name = parts[1]
                # Default to NL if contains Amsterdam
                if 'amsterdam' in location_lower:
                    country_code = 'NL'
        elif len(parts) == 1:
            # Single part - try to identify
            city_name = parts[0]
            # Check if it's a known city that suggests a country
            if 'amsterdam' in location_lower:
                country_code = 'NL'
                city_name = 'Amsterdam'
        
        # Try to find country code from location string
        if not country_code:
            for key, code in country_mappings.items():
                if key in location_lower:
                    country_code = code
                    break
        
        # Default fallback
        if not country_code:
            country_code = 'NL'  # Default to Netherlands
        if not city_name:
            city_name = location.split(',')[0].strip() if location else 'Unknown'
        
        # Update the installation
        connection.execute(
            sa.text("""
                UPDATE installations 
                SET country = :country, state = :state, city = :city
                WHERE id = :id
            """),
            {
                'country': country_code,
                'state': state_name if state_name else None,
                'city': city_name,
                'id': installation_id
            }
        )
    
    # Make country and city NOT NULL after migration
    op.alter_column("installations", "country", nullable=False)
    op.alter_column("installations", "city", nullable=False)
    
    # Drop old location column and index
    op.drop_index("ix_installations_location", table_name="installations")
    op.drop_column("installations", "location")
    
    # Add indexes for new fields
    op.create_index("ix_installations_country", "installations", ["country"])
    op.create_index("ix_installations_state", "installations", ["state"])
    op.create_index("ix_installations_city", "installations", ["city"])


def downgrade() -> None:
    # Add back location column
    op.add_column("installations", sa.Column("location", sa.String(length=255), nullable=True))
    
    # Migrate data back (concatenate city, state, country)
    connection = op.get_bind()
    result = connection.execute(
        sa.text("SELECT id, city, state, country FROM installations")
    )
    installations = result.fetchall()
    
    for installation_id, city, state, country in installations:
        # Reconstruct location string
        location_parts = [city] if city else []
        if state:
            location_parts.append(state)
        if country:
            location_parts.append(country)
        location = ", ".join(location_parts)
        
        connection.execute(
            sa.text("UPDATE installations SET location = :location WHERE id = :id"),
            {'location': location, 'id': installation_id}
        )
    
    # Make location NOT NULL
    op.alter_column("installations", "location", nullable=False)
    
    # Drop new indexes
    op.drop_index("ix_installations_city", table_name="installations")
    op.drop_index("ix_installations_state", table_name="installations")
    op.drop_index("ix_installations_country", table_name="installations")
    
    # Drop new columns
    op.drop_column("installations", "city")
    op.drop_column("installations", "state")
    op.drop_column("installations", "country")
    
    # Recreate old index
    op.create_index("ix_installations_location", "installations", ["location"])

