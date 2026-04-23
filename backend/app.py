"""FastAPI application exposing chapter download and update endpoints."""

from __future__ import annotations

# Load .env before other local imports that read env vars at module level
from dotenv import load_dotenv
load_dotenv()

import datetime
import logging
import logging.config
import os
import shutil
import tempfile
import zipfile
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel, EmailStr

from downloader import ChapterDownloader
from notification import ChapterNotifier
from scheduler import UpdateScheduler
from web_push import web_push_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEFAULT_STORAGE_DIR = Path(os.getenv("STORAGE_DIR", "./data"))
DEFAULT_BASE_URL = os.getenv("BASE_URL", "https://onepiece.tube").rstrip("/")
API_KEY = os.getenv("API_KEY", "")
MAX_BULK_CHAPTERS = int(os.getenv("MAX_BULK_CHAPTERS", "50"))

CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS", "http://localhost:3001,http://127.0.0.1:3001"
    ).split(",")
    if o.strip()
]

SMTP_CONFIG = {
    "host": os.getenv("SMTP_HOST"),
    "port": int(os.getenv("SMTP_PORT", "465")) if os.getenv("SMTP_PORT") else 465,
    "username": os.getenv("SMTP_USERNAME"),
    "password": os.getenv("SMTP_PASSWORD"),
    "sender": os.getenv("SMTP_SENDER"),
    "use_starttls": os.getenv("SMTP_USE_STARTTLS", "false").lower() == "true",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

downloader = ChapterDownloader(storage_dir=DEFAULT_STORAGE_DIR, base_url=DEFAULT_BASE_URL)
notifier = ChapterNotifier(base_url=DEFAULT_BASE_URL, smtp_config=SMTP_CONFIG)

_scheduler: Optional[UpdateScheduler] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler
    auto_download = os.getenv("AUTO_DOWNLOAD", "false").lower() == "true"
    if auto_download:
        interval = int(os.getenv("SCHEDULER_INTERVAL_MINUTES", "60"))
        recipient = os.getenv("NOTIFY_RECIPIENT")
        _scheduler = UpdateScheduler(
            downloader=downloader,
            notifier=notifier,
            interval_minutes=interval,
            recipient=recipient,
        )
        _scheduler.start()
        logger.info("Auto-download scheduler started (interval=%d min)", interval)
    yield
    if _scheduler:
        _scheduler.stop()
        logger.info("Scheduler stopped")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="OnePiece Offline API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    if API_KEY and request.url.path.startswith("/api/"):
        provided = request.headers.get("X-API-Key", "")
        if provided != API_KEY:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "Invalid or missing API key"},
            )
    return await call_next(request)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class NotifyRequest(BaseModel):
    current_latest: int
    recipient: EmailStr


class PushSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]


class PushNotificationRequest(BaseModel):
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "onepiece-offline-api"}


@app.get("/api/health")
def api_health_check():
    return {"status": "healthy", "service": "onepiece-offline-api"}


# ---------------------------------------------------------------------------
# Chapters
# ---------------------------------------------------------------------------

@app.get("/api/chapters", response_model=List[Dict[str, Any]])
def list_chapters() -> List[Dict[str, Any]]:
    result: List[Dict[str, Any]] = []
    if not DEFAULT_STORAGE_DIR.exists():
        return result
    for subdir in sorted(DEFAULT_STORAGE_DIR.iterdir()):
        if not subdir.is_dir():
            continue
        try:
            chapter_int = int(subdir.name)
        except ValueError:
            continue
        epub_files = list(subdir.glob("*.epub"))
        if epub_files:
            epub_path = epub_files[0].relative_to(DEFAULT_STORAGE_DIR)
            pages = (
                len(list((subdir / "images").glob("*.*")))
                if (subdir / "images").exists()
                else 0
            )
            result.append({
                "chapter": chapter_int,
                "title": f"Kapitel {chapter_int}",
                "epub": str(epub_path),
                "pages": pages,
            })
    return sorted(result, key=lambda x: x["chapter"])


@app.get("/api/chapters/{chapter}/epub")
def get_chapter_epub(chapter: int):
    chapter_dir = DEFAULT_STORAGE_DIR / str(chapter)
    epub_files = list(chapter_dir.glob("*.epub"))
    if not epub_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chapter {chapter} has not been downloaded",
        )
    return FileResponse(
        epub_files[0],
        media_type="application/epub+zip",
        filename=f"onepiece_kapitel_{chapter}.epub",
    )


@app.post("/api/chapters/{chapter}", status_code=status.HTTP_201_CREATED)
def download_endpoint(chapter: int) -> Dict[str, Any]:
    try:
        epub_path = downloader.download_chapter(chapter)
        relative = epub_path.relative_to(DEFAULT_STORAGE_DIR)
        return {
            "chapter": chapter,
            "epub": str(relative),
            "title": f"Kapitel {chapter}",
            "status": "downloaded",
        }
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception:
        logger.exception("download_endpoint failed for chapter %d", chapter)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Download failed",
        )


