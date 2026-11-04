#!/usr/bin/env python3
"""Generate the PWA icons (no Pillow needed).

The manifest used to point at favicon.svg only, which Android/iOS ignore for the
home-screen icon, so installs looked broken. Run this after changing the brand
colour:

    python scripts/make_icons.py

Writes public/icon-192.png, public/icon-512.png and public/icon-maskable-512.png.
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

PUBLIC = Path(__file__).resolve().parents[1] / "public"

BG = (46, 139, 87)      # accent green, matches --color-accent
FG = (255, 255, 255)

# The letter "E" as fractions of the canvas: (x0, y0, x1, y1)
E_BARS = [
    (0.30, 0.24, 0.44, 0.76),   # stem
    (0.30, 0.24, 0.70, 0.34),   # top
    (0.30, 0.44, 0.62, 0.54),   # middle
    (0.30, 0.66, 0.70, 0.76),   # bottom
]


def render(size: int, *, padding: float = 0.0) -> bytes:
    """RGBA rows for one square icon."""
    scale = 1.0 - padding * 2
    offset = padding
    rows = []
    for y in range(size):
        row = bytearray([0])  # PNG filter: none
        fy = y / size
        for x in range(size):
            fx = x / size
            colour = BG
            for x0, y0, x1, y1 in E_BARS:
                gx0, gy0 = offset + x0 * scale, offset + y0 * scale
                gx1, gy1 = offset + x1 * scale, offset + y1 * scale
                if gx0 <= fx <= gx1 and gy0 <= fy <= gy1:
                    colour = FG
                    break
            row.extend((*colour, 255))
        rows.append(bytes(row))
    return b"".join(rows)


def png(size: int, *, padding: float = 0.0) -> bytes:
    raw = render(size, padding=padding)

    def chunk(kind: bytes, payload: bytes) -> bytes:
        return (
            struct.pack(">I", len(payload))
            + kind
            + payload
            + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)
        )

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    return b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", header),
            chunk(b"IDAT", zlib.compress(raw, 9)),
            chunk(b"IEND", b""),
        ]
    )


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    (PUBLIC / "icon-192.png").write_bytes(png(192))
    (PUBLIC / "icon-512.png").write_bytes(png(512))
    (PUBLIC / "icon-maskable-512.png").write_bytes(png(512, padding=0.12))
    print("wrote public/icon-192.png, public/icon-512.png, public/icon-maskable-512.png")


if __name__ == "__main__":
    main()
