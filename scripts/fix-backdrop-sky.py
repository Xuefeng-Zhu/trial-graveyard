"""Tidies the sky of public/pixel/graveyard-bg.png (384x216, crisp pixels, no resampling).

Run: python3 scripts/fix-backdrop-sky.py   (needs Pillow)
Removes the clouds clipped by the left and right edges and the dim mid-sky cloud, then
places two copies of the fully visible cloud inside the open sky. Idempotent: it reads
the clean upper cloud, and re-running only repaints the same regions.
"""
import os
from PIL import Image

PATH = os.path.join(os.path.dirname(__file__), "..", "public", "pixel", "graveyard-bg.png")
SKY_COLUMNS = range(300, 317)  # open sky; the sky is banded horizontally
CLOUD = (205, 10, 264, 28)  # x0, y0, x1, y1 of the fully visible upper cloud

im = Image.open(PATH).convert("RGBA")
px = im.load()
def row_sky(y):
    colors = [px[x, y] for x in SKY_COLUMNS]
    return max(set(colors), key=colors.count)


sky = [row_sky(y) for y in range(im.height)]

x0, y0, x1, y1 = CLOUD
cloud = {(x - x0, y - y0): px[x, y] for x in range(x0, x1) for y in range(y0, y1) if px[x, y] != sky[y] and sum(px[x, y][:3]) > 220}
palette = set(cloud.values())


def erase(box, only_palette):
    ax, ay, bx, by = box
    for y in range(ay, by):
        for x in range(ax, bx):
            if not only_palette or px[x, y] in palette:
                px[x, y] = sky[y]


def paste(at_x, at_y):
    for (dx, dy), c in cloud.items():
        px[at_x + dx, at_y + dy] = c


# Left edge cloud sits behind a tree, so only cloud-colored pixels are erased.
erase((0, 8, 62, 36), True)
erase((318, 4, 384, 34), False)
erase((118, 30, 200, 50), False)
paste(120, 32)
paste(316, 14)
im.save(PATH, optimize=True)
