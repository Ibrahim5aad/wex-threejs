import React from 'react';
import type { LoadedModel } from '../types';

interface ModelInfoPanelProps {
  model: LoadedModel | null;
  className?: string;
  style?: React.CSSProperties;
}

const defaultStyles: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '15px',
    borderRadius: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    minWidth: '250px',
  },
  title: {
    margin: '0 0 15px 0',
    color: '#4CAF50',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    margin: '8px 0',
    padding: '5px 0',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  label: {
    color: '#aaa',
  },
  value: {
    color: '#fff',
    fontFamily: 'monospace',
  },
  noModel: {
    color: '#888',
    fontStyle: 'italic',
  },
};

function formatNumber(num: number): string {
  return num.toFixed(2);
}

/**
 * Panel displaying information about the loaded model
 */
export function ModelInfoPanel({ 
  model, 
  className = '',
  style,
}: ModelInfoPanelProps) {
  return (
    <div 
      className={`bim-model-info ${className}`}
      style={{ ...defaultStyles.panel, ...style }}
    >
      <h3 style={defaultStyles.title}>📊 Model Information</h3>
      
      {model ? (
        <>
          <div style={defaultStyles.row}>
            <span style={defaultStyles.label}>Name:</span>
            <span style={defaultStyles.value}>{model.name}</span>
          </div>
          
          <div style={defaultStyles.row}>
            <span style={defaultStyles.label}>Objects:</span>
            <span style={defaultStyles.value}>{model.scene.children.length}</span>
          </div>
          
          <div style={defaultStyles.row}>
            <span style={defaultStyles.label}>Center:</span>
            <span style={defaultStyles.value}>
              ({formatNumber(model.center.x)}, {formatNumber(model.center.y)}, {formatNumber(model.center.z)})
            </span>
          </div>
          
          <div style={defaultStyles.row}>
            <span style={defaultStyles.label}>Size:</span>
            <span style={defaultStyles.value}>
              {formatNumber(model.size.x)} × {formatNumber(model.size.y)} × {formatNumber(model.size.z)}
            </span>
          </div>
        </>
      ) : (
        <p style={defaultStyles.noModel}>No model loaded</p>
      )}
    </div>
  );
}

export default ModelInfoPanel;
