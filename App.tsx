
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
  X,
  Palette,
  MousePointer2
} from 'lucide-react';
import { generateInteraction } from './services/geminiService';
import { GeneratedInteraction, ImageAttachment, ProjectType, Platform, SelectedElement } from './types';
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
  const [view, setView] = useState<'library' | 'editor'>('library');
  const [activeProjectType, setActiveProjectType] = useState<ProjectType>('component');
  const [activePlatform, setActivePlatform] = useState<Platform>('mobile');
  const [selectedDesignSystem, setSelectedDesignSystem] = useState<{label: string, prompt: string} | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<GeneratedInteraction[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [variationBarOpen, setVariationBarOpen] = useState(true);
  const [inspectorTab, setInspectorTab] = useState<'tweaks' | 'design' | 'comments'>('tweaks');
  const [attachedImage, setAttachedImage] = useState<ImageAttachment | null>(null);
  const [appTheme, setAppTheme] = useState<'dark' | 'dark'>('dark');
  
  // New interaction states
  const [activeTweaks, setActiveTweaks] = useState<Record<string, string | number>>({});
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeInteraction = history.find(item => item.id === activeId);

  // Initialize tweaks when active interaction changes
  useEffect(() => {
    if (activeInteraction?.tweaks) {
      const initial: Record<string, string | number> = {};
      activeInteraction.tweaks.forEach(t => {
        initial[t.property] = t.value;
      });
      setActiveTweaks(initial);
    } else {
      setActiveTweaks({});
    }
    setSelectedElement(null);
  }, [activeId, activeInteraction]);

  useEffect(() => {
    if (selectedElement) {
      setInspectorOpen(true);
      setInspectorTab('tweaks');
    }
  }, [selectedElement]);

  const handleTweakChange = (property: string, value: string | number) => {
    setActiveTweaks(prev => ({ ...prev, [property]: value }));
  };

  const handleSurgicalEdit = async (comment: string) => {
    if (!selectedElement) return;
    const targetPrompt = `Refinement for element [${selectedElement.selector}]: ${comment}`;
    await handleGenerate(targetPrompt);
  };

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
      let finalPrompt = targetPrompt;
      if (selectedDesignSystem && !refinementPrompt) {
        finalPrompt = `[Using ${selectedDesignSystem.label} Design System]: ${targetPrompt}. ${selectedDesignSystem.prompt}`;
      }

      const context = activeInteraction ? `HTML: ${activeInteraction.html}\nCSS: ${activeInteraction.css}\nJS: ${activeInteraction.js}` : undefined;
      const result = await generateInteraction(finalPrompt, activeProjectType, activePlatform, context, attachedImage || undefined);
      
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
    setView('editor');
  };

  const variations = useMemo(() => {
    if (!activeId) return [];
    // If it's a variation, find siblings and parent. Simple list for now.
    return history.filter(item => item.id === activeId || item.variationOf === activeId || (activeInteraction?.variationOf && (item.id === activeInteraction.variationOf || item.variationOf === activeInteraction.variationOf)));
  }, [activeId, history, activeInteraction]);

  if (view === 'library') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white p-8 lg:p-12 font-sans overflow-y-auto notion-scrollbar">
        <div className="max-w-7xl mx-auto space-y-12">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/20">
                <Sparkles size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">Luminal Space</h1>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Project Library</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <button className="text-gray-500 hover:text-white transition-colors">
                  <Settings2 size={20} />
               </button>
               <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-[10px]">KM</div>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleNewInteraction}
              className="aspect-[4/3] rounded-[32px] bg-[#111] border-2 border-dashed border-[#222] flex flex-col items-center justify-center gap-4 group transition-all hover:border-indigo-500/50 hover:bg-[#151515]"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-lg group-hover:shadow-indigo-500/20">
                <Plus size={28} />
              </div>
              <div className="space-y-1">
                <span className="text-lg font-bold">New Project</span>
                <p className="text-xs text-gray-500">Start from a blank canvas</p>
              </div>
            </motion.button>

            {history.filter(item => !item.variationOf).map(project => (
              <motion.div
                key={project.id}
                whileHover={{ y: -4 }}
                onClick={() => {
                  setActiveId(project.id);
                  setView('editor');
                }}
                className="aspect-[4/3] rounded-[32px] bg-[#111] border border-[#222] p-6 flex flex-col justify-between cursor-pointer group hover:border-[#333] transition-all relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                   <ArrowRight size={20} className="text-gray-500" />
                </div>
                
                <div className="w-12 h-12 rounded-2xl bg-[#1a1a1a] flex items-center justify-center text-gray-400">
                  {project.projectType === 'component' && <ComponentIcon size={20} />}
                  {project.projectType === 'ui' && <Smartphone size={20} />}
                  {project.projectType === 'website' && <Globe size={20} />}
                  {project.projectType === 'graphics' && <Palette size={20} />}
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-lg leading-tight truncate">{project.name}</h3>
                  <div className="flex items-center gap-2">
                     <span className="px-2 py-0.5 rounded-md bg-[#1a1a1a] text-[10px] font-black text-gray-500 uppercase">{project.projectType}</span>
                     <span className="text-[10px] text-gray-600 font-bold">{new Date(project.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex h-screen overflow-hidden font-sans transition-colors duration-500",
      appTheme === 'dark' ? "bg-[#0A0A0A] text-white" : "bg-[#F8F8F8] text-gray-900"
    )}>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

      {/* 1. Editor Sidebar (Left) */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 320 : 0 }}
        className={cn(
          "relative flex flex-col border-r border-[#1e1e1e] bg-[#0F0F0F] shrink-0 overflow-hidden z-40",
          appTheme === 'light' && "bg-white border-gray-200"
        )}
      >
        <div className="p-6 flex items-center justify-between border-b border-[#1e1e1e]">
          <button 
            onClick={() => setView('library')}
            className="flex items-center gap-3 group"
          >
             <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
                <ChevronLeft size={16} />
             </div>
             <span className="font-bold tracking-tight text-sm">Library</span>
          </button>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-[#1e1e1e] transition-colors"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-10 notion-scrollbar">
            {/* Project Context */}
            <section className="space-y-4">
              <div className="space-y-1">
                 <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Project Context</h4>
                 <p className="text-[11px] text-gray-600 font-medium">Select the target platform and architecture.</p>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">Architecture</label>
                   <select 
                      value={activeProjectType}
                      onChange={(e) => setActiveProjectType(e.target.value as ProjectType)}
                      className="w-full bg-[#151515] border border-[#222] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none"
                   >
                      <option value="component">Micro-Component</option>
                      <option value="ui">Application UI</option>
                      <option value="website">Marketing Website</option>
                      <option value="graphics">Interactive Graphics</option>
                   </select>
                </div>

                {activeProjectType === 'ui' && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Platform</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'mobile' as Platform, label: 'Mobile', icon: Smartphone },
                        { id: 'desktop' as Platform, label: 'Desktop', icon: Monitor }
                      ].map(p => (
                        <button
                          key={p.id}
                          onClick={() => setActivePlatform(p.id)}
                          className={cn(
                            "flex items-center justify-center gap-2 py-2 rounded-xl border text-[10px] font-bold transition-all",
                            activePlatform === p.id ? "bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20" : "bg-[#151515] border-[#222] text-gray-500 hover:text-gray-300"
                          )}
                        >
                          <p.icon size={12} />
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Design MD System */}
            <section className="space-y-4">
              <div className="space-y-1">
                 <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Design MD</h4>
                    {selectedDesignSystem && (
                      <button 
                        onClick={() => setSelectedDesignSystem(null)}
                        className="text-[9px] font-bold text-indigo-400 hover:text-white"
                      >
                        Reset
                      </button>
                    )}
                 </div>
                 <p className="text-[11px] text-gray-600 font-medium">Patterns from <span className="text-indigo-400">awesome-design-md</span></p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                 {[
                   { label: 'Linear', prompt: 'Obsidian dark mode, sleek borders, high-contrast typography, and precision offsets.' },
                   { label: 'Stripe', prompt: 'Vibrant gradients, crisp typography, plenty of whitespace, and playful shadows.' },
                   { label: 'Vercel', prompt: 'Pure black/white, geometric precision, Geist Sans, and minimalist utility patterns.' },
                   { label: 'Apple', prompt: 'Premium glassmorphism, SF Pro typography, soft depth, and rounded organic corners.' },
                   { label: 'GitHub', prompt: 'Primer palette, high-density utility UI, and professional developer aesthetics.' },
                   { label: 'OpenAI', prompt: 'Airy minimalist lab aesthetic, subtle blurs, and advanced typography.' },
                   { label: 'Tesla', prompt: 'Futuristic technical interface, high-contrast data readouts, and sharp metallic surfaces.' },
                   { label: 'Uber', prompt: 'Bold black and white contrast, grid-based layout, and heavy functional typography.' },
                   { label: 'Arc', prompt: 'Soft gradients, rounded containers, and modern desktop browser utility patterns.' },
                   { label: 'Spotify', prompt: 'Deep greens and onyx backgrounds, bold rounded cards, and high-impact imagery.' },
                   { label: 'Robinhood', prompt: 'Clean neon greens, minimalist white backgrounds, and smooth financial UI components.' },
                   { label: 'Rive', prompt: 'High-motion focus, artistic depth, and creative canvas-like backgrounds.' },
                   { label: 'Retool', prompt: 'Dense internal-tool aesthetic, utility-first layout, and high-efficiency dashboards.' },
                   { label: 'Notion', prompt: 'Clean, minimalist, block-based aesthetic with plenty of whitespace and system fonts.' }
                 ].map(style => (
                    <button
                      key={style.label}
                      onClick={() => setSelectedDesignSystem(selectedDesignSystem?.label === style.label ? null : style)}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all text-[10px] font-bold group flex items-center justify-between",
                        selectedDesignSystem?.label === style.label 
                          ? "bg-indigo-500/10 border-indigo-500 text-white shadow-lg shadow-indigo-500/10" 
                          : "bg-[#151515] border-[#222] text-gray-400 hover:text-white hover:border-[#333]"
                      )}
                    >
                      <span className="truncate">{style.label}</span>
                      <Sparkles size={10} className={cn(
                        "transition-opacity",
                        selectedDesignSystem?.label === style.label ? "opacity-100 text-indigo-400" : "opacity-0 group-hover:opacity-100 text-gray-600"
                      )} />
                    </button>
                 ))}
              </div>
            </section>

            {/* Prompt Area (At the bottom of the scroll view but before the fixed bottom section) */}
          </div>

          <div className="p-6 border-t border-[#1e1e1e] space-y-4 bg-[#0F0F0F]">
            <div className="space-y-3">
               <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Creator Engine</h4>
                  {attachedImage && (
                    <button onClick={removeAttachment} className="text-[10px] font-bold text-pink-400 hover:text-pink-300">Clear Image</button>
                  )}
               </div>
               <div className="relative group">
                  <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={activeInteraction ? "Describe a refinement..." : `Describe your ${activeProjectType}...`}
                    className="w-full bg-[#151515] border border-[#222] rounded-2xl px-4 py-4 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium resize-none notion-scrollbar"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerate();
                      }
                    }}
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        attachedImage ? "bg-indigo-500 text-white" : "text-gray-600 hover:text-gray-400"
                      )}
                    >
                      <ImageIcon size={16} />
                    </button>
                    <button 
                      onClick={() => handleGenerate()}
                      disabled={isGenerating || (!prompt.trim() && !attachedImage)}
                      className="p-2 bg-white text-black rounded-lg disabled:opacity-20 hover:scale-[1.05] active:scale-[0.95] transition-all"
                    >
                      {isGenerating ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <ArrowRight size={16} />}
                    </button>
                  </div>
               </div>
               <p className="text-[9px] text-gray-600 font-bold text-center italic">⌘ + Enter to execute the vision</p>
            </div>
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
            
            <div className="flex items-center gap-2">
               <button
                 onClick={() => {
                   setIsEditMode(!isEditMode);
                   if (isEditMode) setSelectedElement(null);
                 }}
                 className={cn(
                   "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                   isEditMode 
                     ? "bg-indigo-500 text-white shadow-lg" 
                     : "text-gray-500 hover:text-gray-300 bg-[#151515] border border-[#222]"
                 )}
               >
                 <MousePointer2 size={12} />
                 {isEditMode ? 'Editing On' : 'Inspect UI'}
               </button>
            </div>

            <div className="w-[1px] h-4 bg-[#1e1e1e]" />
            
            {activeInteraction && (
               <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white leading-none">{activeInteraction.name}</span>
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{activeInteraction.projectType}</span>
               </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setAppTheme(appTheme === 'dark' ? 'dark' : 'dark')}
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
                <div className="w-[1px] h-4 bg-[#1e1e1e]" />
                <button
                  onClick={() => setInspectorOpen(!inspectorOpen)}
                  className={cn(
                    "p-1.5 rounded-xl transition-all",
                    inspectorOpen ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-gray-400 hover:text-white bg-[#151515] border border-[#222]"
                  )}
                  title="Toggle Inspector"
                >
                  <Settings2 size={16} />
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
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col items-center justify-center p-12 text-center"
              >
                 <div className="relative mb-10">
                    <div className="absolute inset-0 bg-indigo-500 blur-[80px] opacity-10" />
                    <div className="w-24 h-24 rounded-[32px] bg-[#111] border border-[#222] text-indigo-400 flex items-center justify-center text-4xl shadow-2xl relative">
                       <Plus size={40} />
                    </div>
                 </div>
                 <h1 className="text-4xl font-black tracking-tighter mb-4 text-white">Describe Your Vision</h1>
                 <p className="text-gray-500 text-sm max-w-sm mx-auto font-medium mb-8">
                    Use the Creator Engine in the left panel to begin your journey. Choose a theme or start from scratch.
                 </p>
              </motion.div>
            ) : (
              <motion.div 
                key="workspace"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 lg:p-12 pb-32"
              >
                <div className="max-w-6xl mx-auto space-y-12">
                  {viewMode === 'preview' ? (
                    <div className="relative group">
                       <div className="absolute inset-0 bg-indigo-500/5 blur-[120px] rounded-[60px]" />
                       <div className="relative rounded-[40px] overflow-hidden border border-[#1e1e1e] bg-[#0F0F0F] shadow-2xl">
                          <InteractionPreview 
                            interaction={activeInteraction} 
                            onElementSelected={setSelectedElement}
                            activeTweaks={activeTweaks}
                            editable={isEditMode}
                          />
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

        {/* Variation / History Bar (Bottom Center) */}
        {activeInteraction && variations.length > 0 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40">
             <motion.div 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: variationBarOpen ? 0 : 60, opacity: 1 }}
               className="flex flex-col items-center gap-2"
             >
                <div className="bg-[#111]/80 backdrop-blur-xl border border-[#222] p-1.5 rounded-2xl flex items-center gap-1.5 shadow-2xl shadow-black relative group">
                   <div className="px-3 py-1 flex items-center gap-2 border-r border-[#222]">
                      <History size={12} className="text-gray-500" />
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Versions</span>
                   </div>
                   <div className="flex items-center gap-1 px-1">
                      {variations.sort((a, b) => a.timestamp - b.timestamp).map((v, idx) => (
                        <button
                          key={v.id}
                          onClick={() => setActiveId(v.id)}
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black transition-all",
                            activeId === v.id 
                              ? "bg-white text-black shadow-lg" 
                              : "text-gray-500 hover:text-white hover:bg-[#1a1a1a]"
                          )}
                        >
                          {idx + 1}
                        </button>
                      ))}
                   </div>
                   
                   <button 
                     onClick={() => setVariationBarOpen(!variationBarOpen)}
                     className="absolute -top-10 left-1/2 -translate-x-1/2 p-2 bg-[#111] border border-[#222] rounded-full text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                   >
                     {variationBarOpen ? <ChevronRight size={14} className="rotate-90" /> : <ChevronRight size={14} className="-rotate-90" />}
                   </button>
                </div>
             </motion.div>
          </div>
        )}

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
            <div className="p-4 flex flex-col border-b border-[#1e1e1e] gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Settings2 size={14} className="text-gray-500" />
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Logic Inspector</span>
                </div>
                <button 
                  onClick={() => setInspectorOpen(false)}
                  className="p-1 rounded-lg hover:bg-[#1e1e1e] transition-colors"
                >
                  <ChevronRight size={18} className="text-gray-600" />
                </button>
              </div>

              {/* Inspector Tabs */}
              <div className="flex items-center p-1 bg-[#151515] rounded-xl border border-[#222]">
                {[
                  { id: 'tweaks', label: 'Tweaks', icon: Sparkles },
                  { id: 'design', label: 'Design', icon: Layout },
                  { id: 'comments', label: 'Comments', icon: ArrowRight }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setInspectorTab(tab.id as any)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                      inspectorTab === tab.id ? "bg-[#252525] text-white shadow-lg" : "text-gray-500 hover:text-gray-300"
                    )}
                  >
                    <tab.icon size={12} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-10 notion-scrollbar pb-20">
              
              {/* TAB 1: AI Generated Tweaks */}
              {inspectorTab === 'tweaks' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Magic Controls</h4>
                    <p className="text-[11px] text-gray-600 font-medium">Fine-tune the AI-generated design variables.</p>
                  </div>

                  <div className="space-y-6">
                    {activeInteraction.tweaks?.map(tweak => (
                      <div key={tweak.id} className="space-y-3">
                         <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-400">{tweak.label}</label>
                            <span className="text-[10px] font-mono text-indigo-400">{activeTweaks[tweak.property] || tweak.value}</span>
                         </div>
                         {tweak.type === 'slider' ? (
                           <input 
                              type="range"
                              min={tweak.min ?? 0}
                              max={tweak.max ?? 100}
                              step={tweak.step ?? 1}
                              value={activeTweaks[tweak.property] || tweak.value}
                              onChange={(e) => handleTweakChange(tweak.property, e.target.value)}
                              className="w-full accent-indigo-500 h-1.5 bg-[#222] rounded-full appearance-none cursor-pointer"
                           />
                         ) : (
                           <div className="flex items-center gap-3">
                              <input 
                                type="color"
                                value={activeTweaks[tweak.property] || tweak.value}
                                onChange={(e) => handleTweakChange(tweak.property, e.target.value)}
                                className="w-8 h-8 rounded-lg bg-transparent border border-[#333] cursor-pointer"
                              />
                              <span className="text-[11px] font-mono text-gray-500 uppercase">{activeTweaks[tweak.property] || tweak.value}</span>
                           </div>
                         )}
                      </div>
                    ))}
                    {(!activeInteraction.tweaks || activeInteraction.tweaks.length === 0) && (
                      <p className="text-xs text-gray-600 italic">No tweakable variables found in this project.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Property Inspector */}
              {inspectorTab === 'design' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  {selectedElement ? (
                    <div className="space-y-8">
                       <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 text-[10px] font-black">{selectedElement.tagName}</div>
                            <span className="text-xs font-mono text-gray-400 truncate">{selectedElement.selector}</span>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 gap-6">
                          {/* Typography Section */}
                          <div className="space-y-4">
                             <h5 className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Typography</h5>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] text-gray-500 font-bold">Font Size</label>
                                  <input 
                                    type="text" 
                                    className="w-full bg-[#151515] border border-[#222] rounded-lg px-2 py-1.5 text-xs text-white" 
                                    defaultValue={selectedElement.styles.fontSize} 
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] text-gray-500 font-bold">Color</label>
                                  <div className="flex items-center gap-2">
                                     <div className="w-5 h-5 rounded border border-[#333]" style={{ backgroundColor: selectedElement.styles.color }} />
                                     <span className="text-[10px] font-mono text-gray-400">{selectedElement.styles.color}</span>
                                  </div>
                                </div>
                             </div>
                          </div>

                          {/* Box Model Section */}
                          <div className="space-y-4">
                             <h5 className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Border & Shape</h5>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] text-gray-500 font-bold">Radius</label>
                                  <input 
                                    type="text" 
                                    className="w-full bg-[#151515] border border-[#222] rounded-lg px-2 py-1.5 text-xs text-white" 
                                    defaultValue={selectedElement.styles.borderRadius} 
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] text-gray-500 font-bold">Padding</label>
                                  <input 
                                    type="text" 
                                    className="w-full bg-[#151515] border border-[#222] rounded-lg px-2 py-1.5 text-xs text-white" 
                                    defaultValue={selectedElement.styles.padding} 
                                  />
                                </div>
                             </div>
                          </div>
                          
                          <p className="text-[10px] text-gray-600 leading-relaxed italic">Changes in the Property Inspector are currently visual cues. Use prompt or tweaks for permanent code changes.</p>
                       </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                       <div className="w-12 h-12 rounded-2xl bg-[#111] flex items-center justify-center text-gray-600 border border-[#222]">
                          <Layout size={24} />
                       </div>
                       <p className="text-xs text-gray-500 font-medium">Click an element in the preview to inspect its properties.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Inline Comments / Surgical Refinement */}
              {inspectorTab === 'comments' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                   {selectedElement ? (
                     <div className="space-y-6">
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 space-y-2">
                           <div className="flex items-center gap-2">
                              <Sparkles size={14} className="text-indigo-400" />
                              <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">Surgical Refinement</span>
                           </div>
                           <p className="text-[11px] text-gray-400">Specify exactly how the AI should modify the selected <span className="text-white font-bold">{selectedElement.selector}</span>.</p>
                        </div>

                        <div className="space-y-4">
                           <textarea 
                             placeholder={`E.g., "Add a subtle glow on hover" or "make it larger"...`}
                             className="w-full bg-[#151515] border border-[#222] rounded-2xl px-4 py-4 text-sm min-h-[120px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
                             onKeyDown={(e) => {
                               if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  const val = (e.target as HTMLTextAreaElement).value;
                                  if (val.trim()) {
                                    handleSurgicalEdit(val);
                                    (e.target as HTMLTextAreaElement).value = '';
                                  }
                               }
                             }}
                           />
                           <p className="text-[10px] text-gray-600 font-bold text-center italic">The AI will focus its edits on the selected element context.</p>
                        </div>
                     </div>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#111] flex items-center justify-center text-gray-600 border border-[#222]">
                           <Plus size={24} />
                        </div>
                        <p className="text-xs text-gray-500 font-medium">Select an element to pin a contextual comment or refinement request.</p>
                     </div>
                   )}
                </div>
              )}
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
