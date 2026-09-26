import { useState, useEffect } from 'react';
import { 
  Warehouse, Glasses, Mic, BarChart3, Settings, ClipboardList, 
  MapPin, ShieldCheck, UserCheck, Search, ArrowLeft, Volume2, 
  Bell, FileDown, Lock, Mail, Users, Compass, AlertTriangle, 
  Layers, CheckCircle2, ChevronRight, User, Terminal, Camera, 
  FolderGit2, FileSpreadsheet, QrCode, Copy, Check, ExternalLink, X
} from 'lucide-react';

import { UserRole, Location, InventoryItem, InventoryForm, FormSubmission } from './types';
import { sampleUsers, defaultLocations, sampleItems, sampleForms, sampleSubmissions, auditLogsSample } from './data/sampleData';

import AndroidFilesViewer from './components/AndroidFilesViewer';
import VoiceInventoryUI from './components/VoiceInventoryUI';
import ReportViewer from './components/ReportViewer';
import AdminPanels from './components/AdminPanels';
import InventoryFormCounting from './components/InventoryFormCounting';
import AppLogo from './components/AppLogo';
import { GitHubPushModal } from './components/GitHubPushModal';
import ExcelImportModal from './components/ExcelImportModal';
import { allOfficialStoreForms, allOfficialStoreItems } from './data/storeFormsData';
import { getStoredForms } from './utils/formStorage';

