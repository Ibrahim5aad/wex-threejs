import React from 'react';
import type { ModelManagerPanelProps } from '../types';
import { IconPackage, IconEye, IconEyeOff, IconTarget, IconClose } from './Icons';
import './model-manager-panel.css';

/**
 * ModelManagerPanel - Panel for managing loaded models
 * 
 * Similar to Xbim.WexBlazor's ModelManagerPanel
 */
export const ModelManagerPanel: React.FC<ModelManagerPanelProps> = ({
  models,
  onUnload,
  onToggleVisibility,
  onZoomTo,
  className,
}) => {
  const formatSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleTimeString();
  };

  if (models.length === 0) {
    return (
      <div className={`wex-model-manager wex-model-manager-empty ${className || ''}`}>
        <div className="wex-model-manager-header">
          <h3><IconPackage size={16} /> Models</h3>
        </div>
        <div className="wex-model-manager-content">
          <p className="wex-model-manager-empty-text">No models loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`wex-model-manager ${className || ''}`}>
      <div className="wex-model-manager-header">
        <h3><IconPackage size={16} /> Models ({models.length})</h3>
      </div>
      <div className="wex-model-manager-content">
        <ul className="wex-model-list">
          {models.map((model) => (
            <li key={model.id} className={`wex-model-item ${!model.isVisible ? 'hidden' : ''}`}>
              <div className="wex-model-info">
                <span className="wex-model-name" title={model.name}>
                  {model.name}
                </span>
                <span className="wex-model-meta">
                  {formatSize(model.sizeBytes)} • {formatDate(model.loadedAt)}
                </span>
              </div>
              <div className="wex-model-actions">
                {onToggleVisibility && (
                  <button
                    className="wex-model-action-btn"
                    title={model.isVisible ? 'Hide model' : 'Show model'}
                    onClick={() => onToggleVisibility(model.id, !model.isVisible)}
                  >
                    {model.isVisible ? <IconEye size={14} /> : <IconEyeOff size={14} />}
                  </button>
                )}
                {onZoomTo && (
                  <button
                    className="wex-model-action-btn"
                    title="Zoom to model"
                    onClick={() => onZoomTo(model.id)}
                  >
                    <IconTarget size={14} />
                  </button>
                )}
                {onUnload && (
                  <button
                    className="wex-model-action-btn wex-model-action-danger"
                    title="Unload model"
                    onClick={() => onUnload(model.id)}
                  >
                    <IconClose size={14} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ModelManagerPanel;
