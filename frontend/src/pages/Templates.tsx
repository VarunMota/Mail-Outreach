import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import '../styles/Templates.css';

interface Template {
    id: number;
    name: string;
    subject: string;
    body: string;
}

const Templates = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);

    // Mock data
    const [templates, setTemplates] = useState<Template[]>([
        { id: 1, name: 'Cold Outreach - Tech', subject: 'Partnership Opportunity', body: 'Hi {{FirstName}}, ...' },
        { id: 2, name: 'Webinar Invite', subject: 'Join our webinar', body: 'Hello {{FirstName}}, ...' },
        { id: 3, name: 'Follow-up #1', subject: 'Re: Partnership', body: 'Just bumping this up...' },
    ]);

    const handleEdit = (template: Template) => {
        setCurrentTemplate(template);
        setIsEditing(true);
    };

    const handleNew = () => {
        setCurrentTemplate({ id: Date.now(), name: '', subject: '', body: '' });
        setIsEditing(true);
    };

    const handleSave = () => {
        if (!currentTemplate) return;

        if (currentTemplate.id) {
            setTemplates(templates.map(t => t.id === currentTemplate.id ? currentTemplate : t));
        } else {
            setTemplates([...templates, { ...currentTemplate, id: Date.now() }]);
        }
        setIsEditing(false);
        setCurrentTemplate(null);
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure?')) {
            setTemplates(templates.filter(t => t.id !== id));
        }
    };

    if (isEditing && currentTemplate) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <h1 className="page-title">{currentTemplate.id ? 'Edit Template' : 'New Template'}</h1>
                    <button onClick={() => setIsEditing(false)} className="btn-secondary">
                        <X size={18} /> Cancel
                    </button>
                </div>

                <div className="template-editor">
                    <div className="form-group">
                        <label className="form-label">Template Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={currentTemplate.name}
                            onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Subject Line</label>
                        <input
                            type="text"
                            className="form-input"
                            value={currentTemplate.subject}
                            onChange={(e) => setCurrentTemplate({ ...currentTemplate, subject: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email Body</label>
                        <textarea
                            className="form-textarea"
                            value={currentTemplate.body}
                            onChange={(e) => setCurrentTemplate({ ...currentTemplate, body: e.target.value })}
                        />
                        <p className="form-hint">Supports Jinja2 syntax. Available variables: {'{{FirstName}}'}, {'{{LastName}}'}, {'{{Company}}'}</p>
                    </div>
                    <div className="form-actions">
                        <button onClick={handleSave} className="btn-primary">
                            <Save size={18} /> Save Template
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="templates-container">
            <div className="templates-header">
                <div>
                    <h1>Email Templates</h1>
                    <p>Manage and edit your email templates.</p>
                </div>
                <button
                    onClick={handleNew}
                    className="primary-btn"
                >
                    <Plus size={20} />
                    <span>New Template</span>
                </button>
            </div>

            <div className="templates-grid">
                {templates.map((template) => (
                    <div key={template.id} className="template-card">
                        <div className="card-header">
                            <h3>{template.name}</h3>
                            <div className="card-actions">
                                <button onClick={() => handleEdit(template)} className="action-icon-btn">
                                    <Edit2 size={18} />
                                </button>
                                <button onClick={() => handleDelete(template.id)} className="action-icon-btn delete">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                        <p className="template-subject">Subject: {template.subject}</p>
                        <p className="template-preview">{template.body}</p>
                        <div className="card-footer">
                            <span>Last edited: 2 days ago</span>
                        </div>
                    </div>
                ))}

                <button
                    onClick={handleNew}
                    className="create-card"
                >
                    <Plus size={32} />
                    <span>Create New Template</span>
                </button>
            </div>
        </div>
    );
};

export default Templates;
