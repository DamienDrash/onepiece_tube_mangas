"""Web Push Notification Service for One Piece Offline."""

from __future__ import annotations

import base64
import json
import logging
import os
from typing import Dict, List, Optional

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from pywebpush import WebPushException, webpush

import database

logger = logging.getLogger(__name__)


class WebPushService:
    """Manages VAPID keys and push subscriptions, persisted via DuckDB."""

    def __init__(
        self,
        vapid_private_key: Optional[str] = None,
        vapid_public_key: Optional[str] = None,
    ):
        if vapid_private_key and vapid_public_key:
            self.vapid_private_key = vapid_private_key
            self.vapid_public_key = vapid_public_key
        else:
            env_private = os.getenv("VAPID_PRIVATE_KEY")
            env_public = os.getenv("VAPID_PUBLIC_KEY")
            if env_private and env_public:
                self.vapid_private_key = env_private
                self.vapid_public_key = env_public
                logger.info("VAPID keys loaded from environment")
            else:
                keys = database.get_vapid_keys()
                if keys:
                    self.vapid_private_key, self.vapid_public_key = keys
                    logger.info("VAPID keys loaded from DuckDB")
                else:
                    self._generate_vapid_keys()
                    database.save_vapid_keys(
                        self.vapid_private_key, self.vapid_public_key
                    )

    def _generate_vapid_keys(self) -> None:
        private_key = ec.generate_private_key(ec.SECP256R1())
        public_key = private_key.public_key()

        self.vapid_private_key = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode("utf-8")

        self.vapid_public_key = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode("utf-8")

        logger.info("Generated new VAPID key pair")

    def get_public_key(self) -> str:
        try:
            public_key_obj = serialization.load_pem_public_key(
                self.vapid_public_key.encode("utf-8")
            )
            raw_key = public_key_obj.public_bytes(
                encoding=serialization.Encoding.X962,
                format=serialization.PublicFormat.UncompressedPoint,
            )
            return base64.urlsafe_b64encode(raw_key).decode("utf-8").rstrip("=")
        except Exception as exc:
            logger.error("Failed to convert VAPID key: %s", exc)
            return self.vapid_public_key

    def subscribe(self, subscription: Dict) -> bool:
        try:
            if not all(k in subscription for k in ["endpoint", "keys"]):
                logger.error("Invalid subscription format")
                return False
            if not all(k in subscription["keys"] for k in ["p256dh", "auth"]):
                logger.error("Missing required keys in subscription")
                return False

            endpoint = subscription["endpoint"]
            if database.subscription_exists(endpoint):
                logger.info("Subscription already exists, updating")

            return database.add_subscription(
                endpoint=endpoint,
                p256dh=subscription["keys"]["p256dh"],
                auth=subscription["keys"]["auth"],
            )
        except Exception as exc:
            logger.error("Failed to add subscription: %s", exc)
            return False

    def unsubscribe(self, endpoint: str) -> bool:
        removed = database.remove_subscription(endpoint)
        if removed:
            logger.info("Removed push subscription")
        return removed

    def send_notification(
        self, title: str, message: str, data: Optional[Dict] = None
    ) -> int:
        subscriptions = database.get_subscriptions()
        if not subscriptions:
            return 0

        payload = {
            "title": title,
            "body": message,
            "icon": "/icon-192x192.png",
            "badge": "/badge-72x72.png",
            "tag": "onepiece-chapter",
            "requireInteraction": True,
            "data": data or {},
        }

        successful = 0
        failed_endpoints: List[str] = []

        for sub in subscriptions:
            try:
                webpush(
                    subscription_info=sub,
                    data=json.dumps(payload),
                    vapid_private_key=self.vapid_private_key,
                    vapid_claims={"sub": "mailto:noreply@onepiece-offline.local"},
                    timeout=30,
                )
                successful += 1
            except WebPushException as exc:
                logger.error("Push send failed: %s", exc)
                if exc.response and exc.response.status_code in [404, 410]:
                    failed_endpoints.append(sub["endpoint"])
            except Exception as exc:
                logger.error("Unexpected push error: %s", exc)

        for endpoint in failed_endpoints:
            self.unsubscribe(endpoint)
            logger.info("Removed invalid subscription: %s", endpoint[:50])

        logger.info("Sent %d push notifications", successful)
        return successful

    def get_subscription_count(self) -> int:
        return len(database.get_subscriptions())


web_push_service = WebPushService()
