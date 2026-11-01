import React from 'react';

export function PageLoader() {
  return (
    <div
      style={{
        minHeight: '80vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
      aria-label="Loading page content"
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: '3px solid rgba(255, 255, 255, 0.1)',
          borderTopColor: '#e50914',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}

