import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { MessageCircle } from 'lucide-react';

export default function Layout({ children, title, badge }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <TopBar title={title} badge={badge} />
        <main className="main-content">
          {children}
        </main>
      </div>
      <div className="support-bubble">
        <MessageCircle />
      </div>
    </div>
  );
}