@app.delete("/api/chapters/{chapter_number}")
def delete_chapter(chapter_number: int):
    chapter_dir = DEFAULT_STORAGE_DIR / str(chapter_number)
    if not chapter_dir.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chapter {chapter_number} not found",
        )
    try:
        shutil.rmtree(chapter_dir)
        return {"status": "deleted", "chapter": chapter_number}
    except Exception:
        logger.exception("delete_chapter failed for chapter %d", chapter_number)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Delete failed",
        )


IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}


def _get_chapter_images(chapter_number: int) -> List[Path]:
    images_dir = DEFAULT_STORAGE_DIR / str(chapter_number) / "images"
    if not images_dir.exists():
        return []
    files = [f for f in images_dir.iterdir() if f.suffix.lower() in IMAGE_EXTENSIONS]
    return sorted(files, key=lambda p: p.name)


@app.get("/api/chapters/{chapter_number}/pages")
def get_chapter_pages(chapter_number: int):
    images = _get_chapter_images(chapter_number)
    if not images:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chapter {chapter_number} not downloaded or has no images",
        )
    return {
        "chapter": chapter_number,
        "count": len(images),
        "pages": [{"index": i, "filename": img.name} for i, img in enumerate(images)],
    }


@app.get("/api/chapters/{chapter_number}/page/{page_index}")
def get_chapter_page(chapter_number: int, page_index: int):
    images = _get_chapter_images(chapter_number)
    if not images:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
    if page_index < 0 or page_index >= len(images):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Page not found")
    img = images[page_index]
    _media = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
              '.webp': 'image/webp', '.gif': 'image/gif'}
    media_type = _media.get(img.suffix.lower(), 'image/jpeg')
    return FileResponse(
        img,
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )


@app.get("/api/chapters/{chapter_number}/pdf")
def download_pdf(chapter_number: int):
    pdf_path = DEFAULT_STORAGE_DIR / str(chapter_number) / f"onepiece_{chapter_number}.pdf"
    if not pdf_path.exists():
        try:
            downloader.create_pdf_from_images(chapter_number)
        except Exception:
            logger.exception("PDF generation failed for chapter %d", chapter_number)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="PDF generation failed",
            )
    if not pdf_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PDF for chapter {chapter_number} not found",
        )
    return FileResponse(
        path=str(pdf_path),
        filename=f"onepiece_chapter_{chapter_number}.pdf",
        media_type="application/pdf",
    )


@app.get("/api/chapters/{chapter_number}/cbz")
def download_cbz(chapter_number: int):
    cbz_path = DEFAULT_STORAGE_DIR / str(chapter_number) / f"onepiece_{chapter_number}.cbz"
    if not cbz_path.exists():
        try:
            downloader.create_cbz_from_images(chapter_number)
        except Exception:
            logger.exception("CBZ generation failed for chapter %d", chapter_number)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="CBZ generation failed",
            )
    if not cbz_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CBZ for chapter {chapter_number} not found",
        )
    return FileResponse(
        path=str(cbz_path),
        filename=f"onepiece_chapter_{chapter_number}.cbz",
        media_type="application/zip",
    )


# ---------------------------------------------------------------------------
# Latest / Available
# ---------------------------------------------------------------------------

@app.get("/api/latest")
def latest_available() -> Dict[str, Any]:
    latest = notifier.get_latest_number()
    if latest is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not determine latest chapter number",
        )
    return {"latest": latest}


@app.get("/api/available-chapters")
def get_available_chapters() -> Dict[str, Any]:
    try:
        notifier.refresh()
        chapters = []
        for entry in notifier.entries:
            date_value = entry.get("date")
            chapters.append({
                "number": entry.get("number"),
                "title": entry.get("name", f"Kapitel {entry.get('number')}"),
                "date": date_value if (date_value and isinstance(date_value, str) and date_value.strip()) else None,
                "available": entry.get("is_available", True),
                "pages": entry.get("pages", 0),
            })
        return {
            "chapters": sorted(chapters, key=lambda x: x["number"], reverse=True),
            "total": len(chapters),
        }
    except Exception:
        logger.exception("get_available_chapters failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not fetch available chapters",
        )


# ---------------------------------------------------------------------------
# Notify
# ---------------------------------------------------------------------------

@app.post("/api/notify")
def notify_endpoint(payload: NotifyRequest) -> Dict[str, Any]:
    new_entries = notifier.check_for_update(payload.current_latest)
    try:
        notifier.send_email_notifications(new_entries, str(payload.recipient))
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )
    return {"new_chapters": [e["number"] for e in new_entries]}


