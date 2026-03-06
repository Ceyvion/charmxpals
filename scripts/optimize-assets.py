#!/usr/bin/env python3
"""
Optimize runtime art assets for character and arena surfaces.

Outputs:
- Role-specific character variants (thumb/card/portrait/sprite/banner/signature)
- Next-gen formats (WebP + AVIF)
- Compatibility PNGs kept, but resized/compressed to avoid giant duplicates
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageOps, features


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
CHAR_ROOT = PUBLIC / "assets" / "characters"
ARENA_MAP_ROOT = PUBLIC / "assets" / "arena" / "maps"
ARENA_SPRITE_ROOT = PUBLIC / "assets" / "arena" / "sprites"


@dataclass(frozen=True)
class VariantSpec:
  source: str
  stem: str
  size: tuple[int, int]
  webp_quality: int = 82
  avif_quality: int = 55
  exact_fit: bool = True


CHAR_VARIANTS: tuple[VariantSpec, ...] = (
  VariantSpec(source="portrait.png", stem="thumb", size=(256, 384), webp_quality=80, avif_quality=50),
  VariantSpec(source="portrait.png", stem="card", size=(512, 768), webp_quality=82, avif_quality=54),
  VariantSpec(source="portrait.png", stem="portrait", size=(768, 1152), webp_quality=84, avif_quality=56),
  VariantSpec(source="portrait.png", stem="sprite", size=(384, 576), webp_quality=80, avif_quality=50),
  VariantSpec(source="signature.png", stem="banner", size=(960, 640), webp_quality=82, avif_quality=54),
  VariantSpec(source="signature.png", stem="signature", size=(1280, 853), webp_quality=84, avif_quality=56),
)

ARENA_MAP_SIZE = (1280, 853)
ARENA_SPRITE_SIZE = (512, 512)


def file_size(path: Path) -> int:
  return path.stat().st_size if path.exists() else 0


def dir_size(root: Path) -> int:
  return sum(p.stat().st_size for p in root.rglob("*") if p.is_file())


def fmt_mib(num_bytes: int) -> str:
  return f"{num_bytes / (1024 * 1024):.2f} MiB"


def _resample() -> int:
  return Image.Resampling.LANCZOS


def render_variant(src: Image.Image, size: tuple[int, int], exact_fit: bool) -> Image.Image:
  # Exact-fit uses center crop + resize to guarantee deterministic dimensions.
  if exact_fit:
    return ImageOps.fit(src, size, method=_resample(), centering=(0.5, 0.5))
  return ImageOps.contain(src, size, method=_resample())


def save_png(img: Image.Image, out_path: Path) -> None:
  img.save(out_path, format="PNG", optimize=True, compress_level=9)


def save_webp(img: Image.Image, out_path: Path, quality: int) -> None:
  img.save(out_path, format="WEBP", quality=quality, method=6)


def save_avif(img: Image.Image, out_path: Path, quality: int) -> None:
  img.save(out_path, format="AVIF", quality=quality, speed=6)


def ensure_sources(character_dir: Path) -> tuple[Path, Path] | None:
  portrait = character_dir / "portrait.png"
  signature = character_dir / "signature.png"

  if not portrait.exists():
    return None
  if not signature.exists():
    signature = portrait

  return portrait, signature


def optimize_character_dir(character_dir: Path, avif_enabled: bool) -> int:
  sources = ensure_sources(character_dir)
  if not sources:
    return 0

  portrait_path, signature_path = sources
  changed = 0
  source_images = {
    "portrait.png": Image.open(portrait_path).convert("RGBA"),
    "signature.png": Image.open(signature_path).convert("RGBA"),
  }

  try:
    for spec in CHAR_VARIANTS:
      src = source_images[spec.source]
      variant = render_variant(src, spec.size, spec.exact_fit)

      png_path = character_dir / f"{spec.stem}.png"
      before = file_size(png_path)
      save_png(variant, png_path)
      if file_size(png_path) != before:
        changed += 1

      webp_path = character_dir / f"{spec.stem}.webp"
      before = file_size(webp_path)
      save_webp(variant, webp_path, spec.webp_quality)
      if file_size(webp_path) != before:
        changed += 1

      if avif_enabled:
        avif_path = character_dir / f"{spec.stem}.avif"
        before = file_size(avif_path)
        save_avif(variant, avif_path, spec.avif_quality)
        if file_size(avif_path) != before:
          changed += 1
  finally:
    for image in source_images.values():
      image.close()

  return changed


def optimize_arena_maps(avif_enabled: bool) -> int:
  changed = 0
  for png_path in ARENA_MAP_ROOT.glob("*.png"):
    src = Image.open(png_path).convert("RGBA")
    try:
      variant = render_variant(src, ARENA_MAP_SIZE, exact_fit=True)
      before = file_size(png_path)
      save_png(variant, png_path)
      if file_size(png_path) != before:
        changed += 1

      webp_path = png_path.with_suffix(".webp")
      before = file_size(webp_path)
      save_webp(variant, webp_path, quality=82)
      if file_size(webp_path) != before:
        changed += 1

      if avif_enabled:
        avif_path = png_path.with_suffix(".avif")
        before = file_size(avif_path)
        save_avif(variant, avif_path, quality=55)
        if file_size(avif_path) != before:
          changed += 1
    finally:
      src.close()
  return changed


def optimize_arena_sprites(avif_enabled: bool) -> int:
  changed = 0
  for png_path in ARENA_SPRITE_ROOT.glob("*.png"):
    src = Image.open(png_path).convert("RGBA")
    try:
      variant = render_variant(src, ARENA_SPRITE_SIZE, exact_fit=True)
      before = file_size(png_path)
      save_png(variant, png_path)
      if file_size(png_path) != before:
        changed += 1

      webp_path = png_path.with_suffix(".webp")
      before = file_size(webp_path)
      save_webp(variant, webp_path, quality=80)
      if file_size(webp_path) != before:
        changed += 1

      if avif_enabled:
        avif_path = png_path.with_suffix(".avif")
        before = file_size(avif_path)
        save_avif(variant, avif_path, quality=50)
        if file_size(avif_path) != before:
          changed += 1
    finally:
      src.close()
  return changed


def iter_character_dirs() -> Iterable[Path]:
  if not CHAR_ROOT.exists():
    return []
  return sorted([entry for entry in CHAR_ROOT.iterdir() if entry.is_dir()])


def main() -> None:
  parser = argparse.ArgumentParser(description="Optimize static runtime assets")
  parser.add_argument("--skip-avif", action="store_true", help="Skip AVIF generation")
  parser.add_argument("--quiet", action="store_true", help="Only print summary")
  args = parser.parse_args()

  avif_enabled = (not args.skip_avif) and features.check("avif")
  before_total = dir_size(PUBLIC)

  changed = 0
  character_dirs = list(iter_character_dirs())
  for directory in character_dirs:
    changed += optimize_character_dir(directory, avif_enabled=avif_enabled)
  changed += optimize_arena_maps(avif_enabled=avif_enabled)
  changed += optimize_arena_sprites(avif_enabled=avif_enabled)

  after_total = dir_size(PUBLIC)
  delta = after_total - before_total

  if not args.quiet:
    print(f"Character folders optimized: {len(character_dirs)}")
    print(f"AVIF enabled: {avif_enabled}")
    print(f"Assets changed: {changed}")

  print(
    "Public assets size: "
    f"{fmt_mib(before_total)} -> {fmt_mib(after_total)} "
    f"({delta / (1024 * 1024):+.2f} MiB)"
  )


if __name__ == "__main__":
  main()
