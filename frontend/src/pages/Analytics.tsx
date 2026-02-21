import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Loader2, TrendingUp, Users, MousePointer, MessageSquare } from 'lucide-react';
import { campaignService } from '../services/campaignService';
import TimeRangeSelector from '../components/TimeRangeSelector';
import '../styles/Dashboard.css';

const Analytics = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'deliverability'>('overview');
    
    const { data: summary, isLoading, error } = useQuery({
        queryKey: ['dashboard-summary'],
        queryFn: () => campaignService.getDashboardSummary(),
    });

    if (isLoading) {
        return (
            <div className="dashboard-container">
                <div className="loading-state">
                    <Loader2 className="animate-spin" size={32} />
                    <p>Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container">
                <div className="error-state">
                    <p>Failed to load analytics data</p>
                    <button onClick={() => window.location.reload()} className="retry-btn">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const stats = summary || {
        total_sent: 0,
        total_opened: 0,
        total_clicked: 0,
        total_replied: 0,
        open_rate: 0,
        click_rate: 0,
        reply_rate: 0,
        daily_stats: []
    };

    const engagementData = [
        { name: 'Opened', value: stats.total_opened, color: '#60a5fa' },
        { name: 'Clicked', value: stats.total_clicked, color: '#3b82f6' },
        { name: 'Replied', value: stats.total_replied, color: '#8b5cf6' },
        { name: 'No Action', value: Math.max(0, stats.total_sent - stats.total_opened), color: '#e5e7eb' },
    ];

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1>Analytics</h1>
                        <p>Detailed insights into your email outreach performance.</p>
                    </div>
                    <TimeRangeSelector />
                </div>
            </div>
            
            {/* Analytics Tabs */}
            <div style={{ display: 'flex', gap: '32px', borderBottom: '2px solid #e5e7eb', marginBottom: '32px' }}>
                {['overview', 'performance', 'deliverability'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        style={{
                            padding: '12px 0',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: activeTab === tab ? '700' : '600',
                            color: activeTab === tab ? '#4f46e5' : '#475569',
                            borderBottom: activeTab === tab ? '3px solid #4f46e5' : 'none',
                            transition: 'all 250ms ease-in-out',
                            textTransform: 'capitalize'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon sent">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total Sent</p>
                        <p className="stat-value">{stats.total_sent.toLocaleString()}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon opened">
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total Opened</p>
                        <p className="stat-value">{stats.total_opened.toLocaleString()}</p>
                        <p className="stat-change">{stats.open_rate}% rate</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon clicked">
                        <MousePointer size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total Clicks</p>
                        <p className="stat-value">{stats.total_clicked.toLocaleString()}</p>
                        <p className="stat-change">{stats.click_rate}% rate</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon replied">
                        <MessageSquare size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total Replies</p>
                        <p className="stat-value">{stats.total_replied.toLocaleString()}</p>
                        <p className="stat-change">{stats.reply_rate}% rate</p>
                    </div>
                </div>
            </div>

            <div className="charts-grid">
                {/* Daily Activity Chart */}
                <div className="chart-card">
                    <h2>Daily Activity (Last 7 Days)</h2>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={stats.daily_stats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="sent" fill="#9ca3af" radius={[4, 4, 0, 0]} name="Sent" />
                                <Bar dataKey="opened" fill="#60a5fa" radius={[4, 4, 0, 0]} name="Opened" />
                                <Bar dataKey="clicked" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Clicked" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Engagement Distribution */}
                <div className="chart-card">
                    <h2>Engagement Distribution</h2>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={engagementData}
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {engagementData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="legend" style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
                        {engagementData.map((item) => (
                            <div key={item.name} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div className="dot" style={{ backgroundColor: item.color, width: 10, height: 10, borderRadius: '50%' }}></div>
                                <span className="legend-text">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
