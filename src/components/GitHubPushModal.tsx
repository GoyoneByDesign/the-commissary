import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Lock, 
  Key, 
  Terminal, 
  Copy, 
  Check, 
  X, 
  RefreshCw,
  FolderGit2,
  Eye,
  EyeOff
} from 'lucide-react';

interface GitHubPushModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GitStatus {
  initialized: boolean;
  branch?: string;
  commitHash?: string;
  commitMsg?: string;
  remoteUrl?: string;
  clean?: boolean;
}

export const GitHubPushModal: React.FC<GitHubPushModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'cli'>('direct');
  const [repoUrl, setRepoUrl] = useState(() => localStorage.getItem('the_commissary_github_repo') || '');
  const [token, setToken] = useState(() => localStorage.getItem('the_commissary_github_token') || '');
  const [branch, setBranch] = useState('main');
  const [force, setForce] = useState(false);
  const [commitMessage, setCommitMessage] = useState('Initial commit: The Commissary Operations Suite');
  const [showToken, setShowToken] = useState(false);

  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    repoUrl?: string;
    branch?: string;
    commitHash?: string;
    error?: string;
    hint?: string;
  } | null>(null);

  const [copiedCli, setCopiedCli] = useState(false);

  // Fetch local git status
  const fetchGitStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/github/status');
      if (res.ok) {
        const data = await res.json();
        setGitStatus(data);
      }
    } catch {
      // Ignored
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGitStatus();
      setResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setLoading(true);
    setResult(null);

    // Save for convenience
    try {
      localStorage.setItem('the_commissary_github_repo', repoUrl.trim());
      if (token.trim()) {
        localStorage.setItem('the_commissary_github_token', token.trim());
      }
    } catch {}

    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: repoUrl.trim(),
          token: token.trim() || undefined,
          branch: branch.trim() || 'main',
          force,
          commitMessage: commitMessage.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResult({
          success: true,
          message: data.message,
          repoUrl: data.repoUrl,
          branch: data.branch,
          commitHash: data.commitHash,
        });
        fetchGitStatus();
      } else {
        setResult({
          success: false,
          error: data.error || 'Failed to push to GitHub.',
          hint: data.hint,
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message || 'Network error while attempting to push.',
      });
    } finally {
      setLoading(false);
    }
  };

  const cliCode = `# 1. Extract the downloaded zip file and open terminal in folder
cd the-commissary-project

# 2. Add your GitHub remote repository
git remote add origin ${repoUrl.trim() || 'https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git'}

# 3. Rename branch to main if needed
git branch -M main

# 4. Push your codebase to GitHub
git push -u origin main`;

  const copyCliCode = () => {
    navigator.clipboard.writeText(cliCode);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display tracking-tight text-white flex items-center gap-2">
                Push Project to GitHub
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Deploy full source code & adaptive voice engine to your GitHub account
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Git Repository Live Status Bar */}
        <div className="bg-slate-900/90 text-slate-300 px-5 py-2.5 flex items-center justify-between border-b border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <GitBranch className="w-3.5 h-3.5" />
              <span>Branch: <strong>{gitStatus?.branch || 'main'}</strong></span>
            </span>
            {gitStatus?.commitHash && (
              <span className="text-slate-400">
                Commit: <strong className="text-slate-200">{gitStatus.commitHash}</strong>
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 text-[10px]">
              Ready to Push
            </span>
          </div>
          <button 
            onClick={fetchGitStatus} 
            disabled={statusLoading}
            className="text-slate-400 hover:text-white transition flex items-center gap-1 text-[11px]"
            title="Refresh Git status"
          >
            <RefreshCw className={`w-3 h-3 ${statusLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2">
          <button
            onClick={() => setActiveTab('direct')}
            className={`pb-2.5 px-3 font-semibold text-xs transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'direct'
                ? 'border-amber-600 text-amber-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Direct Push via Web (One-Click)</span>
          </button>
          <button
            onClick={() => setActiveTab('cli')}
            className={`pb-2.5 px-3 font-semibold text-xs transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'cli'
                ? 'border-amber-600 text-amber-700 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Manual CLI Commands</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'direct' ? (
            <form onSubmit={handlePush} className="space-y-4">
              {/* Repository URL Input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  GitHub Repository URL or Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/your-username/the-commissary or your-username/the-commissary"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Create an empty repository on GitHub first at{' '}
                  <a 
                    href="https://github.com/new" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-amber-600 underline font-semibold inline-flex items-center gap-0.5"
                  >
                    github.com/new <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  {' '}(do not initialize with README, license, or .gitignore).
                </p>
              </div>

              {/* Personal Access Token (PAT) Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    GitHub Personal Access Token (PAT)
                  </label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=The%20Commissary%20Export"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold underline inline-flex items-center gap-1"
                  >
                    Generate Token (with 'repo' scope) <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (GitHub Personal Access Token)"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600 inline" />
                  Token is used strictly to authenticate the git push command and is sanitized immediately.
                </p>
              </div>

              {/* Advanced Options row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="main"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Commit Message
                  </label>
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Commit message"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-sans text-slate-900"
                  />
                </div>
              </div>

              {/* Force Push Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="forcePush"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="forcePush" className="text-xs text-slate-600 cursor-pointer">
                  Force push (<code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded text-slate-700">--force</code>) &mdash; overwrite remote branch if repo was already initialized
                </label>
              </div>

              {/* Status & Results */}
              {result && (
                <div 
                  className={`p-4 rounded-xl border text-xs leading-relaxed ${
                    result.success 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                      : 'bg-red-50 border-red-300 text-red-950'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {result.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1.5 flex-1">
                      <p className="font-bold">
                        {result.success ? 'Pushed Successfully!' : 'Push Failed'}
                      </p>
                      {result.message && <p>{result.message}</p>}
                      {result.repoUrl && (
                        <a
                          href={result.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs shadow-sm transition mt-1"
                        >
                          <span>Open Repository on GitHub</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {result.error && (
                        <div className="bg-red-950/10 p-2.5 rounded-lg font-mono text-[11px] text-red-800 overflow-x-auto whitespace-pre-wrap">
                          {result.error}
                        </div>
                      )}
                      {result.hint && (
                        <p className="text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 font-medium">
                          💡 <strong>Tip:</strong> {result.hint}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !repoUrl.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold font-mono transition shadow-lg border border-slate-700"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Authenticating & Pushing...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 text-amber-400" />
                      <span>Push to GitHub Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                <p className="font-bold mb-1">Push using your local terminal</p>
                <p>
                  You can download the full project archive using the green <strong>Download ZIP</strong> button, extract it on your computer, and run these commands in your terminal:
                </p>
              </div>

              <div className="relative">
                <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                  {cliCode}
                </pre>
                <button
                  onClick={copyCliCode}
                  className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-mono rounded-lg transition border border-slate-700 shadow"
                >
                  {copiedCli ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Commands</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 bg-slate-50 border rounded-xl text-xs text-slate-700 space-y-2">
                <h4 className="font-bold text-slate-900">What's included in this repository:</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 font-mono text-[11px]">
                  <li>All React SPA components with Voice Inventory Accent Learning Engine</li>
                  <li>Complete Jetpack Compose Android Kotlin application suite</li>
                  <li>Role-Based Access Control (RBAC) & Partitioned Multi-Store DB logic</li>
                  <li>Clean package.json, server.ts, tsconfig.json, vite.config.ts, and README.md</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
