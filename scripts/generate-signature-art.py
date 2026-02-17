#!/usr/bin/env python3
"""
Generate cinematic wide signature art from existing portrait assets.

Output:
  public/assets/characters/<slug>/signature.png (1536x1024)
"""

from __future__ import annotations

import argparse
import hashlib
import math
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Tuple

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps

CANVAS = (1536, 1024)


@dataclass(frozen=True)
class Theme:
  name: str
  a: Tuple[int, int, int]
  b: Tuple[int, int, int]
  c: Tuple[int, int, int]
  grid_alpha: int


THEMES = {
  "fire": Theme("fire", (17, 10, 8), (105, 28, 8), (232, 116, 21), 30),
  "neon": Theme("neon", (8, 16, 28), (37, 14, 57), (16, 148, 176), 28),
  "water": Theme("water", (6, 20, 34), (7, 69, 94), (42, 164, 212), 24),
  "nature": Theme("nature", (10, 24, 16), (32, 66, 24), (125, 170, 62), 24),
  "crystal": Theme("crystal", (18, 20, 40), (56, 40, 86), (147, 125, 232), 24),
  "shadow": Theme("shadow", (8, 8, 12), (20, 20, 30), (88, 92, 110), 18),
  "tech": Theme("tech", (8, 14, 18), (30, 44, 58), (76, 172, 182), 22),
  "default": Theme("default", (14, 15, 22), (35, 32, 52), (114, 92, 168), 20),
}


def lerp(a: int, b: int, t: float) -> int:
  return int(round(a + (b - a) * t))


def lerp_rgb(c1: Tuple[int, int, int], c2: Tuple[int, int, int], t: float) -> Tuple[int, int, int]:
  return (lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t))


def seed_for(slug: str) -> int:
  digest = hashlib.sha256(slug.encode("utf-8")).digest()
  return int.from_bytes(digest[:8], "big")


def detect_theme(slug: str) -> Theme:
  s = slug.lower()
  fire = ("ember", "solar", "volcanic", "crimson", "citrine", "auric", "sun", "flare", "lava", "laser")
  neon = ("neon", "city", "arcade", "holo", "prism", "pulse", "terminal")
  water = ("reef", "fjord", "river", "harbor", "rain", "tide", "glacier")
  nature = ("jungle", "moss", "garden", "petal", "terrace", "canyon", "terra")
  crystal = ("crystal", "opal", "mirror", "lunar")
  shadow = ("shadow", "midnight", "slate", "indigo", "echo", "storm")
  tech = ("iron", "chrome", "mecha", "forge", "satellite", "yard", "district", "wire")

  if any(k in s for k in fire):
    return THEMES["fire"]
  if any(k in s for k in neon):
    return THEMES["neon"]
  if any(k in s for k in water):
    return THEMES["water"]
  if any(k in s for k in nature):
    return THEMES["nature"]
  if any(k in s for k in crystal):
    return THEMES["crystal"]
  if any(k in s for k in shadow):
    return THEMES["shadow"]
  if any(k in s for k in tech):
    return THEMES["tech"]
  return THEMES["default"]


def trim_letterbox(src: Image.Image) -> Image.Image:
  """
  Remove heavy dark side bars from portrait inputs when present.
  """
  gray = src.convert("L")
  mask = gray.point(lambda p: 255 if p > 18 else 0)
  bbox = mask.getbbox()
  if not bbox:
    return src

  left, _top, right, _bottom = bbox
  left_pad = left
  right_pad = src.width - right

  # Only crop if dark bars are substantial.
  if left_pad < 24 and right_pad < 24:
    return src

  margin = 6
  crop_left = max(0, left - margin)
  crop_right = min(src.width, right + margin)
  if crop_right - crop_left < max(320, src.width // 3):
    return src
  return src.crop((crop_left, 0, crop_right, src.height))


def draw_linear_gradient(size: Tuple[int, int], c1: Tuple[int, int, int], c2: Tuple[int, int, int], horizontal: bool) -> Image.Image:
  w, h = size
  img = Image.new("RGB", size, c1)
  draw = ImageDraw.Draw(img)
  span = (w - 1) if horizontal else (h - 1)
  span = max(span, 1)
  for i in range(span + 1):
    t = i / span
    color = lerp_rgb(c1, c2, t)
    if horizontal:
      draw.line([(i, 0), (i, h)], fill=color)
    else:
      draw.line([(0, i), (w, i)], fill=color)
  return img


def draw_triangle_grid(canvas: Image.Image, tile: int, alpha: int) -> None:
  w, h = canvas.size
  layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
  draw = ImageDraw.Draw(layer)
  for y in range(0, h, tile):
    for x in range(0, w, tile):
      draw.polygon([(x, y), (x + tile, y), (x + tile, y + tile)], fill=(255, 255, 255, alpha))
      draw.polygon([(x, y), (x, y + tile), (x + tile, y + tile)], fill=(0, 0, 0, alpha))
  canvas.alpha_composite(layer)


def draw_theme_fx(canvas: Image.Image, theme: Theme, rnd: random.Random) -> None:
  w, h = canvas.size
  layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
  draw = ImageDraw.Draw(layer)

  if theme.name == "fire":
    for _ in range(140):
      x = rnd.randint(0, w - 1)
      y = rnd.randint(0, h - 1)
      r = rnd.randint(1, 4)
      draw.ellipse((x - r, y - r, x + r, y + r), fill=(255, rnd.randint(120, 200), 55, rnd.randint(80, 170)))
  elif theme.name == "water":
    for _ in range(18):
      y = rnd.randint(30, h - 60)
      amp = rnd.uniform(8, 22)
      phase = rnd.uniform(0, math.pi * 2)
      points = []
      for x in range(0, w + 16, 16):
        yy = y + math.sin((x / 120.0) + phase) * amp
        points.append((x, yy))
      draw.line(points, fill=(126, 216, 255, 88), width=2)
  elif theme.name == "nature":
    for _ in range(80):
      x = rnd.randint(0, w - 1)
      y = rnd.randint(0, h - 1)
      r = rnd.randint(8, 30)
      draw.ellipse((x - r, y - r, x + r, y + r), fill=(108, 185, 88, rnd.randint(20, 55)))
  elif theme.name == "crystal":
    for _ in range(28):
      x = rnd.randint(0, w - 180)
      y = rnd.randint(0, h - 180)
      p1 = (x, y + rnd.randint(10, 50))
      p2 = (x + rnd.randint(80, 180), y)
      p3 = (x + rnd.randint(80, 180), y + rnd.randint(90, 180))
      p4 = (x + rnd.randint(0, 70), y + rnd.randint(100, 180))
      draw.polygon([p1, p2, p3, p4], fill=(208, 195, 255, rnd.randint(14, 40)))
  elif theme.name == "shadow":
    for _ in range(12):
      x = rnd.randint(-120, w)
      y = rnd.randint(-80, h)
      ww = rnd.randint(160, 360)
      hh = rnd.randint(90, 230)
      draw.ellipse((x, y, x + ww, y + hh), fill=(26, 26, 40, rnd.randint(35, 72)))
  elif theme.name == "tech":
    step = 56
    for x in range(0, w, step):
      draw.line([(x, 0), (x, h)], fill=(148, 206, 214, 34), width=1)
    for y in range(0, h, step):
      draw.line([(0, y), (w, y)], fill=(148, 206, 214, 34), width=1)
    for _ in range(26):
      x = rnd.randint(0, w - 1)
      y = rnd.randint(0, h - 1)
      draw.rectangle((x - 2, y - 2, x + 2, y + 2), fill=(180, 235, 240, 120))
  else:
    for _ in range(24):
      x = rnd.randint(0, w - 1)
      y = rnd.randint(0, h - 1)
      r = rnd.randint(12, 60)
      draw.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, rnd.randint(12, 34)))

  canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(0.8)))


