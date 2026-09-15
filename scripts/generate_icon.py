import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_ai_icon():
    os.makedirs('assets', exist_ok=True)
    os.makedirs('public', exist_ok=True)
    
    size = 512
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Background Rounded Squircle with Gradient
    # Draw dark glowing background
    pad = 32
    rect = [pad, pad, size - pad, size - pad]
    radius = 110

    # Gradient base
    for i in range(size):
        ratio = i / size
        r = int(24 + ratio * 55)   # 24 -> 79
        g = int(18 + ratio * 40)   # 18 -> 58
        b = int(60 + ratio * 180)  # 60 -> 240
        # Draw gradient slice
        pass

    # Create gradient image
    gradient = Image.new('RGBA', (size, size))
    g_draw = ImageDraw.Draw(gradient)
    for y in range(size):
        r = int(15 + (y / size) * 70)
        g = int(23 + (y / size) * 50)
        b = int(42 + (y / size) * 190)
        g_draw.line([(0, y), (size, y)], fill=(r, g, b, 255))

    # Mask for squircle
    mask = Image.new('L', (size, size), 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.rounded_rectangle(rect, radius=radius, fill=255)

    # Apply mask
    bg = Image.composite(gradient, img, mask)
    img.paste(bg, (0, 0), mask)

    # Draw border glow
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(rect, radius=radius, outline=(129, 140, 248, 200), width=8)

    # 2. Draw AI Bot / Brain Sparkles Emblem in Center
    center_x, center_y = size // 2, size // 2

    # Glowing orb
    orb_radius = 120
    for r in range(orb_radius, 0, -5):
        alpha = int(20 + (1 - r / orb_radius) * 100)
        draw.ellipse(
            [center_x - r, center_y - r, center_x + r, center_y + r],
            fill=(99, 102, 241, alpha)
        )

    # Bot Head / Modern AI Shield
    head_w, head_h = 160, 130
    head_rect = [center_x - head_w//2, center_y - head_h//2 - 10, center_x + head_w//2, center_y + head_h//2 - 10]
    draw.rounded_rectangle(head_rect, radius=36, fill=(15, 23, 42, 240), outline=(56, 189, 248, 255), width=6)

    # Eyes / Glowing Visor
    visor_w, visor_h = 110, 36
    visor_rect = [center_x - visor_w//2, center_y - visor_h//2 - 15, center_x + visor_w//2, center_y + visor_h//2 - 15]
    draw.rounded_rectangle(visor_rect, radius=18, fill=(14, 165, 233, 220))

    # Eye Dots
    eye_offset = 28
    draw.ellipse([center_x - eye_offset - 8, center_y - 23, center_x - eye_offset + 8, center_y - 7], fill=(255, 255, 255, 255))
    draw.ellipse([center_x + eye_offset - 8, center_y - 23, center_x + eye_offset + 8, center_y - 7], fill=(255, 255, 255, 255))

    # Bot Antenna & Spark
    draw.line([(center_x, center_y - head_h//2 - 10), (center_x, center_y - head_h//2 - 35)], fill=(56, 189, 248, 255), width=6)
    draw.ellipse([center_x - 12, center_y - head_h//2 - 47, center_x + 12, center_y - head_h//2 - 23], fill=(245, 158, 11, 255))

    # Sparkle Stars around
    def draw_star(x, y, s, color):
        points = [
            (x, y - s),
            (x + s * 0.25, y - s * 0.25),
            (x + s, y),
            (x + s * 0.25, y + s * 0.25),
            (x, y + s),
            (x - s * 0.25, y + s * 0.25),
            (x - s, y),
            (x - s * 0.25, y - s * 0.25)
        ]
        draw.polygon(points, fill=color)

    draw_star(center_x + 140, center_y - 80, 24, (251, 191, 36, 255))
    draw_star(center_x - 130, center_y + 90, 20, (129, 140, 248, 255))
    draw_star(center_x + 120, center_y + 110, 16, (56, 189, 248, 255))

    # Speech Bubble Accent below
    bubble_rect = [center_x - 50, center_y + 65, center_x + 50, center_y + 95]
    draw.rounded_rectangle(bubble_rect, radius=12, fill=(99, 102, 241, 240), outline=(255, 255, 255, 180), width=3)
    # 3 dots in bubble
    for d in [-20, 0, 20]:
        draw.ellipse([center_x + d - 3, center_y + 77, center_x + d + 3, center_y + 83], fill=(255, 255, 255, 255))

    # Resize to standard icon sizes and save
    png_256 = img.resize((256, 256), Image.Resampling.LANCZOS)
    png_256.save('assets/icon.png', format='PNG')
    png_256.save('public/logo.png', format='PNG')

    # Save multi-resolution Windows ICO
    icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    img.save('assets/icon.ico', format='ICO', sizes=icon_sizes)
    img.save('public/favicon.ico', format='ICO', sizes=[(32, 32), (16, 16)])

    print("Successfully generated assets/icon.png and assets/icon.ico!")

if __name__ == '__main__':
    create_ai_icon()
