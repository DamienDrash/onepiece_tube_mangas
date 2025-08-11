"""Notification and update checking utilities.

This module provides a minimal interface for determining whether new
manga chapters have been released on OnePiece‑Tube and notifying
subscribers via e‑mail.  It relies on the metadata exposed on the
*Manga Kapitel* listing page (see :func:`fetch_mangaliste_entries`).

For simplicity this module does not manage subscriber lists or
persistence; instead, it exposes functions that can be called by a
higher‑level scheduler or command‑line script.  If you wish to store
subscribers in a database or trigger more complex notifications (e.g.,
push notifications, webhooks), you can extend the :class:`ChapterNotifier`
class accordingly.

Examples
--------

>>> from onepiece_offline.backend.notification import ChapterNotifier
>>> notifier = ChapterNotifier()
>>> latest = notifier.get_latest_number()
>>> new = notifier.check_for_update(current_latest=1155)
>>> if new:
...     for entry in new:
...         print(f"New chapter {entry['number']}: {entry['name']}")
...     notifier.send_email_notifications(new, "you@example.com")  # doctest: +SKIP

"""

from __future__ import annotations

import logging
from typing import List, Dict, Any, Optional

from utils import fetch_mangaliste_entries, send_email_notification

logger = logging.getLogger(__name__)


