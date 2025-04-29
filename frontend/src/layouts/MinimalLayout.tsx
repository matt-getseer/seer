import React from 'react';

interface MinimalLayoutProps {
  children: React.ReactNode;
}

const MinimalLayout: React.FC<MinimalLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      {children}
    </div>
  );
};

export default MinimalLayout; 