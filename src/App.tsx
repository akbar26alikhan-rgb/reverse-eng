import React, { useState, useEffect, useCallback } from 'react';
import { TopNav, type ActiveTab } from './components/TopNav.tsx';
import { InvestigatorView } from './components/InvestigatorView.tsx';
import { InspectorView } from './components/InspectorView.tsx';
import { SetupView } from './components/SetupView.tsx';
import { HistoryView } from './components/HistoryView.tsx';
import { McpView } from './components/McpView.tsx';
import type { TargetMetadata, FeatureInvestigation, SafeSetupStatus } from './types.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('investigator');
  const [targets, setTargets] = useState<TargetMetadata[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<TargetMetadata | null>(null);
  const [investigation, setInvestigation] = useState<FeatureInvestigation | null>(null);
  const [inspectionDetail, setInspectionDetail] = useState<any | null>(null);
  const [setupStatus, setSetupStatus] = useState<SafeSetupStatus | null>(null);
  const [history, setHistory] = useState<FeatureInvestigation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load Initial Targets, Setup Status, and History
  const loadInitialData = useCallback(async () => {
    try {
      const [targetsRes, statusRes, historyRes] = await Promise.all([
        fetch('/api/targets').then(r => r.json()),
        fetch('/api/setup/status').then(r => r.json()),
        fetch('/api/history').then(r => r.json()),
      ]);

      if (targetsRes.targets && targetsRes.targets.length > 0) {
        setTargets(targetsRes.targets);
        setSelectedTarget(targetsRes.targets[0]);
      }
      if (statusRes) setSetupStatus(statusRes);
      if (historyRes.history) {
        setHistory(historyRes.history);
        if (historyRes.history.length > 0) {
          setInvestigation(historyRes.history[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load Inspection Details when selected target changes
  const loadInspectionForTarget = useCallback(async (target: TargetMetadata) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: target.path }),
      });
      const data = await res.json();
      setInspectionDetail(data);
    } catch (err) {
      console.error('Inspection failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTarget) {
      loadInspectionForTarget(selectedTarget);
    }
  }, [selectedTarget, loadInspectionForTarget]);

  // Trigger Feature Investigation
  const handleRunInvestigation = async (targetPath: string, question: string) => {
    setIsLoading(true);
    setStatusMessage('Reverse engineering architecture & synthesizing evidence...');
    try {
      const res = await fetch('/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath, question }),
      });
      const data: FeatureInvestigation = await res.json();
      setInvestigation(data);
      // Prepend to history
      setHistory(prev => [data, ...prev.filter(p => p.id !== data.id)]);
      setActiveTab('investigator');
    } catch (err: any) {
      alert(`Investigation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  // Safe Setup Execution
  const handleExecuteSetup = async (permissions: {
    createWorkspaceDir: boolean;
    initializeHistoryDb: boolean;
    generateMcpConfigs: boolean;
    seedSampleTargets: boolean;
  }) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/setup/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissions),
      });
      const data = await res.json();
      // Reload status and targets
      const updatedStatus = await fetch('/api/setup/status').then(r => r.json());
      setSetupStatus(updatedStatus);
      const updatedTargets = await fetch('/api/targets').then(r => r.json());
      if (updatedTargets.targets) setTargets(updatedTargets.targets);
    } catch (err: any) {
      alert(`Setup execution failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Rerun diagnostics
  const handleRerunSetup = async () => {
    setIsLoading(true);
    try {
      const updatedStatus = await fetch('/api/setup/status').then(r => r.json());
      setSetupStatus(updatedStatus);
    } catch (err: any) {
      console.error('Rerun failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear history
  const handleClearHistory = async () => {
    if (confirm('Clear all recorded investigation history?')) {
      await fetch('/api/history', { method: 'DELETE' });
      setHistory([]);
      setInvestigation(null);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0c0f17] text-slate-100 antialiased overflow-hidden select-text">
      {/* Top Bar Navigation */}
      <TopNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isSafeMode={setupStatus?.safeModeEnabled ?? true}
        historyCount={history.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        {statusMessage && (
          <div className="bg-emerald-950/70 border-b border-emerald-500/30 px-6 py-2 text-xs font-mono text-emerald-300 flex items-center justify-between z-20">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {statusMessage}
            </span>
            <span className="text-slate-400">Processing on local machine</span>
          </div>
        )}

        {activeTab === 'investigator' && (
          <InvestigatorView
            targets={targets}
            selectedTarget={selectedTarget}
            onSelectTarget={t => {
              setSelectedTarget(t);
              setInvestigation(null);
            }}
            investigation={investigation}
            isLoading={isLoading}
            onRunInvestigation={handleRunInvestigation}
          />
        )}

        {activeTab === 'inspector' && (
          <InspectorView
            selectedTarget={selectedTarget}
            inspectionDetail={inspectionDetail}
            isLoading={isLoading}
            onRefreshInspection={() => selectedTarget && loadInspectionForTarget(selectedTarget)}
          />
        )}

        {activeTab === 'setup' && (
          <SetupView
            status={setupStatus}
            isLoading={isLoading}
            onRerunSetup={handleRerunSetup}
            onExecuteSetup={handleExecuteSetup}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            history={history}
            onSelectInvestigation={inv => {
              setInvestigation(inv);
              const target = targets.find(t => t.name === inv.targetName);
              if (target) setSelectedTarget(target);
              setActiveTab('investigator');
            }}
            onClearHistory={handleClearHistory}
          />
        )}

        {activeTab === 'mcp' && <McpView />}
      </main>
    </div>
  );
}
