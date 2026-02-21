import { useState, useRef, useCallback, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { ChevronDown, Eye, Variable, Bold, Italic, Underline, Strikethrough, Link, Image, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Type, Palette } from 'lucide-react';
import '../styles/EmailEditor.css';

interface EmailEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const AVAILABLE_VARIABLES = [
  { label: 'First Name', value: '{{FirstName}}' },
  { label: 'Company', value: '{{Company}}' },
  { label: 'Title', value: '{{Title}}' },
  { label: 'Email', value: '{{Email}}' },
];

const FONT_SIZES = [
  { label: 'Small', value: '2' },
  { label: 'Normal', value: '3' },
  { label: 'Large', value: '5' },
  { label: 'Huge', value: '7' },
];

export const EmailEditor = ({ 
  value, 
  onChange, 
  placeholder = 'Write your email here...',
  minHeight = '250px'
}: EmailEditorProps) => {
  const [showVariableDropdown, setShowVariableDropdown] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Initialize editor content once
  useEffect(() => {
    if (editorRef.current && !initializedRef.current) {
      editorRef.current.innerHTML = value || `<p>${placeholder}</p>`;
      initializedRef.current = true;
    }
  }, [placeholder, value]);

  // Update content when value prop changes (but not during editing)
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || `<p>${placeholder}</p>`;
    }
  }, [value, placeholder]);

  // Handle content changes
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      onChange(content);
      updateActiveFormats();
    }
  }, [onChange]);

  // Update active format states
  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    try {
      if (document.queryCommandState('bold')) formats.add('bold');
      if (document.queryCommandState('italic')) formats.add('italic');
      if (document.queryCommandState('underline')) formats.add('underline');
      if (document.queryCommandState('strikeThrough')) formats.add('strikeThrough');
      if (document.queryCommandState('insertUnorderedList')) formats.add('insertUnorderedList');
      if (document.queryCommandState('insertOrderedList')) formats.add('insertOrderedList');
    } catch (e) {
      // Ignore errors
    }
    setActiveFormats(formats);
  }, []);

  // Execute formatting command
  const execCommand = useCallback((command: string, value: string = '') => {
    document.execCommand(command, false, value);
    handleInput();
    editorRef.current?.focus();
  }, [handleInput]);

  // Insert variable at cursor position
  const insertVariable = useCallback((variable: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textNode = document.createTextNode(variable);
      range.deleteContents();
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      handleInput();
    }
    setShowVariableDropdown(false);
    editorRef.current?.focus();
  }, [handleInput]);

  // Insert link
  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  }, [execCommand]);

  // Insert image
  const insertImage = useCallback(() => {
    const url = prompt('Enter image URL:');
    if (url) {
      execCommand('insertImage', url);
    }
  }, [execCommand]);

  // Sanitize HTML for preview
  const getSanitizedHtml = useCallback(() => {
    return DOMPurify.sanitize(value, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
        'span', 'div', 'a', 'img', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'font', 'center', 'blockquote', 'pre'
      ],
      ALLOWED_ATTR: [
        'style', 'class', 'href', 'target', 'rel',
        'src', 'alt', 'width', 'height',
        'color', 'size', 'face', 'align'
      ],
    });
  }, [value]);

  // Toolbar button component
  const ToolbarButton = ({ 
    onClick, 
    active = false, 
    children, 
    title 
  }: { 
    onClick: () => void; 
    active?: boolean; 
    children: React.ReactNode; 
    title: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: '6px 8px',
        backgroundColor: active ? '#e5e7eb' : 'transparent',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        color: active ? '#111827' : '#4b5563',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = '#f3f4f6';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </button>
  );

  return (
    <div className="email-editor-container">
      {/* Main Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        padding: '8px 12px',
        backgroundColor: '#f8f9fa',
        border: '1px solid #e5e7eb',
        borderBottom: 'none',
        borderRadius: '8px 8px 0 0',
        alignItems: 'center',
      }}>
        {/* Text Style */}
        <ToolbarButton onClick={() => execCommand('bold')} active={activeFormats.has('bold')} title="Bold">
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('italic')} active={activeFormats.has('italic')} title="Italic">
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('underline')} active={activeFormats.has('underline')} title="Underline">
          <Underline size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('strikeThrough')} active={activeFormats.has('strikeThrough')} title="Strikethrough">
          <Strikethrough size={16} />
        </ToolbarButton>

        <div style={{ width: '1px', height: '20px', backgroundColor: '#e5e7eb', margin: '0 4px' }} />

        {/* Font Size Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              color: '#4b5563',
              fontSize: '14px',
            }}
          >
            <Type size={16} />
            <ChevronDown size={14} />
          </button>
          {showFontSizeDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 50,
              minWidth: '120px',
            }}>
              {FONT_SIZES.map((size) => (
                <button
                  key={size.value}
                  onClick={() => {
                    execCommand('fontSize', size.value);
                    setShowFontSizeDropdown(false);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: size.value === '2' ? '12px' : size.value === '3' ? '14px' : size.value === '5' ? '18px' : '24px',
                    color: '#374151',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {size.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: '#e5e7eb', margin: '0 4px' }} />

        {/* Alignment */}
        <ToolbarButton onClick={() => execCommand('justifyLeft')} title="Align Left">
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyCenter')} title="Align Center">
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyRight')} title="Align Right">
          <AlignRight size={16} />
        </ToolbarButton>

        <div style={{ width: '1px', height: '20px', backgroundColor: '#e5e7eb', margin: '0 4px' }} />

        {/* Lists */}
        <ToolbarButton onClick={() => execCommand('insertUnorderedList')} active={activeFormats.has('insertUnorderedList')} title="Bullet List">
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('insertOrderedList')} active={activeFormats.has('insertOrderedList')} title="Numbered List">
          <ListOrdered size={16} />
        </ToolbarButton>

        <div style={{ width: '1px', height: '20px', backgroundColor: '#e5e7eb', margin: '0 4px' }} />

        {/* Insert */}
        <ToolbarButton onClick={insertLink} title="Insert Link">
          <Link size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={insertImage} title="Insert Image">
          <Image size={16} />
        </ToolbarButton>

        <div style={{ flex: 1 }} />

        {/* Variable Insert Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowVariableDropdown(!showVariableDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#374151',
              cursor: 'pointer',
            }}
          >
            <Variable size={16} />
            Insert Variable
            <ChevronDown size={14} />
          </button>
          
          {showVariableDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 50,
              minWidth: '180px',
            }}>
              {AVAILABLE_VARIABLES.map((variable) => (
                <button
                  key={variable.value}
                  onClick={() => insertVariable(variable.value)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: '#374151',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {variable.label}
                  <span style={{ 
                    display: 'block', 
                    fontSize: '0.75rem', 
                    color: '#6b7280',
                    marginTop: '2px'
                  }}>
                    {variable.value}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preview Button */}
        <button
          onClick={() => setShowPreview(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: '#fff',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.875rem',
            color: '#374151',
            cursor: 'pointer',
          }}
        >
          <Eye size={16} />
          Preview
        </button>
      </div>

      {/* Content Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        style={{
          minHeight: minHeight,
          padding: '16px',
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '14px',
          lineHeight: '1.6',
          outline: 'none',
        }}
        onFocus={(e) => {
          if (e.currentTarget.innerHTML === `<p>${placeholder}</p>`) {
            e.currentTarget.innerHTML = '<p><br></p>';
          }
        }}
        onBlur={(e) => {
          if (e.currentTarget.innerText.trim() === '') {
            e.currentTarget.innerHTML = `<p>${placeholder}</p>`;
          }
        }}
      />

      {/* Preview Modal */}
      {showPreview && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowPreview(false)}
        >
          <div 
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '700px',
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
            }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
                Email Preview
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6b7280',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body - Iframe Preview */}
            <div style={{ padding: '20px', backgroundColor: '#f3f4f6' }}>
              <div style={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}>
                <iframe
                  srcDoc={`
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                          body {
                            font-family: Arial, Helvetica, sans-serif;
                            font-size: 14px;
                            line-height: 1.6;
                            color: #333;
                            padding: 20px;
                            margin: 0;
                          }
                          a { color: #2563eb; }
                          img { max-width: 100%; height: auto; }
                        </style>
                      </head>
                      <body>
                        ${getSanitizedHtml()}
                      </body>
                    </html>
                  `}
                  style={{
                    width: '100%',
                    height: '400px',
                    border: 'none',
                  }}
                  title="Email Preview"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: '16px 20px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
            }}>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#374151',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailEditor;
