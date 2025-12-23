'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Plus, 
  LayoutGrid, 
  FileBadge2, 
  Box, 
  Search, 
  MessageSquare, 
  Settings,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming this exists, standard in shadcn/next projects

interface SidebarProps {
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
  currentSessionId: string | null;
  sessions: any[]; // Replace with proper type later
}

export function Sidebar({ onNewSession, onSelectSession, currentSessionId, sessions }: SidebarProps) {
  return (
    <div className="w-[260px] h-full flex flex-col py-5 px-3 gap-6 shrink-0 z-50 bg-[#09090b] border-r border-white/10">
        
        {/* Top: Logo & New */}
        <div className="px-2">
            <div className="flex items-center gap-2 mb-6 text-white font-bold tracking-tight select-none">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-orange-500 to-orange-600 shadow-lg shadow-orange-500/20 flex items-center justify-center text-xs">IB</div>
                <span>ImageBox</span>
            </div>

            <button
              onClick={onNewSession}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25 py-2.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 group"
            >
                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> 
                New Creation
            </button>
        </div>

        <div className="h-[1px] bg-white/5 mx-2"></div>

        {/* Navigation - These are links to other pages */}
        <div className="flex flex-col gap-1 px-1">
             <Link href="/library" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
                 <LayoutGrid className="w-4 h-4" /> Library
             </Link>
             <Link href="/templates" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
                 <FileBadge2 className="w-4 h-4" /> Templates
             </Link>
             <Link href="/models" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
                 <Box className="w-4 h-4" /> Models
             </Link>
        </div>

        <div className="h-[1px] bg-white/5 mx-2"></div>

        {/* History Section */}
        <div className="flex-1 flex flex-col gap-2 min-h-0">
             <div className="px-3 text-xs font-bold text-zinc-600 uppercase tracking-widest mt-2 flex justify-between items-center group">
                 History 
                 <Search className="w-3 h-3 hover:text-zinc-300 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity" />
             </div>
             
             <div className="overflow-y-auto flex-1 -mx-2 px-2 space-y-1 custom-scrollbar">
                 {sessions.map((session) => (
                   <div 
                      key={session.id}
                      onClick={() => onSelectSession(session.id)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer truncate group select-none",
                        currentSessionId === session.id 
                          ? "bg-white/10 text-white" 
                          : "text-zinc-500 hover:text-white hover:bg-white/5"
                      )}
                   >
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-50 group-hover:opacity-100" />
                      <span className="truncate">{session.title || "Untitled Session"}</span>
                   </div>
                 ))}
                 
                 {sessions.length === 0 && (
                   <div className="px-3 py-4 text-xs text-zinc-600 text-center italic">
                     No history yet
                   </div>
                 )}
             </div>
        </div>

        {/* User Footer */}
        <div className="mt-auto pt-4 border-t border-white/5 px-2">
             <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                 <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center text-xs font-bold">U</div>
                 <div className="flex flex-col overflow-hidden">
                     <span className="text-xs font-medium text-zinc-200 truncate">User</span>
                 </div>
                 <Settings className="w-3.5 h-3.5 text-zinc-600 ml-auto" />
             </div>
        </div>
    </div>
  );
}
