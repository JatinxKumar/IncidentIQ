# Repository layer — data access abstraction over SQLAlchemy
# Each domain entity gets its own repository that extends BaseRepository.
from app.repositories.base import BaseRepository

__all__ = ["BaseRepository"]
