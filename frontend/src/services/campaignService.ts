import api from './api';

// Define Interfaces
export interface CampaignStats {
    total_contacts: number;
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
    bounced: number;
    open_rate: number;
    click_rate: number;
    reply_rate: number;
    bounce_rate: number;
}

export interface CampaignContact {
    email: string;
    status: string;
    sent_at: string | null;
    opened_at: string | null;
    clicked_at: string | null;
    replied_at: string | null;
    bounce_reason: string | null;
}

export interface Campaign {
    id: number;
    name: string;
    status: 'draft' | 'scheduled' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed';
    scheduled_at?: string;
    created_at: string;
}

export interface CampaignListItem {
    id: number;
    name: string;
    status: string;
    scheduled_at?: string;
    created_at: string;
    sent_count: number;
    open_rate: number;
    reply_rate: number;
}

export interface DashboardSummary {
    total_sent: number;
    total_opened: number;
    total_clicked: number;
    total_replied: number;
    open_rate: number;
    click_rate: number;
    reply_rate: number;
    recent_activity: ActivityItem[];
    daily_stats: DailyStat[];
}

export interface ActivityItem {
    id: number;
    title: string;
    timestamp: string;
    type: 'sent' | 'open' | 'click' | 'reply' | 'bounce';
}

export interface DailyStat {
    name: string;
    sent: number;
    opened: number;
    clicked: number;
}

export interface CampaignStatus {
    campaign_id: number;
    status: string;
    celery_task_id: string | null;
    total_contacts: number;
    sent_count: number;
    pending_count: number;
    failed_count: number;
    skipped_count: number;
    percent_complete: number;
}

// Define Interface for Campaign Creation
export interface CampaignCreate {
    name: string;
    subject_template: string;
    body_template: string;
    sender_id: number;
    schedule?: string;
    daily_limit: number;
    followups: any[];
}

export const campaignService = {
    getCampaigns: async (): Promise<CampaignListItem[]> => {
        const response = await api.get('/campaigns/');
        return response.data;
    },

    getCampaign: async (id: number): Promise<Campaign> => {
        const response = await api.get(`/campaigns/${id}`);
        return response.data;
    },

    getStats: async (id: number): Promise<CampaignStats> => {
        const response = await api.get(`/campaigns/${id}/stats`);
        return response.data;
    },

    getContacts: async (id: number): Promise<CampaignContact[]> => {
        const response = await api.get(`/campaigns/${id}/contacts`);
        return response.data;
    },

    getDashboardSummary: async (): Promise<DashboardSummary> => {
        const response = await api.get('/campaigns/dashboard-summary');
        return response.data;
    },

    pause: async (id: number) => {
        return api.post(`/campaigns/${id}/pause`);
    },

    resume: async (id: number) => {
        return api.post(`/campaigns/${id}/resume`);
    },

    startCampaign: async (id: number) => {
        const response = await api.post(`/campaigns/${id}/start`);
        return response.data;
    },

    stopCampaign: async (id: number) => {
        const response = await api.post(`/campaigns/${id}/stop`);
        return response.data;
    },

    getCampaignStatus: async (id: number) => {
        const response = await api.get(`/campaigns/${id}/status`);
        return response.data;
    },

    createCampaign: async (data: CampaignCreate) => {
        const response = await api.post('/campaigns/', data);
        return response.data;
    },

    createCampaignWithAttachments: async (formData: FormData) => {
        const response = await api.post('/campaigns/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    deleteCampaign: async (id: number) => {
        const response = await api.delete(`/campaigns/${id}`);
        return response.data;
    },

    updateCampaign: async (id: number, data: Partial<CampaignCreate>) => {
        const response = await api.put(`/campaigns/${id}`, data);
        return response.data;
    },

    getCampaignDetail: async (id: number) => {
        const response = await api.get(`/campaigns/${id}/detail`);
        return response.data;
    },

    scheduleCampaign: async (id: number, scheduledAt: string) => {
        const response = await api.post(`/campaigns/${id}/schedule`, { scheduled_at: scheduledAt });
        return response.data;
    },

    unscheduleCampaign: async (id: number) => {
        const response = await api.post(`/campaigns/${id}/unschedule`);
        return response.data;
    }
};
