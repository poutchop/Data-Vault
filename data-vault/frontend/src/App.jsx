import { useState } from 'react';
import Topbar            from './components/Topbar';
import MetricCards       from './components/MetricCards';
import HardeningFeed     from './components/HardeningFeed';
import VerifierPanel     from './components/VerifierPanel';
import ClimateAnalytics  from './components/ClimateAnalytics';
import CommunityLeaderboard from './components/CommunityLeaderboard';
import ProvostPortal     from './components/ProvostPortal';
import Gatekeeper        from './components/Gatekeeper';

const TABS = [
  { id: 'feed',        label: 'Hardening feed'   },
  { id: 'analytics',   label: 'Climate analytics' },
  { id: 'leaderboard', label: 'Leaderboard'       },
  { id: 'provost',     label: 'Main Portal'       },
];

export default function App() {
  const [tab,      setTab]      = useState('feed');
  const [darkMode, setDarkMode] = useState(true);

  const toggleDark = () => {
    setDarkMode(d => !d);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <Gatekeeper>
      {(isAdmin, openGate) => {
        // Filter tabs: hide 'provost' (Main Portal) if not admin
        const availableTabs = TABS.filter(t => isAdmin || t.id !== 'provost');

        return (
          <div className={darkMode ? 'dark' : ''}>
            <div className="min-h-screen bg-vault-bg text-vault-text font-sans">
              <Topbar darkMode={darkMode} onToggleDark={toggleDark} isAdmin={isAdmin} onOpenGate={openGate} />

              {/* Tab bar */}
              <div className="bg-vault-surface border-b border-white/[0.08] px-6 flex gap-1 overflow-x-auto">
                {availableTabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`tab ${tab === t.id ? 'active' : ''}`}
                  >
                    {t.label}
                  </button>
                ))}
                {!isAdmin && (
                  <button
                    onClick={openGate}
                    className="ml-auto flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium text-vault-amber hover:text-vault-amber/80 transition-colors"
                  >
                    <Lock size={12} />
                    Unlock Admin Portal
                  </button>
                )}
              </div>

              {/* Page body */}
              <main className="p-4 lg:p-6 flex flex-col gap-5 max-w-[1600px] mx-auto">

                {/* Metric cards — always visible, but masked if not admin */}
                <MetricCards isAdmin={isAdmin} onOpenGate={openGate} />

                {/* Hardening Feed tab */}
                {tab === 'feed' && (
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
                    <HardeningFeed />
                    <VerifierPanel />
                  </div>
                )}

                {/* Climate Analytics tab */}
                {tab === 'analytics' && <ClimateAnalytics isAdmin={isAdmin} />}

                {/* Community Leaderboard tab */}
                {tab === 'leaderboard' && <CommunityLeaderboard isAdmin={isAdmin} />}

                {/* Provost Portal tab — only if admin */}
                {tab === 'provost' && isAdmin && <ProvostPortal />}

              </main>

              {/* Footer */}
              <footer className="px-6 py-4 border-t border-white/[0.06] text-[11px] text-vault-muted text-center">
                Carbon Clarity Data Vault · dMRV Platform · Ashesi University Pilot · v3.0.0
              </footer>
            </div>
          </div>
        );
      }}
    </Gatekeeper>
  );
}
