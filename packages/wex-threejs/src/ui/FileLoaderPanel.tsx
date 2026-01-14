import React, { useState, useRef, useCallback } from 'react';
import { IconFolder, IconFile, IconLink, IconClose, IconDownload, IconAlert } from './Icons';
import './file-loader-panel.css';

export interface DemoModel {
  name: string;
  path: string;
}

export interface FileLoaderPanelProps {
  isVisible?: boolean;
  allowClose?: boolean;
  allowUrlLoading?: boolean;
  demoModels?: DemoModel[];
  onFileLoaded?: (data: ArrayBuffer, fileName: string, fileSize: number) => void;
  onUrlLoaded?: (url: string) => void;
  onClose?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

/**
 * FileLoaderPanel - Panel for loading wexBIM files from local or URL
 * Similar to Xbim.WexBlazor's FileLoaderPanel
 */
export const FileLoaderPanel: React.FC<FileLoaderPanelProps> = ({
  isVisible = true,
  allowClose = true,
  allowUrlLoading = true,
  demoModels = [],
  onFileLoaded,
  onUrlLoaded,
  onClose,
  onError,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<'local' | 'url'>('local');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string } | null>(null);
  const [modelUrl, setModelUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    let len = bytes;
    let order = 0;
    while (len >= 1024 && order < sizes.length - 1) {
      order++;
      len = len / 1024;
    }
    return `${len.toFixed(2)} ${sizes[order]}`;
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.name.endsWith('.wexbim')) {
      setErrorMessage('Please select a .wexbim file');
      onError?.('Please select a .wexbim file');
      return;
    }

    setSelectedFile({ name: file.name, size: formatFileSize(file.size) });
    setErrorMessage(null);
    setIsLoading(true);
    setProgress(0);

    try {
      const reader = new FileReader();
      
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        onFileLoaded?.(arrayBuffer, file.name, file.size);
        setIsLoading(false);
        setProgress(100);
      };

      reader.onerror = () => {
        setErrorMessage('Error reading file');
        onError?.('Error reading file');
        setIsLoading(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(message);
      onError?.(message);
      setIsLoading(false);
    }
  }, [onFileLoaded, onError]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUrlLoad = async () => {
    if (!modelUrl.trim()) return;

    setErrorMessage(null);

    try {
      // Validate URL
      new URL(modelUrl);
      
      setIsLoading(true);
      onUrlLoaded?.(modelUrl);
      setIsLoading(false);
    } catch (err) {
      const message = 'Invalid URL format';
      setErrorMessage(message);
      onError?.(message);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`wex-file-loader-panel ${className || ''}`}>
      {/* Header */}
      <div className="wex-file-loader-header">
        <h3>
          <IconFolder size={16} />
          <span>Load Model</span>
        </h3>
        {allowClose && (
          <button className="wex-close-btn" onClick={onClose} aria-label="Close">
            <IconClose size={14} />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="wex-file-loader-tabs">
        <button
          className={`wex-tab ${activeTab === 'local' ? 'active' : ''}`}
          onClick={() => setActiveTab('local')}
        >
          <IconFile size={14} /> Local File
        </button>
        {allowUrlLoading && (
          <button
            className={`wex-tab ${activeTab === 'url' ? 'active' : ''}`}
            onClick={() => setActiveTab('url')}
          >
            <IconLink size={14} /> From URL
          </button>
        )}
      </div>

      {/* Content */}
      <div className="wex-file-loader-content">
        {activeTab === 'local' && (
          <div className="wex-tab-content">
            <input
              ref={fileInputRef}
              type="file"
              accept=".wexbim"
              onChange={handleInputChange}
              style={{ display: 'none' }}
              disabled={isLoading}
            />
            
            <div
              className={`wex-dropzone ${isDragOver ? 'drag-over' : ''} ${isLoading ? 'loading' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="wex-dropzone-icon">
                <IconFolder size={32} />
              </div>
              <div className="wex-dropzone-text">
                Drag & drop a .wexbim file here
              </div>
              <div className="wex-dropzone-or">or</div>
              <button className="wex-browse-btn" disabled={isLoading}>
                Browse Files
              </button>
            </div>

            {selectedFile && (
              <div className="wex-selected-file">
                <IconFile size={16} />
                <span className="wex-file-name">{selectedFile.name}</span>
                <span className="wex-file-size">{selectedFile.size}</span>
              </div>
            )}

            {/* Demo Models */}
            {demoModels.length > 0 && (
              <div className="wex-demo-models">
                <div className="wex-demo-label">Or try a demo model:</div>
                <div className="wex-demo-buttons">
                  {demoModels.map((model) => (
                    <button
                      key={model.path}
                      className="wex-demo-btn"
                      onClick={() => onUrlLoaded?.(model.path)}
                      disabled={isLoading}
                    >
                      {model.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'url' && (
          <div className="wex-tab-content">
            <label className="wex-label">Model URL</label>
            <input
              type="url"
              className="wex-input"
              value={modelUrl}
              onChange={(e) => setModelUrl(e.target.value)}
              placeholder="https://example.com/model.wexbim"
              disabled={isLoading}
            />
            <p className="wex-hint">Enter the full URL to a wexBIM file</p>
            
            <button
              className="wex-load-btn"
              onClick={handleUrlLoad}
              disabled={isLoading || !modelUrl.trim()}
            >
              <IconDownload size={14} /> Load from URL
            </button>
          </div>
        )}

        {/* Loading Progress */}
        {isLoading && (
          <div className="wex-loading">
            <div className="wex-spinner" />
            <span>Loading model...</span>
            {progress > 0 && (
              <div className="wex-progress">
                <div className="wex-progress-bar" style={{ width: `${progress}%` }} />
                <span className="wex-progress-text">{progress}%</span>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="wex-error">
            <IconAlert size={16} />
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileLoaderPanel;
