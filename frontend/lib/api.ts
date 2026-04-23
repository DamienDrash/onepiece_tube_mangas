import axios from 'axios';

const API_BASE_URL = typeof window !== 'undefined'
    ? `${window.location.origin}/op`
    : 'http://backend:8001';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        ...(API_KEY && { 'X-API-Key': API_KEY }),
    },
});

export interface Chapter {
    chapter: number;
    title: string;
    epub: string;
    pages: number;
}

export interface AvailableChapter {
    number: number;
    title: string;
    date: string | null;
    available: boolean;
    pages: number;
}

export interface AvailableChaptersResponse {
    chapters: AvailableChapter[];
    total: number;
}

export interface PushSubscriptionPayload {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export interface PushStats {
    subscribers: number;
    service_active: boolean;
}

export const apiService = {
    async healthCheck() {
        const response = await apiClient.get('/api/health');
        return response.data;
    },
    async getDownloadedChapters(): Promise<Chapter[]> {
        const response = await apiClient.get('/api/chapters');
        return response.data;
    },
    async getAvailableChapters(): Promise<AvailableChaptersResponse> {
        const response = await apiClient.get('/api/available-chapters');
        return response.data;
    },
    async getLatestChapter(): Promise<{ latest: number }> {
        const response = await apiClient.get('/api/latest');
        return response.data;
    },
    async downloadChapter(chapterNumber: number) {
        const response = await apiClient.post(`/api/chapters/${chapterNumber}`);
        return response.data;
    },
    async deleteChapter(chapterNumber: number) {
        const response = await apiClient.delete(`/api/chapters/${chapterNumber}`);
        return response.data;
    },
    getEpubDownloadUrl(chapterNumber: number): string {
        return `${API_BASE_URL}/api/chapters/${chapterNumber}/epub`;
    },
    async getChapterPages(chapterNumber: number): Promise<{ chapter: number; count: number; pages: Array<{ index: number; filename: string }> }> {
        const response = await apiClient.get(`/api/chapters/${chapterNumber}/pages`);
        return response.data;
    },
    getChapterPageUrl(chapterNumber: number, pageIndex: number): string {
        // Used with fetch() + X-API-Key header to get blob URL
        return `/op/api/chapters/${chapterNumber}/page/${pageIndex}`;
    },
    async getPushStats(): Promise<PushStats> {
        const response = await apiClient.get('/api/push/stats');
        return response.data;
    },
    async getVapidPublicKey(): Promise<string> {
        const response = await apiClient.get('/api/push/vapid-public-key');
        return response.data.publicKey;
    },
    async subscribeToPush(subscription: PushSubscriptionPayload) {
        const response = await apiClient.post('/api/push/subscribe', subscription);
        return response.data;
    },
    async unsubscribeFromPush(endpoint: string) {
        const response = await apiClient.post(`/api/push/unsubscribe?endpoint=${encodeURIComponent(endpoint)}`);
        return response.data;
    },
};
