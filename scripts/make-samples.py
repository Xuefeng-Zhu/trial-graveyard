"""Generates the sample receipt screenshots in public/samples/.

Run: python3 scripts/make-samples.py   (needs Pillow and a TrueType font)
All data is invented. Dates have no year so the parser resolves them from today.
"""
import os
from PIL import Image, ImageDraw, ImageFont

FONT_PATHS = [
    "/usr/share/fonts/google-noto-vf/NotoSans[wght].ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/Library/Fonts/Arial.ttf",
]
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "samples")

SAMPLES = {
    "phantomflix": ("Phantomflix", (60, 30, 110), [
        "Welcome to Phantomflix",
        "Your free trial has started.",
        "Your trial ends on November 15.",
        "After that you will be charged $13.99/month.",
        "Cancel any time before then at",
        "https://www.phantomflix.example/account",
    ]),
    "wraithwave": ("Wraithwave Premium", (30, 120, 90), [
        "Thanks for trying Wraithwave Premium",
        "Your free trial is active.",
        "Your first payment of $11.99/month",
        "will be charged on December 3.",
        "Manage your plan at",
        "https://www.wraithwave.example/account",
    ]),
    "cryptic-cloud": ("Cryptic Cloud", (150, 40, 60), [
        "Your Cryptic Cloud trial",
        "Free for 7 days. Your trial ends on October 28.",
        "Then you will be charged $59.99/month.",
        "Cancel your plan at",
        "https://account.crypticcloud.example/plans",
    ]),
}


def load(size):
    for p in FONT_PATHS:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    raise SystemExit("No TrueType font found; edit FONT_PATHS.")


def draw(name, brand, color, lines):
    img = Image.new("RGB", (900, 520), "white")
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, 900, 110), fill=color)
    d.text((40, 30), brand, font=load(46), fill="white")
    y = 150
    for line in lines:
        d.text((40, y), line, font=load(30), fill=(20, 20, 20))
        y += 52
    img.save(os.path.join(OUT, name + ".png"), optimize=True)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for key, (brand, color, lines) in SAMPLES.items():
        draw(key, brand, color, lines)
