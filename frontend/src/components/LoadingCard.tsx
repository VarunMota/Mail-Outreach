import React from 'react';

interface LoadingCardProps {
    variant?: 'stat' | 'chart' | 'table' | 'activity';
    count?: number;
}

const LoadingCard: React.FC<LoadingCardProps> = ({ variant = 'stat', count = 1 }) => {
    const shimmerStyle = {
        animation: 'shimmer 2s infinite',
        backgroundImage: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
        backgroundSize: '200% 100%'
    };

    const renderSkeleton = () => {
        switch (variant) {
            case 'stat':
                return (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            padding: '24px',
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0'
                        }}
                    >
                        <div style={{ ...shimmerStyle, height: '12px', borderRadius: '6px', width: '80px' }} />
                        <div style={{ ...shimmerStyle, height: '32px', borderRadius: '6px', width: '120px' }} />
                        <div style={{ ...shimmerStyle, height: '10px', borderRadius: '6px', width: '100px' }} />
                    </div>
                );
            case 'chart':
                return (
                    <div
                        style={{
                            padding: '28px',
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0'
                        }}
                    >
                        <div style={{ ...shimmerStyle, height: '20px', borderRadius: '6px', width: '150px', marginBottom: '20px' }} />
                        <div style={{ ...shimmerStyle, height: '300px', borderRadius: '8px' }} />
                    </div>
                );
            case 'table':
                return (
                    <div
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ ...shimmerStyle, height: '50px', borderRadius: '0' }} />
                        {[...Array(5)].map((_, i) => (
                            <div key={i} style={{ ...shimmerStyle, height: '60px', borderRadius: '0', borderBottom: '1px solid #e2e8f0' }} />
                        ))}
                    </div>
                );
            case 'activity':
            default:
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[...Array(count)].map((_, i) => (
                            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ ...shimmerStyle, width: '10px', height: '10px', borderRadius: '50%' }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ ...shimmerStyle, height: '12px', borderRadius: '6px', marginBottom: '6px' }} />
                                    <div style={{ ...shimmerStyle, height: '10px', borderRadius: '6px', width: '80%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                );
        }
    };

    return (
        <>
            {[...Array(variant === 'stat' ? count : 1)].map((_, i) => (
                <div key={i}>
                    {renderSkeleton()}
                </div>
            ))}
        </>
    );
};

export default LoadingCard;
