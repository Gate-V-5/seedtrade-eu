#!/usr/bin/env python3
"""Derive browser icons from the approved SeedTrade globe/seed symbol."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "seedtrade-official-logo.png"
OUTPUT = ROOT / "public"

image = Image.open(SOURCE).convert("RGBA")
# Bounds of the standalone globe/seed symbol in the approved 750 x 118 asset.
symbol = image.crop((48, 8, 136, 96))
white = Image.new("RGBA", symbol.size, "white")
white.alpha_composite(symbol)

def resized(size):
    return white.resize((size, size), Image.Resampling.LANCZOS)

resized(16).save(OUTPUT / "favicon-16x16.png", optimize=True)
resized(32).save(OUTPUT / "favicon-32x32.png", optimize=True)
resized(180).save(OUTPUT / "apple-touch-icon.png", optimize=True)
resized(64).save(OUTPUT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
