import { useEffect } from 'react';

const usePageTitle = (pageTitle: string) => {
  useEffect(() => {
    const appName = 'CutOnce';
    document.title = `${pageTitle} | ${appName}`;

    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = appName;
    };
  }, [pageTitle]);
};

export default usePageTitle; 