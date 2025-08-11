"""Database models for persisting chapter metadata.

This module defines SQLAlchemy ORM models used to record information
about downloaded chapters.  Although the current implementation of
``app.py`` and ``downloader.py`` does not interact with the database,
having a structured schema in place makes it straightforward to extend
the system in the future (e.g., to avoid re‑downloading chapters or
implement a user library).

To initialise the database run the following once::

    from sqlalchemy import create_engine
    from onepiece_offline.backend.models import Base
    engine = create_engine('sqlite:///onepiece.db')
    Base.metadata.create_all(engine)

You can then use a sessionmaker to add or query :class:`Chapter`
instances.  See the SQLAlchemy documentation for details.

Note
----
This file requires SQLAlchemy 2.x.  If you do not plan to use the
database you may delete this file and remove the dependency from
``requirements.txt``.

"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Integer, String, DateTime, Boolean


class Base(DeclarativeBase):
    """Base class for ORM models."""
    pass


class Chapter(Base):
    """Represent a downloaded chapter.

    Attributes
    ----------
    id : int
        Primary key.
    number : int
        Public chapter number (e.g., 1156).
    title : str
        German title of the chapter.
    pages : int
        Number of pages in the chapter (images).
    date : datetime
        Publication date on OnePiece‑Tube.
    epub_path : str
        Relative path to the generated EPUB file on disk.
    downloaded_at : datetime
        When the chapter was downloaded locally.
    available : bool
        True if the chapter is available; false otherwise.
    """

    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    number: Mapped[int] = mapped_column(Integer, nullable=False, unique=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    pages: Mapped[int] = mapped_column(Integer, nullable=False)
    date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    epub_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    downloaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Chapter number={self.number} title={self.title!r}>"
