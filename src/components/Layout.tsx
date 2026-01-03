import { ReactNode, useState } from 'react';
import { Activity, LayoutDashboard, TrendingUp, Building2, Upload, Database, Trash2, GitBranch, AlertTriangle, Play, Lightbulb, FileText, Share2, Target, User as UserIcon, LogOut, ChevronDown } from 'lucide-react';
import WorkspaceManager from './WorkspaceManager';
import { useAuth } from '../contexts/AuthContext';

type TabType = 'overview' | 'trends' | 'departments' | 'flow' | 'bottlenecks' | 'simulation' | 'optimization' | 'strategic' | 'report' | 'upload' | 'profile';

interface LayoutProps {
  children: ReactNode;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  dataCounts: { patients: number; departments: number; flowLogs: number; doctors: number; readmissions: number };
  onClearData: () => void;
  onResetFilters: () => void;
}

const TABS = [
  { id: 'overview' as const, label: 'Executive Overview', icon: LayoutDashboard, roles: ['admin'] },
  { id: 'trends' as const, label: 'Admission Trends', icon: TrendingUp, roles: ['admin', 'analyst'] },
  { id: 'departments' as const, label: 'Department Overview', icon: Building2, roles: ['admin', 'analyst', 'operations', 'doctor'] },
  { id: 'flow' as const, label: 'Patient Flow', icon: GitBranch, roles: ['admin', 'doctor', 'operations'] },
  { id: 'bottlenecks' as const, label: 'Bottleneck Intelligence', icon: AlertTriangle, roles: ['admin', 'doctor', 'analyst'] },
  { id: 'simulation' as const, label: 'What-If Simulation', icon: Play, roles: ['admin', 'operations'] },
  { id: 'optimization' as const, label: 'Optimization Insights', icon: Lightbulb, roles: ['admin', 'operations'] },
  { id: 'strategic' as const, label: 'Strategic Risk Outlook', icon: Target, roles: ['admin', 'analyst'] },
  { id: 'report' as const, label: 'Executive Report', icon: FileText, roles: ['admin'] },
  { id: 'upload' as const, label: 'Data Upload', icon: Upload, roles: ['admin', 'analyst'] },
  { id: 'profile' as const, label: 'Profile', icon: UserIcon, roles: ['admin', 'doctor', 'analyst', 'operations'] },
];

export function Layout({ children, activeTab, onTabChange, dataCounts, onClearData, onResetFilters }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const totalRecords = Object.values(dataCounts).reduce((a, b) => a + b, 0);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleTabClick = (tab: TabType) => {
    if (tab !== 'upload' && tab !== activeTab) {
      onResetFilters();
    }
    onTabChange(tab);
  };

  const filteredTabs = TABS.filter(tab =>
    tab.roles.includes(profile?.role || 'analyst')
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'doctor':
        return 'bg-blue-100 text-blue-800';
      case 'analyst':
        return 'bg-green-100 text-green-800';
      case 'operations':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">FlowCure</h1>
                <p className="text-xs text-gray-500">Multi-Department Hospital Network</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <Database className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">{totalRecords.toLocaleString()} records</span>
              </div>
              <button
                onClick={() => setShowWorkspace(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
              {totalRecords > 0 && (profile?.role === 'admin' || profile?.role === 'analyst') && (
                <button
                  onClick={onClearData}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear Data</span>
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-gray-700" />
                  <span className="hidden sm:inline text-sm font-medium text-gray-700">
                    {profile?.full_name || profile?.email || 'User'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-700" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{profile?.full_name || 'User'}</p>
                      <p className="text-xs text-gray-500 mt-1">{profile?.email}</p>
                      <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(profile?.role || 'analyst')}`}>
                        {profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Analyst'}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onTabChange('profile');
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <UserIcon className="w-4 h-4" />
                      View Profile
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-1">
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span>{dataCounts.patients} patients</span>
              <span>{dataCounts.departments} departments</span>
              <span>{dataCounts.flowLogs} flow logs</span>
              <span>{dataCounts.doctors} doctors</span>
              <span>{dataCounts.readmissions} readmissions</span>
            </div>
            <span>FlowCure Dashboard</span>
          </div>
        </div>
      </footer>

      {showWorkspace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-900">Workspace Sharing</h2>
                <button
                  onClick={() => setShowWorkspace(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <WorkspaceManager />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
