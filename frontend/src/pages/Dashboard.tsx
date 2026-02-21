import { useQuery } from '@tanstack/react-query';
import {
    Users,
    Send,
    MousePointer,
    MessageSquare,
    Activity as ActivityIcon,
    Loader2
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { campaignService, type ActivityItem } from '../services/campaignService';
import '../styles/Dashboard.css';

const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
};

const getActivityIcon = (type: string) => {
    switch (type) {
        case 'sent': return 'sent';
        case 'open': return 'opened';
        case 'click': return 'clicked';
        case 'reply': return 'replied';
        default: return 'sent';
    }
};

const Dashboard = () => {
    const { data: summary, isLoading, error } = useQuery({
        queryKey: ['dashboard-summary'],
        queryFn: () => campaignService.getDashboardSummary(),
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    if (isLoading) {
        return (
            <div className="dashboard-container">
                <div className="loading-state">
                    <Loader2 className="animate-spin" size={32} />
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container">
                <div className="error-state">
                    <p>Failed to load dashboard data</p>
                    <button onClick={() => window.location.reload()} className="retry-btn">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const stats = summary || {
        total_sent: 0,
        open_rate: 0,
        click_rate: 0,
        reply_rate: 0,
        daily_stats: [],
        recent_activity: []
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>Overview of your email outreach performance.</p>
                </div>
                <div className="date-range-picker">
                    <span>Last 7 Days</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon sent">
                        <Send size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Total Sent</p>
                        <p className="stat-value">{stats.total_sent.toLocaleString()}</p>
                        <p className="stat-change positive">All time</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon opened">
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Open Rate</p>
                        <p className="stat-value">{stats.open_rate}%</p>
                        <p className="stat-change positive">Avg. across campaigns</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon clicked">
                        <MousePointer size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Click Rate</p>
                        <p className="stat-value">{stats.click_rate}%</p>
                        <p className="stat-change positive">Avg. across campaigns</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon replied">
                        <MessageSquare size={24} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Reply Rate</p>
                        <p className="stat-value">{stats.reply_rate}%</p>
                        <p className="stat-change positive">Avg. across campaigns</p>
                    </div>
                </div>
            </div>

            <div className="charts-grid">
                {/* Main Component: Chart */}
                <div className="chart-card">
                    <h2>Engagement Overview</h2>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={stats.daily_stats}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="sent" fill="#9ca3af" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="opened" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="clicked" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Secondary Component: Recent Activity */}
                <div className="activity-card">
                    <div className="activity-header">
                        <h2>Recent Activity</h2>
                        <ActivityIcon size={20} className="text-gray-400" />
                    </div>
                    <div className="activity-list">
                        {stats.recent_activity.length === 0 ? (
                            <p className="no-activity">No recent activity</p>
                        ) : (
                            stats.recent_activity.map((activity: ActivityItem) => (
                                <div key={activity.id} className="activity-item">
                                    <div className={`activity-dot ${getActivityIcon(activity.type)}`}></div>
                                    <div className="activity-details">
                                        <p className="activity-title">{activity.title}</p>
                                        <p className="activity-time">{formatRelativeTime(activity.timestamp)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
