"""FastAPI application exposing chapter download and update endpoints.

This module defines a small RESTful API around the :class:`ChapterDownloader`
and :class:`ChapterNotifier` classes.  It allows clients to
list downloaded chapters, trigger downloads of new chapters, query for
the latest available chapter on the remote site and send e‑mail
notifications about new releases.

To start the server locally run::

    uvicorn backend.app:app --reload --host 0.0.0.0 --port 8001

The application reads configuration from environment variables.  See
``.env.example`` for a description of all supported variables.

Endpoints
---------
* ``GET /api/chapters`` – list downloaded chapters (EPUB files).
* ``POST /api/chapters/{chapter}`` – download a specific chapter and
  build its EPUB.
* ``GET /api/latest`` – return the latest chapter number available on
  OnePiece‑Tube.
* ``POST /api/notify`` – check for new chapters since a given number
  and send e‑mail notifications.
* ``GET /api/chapters/{chapter}/epub`` – download EPUB file for a chapter.

Notes
-----
This module avoids any business logic; instead it delegates to the
``downloader`` and ``notifier`` instances.  Exceptions are mapped to
HTTP error codes.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from downloader import ChapterDownloader
from notification import ChapterNotifier
from web_push import web_push_service


# Load environment variables from .env if present
load_dotenv()

# Configuration defaults
DEFAULT_STORAGE_DIR = Path(os.getenv("STORAGE_DIR", "./data"))
DEFAULT_BASE_URL = os.getenv("BASE_URL", "https://onepiece.tube").rstrip("/")

# SMTP configuration from environment.  Optional – e‑mail notifications
# will fail if these variables are missing.
SMTP_CONFIG = {
    "host": os.getenv("SMTP_HOST"),
    "port": int(os.getenv("SMTP_PORT", "0")) if os.getenv("SMTP_PORT") else None,
    "username": os.getenv("SMTP_USERNAME"),
    "password": os.getenv("SMTP_PASSWORD"),
    "sender": os.getenv("SMTP_SENDER"),
}


# Instantiate helper classes.  They are global so that sessions are
# reused across requests.
downloader = ChapterDownloader(
    storage_dir=DEFAULT_STORAGE_DIR,
    base_url=DEFAULT_BASE_URL,
)
notifier = ChapterNotifier(
    base_url=DEFAULT_BASE_URL,
    smtp_config=SMTP_CONFIG,
)

app = FastAPI(title="OnePiece Offline API", version="1.0.0")

# Add CORS middleware to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://127.0.0.1:3001"],  # Frontend port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class NotifyRequest(BaseModel):
    """Payload for the notify endpoint.

    Attributes
    ----------
    current_latest : int
        The chapter number currently known to the caller.  The server
        will look for chapters with a higher number.
    recipient : str
        E‑mail address of the person to notify.  Must be set when
        e‑mails should be sent.
    """

    current_latest: int
    recipient: str


class PushSubscription(BaseModel):
    """Web Push subscription data from browser."""
    endpoint: str
    keys: Dict[str, str]  # Contains p256dh and auth keys


class PushNotificationRequest(BaseModel):
    """Request to send a push notification."""
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "onepiece-offline-api"}


@app.get("/api/health")
def api_health_check():
    """API Health check endpoint for frontend."""
    return {"status": "healthy", "service": "onepiece-offline-api"}


@app.get("/api/chapters", response_model=List[Dict[str, Any]])
def list_chapters() -> List[Dict[str, Any]]:
    """Return a list of downloaded chapters.

    The endpoint scans the storage directory for subfolders containing
    EPUB files.  Each returned dictionary includes the chapter number
    and the path to the EPUB relative to the storage directory.
    """
    result: List[Dict[str, Any]] = []
    for subdir in sorted(DEFAULT_STORAGE_DIR.iterdir()):
        if not subdir.is_dir():
            continue
        chapter_num = subdir.name
        try:
            chapter_int = int(chapter_num)
        except ValueError:
            continue
        epub_files = list(subdir.glob("*.epub"))
        if epub_files:
            # In this implementation we expect exactly one EPUB per chapter
            epub_path = epub_files[0].relative_to(DEFAULT_STORAGE_DIR)
            result.append({
                "chapter": chapter_int,
                "title": f"Kapitel {chapter_int}",
                "epub": str(epub_path),
                "pages": len(list((subdir / "images").glob("*.*"))) if (subdir / "images").exists() else 0
            })
    return sorted(result, key=lambda x: x["chapter"])


@app.get("/api/chapters/{chapter}/epub")
def get_chapter_epub(chapter: int):
    """Return the EPUB file for a downloaded chapter.

    If the chapter has not yet been downloaded, return 404.  The
    response is a file download rather than JSON.
    """
    chapter_dir = DEFAULT_STORAGE_DIR / str(chapter)
    epub_files = list(chapter_dir.glob("*.epub"))
    if not epub_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chapter {chapter} has not been downloaded",
        )
    epub_path = epub_files[0]
    return FileResponse(
        epub_path, 
        media_type="application/epub+zip", 
        filename=f"onepiece_kapitel_{chapter}.epub"
    )


@app.post("/api/chapters/{chapter}", status_code=status.HTTP_201_CREATED)
def download_endpoint(chapter: int) -> Dict[str, Any]:
    """Download a chapter and return metadata about the generated file.

    If the chapter is already downloaded, the existing EPUB is returned.
    If the chapter does not exist or cannot be downloaded, an appropriate
    HTTP error is raised.
    """
    try:
        epub_path = downloader.download_chapter(chapter)
        relative = epub_path.relative_to(DEFAULT_STORAGE_DIR)
        return {
            "chapter": chapter,
            "epub": str(relative),
            "title": f"Kapitel {chapter}",
            "status": "downloaded"
        }
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        # Log the exception and return internal error
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@app.get("/api/latest")
def latest_available() -> Dict[str, Any]:
    """Return the latest available chapter number on the remote site.

    This endpoint queries the manga list for the most recent chapter
    published on OnePiece‑Tube.  It does not download any data.
    """
    latest = notifier.get_latest_number()
    if latest is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not determine latest chapter number",
        )
    return {"latest": latest}


@app.get("/api/available-chapters")
def get_available_chapters() -> Dict[str, Any]:
    """Return a list of all available chapters from the remote site."""
    try:
        notifier.refresh()
        entries = notifier.entries
        chapters = []
        for entry in entries:
            chapters.append({
                "number": entry.get("number"),
                "title": entry.get("name", f"Kapitel {entry.get('number')}"),
                "date": entry.get("date"),
                "available": entry.get("is_available", True),
                "pages": entry.get("pages", 0)
            })
        return {
            "chapters": sorted(chapters, key=lambda x: x["number"], reverse=True),
            "total": len(chapters)
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not fetch available chapters: {str(exc)}"
        )


@app.post("/api/notify")
def notify_endpoint(payload: NotifyRequest) -> Dict[str, Any]:
    """Check for new chapters and send notifications.

    The server compares the caller's ``current_latest`` with the
    chapters available on the site.  If newer chapters exist it sends
    an e‑mail to ``recipient`` for each new chapter.  The response
    includes a list of the new chapter numbers.
    """
    new_entries = notifier.check_for_update(payload.current_latest)
    try:
        notifier.send_email_notifications(new_entries, payload.recipient)
    except KeyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )
    numbers = [e["number"] for e in new_entries]
    return {"new_chapters": numbers}


# Web Push Notification Endpoints

@app.get("/api/push/vapid-public-key")
def get_vapid_public_key():
    """Get VAPID public key for push subscription."""
    return {"publicKey": web_push_service.get_public_key()}


@app.post("/api/push/subscribe")
def subscribe_to_push(subscription: PushSubscription):
    """Subscribe to push notifications."""
    success = web_push_service.subscribe(subscription.dict())
    if success:
        return {"status": "subscribed", "message": "Successfully subscribed to push notifications"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to subscribe to push notifications"
        )


@app.post("/api/push/unsubscribe")
def unsubscribe_from_push(endpoint: str):
    """Unsubscribe from push notifications."""
    success = web_push_service.unsubscribe(endpoint)
    if success:
        return {"status": "unsubscribed", "message": "Successfully unsubscribed from push notifications"}
    else:
        return {"status": "not_found", "message": "Subscription not found"}


@app.post("/api/push/send")
def send_push_notification(notification: PushNotificationRequest):
    """Send push notification to all subscribers (for testing/admin use)."""
    count = web_push_service.send_notification(
        notification.title,
        notification.message,
        notification.data
    )
    return {
        "status": "sent",
        "message": f"Push notification sent to {count} subscribers",
        "count": count
    }


@app.get("/api/push/stats")
def get_push_stats():
    """Get push notification statistics."""
    return {
        "subscribers": web_push_service.get_subscription_count(),
        "service_active": True
    }


@app.delete("/api/chapters/{chapter_number}")
def delete_chapter(chapter_number: int):
    """Delete downloaded chapter files.
    
    Parameters
    ----------
    chapter_number : int
        Chapter number to delete
        
    Returns
    -------
    dict
        Deletion status
    """
    try:
        chapter_dir = Path(STORAGE_DIR) / str(chapter_number)
        if not chapter_dir.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chapter {chapter_number} not found"
            )
        
        # Delete all files in chapter directory
        import shutil
        shutil.rmtree(chapter_dir)
        
        return {
            "status": "deleted",
            "chapter": chapter_number,
            "message": f"Chapter {chapter_number} deleted successfully"
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete chapter: {str(exc)}"
        ) from exc


@app.get("/api/chapters/{chapter_number}/pdf")
def download_pdf(chapter_number: int):
    """Download PDF file for a specific chapter."""
    try:
        pdf_path = Path(STORAGE_DIR) / str(chapter_number) / f"onepiece_{chapter_number}.pdf"
        if not pdf_path.exists():
            # Generate PDF if it doesn't exist
            from downloader import ChapterDownloader
            downloader = ChapterDownloader(STORAGE_DIR)
            downloader._create_pdf_from_images(chapter_number)
            
        if not pdf_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"PDF file for chapter {chapter_number} not found"
            )
        
        return FileResponse(
            path=str(pdf_path),
            filename=f"onepiece_chapter_{chapter_number}.pdf",
            media_type="application/pdf"
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download PDF: {str(exc)}"
        ) from exc


@app.get("/api/chapters/{chapter_number}/cbz")
def download_cbz(chapter_number: int):
    """Download CBZ file for a specific chapter."""
    try:
        cbz_path = Path(STORAGE_DIR) / str(chapter_number) / f"onepiece_{chapter_number}.cbz"
        if not cbz_path.exists():
            # Generate CBZ if it doesn't exist
            from downloader import ChapterDownloader
            downloader = ChapterDownloader(STORAGE_DIR)
            downloader._create_cbz_from_images(chapter_number)
            
        if not cbz_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"CBZ file for chapter {chapter_number} not found"
            )
        
        return FileResponse(
            path=str(cbz_path),
            filename=f"onepiece_chapter_{chapter_number}.cbz",
            media_type="application/zip"
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download CBZ: {str(exc)}"
        ) from exc


@app.post("/api/chapters/delete-multiple")
def delete_multiple_chapters(chapter_numbers: List[int]):
    """Delete multiple downloaded chapters.
    
    Parameters
    ----------
    chapter_numbers : List[int]
        List of chapter numbers to delete
        
    Returns
    -------
    dict
        Deletion status with details
    """
    try:
        deleted = []
        failed = []
        
        for chapter_number in chapter_numbers:
            try:
                chapter_dir = Path(STORAGE_DIR) / str(chapter_number)
                if chapter_dir.exists():
                    import shutil
                    shutil.rmtree(chapter_dir)
                    deleted.append(chapter_number)
                else:
                    failed.append({"chapter": chapter_number, "reason": "not found"})
            except Exception as e:
                failed.append({"chapter": chapter_number, "reason": str(e)})
        
        return {
            "status": "completed",
            "deleted": deleted,
            "failed": failed,
            "total_requested": len(chapter_numbers),
            "total_deleted": len(deleted)
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete chapters: {str(exc)}"
        ) from exc


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run(app, host=host, port=port)
