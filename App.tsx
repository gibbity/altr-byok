
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Plus, 
  History, 
  Layout, 
  Smartphone, 
  Monitor, 
  Globe, 
  Component as ComponentIcon,
  ChevronLeft,
  ChevronRight,
  Code as CodeIcon,
  Eye,
  Settings2,
  Trash2,
  Moon,
  Sun,
  Image as ImageIcon,
  ArrowRight,
  Menu,
  X
} from 'lucide-react';
import { generateInteraction } from './services/geminiService';
import { GeneratedInteraction, ImageAttachment, ProjectType, Platform } from './types';
import InteractionPreview from './components/InteractionPreview';
import CodeBlock from './components/CodeBlock';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MATERIAL_OPTIONS = [
  { label: 'Glassmorphism', prompt: 'Make it a glass container with backdrop blur and white border highlight.' },
  { label: 'Neumorphic', prompt: 'Apply a soft neumorphic look with inner and outer shadows.' },
  { label: 'Flat Solid', prompt: 'Clean solid fill with a 1px crisp border.' },
  { label: 'Frosted Glass', prompt: 'Heavy frosted glass effect with high blur and subtle noise.' },
  { label: 'Claymorphism', prompt: 'Inflated clay-like look with soft inner shadows and rounded forms.' },
  { label: 'Liquid Metal', prompt: 'Highly reflective chrome-like metallic surface.' },
  { label: 'Skeuomorphic', prompt: 'Old-school realistic look with gradients, textures, and deep shadows.' },
  { label: 'Retro Paper', prompt: 'Textured paper material with organic edges and subtle grain.' },
  { label: 'High Gloss', prompt: 'Plastic-like high-gloss finish with sharp reflections.' },
  { label: 'Matte Plastic', prompt: 'Soft matte plastic texture with very subtle highlights.' },
  { label: 'Brushed Aluminum', prompt: 'Horizontal metallic grain texture with anisotropic highlights.' },
  { label: 'Holographic', prompt: 'Iridescent color-shifting finish that reacts to "light".' },
  { label: 'Mesh Gradient', prompt: 'Background with soft, multi-colored mesh gradient textures.' },
];

