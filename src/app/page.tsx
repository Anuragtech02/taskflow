"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { BorderBeam } from "@/components/ui/border-beam";
import { ArrowRight, Search, Menu, MessageSquare, LayoutGrid, CheckSquare, Plus, Bell, Settings, User, Command, Zap, Database, ChevronRight, Layers, FileText, CornerDownRight } from "lucide-react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // -- Ultra-Premium Structural Hero Animation --
      const heroTl = gsap.timeline({ defaults: { ease: "power4.out" } });
      
      heroTl
        .fromTo(".nav-header", { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 1 })
        .fromTo(".hero-h1 span", { y: 40, opacity: 0, scale: 0.95 }, { y: 0, opacity: 1, scale: 1, duration: 1.2, stagger: 0.1 }, "-=0.6")
        .fromTo(".hero-p", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1 }, "-=0.8")
        .fromTo(".hero-cta", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.1 }, "-=0.8")
        .fromTo(".structural-dashboard", 
          { y: 150, opacity: 0, rotateX: 25, scale: 0.9, transformOrigin: "top center" }, 
          { y: 0, opacity: 1, rotateX: 0, scale: 1, duration: 1.6, ease: "expo.out" }, "-=1.0"
        );

      // -- Detailed Bento Box Reveal --
      const bentoBoxes = gsap.utils.toArray(".bento-box") as HTMLElement[];
      bentoBoxes.forEach((box) => {
        gsap.fromTo(box, 
          { y: 50, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 1.2, ease: "power3.out",
            scrollTrigger: {
              trigger: box,
              start: "top 85%",
            }
          }
        );
      });
      
      // Floating cursors animation in Bento 2
      gsap.to(".mock-cursor-1", {
        x: 40, y: 20, duration: 2, repeat: -1, yoyo: true, ease: "sine.inOut"
      });
      gsap.to(".mock-cursor-2", {
        x: -30, y: -20, duration: 2.5, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 0.5
      });

    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-black text-zinc-50 font-sans selection:bg-white/20 overflow-x-hidden">
      
      {/* Absolute Dark Grid & Very subtle glow */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <FlickeringGrid
           className="relative inset-0 z-0 size-full [mask-image:radial-gradient(circle_at_center,white,transparent_80%)]"
           squareSize={3}
           gridGap={8}
           color="#ffffff"
           maxOpacity={0.15}
           flickerChance={0.1}
        />
      </div>
      <div className="fixed top-[-10%] left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Modern, minimalist navbar - TweakCN style */}
      <header className="nav-header fixed top-0 w-full z-50 border-b border-white/[0.05] bg-black/60 backdrop-blur-xl supports-[backdrop-filter]:bg-black/40">
        <div className="max-w-[88rem] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="TaskFlow Logo" width={32} height={32} className="w-8 h-8 object-contain" />
            <span className="text-white font-medium text-sm tracking-tight">TaskFlow</span>
            <div className="h-4 w-[1px] bg-white/[0.1] mx-1"></div>
            <span className="hidden sm:flex text-[11px] uppercase tracking-widest text-zinc-500 font-medium">Enterprise</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="https://github.com/Anuragtech02/taskflow" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Documentation</a>
            <a href="https://github.com/Anuragtech02/taskflow" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-[13px] font-medium text-zinc-400 hover:text-white transition-colors hidden sm:block">
              Log in
            </Link>
            <Link href="/register" className="bg-white hover:bg-zinc-200 text-black px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Structural Hero Section */}
      <section className="relative z-10 pt-40 pb-20 lg:pt-52 lg:pb-32 px-6">
        <div className="max-w-6xl mx-auto text-center flex flex-col items-center">
          
          <div className="hero-h1 text-5xl md:text-7xl lg:text-[7.5rem] font-bold tracking-tighter text-white mb-6 leading-[0.9]" style={{ perspective: "1000px" }}>
             <span className="block transform-gpu text-zinc-100">Task management</span>
             <span className="block transform-gpu text-zinc-500">for power users.</span>
          </div>

          <p className="hero-p text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed tracking-tight font-medium">
            Taskflow is the mission control for elite engineering teams. Self-hosted, blazingly fast, and meticulously structured. Built on Next.js and Postgres.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
            <Link href="/register" className="hero-cta group relative inline-flex items-center justify-center gap-2 bg-white text-black px-6 py-2.5 rounded-md text-sm font-semibold transition-all active:scale-[0.98] shadow-lg">
               Start Building
               <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a href="https://github.com/Anuragtech02/taskflow" target="_blank" rel="noopener noreferrer" className="hero-cta inline-flex items-center justify-center gap-2 border border-white/[0.08] bg-black/50 backdrop-blur-md hover:bg-white/[0.05] text-white px-6 py-2.5 rounded-md text-sm font-medium transition-all active:scale-[0.98]">
               Read the Docs
               <span className="text-zinc-500 text-xs ml-2 font-mono">v2.0</span>
            </a>
          </div>

          {/* Coded High-Fidelity Dashboard Mockup */}
          <div className="structural-dashboard mt-24 w-full relative" style={{ transformStyle: "preserve-3d" }}>
            {/* Elegant fading bottom mask */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-20 bottom-[-2px] h-[120%] pointer-events-none" />
            
            <div className="rounded-xl overflow-hidden border border-white/[0.1] bg-[#0A0A0A] shadow-[0_0_80px_rgba(255,255,255,0.03)] flex flex-col md:flex-row text-left backdrop-blur-xl h-[600px] relative z-10 mx-auto max-w-5xl">
              
              {/* Sidebar Mockup */}
              <div className="w-64 border-r border-white/[0.06] bg-[#050505] p-4 hidden md:flex flex-col gap-6">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">Ac</div>
                  <span className="text-sm font-medium text-zinc-200">Acme Corp</span>
                  <ChevronRight className="w-3 h-3 text-zinc-600 ml-auto" />
                </div>
                
                <div className="flex flex-col gap-1">
                  <div className="px-2 py-1.5 flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md transition-colors text-xs font-medium cursor-pointer">
                    <Search className="w-3.5 h-3.5" /> Search <span className="ml-auto text-[10px] font-mono border border-white/[0.1] px-1 rounded bg-black">⌘K</span>
                  </div>
                  <div className="px-2 py-1.5 flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md transition-colors text-xs font-medium cursor-pointer">
                    <Bell className="w-3.5 h-3.5" /> Inbox <span className="ml-auto w-4 h-4 rounded-full bg-indigo-500 text-[9px] text-white flex items-center justify-center">3</span>
                  </div>
                  <div className="px-2 py-1.5 flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md transition-colors text-xs font-medium cursor-pointer">
                    <Settings className="w-3.5 h-3.5" /> Settings
                  </div>
                </div>

                <div className="flex flex-col gap-1 mt-4">
                  <div className="px-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-1">Spaces</div>
                  <div className="px-2 py-1.5 flex items-center gap-2 text-zinc-200 bg-white/[0.05] rounded-md transition-colors text-xs font-medium cursor-pointer">
                    <HashIcon className="w-3 h-3 text-indigo-400" /> Engineering
                  </div>
                  <div className="px-2 py-1.5 flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md transition-colors text-xs font-medium cursor-pointer pl-6">
                    <Layers className="w-3 h-3" /> Sprint 42
                  </div>
                  <div className="px-2 py-1.5 flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md transition-colors text-xs font-medium cursor-pointer pl-6">
                    <CheckSquare className="w-3 h-3" /> Backlog
                  </div>
                  <div className="px-2 py-1.5 flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-md transition-colors text-xs font-medium cursor-pointer">
                    <HashIcon className="w-3 h-3 text-emerald-400" /> Marketing
                  </div>
                </div>
              </div>

              {/* Main Content Mockup */}
              <div className="flex-1 flex flex-col bg-black overflow-hidden relative">
                 {/* Topbar */}
                 <div className="h-14 border-b border-white/[0.06] flex items-center justify-between px-6 bg-[#030303]">
                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                       <LayoutGrid className="w-4 h-4 text-zinc-500" />
                       <span>Engineering</span>
                       <ChevronRight className="w-3 h-3 text-zinc-600" />
                       <span className="text-zinc-200">Sprint 42</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="flex -space-x-2">
                          <img src="https://i.pravatar.cc/100?img=1" alt="Avatar" className="w-6 h-6 rounded-full border border-black" />
                          <img src="https://i.pravatar.cc/100?img=2" alt="Avatar" className="w-6 h-6 rounded-full border border-black" />
                          <img src="https://i.pravatar.cc/100?img=3" alt="Avatar" className="w-6 h-6 rounded-full border border-black" />
                       </div>
                       <div className="w-[1px] h-4 bg-white/[0.1]"></div>
                       <button className="bg-white text-black px-3 py-1 rounded text-xs font-semibold flex items-center gap-1">
                          <Plus className="w-3 h-3" /> New Task
                       </button>
                    </div>
                 </div>

                 {/* Kanban Board Area */}
                 <div className="flex-1 p-6 flex gap-6 overflow-hidden">
                    {/* Column 1 */}
                    <div className="w-1/3 min-w-[280px] flex flex-col gap-3">
                       <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">
                          Do To <span className="bg-white/[0.08] text-zinc-300 px-1.5 py-0.5 rounded">2</span>
                       </div>
                       <KanbanCard title="Implement GSAP ScrollTriggers" tags={["Frontend", "P1"]} avatar="4" />
                       <KanbanCard title="Migrate Postgres DB to Edge" tags={["Backend", "P0"]} avatar="5" />
                    </div>
                    {/* Column 2 */}
                    <div className="w-1/3 min-w-[280px] flex flex-col gap-3">
                       <div className="flex items-center justify-between text-xs font-semibold text-indigo-400 uppercase tracking-wider px-1">
                          In Progress <span className="bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">1</span>
                       </div>
                       <KanbanCard title="Setup exact Shadcn styling" tags={["Design", "P1"]} avatar="1" active />
                    </div>
                    {/* Column 3 */}
                    <div className="w-1/3 min-w-[280px] flex flex-col gap-3">
                       <div className="flex items-center justify-between text-xs font-semibold text-emerald-400 uppercase tracking-wider px-1">
                          Done <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">3</span>
                       </div>
                       <KanbanCard title="Fix JWT Auth tokens" tags={["Security"]} avatar="2" done />
                       <div className="h-24 border border-dashed border-white/[0.08] rounded-xl flex items-center justify-center text-xs font-medium text-zinc-500 hover:border-white/[0.2] hover:text-zinc-400 transition-colors cursor-pointer">
                          + Drop tasks here
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Structured Bento Grid Component Showcases */}
      <section id="features" className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20 text-center md:text-left flex flex-col md:flex-row gap-8 justify-between items-end">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-white mb-4">Precision Engineered. <br/>Pixel perfect.</h2>
              <p className="text-lg text-zinc-400 tracking-tight max-w-xl font-medium leading-relaxed">
                TaskFlow isn't just another checklist. It is a highly optimized, beautifully crafted workspace for teams that demand excellence.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Component Showcase 1: Command Palette */}
            <div className="bento-box lg:col-span-2 relative rounded-2xl border border-white/[0.1] bg-[#0A0A0A] p-1 flex flex-col overflow-hidden group">
               <BorderBeam size={250} duration={12} delay={9} colorFrom="#818cf8" colorTo="#c084fc" />
               <div className="px-8 pt-8 pb-4 relative z-10">
                 <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Omnipresent Command Palette</h3>
                 <p className="text-zinc-400 font-medium text-sm w-3/4">Navigate exactly where you need to go. Assign tasks, switch workspaces, and apply templates purely from your keyboard.</p>
               </div>
               
               {/* Coded Command Palette Mockup */}
               <div className="flex-1 mt-4 relative bg-[#0f0f11] border-t border-white/[0.08] flex items-center justify-center p-8 overflow-hidden rounded-b-xl">
                  {/* Subtle Glow */}
                  <div className="absolute top-0 right-10 w-32 h-32 bg-indigo-500/10 blur-[50px] rounded-full pointer-events-none" />
                  
                  <div className="w-full max-w-sm bg-[#0A0A0A] border border-white/[0.1] rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden transform group-hover:scale-[1.02] transition-transform duration-500">
                     <div className="flex items-center px-4 py-3 border-b border-white/[0.08] gap-3">
                        <Search className="w-4 h-4 text-zinc-400" />
                        <span className="text-sm font-medium text-white flex-1 relative top-[1px]">Assign...</span>
                        <kbd className="text-[10px] font-mono text-zinc-500 bg-white/[0.05] px-1.5 rounded border border-white/[0.05]">ESC</kbd>
                     </div>
                     <div className="p-2 flex flex-col gap-1">
                        <div className="text-[10px] uppercase font-semibold text-zinc-500 px-2 py-1 tracking-widest mt-1 mb-1">Suggestions</div>
                        <div className="flex items-center gap-3 px-2 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-sm text-indigo-300">
                           <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">AK</div>
                           Assign to Alex
                        </div>
                        <div className="flex items-center gap-3 px-2 py-2 hover:bg-white/[0.02] rounded-md text-sm text-zinc-400">
                           <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">SK</div>
                           Assign to Sarah
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Component Showcase 2: Multi-player */}
            <div className="bento-box relative rounded-2xl border border-white/[0.1] bg-[#0A0A0A] p-1 flex flex-col overflow-hidden group">
               <BorderBeam size={250} duration={12} delay={9} colorFrom="#34d399" colorTo="#10b981" />
               <div className="px-8 pt-8 pb-4 relative z-10">
                 <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Real-Time Collab</h3>
                 <p className="text-zinc-400 font-medium text-sm">See exactly who is editing, instantly.</p>
               </div>
               
               <div className="flex-1 mt-4 relative bg-[#0f0f11] border-t border-white/[0.08] rounded-b-xl p-8 overflow-hidden flex items-center justify-center">
                  <div className="text-sm text-zinc-500 font-medium w-full relative">
                     The server component architecture allows us to fetch |
                     
                     <div className="mock-cursor-1 absolute top-0 left-10 flex flex-col items-start z-10">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 fill-indigo-400/20 translate-y-[-10px] translate-x-[4px] -rotate-12"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
                        <span className="bg-indigo-500 shadow-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded translate-x-3 translate-y-[-5px]">Oli</span>
                     </div>

                     <div className="mock-cursor-2 absolute bottom-[-40px] right-10 flex flex-col items-start z-10">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 fill-emerald-400/20 translate-y-[-10px] translate-x-[4px] -rotate-12"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
                        <span className="bg-emerald-500 shadow-md text-white text-[9px] font-bold px-1.5 py-0.5 rounded translate-x-3 translate-y-[-5px]">Mia</span>
                     </div>
                  </div>
               </div>
            </div>

          </div>
        </div>
      </section>

      {/* Structural Minimal Footer */}
      <footer className="relative z-10 border-t border-white/[0.08] bg-black pt-12 pb-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="TaskFlow Logo" width={28} height={28} className="w-7 h-7 object-contain" />
            <span className="text-zinc-500 font-medium text-xs tracking-tight">TaskFlow Inc. © {new Date().getFullYear()}</span>
          </div>
          
          <div className="flex gap-8 text-xs text-zinc-500 font-medium">
             <a href="#" className="hover:text-zinc-200 transition-colors">Twitter X</a>
             <a href="https://github.com/Anuragtech02/taskflow" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-200 transition-colors">GitHub Repository</a>
             <a href="#" className="hover:text-zinc-200 transition-colors">Terms & Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// -- Helper UI Components for the Mockup --

function HashIcon({ className }: { className?: string }) {
  return <span className={`font-mono font-bold leading-none ${className}`}>#</span>;
}

function KanbanCard({ title, tags, avatar, active, done }: { title: string, tags: string[], avatar: string, active?: boolean, done?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${active ? 'border-indigo-500/50 bg-[#101015]' : 'border-white/[0.08] bg-[#0A0A0A]'} shadow-sm flex flex-col gap-3 group relative cursor-pointer hover:border-white/[0.2] transition-colors`}>
       <div className={`text-sm tracking-tight font-medium ${done ? 'line-through text-zinc-500' : 'text-zinc-200'} leading-snug`}>
         {title}
       </div>
       <div className="flex items-center justify-between mt-1">
          <div className="flex gap-2">
             {tags.map(tag => (
                <span key={tag} className="px-1.5 py-0.5 bg-white/[0.05] rounded text-[10px] text-zinc-400 font-medium">
                  {tag}
                </span>
             ))}
          </div>
          <img src={`https://i.pravatar.cc/100?img=${avatar}`} alt="Avatar" className="w-5 h-5 rounded-full ring-2 ring-black grayscale group-hover:grayscale-0 transition-all" />
       </div>
    </div>
  );
}
