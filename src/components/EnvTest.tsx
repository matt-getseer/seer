import React from 'react';

const EnvTest: React.FC = () => {
  return (
    <div style={{ padding: '20px', background: '#f5f5f5', margin: '20px' }}>
      <h3>Environment Variables Test</h3>
      <pre>
        {JSON.stringify(
          {
            VITE_SITE_URL: import.meta.env.VITE_SITE_URL,
            VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
            VITE_API_URL: import.meta.env.VITE_API_URL,
            HAS_SUPABASE_KEY: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          null,
          2
        )}
      </pre>
    </div>
  );
};

export default EnvTest; 