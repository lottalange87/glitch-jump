#!/usr/bin/env python3
"""
Generate pixel art style app icons for Glitch Jump
"""
from PIL import Image, ImageDraw
import os

# Colors - Cyberpunk/Neon palette
DARK_BG = (15, 15, 35)  # Dark blue-black
NEON_PINK = (255, 0, 128)  # Hot pink
NEON_CYAN = (0, 255, 255)  # Cyan
NEON_PURPLE = (147, 0, 211)  # Purple
WHITE = (255, 255, 255)
GRID_COLOR = (30, 30, 60)

def create_pixel_art(size, output_path):
    """Create a pixel art style icon with GJ monogram"""
    img = Image.new('RGB', (size, size), DARK_BG)
    draw = ImageDraw.Draw(img)
    
    # Calculate pixel size for grid effect
    pixel_size = max(1, size // 32)  # 32x32 pixel grid
    
    # Draw subtle grid background
    for x in range(0, size, pixel_size):
        draw.line([(x, 0), (x, size)], fill=GRID_COLOR, width=1)
    for y in range(0, size, pixel_size):
        draw.line([(0, y), (size, y)], fill=GRID_COLOR, width=1)
    
    # Create "GJ" pixel art pattern (16x16 grid in center)
    # Scale pattern to fit icon
    pattern_scale = size // 16
    
    # G pattern (left side) - 7x11
    g_pattern = [
        "  XXXX ",
        " XX  XX",
        " XX    ",
        " XX    ",
        " XX XXX",
        " XX   X",
        " XX   X",
        " XX  XX",
        "  XXXX ",
    ]
    
    # J pattern (right side, offset) - 6x9
    j_pattern = [
        "  XXXX ",
        "    XX ",
        "    XX ",
        "    XX ",
        "    XX ",
        " XX XX ",
        "  XXX  ",
    ]
    
    # Center offset
    start_y = (size - len(g_pattern) * pattern_scale) // 2
    start_x_g = size // 4 - (len(g_pattern[0]) * pattern_scale) // 2
    start_x_j = 3 * size // 4 - (len(j_pattern[0]) * pattern_scale) // 2
    
    # Draw G
    for row_idx, row in enumerate(g_pattern):
        for col_idx, pixel in enumerate(row):
            if pixel == 'X':
                x = start_x_g + col_idx * pattern_scale
                y = start_y + row_idx * pattern_scale
                # Neon gradient effect
                if col_idx < 3:
                    color = NEON_PINK
                elif col_idx < 6:
                    color = NEON_PURPLE
                else:
                    color = NEON_CYAN
                draw.rectangle(
                    [x, y, x + pattern_scale - 1, y + pattern_scale - 1],
                    fill=color
                )
    
    # Draw J
    for row_idx, row in enumerate(j_pattern):
        for col_idx, pixel in enumerate(row):
            if pixel == 'X':
                x = start_x_j + col_idx * pattern_scale
                y = start_y + row_idx * pattern_scale + pattern_scale
                # Neon gradient effect
                if col_idx < 3:
                    color = NEON_CYAN
                elif col_idx < 5:
                    color = NEON_PURPLE
                else:
                    color = NEON_PINK
                draw.rectangle(
                    [x, y, x + pattern_scale - 1, y + pattern_scale - 1],
                    fill=color
                )
    
    # Add glitch effect - horizontal lines
    glitch_y_positions = [size // 3, 2 * size // 3]
    for gy in glitch_y_positions:
        glitch_height = max(1, size // 64)
        draw.rectangle([0, gy, size, gy + glitch_height], fill=(255, 50, 100))
    
    img.save(output_path, 'PNG')
    print(f"Created: {output_path} ({size}x{size})")

def create_android_adaptive(size, output_path, is_foreground=True):
    """Create Android adaptive icon layers"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0) if is_foreground else DARK_BG)
    draw = ImageDraw.Draw(img)
    
    if is_foreground:
        # Foreground - just the GJ logo with transparent background
        pixel_size = max(1, size // 24)
        
        # Simplified GJ pattern centered
        pattern_scale = size // 12
        
        g_pattern = [
            "  XXXX ",
            " XX  XX",
            " XX    ",
            " XX    ",
            " XX XXX",
            " XX   X",
            " XX   X",
            " XX  XX",
            "  XXXX ",
        ]
        
        j_pattern = [
            "  XXXX ",
            "    XX ",
            "    XX ",
            "    XX ",
            "    XX ",
            " XX XX ",
            "  XXX  ",
        ]
        
        start_y = (size - len(g_pattern) * pattern_scale) // 2
        start_x_g = size // 4 - (len(g_pattern[0]) * pattern_scale) // 2
        start_x_j = 3 * size // 4 - (len(j_pattern[0]) * pattern_scale) // 2
        
        # Draw G
        for row_idx, row in enumerate(g_pattern):
            for col_idx, pixel in enumerate(row):
                if pixel == 'X':
                    x = start_x_g + col_idx * pattern_scale
                    y = start_y + row_idx * pattern_scale
                    color = NEON_PINK if col_idx < 3 else NEON_CYAN
                    draw.rectangle(
                        [x, y, x + pattern_scale - 1, y + pattern_scale - 1],
                        fill=color
                    )
        
        # Draw J
        for row_idx, row in enumerate(j_pattern):
            for col_idx, pixel in enumerate(row):
                if pixel == 'X':
                    x = start_x_j + col_idx * pattern_scale
                    y = start_y + row_idx * pattern_scale + pattern_scale
                    color = NEON_CYAN if col_idx < 3 else NEON_PURPLE
                    draw.rectangle(
                        [x, y, x + pattern_scale - 1, y + pattern_scale - 1],
                        fill=color
                    )
    else:
        # Background - gradient grid pattern
        for x in range(0, size, size // 16):
            draw.line([(x, 0), (x, size)], fill=(40, 40, 80), width=1)
        for y in range(0, size, size // 16):
            draw.line([(0, y), (size, y)], fill=(40, 40, 80), width=1)
    
    img.save(output_path, 'PNG')
    print(f"Created: {output_path} ({size}x{size})")

def main():
    icons_dir = "/Users/lottalange/.openclaw/workspace/projects/glitch-jump/assets/icons"
    os.makedirs(icons_dir, exist_ok=True)
    
    # iOS App Icon sizes
    sizes = {
        "icon-1024.png": 1024,  # App Store
        "icon-180.png": 180,    # iPhone Home @3x
        "icon-120.png": 120,    # iPhone Home @2x
        "icon-87.png": 87,      # Settings @3x
        "icon-60.png": 60,      # Settings @2x
    }
    
    for filename, size in sizes.items():
        create_pixel_art(size, os.path.join(icons_dir, filename))
    
    # Android adaptive icons
    create_android_adaptive(1024, os.path.join(icons_dir, "android-foreground.png"), is_foreground=True)
    create_android_adaptive(1024, os.path.join(icons_dir, "android-background.png"), is_foreground=False)
    
    print("\n✅ All icons generated successfully!")

if __name__ == "__main__":
    main()
