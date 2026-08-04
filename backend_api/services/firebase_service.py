import os
import re
import uuid
import asyncio
import traceback
import gc
from io import BytesIO
from typing import Optional

from fastapi import UploadFile
import firebase_admin
from firebase_admin import storage
from PIL import Image


async def upload_to_firebase(file: UploadFile, destination_path: str, optimize_image: bool = False) -> Optional[str]:
    try:
        app_instance = firebase_admin.get_app()
    except ValueError:
        return None

    try:
        bucket_name = app_instance.options.get('storageBucket')
        if not bucket_name:
            return None
        bucket = storage.bucket(bucket_name, app=app_instance)

        filename_base, file_extension = os.path.splitext(file.filename)
        safe_filename_base = re.sub(r"[^a-zA-Z0-9_\-]", "_", filename_base)
        unique_filename = f"{uuid.uuid4()}_{safe_filename_base}{file_extension}"
        blob_path = f"{destination_path.strip('/')}/{unique_filename}"
        blob = bucket.blob(blob_path, chunk_size=256 * 1024)

        if not (optimize_image and file.content_type and 'image' in file.content_type):
            await asyncio.to_thread(
                blob.upload_from_file,
                file.file,
                content_type=file.content_type,
                size=file.size
            )
            return blob_path

        return await _optimizar_y_subir_imagen(file, blob, blob_path)

    except Exception as e:
        print(f"ERROR: {e}")
        return None


async def _optimizar_y_subir_imagen(file: UploadFile, blob, blob_path: str) -> Optional[str]:
    try:
        MAX_MEMORIA = 20 * 1024 * 1024
        chunks = []
        total = 0
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_MEMORIA:
                file.file.seek(0)
                blob.upload_from_file(file.file, content_type=file.content_type, size=file.size)
                return blob_path
            chunks.append(chunk)

        image_data = b''.join(chunks)
        del chunks

        img = Image.open(BytesIO(image_data))
        del image_data

        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        img.thumbnail((800, 800))

        output = BytesIO()
        img.save(output, format="JPEG", quality=70, optimize=True)
        img.close()
        del img

        output.seek(0)
        blob.upload_from_file(output, content_type="image/jpeg")
        output.close()
        del output

        gc.collect()
        return blob_path

    except Exception:
        file.file.seek(0)
        blob.upload_from_file(file.file, content_type=file.content_type, size=file.size)
        return blob_path


async def delete_from_firebase(file_path_in_storage: str) -> bool:
    try:
        app_instance = firebase_admin.get_app()
        bucket_name = app_instance.options.get('storageBucket')
        if not bucket_name:
            return False

        bucket = storage.bucket(bucket_name, app=app_instance)
        blob = bucket.blob(file_path_in_storage)
        blob.delete()
        return True

    except Exception as e:
        print(f"ERROR_DELETE: {e}")
        traceback.print_exc()
        return False