import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

type TimeRange = '7d' | '30d' | '90d' | 'custom';

interface TimeRangeSelectorProps {
    onSelect?: (range: TimeRange) => void;
    defaultRange?: TimeRange;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ 
    onSelect, 
    defaultRange = '7d' 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState<TimeRange>(defaultRange);

    const ranges: { label: string; value: TimeRange }[] = [
        { label: 'Last 7 Days', value: '7d' },
        { label: 'Last 30 Days', value: '30d' },
        { label: 'Last 90 Days', value: '90d' },
        { label: 'Custom', value: 'custom' }
    ];

    const handleSelect = (range: TimeRange) => {
        setSelected(range);
        setIsOpen(false);
        onSelect?.(range);
    };

    const getLabel = (value: TimeRange): string => {
        return ranges.find(r => r.value === value)?.label || 'Last 7 Days';
    };

    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="date-range-picker"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}
            >
                <span>{getLabel(selected)}</span>
                <ChevronDown
                    size={16}
                    style={{
                        transition: 'transform 250ms ease-in-out',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}
                />
            </button>

            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '8px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '6px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        zIndex: 1000,
                        minWidth: '200px',
                        animation: 'slideIn 0.3s ease-in-out'
                    }}
                >
                    {ranges.map(range => (
                        <button
                            key={range.value}
                            onClick={() => handleSelect(range.value)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                width: '100%',
                                padding: '10px 12px',
                                border: 'none',
                                borderRadius: '8px',
                                backgroundColor: selected === range.value ? '#f1f5f9' : 'transparent',
                                color: selected === range.value ? '#4f46e5' : '#475569',
                                cursor: 'pointer',
                                transition: 'all 150ms ease-in-out',
                                fontSize: '0.95rem',
                                fontWeight: selected === range.value ? '600' : '500'
                            }}
                            onMouseEnter={(e) => {
                                (e.target as HTMLButtonElement).style.backgroundColor = '#f1f5f9';
                            }}
                            onMouseLeave={(e) => {
                                if (selected !== range.value) {
                                    (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            {range.label}
                            {selected === range.value && (
                                <span style={{ marginLeft: 'auto', color: '#4f46e5' }}>✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TimeRangeSelector;
