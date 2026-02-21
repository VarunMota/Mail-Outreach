import { useState } from 'react';
import { Plus, Search, Filter, Play, Pause, Square, Eye, Trash2, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignService, type CampaignListItem } from '../services/campaignService';
import '../styles/CampaignList.css';

const CampaignList = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: campaigns, isLoading, error } = useQuery({
        queryKey: ['campaigns'],
        queryFn: () => campaignService.getCampaigns(),
    });

    const startMutation = useMutation({
        mutationFn: (id: number) => campaignService.startCampaign(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        },
    });

    const pauseMutation = useMutation({
        mutationFn: (id: number) => campaignService.pause(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        },
    });

    const stopMutation = useMutation({
        mutationFn: (id: number) => campaignService.stopCampaign(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => campaignService.deleteCampaign(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        },
    });

    const filteredCampaigns = campaigns?.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (isLoading) {
        return (
            <div className="page-container">
                <div className="loading-state">
                    <Loader2 className="animate-spin" size={32} />
                    <p>Loading campaigns...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container">
                <div className="error-state">
                    <p>Failed to load campaigns</p>
                    <button onClick={() => queryClient.invalidateQueries({ queryKey: ['campaigns'] })} className="retry-btn">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Campaigns</h1>
                    <p>Manage your email outreach campaigns.</p>
                </div>
                <Link to="/campaigns/new" className="primary-btn">
                    <Plus size={20} />
                    <span>New Campaign</span>
                </Link>
            </div>

            <div className="table-container">
                <div className="toolbar">
                    <div className="search-wrapper">
                        <Search className="search-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Search campaigns..."
                            className="search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="filter-btn">
                        <Filter size={18} />
                        <span>Filter</span>
                    </button>
                </div>

                <table className="campaign-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Sent</th>
                            <th>Open Rate</th>
                            <th>Reply Rate</th>
                            <th>Created</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCampaigns.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="empty-state">
                                    {searchTerm ? 'No campaigns match your search' : 'No campaigns yet. Create your first campaign!'}
                                </td>
                            </tr>
                        ) : (
                            filteredCampaigns.map((campaign: CampaignListItem) => (
                                <tr key={campaign.id}>
                                    <td>
                                        <Link to={`/campaigns/${campaign.id}`} className="campaign-link">
                                            {campaign.name}
                                        </Link>
                                    </td>
                                    <td>
                                        <span className={`badge ${campaign.status.toLowerCase()}`}>
                                            {campaign.status === 'draft' ? 'Draft' :
                                             campaign.status === 'scheduled' ? 'Scheduled' :
                                             campaign.status === 'running' || campaign.status === 'active' ? 'Running' :
                                             campaign.status === 'paused' ? 'Paused' :
                                             campaign.status === 'stopped' ? 'Stopped' :
                                             campaign.status === 'completed' ? 'Completed' :
                                             campaign.status === 'failed' ? 'Failed' :
                                             campaign.status}
                                        </span>
                                        {campaign.status === 'scheduled' && campaign.scheduled_at && (
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                                                {new Date(campaign.scheduled_at).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: 'numeric',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        )}
                                    </td>
                                    <td>{campaign.sent_count}</td>
                                    <td>{campaign.open_rate}%</td>
                                    <td>{campaign.reply_rate}%</td>
                                    <td className="text-gray-500">{formatDate(campaign.created_at)}</td>
                                    <td>
                                        <div className="action-buttons">
                                            {/* Show Start/Resume/Restart for draft, active, paused, stopped, completed, or failed campaigns */}
                                            {(campaign.status === 'draft' || campaign.status === 'active' || campaign.status === 'paused' || campaign.status === 'stopped' || campaign.status === 'completed' || campaign.status === 'failed') && (
                                                <button
                                                    className="icon-btn start"
                                                    onClick={() => startMutation.mutate(campaign.id)}
                                                    disabled={startMutation.isPending}
                                                    title={campaign.status === 'draft' ? 'Start Campaign' : campaign.status === 'completed' || campaign.status === 'stopped' ? 'Restart Campaign' : 'Resume Campaign'}
                                                >
                                                    <Play size={18} />
                                                </button>
                                            )}
                                            {/* Show Pause only for running campaigns */}
                                            {campaign.status === 'running' && (
                                                <button
                                                    className="icon-btn pause"
                                                    onClick={() => pauseMutation.mutate(campaign.id)}
                                                    disabled={pauseMutation.isPending}
                                                    title="Pause Campaign"
                                                >
                                                    <Pause size={18} />
                                                </button>
                                            )}
                                            {/* Show Stop for running or paused campaigns */}
                                            {(campaign.status === 'running' || campaign.status === 'paused') && (
                                                <button
                                                    className="icon-btn stop"
                                                    onClick={() => stopMutation.mutate(campaign.id)}
                                                    disabled={stopMutation.isPending}
                                                    title="Stop Campaign"
                                                >
                                                    <Square size={18} />
                                                </button>
                                            )}
                                            <button 
                                                className="icon-btn view"
                                                onClick={() => navigate(`/campaigns/${campaign.id}`)}
                                                title="View Details"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <button 
                                                className="icon-btn delete"
                                                onClick={() => {
                                                    if (confirm('Are you sure you want to delete this campaign?')) {
                                                        deleteMutation.mutate(campaign.id);
                                                    }
                                                }}
                                                disabled={deleteMutation.isPending}
                                                title="Delete Campaign"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CampaignList;
