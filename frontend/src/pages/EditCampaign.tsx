import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, AlertCircle, Calendar } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignService } from '../services/campaignService';
import { senderService, type SenderAccount } from '../services/senderService';
import EmailEditor from '../components/EmailEditor';
import SchedulePicker from '../components/SchedulePicker';
import '../styles/CreateCampaign.css';

interface CampaignDetail {
    id: number;
    name: string;
    status: string;
    subject_template: string;
    body_template: string;
    sender_id: number;
    daily_limit: number;
    schedule?: string;
}

const EditCampaign = () => {
    const { id } = useParams<{ id: string }>();
    const campaignId = parseInt(id || '0');
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);

    // Fetch campaign details
    const { data: campaign, isLoading: isLoadingCampaign } = useQuery({
        queryKey: ['campaignDetail', campaignId],
        queryFn: () => campaignService.getCampaignDetail(campaignId),
        enabled: campaignId > 0,
    });

    // Fetch senders for dropdown
    const { data: sendersData } = useQuery({
        queryKey: ['senders'],
        queryFn: () => senderService.getSenders(),
    });

    const [formData, setFormData] = useState({
        name: '',
        subject: '',
        body: '',
        sender_id: 0,
        daily_limit: 50,
        schedule: null as string | null,
    });

    // Populate form when campaign data loads
    useEffect(() => {
        if (campaign) {
            setFormData({
                name: campaign.name || '',
                subject: campaign.subject_template || '',
                body: campaign.body_template || '',
                sender_id: campaign.sender_id || 0,
                daily_limit: campaign.daily_limit || 50,
                schedule: campaign.scheduled_at || null,
            });
        }
    }, [campaign]);

    const updateMutation = useMutation({
        mutationFn: (data: typeof formData) =>
            campaignService.updateCampaign(campaignId, {
                name: data.name,
                subject_template: data.subject,
                body_template: data.body,
                sender_id: data.sender_id,
                daily_limit: data.daily_limit,
                schedule: data.schedule || undefined,
                followups: [],
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
            queryClient.invalidateQueries({ queryKey: ['campaignDetail', campaignId] });
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            navigate(`/campaigns/${campaignId}`);
        },
        onError: (error: any) => {
            setError(error.response?.data?.detail || 'Failed to update campaign');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name.trim()) {
            setError('Campaign name is required');
            return;
        }
        if (!formData.subject.trim()) {
            setError('Subject is required');
            return;
        }
        if (!formData.body.trim()) {
            setError('Email body is required');
            return;
        }
        if (!formData.sender_id) {
            setError('Please select a sender account');
            return;
        }

        updateMutation.mutate(formData);
    };

    if (isLoadingCampaign) {
        return (
            <div className="create-campaign-container">
                <div className="loading-state">
                    <Loader2 size={32} className="animate-spin" />
                    <p>Loading campaign...</p>
                </div>
            </div>
        );
    }

    if (!campaign) {
        return (
            <div className="create-campaign-container">
                <div className="error-state">
                    <AlertCircle size={48} />
                    <h2>Campaign Not Found</h2>
                    <p>The campaign you're looking for doesn't exist or has been deleted.</p>
                    <button onClick={() => navigate('/campaigns')} className="action-btn primary">
                        <ArrowLeft size={18} />
                        <span>Back to Campaigns</span>
                    </button>
                </div>
            </div>
        );
    }

    // Only allow editing draft campaigns
    if (campaign.status !== 'draft') {
        return (
            <div className="create-campaign-container">
                <div className="error-state">
                    <AlertCircle size={48} />
                    <h2>Cannot Edit Campaign</h2>
                    <p>Only draft campaigns can be edited. This campaign is currently {campaign.status}.</p>
                    <button onClick={() => navigate(`/campaigns/${campaignId}`)} className="action-btn primary">
                        <ArrowLeft size={18} />
                        <span>Back to Campaign</span>
                    </button>
                </div>
            </div>
        );
    }

    const senders = sendersData?.items || [];

    return (
        <div className="create-campaign-container">
            {/* Header */}
            <div className="create-header">
                <button onClick={() => navigate(`/campaigns/${campaignId}`)} className="back-btn">
                    <ArrowLeft size={20} />
                    <span>Back to Campaign</span>
                </button>
                <h1>Edit Campaign</h1>
                <p>Update your campaign details and template.</p>
            </div>

            {error && (
                <div className="error-alert" style={{
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="campaign-form">
                {/* Campaign Name */}
                <div className="form-section">
                    <h2>Campaign Details</h2>
                    <div className="form-group">
                        <label className="form-label">Campaign Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Q1 Outreach Campaign"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Sender Account</label>
                        <select
                            className="form-select"
                            value={formData.sender_id}
                            onChange={(e) => setFormData({ ...formData, sender_id: parseInt(e.target.value) })}
                            required
                        >
                            <option value="">Select a sender account</option>
                            {senders.map((sender: SenderAccount) => (
                                <option key={sender.id} value={sender.id}>
                                    {sender.name} ({sender.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Daily Sending Limit</label>
                        <input
                            type="number"
                            className="form-input"
                            value={formData.daily_limit}
                            onChange={(e) => setFormData({ ...formData, daily_limit: parseInt(e.target.value) || 50 })}
                            min="1"
                            max="500"
                            required
                        />
                        <p className="form-hint">Maximum emails to send per day</p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            <Calendar size={16} style={{ display: 'inline', marginRight: '6px' }} />
                            Schedule (Optional)
                        </label>
                        <SchedulePicker
                            value={formData.schedule}
                            onChange={(value) => setFormData({ ...formData, schedule: value })}
                        />
                        <p className="form-hint">
                            {formData.schedule 
                                ? 'Campaign will start automatically at the scheduled time.' 
                                : 'Leave empty to keep as draft, or pick a date/time to schedule.'}
                        </p>
                    </div>
                </div>

                {/* Email Template */}
                <div className="form-section">
                    <h2>Email Template</h2>
                    <div className="form-group">
                        <label className="form-label">Subject Line</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            placeholder="e.g., Opportunity at {{Company}}"
                            required
                        />
                        <p className="form-hint">Available variables: {'{{FirstName}}'}, {'{{Company}}'}, {'{{Title}}'}, {'{{Email}}'}</p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email Body</label>
                        <EmailEditor
                            value={formData.body}
                            onChange={(value) => setFormData({ ...formData, body: value })}
                            placeholder="Write your email here..."
                        />
                        <p className="form-hint">
                            <strong>💡 Tip:</strong> Use the toolbar to format your email. Click "Insert Variable" to add personalization tokens.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="form-actions">
                    <button
                        type="button"
                        onClick={() => navigate(`/campaigns/${campaignId}`)}
                        className="action-btn secondary"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="action-btn primary"
                        disabled={updateMutation.isPending}
                    >
                        {updateMutation.isPending ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditCampaign;
