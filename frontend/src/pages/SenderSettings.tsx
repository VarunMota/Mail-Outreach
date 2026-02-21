import { useState } from 'react';
import { Plus, Check, X, RefreshCw, Star, Trash2, Edit2, Loader2, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { senderService, type SenderAccount, type SenderAccountCreate } from '../services/senderService';
import '../styles/Dashboard.css';

const SenderSettings = () => {
    const queryClient = useQueryClient();
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSender, setEditingSender] = useState<SenderAccount | null>(null);
    const [testingId, setTestingId] = useState<number | null>(null);
    const [testResult, setTestResult] = useState<{success: boolean; message: string} | null>(null);

    const { data: sendersData, isLoading } = useQuery({
        queryKey: ['senders'],
        queryFn: () => senderService.getSenders(),
    });

    const createMutation = useMutation({
        mutationFn: (data: SenderAccountCreate) => senderService.createSender(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['senders'] });
            setShowAddModal(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<SenderAccountCreate> }) => 
            senderService.updateSender(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['senders'] });
            setEditingSender(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => senderService.deleteSender(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['senders'] });
        },
    });

    const setDefaultMutation = useMutation({
        mutationFn: (id: number) => senderService.setDefaultSender(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['senders'] });
        },
    });

    const handleTest = async (id: number) => {
        setTestingId(id);
        setTestResult(null);
        try {
            const result = await senderService.testSender(id);
            setTestResult(result);
        } catch (error) {
            setTestResult({ success: false, message: 'Test failed' });
        } finally {
            setTestingId(null);
            queryClient.invalidateQueries({ queryKey: ['senders'] });
        }
    };

    const senders = sendersData?.items || [];

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <div>
                    <h1>Sender Accounts</h1>
                    <p>Manage your email sending accounts and SMTP settings.</p>
                </div>
                <button 
                    className="action-btn primary"
                    onClick={() => setShowAddModal(true)}
                >
                    <Plus size={18} />
                    <span>Add Sender</span>
                </button>
            </div>

            {testResult && (
                <div className={`alert ${testResult.success ? 'success' : 'error'}`} style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    backgroundColor: testResult.success ? '#dcfce7' : '#fee2e2',
                    color: testResult.success ? '#166534' : '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {testResult.success ? <Check size={18} /> : <AlertCircle size={18} />}
                    {testResult.message}
                    <button 
                        onClick={() => setTestResult(null)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="table-container">
                <table className="campaign-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>SMTP Server</th>
                            <th>Daily Limit</th>
                            <th>Status</th>
                            <th>Last Test</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>
                                    <Loader2 className="animate-spin" size={24} />
                                </td>
                            </tr>
                        ) : senders.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="empty-state">
                                    No sender accounts configured. Add your first sender to start sending campaigns.
                                </td>
                            </tr>
                        ) : (
                            senders.map((sender) => (
                                <tr key={sender.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {sender.is_default && (
                                                <Star size={16} fill="#f59e0b" color="#f59e0b" />
                                            )}
                                            {sender.name}
                                        </div>
                                    </td>
                                    <td>{sender.email}</td>
                                    <td>{sender.smtp_host}:{sender.smtp_port}</td>
                                    <td>{sender.daily_limit}</td>
                                    <td>
                                        <span className={`badge ${sender.is_active ? 'sent' : 'bounced'}`}>
                                            {sender.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        {sender.last_test_status ? (
                                            <span style={{ 
                                                color: sender.last_test_status === 'success' ? '#16a34a' : '#dc2626',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                {sender.last_test_status === 'success' ? 
                                                    <Check size={14} /> : <X size={14} />
                                                }
                                                {sender.last_test_status === 'success' ? 'OK' : 'Failed'}
                                            </span>
                                        ) : (
                                            <span style={{ color: '#9ca3af' }}>Never</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            {!sender.is_default && sender.is_active && (
                                                <button
                                                    className="icon-btn"
                                                    onClick={() => setDefaultMutation.mutate(sender.id)}
                                                    disabled={setDefaultMutation.isPending}
                                                    title="Set as default"
                                                >
                                                    <Star size={16} />
                                                </button>
                                            )}
                                            <button
                                                className="icon-btn"
                                                onClick={() => handleTest(sender.id)}
                                                disabled={testingId === sender.id}
                                                title="Test SMTP"
                                            >
                                                {testingId === sender.id ? 
                                                    <Loader2 size={16} className="animate-spin" /> : 
                                                    <RefreshCw size={16} />
                                                }
                                            </button>
                                            <button
                                                className="icon-btn"
                                                onClick={() => setEditingSender(sender)}
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                className="icon-btn delete"
                                                onClick={() => deleteMutation.mutate(sender.id)}
                                                disabled={deleteMutation.isPending}
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {(showAddModal || editingSender) && (
                <SenderModal
                    sender={editingSender}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingSender(null);
                    }}
                    onSubmit={(data) => {
                        if (editingSender) {
                            updateMutation.mutate({ id: editingSender.id, data });
                        } else {
                            createMutation.mutate(data as SenderAccountCreate);
                        }
                    }}
                    isSubmitting={createMutation.isPending || updateMutation.isPending}
                />
            )}
        </div>
    );
};

interface SenderModalProps {
    sender: SenderAccount | null;
    onClose: () => void;
    onSubmit: (data: SenderAccountCreate | Partial<SenderAccountCreate>) => void;
    isSubmitting: boolean;
}

const SenderModal = ({ sender, onClose, onSubmit, isSubmitting }: SenderModalProps) => {
    const [formData, setFormData] = useState<Partial<SenderAccountCreate>>({
        name: sender?.name || '',
        email: sender?.email || '',
        smtp_host: sender?.smtp_host || 'smtp.gmail.com',
        smtp_port: sender?.smtp_port || 587,
        smtp_username: sender?.smtp_username || '',
        smtp_password: '',
        smtp_use_tls: sender?.smtp_use_tls ?? true,
        daily_limit: sender?.daily_limit || 100,
        is_active: sender?.is_active ?? true,
        is_default: sender?.is_default ?? false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                width: '100%',
                maxWidth: '500px',
                maxHeight: '90vh',
                overflow: 'auto'
            }}>
                <h2 style={{ marginTop: 0 }}>
                    {sender ? 'Edit Sender' : 'Add Sender Account'}
                </h2>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label>Display Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Primary Gmail"
                            required
                        />
                    </div>

                    <div>
                        <label>Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="sender@example.com"
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                        <div>
                            <label>SMTP Host</label>
                            <input
                                type="text"
                                value={formData.smtp_host}
                                onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                                placeholder="smtp.gmail.com"
                                required
                            />
                        </div>
                        <div>
                            <label>Port</label>
                            <input
                                type="number"
                                value={formData.smtp_port}
                                onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
                                placeholder="587"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label>SMTP Username</label>
                        <input
                            type="text"
                            value={formData.smtp_username}
                            onChange={(e) => setFormData({ ...formData, smtp_username: e.target.value })}
                            placeholder="Usually same as email"
                            required
                        />
                    </div>

                    <div>
                        <label>SMTP Password {sender && '(leave blank to keep current)'}</label>
                        <input
                            type="password"
                            value={formData.smtp_password}
                            onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                            placeholder={sender ? '••••••••' : 'App password or SMTP password'}
                            required={!sender}
                        />
                        <small style={{ color: '#6b7280' }}>
                            For Gmail, use an App Password, not your regular password.
                        </small>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label>Daily Limit</label>
                            <input
                                type="number"
                                value={formData.daily_limit}
                                onChange={(e) => setFormData({ ...formData, daily_limit: parseInt(e.target.value) })}
                                min="1"
                                max="10000"
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                                Active
                            </label>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button type="button" onClick={onClose} className="action-btn secondary">
                            Cancel
                        </button>
                        <button type="submit" className="action-btn primary" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                            {sender ? 'Save Changes' : 'Add Sender'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SenderSettings;
