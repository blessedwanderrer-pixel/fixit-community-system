from io import BytesIO

import pytest
from fastapi import HTTPException, UploadFile
from PIL import Image

from app.core.media import sanitize_upload
from app.services.storage import StorageService


def image_bytes(fmt: str = "JPEG", *, exif: bool = False) -> bytes:
    output = BytesIO()
    image = Image.new("RGB", (8, 8), "red")
    kwargs = {}
    if exif:
        metadata = Image.Exif()
        metadata[0x010E] = "private description"
        metadata[0x8825] = {
            1: "N", 2: (31.0, 31.0, 13.0),
            3: "E", 4: (74.0, 21.0, 31.0),
        }
        kwargs["exif"] = metadata
    image.save(output, format=fmt, **kwargs)
    return output.getvalue()


def upload(data: bytes, filename: str = "untrusted.bin", content_type: str = "text/plain") -> UploadFile:
    return UploadFile(filename=filename, file=BytesIO(data), headers={"content-type": content_type})


@pytest.mark.anyio
async def test_valid_image_is_accepted_by_detected_content_not_client_mime() -> None:
    clean = await sanitize_upload(upload(image_bytes(), content_type="text/plain"), max_bytes=100_000, max_pixels=1_000)
    assert clean.content_type == "image/jpeg"
    assert clean.extension == "jpg"
    Image.open(BytesIO(clean.content)).verify()


@pytest.mark.anyio
async def test_invalid_non_image_is_rejected() -> None:
    with pytest.raises(HTTPException) as caught:
        await sanitize_upload(upload(b"not an image"), max_bytes=100_000, max_pixels=1_000)
    assert caught.value.status_code == 422


@pytest.mark.anyio
async def test_unsupported_image_format_is_rejected() -> None:
    with pytest.raises(HTTPException) as caught:
        await sanitize_upload(upload(image_bytes("GIF")), max_bytes=100_000, max_pixels=1_000)
    assert caught.value.status_code == 415


@pytest.mark.anyio
async def test_oversized_image_is_rejected() -> None:
    with pytest.raises(HTTPException) as caught:
        await sanitize_upload(upload(image_bytes()), max_bytes=10, max_pixels=1_000)
    assert caught.value.status_code == 413


@pytest.mark.anyio
async def test_exif_gps_and_other_metadata_are_removed_and_original_not_returned() -> None:
    original = image_bytes(exif=True)
    clean = await sanitize_upload(upload(original), max_bytes=100_000, max_pixels=1_000)
    sanitized = Image.open(BytesIO(clean.content))
    assert sanitized.getexif() == {}
    assert "exif" not in sanitized.info
    assert clean.content != original


@pytest.mark.anyio
async def test_storage_pipeline_uploads_only_sanitized_bytes() -> None:
    original = image_bytes(exif=True)

    class CaptureStorage(StorageService):
        def __init__(self):
            self.max_bytes, self.max_pixels = 100_000, 1_000
            self.uploaded = None

        async def upload(self, bucket, folder, image):
            self.uploaded = image.content
            return f"{folder}/generated.{image.extension}"

    storage = CaptureStorage()
    path, clean = await storage.store_private_image(
        "report-media", type("Owner", (), {"id": "owner"})(), upload(original)
    )
    assert path == "owner/generated.jpg"
    assert storage.uploaded == clean.content
    assert storage.uploaded != original
