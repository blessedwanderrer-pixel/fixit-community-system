from dataclasses import dataclass
from io import BytesIO

from fastapi import HTTPException, UploadFile
from PIL import Image, ImageOps, UnidentifiedImageError

SUPPORTED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
FORMAT_CONTENT_TYPES = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
FORMAT_EXTENSIONS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}


@dataclass(frozen=True)
class SanitizedImage:
    content: bytes
    content_type: str
    extension: str


async def sanitize_upload(
    upload: UploadFile, *, max_bytes: int, max_pixels: int
) -> SanitizedImage:
    raw = await upload.read(max_bytes + 1)
    if len(raw) > max_bytes:
        raise HTTPException(status_code=413, detail="Image exceeds the upload size limit")
    if not raw:
        raise HTTPException(status_code=422, detail="Image file is empty")

    try:
        with Image.open(BytesIO(raw)) as source:
            source.verify()
        with Image.open(BytesIO(raw)) as source:
            image_format = (source.format or "").upper()
            if image_format not in SUPPORTED_IMAGE_FORMATS:
                raise HTTPException(status_code=415, detail="Unsupported image format")
            if source.width * source.height > max_pixels:
                raise HTTPException(status_code=413, detail="Image pixel dimensions are too large")
            # Transpose from EXIF orientation, then copy pixels into a fresh image. No
            # EXIF, ICC, XMP, comments, or other source metadata is passed to save().
            clean = ImageOps.exif_transpose(source)
            mode = "RGB" if image_format == "JPEG" else "RGBA" if clean.mode in {"RGBA", "LA", "P"} else "RGB"
            clean = clean.convert(mode)
            output = BytesIO()
            save_args = {"format": image_format}
            if image_format == "JPEG":
                save_args.update(quality=90, optimize=True)
            elif image_format == "PNG":
                save_args.update(optimize=True)
            elif image_format == "WEBP":
                save_args.update(quality=90, method=6)
            clean.save(output, **save_args)
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise HTTPException(status_code=422, detail="Invalid or corrupted image") from exc

    return SanitizedImage(
        content=output.getvalue(),
        content_type=FORMAT_CONTENT_TYPES[image_format],
        extension=FORMAT_EXTENSIONS[image_format],
    )
