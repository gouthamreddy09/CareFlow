import { useState } from 'react';
import { Share2, Copy, Check, RefreshCw } from 'lucide-react';
import { getShareableLink, createNewWorkspace, getWorkspaceId } from '../utils/workspace';

export default function WorkspaceManager() {
  const [copied, setCopied] = useState(false);
  const [workspaceId, setWorkspaceId] = useState(getWorkspaceId());

  const handleCopyLink = async () => {
    const link = getShareableLink();
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNewWorkspace = () => {
    if (confirm('Create a new workspace? This will start fresh with no data.')) {
      const newId = createNewWorkspace();
      setWorkspaceId(newId);
      window.location.reload();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-slate-600" />
          <h3 className="font-medium text-slate-900">Workspace</h3>
        </div>
        <button
          onClick={handleNewWorkspace}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Create new workspace"
        >
          <RefreshCw className="w-4 h-4" />
          New
        </button>
      </div>

      <div className="space-y-2">
        <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2">
          <p className="text-xs text-slate-500 mb-1">Workspace ID</p>
          <p className="text-sm font-mono text-slate-700 break-all">{workspaceId}</p>
        </div>

        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Shareable Link
            </>
          )}
        </button>

        <p className="text-xs text-slate-500 text-center">
          Share this link with others to give them access to this workspace
        </p>
      </div>
    </div>
  );
}
