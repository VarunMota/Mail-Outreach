import { useState } from 'react';
import { Calendar, Clock, X, Check } from 'lucide-react';

interface SchedulePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  minDate?: string;
}

export const SchedulePicker = ({ value, onChange, minDate }: SchedulePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState(value ? value.split('T')[0] : '');
  const [time, setTime] = useState(value ? value.split('T')[1]?.substring(0, 5) || '09:00' : '09:00');

  const handleApply = () => {
    if (date && time) {
      const scheduledAt = `${date}T${time}:00`;
      onChange(scheduledAt);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setDate('');
    setTime('09:00');
    setIsOpen(false);
  };

  const formatDisplay = (datetime: string) => {
    const date = new Date(datetime);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Get minimum date (today) in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  const effectiveMinDate = minDate || today;

  return (
    <div style={{ position: 'relative' }}>
      {/* Display Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          backgroundColor: value ? '#dbeafe' : '#fff',
          border: `1px solid ${value ? '#3b82f6' : '#d1d5db'}`,
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.875rem',
          color: value ? '#1e40af' : '#374151',
          width: '100%',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} />
          {value ? (
            <span>{formatDisplay(value)}</span>
          ) : (
            <span style={{ color: '#6b7280' }}>Schedule for later...</span>
          )}
        </div>
        {value && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            style={{
              cursor: 'pointer',
              padding: '2px',
              borderRadius: '4px',
            }}
          >
            <X size={16} />
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '8px',
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 50,
            padding: '16px',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '6px',
              }}
            >
              Date
            </label>
            <input
              type="date"
              value={date}
              min={effectiveMinDate}
              onChange={(e) => setDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#374151',
                marginBottom: '6px',
              }}
            >
              Time
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#6b7280" />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#374151',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!date}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: date ? '#3b82f6' : '#9ca3af',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: '#fff',
                cursor: date ? 'pointer' : 'not-allowed',
              }}
            >
              <Check size={16} style={{ marginRight: '4px', display: 'inline' }} />
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePicker;
