import { useState, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { GlobalFilters } from './components/GlobalFilters';
import { CSVUploader } from './components/CSVUploader';
import { ExecutiveOverview } from './components/dashboards/ExecutiveOverview';
import { AdmissionTrends } from './components/dashboards/AdmissionTrends';
import { DepartmentOverview } from './components/dashboards/DepartmentOverview';
import { PatientFlowAnalytics } from './components/dashboards/PatientFlowAnalytics';
import BottleneckIntelligence from './components/dashboards/BottleneckIntelligence';
import SimulationEngine from './components/dashboards/SimulationEngine';
import OptimizationInsights from './components/dashboards/OptimizationInsights';
import { StrategicRiskOutlook } from './components/dashboards/StrategicRiskOutlook';
import ExecutiveReport from './components/dashboards/ExecutiveReport';
import AlertsPanel from './components/AlertsPanel';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { ProfilePage } from './components/ProfilePage';
import { AccessDenied } from './components/AccessDenied';
import { useAuth } from './contexts/AuthContext';
import { getDepartments, getDataCounts, clearAllData } from './services/dataService';
import { getWorkspaceId } from './utils/workspace';
import type { GlobalFilters as FilterType } from './types';

type TabType = 'overview' | 'trends' | 'departments' | 'flow' | 'bottlenecks' | 'simulation' | 'optimization' | 'strategic' | 'report' | 'upload' | 'profile';

function App() {
  const { user, profile, loading } = useAuth();
  const [showSignup, setShowSignup] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [filters, setFilters] = useState<FilterType>({
    dateRange: null,
    department: null,
    severity: null,
    readmissionsOnly: false,
  });
  const [departments, setDepartments] = useState<string[]>([]);
  const [dataCounts, setDataCounts] = useState({
    patients: 0,
    departments: 0,
    flowLogs: 0,
    doctors: 0,
    readmissions: 0,
  });
  const [lastActivity, setLastActivity] = useState(Date.now());

  const getDefaultTab = (role: string): TabType => {
    const roleDefaultTabs = {
      admin: 'overview' as TabType,
      analyst: 'overview' as TabType,
      doctor: 'flow' as TabType,
      operations: 'trends' as TabType,
    };
    return roleDefaultTabs[role as keyof typeof roleDefaultTabs] || 'trends';
  };

  const loadData = useCallback(async () => {
    try {
      const [depts, counts] = await Promise.all([getDepartments(), getDataCounts()]);
      setDepartments(depts.map((d) => d.name));
      setDataCounts(counts);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      const urlParams = new URLSearchParams(window.location.search);
      if (!urlParams.has('workspace')) {
        const workspaceId = getWorkspaceId();
        const newUrl = `${window.location.pathname}?workspace=${workspaceId}`;
        window.history.replaceState({}, '', newUrl);
      }
      loadData();
    }
  }, [loadData, user]);

  useEffect(() => {
    if (profile) {
      const defaultTab = getDefaultTab(profile.role);
      setActiveTab(defaultTab);
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    const interval = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      const thirtyMinutes = 30 * 60 * 1000;

      if (inactiveTime > thirtyMinutes) {
        alert('You have been logged out due to inactivity.');
        window.location.reload();
      }
    }, 60000);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(interval);
    };
  }, [user, lastActivity]);

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      try {
        await clearAllData();
        await loadData();
        setFilters({ dateRange: null, department: null, severity: null, readmissionsOnly: false });
      } catch (error) {
        console.error('Failed to clear data:', error);
      }
    }
  };

  const handleUploadComplete = () => {
    loadData();
  };

  const handleResetFilters = () => {
    setFilters({ dateRange: null, department: null, severity: null, readmissionsOnly: false });
  };

  const totalRecords = Object.values(dataCounts).reduce((a, b) => a + b, 0);

  const hasAccess = (tab: TabType): boolean => {
    if (!profile) return false;

    const rolePermissions = {
      admin: ['overview', 'trends', 'departments', 'flow', 'bottlenecks', 'simulation', 'optimization', 'strategic', 'report', 'upload', 'profile'],
      analyst: ['overview', 'trends', 'departments', 'flow', 'bottlenecks', 'simulation', 'optimization', 'strategic', 'report', 'upload', 'profile'],
      doctor: ['flow', 'bottlenecks', 'profile'],
      operations: ['trends', 'departments', 'profile'],
    };

    return rolePermissions[profile.role]?.includes(tab) || false;
  };

  const renderContent = () => {
    if (activeTab === 'profile') {
      return <ProfilePage />;
    }

    if (!hasAccess(activeTab)) {
      return <AccessDenied />;
    }

    if (activeTab === 'upload') {
      return <CSVUploader onUploadComplete={handleUploadComplete} />;
    }

    if (totalRecords === 0) {
      return (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Upload your hospital datasets to view analytics dashboards. Start by uploading patient records, department resources, and other data files.
          </p>
          {hasAccess('upload') && (
            <button
              onClick={() => setActiveTab('upload')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Go to Data Upload
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {activeTab !== 'report' && activeTab !== 'strategic' && (
          <>
            <GlobalFilters filters={filters} departments={departments} onFilterChange={setFilters} />
            <AlertsPanel filters={filters} limit={3} />
          </>
        )}

        {activeTab === 'overview' && <ExecutiveOverview filters={filters} />}
        {activeTab === 'trends' && <AdmissionTrends filters={filters} />}
        {activeTab === 'departments' && <DepartmentOverview filters={filters} />}
        {activeTab === 'flow' && <PatientFlowAnalytics filters={filters} />}
        {activeTab === 'bottlenecks' && <BottleneckIntelligence filters={filters} />}
        {activeTab === 'simulation' && <SimulationEngine filters={filters} />}
        {activeTab === 'optimization' && <OptimizationInsights filters={filters} />}
        {activeTab === 'strategic' && <StrategicRiskOutlook />}
        {activeTab === 'report' && <ExecutiveReport filters={filters} />}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return showSignup ? (
      <SignupPage onSwitchToLogin={() => setShowSignup(false)} />
    ) : (
      <LoginPage onSwitchToSignup={() => setShowSignup(true)} />
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      dataCounts={dataCounts}
      onClearData={handleClearData}
      onResetFilters={handleResetFilters}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;
