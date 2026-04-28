import React, { useState, useRef, useEffect } from 'react';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

import { 
  Plus, 
  Search, 
  Layers, 
  Zap, 
  Settings, 
  ArrowUp, 
  Mic, 
  Paperclip, 
  ChevronDown, 
  ChevronRight as ChevronRightIcon,
  Folder, 
  FolderOpen,
  MessageSquare,
  Layout,
  Terminal,
  FileCode,
  Globe,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Maximize2,
  X,
  PlusCircle,
  MoreVertical,
  Trash2,
  FileText,
  FileJson,
  FileEdit,
  Database,
  Shield,
  Box,
  PanelRight,
  Save,
  LogOut,
  Clock,
  Hand,
  Maximize,
  Minus,
  Square,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatWithCodex } from './services/geminiService';

// Types
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Project {
  id: string;
  name: string;
  timestamp: string;
  messages: Message[];
  files: any[]; // Changed to support nested structure
}

// Realistic web project file structure
const WEB_PROJECT_STARTER = [
  { name: 'agent', type: 'folder', children: [{ name: 'core.py', type: 'file' }, { name: 'utils.py', type: 'file' }] },
  { name: 'auth', type: 'folder', children: [{ name: 'login.py', type: 'file' }, { name: 'session.py', type: 'file' }] },
  { name: 'automation', type: 'folder', children: [{ name: 'tasks.json', type: 'file' }] },
  { name: 'backend', type: 'folder', children: [{ name: 'api.py', type: 'file' }, { name: 'models.py', type: 'file' }] },
  { name: 'dashboard', type: 'folder', children: [{ name: 'index.html', type: 'file' }, { name: 'style.css', type: 'file' }] },
  { name: 'docs', type: 'folder', children: [{ name: 'api.md', type: 'file' }, { name: 'setup.md', type: 'file' }] },
  { name: 'frontend', type: 'folder', children: [{ name: 'main.tsx', type: 'file' }, { name: 'App.tsx', type: 'file' }] },
  { name: 'hardware', type: 'folder', children: [{ name: 'drivers.py', type: 'file' }] },
  { name: 'installer', type: 'folder', children: [{ name: 'setup.sh', type: 'file' }] },
  { name: 'openclaw-main', type: 'folder', children: [{ name: 'init.py', type: 'file' }] },
  { name: 'payments', type: 'folder', children: [{ name: 'stripe.py', type: 'file' }] },
  { name: 'safe_pc_assistant', type: 'folder', children: [{ name: 'service.py', type: 'file' }] },
  { name: 'workspace', type: 'folder', children: [{ name: 'notes.txt', type: 'file' }] },
  { name: 'za', type: 'folder', children: [{ name: 'extra.py', type: 'file' }] },
  { name: 'zip_app', type: 'folder', children: [{ name: 'package.zip', type: 'file' }] },
  { name: 'README.md', type: 'file' },
  { name: 'requirements.txt', type: 'file' },
  { name: 'smart_pc.db', type: 'file', isDb: true },
  { name: 'start_system.py', type: 'file', isPython: true },
  { name: 'uvicorn.err.log', type: 'file' },
  { name: 'uvicorn.out.log', type: 'file' },
];

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('codex_projects');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isToolMenuOpen, setIsToolMenuOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState({ id: 'vscode', label: 'VS Code', icon: <FileCode size={18} className="text-[#007acc]" />, color: '#ffffff' });
  const [sidebarView, setSidebarView] = useState<'chat' | 'files'>('chat');
  const [selectedFile, setSelectedFile] = useState<string | null>('App.tsx');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const openLocalVSCode = () => {
    window.location.href = 'vscode://';
    if (activeProjectId) {
      setProjects(prev => prev.map(p => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            messages: [...p.messages, { role: 'assistant', content: "Protocol command sent: Attempting to open Visual Studio Code on your PC." }]
          };
        }
        return p;
      }));
    }
  };

  const openLocalAntigravity = () => {
    // Protocol for Google's Antigravity system
    window.location.href = 'antigravity://';
    if (activeProjectId) {
      setProjects(prev => prev.map(p => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            messages: [...p.messages, { role: 'assistant', content: "Protocol command sent: Attempting to open Google Antigravity on your PC." }]
          };
        }
        return p;
      }));
    }
  };

  const openLocalGitBash = () => {
    // Protocol for opening local Git Bash
    // Note: requires user system configuration or specific terminal plugins
    window.location.href = 'git-bash://'; 
    if (activeProjectId) {
      setProjects(prev => prev.map(p => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            messages: [...p.messages, { role: 'assistant', content: "Protocol command sent: Attempting to open Git Bash on your PC. If it doesn't open, ensure you have a protocol handler registered for 'git-bash://'." }]
          };
        }
        return p;
      }));
    }
  };

  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([
    'Welcome to Git Bash (v2.44.0)',
    'Type "help" to see available commands.',
    ''
  ]);
  const [terminalInput, setTerminalInput] = useState('');

  const handleTerminalCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput.trim().toLowerCase();
    const newLines = [...terminalLines, `user@codex-pc MINGW64 ~/project$ ${terminalInput}`];
    
    // Command simulation logic
    if (cmd === 'help') {
      newLines.push('Available commands: help, ls, clear, npm start, npm run build, git status, whoami');
    } else if (cmd === 'ls') {
      newLines.push('src/  public/  index.html  package.json  vite.config.ts  README.md');
    } else if (cmd === 'clear') {
      setTerminalLines([]);
      setTerminalInput('');
      return;
    } else if (cmd === 'npm start' || cmd === 'npm run dev') {
      newLines.push('> react-example@0.0.0 dev');
      newLines.push('> vite');
      newLines.push('');
      newLines.push('  VITE v5.2.0  ready in 153 ms');
      newLines.push('');
      newLines.push('  ➜  Local:   http://localhost:3000/');
      newLines.push('  ➜  Network: use --host to expose');
    } else if (cmd === 'git status') {
      newLines.push('On branch main');
      newLines.push('Your branch is up to date with "origin/main".');
      newLines.push('');
      newLines.push('nothing to commit, working tree clean');
    } else if (cmd === 'whoami') {
      newLines.push('developer');
    } else {
      newLines.push(`bash: ${cmd}: command not found`);
    }

    setTerminalLines(newLines);
    setTerminalInput('');
  };

  const openLocalExplorer = () => {
    // Attempting to trigger system file explorer
    window.location.href = 'file://'; 
    if (activeProjectId) {
      setProjects(prev => prev.map(p => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            messages: [...p.messages, { role: 'assistant', content: "Protocol command sent: Attempting to open your local File Explorer. Restricted by browser security in some environments." }]
          };
        }
        return p;
      }));
    }
  };

  const [micActive, setMicActive] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [selectedModel, setSelectedModel] = useState({ name: 'GPT-4o', icon: <Zap size={14} className="fill-gray-400 text-gray-400" /> });
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MODELS = [
    { name: 'GPT-4o', icon: <Zap size={14} className="fill-gray-400 text-gray-400" /> },
    { name: 'Gemini 1.5 Pro', icon: <Shield size={14} className="text-purple-500" /> },
    { name: 'Gemini 1.5 Flash', icon: <Zap size={14} className="text-yellow-500" /> },
    { name: 'Claude 3.5 Sonnet', icon: <Box size={14} className="text-orange-500" /> },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileName = files[0].name;
      
      let targetId = activeProjectId;
      if (!targetId) {
        const newId = Date.now().toString();
        const newProject: Project = {
          id: newId,
          name: fileName.substring(0, 20),
          timestamp: 'Just now',
          messages: [],
          files: WEB_PROJECT_STARTER
        };
        setProjects([newProject, ...projects]);
        setActiveProjectId(newId);
        targetId = newId;
      }

      setProjects(prev => prev.map(p => {
        if (p.id === targetId) {
          return {
            ...p,
            messages: [...p.messages, { role: 'assistant', content: `Success! I've uploaded "${fileName}" and integrated it into your project structure.` }]
          };
        }
        return p;
      }));
    }
  };

  const toggleMic = () => {
    if (micActive) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setMicActive(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setMicActive(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => prev + (prev ? " " : "") + transcript);
        setMicActive(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setMicActive(false);
      };

      recognition.onend = () => {
        setMicActive(false);
      };

      recognitionRef.current = recognition;
    }

    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error('Recognition start error:', e);
      // If already started, just toggle active state
      setMicActive(true);
    }
  };

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  useEffect(() => {
    localStorage.setItem('codex_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeProject?.messages]);

  const createNewProject = () => {
    const newProject: Project = {
      id: Date.now().toString(),
      name: `Untitled Project ${projects.length + 1}`,
      timestamp: 'Just now',
      messages: [],
      files: WEB_PROJECT_STARTER
    };
    setProjects([newProject, ...projects]);
    setActiveProjectId(newProject.id);
    setSidebarView('chat');
  };

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    if (activeProjectId === id) {
      setActiveProjectId(newProjects.length > 0 ? newProjects[0].id : null);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    let currentProjectId = activeProjectId;
    let currentProjects = [...projects];

    if (!currentProjectId) {
      const newProject: Project = {
        id: Date.now().toString(),
        name: inputValue.trim().substring(0, 20) + (inputValue.length > 20 ? '...' : ''),
        timestamp: 'Just now',
        messages: [],
        files: WEB_PROJECT_STARTER
      };
      currentProjects = [newProject, ...projects];
      currentProjectId = newProject.id;
      setProjects(currentProjects);
      setActiveProjectId(currentProjectId);
    }

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    const projectIndex = currentProjects.findIndex(p => p.id === currentProjectId);
    const updatedMessages: Message[] = [...currentProjects[projectIndex].messages, { role: 'user', content: userMessage }];
    
    currentProjects[projectIndex] = {
      ...currentProjects[projectIndex],
      messages: updatedMessages
    };
    setProjects([...currentProjects]);

    try {
      const history = updatedMessages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
      
      const response = await chatWithCodex(userMessage, history);
      
      const finalProjects = [...currentProjects];
      finalProjects[projectIndex] = {
        ...finalProjects[projectIndex],
        messages: [...updatedMessages, { role: 'assistant', content: response || "I'm sorry, I couldn't process that." }]
      };
      setProjects(finalProjects);
    } catch (error) {
      const errProjects = [...currentProjects];
      errProjects[projectIndex] = {
        ...errProjects[projectIndex],
        messages: [...updatedMessages, { role: 'assistant', content: "Error: Make sure GEMINI_API_KEY is configured." }]
      };
      setProjects(errProjects);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-white font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-100 flex flex-col h-full bg-[#fcfcfc]">
        <div className="p-4 flex items-center justify-between text-gray-400">
          <div className="flex gap-2">
            <ChevronLeft size={18} className="cursor-not-allowed opacity-40" />
            <ChevronRight size={18} className="cursor-not-allowed opacity-40" />
            <RotateCcw size={18} className="cursor-pointer hover:text-gray-600 ml-2" />
          </div>
          <div className="flex gap-4">
            <span className="text-[10px] font-medium cursor-pointer hover:text-gray-600">File</span>
            <span className="text-[10px] font-medium cursor-pointer hover:text-gray-600">Edit</span>
            <span className="text-[10px] font-medium cursor-pointer hover:text-gray-600">View</span>
          </div>
        </div>

        <nav className="px-2 mt-4 space-y-1">
          <SidebarItem 
            icon={<MessageSquare size={18} />} 
            label="Chat" 
            active={sidebarView === 'chat'} 
            onClick={() => setSidebarView('chat')} 
          />
          <SidebarItem 
            icon={<Folder size={18} />} 
            label="File Explorer" 
            active={sidebarView === 'files'}
            onClick={() => setSidebarView(sidebarView === 'files' ? 'chat' : 'files')} 
          />
          <SidebarItem icon={<Search size={18} />} label="Search" />
          <SidebarItem icon={<Layers size={18} />} label="Plugins" />
        </nav>

        <div className="mt-8 px-4 flex-1 overflow-y-auto overflow-x-hidden border-t border-gray-50 pt-4">
          <AnimatePresence mode="wait">
            {sidebarView === 'chat' ? (
              <motion.div
                key="projects-view"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                    Projects
                  </h3>
                  <button 
                    onClick={createNewProject}
                    className="p-1 hover:bg-gray-100 rounded-md transition-colors text-gray-400 hover:text-gray-600"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="space-y-1">
                  {projects.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-xs text-gray-400">No projects yet</p>
                    </div>
                  ) : (
                    projects.map(project => (
                      <ProjectItem 
                        key={project.id} 
                        project={project} 
                        isActive={project.id === activeProjectId}
                        onClick={() => setActiveProjectId(project.id)}
                        onDelete={(e: React.MouseEvent) => deleteProject(project.id, e)}
                      />
                    ))
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="all-files-view"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                    System Files
                  </h3>
                  <Folder size={14} className="text-gray-400" />
                </div>

                <div className="space-y-0.5">
                  {activeProject && activeProject.messages.length > 0 ? (
                    activeProject.files.map((item: any, idx: number) => (
                      <FileTreeItem 
                        key={idx} 
                        item={item} 
                        depth={0} 
                        activeFile={selectedFile}
                        onFileClick={(name: string) => {
                          setSelectedFile(name);
                        }} 
                      />
                    ))
                  ) : (
                    <div className="text-center py-12 px-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Folder size={24} className="text-gray-200" />
                      </div>
                      <p className="text-xs text-gray-400 font-medium">No files yet</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-auto">
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-gray-500">
            <div className="flex items-center gap-2 cursor-pointer hover:text-gray-800 transition-colors">
              <Settings size={18} />
              <span className="text-sm font-medium">Settings</span>
            </div>
            <button className="text-xs font-semibold bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 hover:bg-gray-100 transition-all">
              Upgrade
            </button>
          </div>

          <div 
            onClick={() => {
              setSidebarView('chat');
              setSelectedFile(null);
            }}
            className="p-4 border-t border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors bg-white group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white shadow-sm">
                JD
              </div>
              <div className="truncate">
                <p className="text-[11px] font-bold text-gray-800 truncate">John Doe</p>
                <p className="text-[9px] text-gray-500">Pro Developer</p>
              </div>
            </div>
            <div className="flex gap-1 text-gray-300 group-hover:text-gray-500 transition-colors">
               <LogOut size={14} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative bg-white overflow-hidden">
        {/* Top Header Row */}
        <div className="flex items-center justify-between px-6 pt-4 h-16 shrink-0 z-20 bg-white">
          <div className="flex items-center gap-2">
            <span className="bg-purple-100 text-purple-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="text-sm">✦</span> Get Plus
            </span>
          </div>
               <div className="flex items-center gap-4">
            {/* Realistic Header Controls from Image */}
            <div className="flex items-center gap-4">
               <div className="relative">
                <button 
                  onClick={() => setIsToolMenuOpen(!isToolMenuOpen)}
                  className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-gray-100 hover:border-gray-200 shadow-sm transition-all h-10 min-w-[90px]"
                >
                  <div className="w-6 h-6 flex items-center justify-center">
                    {selectedTool.icon}
                  </div>
                  <ChevronDown size={18} className="text-gray-400" />
                </button>
                
                <AnimatePresence>
                  {isToolMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 p-1"
                    >
                      <ToolOption 
                        icon={<FileCode className="text-[#007acc]" />} 
                        label="VS Code" 
                        active={selectedTool.id === 'vscode'} 
                        onClick={() => {
                          setSelectedTool({ id: 'vscode', label: 'VS Code', icon: <FileCode size={18} className="text-[#007acc]" />, color: '#ffffff' });
                          setIsToolMenuOpen(false);
                          if (!selectedFile) setSelectedFile('App.tsx');
                          openLocalVSCode();
                        }}
                      />
                      <ToolOption 
                        icon={<Zap className="text-[#333]" />} 
                        label="Antigravity" 
                        active={selectedTool.id === 'antigravity'}
                        onClick={() => {
                          setSelectedTool({ id: 'antigravity', label: 'Antigravity', icon: <Zap size={18} className="text-[#333]" />, color: '#ffffff' });
                          setIsToolMenuOpen(false);
                          if (!selectedFile) setSelectedFile('App.tsx');
                          openLocalAntigravity();
                        }}
                      />
                      <ToolOption 
                        icon={<Folder className="text-yellow-500" />} 
                        label="File Explorer" 
                        active={selectedTool.id === 'files'}
                        onClick={() => {
                          setSelectedTool({ id: 'files', label: 'File Explorer', icon: <Folder size={18} className="text-yellow-500" />, color: '#ffffff' });
                          setIsToolMenuOpen(false);
                          setSidebarView('files');
                        }}
                      />
                      <ToolOption 
                        icon={<Terminal className="text-gray-600" />} 
                        label="Git Bash" 
                        active={selectedTool.id === 'bash'}
                        onClick={() => {
                          setSelectedTool({ id: 'bash', label: 'Git Bash', icon: <Terminal size={18} className="text-gray-600" />, color: '#ffffff' });
                          setIsToolMenuOpen(false);
                          setIsTerminalOpen(true);
                          openLocalGitBash();
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-6 w-[1px] bg-gray-200"></div>

              <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-2xl p-1 shadow-sm h-10">
                <button 
                  className={`p-1.5 rounded-xl transition-all ${isTerminalOpen ? 'bg-gray-100 text-gray-900 border border-gray-200 shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
                  onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                >
                  <Terminal size={20} />
                </button>
                <button 
                  className={`p-1.5 rounded-xl transition-all ${sidebarView === 'files' ? 'bg-gray-100 text-gray-900 border border-gray-200 shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
                  onClick={() => setSidebarView(sidebarView === 'files' ? 'chat' : 'files')}
                >
                  <Folder size={20} />
                </button>
                <button 
                  className={`p-1.5 rounded-xl transition-all ${sidebarView === 'chat' ? 'bg-gray-100 text-gray-900 border border-gray-200 shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
                  onClick={() => setSidebarView('chat')}
                >
                  <PanelRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full flex flex-col pt-4 overflow-hidden relative bg-white">
          <AnimatePresence mode="wait">
            {sidebarView === 'chat' ? (
              <motion.div
                key="chat-area"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col max-w-4xl mx-auto w-full"
              >
                {!activeProject || activeProject.messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center -translate-y-12 px-6">
                    <h1 className="text-3xl font-medium text-gray-900 mb-12 text-center max-w-lg leading-tight">
                      What should we work on in {activeProject?.name || 'Codex'}?
                    </h1>
                    
                    <div className="w-full max-w-2xl px-4">
                      <ChatInput 
                        value={inputValue}
                        onChange={setInputValue}
                        onSubmit={handleSend}
                        isLoading={isLoading}
                        placeholder="Ask Codex anything. @ to use plugins or mention files"
                        onUploadClick={() => fileInputRef.current?.click()}
                        toggleMic={toggleMic}
                        micActive={micActive}
                        selectedModel={selectedModel}
                        onModelClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                        isModelMenuOpen={isModelMenuOpen}
                        models={MODELS}
                        onSelectModel={(m: any) => { setSelectedModel(m); setIsModelMenuOpen(false); }}
                      />
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileUpload} 
                        accept="image/*,.zip,.json,.tsx,.ts,.js,.html"
                      />
                    </div>

                    <AnimatePresence>
                      {isTerminalOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 200, opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="w-full max-w-2xl mt-8 bg-[#0c0c0c] rounded-xl border border-gray-800 shadow-2xl flex flex-col overflow-hidden"
                        >
                          <div className="bg-[#1a1a1a] px-4 py-2 flex items-center justify-between border-b border-gray-800">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Terminal size={14} className="text-gray-400" />
                                <span className="text-[10px] font-bold text-gray-300 uppercase">Git Bash</span>
                              </div>
                              <button 
                                onClick={openLocalGitBash}
                                className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] bg-[#333] text-gray-300 rounded hover:bg-[#444] transition-colors border border-gray-700"
                              >
                                <Terminal size={10} />
                                Open Local
                              </button>
                            </div>
                            <button onClick={() => setIsTerminalOpen(false)} className="text-gray-500 hover:text-white">
                              <X size={12} />
                            </button>
                          </div>
                          <div className="flex-1 p-4 font-mono text-[12px] overflow-y-auto no-scrollbar text-green-400">
                            {terminalLines.map((line, idx) => <div key={idx}>{line}</div>)}
                            <form onSubmit={handleTerminalCommand} className="flex gap-2">
                              <span className="shrink-0">$</span>
                              <input
                                type="text"
                                value={terminalInput}
                                onChange={(e) => setTerminalInput(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-gray-200"
                              />
                            </form>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden px-4 md:px-6">
                    <div ref={scrollRef} className="flex-1 overflow-y-auto py-8 space-y-8 scroll-smooth no-scrollbar">
                      {activeProject.messages.map((msg, i) => (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={i}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${
                            msg.role === 'user' 
                              ? 'bg-gray-900 text-white' 
                              : 'bg-white border border-gray-100 text-gray-900 shadow-sm'
                          }`}>
                            <p className="text-sm font-[450] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </motion.div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm flex items-center gap-1.5 min-w-[60px] justify-center">
                            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <AnimatePresence>
                      {isTerminalOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 260, opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mb-4 bg-[#0c0c0c] rounded-xl border border-gray-800 shadow-2xl flex flex-col overflow-hidden mx-1"
                        >
                          <div className="bg-[#1a1a1a] px-4 py-2 flex items-center justify-between border-b border-gray-800">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Terminal size={14} className="text-gray-400" />
                                <span className="text-[11px] font-bold text-gray-300 tracking-wide uppercase">Git Bash - user@codex-pc</span>
                              </div>
                              <button 
                                onClick={openLocalGitBash}
                                className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] bg-[#333] text-gray-300 rounded hover:bg-[#444] transition-colors border border-gray-700"
                              >
                                <Terminal size={12} />
                                Open Local
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setTerminalLines([])} className="p-1 hover:bg-[#333] rounded text-gray-400 transition-colors">
                                <RotateCcw size={12} />
                              </button>
                              <button onClick={() => setIsTerminalOpen(false)} className="p-1 hover:bg-[#333] rounded text-gray-400 transition-colors">
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                          <div className="flex-1 p-4 font-mono text-[13px] overflow-y-auto no-scrollbar text-green-400">
                            {terminalLines.map((line, idx) => (
                              <div key={idx} className="mb-1 leading-relaxed">
                                {line.startsWith('user@') ? (
                                  <span className="text-green-400">{line}</span>
                                ) : line.includes('npm') || line.includes('VITE') ? (
                                  <span className="text-blue-400">{line}</span>
                                ) : (
                                  <span className="text-gray-300">{line}</span>
                                )}
                              </div>
                            ))}
                            <form onSubmit={handleTerminalCommand} className="flex items-center gap-2 mt-2">
                              <span className="text-green-400 shrink-0">user@codex-pc MINGW64 ~/project$</span>
                              <input
                                type="text"
                                value={terminalInput}
                                onChange={(e) => setTerminalInput(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-gray-200"
                                autoFocus
                              />
                            </form>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="pb-8 pt-4">
                      <ChatInput 
                        value={inputValue}
                        onChange={setInputValue}
                        onSubmit={handleSend}
                        isLoading={isLoading}
                        placeholder="Continue building or ask for changes..."
                        onUploadClick={() => fileInputRef.current?.click()}
                        toggleMic={toggleMic}
                        micActive={micActive}
                        selectedModel={selectedModel}
                        onModelClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                        isModelMenuOpen={isModelMenuOpen}
                        models={MODELS}
                        onSelectModel={(m: any) => { setSelectedModel(m); setIsModelMenuOpen(false); }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="editor-area"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex overflow-hidden bg-white"
              >
                {/* Unified Editor & Explorer Layout */}
                <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
                  {/* Tabs Area */}
                  <div className="flex items-center bg-[#252526] h-10 border-b border-[#111] shrink-0 overflow-x-auto no-scrollbar">
                    <div className="flex items-center h-full">
                       <EditorTab icon={<FileText size={12} className="text-gray-400" />} label="openclaw-alignment" />
                       <EditorTab icon={<FileText size={12} className="text-gray-400" />} label="uvicorn.err.log" />
                       <EditorTab 
                          icon={<div className="bg-yellow-500 text-[8px] font-bold px-0.5 rounded-[1px] text-black">JS</div>} 
                          label="app.js" 
                          active={true} 
                        />
                       <div className="px-3 text-gray-500 hover:text-white cursor-pointer"><Plus size={14} /></div>
                    </div>
                  </div>

                  {/* Breadcrumbs / Editor Path Header */}
                  <div className="flex items-center bg-[#1e1e1e] px-4 h-8 shrink-0 justify-between">
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                      <span className="hover:text-gray-300 cursor-pointer">OpenChat</span>
                      <ChevronRightIcon size={8} />
                      <span className="hover:text-gray-300 cursor-pointer">frontend</span>
                      <ChevronRightIcon size={8} />
                      <span className="text-gray-300 font-medium">app.js</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-500">
                      <PanelRight size={12} className="cursor-pointer hover:text-gray-300" />
                    </div>
                  </div>
                  
                  {selectedFile ? (
                    <div className="flex-1 flex overflow-hidden">
                      <div className="w-12 bg-[#1e1e1e] text-[#858585] text-right select-none py-6 pr-3 border-r border-[#333] flex flex-col gap-0 text-[12px] shrink-0">
                        {Array.from({ length: 100 }).map((_, i) => (
                          <div key={i} className="leading-6 h-6">{i + 1}</div>
                        ))}
                      </div>
                      <div className="flex-1 p-6 overflow-y-auto font-mono text-[13px] leading-relaxed text-gray-300 scroll-smooth">
                        <FileContentPreview fileName={selectedFile} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-[#1e1e1e]">
                      <div className="w-20 h-20 bg-[#252526] rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                        <FileCode size={40} className="text-[#333]" />
                      </div>
                      <h3 className="text-white font-medium mb-1">Select a file</h3>
                      <p className="text-xs text-gray-500 max-w-[240px] text-center leading-relaxed">
                        Choose a project file from the list on the right to view its content.
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Sidebar - File Explorer (Integrated) */}
                <div className="w-64 border-l border-gray-100 flex flex-col bg-white">
                  <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-800">All files</h2>
                    <div className="flex items-center gap-2">
                       <Plus size={14} className="text-gray-400 hover:text-gray-600 cursor-pointer" />
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto py-3 px-2 no-scrollbar">
                    {activeProject && activeProject.messages.length > 0 ? (
                      <div className="space-y-0.5">
                        {activeProject.files.map((item: any, idx: number) => (
                          <FileTreeItem 
                            key={idx} 
                            item={item} 
                            depth={0}
                            activeFile={selectedFile}
                            onFileClick={(name: string) => setSelectedFile(name)} 
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none px-4 text-center">
                        <FolderOpen size={48} className="text-gray-400 mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Empty Explorer</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
      {/* Window Controls */}
      <div className="absolute top-4 left-4 flex gap-2 z-[100]">
        <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] border border-[#e0443e]"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] border border-[#dea123]"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f] border border-[#1aab29]"></div>
      </div>
    </div>
  );
}

// Sub-components
function FileContentPreview({ fileName }: { fileName: string }) {
  const isPython = fileName.endsWith('.py');
  const isJS = fileName.endsWith('.js') || fileName.endsWith('.ts') || fileName.endsWith('.tsx');
  const isHTML = fileName.endsWith('.html');
  const isCSS = fileName.endsWith('.css');
  const isJSON = fileName.endsWith('.json');
  const isMD = fileName.endsWith('.md');
  const isLog = fileName.endsWith('.log');
  const isDB = fileName.endsWith('.db');

  if (isMD) {
    return (
      <div className="space-y-6 text-gray-200">
        <h1 className="text-3xl font-bold border-b border-[#333] pb-4"># {fileName}</h1>
        <p className="text-gray-400 leading-relaxed text-lg">
          Welcome to the documentation for <span className="text-purple-400 font-bold">{fileName}</span>.
          This project represents a mission-critical AI-driven system interface.
        </p>
        <div className="bg-[#2a2d2e] p-6 rounded-xl border border-[#333] shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-3">Project Overview</h2>
          <ul className="space-y-2 list-disc list-inside text-gray-400">
            <li>Modern UI/UX with Tailwind CSS</li>
            <li>Real-time Speech recognition integration</li>
            <li>Multi-project workspace management</li>
            <li>Integrated development environment preview</li>
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-[#252526] rounded-lg border border-[#333]">
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Build Status</h3>
            <span className="text-green-500 font-mono">Passing v2.4.1</span>
          </div>
          <div className="p-4 bg-[#252526] rounded-lg border border-[#333]">
            <h3 className="text-xs font-bold uppercase text-gray-500 mb-2">Coverage</h3>
            <span className="text-blue-400 font-mono">98.2%</span>
          </div>
        </div>
      </div>
    );
  }

  if (isDB) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
        <div className="p-8 bg-purple-500/10 rounded-full mb-6">
          <Database size={64} className="text-purple-500 opacity-60" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">SQLite Database</h2>
        <p className="text-gray-500 mb-8 max-w-sm">Binary storage format detected. Showing system metadata summary for the active database.</p>
        
        <div className="w-full max-w-md bg-[#252526] border border-[#333] rounded-xl overflow-hidden shadow-2xl">
          <div className="bg-[#333] px-6 py-3 border-b border-[#444] flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Active Schema</span>
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
          </div>
          <div className="p-6 space-y-4 text-left">
            {[
              { name: 'users', count: 324, size: '4.2MB' },
              { name: 'projects', count: 12, size: '0.8MB' },
              { name: 'system_logs', count: 1240, size: '12.5MB' },
              { name: 'auth_tokens', count: 86, size: '0.2MB' }
            ].map(table => (
              <div key={table.name} className="flex justify-between items-center group">
                <div className="flex items-center gap-2">
                  <Database size={10} className="text-gray-600" />
                  <span className="text-sm text-gray-300 font-medium">{table.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-600">{table.count} rows</span>
                  <span className="text-[10px] text-gray-700 bg-[#1a1a1a] px-1.5 py-0.5 rounded border border-[#333]">{table.size}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-mono text-[13px] leading-relaxed select-text">
       {/* Code styling mimicking the image */}
       <div className="mb-6">
        <span className="text-purple-400">const</span> <span className="text-yellow-200">state</span> = {'{'}<br/>
        &nbsp;&nbsp;<span className="text-orange-300">token</span>: <span className="text-blue-400">localStorage</span>.<span className="text-yellow-100">getItem</span>(<span className="text-green-300">"token"</span>) || <span className="text-green-300">""</span>,<br/>
        &nbsp;&nbsp;<span className="text-orange-300">deviceId</span>: <span className="text-blue-400">localStorage</span>.<span className="text-yellow-100">getItem</span>(<span className="text-green-300">"device_id"</span>) || <span className="text-green-300">""</span>,<br/>
        &nbsp;&nbsp;<span className="text-orange-300">gatewayToken</span>: <span className="text-green-300">""</span>,<br/>
        &nbsp;&nbsp;<span className="text-orange-300">gatewaySocket</span>: <span className="text-purple-400">null</span>,<br/>
        &nbsp;&nbsp;<span className="text-orange-300">selectedTargetDeviceId</span>: <span className="text-blue-400">localStorage</span>.<span className="text-yellow-100">getItem</span>(<span className="text-green-300">"target"</span>),<br/>
        &nbsp;&nbsp;<span className="text-orange-300">terminalOpen</span>: <span className="text-purple-400">false</span>,<br/>
        &nbsp;&nbsp;<span className="text-orange-300">filesOpen</span>: <span className="text-purple-400">false</span>,<br/>
        &nbsp;&nbsp;<span className="text-orange-300">previewOpen</span>: <span className="text-purple-400">false</span>,<br/>
        &nbsp;&nbsp;<span className="text-orange-300">currentFilePath</span>: <span className="text-green-300">""</span>,<br/>
        &nbsp;&nbsp;<span className="text-orange-300">currentDirectory</span>: <span className="text-blue-400">localStorage</span>.<span className="text-yellow-100">getItem</span>(<span className="text-green-300">"file_di"</span>),<br/>
        &nbsp;&nbsp;<span className="text-orange-300">previewUrl</span>: <span className="text-blue-400">localStorage</span>.<span className="text-yellow-100">getItem</span>(<span className="text-green-300">"preview_url"</span>)<br/>
        {'};'}<br/>
      </div>

      <div className="mb-6 space-y-1">
        <span className="text-purple-400">const</span> <span className="text-yellow-200">pageParams</span> = <span className="text-purple-400">new</span> <span className="text-blue-300">URLSearchParams</span>(<span className="text-blue-400">window</span>.<span className="text-blue-400">location</span>.<span className="text-blue-400">search</span>);<br/>
        <span className="text-purple-400">if</span> (<span className="text-yellow-200">pageParams</span>.<span className="text-yellow-100">get</span>(<span className="text-green-300">"device"</span>)) {'{'}<br/>
        &nbsp;&nbsp;<span className="text-yellow-200">state</span>.<span className="text-orange-300">deviceId</span> = <span className="text-yellow-200">pageParams</span>.<span className="text-yellow-100">get</span>(<span className="text-green-300">"device"</span>);<br/>
        &nbsp;&nbsp;<span className="text-blue-400">localStorage</span>.<span className="text-yellow-100">setItem</span>(<span className="text-green-300">"device_id"</span>, <span className="text-yellow-200">state</span>.<span className="text-orange-300">deviceId</span>);<br/>
        {'}'}<br/>
      </div>

      <div className="mb-6 space-y-1">
        <span className="text-purple-400">const</span> <span className="text-yellow-200">loginPanel</span> = <span className="text-blue-400">document</span>.<span className="text-yellow-100">getElementById</span>(<span className="text-green-300">"login"</span>);<br/>
        <span className="text-purple-400">const</span> <span className="text-yellow-200">chatThread</span> = <span className="text-blue-400">document</span>.<span className="text-yellow-100">getElementById</span>(<span className="text-green-300">"chatT"</span>);<br/>
        <span className="text-purple-400">const</span> <span className="text-yellow-200">commandInput</span> = <span className="text-blue-400">document</span>.<span className="text-yellow-100">querySelector</span>(<span className="text-green-300">"#com"</span>);<br/>
      </div>

      <div className="text-gray-500 italic flex items-center justify-between mt-12 border-t border-[#333] pt-4">
        <span>// End of preview for {fileName}</span>
        <div className="flex items-center gap-2 opacity-40">
           <Save size={12} />
           <span className="text-[10px] uppercase font-bold">Autosaved</span>
        </div>
      </div>
    </div>
  );
}

function FileTreeItem({ item, depth, onFileClick, activeFile }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const isSelected = activeFile === item.name;
  const isFolder = item.type === 'folder';

  const getIcon = () => {
    if (isFolder) return <Folder size={14} className="text-gray-400 opacity-80" />;
    
    const name = item.name || '';
    if (name.endsWith('.json')) return <FileJson size={13} className="text-yellow-500 opacity-90" />;
    if (name.endsWith('.md')) return <div className="flex items-center text-green-600 font-bold text-[8px] tracking-tighter self-center"><FileText size={13} className="mr-0.5 opacity-80" />M↓</div>;
    if (item.isDb || name.endsWith('.db')) return <div className="p-0.5 bg-purple-100 rounded-[2px]"><Database size={11} className="text-purple-500" /></div>;
    if (item.isPython || name.endsWith('.py')) return <Shield size={13} className="text-[#3776ab] opacity-90" />; 
    if (name.endsWith('.tsx') || name.endsWith('.ts') || name.endsWith('.js')) {
      const color = name.endsWith('.js') ? 'text-yellow-500' : 'text-blue-500';
      const bgColor = name.endsWith('.js') ? 'bg-yellow-50' : 'bg-blue-50';
      return <div className={`flex items-center ${color} ${bgColor} font-bold text-[7px] border border-current rounded-[3px] px-0.5 h-3.5 min-w-[14px] justify-center items-center leading-none mr-0.5 font-mono shadow-sm`}>{name.endsWith('.tsx') ? 'TSX' : name.endsWith('.ts') ? 'TS' : 'JS'}</div>;
    }
    if (name.endsWith('.html')) return <div className="flex items-center text-orange-500 bg-orange-50 font-bold text-[7px] border border-current rounded-[3px] px-0.5 h-3.5 min-w-[14px] justify-center items-center leading-none mr-0.5 font-mono shadow-sm">H</div>;
    if (name.endsWith('.css')) return <div className="flex items-center text-purple-400 bg-purple-50 font-bold text-[7px] border border-current rounded-[3px] px-0.5 h-3.5 min-w-[14px] justify-center items-center leading-none mr-0.5 font-mono shadow-sm">#</div>;
    return <FileText size={13} className="text-gray-400 opacity-70" />;
  };

  const handleClick = () => {
    if (isFolder) {
      setIsOpen(!isOpen);
    } else {
      onFileClick(item.name);
    }
  };

  return (
    <div>
      <div 
        onClick={handleClick}
        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer group select-none transition-all ${
          isSelected 
            ? 'bg-blue-50/50 border border-blue-200/50 shadow-[0_1px_3px_rgba(37,99,235,0.05)]' 
            : 'hover:bg-gray-50 border border-transparent'
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <div className="w-3.5 h-3.5 flex items-center justify-center">
          {isFolder && (
            <ChevronRightIcon 
              size={12} 
              className={`text-gray-300 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} 
            />
          )}
        </div>
        <span className="shrink-0 scale-95">{getIcon()}</span>
        <span className={`text-[12px] truncate font-medium tracking-tight transition-colors ${
          isSelected ? 'text-blue-700' : 'text-gray-600 group-hover:text-gray-900'
        }`}>
          {item.name}
        </span>
      </div>
      
      <AnimatePresence>
        {isOpen && isFolder && item.children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {item.children.map((child: any, idx: number) => (
              <FileTreeItem 
                key={idx} 
                item={child} 
                depth={depth + 1} 
                onFileClick={onFileClick} 
                activeFile={activeFile}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EditorTab({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-4 h-full border-r border-[#1a1a1a] cursor-pointer transition-colors ${
      active ? 'bg-[#1e1e1e] text-white' : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#333]'
    }`}>
      <span className="shrink-0">{icon}</span>
      <span className="text-[11px] font-medium tracking-tight whitespace-nowrap">{label}</span>
      {active && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 ml-1 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></div>}
    </div>
  );
}

function SidebarItem({ icon, label, active = false, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
      active 
        ? 'bg-gray-100 text-gray-900 font-bold' 
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
    }`}>
      <span className={active ? 'text-gray-900' : 'text-gray-400'}>{icon}</span>
      <span className="text-sm">{label}</span>
    </div>
  );
}

function ProjectItem({ project, isActive, onClick, onDelete }: any) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer transition-all mb-0.5 group ${
        isActive ? 'bg-gray-100 shadow-sm' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-2 truncate">
        <MessageSquare size={14} className={isActive ? 'text-gray-600' : 'text-gray-400'} />
        <span className={`text-sm truncate ${isActive ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
          {project.name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] text-gray-400 font-medium whitespace-nowrap transition-opacity ${isActive ? 'opacity-0' : 'group-hover:opacity-0'}`}>
          {project.timestamp}
        </span>
        <button 
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded-md text-gray-400 hover:text-red-500 transition-all"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function ChatInput({ 
  value, 
  onChange, 
  onSubmit, 
  isLoading, 
  placeholder,
  onUploadClick,
  toggleMic,
  micActive,
  selectedModel,
  onModelClick,
  isModelMenuOpen,
  models,
  onSelectModel
}: any) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative bg-white rounded-[24px] border border-gray-200 p-1.5 transition-all focus-within:border-purple-400 shadow-sm">
      <div className="px-4 pt-4 pb-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full resize-none border-none focus:ring-0 text-gray-800 placeholder-gray-400 text-[15px] font-medium leading-relaxed bg-transparent outline-none ring-0 focus:outline-none"
          style={{ minHeight: '44px' }}
        />
      </div>

      <div className="flex items-center justify-between px-3 pb-2">
        <div className="flex items-center gap-1">
          <button 
            onClick={onUploadClick}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all"
          >
            <Paperclip size={18} />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all border border-transparent">
            <Hand size={14} className="text-gray-400" />
            Default permissions
            <ChevronDown size={14} className="opacity-40" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <div className="relative">
            <button 
              onClick={onModelClick}
              className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl mr-1 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <span className="flex items-center">{selectedModel.icon}</span>
              {selectedModel.name}
              <ChevronDown size={12} />
            </button>
            
            <AnimatePresence>
              {isModelMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 p-1 z-[60]"
                >
                  {models.map((model: any) => (
                    <button
                      key={model.name}
                      onClick={() => onSelectModel(model)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      {model.icon}
                      {model.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button 
            onClick={toggleMic}
            className={`p-2 rounded-full transition-all ${micActive ? 'text-red-500 bg-red-50 animate-pulse' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            <Mic size={18} />
          </button>
          
          <button 
            onClick={onSubmit}
            disabled={!value.trim() || isLoading}
            className={`p-2 rounded-full transition-all ml-1 ${
              value.trim() && !isLoading 
                ? 'bg-black text-white shadow-lg' 
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            <ArrowUp size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolOption({ icon, label, active = false, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
      active ? 'border-purple-600 bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'
    }`}>
      <span className="w-5 h-5 flex items-center justify-center shrink-0">{icon}</span>
      <span className="text-sm font-bold tracking-tight">{label}</span>
    </div>
  );
}
