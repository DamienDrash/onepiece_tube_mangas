"""Utility functions for the OnePiece offline downloader.

This module contains helper functions that are used across the backend
components.  Separating these helpers into a dedicated module avoids
circular imports and keeps the code organised.  All functions are small
and self contained; they should perform one well defined task and be
covered by unit tests in a larger project.

Attributes
----------
CHAPTER_OFFSET : int
    A historical constant representing the difference between a chapter
    number and its folder identifier on OnePiece‑Tube.  This offset was
    observed for chapters ≥ 1100.  For chapters outside this range you
    should not rely on this constant; instead call
    :func:`fetch_mangaliste_entries` and look up the ``id`` field.

Notes
-----
This module provides both pure helper functions (such as computing an
historical offset) and higher‑level network functions used by the
downloader.  Helper functions that depend on environment variables
should accept parameters rather than reading from the environment directly
to facilitate testing.
"""

from __future__ import annotations

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional, List, Dict, Any

import json
import re
import logging

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# OnePiece‑Tube stores each chapter in a directory named ``{chapter}-{folder_id}``
# where ``folder_id = chapter + 194`` for late chapters.  This constant was
# observed for chapters ≥1100.  For older chapters please use the
# mapping returned by fetch_mangaliste_entries.
CHAPTER_OFFSET: int = 194


def compute_folder_id(chapter: int) -> int:
    """Compute the remote folder identifier for a given chapter number.

    Parameters
    ----------
    chapter : int
        The publicly known chapter number.  This must be a positive
        integer (e.g., 1156 for the current chapter as of July 2025).

    Returns
    -------
    int
        The folder identifier used in the URL on OnePiece‑Tube.

    Raises
    ------
    ValueError
        If ``chapter`` is not a positive integer.

    Examples
    --------
    >>> compute_folder_id(1156)
    1350
    >>> compute_folder_id(1154)
    1348
    """
    if not isinstance(chapter, int) or chapter <= 0:
        raise ValueError(f"chapter must be a positive integer, got {chapter!r}")
    return chapter + CHAPTER_OFFSET


def ensure_dir(path: Path) -> None:
    """Create a directory if it does not already exist.

    This helper wraps ``path.mkdir`` with sensible defaults and makes the
    intent explicit.  If the directory already exists, no error is raised.

    Parameters
    ----------
    path : Path
        The directory path to create.
    """
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
) -> None:
    """Send a simple plain‑text e‑mail.

    This function encapsulates the boilerplate required to send an e‑mail
    through an SMTP server.  If authentication fails or the connection
    cannot be established, an exception is raised.

    Parameters
    ----------
    smtp_server : str
        The hostname or IP address of the SMTP server.
    smtp_port : int
        The port number of the SMTP server (usually 465 for SSL or 587 for TLS).
    username : str
        Username used for SMTP authentication.
    password : str
        Password used for SMTP authentication.
    sender : str
        The e‑mail address that appears in the ``From`` header.
    recipient : str
        The e‑mail address that appears in the ``To`` header.
    subject : str
        Subject line of the e‑mail.
    body : str
        Body of the e‑mail.  Only plain text is supported.

    Notes
    -----
    Using a dedicated helper for sending e‑mails keeps the rest of the
    codebase agnostic of the underlying SMTP details.  Should you wish to
    switch to a different notification mechanism (e.g., Telegram, Push
    Notifications), this helper can be replaced without touching other
    modules.
    """
    message = MIMEMultipart()
    message["From"] = sender
    message["To"] = recipient
    message["Subject"] = subject
    message.attach(MIMEText(body, "plain"))
    # Establish a secure connection and send the mail.
    with smtplib.SMTP_SSL(smtp_server, smtp_port) as server:
        server.login(username, password)
        server.sendmail(sender, [recipient], message.as_string())


