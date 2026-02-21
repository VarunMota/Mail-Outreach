import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor: 'sent' | 'opened' | 'clicked' | 'replied';
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor
}) => {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <div className="stat-content">
          <p className="stat-label">{label}</p>
          <p className="stat-value">{value}</p>
          {change && (
            <p className={`stat-change ${changeType}`}>
              <span className="change-value">{change}</span>
            </p>
          )}
        </div>
        <div className={`stat-icon ${iconColor}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
