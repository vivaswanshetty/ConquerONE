import os
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT_DIR = "screenshots/playstore_ready"
RAW_DIR = "screenshots/raw"
os.makedirs(OUTPUT_DIR, exist_ok=True)

WIDTH = 1080
HEIGHT = 2400

FONT_HEAD = "node_modules/@expo-google-fonts/archivo/900Black/Archivo_900Black.ttf"
FONT_SUB = "node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf"
FONT_TAG = "node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf"

def rounded_corner_mask(size, radius):
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), size], radius=radius, fill=255)
    return mask

def draw_tracked_text(draw, text, font, fill, y, letter_spacing=2.0, center=True):
    chars = list(text)
    advances = [font.getlength(c) for c in chars]
    total_w = sum(advances) + letter_spacing * (len(chars) - 1)
    
    start_x = (WIDTH - total_w) / 2.0 if center else 0.0
    curr_x = start_x
    for i, c in enumerate(chars):
        draw.text((curr_x, y), c, font=font, fill=fill)
        curr_x += advances[i] + letter_spacing
    return total_w

def measure_tracked_text(text, font, letter_spacing=2.0):
    chars = list(text)
    advances = [font.getlength(c) for c in chars]
    return sum(advances) + letter_spacing * (len(chars) - 1)

def generate_screenshot_card(raw_filename, tag_text, title_line1, title_line2, sub_text, out_filename, accent_color=(227, 30, 36)):
    raw_img_path = os.path.join(RAW_DIR, raw_filename)
    out_path = os.path.join(OUTPUT_DIR, out_filename)

    if not os.path.exists(raw_img_path):
        print(f"File not found: {raw_img_path}")
        return

    # 1. Base canvas with dark ambient background
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (12, 12, 15, 255))
    canvas_draw = ImageDraw.Draw(canvas)
    
    for y in range(HEIGHT):
        factor = y / HEIGHT
        r = int(14 - factor * 8)
        g = int(14 - factor * 8)
        b = int(18 - factor * 10)
        canvas_draw.line([(0, y), (WIDTH, y)], fill=(max(0, r), max(0, g), max(0, b), 255))
        
    # Ambient radial glow behind the phone and header
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([WIDTH * 0.12, 320, WIDTH * 0.88, 1200], fill=(accent_color[0], accent_color[1], accent_color[2], 34))
    glow = glow.filter(ImageFilter.GaussianBlur(150))
    canvas = Image.alpha_composite(canvas, glow)
    draw = ImageDraw.Draw(canvas)

    # 2. Typography - Refined, Breathable Scale
    tag_font = ImageFont.truetype(FONT_TAG, 20)
    head_font = ImageFont.truetype(FONT_HEAD, 48)
    sub_font = ImageFont.truetype(FONT_SUB, 25)

    # --- TAG PILL (with tracking & airy padding) ---
    tag_tracking = 2.5
    tag_w = measure_tracked_text(tag_text, tag_font, tag_tracking)
    tag_bbox = tag_font.getbbox(tag_text)
    tag_h = tag_bbox[3] - tag_bbox[1]

    pill_pad_x = 22
    pill_pad_y = 9
    pill_w = int(tag_w + pill_pad_x * 2)
    pill_h = int(tag_h + pill_pad_y * 2)
    pill_x = (WIDTH - pill_w) // 2
    pill_y = 115

    pill_overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    pill_draw = ImageDraw.Draw(pill_overlay)
    pill_draw.rounded_rectangle(
        [(pill_x, pill_y), (pill_x + pill_w, pill_y + pill_h)],
        radius=pill_h // 2,
        fill=(accent_color[0], accent_color[1], accent_color[2], 22),
        outline=(accent_color[0], accent_color[1], accent_color[2], 120),
        width=1
    )
    canvas = Image.alpha_composite(canvas, pill_overlay)
    draw = ImageDraw.Draw(canvas)
    
    pill_text_color = (
        min(255, int(accent_color[0] * 0.85 + 255 * 0.15)),
        min(255, int(accent_color[1] * 0.85 + 255 * 0.15)),
        min(255, int(accent_color[2] * 0.85 + 255 * 0.15))
    )
    draw_tracked_text(draw, tag_text, tag_font, pill_text_color, pill_y + pill_pad_y - 2, letter_spacing=tag_tracking)

    # --- HEADLINE (Spacious tracking and line height) ---
    head_tracking = 1.8
    curr_y = pill_y + pill_h + 28
    if title_line1:
        bbox1 = head_font.getbbox(title_line1)
        h1 = bbox1[3] - bbox1[1]
        draw_tracked_text(draw, title_line1, head_font, (255, 255, 255), curr_y, letter_spacing=head_tracking)
        curr_y += h1 + 18
    if title_line2:
        bbox2 = head_font.getbbox(title_line2)
        h2 = bbox2[3] - bbox2[1]
        draw_tracked_text(draw, title_line2, head_font, accent_color, curr_y, letter_spacing=head_tracking)
        curr_y += h2 + 20
    else:
        curr_y += 6

    # --- SUB-CAPTION (Soft, legible, balanced) ---
    sub_tracking = 0.4
    draw_tracked_text(draw, sub_text, sub_font, (150, 153, 164), curr_y, letter_spacing=sub_tracking)

    # 3. Phone Mockup / Bezel (Slightly refined width for generous margins)
    phone_w = 840
    screen_raw = Image.open(raw_img_path).convert("RGBA")
    aspect = screen_raw.height / screen_raw.width
    phone_h = int(phone_w * aspect)

    screen_resized = screen_raw.resize((phone_w, phone_h), Image.Resampling.LANCZOS)
    corner_rad = 50
    mask = rounded_corner_mask((phone_w, phone_h), corner_rad)

    phone_x = (WIDTH - phone_w) // 2
    phone_y = 545

    # Phone drop shadow - softer, more diffuse
    shadow_pad = 65
    shadow = Image.new("RGBA", (phone_w + shadow_pad * 2, phone_h + shadow_pad * 2), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle(
        [(shadow_pad, shadow_pad + 18), (phone_w + shadow_pad, phone_h + shadow_pad + 18)],
        radius=corner_rad,
        fill=(0, 0, 0, 185)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(40))
    canvas.paste(shadow, (phone_x - shadow_pad, phone_y - shadow_pad), shadow)

    # Screen paste
    canvas.paste(screen_resized, (phone_x, phone_y), mask)

    # Phone border - delicate metallic outer rim
    border_overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(border_overlay)
    bdraw.rounded_rectangle(
        [(phone_x, phone_y), (phone_x + phone_w, phone_y + phone_h)],
        radius=corner_rad,
        outline=(255, 255, 255, 40),
        width=3
    )
    bdraw.rounded_rectangle(
        [(phone_x + 3, phone_y + 3), (phone_x + phone_w - 3, phone_y + phone_h - 3)],
        radius=corner_rad - 2,
        outline=(0, 0, 0, 110),
        width=2
    )

    # Camera punch hole
    hole_radius = 8
    hole_x = phone_x + phone_w // 2
    hole_y = phone_y + 24
    bdraw.ellipse([(hole_x - hole_radius, hole_y - hole_radius), (hole_x + hole_radius, hole_y + hole_radius)], fill=(6, 6, 8, 255), outline=(32, 32, 38, 255), width=2)

    canvas = Image.alpha_composite(canvas, border_overlay)

    # Save output as high quality RGB JPEG
    final_img = canvas.convert("RGB")
    final_img.save(out_path, "JPEG", quality=96, optimize=True)
    print(f"Generated: {out_filename}")

SCREENSHOTS = [
    {
        "file": "Home.jpeg",
        "tag": "DAILY WORKOUT SPLIT",
        "title1": "CRUSH YOUR",
        "title2": "DAILY SPLIT",
        "sub": "Adaptive routines, streak tracking & muscle recovery",
        "out": "01_home_split.jpg",
        "accent": (227, 30, 36) # Red
    },
    {
        "file": "Active Workout.jpeg",
        "tag": "PRECISION TRACKING",
        "title1": "LIVE REPS &",
        "title2": "TARGET OVERLOAD",
        "sub": "Real-time rep goals, load guidance & one-tap logging",
        "out": "02_active_workout.jpg",
        "accent": (227, 30, 36) # Red
    },
    {
        "file": "Logging sets.jpeg",
        "tag": "SMART RECOVERY",
        "title1": "ACTIVE REST TIMER &",
        "title2": "SET LOGGING",
        "sub": "Automated rest intervals with instant performance saving",
        "out": "03_rest_timer_logging.jpg",
        "accent": (227, 30, 36) # Red
    },
    {
        "file": "AI Coach.jpeg",
        "tag": "ATHLETE INTELLIGENCE",
        "title1": "24/7 INTERACTIVE",
        "title2": "AI COACH",
        "sub": "On-demand coaching for form, recovery & mindset",
        "out": "04_ai_coach.jpg",
        "accent": (0, 210, 255) # Electric Cyan
    },
    {
        "file": "Custom Workouts.jpeg",
        "tag": "EXERCISE CATALOG",
        "title1": "40+ PROVEN",
        "title2": "EXERCISE PROTOCOLS",
        "sub": "Build custom routines targeting every muscle group",
        "out": "05_custom_workouts.jpg",
        "accent": (255, 110, 30) # Orange
    },
    {
        "file": "Streak Analytics.jpeg",
        "tag": "CONSISTENCY TRACKER",
        "title1": "BUILD UNBREAKABLE",
        "title2": "STREAKS",
        "sub": "Monthly progress calendar, active hours & workout flow",
        "out": "06_streak_analytics.jpg",
        "accent": (255, 140, 0) # Amber
    },
    {
        "file": "Ranks.jpeg",
        "tag": "ATHLETE PROGRESSION",
        "title1": "LEVEL UP YOUR",
        "title2": "ATHLETE RANK",
        "sub": "Earn XP and climb from Recruit to Chadlite to Warrior",
        "out": "07_ranks_progression.jpg",
        "accent": (0, 230, 118) # Emerald Green
    },
    {
        "file": "Achievements.jpeg",
        "tag": "MILESTONE REWARDS",
        "title1": "EARN CONQUEROR",
        "title2": "STATUS",
        "sub": "Unlock trophies and celebrate your PR breakthroughs",
        "out": "08_achievements_trophy.jpg",
        "accent": (255, 184, 0) # Gold
    },
    {
        "file": "History.jpeg",
        "tag": "PERFORMANCE ANALYTICS",
        "title1": "PERSONAL",
        "title2": "HALL OF FAME",
        "sub": "Track PR benchmarks, calories burned & lifting volume",
        "out": "09_history_hall_of_fame.jpg",
        "accent": (227, 30, 36) # Red
    },
    {
        "file": "Profile.jpeg",
        "tag": "ECOSYSTEM INTEGRATION",
        "title1": "HEALTH CONNECT &",
        "title2": "CLOUD SYNC",
        "sub": "Real-time sync with Google Fit and encrypted cloud backup",
        "out": "10_profile_health_connect.jpg",
        "accent": (0, 230, 118) # Green
    }
]

if __name__ == "__main__":
    for item in SCREENSHOTS:
        generate_screenshot_card(
            item["file"],
            item["tag"],
            item["title1"],
            item["title2"],
            item["sub"],
            item["out"],
            item["accent"]
        )
    print("Regenerated all 10 screenshots with breathable layout!")
