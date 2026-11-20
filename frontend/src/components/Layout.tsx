import React from 'react';
import { Outlet } from 'react-router-dom';
import GlobalNavigation from './navigation/GlobalNavigation';
import OfflineStatusBanner from './OfflineStatusBanner';

const Layout: React.FC = () => {
  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <OfflineStatusBanner />
      <GlobalNavigation>
        <main className="p-2.5 sm:p-4 lg:p-8 min-w-0 max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </GlobalNavigation>
    </div>
  );
};

export default Layout;
