from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

output = Path(__file__).resolve().parents[1] / "public" / "samples"
output.mkdir(parents=True, exist_ok=True)

for filename, name, date, amount, cadence in (
    ("phantomflix", "Phantomflix", "December 15, 2026", "$13.99", "per month"),
    ("wraithwave", "Wraithwave Premium", "January 12, 2027", "£19.99", "per month"),
    ("cryptic-cloud", "Cryptic Cloud", "January 24, 2027", "€99.00", "per year"),
):
    image = Image.new("RGB", (960, 460), "#faf7ff")
    draw = ImageDraw.Draw(image)
    headline = ImageFont.truetype("DejaVuSans-Bold.ttf", 49)
    text = ImageFont.truetype("DejaVuSans.ttf", 31)
    tag = ImageFont.truetype("DejaVuSans-Bold.ttf", 21)
    draw.rectangle((0, 0, 960, 94), fill="#251941")
    draw.text((48, 32), "TRIAL CONFIRMATION / FICTIONAL SAMPLE", fill="#f2ecff", font=tag)
    draw.text((48, 128), f"Welcome to {name}.", fill="#171023", font=headline)
    draw.text((48, 214), f"Your free trial ends on {date}.", fill="#171023", font=text)
    draw.text((48, 267), f"After your trial, you will be charged {amount} {cadence}.", fill="#171023", font=text)
    draw.line((48, 335, 912, 335), fill="#b8a9d9", width=2)
    draw.text((48, 365), f"Manage your plan: https://{filename}.example/account", fill="#402668", font=text)
    image.save(output / f"{filename}.png", optimize=True)