class ChapterNotifier:
    """Helper class for detecting new chapters and sending e‑mails.

    Parameters
    ----------
    base_url : str, optional
        Base URL of OnePiece‑Tube.  Defaults to ``"https://onepiece.tube"``.
    session : object, optional
        Optional requests session to re‑use.  A session is created
        automatically if none is provided.  It will be closed when this
        object is garbage‑collected.
    smtp_config : dict, optional
        Dictionary containing SMTP configuration with the keys
        ``host``, ``port``, ``username``, ``password`` and ``sender``.
        This is passed through to :func:`send_email_notification`.

    Attributes
    ----------
    entries : list of dict
        The cached list of all chapter entries retrieved from the site.
        This attribute is updated every time :meth:`refresh` is called.
    """

    def __init__(
        self,
        base_url: str = "https://onepiece.tube",
        session: Optional[object] = None,
        smtp_config: Optional[Dict[str, Any]] = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.session = session
        self.smtp_config = smtp_config or {}
        self.entries: List[Dict[str, Any]] = []
        self.refresh()

    def refresh(self) -> None:
        """Reload the entries list from the server.

        This method should be called periodically to keep the cache
        up‑to‑date.  If an exception occurs while fetching, the old
        entries list is preserved.
        """
        try:
            self.entries = fetch_mangaliste_entries(
                base_url=self.base_url, session=self.session
            )
            logger.debug("Fetched %d entries from mangaliste", len(self.entries))
        except Exception as exc:
            logger.error("Failed to fetch mangaliste entries: %s", exc)
            # Do not clear self.entries on failure

    def get_latest_number(self) -> Optional[int]:
        """Return the highest available chapter number.

        Returns
        -------
        int or None
            The maximum ``number`` found in the entries list, or
            ``None`` if no entries are available.
        """
        if not self.entries:
            return None
        return max(entry.get("number", 0) for entry in self.entries)

    def check_for_update(self, current_latest: int) -> List[Dict[str, Any]]:
        """Determine whether any new chapters have been released.

        Parameters
        ----------
        current_latest : int
            The latest chapter number currently known to the application.

        Returns
        -------
        list of dict
            A list of entries whose ``number`` is greater than
            ``current_latest``.  The list is empty if no updates are
            available.  Entries are returned in ascending order of
            ``number``.
        """
        self.refresh()
        new_entries = [e for e in self.entries if e.get("number", 0) > current_latest]
        return sorted(new_entries, key=lambda x: x["number"])

    def send_email_notifications(
        self,
        new_entries: List[Dict[str, Any]],
        recipient: str,
        subject_template: str = "Neues OnePiece Kapitel {number}",
        body_template: str = "Es ist ein neues Kapitel erschienen: {number} – {title}.",
    ) -> None:
        """Send an e‑mail for each new chapter using stored SMTP config.

        Parameters
        ----------
        new_entries : list of dict
            Entries representing new chapters.  Each entry must include
            at least the keys ``number`` and ``name``.
        recipient : str
            E‑mail address of the recipient.  Currently only a single
            recipient is supported; if you need multiple recipients pass
            this function multiple times.
        subject_template : str, optional
            Template for the e‑mail subject.  It may contain
            ``{number}`` which will be replaced by the chapter number.
        body_template : str, optional
            Template for the e‑mail body.  It may contain
            ``{number}`` and ``{title}`` placeholders.

        Raises
        ------
        KeyError
            If SMTP configuration is incomplete.
        """
        if not new_entries:
            logger.info("No new chapters to notify")
            return
        required_keys = {"host", "port", "username", "password", "sender"}
        missing = required_keys - self.smtp_config.keys()
        if missing:
            raise KeyError(f"Missing SMTP config keys: {', '.join(missing)}")
        for entry in new_entries:
            number = entry.get("number")
            title = entry.get("name") or ""
            subject = subject_template.format(number=number, title=title)
            body = body_template.format(number=number, title=title)
            send_email_notification(
                smtp_server=self.smtp_config["host"],
                smtp_port=self.smtp_config["port"],
                username=self.smtp_config["username"],
                password=self.smtp_config["password"],
                sender=self.smtp_config["sender"],
                recipient=recipient,
                subject=subject,
                body=body,
            )
            logger.info("Notification sent for chapter %s to %s", number, recipient)

    def send_combined_notifications(
        self,
        new_entries: List[Dict[str, Any]],
        email_recipient: Optional[str] = None,
        send_web_push: bool = True,
        subject_template: str = "Neues One Piece Kapitel {number}: {title}",
        body_template: str = "Ein neues One Piece Kapitel ist verfügbar!\n\nKapitel {number}: {title}\n\nJetzt auf One Piece Offline herunterladen!"
    ) -> Dict[str, Any]:
        """Send both email and web push notifications for new chapters.
        
        Parameters
        ----------
        new_entries : List[Dict[str, Any]]
            List of new chapter entries from the manga site
        email_recipient : str, optional
            Email address to send notifications to. If None, no email is sent.
        send_web_push : bool
            Whether to send web push notifications
        subject_template : str
            Template for email subject line
        body_template : str
            Template for email body
            
        Returns
        -------
        Dict[str, Any]
            Summary of notification results
        """
        if not new_entries:
            logger.info("No new chapters to notify")
            return {"email_sent": 0, "push_sent": 0, "total_chapters": 0}
            
        results = {
            "email_sent": 0,
            "push_sent": 0,
            "total_chapters": len(new_entries),
            "chapters": []
        }
        
        # Send email notifications if recipient provided
        if email_recipient:
            try:
                self.send_email_notifications(new_entries, email_recipient, subject_template, body_template)
                results["email_sent"] = len(new_entries)
            except Exception as e:
                logger.error("Failed to send email notifications: %s", str(e))
        
        # Send web push notifications
        if send_web_push:
            try:
                # Import here to avoid circular import
                from web_push import web_push_service
                
                for entry in new_entries:
                    number = entry.get("number")
                    title = entry.get("name", f"Kapitel {number}")
                    
                    push_count = web_push_service.send_notification(
                        title=f"Neues One Piece Kapitel {number}",
                        message=f"{title} ist jetzt verfügbar!",
                        data={
                            "chapter": number,
                            "title": title,
                            "url": f"/download/{number}"
                        }
                    )
                    results["push_sent"] += push_count
                    results["chapters"].append({
                        "number": number,
                        "title": title
                    })
                    
            except Exception as e:
                logger.error("Failed to send web push notifications: %s", str(e))
        
        logger.info(
            "Sent notifications for %d chapters: %d emails, %d push notifications",
            results["total_chapters"],
            results["email_sent"], 
            results["push_sent"]
        )
        
        return results
