import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { TopHeader } from './components/TopHeader';
import { Sidebar } from './components/Sidebar';
import { WorkspaceView } from './components/WorkspaceView';
import { ChatSimulatorView } from './components/ChatSimulatorView';
import { PersonaManager } from './components/PersonaManager';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { ContactsView } from './components/ContactsView';
import { AnalyticsLogsView } from './components/AnalyticsLogsView';
import { SettingsView } from './components/SettingsView';
import { SetupGuideView } from './components/SetupGuideView';

const MainContent: React.FC = () => {
  const { activeTab } = useApp();
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({
    messenger: true,
    [activeTab]: true
  });

  useEffect(() => {
    setVisitedTabs(prev => ({ ...prev, [activeTab]: true }));
  }, [activeTab]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden relative">
        {/* Preserved Webviews (Instant Tab Switch & Low RAM/CPU) */}
        {visitedTabs['messenger'] && (
          <div className={`w-full h-full ${activeTab === 'messenger' ? 'flex flex-1' : 'hidden'}`}>
            <WorkspaceView platform="messenger" />
          </div>
        )}
        {visitedTabs['zalo'] && (
          <div className={`w-full h-full ${activeTab === 'zalo' ? 'flex flex-1' : 'hidden'}`}>
            <WorkspaceView platform="zalo" />
          </div>
        )}
        {visitedTabs['telegram'] && (
          <div className={`w-full h-full ${activeTab === 'telegram' ? 'flex flex-1' : 'hidden'}`}>
            <WorkspaceView platform="telegram" />
          </div>
        )}

        {/* Regular Management Tabs */}
        {activeTab === 'simulator' && <ChatSimulatorView />}
        {activeTab === 'personas' && <PersonaManager />}
        {activeTab === 'knowledge' && <KnowledgeBaseView />}
        {activeTab === 'contacts' && <ContactsView />}
        {activeTab === 'logs' && <AnalyticsLogsView />}
        {activeTab === 'settings' && <SettingsView />}
        {activeTab === 'setup' && <SetupGuideView />}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-surface-950 text-slate-100">
        <TopHeader />
        <MainContent />
      </div>
    </AppProvider>
  );
};

export default App;
