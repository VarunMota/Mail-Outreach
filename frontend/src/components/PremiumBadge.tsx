import React from 'react';

interface PremiumBadgeProps {
    status: 'active' | 'running' | 'draft' | 'completed' | 'paused' | 'stopped' | 'failed' | 'scheduled';
    scheduledTime?: string;
}

const PremiumBadge: React.FC<PremiumBadgeProps> = ({ status, scheduledTime }) => {
    const getStatusLabel = (status: string): string => {
        switch (status) {
            case 'draft':
                return 'Draft';
            case 'scheduled':
                return 'Scheduled';
            case 'running':
            case 'active':
                return 'Running';
            case 'paused':
                return 'Paused';
            case 'stopped':
                return 'Stopped';
            case 'completed':
                return 'Completed';
            case 'failed':
                return 'Failed';
            default:
                return status;
        }
    };

    const normalizedStatus = status === 'active' ? 'running' : status;

    return (
        <div>
            <span className={`badge ${normalizedStatus}`}>
                {getStatusLabel(status)}
            </span>
            {status === 'scheduled' && scheduledTime && (
                <div style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    marginTop: '6px',
                    fontWeight: '500'
                }}>
                    {new Date(scheduledTime).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                    })}
                </div>
            )}
        </div>
    );
};

export default PremiumBadge;
