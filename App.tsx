
import React, { useState, useEffect, useRef } from 'react';
import { AppView, Professional, Project, ChatMessage, DriveFile, Review, BroadcastRequest, Collection, Invoice } from './types';
import { MOCK_PROS, INITIAL_PROJECTS } from './constants';
import { Whiteboard } from './components/Whiteboard';
import { GoogleDrivePicker } from './components/GoogleDrivePicker';
import { CameraCapture } from './components/CameraCapture';
import { ExpertDashboard } from './components/ExpertDashboard';
import { ConnectionApprovalModal } from './components/ConnectionApprovalModal';
import { BuildersWall } from './components/BuildersWall';
import { LocalExpertsList } from './components/LocalExpertsList';
import { ProfileView } from './components/ProfileView';
import { geminiService } from './services/geminiService';
import { LiveCallSession } from './services/liveService';
import { MultiOfferModal } from './components/MultiOfferModal';
import { ClientSettingsView } from './components/ClientSettingsView';
import { InvoiceModal } from './components/InvoiceModal';

interface AppNotification {
  id: string;
  message: string;
  type: 'offer' | 'info' | 'success';
  timestamp: Date;
  read: boolean;
}

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<'client' | 'expert'>('client');
  const [currentView, setCurrentView] = useState<AppView>(AppView.WORKSPACE);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [pros, setPros] = useState<Professional[]>(MOCK_PROS);
  const [broadcasts, setBroadcasts] = useState<BroadcastRequest[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  const [selectedBroadcastForOffers, setSelectedBroadcastForOffers] = useState<BroadcastRequest | null>(null);
  const [collections, setCollections] = useState<Collection[]>([
    { id: 'c1', name: 'Workshop Ideas', postIds: [] },
    { id: 'c2', name: 'Tools to Buy', postIds: [] }
  ]);

  const [isSettingsLocked, setIsSettingsLocked] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<boolean[]>([true, false, true, true]);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [sessionLiveHistory, setSessionLiveHistory] = useState<string>('');
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<DriveFile[]>([]);
  const [pendingSnapshot, setPendingSnapshot] = useState<string | undefined>(undefined);
  const [imageToEdit, setImageToEdit] = useState<string | undefined>(undefined);
  
  const [activeProjectTab, setActiveProjectTab] = useState<'ai' | 'expert' | 'vault' | 'summaries'>('ai');

  const scrollRef = useRef<HTMLDivElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const liveSessionRef = useRef<LiveCallSession | null>(null);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const currentExpert = pros[0]; 

  // Global notification for Vault if expert offers exist
  const hasPendingOffers = broadcasts.some(b => (b.offers.length > 0 && !b.assignedExpertId));
  const isInvoicePending = activeProject?.invoice?.status === 'pending';

  useEffect(() => {
    const checkKey = async () => {
      try {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } catch (e) {
        setHasApiKey(false);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeProject, isTyping, activeProjectTab]);

  // Handle Tab sync when expert connection is closed
  useEffect(() => {
    if (activeProject?.status === 'completed' && activeProjectTab === 'expert') {
      setActiveProjectTab('summaries');
    }
  }, [activeProject?.status, activeProjectTab]);

  const addNotification = (message: string, type: AppNotification['type']) => {
    const newNote: AppNotification = {
      id: `note-${Date.now()}`,
      message,
      type,
      timestamp: new Date(),
      read: false
    };
    setNotifications(prev => [newNote, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNote.id));
    }, 6000);
  };

  const handleSelectKey = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    setHasApiKey(true);
  };

  const handleError = async (err: any) => {
    console.error("API Error:", err);
    if (err.message?.includes("permission") || err.message?.includes("403") || err.message?.includes("not found")) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleStartLiveAI = async () => {
    if (!activeProject) return;
    setIsLiveActive(true);
    setLiveTranscription('Initializing vision link...');
    setSessionLiveHistory('');
    const context = `PROJECT: ${activeProject.title}\nSUMMARY: ${activeProject.summary}`;
    const session = new LiveCallSession();
    liveSessionRef.current = session;
    try {
      await session.start({
        onMessage: (text) => {
          setLiveTranscription(text);
          setSessionLiveHistory(prev => prev + '\n' + text);
        },
        onClose: () => setIsLiveActive(false)
      }, liveVideoRef.current || undefined, context, screenStream || undefined);
    } catch (err) {
      handleError(err);
      setIsLiveActive(false);
    }
  };

  const handleStopLiveAI = () => {
    liveSessionRef.current?.stop();
    liveSessionRef.current = null;
    setIsLiveActive(false);
  };

  const handleBroadcast = () => {
    if (!activeProject) return;
    const newBroadcast: BroadcastRequest = {
      id: `b-${Date.now()}`, clientId: 'u1', clientName: 'Sarah Jenkins', category: 'Build Signal',
      problemSummary: activeProject.summary, urgency: 'high', timestamp: 'Just now', status: 'open', offers: []
    };
    setBroadcasts(prev => [newBroadcast, ...prev]);
    addNotification("Signal sent to local experts.", 'success');
  };

  const handleEndProject = async () => {
    if (!activeProjectId || !activeProject) return;
    setIsTyping(true);
    try {
      const chatHistory = [...activeProject.aiMessages, ...activeProject.expertMessages].map(m => `${m.role}: ${m.text}`).join('\n');
      const summaryContent = await geminiService.summarizeProjectConversation(chatHistory, sessionLiveHistory);
      const newSummary = { id: `s-${Date.now()}`, title: `Archived Expert Session - ${new Date().toLocaleDateString()}`, content: summaryContent, date: 'Just now' };
      setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, status: 'completed', summaries: [...p.summaries, newSummary], lastUpdated: 'Closed' } : p));
      handleStopLiveAI();
      setActiveProjectTab('summaries');
      addNotification(`Expert phase closed. Human chat disabled.`, 'success');
    } catch (err) {
      handleError(err);
      setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, status: 'completed' } : p));
      setActiveProjectTab('summaries');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async (text: string = inputText, imageBase64?: string, attachedFiles: DriveFile[] = pendingFiles) => {
    const finalImage = imageBase64 || pendingSnapshot;
    if (!text.trim() && !finalImage && attachedFiles.length === 0) return;
    if (activeProject?.status === 'completed' && activeProjectTab === 'expert') return;

    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: userRole === 'client' ? 'user' : 'expert', 
      text, 
      expertName: userRole === 'expert' ? currentExpert.name : undefined,
      canvasSnapshot: finalImage, 
      attachedFiles 
    };

    let targetId = activeProjectId;
    if (!targetId && userRole === 'client') {
      targetId = `proj-${Date.now()}`;
      const newProject: Project = {
        id: targetId, title: text.slice(0, 20) + '...', status: 'planning', lastUpdated: 'Just now', summary: text,
        aiMessages: [userMsg], expertMessages: [], media: [], files: [], summaries: []
      };
      setProjects(prev => [newProject, ...prev]);
      setActiveProjectId(targetId);
    } else {
      setProjects(prev => prev.map(p => p.id === targetId ? {
        ...p,
        aiMessages: activeProjectTab === 'ai' ? [...p.aiMessages, userMsg] : p.aiMessages,
        expertMessages: activeProjectTab === 'expert' ? [...p.expertMessages, userMsg] : p.expertMessages,
      } : p));
    }

    if (activeProjectTab === 'ai' || !activeProjectId) {
      setIsTyping(true);
      try {
        const response = await geminiService.getDIYAdvice(text, activeProject?.summary, finalImage, attachedFiles);
        const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: response.text };
        setProjects(prev => prev.map(p => p.id === targetId ? { ...p, aiMessages: [...p.aiMessages, aiMsg] } : p));
      } catch (e) { handleError(e); } finally { setIsTyping(false); }
    }

    setInputText('');
    setPendingSnapshot(undefined);
  };

  const handleCreateInvoice = (data: Omit<Invoice, 'id' | 'status' | 'createdAt'>) => {
    if (!activeProjectId) return;
    const inv: Invoice = { ...data, id: `inv-${Date.now()}`, status: 'pending', createdAt: new Date().toLocaleDateString() };
    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, invoice: inv } : p));
    setIsInvoiceModalOpen(false);
    addNotification("Billing request sent to client.", "success");
    const sysMsg: ChatMessage = { id: `sys-${Date.now()}`, role: 'system_summary', text: `INVOICE: ${inv.rateLabel} for ${inv.description}.` };
    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, expertMessages: [...p.expertMessages, sysMsg] } : p));
  };

  const handlePayInvoice = () => {
    if (!activeProjectId || !activeProject?.invoice) return;
    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, invoice: { ...p.invoice!, status: 'paid' } } : p));
    addNotification("Payment confirmed. Expert compensated.", "success");
  };

  const handleApproveOffer = (req: BroadcastRequest, expert: Professional) => {
    setBroadcasts(prev => prev.map(r => r.id === req.id ? { ...r, status: 'chatting', assignedExpertId: expert.id, assignedExpertName: expert.name } : r));
    setSelectedBroadcastForOffers(null);
    setProjects(prev => prev.map(p => {
      if (p.summary === req.problemSummary || p.id === activeProjectId) {
        return { 
          ...p, assignedProId: expert.id, assignedProName: expert.name, status: 'in-progress' as const,
          expertMessages: [{ id: 'e-1', role: 'expert', expertName: expert.name, text: `Connected! I've viewed your vault. How can I help with this build?` }]
        };
      }
      return p;
    }));
    setActiveProjectId(activeProjectId || projects[0].id);
    setCurrentView(AppView.WORKSPACE);
    setActiveProjectTab('expert');
    addNotification(`Discussion open with ${expert.name}.`, 'info');
  };

  const handleExpertOffer = (req: BroadcastRequest) => {
    setBroadcasts(prev => prev.map(r => r.id === req.id ? { ...r, status: 'offer_received', offers: [...r.offers, currentExpert.id] } : r));
    addNotification(`Expert ${currentExpert.name} has responded to a signal!`, 'offer');
  };

  const handleSavePost = (postId: string, collectionId: string) => {
    setCollections(prev => prev.map(c => 
      c.id === collectionId ? { ...c, postIds: [...c.postIds, postId] } : c
    ));
    addNotification("Post saved to collection.", "success");
  };

  const handleCreateCollection = (name: string) => {
    const newColl: Collection = { id: `coll-${Date.now()}`, name, postIds: [] };
    setCollections(prev => [...prev, newColl]);
  };

  const currentBroadcast = activeProject ? broadcasts.find(b => b.problemSummary === activeProject.summary) : null;

  if (hasApiKey === false) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white">
        <div className="bg-indigo-600/20 p-8 rounded-[3rem] border border-indigo-500/30 max-w-lg space-y-8 backdrop-blur-xl">
          <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-600/40">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tight">Connect Build Engine</h1>
            <p className="text-slate-400 font-medium">BuildSync requires a valid Gemini API key from a paid GCP project to power high-quality vision and real-time supervision.</p>
          </div>
          <button onClick={handleSelectKey} className="w-full bg-white text-slate-900 py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl hover:bg-slate-100 transition-all">Select API Key</button>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="block text-xs font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors">Learn about billing</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <div className="fixed top-8 right-8 z-[1000] flex flex-col gap-3 pointer-events-none">
        {notifications.map(note => (
          <div key={note.id} className="pointer-events-auto bg-white/90 backdrop-blur-2xl border border-indigo-100 p-5 rounded-[2rem] shadow-2xl flex items-start gap-4 animate-in slide-in-from-right duration-500 max-w-sm">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${note.type === 'success' || note.type === 'offer' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <div className="flex-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Signal Update</p><p className="text-sm font-bold text-slate-800 leading-tight">{note.message}</p></div>
          </div>
        ))}
      </div>

      <nav className="w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col py-6 px-4 gap-8">
        <div onClick={() => setCurrentView(AppView.WORKSPACE)} className="flex items-center gap-3 px-2 cursor-pointer group">
          <div className="bg-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">B</div>
          <div className="hidden md:block"><h1 className="font-black text-xl text-indigo-900 leading-none">BuildSync</h1><span className="text-[9px] font-black uppercase text-indigo-400 tracking-[0.2em] mt-1 bg-indigo-50 px-2 py-0.5 rounded-full block w-fit">Alpha</span></div>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          {userRole === 'client' ? (
            <>
              <button onClick={() => { setActiveProjectId(null); setCurrentView(AppView.WORKSPACE); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === AppView.WORKSPACE && !activeProjectId ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg><span className="hidden md:block text-sm font-bold">New Build</span></button>
              <button onClick={() => { setActiveProjectId(null); setCurrentView(AppView.PROJECT_VAULT); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative ${currentView === AppView.PROJECT_VAULT ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg><span className="hidden md:block text-sm font-bold">Project Vault</span>{hasPendingOffers && <span className="absolute top-2 right-2 flex h-3 w-3"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative h-3 w-3 rounded-full bg-emerald-500"></span></span>}</button>
              <button onClick={() => { setActiveProjectId(null); setCurrentView(AppView.LOCAL_EXPERTS); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === AppView.LOCAL_EXPERTS ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg><span className="hidden md:block text-sm font-bold">Local Experts</span></button>
            </>
          ) : (
            <>
              <button onClick={() => { setActiveProjectId(null); setCurrentView(AppView.EXPERT_POOL); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === AppView.EXPERT_POOL ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg><span className="hidden md:block text-sm font-bold">Request Pool</span></button>
              <button onClick={() => { setActiveProjectId(null); setCurrentView(AppView.EXPERT_PROJECTS); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === AppView.EXPERT_PROJECTS ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15" /></svg><span className="hidden md:block text-sm font-bold">Active Jobs</span></button>
            </>
          )}
          <button onClick={() => { setActiveProjectId(null); setCurrentView(AppView.BUILDERS_WALL); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === AppView.BUILDERS_WALL ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v12a2 2 0 01-2 2z" /></svg><span className="hidden md:block text-sm font-bold">Builders Wall</span></button>
        </div>
        <button onClick={() => { setUserRole(userRole === 'client' ? 'expert' : 'client'); setActiveProjectId(null); }} className="mt-auto bg-slate-900 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
           {userRole === 'client' ? 'Expert Console' : 'Client Mode'}
        </button>
      </nav>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="bg-white border-b border-slate-200 py-4 px-8 flex justify-between items-center z-10 shadow-sm">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{activeProjectId ? activeProject?.title : (userRole === 'client' ? "Build Workspace Alpha" : "Expert Signals")}</h2>
          <div onClick={() => { setActiveProjectId(null); setCurrentView(AppView.CLIENT_SETTINGS); }} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-all"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{userRole} Identity</span><img src={`https://picsum.photos/seed/${userRole}/100/100`} className="w-10 h-10 rounded-2xl border-2 border-slate-100" /></div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeProjectId && activeProject ? (
            <div className="max-w-6xl mx-auto h-full flex flex-col bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-xl min-h-[600px]">
              <div className="bg-slate-50 border-b border-slate-200 px-8 py-2 flex gap-8">
                {(['ai', 'expert', 'vault', 'summaries'] as const).map(tab => {
                   if (tab === 'expert' && !activeProject.assignedProId) return null;
                   if (activeProject.status === 'completed' && tab === 'expert') return null;
                   return (
                    <button key={tab} onClick={() => setActiveProjectTab(tab)} className={`text-[10px] font-black uppercase tracking-widest py-4 border-b-2 transition-all relative ${activeProjectTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                      {tab === 'ai' ? 'Neural Link' : tab === 'expert' ? 'Expert Chat' : tab === 'vault' ? 'Assets' : 'Records'}
                      {tab === 'expert' && isInvoicePending && userRole === 'client' && (
                        <span className="absolute top-2 -right-3 flex h-2 w-2">
                           <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                           <span className="relative h-2 w-2 rounded-full bg-emerald-500"></span>
                        </span>
                      )}
                    </button>
                   );
                })}
              </div>
              <div className="flex-1 flex flex-col relative bg-white overflow-hidden">
                {(activeProjectTab === 'ai' || (activeProjectTab === 'expert' && activeProject.status !== 'completed')) ? (
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {activeProjectTab === 'expert' && activeProject.assignedProId && (
                      <div className="flex justify-between items-center px-8 py-4 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full animate-pulse bg-blue-500"></div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linked: {activeProject.assignedProName}</span>
                        </div>
                        <div className="flex gap-2">
                           {userRole === 'expert' && !activeProject.invoice && (
                              <button onClick={() => setIsInvoiceModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm">
                                 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> Create Invoice
                              </button>
                           )}
                           <button onClick={handleEndProject} className="bg-white border border-rose-200 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center gap-2 shadow-sm">
                             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg> End Connection
                           </button>
                        </div>
                      </div>
                    )}
                    
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6">
                      {(activeProjectTab === 'ai' ? activeProject.aiMessages : activeProject.expertMessages).map(msg => {
                        if (msg.role === 'system_summary') return <div key={msg.id} className="flex justify-center"><div className="bg-slate-100 px-4 py-1.5 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest">{msg.text}</div></div>;
                        const isMyMsg = msg.role === (userRole === 'client' ? 'user' : 'expert');
                        return (
                          <div key={msg.id} className={`flex ${isMyMsg ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-[2rem] p-6 shadow-sm ${isMyMsg ? 'bg-indigo-600 text-white rounded-tr-none' : (msg.role === 'model' ? 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100' : 'bg-emerald-50 text-slate-800 rounded-tl-none border border-emerald-100')}`}>
                              <div className={`text-[9px] font-black uppercase tracking-widest mb-2 ${isMyMsg ? 'text-indigo-200' : (msg.role === 'model' ? 'text-indigo-600' : 'text-emerald-600')}`}>
                                {msg.role === 'user' ? 'Client' : (msg.role === 'model' ? 'BuildSync AI' : msg.expertName)}
                              </div>
                              <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                              {msg.canvasSnapshot && <img src={msg.canvasSnapshot} className="mt-4 rounded-xl max-h-48 border border-white/20 shadow-sm" />}
                            </div>
                          </div>
                        );
                      })}

                      {/* INVOICE CARD: Strictly in expert chat */}
                      {activeProjectTab === 'expert' && activeProject.invoice && (
                         <div className={`flex ${userRole === 'client' ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2`}>
                            <div className="max-w-md w-full bg-slate-900 text-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-800">
                                <div className="p-8 border-b border-slate-800 flex justify-between items-center">
                                    <div><p className="text-[10px] font-black text-slate-500 uppercase mb-1">Expert Invoice</p><h4 className="text-lg font-black tracking-tight">{activeProject.invoice.type === 'hourly' ? 'Hourly build Rate' : 'Fixed Project Fee'}</h4></div>
                                    <div className="bg-emerald-500/10 text-emerald-400 w-12 h-12 rounded-2xl flex items-center justify-center"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3z" /></svg></div>
                                </div>
                                <div className="p-8 space-y-6">
                                    <p className="text-sm font-medium text-slate-300 italic">"{activeProject.invoice.description}"</p>
                                    <div className="flex items-center justify-between py-6 border-y border-slate-800"><span className="text-[10px] font-black text-slate-500 uppercase">{activeProject.invoice.rateLabel}</span><span className="text-3xl font-black">${activeProject.invoice.amount}</span></div>
                                    {activeProject.invoice.status === 'paid' ? (
                                        <div className="flex items-center justify-center gap-3 bg-emerald-500/20 text-emerald-400 py-4 rounded-2xl font-black uppercase text-[10px]"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> Payment Confirmed</div>
                                    ) : userRole === 'client' ? (
                                        <button onClick={handlePayInvoice} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl transition-all">Approve & Release Funds</button>
                                    ) : (
                                        <div className="text-center"><div className="inline-flex items-center gap-2 text-amber-400 text-[10px] font-black uppercase"><div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div> Awaiting Client Payment</div></div>
                                    )}
                                </div>
                            </div>
                         </div>
                      )}
                      {isTyping && <div className="flex gap-1 p-2"><div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-75"></div></div>}
                    </div>

                    <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/50">
                      <div className="flex flex-wrap gap-2 mb-4">
                        <button onClick={() => setIsCameraOpen(true)} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm hover:border-indigo-400"><svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg> Snapshot</button>
                        <button onClick={() => setIsWhiteboardOpen(true)} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm hover:border-indigo-400"><svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> Workbench</button>
                        <button onClick={() => handleStartLiveAI()} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-emerald-700 transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> Live Call</button>
                        {userRole === 'client' && !activeProject?.assignedProId && (
                           <button onClick={currentBroadcast?.offers.length ? () => setSelectedBroadcastForOffers(currentBroadcast) : handleBroadcast} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border ${currentBroadcast?.offers.length ? 'bg-emerald-600 text-white border-emerald-500 animate-pulse' : 'bg-white border-slate-200 hover:border-indigo-400 text-slate-800'}`}>
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> {currentBroadcast?.offers.length ? `View ${currentBroadcast.offers.length} Offers` : 'Signal Experts'}
                           </button>
                        )}
                      </div>
                      <div className="flex gap-3 bg-white p-3 rounded-[2.5rem] shadow-xl border border-slate-200">
                         <input value={inputText} onChange={e => setInputText(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} className="flex-1 px-6 py-3 text-sm focus:outline-none font-medium" placeholder={`Message ${activeProjectTab === 'ai' ? 'Neural Link' : activeProject.assignedProName}...`} />
                         <button onClick={() => handleSendMessage()} className={`px-8 py-3 rounded-[2rem] font-black uppercase text-[10px] transition-all ${activeProjectTab === 'ai' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white`}>Send</button>
                      </div>
                    </div>
                  </div>
                ) : activeProjectTab === 'vault' ? (
                  <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-6 overflow-y-auto">
                    {activeProject.media.map(m => (<div key={m.id} className="bg-slate-50 rounded-3xl p-3 border border-slate-100 group hover:shadow-lg transition-all"><img src={m.url} className="w-full h-32 object-cover rounded-2xl mb-3" /><p className="text-[10px] font-black text-slate-700 truncate px-1">{m.name}</p></div>))}
                  </div>
                ) : (
                  <div className="p-8 space-y-8 overflow-y-auto h-full">
                    {activeProject.summaries.map(s => (<div key={s.id} className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-100 shadow-sm animate-in fade-in"><div className="flex justify-between items-start mb-6"><h5 className="text-xl font-black text-slate-800 tracking-tight">{s.title}</h5><span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{s.date}</span></div><div className="prose prose-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{s.content}</div></div>))}
                  </div>
                )}
              </div>
            </div>
          ) : currentView === AppView.WORKSPACE ? (
            <div className="max-w-4xl mx-auto h-full flex flex-col items-center justify-center text-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="space-y-4">
                <div className="bg-indigo-100 text-indigo-600 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Start your Alpha Vision</h2>
                <p className="text-slate-500 text-lg max-w-xl mx-auto font-medium">Describe your project or attach site photos to build smarter with Master AI guidance.</p>
              </div>

              <div className="w-full max-w-2xl bg-white p-4 rounded-[3rem] shadow-2xl border border-slate-200 flex gap-4 ring-8 ring-slate-50">
                <input value={inputText} onChange={e => setInputText(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} className="flex-1 px-8 py-4 text-lg focus:outline-none font-medium" placeholder="I want to build a cedar deck..." />
                <button onClick={() => handleSendMessage()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 transition-all flex items-center gap-2">
                   Start AI Build
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl">
                {[{ label: 'Repair Wiring', icon: '⚡' }, { label: 'Fix Leaks', icon: '💧' }, { label: 'Garden Design', icon: '🌿' }, { label: 'Home Remodel', icon: '🏠' }].map(item => (
                  <button key={item.label} onClick={() => setInputText(item.label)} className="bg-white p-6 rounded-3xl border border-slate-100 hover:border-indigo-400 hover:shadow-lg transition-all text-center group">
                    <div className="text-2xl mb-2 group-hover:scale-125 transition-transform">{item.icon}</div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : currentView === AppView.PROJECT_VAULT ? (
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map(p => (
                <button key={p.id} onClick={() => { setActiveProjectId(p.id); setCurrentView(AppView.WORKSPACE); setActiveProjectTab('ai'); }} className="bg-white p-10 rounded-[3rem] border border-slate-200 text-left hover:border-indigo-400 hover:shadow-2xl transition-all h-[320px] flex flex-col group shadow-sm">
                  <div className="flex justify-between items-start mb-6"><span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${p.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'}`}>{p.status}</span><span className="text-[10px] text-slate-400 font-bold uppercase">{p.lastUpdated}</span></div>
                  <h3 className="text-2xl font-black text-slate-900 mb-4 line-clamp-2 group-hover:text-indigo-600 transition-colors">{p.title}</h3>
                  <p className="text-slate-500 text-sm italic line-clamp-2 mb-auto">"{p.summary}"</p>
                  <div className="flex gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6 pt-6 border-t border-slate-50"><span>{p.aiMessages.length + p.expertMessages.length} Logs</span>{p.summaries.length > 0 && <span className="text-emerald-500 flex items-center gap-1"><div className="w-1 h-1 bg-emerald-500 rounded-full"></div> Record Ready</span>}</div>
                </button>
              ))}
            </div>
          ) : currentView === AppView.LOCAL_EXPERTS ? (
            <LocalExpertsList />
          ) : currentView === AppView.EXPERT_PROJECTS ? (
             <div className="max-w-6xl mx-auto space-y-16 pb-20">
               <section>
                 <div className="flex items-center gap-4 mb-8"><h3 className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.4em]">Active Engagements</h3><div className="h-px bg-emerald-100 flex-1"></div></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                   {projects.filter(p => p.assignedProId === currentExpert.id && p.status !== 'completed').map(p => (
                     <button key={p.id} onClick={() => { setActiveProjectId(p.id); setCurrentView(AppView.WORKSPACE); setActiveProjectTab('expert'); }} className="bg-white p-10 rounded-[3rem] border-2 border-emerald-100 text-left hover:border-emerald-400 hover:shadow-2xl transition-all h-[320px] flex flex-col group shadow-sm"><div className="flex justify-between items-start mb-6"><span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700">Open Job</span><span className="text-[10px] text-slate-400 font-bold uppercase">{p.lastUpdated}</span></div><h3 className="text-2xl font-black text-slate-900 mb-4 line-clamp-2 group-hover:text-emerald-600 transition-colors">{p.title}</h3><p className="text-slate-500 text-sm italic line-clamp-2 mb-auto">Sarah Jenkins</p><div className="flex gap-2 items-center text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-4"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Open Chat</div></button>
                   ))}
                 </div>
               </section>
             </div>
          ) : currentView === AppView.BUILDERS_WALL ? (
            <BuildersWall collections={collections} onSavePost={handleSavePost} onCreateCollection={handleCreateCollection} />
          ) : currentView === AppView.EXPERT_POOL ? (
            <ExpertDashboard requests={broadcasts} onOfferHelp={handleExpertOffer} />
          ) : currentView === AppView.CLIENT_SETTINGS ? (
            <ClientSettingsView onBack={() => setCurrentView(AppView.WORKSPACE)} userRole={userRole} isLocked={isSettingsLocked} setIsLocked={setIsSettingsLocked} notificationPrefs={notificationPrefs} setNotificationPrefs={setNotificationPrefs} />
          ) : <LocalExpertsList />}
        </div>
      </main>

      {isWhiteboardOpen && <Whiteboard onClose={() => setIsWhiteboardOpen(false)} onSendToAI={(snap, p) => { setIsWhiteboardOpen(false); handleSendMessage(p, snap); }} initialImage={imageToEdit} />}
      {isDrivePickerOpen && <GoogleDrivePicker onClose={() => setIsDrivePickerOpen(false)} onSelect={(f) => setIsDrivePickerOpen(false)} />}
      {isCameraOpen && <CameraCapture onClose={() => setIsCameraOpen(false)} onCapturePhoto={(snap) => { setIsCameraOpen(false); setPendingSnapshot(snap); }} onEditPhoto={(snap) => { setIsCameraOpen(false); setImageToEdit(snap); setIsWhiteboardOpen(true); }} />}
      {isInvoiceModalOpen && <InvoiceModal onClose={() => setIsInvoiceModalOpen(false)} onSubmit={handleCreateInvoice} expertName={currentExpert.name} />}
      
      {isLiveActive && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in fade-in duration-500">
           <div className="relative flex-1">
              <video ref={liveVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40"></div>
              <div className="absolute top-8 left-8 flex items-center gap-4"><div className="bg-red-500 px-4 py-2 rounded-full border border-white/20 flex items-center gap-2 animate-pulse"><div className="w-2 h-2 bg-white rounded-full"></div><span className="text-[10px] font-black text-white uppercase tracking-widest">Vision Supervision</span></div></div>
              <div className="absolute bottom-32 left-8 right-8 text-center"><div className="bg-black/40 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 max-w-3xl mx-auto"><p className="text-white text-xl font-medium italic">{liveTranscription || "Neural link stable..."}</p></div></div>
              <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-6">
                 <button onClick={handleStopLiveAI} className="bg-white/10 hover:bg-red-600 text-white w-16 h-16 rounded-full flex items-center justify-center border border-white/20 transition-all"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
           </div>
        </div>
      )}

      {selectedBroadcastForOffers && (<MultiOfferModal broadcast={selectedBroadcastForOffers} pros={pros.filter(p => selectedBroadcastForOffers.offers.includes(p.id))} onClose={() => setSelectedBroadcastForOffers(null)} onApprove={handleApproveOffer} />)}
    </div>
  );
};

export default App;