# ---------------------------------------------------------------------------
# Push Notifications
# ---------------------------------------------------------------------------

@app.get("/api/push/vapid-public-key")
def get_vapid_public_key():
    return {"publicKey": web_push_service.get_public_key()}


@app.post("/api/push/subscribe")
def subscribe_to_push(subscription: PushSubscription):
    success = web_push_service.subscribe(subscription.dict())
    if success:
        return {"status": "subscribed"}
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Failed to subscribe",
    )


@app.post("/api/push/unsubscribe")
def unsubscribe_from_push(endpoint: str):
    success = web_push_service.unsubscribe(endpoint)
    if success:
        return {"status": "unsubscribed"}
    return {"status": "not_found"}


@app.post("/api/push/send")
def send_push_notification(notification: PushNotificationRequest):
    count = web_push_service.send_notification(
        notification.title, notification.message, notification.data
    )
    return {"status": "sent", "count": count}


@app.get("/api/push/stats")
def get_push_stats():
    return {"subscribers": web_push_service.get_subscription_count(), "service_active": True}


# ---------------------------------------------------------------------------
# Bulk Operations
# ---------------------------------------------------------------------------

@app.post("/api/bulk/chapters/delete")
def delete_multiple_chapters(chapter_numbers: List[int]):
    if len(chapter_numbers) > MAX_BULK_CHAPTERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Max {MAX_BULK_CHAPTERS} chapters per bulk request",
        )
    deleted: List[int] = []
    failed: List[Dict[str, Any]] = []

    for num in chapter_numbers:
        chapter_dir = DEFAULT_STORAGE_DIR / str(num)
        if not chapter_dir.exists():
            failed.append({"chapter": num, "reason": "not found"})
            continue
        try:
            shutil.rmtree(chapter_dir)
            deleted.append(num)
        except Exception as exc:
            logger.exception("bulk delete failed for chapter %d", num)
            failed.append({"chapter": num, "reason": "delete failed"})

    return {
        "status": "completed",
        "deleted": deleted,
        "failed": failed,
        "total_requested": len(chapter_numbers),
        "total_deleted": len(deleted),
    }


@app.post("/api/bulk/chapters/download")
def bulk_download_chapters(chapter_numbers: List[int]):
    if len(chapter_numbers) > MAX_BULK_CHAPTERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Max {MAX_BULK_CHAPTERS} chapters per bulk request",
        )
    downloaded: List[Dict[str, Any]] = []
    failed: List[Dict[str, Any]] = []

    for num in chapter_numbers:
        try:
            epub_path = downloader.download_chapter(num)
            downloaded.append({
                "chapter": num,
                "epub": str(epub_path.relative_to(DEFAULT_STORAGE_DIR)),
                "status": "downloaded",
            })
        except Exception:
            logger.exception("bulk download failed for chapter %d", num)
            failed.append({"chapter": num, "reason": "download failed"})

    return {
        "status": "completed",
        "downloaded": downloaded,
        "failed": failed,
        "total_requested": len(chapter_numbers),
        "total_downloaded": len(downloaded),
    }


@app.post("/api/bulk/chapters/download-zip")
def bulk_download_zip(chapter_numbers: List[int], format: str = "epub"):
    if len(chapter_numbers) > MAX_BULK_CHAPTERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Max {MAX_BULK_CHAPTERS} chapters per bulk request",
        )
    if format not in ("epub", "pdf", "cbz"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format must be one of: epub, pdf, cbz",
        )

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_filename = f"onepiece_chapters_{timestamp}.zip"
    zip_path = Path(tempfile.gettempdir()) / zip_filename

    try:
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for num in chapter_numbers:
                try:
                    chapter_dir = DEFAULT_STORAGE_DIR / str(num)
                    file_path = chapter_dir / f"onepiece_{num}.{format}"
                    if not file_path.exists():
                        if format == "epub":
                            downloader.download_chapter(num)
                        elif format == "pdf":
                            downloader.create_pdf_from_images(num)
                        elif format == "cbz":
                            downloader.create_cbz_from_images(num)
                    if file_path.exists():
                        zf.write(file_path, f"onepiece_chapter_{num}.{format}")
                except Exception:
                    logger.warning("Skipping chapter %d in ZIP (error)", num)

        with open(zip_path, "rb") as f:
            zip_content = f.read()

        return Response(
            content=zip_content,
            media_type="application/zip",
            headers={
                "Content-Disposition": f"attachment; filename={zip_filename}",
                "Content-Length": str(len(zip_content)),
            },
        )
    except Exception:
        logger.exception("bulk_download_zip failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ZIP creation failed",
        )
    finally:
        if zip_path.exists():
            zip_path.unlink(missing_ok=True)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", "8001")))
