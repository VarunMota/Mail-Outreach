import api from './api';

export interface Contact {
    id: number;
    email: string;
    first_name: string | null;
    company: string | null;
    title: string | null;
    created_at: string;
    updated_at: string;
}

export interface ContactImportSummary {
    total_rows: number;
    inserted: number;
    skipped_duplicates: number;
    invalid_emails: number;
}

export interface ContactsCount {
    count: number;
}

export const contactService = {
    getContacts: async (skip: number = 0, limit: number = 100, search?: string): Promise<Contact[]> => {
        const params = new URLSearchParams();
        params.append('skip', skip.toString());
        params.append('limit', limit.toString());
        if (search) {
            params.append('search', search);
        }
        const response = await api.get(`/contacts/?${params.toString()}`);
        return response.data;
    },

    getContactsCount: async (): Promise<number> => {
        const response = await api.get('/contacts/count');
        return response.data.count;
    },

    uploadContacts: async (file: File): Promise<ContactImportSummary> => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await api.post('/contacts/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    uploadContactsToCampaign: async (campaignId: number, file: File): Promise<ContactImportSummary & { campaign_id: number }> => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await api.post(`/campaigns/${campaignId}/upload-contacts`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
};
