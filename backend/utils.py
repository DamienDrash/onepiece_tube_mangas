"""Utility functions for the OnePiece offline downloader."""

from __future__ import annotations

import json
import logging
import os
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

CHAPTER_OFFSET: int = 194


def compute_folder_id(chapter: int) -> int:
    """Return remote folder ID for a chapter number (chapter + 194)."""
    if not isinstance(chapter, int) or chapter <= 0:
        raise ValueError(f"chapter must be a positive integer, got {chapter!r}")
    return chapter + CHAPTER_OFFSET


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def send_email_notification(
    smtp_server: str,
    smtp_port: int,
    username: str,
    password: str,
    sender: str,
    recipient: str,
    subject: str,
    body: str,
    use_starttls: bool = False,
) -> None:
    """Send a plain-text e-mail via SMTP.

    Parameters
    ----------
    use_starttls : bool
        If True, use STARTTLS (port 587). If False, use SSL (port 465).
    """
    message = MIMEMultipart()
    message["From"] = sender
    message["To"] = recipient
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain"))

    if use_starttls:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(username, password)
            server.sendmail(sender, [recipient], message.as_string())
    else:
        with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
            server.login(username, password)
            server.sendmail(sender, [recipient], message.as_string())


def fetch_mangaliste_entries(
    base_url: str = "https://onepiece.tube",
    session: Optional[requests.Session] = None,
) -> List[Dict[str, Any]]:
    """Fetch chapter metadata from the manga list page."""
    url = f"{base_url.rstrip('/')}/manga/kapitel-mangaliste"
    close_session = False
    if session is None:
        session = requests.Session()
        close_session = True
    try:
        resp = session.get(url)
        resp.raise_for_status()
        match = re.search(r'entries":\[(.*?)\]', resp.text, re.DOTALL)
        if not match:
            raise RuntimeError("Could not locate entries array in mangaliste page")
        return json.loads(f"[{match.group(1)}]")
    finally:
        if close_session:
            session.close()


def fetch_chapter_data(
    chapter: int,
    base_url: str = "https://onepiece.tube",
    session: Optional[requests.Session] = None,
) -> Dict[str, Any]:
    """Retrieve metadata for a specific chapter, including page URLs."""
    chapter_url = f"{base_url.rstrip('/')}/manga/kapitel/{chapter}/1"
    close_session = False
    if session is None:
        session = requests.Session()
        close_session = True
    try:
        resp = session.get(chapter_url)
        if resp.status_code == 404:
            raise ValueError(f"Chapter {chapter} is not available (404)")
        html = resp.text
        if "Dieses Kapitel ist aktuell nicht verf" in html:
            raise ValueError(f"Chapter {chapter} is currently unavailable on the site")
        match = re.search(r'window\.__data\s*=\s*(\{.*?\})\s*;', html, re.DOTALL)
        if not match:
            raise RuntimeError(f"Could not locate window.__data JSON for chapter {chapter}")
        return json.loads(match.group(1))
    finally:
        if close_session:
            session.close()
