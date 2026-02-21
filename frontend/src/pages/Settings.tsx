import { useState } from 'react';
import { Save, Mail, Clock, Shield, Database } from 'lucide-react';
import '../styles/Dashboard.css';

interface SettingsState {
    sender_email: string;
    daily_limit: number;
    delay_seconds: number;
    tracking_enabled: boolean;
}

const Settings = () => {
    const [settings, setSettings] = useState<SettingsState>({
        sender_email: '',
        daily_limit: 50,
        delay_seconds: 60,
        tracking_enabled: true,
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h1>Settings</h1>
                    <p>Configure your email outreach preferences.</p>
                </div>
            </div>

            <div className="settings-grid" style={{ display: 'grid', gap: '24px', maxWidth: '800px' }}>
                {/* Email Settings */}
                <div className="chart-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <Mail size={24} style={{ color: '#3b82f6' }} />
                        <h2 style={{ margin: 0 }}>Email Settings</h2>
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                            Sender Email
                        </label>
                        <input
                            type="email"
                            value={settings.sender_email}
                            onChange={(e) => setSettings({ ...settings, sender_email: e.target.value })}
                            placeholder="your@email.com"
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px'
                            }}
                        />
                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                            This email will be used as the "From" address for all campaigns.
                        </p>
                    </div>
                </div>

                {/* Sending Limits */}
                <div className="chart-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <Clock size={24} style={{ color: '#8b5cf6' }} />
                        <h2 style={{ margin: 0 }}>Sending Limits</h2>
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                            Daily Email Limit
                        </label>
                        <input
                            type="number"
                            value={settings.daily_limit}
                            onChange={(e) => setSettings({ ...settings, daily_limit: parseInt(e.target.value) || 0 })}
                            min="1"
                            max="500"
                            style={{
                                width: '200px',
                                padding: '10px 14px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px'
                            }}
                        />
                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                            Maximum emails to send per day (recommended: 50-100 for better deliverability).
                        </p>
                    </div>

                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                            Delay Between Emails (seconds)
                        </label>
                        <input
                            type="number"
                            value={settings.delay_seconds}
                            onChange={(e) => setSettings({ ...settings, delay_seconds: parseInt(e.target.value) || 0 })}
                            min="10"
                            max="300"
                            style={{
                                width: '200px',
                                padding: '10px 14px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px'
                            }}
                        />
                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                            Time to wait between sending each email (recommended: 60+ seconds).
                        </p>
                    </div>
                </div>

                {/* Tracking Settings */}
                <div className="chart-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <Shield size={24} style={{ color: '#10b981' }} />
                        <h2 style={{ margin: 0 }}>Tracking Settings</h2>
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={settings.tracking_enabled}
                                onChange={(e) => setSettings({ ...settings, tracking_enabled: e.target.checked })}
                                style={{ width: '20px', height: '20px' }}
                            />
                            <span style={{ fontWeight: 500 }}>Enable Email Tracking</span>
                        </label>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px', marginLeft: '32px' }}>
                            Track opens, clicks, and replies for all sent emails.
                        </p>
                    </div>
                </div>

                {/* Database Info */}
                <div className="chart-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <Database size={24} style={{ color: '#f59e0b' }} />
                        <h2 style={{ margin: 0 }}>System Information</h2>
                    </div>
                    
                    <div style={{ display: 'grid', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
                            <span style={{ color: '#6b7280' }}>Version</span>
                            <span style={{ fontWeight: 500 }}>1.0.0</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
                            <span style={{ color: '#6b7280' }}>Backend</span>
                            <span style={{ fontWeight: 500 }}>FastAPI + PostgreSQL</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                            <span style={{ color: '#6b7280' }}>Frontend</span>
                            <span style={{ fontWeight: 500 }}>React + Vite</span>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    {saved && (
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            Settings saved successfully!
                        </span>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.7 : 1
                        }}
                    >
                        {saving ? (
                            <span>Saving...</span>
                        ) : (
                            <>
                                <Save size={18} />
                                <span>Save Settings</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