def fetch_mangaliste_entries(
    base_url: str = "https://onepiece.tube",
    session: Optional[requests.Session] = None,
) -> List[Dict[str, Any]]:
    """Fetch the complete chapter metadata table from the manga list page.

    OnePiece‑Tube exposes a list of all manga chapters and their metadata
    (including internal identifiers, availability and publication dates) on
    the *Manga Kapitel* listing page.  The data are embedded as JSON
    within the page's source rather than being available via a dedicated
    API.  This function retrieves the page and extracts the ``entries``
    array from the embedded JSON.  Each entry contains keys such as
    ``id`` (the internal folder ID), ``number`` (the public chapter
    number), ``name`` (German title), ``date`` and ``href``.  The result
    can be used to map chapter numbers to folder identifiers, determine
    which chapters are available and detect new releases.

    Parameters
    ----------
    base_url : str, optional
        Base URL of OnePiece‑Tube.  Changing this is primarily useful for
        testing against a mirror or a locally hosted copy.  The default
        is ``"https://onepiece.tube"``.
    session : requests.Session, optional
        An existing session to re‑use for the HTTP request.  If
        ``None``, a new session is created and closed automatically.

    Returns
    -------
    List[Dict[str, Any]]
        A list of entry dictionaries.  Each entry has at least the
        following keys: ``id`` (``int``), ``number`` (``int``),
        ``name`` (``str``), ``date`` (``str``), ``href`` (``str``),
        ``pages`` (``int``) and ``is_available`` (``bool``).  The list
        may contain more keys if the site exposes them.

    Raises
    ------
    RuntimeError
        If the data cannot be found or parsed.  Network exceptions are
        propagated to the caller.

    Examples
    --------
    >>> entries = fetch_mangaliste_entries()
    >>> latest = max(entries, key=lambda x: x['number'])
    >>> print(latest['number'], latest['id'])  # doctest: +SKIP
    1156 1350
    """
    url = f"{base_url.rstrip('/')}/manga/kapitel-mangaliste"
    close_session = False
    if session is None:
        session = requests.Session()
        close_session = True
    try:
        resp = session.get(url)
        resp.raise_for_status()
        html = resp.text
        # The entries JSON is embedded in a script tag on the page.  It
        # contains keys "entries", "arcs" and others.  We search for
        # '"entries":[' and extract the JSON object that follows.  A
        # simple regex is used here because the HTML is untrusted; after
        # extraction we feed the substring to ``json.loads`` for safe
        # parsing.
        match = re.search(r'entries":\[(.*?)\]', html, re.DOTALL)
        if not match:
            raise RuntimeError("Could not locate entries array in mangaliste page")
        entries_json = f"[{match.group(1)}]"
        # The JSON uses escape sequences for unicode characters; json.loads will
        # handle these correctly.
        entries = json.loads(entries_json)
        return entries
    finally:
        if close_session:
            session.close()


def fetch_chapter_data(
    chapter: int,
    base_url: str = "https://onepiece.tube",
    session: Optional[requests.Session] = None,
) -> Dict[str, Any]:
    """Retrieve metadata for a specific chapter, including page URLs.

    Each chapter page on OnePiece‑Tube embeds a ``window.__data`` object
    containing the chapter title, an array of pages with full URLs and
    dimensions, and contextual information about neighbouring chapters.
    This function downloads the HTML source for the chapter's first
    page (``/manga/kapitel/{chapter}/1``), extracts the JSON object and
    returns it as a Python dictionary.  If the chapter is unavailable
    (e.g., removed or not yet released), a ``ValueError`` is raised.

    Parameters
    ----------
    chapter : int
        Public chapter number to fetch (e.g., ``1156``).
    base_url : str, optional
        Base URL of OnePiece‑Tube.  Defaults to ``"https://onepiece.tube"``.
    session : requests.Session, optional
        Re‑use an existing session.  If ``None`` a new session is
        created and closed automatically.

    Returns
    -------
    Dict[str, Any]
        A dictionary with at least the keys ``chapter`` and
        ``currentChapterId``.  The ``chapter`` sub‑dictionary contains
        ``name`` (German title) and ``pages`` (list of page dicts), each
        with ``url``, ``height``, ``width`` and ``type``.  The
        ``currentChapterId`` corresponds to the folder identifier used
        when constructing download URLs.

    Raises
    ------
    ValueError
        If the chapter is not available (HTTP status 404 or the HTML
        contains a message indicating unavailability).
    RuntimeError
        If the JSON cannot be located or parsed.

    Examples
    --------
    >>> data = fetch_chapter_data(1156)
    >>> folder_id = data['currentChapterId']
    >>> len(data['chapter']['pages'])  # number of pages
    16
    >>> data['chapter']['pages'][0]['url'].endswith('00a.jpg')
    True
    """
    chapter_url = f"{base_url.rstrip('/')}/manga/kapitel/{chapter}/1"
    # Use view‑source to avoid executing JavaScript.  The server serves
    # the same HTML when the page is requested directly; however
    # prefixing with ``view-source:`` ensures we get the unrendered
    # source in all cases.
    view_source_url = f"view-source:{chapter_url}"
    close_session = False
    if session is None:
        session = requests.Session()
        close_session = True
    try:
        resp = session.get(chapter_url)
        if resp.status_code == 404:
            raise ValueError(f"Chapter {chapter} is not available (404)")
        html = resp.text
        # Check for explicit message that the chapter is unavailable.
        if "Dieses Kapitel ist aktuell nicht verf" in html:
            raise ValueError(f"Chapter {chapter} is currently unavailable on the site")
        # Now fetch the view‑source version to extract JSON; some servers
        # may block direct view-source requests, so fall back to using
        # ``html`` if necessary.
        try:
            vs_resp = session.get(view_source_url)
            vs_resp.raise_for_status()
            vs_html = vs_resp.text
        except Exception:
            vs_html = html
        match = re.search(r'window\.__data\s*=\s*(\{.*?\})\s*;', vs_html, re.DOTALL)
        if not match:
            raise RuntimeError(f"Could not locate window.__data JSON for chapter {chapter}")
        data_obj = json.loads(match.group(1))
        return data_obj
    finally:
        if close_session:
            session.close()
