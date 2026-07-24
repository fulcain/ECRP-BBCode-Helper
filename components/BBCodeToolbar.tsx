"use client";

import { useState, useRef, useEffect } from "react";
import { tagCategories, formatHotkey, type BBCodeTag } from "@/lib/bbcode";

interface BBCodeToolbarProps {
  onApplyTag: (tag: BBCodeTag) => void;
}

function ModernTooltip({ tag, children }: { tag: BBCodeTag; children: React.ReactNode }) {
  return (
    <div className="group relative inline-flex">
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-1 group-hover:translate-y-0 z-50">
        <div className="rounded-xl border border-white/[0.08] bg-zinc-900/95 px-3.5 py-2.5 shadow-2xl backdrop-blur-xl min-w-[200px]">
          <p className="text-xs font-medium text-white/90">{tag.description}</p>
          <div className="mt-1.5 flex items-center gap-2">
            {tag.hotkey && (
              <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                <kbd className="text-zinc-500">Ctrl</kbd>
                <span className="text-zinc-600">+</span>
                <kbd className="text-violet-400">
                  {formatHotkey(tag.hotkey).replace("Ctrl+", "")}
                </kbd>
              </span>
            )}
            {tag.hasValue && (
              <span className="text-[10px] text-amber-500/60">needs input</span>
            )}
          </div>
        </div>
        <div className="mx-auto h-2 w-2 -mt-1 rotate-45 bg-zinc-900 border-l border-t border-white/[0.08]" />
      </div>
    </div>
  );
}

export default function BBCodeToolbar({ onApplyTag }: BBCodeToolbarProps) {
  const [activeCategory, setActiveCategory] = useState(tagCategories[0].id);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeCategoryData = tagCategories.find((c) => c.id === activeCategory);

  return (
    <div className="border-b border-white/[0.04] bg-zinc-900/40 backdrop-blur-xl">
      {/* Category pills - horizontal scroll */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1 overflow-x-auto px-4 pt-2.5 pb-0 scrollbar-none"
      >
        <div className="flex items-center gap-1 rounded-xl bg-zinc-800/30 p-0.5 border border-white/[0.03]">
          {tagCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`
                relative flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all duration-200
                ${
                  activeCategory === cat.id
                    ? "bg-gradient-to-b from-zinc-700/80 to-zinc-700/40 text-white shadow-lg shadow-black/10"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
                }
              `}
            >
              {activeCategory === cat.id && (
                <div className="absolute inset-0 rounded-lg border border-white/[0.06]" />
              )}
              <span className="relative">{cat.icon}</span>
              <span className="relative hidden sm:inline">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tags row */}
      <div className="relative px-3 pb-2.5 pt-2">
        {activeCategoryData && (
          <div className="flex flex-wrap items-center gap-1">
            {activeCategoryData.tags.map((tag) => (
              <ModernTooltip key={tag.id} tag={tag}>
                <button
                  onClick={() => onApplyTag(tag)}
                  className="group relative flex items-center gap-1.5 rounded-lg border border-white/[0.04] bg-zinc-800/30 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition-all duration-150 hover:border-violet-500/25 hover:bg-gradient-to-b hover:from-violet-500/10 hover:to-violet-500/5 hover:text-zinc-200 active:scale-95 overflow-hidden"
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-500/5 via-transparent to-transparent" />
                  </div>
                  
                  <span className="relative">{tag.icon}</span>
                  <span className="relative">{tag.label}</span>
                  
                  {tag.hotkey && (
                    <kbd className="relative ml-0.5 hidden sm:inline-flex items-center rounded border border-white/[0.04] bg-white/[0.03] px-1 py-0.5 text-[8px] font-mono leading-none text-zinc-600 group-hover:text-violet-500/60 transition-colors">
                      {formatHotkey(tag.hotkey)}
                    </kbd>
                  )}
                  
                  {tag.hasValue && (
                    <span className="relative text-zinc-700 group-hover:text-amber-500/40 transition-colors text-[8px]">
                      ⚙️
                    </span>
                  )}
                </button>
              </ModernTooltip>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
