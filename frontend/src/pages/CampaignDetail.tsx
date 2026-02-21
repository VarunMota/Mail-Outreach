import { useParams } from 'react-router-dom';
import { ArrowLeft, Users, Mail, MousePointer2, Reply, Pause, Play, RefreshCw, AlertCircle, Upload, FileSpreadsheet, Edit2, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { campaignService } from '../services/campaignService';
import { contactService } from '../services/contactService';
import '../styles/CampaignDetail.css';

const CampaignDetail = () => {
    const { id } = useParams<{ id: string }>();
    const campaignId = parseInt(id || '0');
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

    // Poll every 15 seconds
    const { data: campaign, isLoading: isLoadingCampaign, error: campaignError } = useQuery({
        queryKey: ['campaign', campaignId],
        queryFn: () => campaignService.getCampaign(campaignId),
        refetchInterval: 15000,
        enabled: campaignId > 0,
    });

    const { data: stats, isLoading: isLoadingStats } = useQuery({
        queryKey: ['campaignStats', campaignId],
        queryFn: () => campaignService.getStats(campaignId),
        refetchInterval: 15000,
        enabled: campaignId > 0,
    });

    const { data: contacts, isLoading: isLoadingContacts } = useQuery({
        queryKey: ['campaignContacts', campaignId],
        queryFn: () => campaignService.getContacts(campaignId),
        refetchInterval: 15000,
        enabled: campaignId > 0,
    });

    const pauseMutation = useMutation({
        mutationFn: () => campaignService.pause(campaignId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
            queryClient.invalidateQueries({ queryKey: ['campaignStatus', campaignId] });
        },
    });

    const resumeMutation = useMutation({
        mutationFn: () => campaignService.resume(campaignId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
            queryClient.invalidateQueries({ queryKey: ['campaignStatus', campaignId] });
        },
    });

    const startMutation = useMutation({
        mutationFn: () => campaignService.startCampaign(campaignId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
            queryClient.invalidateQueries({ queryKey: ['campaignStatus', campaignId] });
        },
    });

    const stopMutation = useMutation({
        mutationFn: () => campaignService.stopCampaign(campaignId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaign', campaignId] });
            queryClient.invalidateQueries({ queryKey: ['campaignStatus', campaignId] });
        },
    });

    const uploadContactsMutation = useMutation({
        mutationFn: (file: File) => contactService.uploadContactsToCampaign(campaignId, file),
        onSuccess: (data) => {
            setUploadSuccess(`Successfully uploaded ${data.inserted} new contacts (${data.total_rows} total rows)!`);
            setUploadError(null);
            queryClient.invalidateQueries({ queryKey: ['campaignContacts', campaignId] });
            queryClient.invalidateQueries({ queryKey: ['campaignStats', campaignId] });
            queryClient.invalidateQueries({ queryKey: ['campaignStatus', campaignId] });
            // Clear success message after 3 seconds
            setTimeout(() => setUploadSuccess(null), 3000);
        },
        onError: (error: any) => {
            setUploadError(error.response?.data?.detail || 'Failed to upload contacts. Please try again.');
            setUploadSuccess(null);
        },
    });

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
        if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
            setUploadError('Please upload a CSV or Excel file (.csv, .xlsx)');
            return;
        }

        uploadContactsMutation.mutate(file);
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Poll for status updates
    const { data: campaignStatus } = useQuery({
        queryKey: ['campaignStatus', campaignId],
        queryFn: () => campaignService.getCampaignStatus(campaignId),
        refetchInterval: campaign?.status === 'running' ? 2000 : 5000,
        enabled: campaignId > 0,
    });

    if (isLoadingCampaign || isLoadingStats) {
        return (
            <div className="detail-container">
                <div className="loading-state">
                    <RefreshCw size={32} className="animate-spin" />
                    <p>Loading campaign...</p>
                </div>
            </div>
        );
    }

    if (campaignError || !campaign) {
        return (
            <div className="detail-container">
                <div className="error-state">
                    <AlertCircle size={48} />
                    <h2>Campaign Not Found</h2>
                    <p>The campaign you're looking for doesn't exist or has been deleted.</p>
                    <Link to="/campaigns" className="action-btn primary">
                        <ArrowLeft size={18} />
                        <span>Back to Campaigns</span>
                    </Link>
                </div>
            </div>
        );
    }

    // Default stats if not loaded yet
    const safeStats = stats || {
        total_contacts: 0,
        sent: 0,
        opened: 0,
        clicked: 0,
        replied: 0,
        bounced: 0,
        open_rate: 0,
        click_rate: 0,
        reply_rate: 0,
        bounce_rate: 0
    };

    const pieData = [
        { name: 'Opened', value: safeStats.opened },
        { name: 'Unopened', value: Math.max(0, (safeStats.sent || 0) - safeStats.opened) },
    ];

    const COLORS = ['#8B5CF6', '#E5E7EB'];
    const progress = safeStats.total_contacts > 0 ? (safeStats.sent / safeStats.total_contacts) * 100 : 0;

    return (
        <div className="detail-container">
            {/* Header */}
            <div>
                <Link to="/campaigns" className="header-nav">
                    <ArrowLeft size={20} />
                    <span>Back to Campaigns</span>
                </Link>
                <div className="header-content">
                    <div>
                        <div className="campaign-title-wrapper">
                            <h1>{campaign.name}</h1>
                            <span className={`status-badge ${campaign.status}`}>
                                {campaign.status}
                            </span>
                        </div>
                        <p className="campaign-meta">
                            Campaign ID: {campaign.id} • Created on {new Date(campaign.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="header-actions">
                        {/* Edit Button - For draft, scheduled, completed, or stopped campaigns */}
                        {(campaign.status === 'draft' || campaign.status === 'scheduled' || campaign.status === 'completed' || campaign.status === 'stopped') && (
                            <button
                                onClick={() => navigate(`/campaigns/${campaignId}/edit`)}
                                className="action-btn secondary"
                                style={{ marginRight: '8px' }}
                            >
                                <Edit2 size={18} />
                                <span>Edit</span>
                            </button>
                        )}

                        {/* Schedule Button - For draft, completed, or stopped campaigns */}
                        {(campaign.status === 'draft' || campaign.status === 'completed' || campaign.status === 'stopped') && (
                            <button
                                onClick={() => navigate(`/campaigns/${campaignId}/edit`)}
                                className="action-btn secondary"
                                style={{ marginRight: '8px' }}
                            >
                                <Calendar size={18} />
                                <span>Schedule</span>
                            </button>
                        )}

                        {/* Start/Restart Button - For draft, completed, stopped, or failed campaigns */}
                        {(campaign.status === 'draft' || campaign.status === 'completed' || campaign.status === 'stopped' || campaign.status === 'failed') && (
                            <button
                                onClick={() => startMutation.mutate()}
                                disabled={startMutation.isPending}
                                className="action-btn primary"
                            >
                                <Play size={18} />
                                <span>{startMutation.isPending ? 'Starting...' : (campaign.status === 'completed' || campaign.status === 'stopped' ? 'Restart' : 'Start Now')}</span>
                            </button>
                        )}

                        {/* Scheduled Status - Show scheduled time */}
                        {campaign.status === 'scheduled' && campaign.scheduled_at && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                backgroundColor: '#dbeafe',
                                borderRadius: '8px',
                                color: '#1e40af',
                                fontSize: '0.875rem',
                            }}>
                                <Calendar size={16} />
                                <span>
                                    Scheduled for {new Date(campaign.scheduled_at).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                        )}
                        
                        {/* Pause Button - Only for running */}
                        {campaign.status === 'running' && (
                            <button
                                onClick={() => pauseMutation.mutate()}
                                disabled={pauseMutation.isPending}
                                className="action-btn secondary"
                            >
                                <Pause size={18} />
                                <span>{pauseMutation.isPending ? 'Pausing...' : 'Pause'}</span>
                            </button>
                        )}
                        
                        {/* Resume Button - Only for paused */}
                        {campaign.status === 'paused' && (
                            <button
                                onClick={() => resumeMutation.mutate()}
                                disabled={resumeMutation.isPending}
                                className="action-btn primary"
                            >
                                <Play size={18} />
                                <span>{resumeMutation.isPending ? 'Resuming...' : 'Resume'}</span>
                            </button>
                        )}
                        
                        {/* Stop Button - For running or paused */}
                        {(campaign.status === 'running' || campaign.status === 'paused') && (
                            <button
                                onClick={() => stopMutation.mutate()}
                                disabled={stopMutation.isPending}
                                className="action-btn danger"
                                style={{ backgroundColor: '#ef4444', color: 'white', marginLeft: '8px' }}
                            >
                                <span>{stopMutation.isPending ? 'Stopping...' : 'Stop'}</span>
                            </button>
                        )}
                        
                        <div className="live-indicator">
                            <RefreshCw size={14} className="spin-icon" />
                            <span>Live (15s)</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="progress-card">
                <div className="progress-header">
                    <div>
                        <h3 className="progress-title">Campaign Progress</h3>
                        <p className="progress-stats">
                            {campaignStatus?.sent_count ?? safeStats.sent} 
                            <span>/ {campaignStatus?.total_contacts ?? safeStats.total_contacts} sent</span>
                            {campaignStatus && campaignStatus.pending_count > 0 && (
                                <span style={{ marginLeft: '12px', color: '#6b7280' }}>
                                    ({campaignStatus.pending_count} pending)
                                </span>
                            )}
                        </p>
                    </div>
                    <span className="progress-percentage">
                        {Math.round(campaignStatus?.percent_complete ?? progress)}%
                    </span>
                </div>
                <div className="progress-bar-container">
                    <div
                        className="progress-bar"
                        style={{ width: `${campaignStatus?.percent_complete ?? progress}%` }}
                    ></div>
                </div>
                {campaignStatus && (
                    <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '0.875rem', color: '#6b7280' }}>
                        <span>Status: <strong style={{ textTransform: 'capitalize' }}>{campaignStatus.status}</strong></span>
                        {campaignStatus.failed_count > 0 && (
                            <span style={{ color: '#ef4444' }}>Failed: {campaignStatus.failed_count}</span>
                        )}
                        {campaignStatus.skipped_count > 0 && (
                            <span>Skipped: {campaignStatus.skipped_count}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="stat-grid">
                <div className="detail-stat-card">
                    <div className="detail-stat-header">
                        <Users size={20} className="text-gray-400" />
                        <span>Total Contacts</span>
                    </div>
                    <div className="detail-stat-value">{safeStats.total_contacts}</div>
                </div>
                <div className="detail-stat-card">
                    <div className="detail-stat-header" style={{ color: '#3b82f6' }}>
                        <Mail size={20} />
                        <span>Open Rate</span>
                    </div>
                    <div className="detail-stat-value">{safeStats.open_rate}%</div>
                    <div className="detail-stat-subtext">{safeStats.opened} opened</div>
                </div>
                <div className="detail-stat-card">
                    <div className="detail-stat-header" style={{ color: '#8b5cf6' }}>
                        <MousePointer2 size={20} />
                        <span>Click Rate</span>
                    </div>
                    <div className="detail-stat-value">{safeStats.click_rate}%</div>
                    <div className="detail-stat-subtext">{safeStats.clicked} clicked</div>
                </div>
                <div className="detail-stat-card">
                    <div className="detail-stat-header" style={{ color: '#ec4899' }}>
                        <Reply size={20} />
                        <span>Reply Rate</span>
                    </div>
                    <div className="detail-stat-value">{safeStats.reply_rate}%</div>
                    <div className="detail-stat-subtext">{safeStats.replied} replied</div>
                </div>
            </div>

            <div className="content-grid">
                {/* Visual Chart */}
                <div className="content-card">
                    <h3 className="content-header">Engagement Split</h3>
                    <div className="chart-wrapper">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {pieData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="legend">
                        <div className="legend-item">
                            <div className="dot" style={{ backgroundColor: '#8b5cf6' }}></div>
                            <span className="legend-text">Opened</span>
                        </div>
                        <div className="legend-item">
                            <div className="dot" style={{ backgroundColor: '#e5e7eb' }}></div>
                            <span className="legend-text">Unopened</span>
                        </div>
                    </div>
                </div>

                {/* Contact Upload Section */}
                <div className="content-card">
                    <div className="content-card-header">
                        <h3>Upload Contacts</h3>
                        <p>Upload a CSV file with contacts to add to this campaign.</p>
                    </div>
                    
                    {uploadError && (
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
                            {uploadError}
                        </div>
                    )}
                    
                    {uploadSuccess && (
                        <div style={{ 
                            backgroundColor: '#d1fae5', 
                            color: '#065f46', 
                            padding: '12px 16px', 
                            borderRadius: '8px',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Upload size={18} />
                            {uploadSuccess}
                        </div>
                    )}
                    
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: '2px dashed #d1d5db',
                            borderRadius: '12px',
                            padding: '32px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            backgroundColor: uploadContactsMutation.isPending ? '#f3f4f6' : 'transparent'
                        }}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                        />
                        {uploadContactsMutation.isPending ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                <RefreshCw size={32} className="animate-spin" style={{ color: '#6b7280' }} />
                                <p style={{ color: '#6b7280', margin: 0 }}>Uploading contacts...</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                <FileSpreadsheet size={32} style={{ color: '#6b7280' }} />
                                <div>
                                    <p style={{ color: '#374151', margin: '0 0 4px 0', fontWeight: 500 }}>
                                        Click to upload CSV file
                                    </p>
                                    <p style={{ color: '#9ca3af', margin: 0, fontSize: '0.875rem' }}>
                                        Supports .csv files with columns: email, first_name, last_name, company, title
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Send Status Table (Live Feed) */}
                <div className="content-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div className="content-card-header">
                        <h3>Live Activity Feed</h3>
                        <p>Recent status updates from your contacts.</p>
                    </div>
                    <div className="feed-table-container">
                        <table className="feed-table">
                            <thead>
                                <tr>
                                    <th>Contact</th>
                                    <th>Status</th>
                                    <th>Last Activity</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoadingContacts ? (
                                    <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>Loading activity...</td></tr>
                                ) : contacts?.length === 0 ? (
                                    <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>No activity yet.</td></tr>
                                ) : (
                                    contacts?.map((contact, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 500, color: '#111827' }}>{contact.email}</td>
                                            <td>
                                                <span className="feed-status" style={{
                                                    backgroundColor:
                                                        contact.status === 'replied' ? '#fce7f3' :
                                                            contact.status === 'opened' ? '#f3e8ff' :
                                                                contact.status === 'clicked' ? '#e0e7ff' :
                                                                    contact.status === 'bounced' ? '#fee2e2' :
                                                                        contact.status === 'sent' ? '#dbeafe' : '#f3f4f6',
                                                    color:
                                                        contact.status === 'replied' ? '#831843' :
                                                            contact.status === 'opened' ? '#6b21a8' :
                                                                contact.status === 'clicked' ? '#3730a3' :
                                                                    contact.status === 'bounced' ? '#991b1b' :
                                                                        contact.status === 'sent' ? '#1e40af' : '#1f2937'
                                                }}>
                                                    {contact.status}
                                                </span>
                                            </td>
                                            <td style={{ color: '#6b7280' }}>
                                                {contact.replied_at ? new Date(contact.replied_at).toLocaleString() :
                                                    contact.clicked_at ? new Date(contact.clicked_at).toLocaleString() :
                                                        contact.opened_at ? new Date(contact.opened_at).toLocaleString() :
                                                            contact.sent_at ? new Date(contact.sent_at).toLocaleString() : '-'}
                                            </td>
                                            <td>
                                                {contact.bounce_reason && (
                                                    <div className="bounce-info" title={contact.bounce_reason}>
                                                        <AlertCircle size={14} />
                                                        <span className="truncate">{contact.bounce_reason}</span>
                                                    </div>
                                                )}
                                                {!contact.bounce_reason && '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CampaignDetail;
