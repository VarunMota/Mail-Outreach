import { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Save, Plus, Trash2, Loader2, AlertCircle, Calendar } from 'lucide-react';
import '../styles/CreateCampaign.css';
import { campaignService } from '../services/campaignService';
import { senderService, type SenderAccount } from '../services/senderService';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import EmailEditor from '../components/EmailEditor';
import SchedulePicker from '../components/SchedulePicker';

interface Followup {
    step_number: number;
    delay_days: number;
    trigger_condition: 'no_reply' | 'no_open';
    subject_template: string;
    body_template: string;
}

interface Attachment {
    file: File;
    filename: string;
    size: number;
}

// Default email template
const DEFAULT_SUBJECT = "Application for {{Title}} at {{Company}}";

const DEFAULT_BODY = `<p>Hi {{FirstName}},</p>

<p>I hope you're doing well.</p>

<p>I'm reaching out to express my interest in opportunities at <strong>{{Company}}</strong>. I came across your company and really liked your work in the industry.</p>

<p>I have experience in relevant technologies and have worked on projects that I believe could add value to your team.</p>

<p>I'd love to connect for a short conversation to see how I can contribute to {{Company}}.</p>

<p>Looking forward to hearing from you.</p>

<p>Best regards</p>`;

const CreateCampaign = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        subject: DEFAULT_SUBJECT,
        body: DEFAULT_BODY,
        sender_id: 0,
        template_id: 0,
        schedule: null as string | null,
        daily_limit: 50,
        followups: [] as Followup[],
        attachments: [] as Attachment[]
    });

    const { user } = useAuth();

    // Fetch active senders
    const { data: senders, isLoading: sendersLoading } = useQuery({
        queryKey: ['activeSenders'],
        queryFn: () => senderService.getActiveSenders(),
    });

    // Auto-select user's Gmail sender account when senders load
    useEffect(() => {
        if (senders && senders.length > 0 && formData.sender_id === 0) {
            // Try to find the sender account matching the logged-in user's email
            const userSender = senders.find((s: SenderAccount) => s.email === user?.email);
            if (userSender) {
                setFormData(prev => ({ ...prev, sender_id: userSender.id }));
            } else {
                // Fallback to default sender
                const defaultSender = senders.find((s: SenderAccount) => s.is_default);
                if (defaultSender) {
                    setFormData(prev => ({ ...prev, sender_id: defaultSender.id }));
                } else {
                    // Use first sender
                    setFormData(prev => ({ ...prev, sender_id: senders[0].id }));
                }
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [senders, user]);

    const addFollowup = () => {
        setFormData({
            ...formData,
            followups: [
                ...formData.followups,
                {
                    step_number: formData.followups.length + 1,
                    delay_days: 2,
                    trigger_condition: 'no_reply',
                    subject_template: 'Re: ' + formData.subject,
                    body_template: ''
                }
            ]
        });
    };

    const removeFollowup = (index: number) => {
        const newFollowups = [...formData.followups];
        newFollowups.splice(index, 1);
        // Re-index steps
        newFollowups.forEach((f, i) => f.step_number = i + 1);
        setFormData({ ...formData, followups: newFollowups });
    };

    const updateFollowup = (index: number, field: keyof Followup, value: string | number) => {
        const newFollowups = [...formData.followups];
        newFollowups[index] = { ...newFollowups[index], [field]: value };
        setFormData({ ...formData, followups: newFollowups });
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;

        const newAttachments: Attachment[] = Array.from(files).map(file => ({
            file,
            filename: file.name,
            size: file.size
        }));

        setFormData(prev => ({
            ...prev,
            attachments: [...prev.attachments, ...newAttachments]
        }));

        // Reset input
        event.target.value = '';
    };

    const removeAttachment = (index: number) => {
        setFormData(prev => ({
            ...prev,
            attachments: prev.attachments.filter((_, i) => i !== index)
        }));
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleLaunch = async () => {
        try {
            setLoading(true);
            setError(null);
            
            if (!formData.name.trim()) {
                setError('Please enter a campaign name');
                setLoading(false);
                return;
            }
            
            if (!formData.sender_id) {
                setError('Please select a sender account. If no senders are available, please log out and log back in.');
                setLoading(false);
                return;
            }
            
            if (!formData.subject.trim() || !formData.body.trim()) {
                setError('Please enter both subject and body for the email');
                setLoading(false);
                return;
            }
            
            // Create FormData for file upload
            const submitData = new FormData();
            submitData.append('name', formData.name);
            submitData.append('subject_template', formData.subject);
            submitData.append('body_template', formData.body);
            submitData.append('sender_id', formData.sender_id.toString());
            submitData.append('daily_limit', formData.daily_limit.toString());
            
            // Append attachments
            formData.attachments.forEach((attachment) => {
                submitData.append('attachments', attachment.file);
            });
            
            await campaignService.createCampaignWithAttachments(submitData);
            navigate('/campaigns');
        } catch (error: any) {
            console.error('Failed to create campaign', error);
            setError(error.response?.data?.detail || 'Failed to create campaign. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="wizard-container">
            <div className="wizard-header">
                <h1>Create New Campaign</h1>
                <div className="wizard-steps">
                    <span className={`wizard-step ${step === 1 ? 'active' : ''}`}>1. Details</span>
                    <span className="step-separator">&rarr;</span>
                    <span className={`wizard-step ${step === 2 ? 'active' : ''}`}>2. Template</span>
                    <span className="step-separator">&rarr;</span>
                    <span className={`wizard-step ${step === 3 ? 'active' : ''}`}>3. Follow-ups</span>
                    <span className="step-separator">&rarr;</span>
                    <span className={`wizard-step ${step === 4 ? 'active' : ''}`}>4. Review</span>
                </div>
            </div>

            <div className="wizard-content">
                {step === 1 && (
                    <div className="step-content">
                        {error && (
                            <div style={{ 
                                backgroundColor: '#fee2e2', 
                                color: '#991b1b', 
                                padding: '12px 16px', 
                                borderRadius: '8px',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Campaign Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g. Q3 Outreach - Tech Leads"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Sender Account *</label>
                            {sendersLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px' }}>
                                    <Loader2 size={18} className="animate-spin" />
                                    Loading senders...
                                </div>
                            ) : !senders || senders.length === 0 ? (
                                <div style={{ 
                                    backgroundColor: '#fef3c7', 
                                    padding: '12px', 
                                    borderRadius: '8px',
                                    color: '#92400e'
                                }}>
                                    No active sender accounts found. 
                                    <a href="/settings/senders" style={{ color: '#92400e', textDecoration: 'underline' }}>
                                        Add a sender account first
                                    </a>
                                </div>
                            ) : (
                                <select 
                                    className="form-select"
                                    value={formData.sender_id}
                                    onChange={(e) => setFormData({ ...formData, sender_id: parseInt(e.target.value) })}
                                    required
                                >
                                    <option value={0}>Select a sender account...</option>
                                    {senders.map((sender: SenderAccount) => (
                                        <option key={sender.id} value={sender.id}>
                                            {sender.name} ({sender.email}) 
                                            {sender.email === user?.email ? '- Your Gmail' : ''}
                                            {sender.is_default && sender.email !== user?.email ? '- Default' : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <p className="form-hint">
                                {user?.email && senders?.some((s: SenderAccount) => s.email === user.email) 
                                    ? `Your Gmail account (${user.email}) is selected by default.` 
                                    : 'The email account that will send this campaign.'}
                            </p>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Daily Limit</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.daily_limit}
                                onChange={(e) => setFormData({ ...formData, daily_limit: parseInt(e.target.value) })}
                                min="1"
                            />
                            <p className="form-hint">Maximum emails to send per day.</p>
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
                                    : 'Leave empty to start manually, or pick a date/time to schedule.'}
                            </p>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="step-content">
                        <div className="form-group">
                            <label className="form-label">Email Subject</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Hello {{FirstName}}, checking in..."
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
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

                        {/* Attachments Section */}
                        <div className="form-group" style={{ marginTop: '24px' }}>
                            <label className="form-label">Attachments</label>
                            
                            {/* File Upload Button */}
                            <div style={{ marginBottom: '12px' }}>
                                <input
                                    type="file"
                                    id="attachment-input"
                                    multiple
                                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                />
                                <label
                                    htmlFor="attachment-input"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 16px',
                                        backgroundColor: '#f3f4f6',
                                        border: '2px dashed #d1d5db',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        color: '#374151',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Plus size={18} />
                                    Add Attachment (PDF, DOC, Images)
                                </label>
                            </div>

                            {/* Attached Files List */}
                            {formData.attachments.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {formData.attachments.map((attachment, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '10px 12px',
                                                backgroundColor: '#f9fafb',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '6px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ 
                                                    padding: '6px', 
                                                    backgroundColor: '#dbeafe', 
                                                    borderRadius: '4px',
                                                    color: '#2563eb'
                                                }}>
                                                    <Save size={16} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                                                        {attachment.filename}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                        {formatFileSize(attachment.size)}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeAttachment(index)}
                                                style={{
                                                    padding: '6px',
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    color: '#ef4444',
                                                    borderRadius: '4px'
                                                }}
                                                title="Remove attachment"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <p className="form-hint">
                                Attach your resume, portfolio, or other documents. Max file size: 10MB per file.
                            </p>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="step-content">
                        <div className="followup-list">
                            {formData.followups.map((followup, index) => (
                                <div key={index} className="followup-card">
                                    <div className="followup-header">
                                        <span className="followup-title">Follow-up #{index + 1}</span>
                                        <button onClick={() => removeFollowup(index)} className="followup-remove-btn">
                                            <Trash2 size={14} /> Remove
                                        </button>
                                    </div>

                                    <div className="condition-row">
                                        <span className="condition-label">If</span>
                                        <select
                                            className="condition-select"
                                            value={followup.trigger_condition}
                                            onChange={(e) => updateFollowup(index, 'trigger_condition', e.target.value)}
                                        >
                                            <option value="no_reply">No Reply</option>
                                            <option value="no_open">No Open</option>
                                        </select>
                                        <span className="condition-label">after</span>
                                        <input
                                            type="number"
                                            className="condition-input-num"
                                            value={followup.delay_days}
                                            onChange={(e) => updateFollowup(index, 'delay_days', parseInt(e.target.value))}
                                            min="1"
                                        />
                                        <span className="condition-label">days</span>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Subject</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={followup.subject_template}
                                            onChange={(e) => updateFollowup(index, 'subject_template', e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Body</label>
                                        <textarea
                                            className="form-textarea"
                                            value={followup.body_template}
                                            onChange={(e) => updateFollowup(index, 'body_template', e.target.value)}
                                            style={{ height: '150px' }}
                                        />
                                    </div>
                                </div>
                            ))}

                            <button onClick={addFollowup} className="add-followup-btn">
                                <Plus size={20} />
                                <span>Add Follow-up Step</span>
                            </button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="step-content">
                        <div className="review-section">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Campaign Summary</h3>
                            {error && (
                                <div style={{ 
                                    backgroundColor: '#fee2e2', 
                                    color: '#991b1b', 
                                    padding: '12px 16px', 
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="review-label">Name</p>
                                    <p className="review-value">{formData.name}</p>
                                </div>
                                <div>
                                    <p className="review-label">Sender</p>
                                    <p className="review-value">
                                        {senders?.find(s => s.id === formData.sender_id)?.name || 'Not selected'}
                                    </p>
                                </div>
                                <div>
                                    <p className="review-label">Daily Limit</p>
                                    <p className="review-value">{formData.daily_limit} emails/day</p>
                                </div>
                                <div>
                                    <p className="review-label">Template</p>
                                    <p className="review-value">{formData.subject}</p>
                                </div>
                                <div>
                                    <p className="review-label">Follow-ups</p>
                                    <p className="review-value">{formData.followups.length} steps</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="wizard-actions">
                <button
                    onClick={() => setStep(Math.max(1, step - 1))}
                    className={`nav-btn back ${step === 1 ? 'hidden' : ''}`}
                >
                    <ArrowLeft size={18} />
                    <span>Back</span>
                </button>

                {step < 4 ? (
                    <button
                        onClick={() => setStep(step + 1)}
                        className="nav-btn next"
                    >
                        <span>Next Step</span>
                        <ArrowRight size={18} />
                    </button>
                ) : (
                    <button
                        className="nav-btn launch"
                        onClick={handleLaunch}
                        disabled={loading}
                    >
                        {loading ? (
                            <span>Launching...</span>
                        ) : (
                            <>
                                <Save size={18} />
                                <span>Launch Campaign</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default CreateCampaign;
