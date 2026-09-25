import { useState } from 'react';
import { androidProjectFiles, AndroidProjectFile } from '../data/androidProjectFiles';
import { FileCode, Clipboard, Check, Terminal, FolderOpen, Heart, Search } from 'lucide-react';

export default function AndroidFilesViewer() {
  const [selectedFile, setSelectedFile] = useState<AndroidProjectFile>(androidProjectFiles[0]);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredFiles = androidProjectFiles.filter(f => 
    f.path.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[650px] font-sans">
      {/* IDE Top Bar */}
      <div className="bg-slate-950 border-b border-slate-800 p-3 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
            <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
          </div>
          <div className="h-4 w-px bg-slate-800 mx-1"></div>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-mono font-medium text-slate-300">The_Commissary_Android_Studio_Project</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono bg-amber-500/10 text-amber-500 font-bold px-2 py-1 rounded border border-amber-500/20 uppercase tracking-wider">
            Android Studio Ready
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Directory Explorer Panel */}
        <div className="w-72 bg-slate-950/70 border-r border-slate-800 flex flex-col">
          <div className="p-3 border-b border-slate-800/80">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search Kotlin files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded text-slate-300 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono transition"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 px-3 py-1 mt-1">
              Project Files Tree
            </div>
            {filteredFiles.map((file) => {
              const isActive = file.path === selectedFile.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-start gap-2.5 transition font-mono text-xs ${
                    isActive 
                      ? 'bg-amber-500/15 border-l-2 border-amber-500 text-slate-100 font-medium' 
                      : 'hover:bg-slate-900/40 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <FileCode className={`w-4 h-4 shrink-0 transition ${isActive ? 'text-amber-500' : 'text-slate-500'}`} />
                  <div className="overflow-hidden text-ellipsis">
                    <p className="font-semibold">{file.path.split('/').pop()}</p>
                    <p className="text-[9px] text-slate-500 leading-tight mt-0.5 max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">
                      {file.path}
                    </p>
                  </div>
                </button>
              );
            })}
            {filteredFiles.length === 0 && (
              <div className="text-center py-6 text-slate-600 text-[11px] font-mono">
                No files found
              </div>
            )}
          </div>

          {/* Quick Notice footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/90 text-[10px] text-slate-500 font-mono leading-relaxed space-y-1">
            <p className="flex items-center gap-1.5 font-bold text-slate-400">
              <Terminal className="w-3.5 h-3.5 text-amber-500" /> System Guide
            </p>
            <p>Paste directly into Android Studio under com.thecommissary.app. Min SDK is 26, powered by Jetpack Compose & Firebase.</p>
          </div>
        </div>

        {/* Code Viewer Panel */}
        <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
          {/* Active File Header */}
          <div className="bg-slate-900/90 border-b border-slate-800/80 p-3 px-4 flex items-center justify-between shrink-0">
            <div>
              <p className="text-xs font-mono font-bold text-slate-200">{selectedFile.path}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{selectedFile.description}</p>
            </div>
            
            <button
              onClick={copyToClipboard}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg active:scale-95 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Code Area */}
          <div className="flex-w overflow-auto flex-1 p-4 font-mono text-xs text-slate-300 leading-relaxed bg-[#0b0f19]">
            <pre className="whitespace-pre overflow-x-auto selection:bg-amber-500/30 selection:text-slate-100">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