export default function App() {
  // Dual-Platform Workspace view
  const [platformView, setPlatformView] = useState<'app_simulator' | 'android_code'>('app_simulator');
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [showMobileQrModal, setShowMobileQrModal] = useState(false);
  const [copiedTunnelLink, setCopiedTunnelLink] = useState(false);
  const [formCountingMode, setFormCountingMode] = useState<'manual' | 'voice'>('manual');

  // Dynamic Forms and Items state (preloaded with OneDrive 2026 checksheets + localStorage custom/edited)
  const [formsList, setFormsList] = useState<InventoryForm[]>(() => getStoredForms());
  const [itemsList, setItemsList] = useState<InventoryItem[]>(() => {
    const map = new Map<string, InventoryItem>();
    allOfficialStoreItems.forEach(i => map.set(i.id, i));
    sampleItems.forEach(i => map.set(i.id, i));
    return Array.from(map.values());
  });

  // Interactive Web Client Router
  const [currentScreen, setCurrentScreen] = useState<'splash' | 'login' | 'forgot' | 'dashboard' | 'locations' | 'forms' | 'counting' | 'voice' | 'confirmation' | 'reports' | 'settings' | 'admin'>('splash');
  
  // Current logged in simulator context
  const [simUser, setSimUser] = useState<any>(() => {
    const savedEmail = localStorage.getItem('applet_super_admin_email') || 'michael.goyone@gmail.com';
    return {
      ...sampleUsers[0],
      email: savedEmail
    };
  });
  const [selectedLocCode, setSelectedLocCode] = useState('AR'); // Selected Arlington Store
  const [selectedForm, setSelectedForm] = useState<InventoryForm>(sampleForms[0]);
  const [completedSubId, setCompletedSubId] = useState('');

  // Handle successful Excel inventory sheet upload
  const handleExcelImportSuccess = (newForm: InventoryForm, newItems: InventoryItem[]) => {
    setFormsList(prev => [newForm, ...prev]);
    setItemsList(prev => [...newItems, ...prev]);
    setSelectedForm(newForm);
    setCurrentScreen('counting');
  };

  // Credentials verification states for the Portal UI
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Sync login inputs when simulated profile switches via developer bar
  useEffect(() => {
    if (simUser) {
      setLoginEmail(simUser.email);
      if (simUser.role === 'Super Admin') {
        setLoginPassword(localStorage.getItem('applet_super_admin_password') || 'MyFamily2012!');
      } else {
        setLoginPassword('password123'); // default mock password for other employee roles
      }
      setLoginError('');
    }
  }, [simUser]);

  // Voice Command integration
  const [currentVoiceEmit, setCurrentVoiceEmit] = useState<{ itemName: string; quantity: number; unit: string; timestamp: number } | null>(null);

  // General App Settings parameters
  const [settingDarkMode, setSettingDarkMode] = useState(false);
  const [settingReminders, setSettingReminders] = useState(true);

  // Handle the splash countdown or click trigger
  useEffect(() => {
    if (currentScreen === 'splash') {
      const timer = setTimeout(() => {
        setCurrentScreen('login');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  // Handle role switching on the fly for developers to evaluate role partition limits
  const handleSimulateRoleChange = (role: UserRole) => {
    const userMatch = sampleUsers.find(u => u.role === role) || sampleUsers[0];
    setSimUser(userMatch);
    // If Admin, they have broad scopes. Employees only have specific codes.
    if (userMatch.assignedLocations.length > 0) {
      setSelectedLocCode(userMatch.assignedLocations[0]);
    }
  };

  // Safe checks for user permissions
  const canAccessAdmin = simUser.role === 'Super Admin' || simUser.role === 'Admin' || simUser.role === 'Manager';
  const canAccessManager = simUser.role === 'Super Admin' || simUser.role === 'Admin' || simUser.role === 'Manager';

  return (
    <div className={`min-h-screen ${settingDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans`}>
      
      {/* 🚀 Main Global Header */}
      <header className="bg-slate-950 border-b border-red-500/20 text-white shadow-md font-sans sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          
          {/* Logo Brand area */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white border border-slate-200/80 shadow-md flex items-center justify-center transform hover:scale-105 transition overflow-hidden p-0.5 shrink-0">
                <AppLogo className="w-9 h-9 sm:w-10 sm:h-10" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base sm:text-lg font-black font-display tracking-tight text-white leading-tight">The Commissary</h1>
                </div>
                <p className="text-[9px] sm:text-[10px] text-amber-500 font-mono font-medium tracking-wide">
                  Track Inventory by Voice. Anytime. Anywhere.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons & Platform Toggle */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowGitHubModal(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold font-mono text-xs shadow-md transition border border-slate-700 hover:border-amber-400/50 cursor-pointer"
              title="Push project repository directly to GitHub"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Push to GitHub</span>
            </button>

            <a
              href="/the-commissary-project.zip"
              download="the-commissary-project.zip"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold font-mono text-xs shadow-md transition border border-emerald-400/30 cursor-pointer"
              title="Download full project ZIP for ChatGPT or offline use"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Download ZIP</span>
            </a>

            {/* 📤 Upload Store Excel Sheet Button */}
            <button
              type="button"
              onClick={() => setShowExcelImportModal(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-bold font-mono text-xs shadow-md transition border border-amber-300 cursor-pointer active:scale-95"
              title="Upload your store Excel (.xlsx) inventory sheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 stroke-2" />
              <span className="hidden sm:inline">Upload Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>

            {/* 📱 Scan for Mobile QR Code Button */}
            <button
              type="button"
              onClick={() => setShowMobileQrModal(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold font-mono text-xs shadow-md transition border border-indigo-400/40 cursor-pointer active:scale-95"
              title="Open and test The Commissary on your cellphone using QR code"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">📱 Scan for Mobile</span>
              <span className="sm:hidden">📱 Phone</span>
            </button>

            {/* Quick Platform Workspace View Mode Toggle */}
            <div className="flex items-center bg-slate-900 p-1 border border-slate-800 rounded-xl max-w-sm w-full sm:w-auto font-mono text-xs">
              <button
                onClick={() => setPlatformView('app_simulator')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 border rounded-lg font-bold transition cursor-pointer text-xs ${
                  platformView === 'app_simulator' 
                    ? 'bg-amber-500 text-slate-950 shadow-md border-amber-400' 
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Interactive App</span>
              </button>
              
              <button
                onClick={() => setPlatformView('android_code')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 border rounded-lg font-bold transition cursor-pointer text-xs ${
                  platformView === 'android_code' 
                    ? 'bg-amber-500 text-slate-950 shadow-md border-amber-400' 
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                <FolderGit2 className="w-3.5 h-3.5 animate-pulse" />
                <span>Compose Code</span>
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* 🧬 Sub Header: User simulation Controls (Visible in app_simulator only) */}
      {platformView === 'app_simulator' && (
        <div className="bg-amber-500 border-b border-amber-600 p-2 sm:p-2.5 px-3 sm:px-4 text-slate-950 font-sans shadow-inner">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="bg-slate-950 text-amber-400 rounded px-2 py-0.5 font-mono text-[9px] font-bold shrink-0">ROLES</span>
              <p className="text-slate-900 text-[11px] sm:text-xs">
                Switch staff roles to evaluate <b>Role-Based Access partitions</b>:
              </p>
            </div>
            
            {/* Simulation Roles Selectors */}
            <div className="flex flex-wrap gap-1">
              {(['Super Admin', 'Admin', 'Manager', 'Employee'] as UserRole[]).map((role) => {
                const isSelected = simUser.role === role;
                return (
                  <button
                    key={role}
                    onClick={() => handleSimulateRoleChange(role)}
                    className={`px-2.5 py-1 text-white text-[10px] sm:text-xs font-bold rounded-lg transition-all active:scale-95 border uppercase tracking-wider cursor-pointer ${
                      isSelected 
                        ? 'bg-slate-950 text-amber-400 border-slate-900 font-black ring-1 ring-slate-950' 
                        : 'bg-amber-600/60 text-slate-950 border-amber-700/40 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 🏛️ Main Page Layout Container */}
      <main className="max-w-7xl mx-auto px-2.5 sm:px-4 md:px-6 py-4 sm:py-6 w-full overflow-hidden">

        {/* 📚 TAB 1: ANDROID JACTPACK COMPOSE DEVELOPER PORTAL */}
        {platformView === 'android_code' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white">
              <h2 className="text-xl font-bold font-display text-amber-400 flex items-center gap-2">
                <Terminal className="w-5.5 h-5.5 text-amber-500" />
                Jetpack Compose Enterprise Android Architecture
              </h2>
              <p className="text-xs text-slate-400 leading-normal mt-1.5 max-w-4xl">
                Inspect, browse, and copy the actual Jetpack Compose architecture files, data models, layout files (all 15 screens), navigation, SpeechRecognizer helpers, and Firebase FireStore security blueprints below.
              </p>
            </div>
            
            <AndroidFilesViewer />
          </div>
        )}

        {/* 📱 TAB 2: INTERACTIVE RESTAURANT OPERATIONS WEB CLIENT SIMULATOR */}
        {platformView === 'app_simulator' && (
          <div className="space-y-6">

            {/* 🖥️ VIEW ROUTER */}
            
            {/* Screen 1: Splash screen */}
            {currentScreen === 'splash' && (
              <div className="flex items-center justify-center min-h-[500px] bg-slate-950 border border-slate-800 rounded-3xl shadow-xl relative overflow-hidden text-white font-sans">
                <div className="absolute inset-0 bg-radial-gradient from-amber-500/10 via-transparent to-transparent opacity-50"></div>
                
                <div className="text-center space-y-4 z-10 p-6 animate-pulse">
                  <div className="w-24 h-24 rounded-full bg-white border border-slate-200 shadow-lg mx-auto flex items-center justify-center overflow-hidden p-2">
                    <AppLogo className="w-20 h-20" />
                  </div>
                  <h2 className="text-3xl font-black font-display tracking-tight text-white leading-none">The Commissary</h2>
                  <p className="text-xs text-amber-500 font-mono font-semibold uppercase tracking-widest">
                    Track Inventory by Voice. Anytime. Anywhere.
                  </p>
                  <div className="pt-8">
                    <button 
                      onClick={() => setCurrentScreen('login')}
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-full text-xs uppercase"
                    >
                      Bypass Splash Loading →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Screen 2: Login screen */}
            {currentScreen === 'login' && (() => {
              const handleLoginSubmit = () => {
                const enteredEmail = loginEmail.trim().toLowerCase();
                const enteredPassword = loginPassword;
                
                const configuredAdminEmail = (localStorage.getItem('applet_super_admin_email') || 'michael.goyone@gmail.com').toLowerCase();
                const configuredAdminPassword = localStorage.getItem('applet_super_admin_password') || 'MyFamily2012!';
                
                setLoginError('');

                if (enteredEmail === configuredAdminEmail) {
                  if (enteredPassword === configuredAdminPassword) {
                    // Success! Log in as super admin
                    const updatedSuperAdmin = {
                      ...sampleUsers[0],
                      email: enteredEmail
                    };
                    setSimUser(updatedSuperAdmin);
                    if (updatedSuperAdmin.assignedLocations.length > 0) {
                      setSelectedLocCode(updatedSuperAdmin.assignedLocations[0]);
                    }
                    setCurrentScreen('dashboard');
                  } else {
                    setLoginError('Security Check Failed: Invalid password for host super admin authorization.');
                  }
                } else {
                  // Check other roles
                  const otherUser = sampleUsers.find(u => u.email.toLowerCase() === enteredEmail);
                  if (otherUser) {
                    setSimUser(otherUser);
                    if (otherUser.assignedLocations.length > 0) {
                      setSelectedLocCode(otherUser.assignedLocations[0]);
                    }
                    setCurrentScreen('dashboard');
                  } else {
                    setLoginError('Authorization Mismatch: Email identity not found on staff ledger.');
                  }
                }
              };

              return (
                <div className="max-w-md mx-auto bg-white border border-slate-200/80 rounded-2xl p-8 hover:shadow-lg text-gray-800 transition shadow-md">
                  <div className="text-center space-y-2 mb-8">
                    <div className="w-14 h-14 bg-white border border-slate-200 shadow-md rounded-2xl mx-auto flex items-center justify-center overflow-hidden p-1">
                      <AppLogo className="w-12 h-12" />
                    </div>
                    <h2 className="text-2xl font-bold font-display text-gray-950">Employee Portal Access</h2>
                    <p className="text-xs text-gray-500">Sign in using your corporate credentials to fetch assigned checklists</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1 text-xs">
                      <label className="font-bold text-gray-400 font-mono tracking-wider text-[10px] uppercase">Corporate Email</label>
                      <div className="relative">
                        <input 
                          type="email" 
                          placeholder="michael.goyone@gmail.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 border rounded-xl bg-white text-xs font-mono outline-none focus:border-amber-500"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <label className="font-bold text-gray-400 font-mono tracking-wider text-[10px] uppercase">Corporate Password</label>
                      <div className="relative">
                        <input 
                          type="password" 
                          placeholder="Enter your security password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 border rounded-xl bg-white text-xs outline-none focus:border-amber-500"
                        />
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      </div>
                    </div>

                    {loginError && (
                      <p className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-bold font-mono leading-tight">
                        {loginError}
                      </p>
                    )}

                    <div className="flex justify-between items-center text-xs">
                      <button 
                        onClick={() => setCurrentScreen('forgot')}
                        className="text-red-600 hover:underline font-semibold"
                      >
                        Retrieve Credentials?
                      </button>
                    </div>

                    <button
                      onClick={handleLoginSubmit}
                      className="w-full py-3.5 bg-slate-950 text-white rounded-xl text-xs uppercase font-bold tracking-wider hover:bg-slate-900 cursor-pointer active:scale-95 transition"
                    >
                      Establish Secure Session (Login)
                    </button>

                    <div className="p-3 bg-amber-500/5 text-[11px] text-gray-600 rounded-xl border border-amber-500/10 leading-normal text-center">
                      💡 <b>Development Bypass:</b> Switch profiles at the gold sub-header then click Login. Authentication logic bounds permissions.
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Screen 3: Forgot password screen */}
            {currentScreen === 'forgot' && (
              <div className="max-w-md mx-auto bg-white border rounded-2xl p-8 shadow-md hover:shadow-lg text-slate-800 transition">
                <button 
                  onClick={() => setCurrentScreen('login')}
                  className="p-1 px-3 border rounded text-xs text-slate-500 hover:bg-slate-50 flex items-center gap-1.5 font-bold mb-6"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Return Access Login
                </button>

                <h3 className="text-xl font-bold font-display text-gray-900">Restore Password Scopes</h3>
                <p className="text-xs text-gray-500 leading-normal mt-1 mb-4">Enter your registered email address below, and our server will dispatch dynamic credentials override guidelines.</p>

                <div className="space-y-4">
                  <input 
                    type="email" 
                    placeholder="Enter email identity"
                    className="w-full p-2.5 border rounded-xl text-xs outline-none focus:border-amber-500"
                  />
                  <button 
                    onClick={() => {
                      alert("Password reset override dispatch completed successfully.");
                      setCurrentScreen('login');
                    }}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl text-xs uppercase transition"
                  >
                    Request Credentials Reset Override
                  </button>
                </div>
              </div>
            )}

            {/* Screen 4: Dashboard cockpit screen */}
            {currentScreen === 'dashboard' && (
              <div className="space-y-6">
                
                {/* Dashboard Cockpit Cards */}
                <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-amber-500 rounded-lg text-slate-950 font-bold text-xs">COCKPIT</span>
                      <h3 className="text-lg font-black font-display text-white">The Commissary Central Dashboard</h3>
                    </div>
                    <p className="text-xs text-slate-400 max-w-2xl leading-normal">
                      Welcome back, <span className="text-amber-400 font-bold">{simUser.name}</span>. You have authority access scoped to: <span className="underline">{simUser.assignedLocations.join(', ')}</span>.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {/* Quick Access Actions Buttons */}
                    <button 
                      onClick={() => setCurrentScreen('locations')}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black border border-amber-400 rounded-xl text-xs uppercase cursor-pointer transition active:scale-95 shadow-sm"
                    >
                      Manual Checklist
                    </button>
                    {canAccessAdmin && (
                      <button 
                        onClick={() => setCurrentScreen('admin')}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black border border-slate-700 rounded-xl text-xs uppercase cursor-pointer transition active:scale-95"
                      >
                        Operational Console
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-4 text-center font-mono">
                  <div className="bg-white border rounded-2xl p-4 shadow-sm border-slate-200/80">
                    <p className="text-[10px] text-gray-400 uppercase font-black">Scheduled Audits Pending</p>
                    <p className="text-2xl font-black text-amber-500 mt-1">2</p>
                  </div>
                  <div className="bg-white border rounded-2xl p-4 shadow-sm border-slate-200/80 text-gray-800">
                    <p className="text-[10px] text-gray-400 uppercase font-black">Completed cycle Submissions</p>
                    <p className="text-2xl font-black text-gray-950 mt-1">{sampleSubmissions.length}</p>
                  </div>
                  <div className="bg-white border rounded-2xl p-4 shadow-sm border-slate-200/80">
                    <p className="text-[10px] text-gray-400 uppercase font-black">Overdue Audits warning</p>
                    <p className="text-2xl font-black text-red-600 mt-1 animate-pulse">0</p>
                  </div>
                  <div className="bg-white border rounded-2xl p-3 px-2 shadow-sm border-slate-200/80">
                    <p className="text-[10px] text-gray-400 uppercase font-black">Quick Reports View</p>
                    <button 
                      onClick={() => setCurrentScreen('reports')}
                      className="mt-1 px-3 py-1 bg-slate-900 text-white rounded text-xs font-bold font-sans uppercase block mx-auto leading-tight"
                    >
                      Open Reports
                    </button>
                  </div>
                </div>

                {/* Dashboard grid layout */}
                <div className="grid lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Easy Access Voice / Manual Reminders */}
                  <div className="lg:col-span-2 space-y-4">
                    
                    {/* Active Checklists Pending Board */}
                    <div className="bg-white border text-gray-800 border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
                      <h4 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-1.5">
                        <ClipboardList className="w-5 h-5 text-amber-500" />
                        Assigned Checklist audits pending ({simUser.assignedLocations.length} hubs assigned)
                      </h4>

                      <div className="divide-y text-xs">
                        {formsList.filter(f => simUser.assignedLocations.includes(f.locationCode) || f.locationCode === 'STORE' || simUser.role === 'Super Admin').slice(0, 5).map((form) => (
                          <div key={form.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 first:pt-0 last:pb-0">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="bg-slate-900 text-amber-500 text-[8px] font-bold px-1.5 py-0.5 rounded font-mono">
                                  {form.locationCode} OUTLET
                                </span>
                                <h5 className="font-bold text-slate-950 text-sm leading-none">{form.title}</h5>
                              </div>
                              <p className="text-slate-500 mt-1 flex items-center gap-1">
                                Cycle: <span className="font-medium text-slate-800">{form.frequency}</span> • Due Date: {form.dueDate} at {form.dueTime}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
                              <button
                                onClick={() => {
                                  setSelectedForm(form);
                                  setSelectedLocCode(form.locationCode);
                                  setFormCountingMode('voice');
                                  setCurrentScreen('counting');
                                }}
                                className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-black rounded-lg text-xs uppercase cursor-pointer flex items-center justify-center gap-1 shadow-xs active:scale-95 transition"
                                title="Start hands-free voice counting on this checksheet"
                              >
                                <Mic className="w-3.5 h-3.5 text-slate-950" />
                                <span>Voice Count</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedForm(form);
                                  setSelectedLocCode(form.locationCode);
                                  setFormCountingMode('manual');
                                  setCurrentScreen('counting');
                                }}
                                className="flex-1 sm:flex-initial px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold rounded-lg text-xs uppercase cursor-pointer flex items-center justify-center transition"
                              >
                                <span>Manual</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Access Simulated Speech Trigger Box */}
                    <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 text-gray-800 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                          <Mic className="w-4.5 h-4.5 text-amber-500" /> Use Speech Assistance Core
                        </h4>
                        <p className="text-xs text-amber-800 max-w-md leading-relaxed">
                          Say commands like <i>"Chicken breast 5 cases"</i> inside lockers. Zero manual typings required in sub-zero freezers!
                        </p>
                      </div>

                      <button 
                        onClick={() => {
                          setSelectedForm(sampleForms[0]);
                          setCurrentScreen('voice');
                        }}
                        className="px-5 py-3 bg-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase cursor-pointer tracking-wider flex items-center gap-1.5 shadow-md hover:scale-[1.02] transition"
                      >
                        <Volume2 className="w-4 h-4 text-slate-950" />
                        Start Voice Inventory
                      </button>
                    </div>

                  </div>

                  {/* Right Column: Activity Ledger feed */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4 max-h-[430px] overflow-y-auto">
                    <h4 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-1.5">
                      <Terminal className="w-4.5 h-4.5 text-slate-700" />
                      Dynamic Activity Ledger Trail
                    </h4>
                    
                    <div className="space-y-3 text-xs">
                      {auditLogsSample.map((log) => (
                        <div key={log.id} className="p-2.5 bg-slate-50 border border-slate-100/50 rounded-lg">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[9px] font-bold text-slate-400 bg-slate-900 px-1 py-0.5 rounded leading-none uppercase">
                              {log.action}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-[11px] leading-tight text-gray-900 mt-1.5 font-bold">
                            {log.details}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Operator: {log.user}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Screen 5: Location selector screen (supports 500) */}
            {currentScreen === 'locations' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950 flex items-center gap-1.5">
                        <MapPin className="w-5.5 h-5.5 text-amber-500" /> Select Store Facility
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Choose your target store code to load its specific checksheet forms audits list</p>
                    </div>

                    <button 
                      onClick={() => setCurrentScreen('dashboard')}
                      className="p-1.5 px-3 border rounded text-xs text-slate-500 hover:bg-slate-50 flex items-center gap-1.5 font-bold ml-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 font-bold" /> Cockpit Dashboard
                    </button>
                  </div>

                  {/* Search bar inside outlets list */}
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Search store name, city or operational code..."
                      value={selectedLocCode}
                      onChange={(e) => setSelectedLocCode(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-amber-500 bg-slate-50 font-mono"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>

                  {/* Locations grid */}
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {defaultLocations.map((loc) => {
                      const isAssigned = simUser.assignedLocations.includes(loc.code);
                      return (
                        <div 
                          key={loc.code} 
                          className={`p-4 border rounded-2xl transition hover:border-amber-400 flex flex-col justify-between min-h-[140px] ${
                            isAssigned 
                              ? 'bg-amber-500/5 border-amber-500/20' 
                              : 'bg-white border-slate-200/70 opacity-60'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-center gap-1">
                              <span className="font-mono font-black text-amber-500 bg-slate-900 px-2 py-0.5 rounded text-xs">
                                {loc.code}
                              </span>
                              {isAssigned ? (
                                <span className="bg-green-500/15 text-green-700 font-bold border border-green-200 text-[8px] px-1.5 py-0.5 rounded">
                                  ASSIGNED
                                </span>
                              ) : (
                                <span className="bg-slate-100 text-slate-400 border text-[8px] px-1.5 py-0.5 rounded">
                                  RESTRICTED
                                </span>
                              )}
                            </div>
                            <h4 className="font-black text-gray-900 text-sm mt-3 leading-tight">{loc.name} Outlet</h4>
                            <p className="text-[10px] text-slate-400 mt-1 truncate">{loc.address}</p>
                          </div>

                          <button
                            disabled={!isAssigned}
                            onClick={() => {
                              setSelectedLocCode(loc.code);
                              setCurrentScreen('forms');
                            }}
                            className={`w-full mt-3 py-1.5 text-center text-xs uppercase font-bold rounded-lg transition-all ${
                              isAssigned 
                                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer' 
                                : 'bg-slate-150 text-slate-400 cursor-not-allowed border'
                            }`}
                          >
                            Open Checksheets
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Screen 6: Inventory check-list forms screen */}
            {currentScreen === 'forms' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-950 flex items-center gap-1.5">
                        <ClipboardList className="w-5.5 h-5.5 text-amber-500" /> Active Checksheets Audits
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Showing scheduled checklist audits for selected store outlet</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        type="button"
                        onClick={() => setShowExcelImportModal(true)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Upload Excel Sheet</span>
                      </button>

                      <button 
                        onClick={() => setCurrentScreen('locations')}
                        className="p-1 px-3 border rounded text-xs text-slate-500 hover:bg-slate-50 flex items-center gap-1.5 font-bold cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back locations
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(() => {
                      const matchingForms = formsList.filter(f => f.locationCode === selectedLocCode || f.locationCode === 'STORE' || f.locationCode === 'ALL' || !f.locationCode);
                      if (matchingForms.length === 0) {
                        return (
                          <div className="py-8 text-center text-slate-400">
                            <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                            <p className="font-bold text-sm text-slate-600">No scheduled checksheets found for this location</p>
                            <p className="text-xs text-slate-400 mt-1">Upload an Excel (.xlsx) sheet to get started right away</p>
                            <button
                              type="button"
                              onClick={() => setShowExcelImportModal(true)}
                              className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <FileSpreadsheet className="w-4 h-4" /> Upload Store Sheet
                            </button>
                          </div>
                        );
                      }

                      return (
                        <>
                          <div className="flex items-center justify-between text-xs font-mono text-slate-500 bg-slate-50 p-2.5 px-3 rounded-xl border border-slate-200">
                            <span>Showing <strong>{matchingForms.length}</strong> official inventory checksheets for this store</span>
                            <span className="text-[10px] text-amber-700 font-bold bg-amber-100/80 px-2 py-0.5 rounded-full">Synced with OneDrive 2026</span>
                          </div>

                          <div className="divide-y space-y-3">
                            {matchingForms.map((form) => {
                              const isUserLinked = simUser.assignedForms.includes(form.id) || simUser.role === 'Super Admin' || simUser.role === 'Admin' || form.id.startsWith('form-');
                              const totalItemsInForm = form.sections.reduce((acc, s) => acc + s.itemIds.length, 0);

                              return (
                                <div key={form.id} className="py-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                  <div className="text-xs space-y-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full font-mono text-[8px] uppercase">
                                        {form.frequency}
                                      </span>
                                      <h4 className="font-bold text-slate-950 text-sm">{form.title}</h4>
                                      {form.excelFileName && (
                                        <a
                                          href={`/excel-forms/${encodeURIComponent(form.excelFileName)}`}
                                          download={form.excelFileName}
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full transition shadow-2xs"
                                          title="Download original store Excel spreadsheet"
                                        >
                                          <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                                          <span>.xlsx</span>
                                        </a>
                                      )}
                                    </div>
                                    <p className="text-slate-400">
                                      Due: <span className="text-red-650 font-bold">{form.dueDate}</span> at {form.dueTime} | <strong>{totalItemsInForm} items</strong> across {form.sections.length} sections ({form.sections.map(s => s.name).slice(0, 3).join(', ')}{form.sections.length > 3 ? '...' : ''})
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      disabled={!isUserLinked}
                                      onClick={() => {
                                        setSelectedForm(form);
                                        setSelectedLocCode(form.locationCode);
                                        setFormCountingMode('voice');
                                        setCurrentScreen('counting');
                                      }}
                                      className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase transition flex items-center gap-1.5 shadow-sm active:scale-95 ${
                                        isUserLinked 
                                          ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 border border-amber-400 cursor-pointer' 
                                          : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                      }`}
                                      title="Launch hands-free voice counting"
                                    >
                                      <Mic className="w-3.5 h-3.5 text-slate-950" />
                                      <span>Voice Count</span>
                                    </button>

                                    <button
                                      disabled={!isUserLinked}
                                      onClick={() => {
                                        setSelectedForm(form);
                                        setSelectedLocCode(form.locationCode);
                                        setFormCountingMode('manual');
                                        setCurrentScreen('counting');
                                      }}
                                      className={`px-3 py-2 border rounded-xl text-xs font-bold uppercase transition flex items-center gap-1 ${
                                        isUserLinked 
                                          ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 cursor-pointer' 
                                          : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                      }`}
                                    >
                                      <span>Manual</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Screen 7: Inventory counting counting checksheet sheet */}
            {currentScreen === 'counting' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 bg-white p-3 px-4 rounded-xl border">
                  <button
                    onClick={() => setCurrentScreen('forms')}
                    className="p-2 px-3 border hover:bg-slate-50 transition rounded-lg text-xs font-bold text-slate-600 flex items-center justify-center gap-1.5 touch-manipulation"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Forms
                  </button>

                  <button 
                    onClick={() => setCurrentScreen('voice')}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black border border-amber-400 rounded-xl text-xs uppercase cursor-pointer flex items-center justify-center gap-1.5 shadow-sm transition touch-manipulation"
                  >
                    <Mic className="w-4 h-4 text-slate-950" />
                    Open Voice Mic Assistant
                  </button>
                </div>

                <InventoryFormCounting 
                  form={selectedForm}
                  currentUser={simUser}
                  initialMode={formCountingMode}
                  onBack={() => setCurrentScreen('forms')}
                  onSubmitSuccess={(id) => {
                    setCompletedSubId(id);
                    setCurrentScreen('confirmation');
                  }}
                  activeVoiceParsedCmd={currentVoiceEmit}
                  availableItems={itemsList}
                />
              </div>
            )}

            {/* Screen 8: Voice Speech Inventory Recognition helper screen */}
            {currentScreen === 'voice' && (
              <div className="space-y-4">
                <button
                  onClick={() => setCurrentScreen('counting')}
                  className="p-1.5 px-3 bg-white border hover:bg-slate-100 transition rounded-xl text-xs text-slate-500 font-bold flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Return to Checklist
                </button>

                <VoiceInventoryUI 
                  availableItems={itemsList}
                  onParsedUpdate={(itemName, quantity, unit) => {
                    // Update latest parsed update, triggers listener in InventoryFormCounting
                    setCurrentVoiceEmit({
                      itemName,
                      quantity,
                      unit,
                      timestamp: Date.now()
                    });
                  }}
                />
              </div>
            )}

            {/* Screen 9: Form submission success confirmation screen */}
            {currentScreen === 'confirmation' && (
              <div className="max-w-xl mx-auto bg-white border text-gray-800 border-slate-200/75 p-8 rounded-3xl text-center shadow-xl space-y-6 animate-pulse">
                
                <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-green-600" />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold bg-green-500/10 text-green-700 px-3 py-1 rounded border border-green-200 uppercase tracking-widest leading-none">
                    Security confirmation verified
                  </span>
                  <h3 className="text-2xl font-black font-display text-gray-900 mt-2">Audit Sheet Transmitted Successfully</h3>
                  <p className="text-xs text-slate-400 font-mono">Receipt code: <span className="underline font-bold text-slate-700">{completedSubId}</span></p>
                </div>

                {/* Submitting confirmation metadata details */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-semibold leading-relaxed text-gray-700 divide-y space-y-2.5">
                  <div className="flex justify-between items-center first:pt-0 pt-2.5">
                    <span>Target store outlet:</span>
                    <span className="font-mono text-slate-900">{selectedLocCode} - Anita's Arlington</span>
                  </div>
                  <div className="flex justify-between items-center pt-2.5">
                    <span>Audit checklist title:</span>
                    <span className="font-mono text-slate-900">{selectedForm.title}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2.5">
                    <span>Corporate Notification status:</span>
                    <span className="text-green-600 font-bold">Admin pinged successfully (Push, SMS, email logic active)</span>
                  </div>
                </div>

                <div className="p-3.5 bg-amber-500/5 text-gray-500 border border-dashed rounded-xl text-left text-[11px] leading-normal flex items-start gap-2">
                  <Bell className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <p>In production, Cloud messaging triggers immediately to push alarm reminders onto corporate admin dashboards, and writes data registers into secure Google Firestore buckets.</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentScreen('reports')}
                    className="w-1/2 py-3 bg-slate-950 text-white font-bold rounded-xl text-xs uppercase hover:bg-slate-900 active:scale-95 transition"
                  >
                    Analyze Reports
                  </button>

                  <button
                    onClick={() => setCurrentScreen('dashboard')}
                    className="w-1/2 py-3 bg-amber-500 text-slate-950 font-black rounded-xl text-xs uppercase hover:bg-amber-600 active:scale-95 transition"
                  >
                    Cockpit Dashboard
                  </button>
                </div>

              </div>
            )}

            {/* Screen 10: Reports and metrics charts */}
            {currentScreen === 'reports' && (
              <div className="space-y-4">
                <button
                  onClick={() => setCurrentScreen('dashboard')}
                  className="p-1 px-3 bg-white border hover:bg-slate-100 rounded-xl text-xs text-slate-500 font-bold flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>
                
                <ReportViewer />
              </div>
            )}

            {/* Screens 11-14: Administrative panel suites */}
            {currentScreen === 'admin' && (
              <div className="space-y-4">
                <button
                  onClick={() => setCurrentScreen('dashboard')}
                  className="p-1 px-3 bg-white border hover:bg-slate-100 rounded-xl text-xs text-slate-500 font-bold flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>

                <AdminPanels 
                  simUser={simUser} 
                  setSimUser={setSimUser}
                  forms={formsList}
                  setForms={setFormsList}
                  items={itemsList}
                  setItems={setItemsList}
                  onOpenForm={(form, mode) => {
                    setSelectedForm(form);
                    setSelectedLocCode(form.locationCode);
                    setFormCountingMode(mode || 'manual');
                    setCurrentScreen('counting');
                  }}
                />
              </div>
            )}

            {/* Screen 15: Corporate general app settings */}
            {currentScreen === 'settings' && (
              <div className="max-w-2xl mx-auto bg-white border text-gray-800 border-slate-150 p-6 rounded-2xl shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h3 className="text-xl font-bold font-display text-gray-900">User Settings Panel</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Toggle notification preferences, select system themes, or view credentials levels</p>
                  </div>
                  
                  <button
                    onClick={() => setCurrentScreen('dashboard')}
                    className="p-1.5 px-3 border hover:bg-slate-50 transition rounded-xl text-xs font-bold text-slate-500 flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" /> Cockpit Dashboard
                  </button>
                </div>

                <div className="space-y-4 text-xs font-semibold">
                  <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border">
                    <div>
                      <h4 className="font-bold text-slate-900">Simulated dark mode</h4>
                      <p className="text-[10px] text-gray-500 font-normal">Swap colors scheme between daylight and midnight looks</p>
                    </div>

                    <button
                      onClick={() => setSettingDarkMode(prev => !prev)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                        settingDarkMode 
                          ? 'bg-amber-500 text-slate-950 border-amber-400' 
                          : 'bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {settingDarkMode ? "Active Dark" : "Daylight Light"}
                    </button>
                  </div>

                  <div className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border">
                    <div>
                      <h4 className="font-bold text-slate-900 font-sans">Reminders Reminders (Push/SMS)</h4>
                      <p className="text-[10px] text-gray-500 font-normal">Automatically remind employees on due date countdowns</p>
                    </div>

                    <button
                      onClick={() => setSettingReminders(prev => !prev)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                        settingReminders 
                          ? 'bg-amber-500 text-slate-950 border-amber-400' 
                          : 'bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {settingReminders ? "Reminders Enabled" : "Silent Mode"}
                    </button>
                  </div>

                  {/* Profile data segment */}
                  <div className="p-4 bg-slate-50 border rounded-xl leading-relaxed text-gray-700 space-y-1">
                    <h4 className="font-bold text-slate-950 mb-2">Corporate Profile Details</h4>
                    <p>Logged email: <span className="font-mono text-slate-900 font-bold">{simUser.email}</span></p>
                    <p>Current role permissions level: <span className="font-bold text-amber-700 underline uppercase">{simUser.role}</span></p>
                    <p>Target stores partitions linked: <span className="font-mono text-slate-900">{simUser.assignedLocations.join(' • ')}</span></p>
                  </div>

                  {/* Export for ChatGPT Section */}
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl leading-relaxed text-emerald-950 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileDown className="w-5 h-5 text-emerald-700" />
                        <h4 className="font-bold text-emerald-950">Package & Export to ChatGPT</h4>
                      </div>
                      <span className="bg-emerald-200 text-emerald-900 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                        ZIP ARCHIVE READY
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800">
                      All clean source code files (React components, adaptive voice engine, Jetpack Compose Android Kotlin files, server routes, configs, and documentation) are packaged into a single lightweight ZIP archive.
                    </p>
                    <a
                      href="/the-commissary-project.zip"
                      download="the-commissary-project.zip"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition shadow-sm"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Download the-commissary-project.zip</span>
                    </a>
                  </div>

                  {/* Git Repository & GitHub Push Section */}
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl leading-relaxed text-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderGit2 className="w-5 h-5 text-amber-400" />
                        <h4 className="font-bold text-white">Git Repository & GitHub Push</h4>
                      </div>
                      <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                        MAIN BRANCH READY
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      The local Git repository has been initialized with all 23 source files committed. Push directly to your GitHub account or view CLI instructions.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => setShowGitHubModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition shadow-sm font-mono"
                      >
                        <FolderGit2 className="w-4 h-4" />
                        <span>Push to GitHub Repository</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 📋 SIMULATION NAVIGATION TAB TRUCK RAIL (Visible only in simulator view) */}
            {currentScreen !== 'splash' && (
              <div className="bg-slate-900/95 backdrop-blur-md p-2.5 sm:p-3 px-3 sm:px-4 border border-slate-800 rounded-2xl flex flex-wrap gap-2 items-center justify-between text-white font-mono text-[11px] shadow-xl sticky bottom-2 sm:bottom-4 z-40 max-w-full overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <p className="text-slate-300 text-[10.5px] sm:text-xs">
                    Screen: <b className="text-amber-500 uppercase">{currentScreen}</b>
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  <button 
                    onClick={() => setCurrentScreen('dashboard')}
                    className="px-2.5 py-1.5 hover:bg-slate-800 hover:text-white rounded text-slate-300 bg-slate-950 border border-slate-800 text-[10.5px] font-bold touch-manipulation"
                  >
                    Cockpit
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedLocCode('AR');
                      setCurrentScreen('locations');
                    }}
                    className="px-2.5 py-1.5 hover:bg-slate-800 hover:text-white rounded text-slate-300 bg-slate-950 border border-slate-800 text-[10.5px] font-bold touch-manipulation"
                  >
                    Stores
                  </button>
                  <button 
                    onClick={() => setCurrentScreen('reports')}
                    className="px-2.5 py-1.5 hover:bg-slate-800 hover:text-white rounded text-slate-300 bg-slate-950 border border-slate-800 text-[10.5px] font-bold touch-manipulation"
                  >
                    Reports
                  </button>
                  {canAccessAdmin && (
                    <button 
                      onClick={() => setCurrentScreen('admin')}
                      className="px-2.5 py-1.5 hover:bg-slate-800 hover:text-white rounded text-slate-300 bg-slate-950 border border-slate-800 text-[10.5px] font-bold touch-manipulation"
                    >
                      Admin
                    </button>
                  )}
                  <button 
                    onClick={() => setCurrentScreen('settings')}
                    className="px-2.5 py-1.5 hover:bg-slate-800 hover:text-white rounded text-slate-300 bg-slate-950 border border-slate-800 text-[10.5px] font-bold touch-manipulation"
                  >
                    Settings
                  </button>
                  <button 
                    onClick={() => {
                      setCurrentScreen('splash');
                    }}
                    className="px-2.5 py-1.5 bg-red-950 hover:bg-red-900 text-red-400 border border-red-800/40 rounded text-[10.5px] font-bold touch-manipulation"
                  >
                    Exit Demo
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* 🧾 Bottom Brand Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 text-center py-6 px-4 text-xs font-mono select-none mt-12">
        <div className="max-w-7xl mx-auto space-y-1.5">
          <p>© 2026 GoyoneByDesign Operations Team. All database scopes secured.</p>
          <p className="text-[10px] text-slate-600">Enterprise Restaurant Warehouse Inventory, voice parsing NLP engines, and purchasing routers.</p>
        </div>
      </footer>

      {/* GitHub Repository Push Modal */}
      <GitHubPushModal 
        isOpen={showGitHubModal} 
        onClose={() => setShowGitHubModal(false)} 
      />

      {/* Excel Sheet Import Modal */}
      <ExcelImportModal
        isOpen={showExcelImportModal}
        onClose={() => setShowExcelImportModal(false)}
        onImportSuccess={handleExcelImportSuccess}
      />

      {/* 📱 Mobile Preview QR Code Modal */}
      {showMobileQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-base sm:text-lg text-slate-950 font-display">
                    Scan with Mobile Phone
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Live Cloudflare Tunnel Preview • Hands-Free Voice Counting
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileQrModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Code Container */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-center flex flex-col items-center justify-center space-y-3">
              <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=https%3A%2F%2Fpermalink-sector-headline-rca.trycloudflare.com"
                  alt="The Commissary Mobile QR Code"
                  className="w-52 h-52 sm:w-60 sm:h-60 object-contain mx-auto rounded-lg"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Active HTTPS Tunnel Ready to Scan</span>
              </div>
            </div>

            {/* Link Box & Copy Button */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                Public HTTPS Mobile URL:
              </label>
              <div className="flex items-center gap-1.5 bg-slate-100 p-2 rounded-xl border border-slate-200">
                <input
                  type="text"
                  readOnly
                  value="https://permalink-sector-headline-rca.trycloudflare.com"
                  className="bg-transparent text-xs font-mono text-slate-800 flex-1 outline-none font-semibold truncate"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText("https://permalink-sector-headline-rca.trycloudflare.com");
                    setCopiedTunnelLink(true);
                    setTimeout(() => setCopiedTunnelLink(false), 2500);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1 cursor-pointer shrink-0 ${
                    copiedTunnelLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 text-amber-400 hover:bg-slate-800'
                  }`}
                >
                  {copiedTunnelLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Local WiFi URL alternative */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-[11px] font-mono text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">Same Wi-Fi Local Network IP:</p>
              <p className="text-amber-800 font-bold select-all">http://192.168.1.157:3000</p>
              <p className="text-[10px] text-slate-400">Use on devices connected to the same restaurant Wi-Fi router.</p>
            </div>

            {/* Instructions list */}
            <div className="text-[11px] text-slate-600 space-y-1.5 font-sans bg-amber-50/60 border border-amber-200/60 rounded-xl p-3">
              <p className="font-bold text-amber-950 flex items-center gap-1">
                <span>💡 Quick Testing Instructions:</span>
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-amber-900 text-[10.5px]">
                <li>Open your Camera app on your iPhone or Android and point at the QR code.</li>
                <li>Tap the link banner that appears to open in Safari or Chrome.</li>
                <li>Tap <b>🎙️ Voice Count</b> on any checksheet to test real-time speech recognition!</li>
              </ul>
            </div>

            <div className="flex items-center justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowMobileQrModal(false)}
                className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl text-xs uppercase cursor-pointer transition active:scale-95"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