def darken_edges(canvas: Image.Image) -> None:
  w, h = canvas.size
  mask = Image.new("L", (w, h), 0)
  draw = ImageDraw.Draw(mask)
  draw.rectangle((0, 0, w, h), fill=255)
  inner = int(min(w, h) * 0.24)
  draw.rectangle((inner, inner, w - inner, h - inner), fill=0)
  mask = mask.filter(ImageFilter.GaussianBlur(90))
  vignette = Image.new("RGBA", (w, h), (0, 0, 0, 88))
  canvas.paste(vignette, (0, 0), mask)


def build_signature(portrait_path: Path, out_path: Path) -> None:
  slug = portrait_path.parent.name
  theme = detect_theme(slug)

  src = Image.open(portrait_path).convert("RGB")
  src = trim_letterbox(src)
  bg = ImageOps.fit(src, CANVAS, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
  bg = bg.filter(ImageFilter.GaussianBlur(22))
  bg = ImageEnhance.Brightness(bg).enhance(0.76)
  bg = ImageEnhance.Contrast(bg).enhance(1.1)
  bg = ImageEnhance.Color(bg).enhance(1.05)
  canvas = bg.convert("RGBA")

  fg = src.copy()
  fg.thumbnail((int(CANVAS[0] * 0.74), int(CANVAS[1] * 0.98)), Image.Resampling.LANCZOS)
  fx = (CANVAS[0] - fg.width) // 2
  fy = CANVAS[1] - fg.height
  canvas.alpha_composite(fg.convert("RGBA"), (fx, fy))

  tint = Image.new("RGBA", CANVAS, (*theme.c, 14))
  canvas.alpha_composite(tint)

  shade = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
  sdraw = ImageDraw.Draw(shade)
  w, h = CANVAS
  top_band = int(h * 0.14)
  bottom_band = int(h * 0.16)
  for y in range(top_band):
    t = 1.0 - (y / max(1, top_band - 1))
    alpha = int(44 * t)
    sdraw.line([(0, y), (w, y)], fill=(0, 0, 0, alpha))
  for y in range(h - bottom_band, h):
    t = (y - (h - bottom_band)) / max(1, bottom_band - 1)
    alpha = int(60 * t)
    sdraw.line([(0, y), (w, y)], fill=(0, 0, 0, alpha))
  canvas.alpha_composite(shade)

  out_path.parent.mkdir(parents=True, exist_ok=True)
  final = canvas.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.1, percent=105, threshold=2))
  final.save(out_path, format="PNG", optimize=True)


def iter_portraits(base: Path, slug: str | None) -> Iterable[Path]:
  if slug:
    portrait = base / slug / "portrait.png"
    if portrait.exists():
      yield portrait
    return

  for candidate in sorted(base.glob("*/portrait.png")):
    yield candidate


def main() -> None:
  parser = argparse.ArgumentParser(description="Generate cinematic signature art from portrait assets.")
  parser.add_argument("--slug", help="Only regenerate one character slug.", default=None)
  parser.add_argument("--base", help="Characters asset base directory.", default="public/assets/characters")
  args = parser.parse_args()

  base = Path(args.base)
  portraits = list(iter_portraits(base, args.slug))
  if not portraits:
    print("No portrait assets found.")
    return

  done = 0
  for portrait in portraits:
    out = portrait.parent / "signature.png"
    build_signature(portrait, out)
    done += 1

  print(f"Generated {done} signature assets.")


if __name__ == "__main__":
  main()
