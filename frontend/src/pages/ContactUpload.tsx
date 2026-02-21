import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { contactService, type ContactImportSummary } from '../services/contactService';
import '../styles/ContactUpload.css';

const ContactUpload = () => {
    const [file, setFile] = useState<File | null>(null);
    const [uploadResult, setUploadResult] = useState<ContactImportSummary | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadMutation = useMutation({
        mutationFn: (file: File) => contactService.uploadContacts(file),
        onSuccess: (data) => {
            setUploadResult(data);
        },
    });

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
            setFile(droppedFile);
            setUploadResult(null);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setUploadResult(null);
        }
    };

    const handleUpload = () => {
        if (!file) return;
        uploadMutation.mutate(file);
    };

    const handleReset = () => {
        setFile(null);
        setUploadResult(null);
        uploadMutation.reset();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="upload-container">
            <div className="upload-header">
                <h1>Upload Contacts</h1>
                <p>Import your leads from Excel files. Required columns: Email, FirstName, Company</p>
            </div>

            <div className="upload-card">
                {!uploadResult ? (
                    <>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept=".xlsx,.xls"
                            style={{ display: 'none' }}
                        />
                        <div
                            className={`dropzone ${file ? 'active' : ''}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="dropzone-content">
                                <div className="upload-icon">
                                    {file ? <FileSpreadsheet size={32} /> : <Upload size={32} />}
                                </div>
                                {file ? (
                                    <div className="file-info">
                                        <p className="file-name">{file.name}</p>
                                        <p className="file-size">{(file.size / 1024).toFixed(2)} KB</p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setFile(null);
                                            }}
                                            className="remove-file"
                                        >
                                            Remove File
                                        </button>
                                    </div>
                                ) : (
                                    <div className="upload-prompt">
                                        <p className="main-text">Drag and drop your file here</p>
                                        <p className="sub-text">or click to browse from your computer</p>
                                        <p className="supported-formats">Supported formats: .xlsx, .xls</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {uploadMutation.isError && (
                            <div className="error-message">
                                <AlertCircle size={18} />
                                <span>Upload failed. Please check your file format and try again.</span>
                            </div>
                        )}

                        <div className="upload-actions">
                            <button
                                className="btn-cancel"
                                onClick={handleReset}
                                disabled={uploadMutation.isPending}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-upload"
                                onClick={handleUpload}
                                disabled={!file || uploadMutation.isPending}
                            >
                                {uploadMutation.isPending ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        <span>Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} />
                                        <span>Import Contacts</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="success-state">
                        <div className="success-icon">
                            <Check size={32} />
                        </div>
                        <h2>Import Complete!</h2>
                        <div className="upload-stats">
                            <div className="stat-row">
                                <span>Total rows:</span>
                                <strong>{uploadResult.total_rows}</strong>
                            </div>
                            <div className="stat-row success">
                                <span>Inserted:</span>
                                <strong>{uploadResult.inserted}</strong>
                            </div>
                            {uploadResult.skipped_duplicates > 0 && (
                                <div className="stat-row warning">
                                    <span>Skipped (duplicates):</span>
                                    <strong>{uploadResult.skipped_duplicates}</strong>
                                </div>
                            )}
                            {uploadResult.invalid_emails > 0 && (
                                <div className="stat-row error">
                                    <span>Invalid emails:</span>
                                    <strong>{uploadResult.invalid_emails}</strong>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleReset}
                            className="btn-new-upload"
                        >
                            Upload Another File
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContactUpload;
