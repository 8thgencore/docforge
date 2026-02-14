from __future__ import annotations

import zipfile
from pathlib import Path

import aiofiles
from fastapi import UploadFile


async def save_upload(upload: UploadFile, destination: Path) -> Path:
    destination.parent.mkdir(parents=True, exist_ok=True)
    async with aiofiles.open(destination, "wb") as out_file:
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            await out_file.write(chunk)
    await upload.close()
    return destination


def extract_zip(archive_path: Path, destination_dir: Path) -> list[Path]:
    destination_dir.mkdir(parents=True, exist_ok=True)
    extracted_paths: list[Path] = []
    with zipfile.ZipFile(archive_path, "r") as archive:
        for member in archive.infolist():
            if member.is_dir():
                continue
            normalized = Path(member.filename)
            if normalized.is_absolute() or ".." in normalized.parts:
                continue
            target_path = destination_dir / normalized
            target_path.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(member, "r") as src, target_path.open("wb") as dst:
                dst.write(src.read())
            extracted_paths.append(target_path)
    return extracted_paths
