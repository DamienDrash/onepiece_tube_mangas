"""Chapter download and EPUB creation logic.

This module contains the :class:`ChapterDownloader` class, which
encapsulates all steps required to fetch a manga chapter from
OnePiece‑Tube, download its individual pages and assemble them into an
EPUB file.  The downloader is designed to be reusable in a larger
application (e.g., a web API or a scheduled job).

Usage is straightforward: instantiate :class:`ChapterDownloader` with
appropriate configuration (storage directory, user agent, etc.) and call
its :meth:`~ChapterDownloader.download_chapter` method with the
desired chapter number.  The method returns the path to the generated
EPUB file or raises an exception on failure.

The code in this module deliberately avoids global state; instead
configuration is passed via the constructor.  Network requests are
performed using :mod:`requests` and rely on the helper functions in
``utils.py`` to fetch chapter metadata.  EPUB generation uses the
`ebooklib <https://pypi.org/project/EbookLib/>`_ package.

Notes
-----
* The downloader preserves the original order of pages as provided by
  the site.  Double pages (e.g., ``04-05.jpg``) are treated as a
  single page in the EPUB.
* Images are cached on disk.  If a download fails mid‑way, partial
  files remain in the temporary directory.  When retrying the same
  chapter the downloader will re‑use existing files.
* The resulting EPUB conforms to EPUB 3 and can be read by common
  readers such as Calibre, Apple Books or Kindle (after conversion).

Examples
--------

>>> from onepiece_offline.backend.downloader import ChapterDownloader
>>> downloader = ChapterDownloader(storage_dir="./data")
>>> epub_path = downloader.download_chapter(1156)
>>> print(epub_path)  # doctest: +SKIP
data/1156/onepiece_1156.epub

"""

from __future__ import annotations

import mimetypes
import os
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

import logging
import requests
from ebooklib import epub

from utils import (
    fetch_chapter_data,
    ensure_dir,
)

logger = logging.getLogger(__name__)


