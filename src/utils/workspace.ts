const WORKSPACE_KEY = 'healthcare_workspace_id';

export function generateWorkspaceId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function getWorkspaceId(): string {
  const urlParams = new URLSearchParams(window.location.search);
  const urlWorkspaceId = urlParams.get('workspace');

  if (urlWorkspaceId) {
    localStorage.setItem(WORKSPACE_KEY, urlWorkspaceId);
    return urlWorkspaceId;
  }

  const storedWorkspaceId = localStorage.getItem(WORKSPACE_KEY);

  if (storedWorkspaceId) {
    return storedWorkspaceId;
  }

  const newWorkspaceId = generateWorkspaceId();
  localStorage.setItem(WORKSPACE_KEY, newWorkspaceId);
  return newWorkspaceId;
}

export function setWorkspaceId(workspaceId: string): void {
  localStorage.setItem(WORKSPACE_KEY, workspaceId);
}

export function getShareableLink(): string {
  const workspaceId = getWorkspaceId();
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?workspace=${workspaceId}`;
}

export function createNewWorkspace(): string {
  const newWorkspaceId = generateWorkspaceId();
  localStorage.setItem(WORKSPACE_KEY, newWorkspaceId);
  window.history.pushState({}, '', `?workspace=${newWorkspaceId}`);
  return newWorkspaceId;
}
