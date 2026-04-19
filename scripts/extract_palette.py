#!/usr/bin/env python3
"""
Extract dominant colors from dashboard theme images.
Returns 6 colors: background, surface, border, text, accent1, accent2
"""

import sys
from pathlib import Path
from PIL import Image
import colorsys
from collections import Counter

def rgb_to_hex(r, g, b):
    return f"#{r:02x}{g:02x}{b:02x}".upper()

def get_dominant_colors(image_path, num_colors=10):
    """Extract dominant colors from an image."""
    try:
        img = Image.open(image_path)
        # Resize for faster processing
        img = img.resize((300, 300))
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Get all pixels
        pixels = list(img.getdata())
        
        # Count color frequencies
        color_counts = Counter(pixels)
        
        # Get most common colors
        most_common = color_counts.most_common(num_colors)
        
        return [rgb_to_hex(r, g, b) for (r, g, b), count in most_common]
    except Exception as e:
        print(f"Error processing {image_path}: {e}", file=sys.stderr)
        return []

def categorize_colors(colors):
    """Categorize colors into theme roles."""
    categorized = {
        'background': None,
        'surface': None,
        'border': None,
        'text': None,
        'accent1': None,
        'accent2': None
    }
    
    # Convert hex to RGB for analysis
    def hex_to_rgb(hex_color):
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    def get_brightness(rgb):
        r, g, b = rgb
        return (r * 299 + g * 587 + b * 114) / 1000
    
    def get_saturation(rgb):
        r, g, b = [x/255.0 for x in rgb]
        h, s, v = colorsys.rgb_to_hsv(r, g, b)
        return s
    
    rgb_colors = [(hex_to_rgb(c), c) for c in colors]
    
    # Sort by brightness
    rgb_colors.sort(key=lambda x: get_brightness(x[0]))
    
    # Background: darkest color
    categorized['background'] = rgb_colors[0][1]
    
    # Surface: second darkest (but not too dark)
    for rgb, hex_color in rgb_colors[1:]:
        brightness = get_brightness(rgb)
        if 20 < brightness < 80:
            categorized['surface'] = hex_color
            break
    
    # Border: medium brightness, low saturation
    for rgb, hex_color in rgb_colors:
        brightness = get_brightness(rgb)
        saturation = get_saturation(rgb)
        if 40 < brightness < 100 and saturation < 0.3:
            categorized['border'] = hex_color
            break
    
    # Text: lightest color (high brightness)
    for rgb, hex_color in reversed(rgb_colors):
        brightness = get_brightness(rgb)
        if brightness > 200:
            categorized['text'] = hex_color
            break
    
    # Accents: high saturation, medium-high brightness
    accents = []
    for rgb, hex_color in rgb_colors:
        brightness = get_brightness(rgb)
        saturation = get_saturation(rgb)
        if saturation > 0.5 and 100 < brightness < 220:
            accents.append((saturation, brightness, hex_color))
    
    accents.sort(reverse=True)  # Sort by saturation
    
    if len(accents) >= 2:
        categorized['accent1'] = accents[0][2]  # Highest saturation
        categorized['accent2'] = accents[1][2]  # Second highest
    elif len(accents) == 1:
        categorized['accent1'] = accents[0][2]
        # Use a complementary teal/cyan if only one accent found
        categorized['accent2'] = '#00CED1'
    else:
        # Fallback based on image descriptions
        categorized['accent1'] = '#FF6B35'  # Vibrant orange
        categorized['accent2'] = '#00CED1'  # Teal/cyan
    
    # Fill any missing with reasonable defaults
    if not categorized['surface']:
        categorized['surface'] = '#2D3748'
    if not categorized['border']:
        categorized['border'] = '#4A5568'
    if not categorized['text']:
        categorized['text'] = '#F7FAFC'
    
    return categorized

def main():
    image_paths = [
        Path(__file__).parent.parent / "theme" / "2026-01-18 01.05.24.jpg",
        Path(__file__).parent.parent / "theme" / "2026-01-18 01.06.34.jpg",
        Path(__file__).parent.parent / "theme" / "2026-01-18 01.06.39.jpg",
    ]
    
    all_colors = []
    for img_path in image_paths:
        if not img_path.exists():
            print(f"Warning: {img_path} not found", file=sys.stderr)
            continue
        colors = get_dominant_colors(img_path, num_colors=15)
        all_colors.extend(colors)
    
    if not all_colors:
        print("Error: No colors extracted from images", file=sys.stderr)
        sys.exit(1)
    
    # Get unique colors and their frequencies
    color_counts = Counter(all_colors)
    top_colors = [color for color, count in color_counts.most_common(20)]
    
    # Categorize
    palette = categorize_colors(top_colors)
    
    # Output as JSON-like format
    print("Extracted Palette:")
    print(f"  background: {palette['background']}")
    print(f"  surface: {palette['surface']}")
    print(f"  border: {palette['border']}")
    print(f"  text: {palette['text']}")
    print(f"  accent1: {palette['accent1']}")
    print(f"  accent2: {palette['accent2']}")
    
    # Also output as Python dict for easy copy-paste
    print("\nPython dict:")
    print("{")
    for key, value in palette.items():
        print(f"  '{key}': '{value}',")
    print("}")

if __name__ == "__main__":
    main()
