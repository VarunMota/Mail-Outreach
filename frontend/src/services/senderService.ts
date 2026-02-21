import api from './api';

export interface SenderAccount {
    id: number;
    name: string;
    email: string;
    smtp_host: string;
    smtp_port: number;
    smtp_username: string;
    smtp_use_tls: boolean;
    daily_limit: number;
    is_active: boolean;
    is_default: boolean;
    smtp_password_masked?: string;
    created_at: string;
    updated_at: string;
    last_tested_at: string | null;
    last_test_status: string | null;
    campaign_count?: number;
}

export interface SenderAccountCreate {
    name: string;
    email: string;
    smtp_host: string;
    smtp_port: number;
    smtp_username: string;
    smtp_password: string;
    smtp_use_tls: boolean;
    daily_limit: number;
    is_active: boolean;
    is_default: boolean;
}

export interface SenderAccountUpdate {
    name?: string;
    email?: string;
    smtp_host?: string;
    smtp_port?: number;
    smtp_username?: string;
    smtp_password?: string;
    smtp_use_tls?: boolean;
    daily_limit?: number;
    is_active?: boolean;
    is_default?: boolean;
}

export interface SenderTestResult {
    success: boolean;
    message: string;
    details?: string;
}

export interface SenderListResponse {
    items: SenderAccount[];
    total: number;
}

export const senderService = {
    getSenders: async (): Promise<SenderListResponse> => {
        const response = await api.get('/senders/');
        return response.data;
    },

    getActiveSenders: async (): Promise<SenderAccount[]> => {
        const response = await api.get('/senders/active');
        return response.data;
    },

    getDefaultSender: async (): Promise<SenderAccount> => {
        const response = await api.get('/senders/default');
        return response.data;
    },

    getSender: async (id: number): Promise<SenderAccount> => {
        const response = await api.get(`/senders/${id}`);
        return response.data;
    },

    createSender: async (data: SenderAccountCreate): Promise<SenderAccount> => {
        const response = await api.post('/senders/', data);
        return response.data;
    },

    updateSender: async (id: number, data: SenderAccountUpdate): Promise<SenderAccount> => {
        const response = await api.put(`/senders/${id}`, data);
        return response.data;
    },

    deleteSender: async (id: number): Promise<void> => {
        await api.delete(`/senders/${id}`);
    },

    testSender: async (id: number, testEmail?: string): Promise<SenderTestResult> => {
        const response = await api.post(`/senders/${id}/test`, { test_email: testEmail });
        return response.data;
    },

    setDefaultSender: async (id: number): Promise<SenderAccount> => {
        const response = await api.post(`/senders/${id}/set-default`);
        return response.data;
    }
};
