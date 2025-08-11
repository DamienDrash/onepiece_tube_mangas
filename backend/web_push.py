"""Web Push Notification Service for One Piece Offline.

This module provides functionality to send web push notifications to users
when new chapters are available. It uses the WebPush protocol with VAPID
keys for authentication.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

from pywebpush import webpush, WebPushException
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

logger = logging.getLogger(__name__)


class WebPushService:
    """Service for sending web push notifications.
    
    This service manages VAPID keys and handles sending push notifications
    to subscribed users.
    """

    def __init__(self, vapid_private_key: Optional[str] = None, vapid_public_key: Optional[str] = None):
        """Initialize the web push service.
        
        Parameters
        ----------
        vapid_private_key : str, optional
            VAPID private key in PEM format. If not provided, keys will be generated.
        vapid_public_key : str, optional  
            VAPID public key in PEM format. If not provided, keys will be generated.
        """
        if vapid_private_key and vapid_public_key:
            self.vapid_private_key = vapid_private_key
            self.vapid_public_key = vapid_public_key
        else:
            self._generate_vapid_keys()
            
        self.subscriptions: List[Dict] = []

    def _generate_vapid_keys(self) -> None:
        """Generate new VAPID key pair for push notifications."""
        private_key = ec.generate_private_key(ec.SECP256R1())
        public_key = private_key.public_key()
        
        # Serialize keys
        self.vapid_private_key = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')
        
        self.vapid_public_key = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')
        
        logger.info("Generated new VAPID key pair")

    def get_public_key(self) -> str:
        """Get the VAPID public key for client subscription.
        
        Returns
        -------
        str
            VAPID public key in URL-safe base64 format for browser use
        """
        try:
            # Parse PEM key to extract raw bytes
            from cryptography.hazmat.primitives import serialization
            public_key_obj = serialization.load_pem_public_key(
                self.vapid_public_key.encode('utf-8')
            )
            
            # Get raw public key bytes in uncompressed format
            raw_key = public_key_obj.public_bytes(
                encoding=serialization.Encoding.X962,
                format=serialization.PublicFormat.UncompressedPoint
            )
            
            # Convert to URL-safe base64
            import base64
            return base64.urlsafe_b64encode(raw_key).decode('utf-8').rstrip('=')
            
        except Exception as e:
            logger.error("Failed to convert VAPID key: %s", str(e))
            # Fallback to PEM format
            return self.vapid_public_key

    def subscribe(self, subscription: Dict) -> bool:
        """Add a new push subscription.
        
        Parameters
        ----------
        subscription : dict
            Push subscription object from the browser containing endpoint,
            keys (p256dh, auth), etc.
            
        Returns
        -------
        bool
            True if subscription was added successfully
        """
        try:
            # Validate subscription format
            if not all(key in subscription for key in ['endpoint', 'keys']):
                logger.error("Invalid subscription format")
                return False
                
            if not all(key in subscription['keys'] for key in ['p256dh', 'auth']):
                logger.error("Missing required keys in subscription")
                return False
            
            # Check if already subscribed
            for existing in self.subscriptions:
                if existing['endpoint'] == subscription['endpoint']:
                    logger.info("Subscription already exists")
                    return True
                    
            self.subscriptions.append(subscription)
            logger.info("Added new push subscription")
            return True
            
        except Exception as e:
            logger.error("Failed to add subscription: %s", str(e))
            return False

    def unsubscribe(self, endpoint: str) -> bool:
        """Remove a push subscription.
        
        Parameters
        ----------
        endpoint : str
            The endpoint URL of the subscription to remove
            
        Returns
        -------
        bool
            True if subscription was removed
        """
        original_count = len(self.subscriptions)
        self.subscriptions = [
            sub for sub in self.subscriptions 
            if sub['endpoint'] != endpoint
        ]
        removed = len(self.subscriptions) < original_count
        if removed:
            logger.info("Removed push subscription")
        return removed

    def send_notification(self, title: str, message: str, data: Optional[Dict] = None) -> int:
        """Send push notification to all subscribed users.
        
        Parameters
        ----------
        title : str
            Notification title
        message : str
            Notification message body
        data : dict, optional
            Additional data to include in notification
            
        Returns
        -------
        int
            Number of notifications sent successfully
        """
        if not self.subscriptions:
            logger.info("No subscriptions available for push notifications")
            return 0

        payload = {
            "title": title,
            "body": message,
            "icon": "/icon-192x192.png",
            "badge": "/badge-72x72.png",
            "tag": "onepiece-chapter",
            "requireInteraction": True,
            "data": data or {}
        }

        successful_sends = 0
        failed_subscriptions = []

        for subscription in self.subscriptions:
            try:
                webpush(
                    subscription_info=subscription,
                    data=json.dumps(payload),
                    vapid_private_key=self.vapid_private_key,
                    vapid_claims={
                        "sub": "mailto:noreply@onepiece-offline.local"
                    }
                )
                successful_sends += 1
                logger.debug("Push notification sent to %s", subscription['endpoint'][:50])
                
            except WebPushException as e:
                logger.error("Failed to send push notification: %s", str(e))
                if e.response and e.response.status_code in [404, 410]:
                    # Subscription is no longer valid
                    failed_subscriptions.append(subscription)
                    
            except Exception as e:
                logger.error("Unexpected error sending push notification: %s", str(e))

        # Remove invalid subscriptions
        for failed_sub in failed_subscriptions:
            self.unsubscribe(failed_sub['endpoint'])
            logger.info("Removed invalid subscription")

        logger.info("Sent %d push notifications successfully", successful_sends)
        return successful_sends

    def get_subscription_count(self) -> int:
        """Get the number of active subscriptions.
        
        Returns
        -------
        int
            Number of active push subscriptions
        """
        return len(self.subscriptions)


# Global instance
web_push_service = WebPushService()
