from uuid import UUID, uuid4

import httpx
from fastapi import HTTPException, UploadFile

from app.core.config import Settings
from app.core.media import SanitizedImage, sanitize_upload
from app.core.security import CurrentUser


class StorageService:
    def __init__(self, settings: Settings) -> None:
        if not settings.supabase_url or not settings.supabase_secret_key:
            raise HTTPException(status_code=503, detail="Supabase Storage is not configured")
        self.base_url = settings.supabase_url.rstrip("/")
        self.key = settings.supabase_secret_key
        self.timeout = settings.supabase_request_timeout_seconds
        self.max_bytes = settings.media_max_upload_bytes
        self.max_pixels = settings.media_max_pixels

    def _headers(self) -> dict[str, str]:
        headers = {"apikey": self.key}
        if self.key.startswith("eyJ"):
            headers["Authorization"] = f"Bearer {self.key}"
        return headers

    async def sanitize(self, upload: UploadFile) -> SanitizedImage:
        return await sanitize_upload(upload, max_bytes=self.max_bytes, max_pixels=self.max_pixels)

    async def upload(self, bucket: str, folder: str, image: SanitizedImage) -> str:
        object_path = f"{folder}/{uuid4()}.{image.extension}"
        headers = {**self._headers(), "Content-Type": image.content_type, "x-upsert": "false"}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/storage/v1/object/{bucket}/{object_path}",
                    headers=headers,
                    content=image.content,
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase Storage unavailable") from exc
        if response.status_code not in {200, 201}:
            raise HTTPException(status_code=502, detail="Unable to store sanitized image")
        return object_path

    async def remove(self, bucket: str, object_path: str) -> None:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                await client.delete(
                    f"{self.base_url}/storage/v1/object/{bucket}/{object_path}",
                    headers=self._headers(),
                )
        except httpx.HTTPError:
            pass

    async def exists(self, bucket: str, object_path: str) -> bool:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.head(
                    f"{self.base_url}/storage/v1/object/authenticated/{bucket}/{object_path}",
                    headers=self._headers(),
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase Storage unavailable") from exc
        return response.status_code == 200

    async def download(self, bucket: str, object_path: str) -> tuple[bytes, str]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.base_url}/storage/v1/object/authenticated/{bucket}/{object_path}",
                    headers=self._headers(),
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Supabase Storage unavailable") from exc
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Private media not found")
        return response.content, response.headers.get("content-type", "application/octet-stream")

    async def store_private_image(
        self, bucket: str, owner: CurrentUser, upload: UploadFile, *, parent_id: UUID | None = None
    ) -> tuple[str, SanitizedImage]:
        clean = await self.sanitize(upload)
        folder = str(parent_id or owner.id)
        path = await self.upload(bucket, folder, clean)
        return path, clean
