import { apiService } from './api';

const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

export const pushNotificationService = {
    isSupported(): boolean {
        return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
    },

    async initialize(): Promise<void> {
        if (!this.isSupported()) return;
        try {
            const swPath = '/op/sw.js';
            const registration = await navigator.serviceWorker.register(swPath, { scope: '/op/' });
            console.log('Service Worker registered with scope:', registration.scope);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    },

    getPermissionState(): { permission: NotificationPermission } {
        return { permission: typeof Notification !== 'undefined' ? Notification.permission : 'default' };
    },

    async isSubscribed(): Promise<boolean> {
        if (!this.isSupported()) return false;
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        return subscription !== null;
    },

    async subscribe(): Promise<void> {
        if (!this.isSupported()) throw new Error('Push notifications not supported');

        const currentPermission = Notification.permission;
        if (currentPermission === 'denied') {
            throw new Error('Berechtigung wurde dauerhaft verweigert. Bitte setzen Sie die Website-Einstellungen in Ihrem Browser zurück.');
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            throw new Error('Berechtigung nicht erteilt.');
        }

        const registration = await navigator.serviceWorker.ready;
        const publicKey = await apiService.getVapidPublicKey();
        const applicationServerKey = urlBase64ToUint8Array(publicKey);

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
        });

        await apiService.subscribeToPush(subscription.toJSON() as import('./api').PushSubscriptionPayload);
    },

    async unsubscribe(): Promise<void> {
        if (!this.isSupported()) return;
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
            await apiService.unsubscribeFromPush(subscription.endpoint);
        }
    },

    async sendTestNotification(): Promise<void> {
        await apiService.healthCheck(); // Just to verify connection
        const response = await fetch('/op/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Grand Line Archive',
                message: 'Verbindung erfolgreich hergestellt! ⚓',
            }),
        });
        if (!response.ok) throw new Error('Test-Benachrichtigung fehlgeschlagen.');
    }
};