const App: React.FC = () => {
  const [activeProjectType, setActiveProjectType] = useState<ProjectType>('component');
  const [activePlatform, setActivePlatform] = useState<Platform>('mobile');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<GeneratedInteraction[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [attachedImage, setAttachedImage] = useState<ImageAttachment | null>(null);
  const [materialSearch, setMaterialSearch] = useState('');
  const [isMaterialDropdownOpen, setIsMaterialDropdownOpen] = useState(false);
  const [appTheme, setAppTheme] = useState<'dark' | 'dark'>('dark'); // Defaulting to dark as it's cooler

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeInteraction = history.find(item => item.id === activeId);

  const filteredMaterials = useMemo(() => 
    MATERIAL_OPTIONS.filter(m => m.label.toLowerCase().includes(materialSearch.toLowerCase())),
    [materialSearch]
  );

  // Sync theme with document element for Tailwind dark mode
  useEffect(() => {
    if (appTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [appTheme]);

  const getFullHtml = (interaction: GeneratedInteraction) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${interaction.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="importmap">
    {
      "imports": {
        "gsap": "https://esm.sh/gsap@3.12.5"
      }
    }
    </script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { 
            margin: 0; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            min-height: 100vh; 
            background: #ffffff; 
            font-family: 'Inter', sans-serif;
            overflow: hidden;
        }
        ${interaction.css}
    </style>
</head>
<body>
    <div id="root">
        ${interaction.html}
    </div>

    <script type="module">
        ${interaction.js}
    </script>
</body>
</html>`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setAttachedImage({
          data: base64String,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = () => {
    setAttachedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async (refinementPrompt?: string) => {
    const targetPrompt = refinementPrompt || prompt;
    if (!targetPrompt.trim() && !attachedImage) return;

    setIsGenerating(true);
    try {
      const context = activeInteraction ? `HTML: ${activeInteraction.html}\nCSS: ${activeInteraction.css}\nJS: ${activeInteraction.js}` : undefined;
      const result = await generateInteraction(targetPrompt, activeProjectType, activePlatform, context, attachedImage || undefined);
      
      const newInteraction: GeneratedInteraction = {
        id: Math.random().toString(36).substring(7),
        name: result.name || 'Untitled creation',
        prompt: targetPrompt,
        html: result.html,
        css: result.css,
        js: result.js,
        timestamp: Date.now(),
        variationOf: activeId || undefined,
        hasImage: !!attachedImage,
        projectType: activeProjectType,
        platform: activeProjectType === 'ui' ? activePlatform : undefined
      };

      setHistory(prev => [newInteraction, ...prev]);
      setActiveId(newInteraction.id);
      if (!refinementPrompt) setPrompt('');
      removeAttachment();
    } catch (error: any) {
      console.error("Generation failed:", error);
      alert(`Error: ${error.message || 'Failed to generate interaction.'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewInteraction = () => {
    setActiveId(null);
    setPrompt('');
    removeAttachment();
  };

  return (
    <div className={cn(
      "flex h-screen overflow-hidden font-sans transition-colors duration-500",
      appTheme === 'dark' ? "bg-[#0A0A0A] text-white" : "bg-[#F8F8F8] text-gray-900"
    )}>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

      {/* 1. Project Explorer (Sidebar) */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 0 }}
        className={cn(
          "relative flex flex-col border-r border-[#1e1e1e] bg-[#0F0F0F] shrink-0 overflow-hidden z-30",
          appTheme === 'light' && "bg-white border-gray-200"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                <Sparkles size={18} />
             </div>
             <span className="font-bold tracking-tight text-lg">Luminal Studio</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-[#1e1e1e] transition-colors"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-8 notion-scrollbar">
          <button 
            onClick={handleNewInteraction}
            className="w-full flex items-center gap-3 p-3 text-sm font-medium rounded-xl bg-[#1A1A1A] hover:bg-[#252525] border border-[#2a2a2a] transition-all group active:scale-[0.98]"
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white transition-all">
              <Plus size={16} />
            </div>
            Create New
          </button>

          <div className="space-y-4">
            <div className="px-2 flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
               <History size={12} />
               <span>Recent Projects</span>
            </div>
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {history.map(item => (
                  <motion.button
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => setActiveId(item.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between group",
                      activeId === item.id 
                        ? 'bg-[#1A1A1A] text-white border border-[#2a2a2a] shadow-lg' 
                        : 'text-gray-400 hover:bg-[#151515] hover:text-gray-200'
                    )}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="shrink-0">
                        {item.projectType === 'component' && <ComponentIcon size={14} className="text-pink-500" />}
                        {item.projectType === 'ui' && (item.platform === 'mobile' ? <Smartphone size={14} className="text-indigo-500" /> : <Monitor size={14} className="text-blue-500" />)}
                        {item.projectType === 'website' && <Globe size={14} className="text-emerald-500" />}
                      </div>
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.hasImage && <div className="w-1 h-1 bg-indigo-400 rounded-full" />}
                  </motion.button>
                ))}
              </AnimatePresence>
              {history.length === 0 && (
                <p className="px-2 py-4 text-xs text-gray-500 italic">No history yet...</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#1e1e1e]">
           <div className="bg-[#151515] rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-[10px]">KM</div>
                 <div className="flex flex-col">
                    <span className="text-[11px] font-bold">Kush Maurya</span>
                    <span className="text-[9px] text-gray-500">Free Tier</span>
                 </div>
              </div>
              <button className="text-gray-500 hover:text-white transition-colors">
                 <Settings2 size={16} />
              </button>
           </div>
        </div>
      </motion.aside>

      {/* 2. Main Canvas Area */}
      <main className="flex-1 flex flex-col min-w-0 relative bg-[#0A0A0A]">
        {/* Top Navbar */}
        <header className="h-14 border-b border-[#1e1e1e] flex items-center justify-between px-6 bg-[#0A0A0A]/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-6">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-[#1e1e1e] transition-colors">
                <Menu size={18} className="text-gray-400" />
              </button>
            )}
            
            {/* Mode Switcher */}
            <div className="flex items-center p-1 bg-[#151515] rounded-xl border border-[#2a2a2a]">
               {[
                 { id: 'component' as ProjectType, label: 'Component', icon: ComponentIcon },
                 { id: 'ui' as ProjectType, label: 'UI App', icon: Smartphone },
                 { id: 'website' as ProjectType, label: 'Website', icon: Globe }
               ].map(mode => (
                 <button
                   key={mode.id}
                   onClick={() => setActiveProjectType(mode.id)}
                   className={cn(
                     "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                     activeProjectType === mode.id 
                       ? "bg-[#252525] text-white shadow-lg" 
                       : "text-gray-500 hover:text-gray-300"
                   )}
                 >
                   <mode.icon size={12} />
                   {mode.label}
                 </button>
               ))}
            </div>

            {activeProjectType === 'ui' && (
              <div className="flex items-center p-1 bg-[#151515] rounded-xl border border-[#2a2a2a] animate-in fade-in slide-in-from-left-2 transition-all">
                {[
                  { id: 'mobile' as Platform, icon: Smartphone, label: 'Mobile' },
                  { id: 'desktop' as Platform, icon: Monitor, label: 'Desktop' }
                ].map(plat => (
                  <button
                    key={plat.id}
                    onClick={() => setActivePlatform(plat.id)}
                    className={cn(
                      "p-1.5 rounded-lg transition-all",
                      activePlatform === plat.id ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-gray-500 hover:text-gray-300"
                    )}
                    title={plat.label}
                  >
                    <plat.icon size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setAppTheme(appTheme === 'dark' ? 'dark' : 'dark')} // Keep it dark for now as styled
              className="p-2 rounded-lg hover:bg-[#1e1e1e] transition-colors text-gray-400"
            >
              {appTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <div className="w-[1px] h-4 bg-[#1e1e1e]" />
            {activeInteraction && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('preview')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                    viewMode === 'preview' ? "bg-white text-black" : "text-gray-400 hover:text-white"
                  )}
                >
                  <Eye size={14} />
                  Preview
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all",
                    viewMode === 'code' ? "bg-white text-black" : "text-gray-400 hover:text-white"
                  )}
                >
                  <CodeIcon size={14} />
                  Code
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto w-full relative notion-scrollbar">
          <AnimatePresence mode="wait">
            {!activeInteraction ? (
              <motion.div 
                key="empty-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col items-center justify-center p-12 text-center"
              >
                <div className="relative mb-10">
                   <div className="absolute inset-0 bg-indigo-500 blur-[80px] opacity-20" />
                   <div className="w-24 h-24 rounded-[32px] bg-white text-black flex items-center justify-center text-4xl shadow-2xl relative">
                      <Sparkles size={40} />
                   </div>
                </div>
                
                <h1 className="text-6xl font-black tracking-tighter mb-4 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
                  Design the Future.
                </h1>
                <p className="text-gray-500 text-lg max-w-xl mx-auto font-medium mb-12">
                   {activeProjectType === 'component' && "Craft hyper-realistic micro-interactions with ease."}
                   {activeProjectType === 'ui' && `Build high-fidelity ${activePlatform} application interfaces.`}
                   {activeProjectType === 'website' && "Generate professional, responsive landing pages instantly."}
                </p>

                <div className="w-full max-w-2xl relative">
                  <div className="relative group bg-[#111] border border-[#222] rounded-[32px] p-2 shadow-3xl shadow-black/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                    <div className="flex items-center">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "ml-2 p-4 rounded-2xl transition-all",
                          attachedImage ? "bg-indigo-500 text-white shadow-lg" : "text-gray-600 hover:text-white"
                        )}
                      >
                        <ImageIcon size={22} />
                      </button>
                      <input
                        type="text"
                        placeholder={`Describe your ${activeProjectType}...`}
                        className="flex-1 px-4 py-8 bg-transparent border-none focus:outline-none text-xl font-medium placeholder-gray-800"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                      />
                      <button
                        onClick={() => handleGenerate()}
                        disabled={isGenerating || (!prompt.trim() && !attachedImage)}
                        className="p-5 mr-1 bg-white text-black rounded-2xl disabled:opacity-20 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl flex items-center justify-center font-black"
                      >
                        {isGenerating ? (
                           <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <ArrowRight size={24} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="workspace"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 lg:p-12 pb-32"
              >
                <div className="max-w-6xl mx-auto space-y-12">
                  <div className="flex items-center justify-between">
                     <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tight">{activeInteraction.name}</h1>
                        <div className="flex items-center gap-3 text-gray-500 text-sm">
                           <span className="flex items-center gap-1.5">
                              {activeInteraction.projectType === 'component' && <ComponentIcon size={14} />}
                              {activeInteraction.projectType === 'ui' && <Smartphone size={14} />}
                              {activeInteraction.projectType === 'website' && <Globe size={14} />}
                              {activeInteraction.projectType}
                           </span>
                           <span>•</span>
                           <span className="italic">"{activeInteraction.prompt}"</span>
                        </div>
                     </div>
                     <button 
                        onClick={handleNewInteraction}
                        className="p-2.5 rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-800 transition-all text-gray-400 hover:text-white"
                      >
                        <Trash2 size={18} />
                     </button>
                  </div>

                  {viewMode === 'preview' ? (
                    <div className="relative group">
                       <div className="absolute inset-0 bg-indigo-500/5 blur-[120px] rounded-[60px]" />
                       <div className="relative rounded-[40px] overflow-hidden border border-[#1e1e1e] bg-[#0F0F0F] shadow-2xl">
                          <InteractionPreview interaction={activeInteraction} />
                       </div>
                    </div>
                  ) : (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                      <CodeBlock language="React / Single-File" code={getFullHtml(activeInteraction)} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {isGenerating && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl z-50 flex items-center justify-center">
             <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center gap-6"
             >
                <div className="relative">
                   <div className="w-16 h-16 border-4 border-gray-900 border-t-white rounded-full animate-spin" />
                   <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles size={20} className="text-indigo-400" />
                   </div>
                </div>
                <div className="space-y-1 text-center">
                   <p className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] font-mono">Synthesizing Creative Output</p>
                   <p className="text-indigo-400 text-sm font-bold animate-pulse">Consulting with Design Systems Agent...</p>
                </div>
             </motion.div>
          </div>
        )}
      </main>

      {/* 3. Logic Inspector (Right Sidebar) */}
      <AnimatePresence>
        {activeInteraction && inspectorOpen && (
          <motion.aside 
            initial={{ width: 0 }}
            animate={{ width: 340 }}
            exit={{ width: 0 }}
            className="relative flex flex-col border-l border-[#1e1e1e] bg-[#0F0F0F] shrink-0 overflow-hidden z-30"
          >
            <div className="p-6 flex items-center justify-between border-b border-[#1e1e1e]">
              <div className="flex items-center gap-2">
                 <Settings2 size={16} className="text-gray-500" />
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logic Inspector</span>
              </div>
              <button 
                onClick={() => setInspectorOpen(false)}
                className="p-1 rounded-lg hover:bg-[#1e1e1e] transition-colors"
              >
                <ChevronRight size={18} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-10 notion-scrollbar pb-20">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                   <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Refinement Chat</h4>
                   <Sparkles size={12} className="text-indigo-500" />
                </div>
                <div className="relative space-y-3">
                  <textarea
                    id="refinement-input-inspector"
                    placeholder="E.g., 'Make the header sticky'..."
                    className="w-full px-4 py-4 bg-[#151515] border border-[#222] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[100px] resize-none notion-scrollbar transition-all"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        const val = (e.target as HTMLTextAreaElement).value;
                        if (val.trim()) {
                           handleGenerate(val);
                           (e.target as HTMLTextAreaElement).value = '';
                        }
                      }
                    }}
                  />
                  <div className="flex items-center justify-between px-1">
                     <p className="text-[9px] text-gray-600 font-bold">⌘ + Enter to submit</p>
                     <button className="text-[10px] font-bold text-gray-400 hover:text-white transition-colors">History</button>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Aesthetic Presets</h4>
                <div className="grid grid-cols-1 gap-2">
                   {[
                     { label: 'Hyper-Minimalist', prompt: 'Style it extremely minimal, plenty of whitespace, system fonts, only grayscale.' },
                     { label: 'Brutalist', prompt: 'Use high-contrast black/vibrant colors, thick borders, and heavy sans-serif typography.' },
                     { label: 'Glassmorphism', prompt: 'Apply heavy background blurs, thin white borders, and semi-transparent layers.' },
                     { label: 'Organic / Soft', prompt: 'Use warm cream/beige tones, very large rounded corners, and soft serif fonts.' },
                     { label: 'Dark Cyberpunk', prompt: 'Deep navy/black with neon accents, glowing text, and scanning lines.' }
                   ].map(style => (
                     <button
                       key={style.label}
                       onClick={() => handleGenerate(style.prompt)}
                       className="w-full flex items-center justify-between p-3 rounded-xl bg-[#151515] border border-[#222] hover:bg-[#1e1e1e] hover:border-gray-800 transition-all group"
                     >
                        <span className="text-xs font-bold text-gray-400 group-hover:text-white">{style.label}</span>
                        <ChevronRight size={14} className="text-gray-700 opacity-0 group-hover:opacity-100 transition-all" />
                     </button>
                   ))}
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">State Management</h4>
                 <div className="flex flex-wrap gap-2">
                    {[
                      {label: 'Add Loading', prompt: 'Implement a professional skeleton loading state or spinner for the main content.'},
                      {label: 'Empty State', prompt: 'Design a beautiful empty state illustation/view for when there is no data.'},
                      {label: 'Error View', prompt: 'Create a clean, helpful error message UI for this project.'},
                      {label: 'Success Feed', prompt: 'Add a "Success" notification or toast sequence upon action completion.'}
                    ].map(st => (
                      <button
                        key={st.label}
                        onClick={() => handleGenerate(st.prompt)}
                        className="px-3 py-1.5 rounded-lg bg-[#151515] border border-[#222] text-[10px] font-bold text-gray-500 hover:text-white hover:border-[#444] transition-all"
                      >
                        {st.label}
                      </button>
                    ))}
                 </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Global Color System</h4>
                 <div className="grid grid-cols-6 gap-2">
                    {['#ffffff', '#6366f1', '#ec4899', '#f97316', '#10b981', '#06b6d4'].map(c => (
                      <button
                        key={c}
                        onClick={() => handleGenerate(`Update the primary theme color to ${c}.`)}
                        className="w-full aspect-square rounded-lg border border-[#222] hover:scale-110 transition-transform shadow-lg"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                 </div>
              </section>
            </div>

            <div className="p-6 bg-[#0B0B0B] border-t border-[#1e1e1e]">
               <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Creator Tools</p>
                  <div className="flex flex-col gap-2">
                     <button className="flex items-center justify-between text-[11px] font-bold text-gray-400 hover:text-white transition-colors">
                        <span>Export as Repository</span>
                        <ChevronRight size={12} />
                     </button>
                     <button className="flex items-center justify-between text-[11px] font-bold text-gray-400 hover:text-white transition-colors">
                        <span>Request UI Audit</span>
                        <ChevronRight size={12} />
                     </button>
                  </div>
               </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