class ChapterDownloader:
    """High‑level interface for downloading chapters and building EPUBs.

    Parameters
    ----------
    storage_dir : str or Path
        Directory where downloaded images and generated EPUBs will be
        stored.  Each chapter is placed into its own subdirectory under
        this path.  The directory will be created if it does not exist.
    base_url : str, optional
        Base URL of OnePiece‑Tube.  Defaults to ``"https://onepiece.tube"``.
    user_agent : str, optional
        Value of the ``User‑Agent`` header sent with HTTP requests.  Some
        servers may refuse connections with generic default user agents.
    timeout : int or float, optional
        Timeout in seconds for network requests.  A value of
        ``None`` (the default) disables timeouts.

    Attributes
    ----------
    session : requests.Session
        A persistent session used for all HTTP requests.  This reduces
        overhead by re‑using TCP connections and allows cookies to be
        shared across requests.
    storage_dir : Path
        Normalised version of the storage directory where files are
        written.
    base_url : str
        Base URL for building chapter URLs.
    user_agent : str
        User agent string used in request headers.
    timeout : Optional[float]
        Timeout applied to HTTP requests.
    """

    def __init__(
        self,
        storage_dir: Path,
        base_url: str = "https://onepiece.tube",
        user_agent: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.storage_dir = Path(storage_dir)
        ensure_dir(self.storage_dir)
        self.user_agent = user_agent or (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            " AppleWebKit/537.36 (KHTML, like Gecko)"
            " Chrome/115.0 Safari/537.36"
        )
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": self.user_agent})

    def _download_image(self, url: str, dest_path: Path) -> None:
        """Download a single image and write it to ``dest_path``.

        If the file already exists at ``dest_path`` it is not re‑downloaded.
        Errors are logged and propagated to the caller.

        Parameters
        ----------
        url : str
            Absolute URL of the image to download.
        dest_path : Path
            Local filesystem path where the image should be saved.

        Raises
        ------
        requests.HTTPError
            If the HTTP status is not successful.
        IOError
            If the file cannot be written.
        """
        if dest_path.exists():
            logger.debug("Skipping download of %s; file already exists", dest_path)
            return
        logger.info("Downloading image %s", url)
        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(dest_path, "wb") as f:
            f.write(resp.content)

    def _create_epub(
        self,
        chapter: int,
        title: str,
        image_files: List[Path],
        output_path: Path,
    ) -> None:
        """Assemble an EPUB from the downloaded images.

        Parameters
        ----------
        chapter : int
            Chapter number used in metadata and file naming.
        title : str
            German title of the chapter as provided by the site.
        image_files : list of Path
            Paths to the image files in reading order.
        output_path : Path
            Destination file (should end with ``.epub``).

        Notes
        -----
        The generated EPUB contains one HTML page per manga page for optimal
        reading experience. Each page displays exactly one image centered
        and optimized for e-readers.
        """
        book = epub.EpubBook()
        book.set_title(f"One Piece – Kapitel {chapter}: {title}")
        book.set_language("de")
        book.add_author("Eiichiro Oda")
        
        # Create image items and individual HTML pages
        html_pages = []
        toc_entries = []
        
        for idx, img_path in enumerate(image_files, start=1):
            # Add image to EPUB
            file_name = f"images/{img_path.name}"
            mime_type, _ = mimetypes.guess_type(img_path)
            if mime_type is None:
                mime_type = "image/jpeg"
            
            with open(img_path, "rb") as f:
                img_content = f.read()
            
            img_item = epub.EpubImage()
            img_item.file_name = file_name
            img_item.media_type = mime_type
            img_item.content = img_content
            book.add_item(img_item)
            
            # Create separate HTML page for this image
            page_html = f"""<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Seite {idx}</title>
    <style type="text/css">
        body {{
            margin: 0;
            padding: 0;
            text-align: center;
            background-color: white;
        }}
        img {{
            max-width: 100%;
            max-height: 100vh;
            height: auto;
            width: auto;
            display: block;
            margin: 0 auto;
        }}
    </style>
</head>
<body>
    <img src="{file_name}" alt="Seite {idx}"/>
</body>
</html>"""
            
            page_file_name = f"page_{idx:03d}.xhtml"
            page_item = epub.EpubHtml(
                title=f"Seite {idx}",
                file_name=page_file_name,
                lang="de",
                content=page_html,
            )
            book.add_item(page_item)
            html_pages.append(page_item)
            
            # Add to table of contents
            toc_entries.append(epub.Link(page_file_name, f"Seite {idx}", f"page{idx}"))
        
        # Define table of contents and spine
        book.toc = toc_entries
        book.spine = ["nav"] + html_pages
        
        # Add navigation files
        book.add_item(epub.EpubNcx())
        book.add_item(epub.EpubNav())
        
        # Write the EPUB
        output_path.parent.mkdir(parents=True, exist_ok=True)
        epub.write_epub(str(output_path), book)
        logger.info("EPUB created at %s with %d separate pages", output_path, len(image_files))

    def download_chapter(self, chapter: int) -> Path:
        """Download all pages of a chapter and create an EPUB.

        The chapter's images are saved under ``self.storage_dir/<chapter>/images``.
        The generated EPUB is saved as ``self.storage_dir/<chapter>/onepiece_<chapter>.epub``.

        Parameters
        ----------
        chapter : int
            The chapter number to download (e.g., ``1156``).

        Returns
        -------
        Path
            The absolute path to the created EPUB file.

        Raises
        ------
        ValueError
            If the chapter is not available.
        RuntimeError
            If metadata cannot be parsed.
        requests.HTTPError
            Propagated if an image download fails.
        """
        # Fetch metadata (includes page URLs and internal folder id)
        data = fetch_chapter_data(chapter, base_url=self.base_url, session=self.session)
        title = data["chapter"]["name"]
        pages: List[Dict[str, Any]] = data["chapter"]["pages"]
        # Determine local directories
        chapter_dir = self.storage_dir / str(chapter)
        images_dir = chapter_dir / "images"
        ensure_dir(images_dir)
        # Download each page
        image_paths: List[Path] = []
        for page in pages:
            url = page.get("url")
            if not url:
                logger.warning("Skipping page without URL in chapter %s", chapter)
                continue
            # Use the basename of the remote URL to preserve page order.
            filename = url.split("/")[-1]
            dest_path = images_dir / filename
            self._download_image(url, dest_path)
            image_paths.append(dest_path)
        # Sort the images lexicographically to ensure correct reading order
        image_paths.sort(key=lambda p: p.name)
        # Create EPUB
        epub_name = f"onepiece_{chapter}.epub"
        epub_path = chapter_dir / epub_name
        self._create_epub(chapter, title, image_paths, epub_path)
        return epub_path
