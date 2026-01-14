import React from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  progress?: number;
  message?: string;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    pointerEvents: 'none',
  },
  content: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    color: 'white',
    padding: '30px 50px',
    borderRadius: '12px',
    textAlign: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.2)',
    borderTopColor: '#4CAF50',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  message: {
    margin: '0 0 15px 0',
    fontSize: '16px',
  },
  progressBar: {
    width: '200px',
    height: '6px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    transition: 'width 0.3s ease',
  },
  progressText: {
    marginTop: '10px',
    fontSize: '14px',
    color: '#aaa',
  },
};

// Add keyframes for spinner animation
const spinnerKeyframes = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

/**
 * Loading overlay with progress bar
 */
export function LoadingOverlay({ 
  isLoading, 
  progress = 0, 
  message = 'Loading...' 
}: LoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <>
      <style>{spinnerKeyframes}</style>
      <div style={styles.overlay}>
        <div style={styles.content}>
          <div style={styles.spinner} />
          <p style={styles.message}>{message}</p>
          <div style={styles.progressBar}>
            <div 
              style={{ 
                ...styles.progressFill, 
                width: `${Math.min(100, Math.max(0, progress))}%` 
              }} 
            />
          </div>
          <p style={styles.progressText}>{progress.toFixed(0)}%</p>
        </div>
      </div>
    </>
  );
}

export default LoadingOverlay;
