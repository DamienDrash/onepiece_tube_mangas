"""Background scheduler for periodic update checks.

This module defines :class:`UpdateScheduler`, a thin wrapper around
``APScheduler`` that periodically checks OnePiece‑Tube for new chapters
and downloads them automatically.  When a new chapter is detected it
can also send an e‑mail notification via :class:`ChapterNotifier`.

The scheduler is intended to run in the same process as the FastAPI
application or as a standalone script.  It uses the background
scheduler provided by APScheduler, which executes jobs in a separate
thread.  For more advanced scheduling (e.g., cron expressions) you can
extend this class accordingly.

Examples
--------

>>> from onepiece_offline.backend.scheduler import UpdateScheduler
>>> from onepiece_offline.backend.downloader import ChapterDownloader
>>> from onepiece_offline.backend.notification import ChapterNotifier
>>> downloader = ChapterDownloader(storage_dir="./data")
>>> notifier = ChapterNotifier()
>>> sched = UpdateScheduler(downloader, notifier, interval_minutes=60, recipient="you@example.com")
>>> sched.start()  # doctest: +SKIP

"""

from __future__ import annotations

import logging
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler

from downloader import ChapterDownloader
from notification import ChapterNotifier

logger = logging.getLogger(__name__)


class UpdateScheduler:
    """Periodically poll for new chapters and download them.

    Parameters
    ----------
    downloader : ChapterDownloader
        Instance responsible for downloading chapters and building EPUBs.
    notifier : ChapterNotifier
        Instance used to check for new chapters and optionally send
        notifications.
    interval_minutes : int, optional
        How often to check for updates, in minutes.  Defaults to 60.
    recipient : str, optional
        E‑mail address to notify when new chapters appear.  If
        ``None``, no notifications are sent.

    Notes
    -----
    The current implementation maintains a simple ``current_latest``
    counter internally.  When started for the first time it initialises
    this counter from the highest chapter downloaded in ``downloader``'s
    storage directory (if any), or from the remote site otherwise.
    """

    def __init__(
        self,
        downloader: ChapterDownloader,
        notifier: ChapterNotifier,
        interval_minutes: int = 60,
        recipient: Optional[str] = None,
    ) -> None:
        self.downloader = downloader
        self.notifier = notifier
        self.interval_minutes = interval_minutes
        self.recipient = recipient
        self.scheduler = BackgroundScheduler()
        # Determine the starting point for the latest chapter number
        downloaded = self._get_highest_downloaded()
        self.current_latest: int = downloaded or (notifier.get_latest_number() or 0)

    def _get_highest_downloaded(self) -> Optional[int]:
        """Return the highest chapter number currently stored locally.

        Returns
        -------
        int or None
            Highest numeric subdirectory name in the storage directory,
            or None if no chapters are present.
        """
        numbers = []
        for subdir in self.downloader.storage_dir.iterdir():
            if subdir.is_dir():
                try:
                    numbers.append(int(subdir.name))
                except ValueError:
                    continue
        return max(numbers) if numbers else None

    def _job(self) -> None:
        """Internal job executed by APScheduler.

        Checks for new chapters, downloads them and sends notifications.
        """
        logger.debug("Running scheduled update check; current latest=%s", self.current_latest)
        try:
            new_entries = self.notifier.check_for_update(self.current_latest)
        except Exception as exc:
            logger.error("Failed to check for updates: %s", exc)
            return
        for entry in new_entries:
            number = entry.get("number")
            if number is None:
                continue
            try:
                logger.info("Downloading new chapter %s", number)
                self.downloader.download_chapter(number)
                self.current_latest = max(self.current_latest, number)
                if self.recipient:
                    self.notifier.send_email_notifications([entry], self.recipient)
            except Exception as exc:
                logger.error("Failed to download or notify for chapter %s: %s", number, exc)

    def start(self) -> None:
        """Start the background scheduler.

        This method schedules the update job at the configured interval
        and then starts the scheduler.  It should typically be called
        once during application startup.  If the scheduler is already
        running it will be restarted.
        """
        self.scheduler.remove_all_jobs()
        self.scheduler.add_job(self._job, "interval", minutes=self.interval_minutes)
        self.scheduler.start()
        logger.info(
            "Update scheduler started: checking every %d minutes (current latest=%s)",
            self.interval_minutes,
            self.current_latest,
        )

    def stop(self) -> None:
        """Stop the background scheduler.

        Cancels all scheduled jobs and shuts down the scheduler thread.
        """
        self.scheduler.shutdown(wait=False)
        logger.info("Update scheduler stopped")
