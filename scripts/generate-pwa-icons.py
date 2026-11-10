"""Generate PWA icon variants from the existing brand mark.

Run from the repository root:
    python scripts/generate-pwa-icons.py

Outputs live in assets/pwa/ so the manifest, iOS home screen and Android
maskable/themed icons all share one source of truth.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets" / "icon-512.png"
OUT = ROOT / "assets" / "pwa"
BACKGROUND = (11, 14, 20, 255)  # #0B0E14, matches manifest background_color


def content(im: Image.Image) -> Image.Image:
    """Trim transparent padding so scaling is predictable."""
    box = im.getbbox()
    return im.crop(box) if box else im


def place_on_square(mark: Image.Image, size: int, ratio: float, background=None) -> Image.Image:
    """Centre the mark inside a square canvas, sized by `ratio` of the edge."""
    canvas = Image.new("RGBA", (size, size), background)
    max_dim = max(mark.width, mark.height)
    scale = (size * ratio) / max_dim
    resized = mark.resize(
        (max(1, round(mark.width * scale)), max(1, round(mark.height * scale))),
        Image.LANCZOS,
    )
    canvas.alpha_composite(resized, ((size - resized.width) // 2, (size - resized.height) // 2))
    return canvas


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")
    mark = content(source)

    # "any" icons keep the transparent background.
    for size in (192, 512):
        place_on_square(mark, size, 0.92).save(OUT / f"icon-{size}.png", optimize=True)

    # Maskable icons need the full canvas painted and the mark inside the
    # 80% safe circle. A 58% mark keeps the whole cube clear of every mask.
    for size in (192, 512):
        place_on_square(mark, size, 0.58, BACKGROUND).save(
            OUT / f"maskable-{size}.png", optimize=True
        )

    # iOS does not support transparency in touch icons and rounds the corners itself.
    place_on_square(mark, 180, 0.78, BACKGROUND).convert("RGB").save(
        OUT / "apple-touch-icon.png", optimize=True
    )

    # Android "themed icon": a white silhouette derived from the mark's alpha.
    alpha = mark.getchannel("A")
    silhouette = Image.new("RGBA", mark.size, (255, 255, 255, 0))
    silhouette.putalpha(alpha)
    place_on_square(content(silhouette), 512, 0.62).save(
        OUT / "monochrome-512.png", optimize=True
    )

    for path in sorted(OUT.glob("*.png")):
        with Image.open(path) as im:
            print(f"{path.relative_to(ROOT)} {im.size[0]}x{im.size[1]}")


if __name__ == "__main__":
    main()
