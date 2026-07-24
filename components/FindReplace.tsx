"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface FindReplaceProps {
  text: string;
  onChange: (newText: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  isOpen: boolean;
  onClose: () => void;
}

export default function FindReplace({
  text,
  onChange,
  textareaRef,
  isOpen,
  onClose,
}: FindReplaceProps) {
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [allMatches, setAllMatches] = useState<{ start: number; end: number }[]>([]);
  const [hasNavigated, setHasNavigated] = useState(false);
  const findInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Find all matches
  const findAllMatches = useCallback(() => {
    if (!findText) {
      setAllMatches([]);
      setMatchCount(0);
      setCurrentMatch(0);
      setHasNavigated(false);
      return;
    }

    const matches: { start: number; end: number }[] = [];
    let flags = "g";
    if (!caseSensitive) flags += "i";

    let searchText = findText;
    if (wholeWord) {
      searchText = `\\b${findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`;
    } else {
      searchText = findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    try {
      const regex = new RegExp(searchText, flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({ start: match.index, end: match.index + match[0].length });
      }
    } catch {
      // Invalid regex
    }

    setAllMatches(matches);
    setMatchCount(matches.length);
    setCurrentMatch(matches.length > 0 ? 1 : 0);
    setHasNavigated(false);
  }, [findText, text, caseSensitive, wholeWord]);

  useEffect(() => {
    findAllMatches();
  }, [findAllMatches]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => findInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Navigate to a specific match (0-indexed)
  const goToMatch = useCallback((index: number) => {
    if (index < 0 || index >= allMatches.length) return;
    const match = allMatches[index];
    const ta = textareaRef.current;
    if (!ta) return;

    ta.focus();

    // Use requestAnimationFrame to ensure focus completes before selecting
    requestAnimationFrame(() => {
      ta.setSelectionRange(match.start, match.end);

      // Calculate scroll based on line number for accuracy
      const textBefore = text.substring(0, match.start);
      const lineNum = textBefore.split('\n').length;
      const lineHeight = 21; // matches the textarea line-height
      const targetScroll = Math.max(0, (lineNum - 1) * lineHeight - ta.clientHeight / 3);
      ta.scrollTop = targetScroll;
    });

    setCurrentMatch(index + 1);
    setHasNavigated(true);
  }, [allMatches, text, textareaRef]);

  const findNext = useCallback(() => {
    if (matchCount === 0) return;
    if (!hasNavigated) {
      // First navigation: go to first match
      goToMatch(0);
    } else {
      const nextIdx = currentMatch % matchCount;
      goToMatch(nextIdx);
    }
  }, [matchCount, hasNavigated, currentMatch, goToMatch]);

  const findPrev = useCallback(() => {
    if (matchCount === 0) return;
    if (!hasNavigated) {
      // First navigation: go to last match
      goToMatch(matchCount - 1);
    } else {
      const prevIdx = (currentMatch - 2 + matchCount) % matchCount;
      goToMatch(prevIdx);
    }
  }, [matchCount, hasNavigated, currentMatch, goToMatch]);

  // Replace the current match
  const replaceCurrent = useCallback(() => {
    if (!findText || allMatches.length === 0) return;
    const idx = currentMatch - 1;
    if (idx < 0 || idx >= allMatches.length) {
      if (allMatches.length > 0) {
        goToMatch(0);
        return;
      }
      return;
    }

    const match = allMatches[idx];
    const newText = text.slice(0, match.start) + replaceText + text.slice(match.end);
    onChange(newText);
  }, [findText, allMatches, currentMatch, text, replaceText, onChange]);

  // Replace all matches
  const replaceAll = useCallback(() => {
    if (!findText || allMatches.length === 0) return;

    let flags = "g";
    if (!caseSensitive) flags += "i";

    let searchText = findText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (wholeWord) {
      searchText = `\\b${searchText}\\b`;
    }

    try {
      const regex = new RegExp(searchText, flags);
      const newText = text.replace(regex, replaceText);
      onChange(newText);
    } catch {
      // Invalid regex
    }
  }, [findText, allMatches, caseSensitive, wholeWord, text, replaceText, onChange]);

  if (!isOpen) return null;

  return (
    <div className="border-b border-white/[0.04] bg-gradient-to-r from-zinc-900/90 via-zinc-900/80 to-zinc-900/90 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 pt-2.5 pb-1.5">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-500/10">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-violet-400">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>
          <span className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">
            Find & Replace
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="px-4 pb-3 space-y-2">
        {/* Find & Replace inputs side by side on larger screens */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          {/* Find input */}
          <div className="relative">
            <input
              ref={findInputRef}
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Find..."
              className="w-full rounded-lg border border-white/[0.06] bg-zinc-800/50 pl-8 pr-12 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:border-violet-500/40 focus:bg-zinc-800/80 focus:ring-1 focus:ring-violet-500/10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (e.shiftKey) findPrev();
                  else findNext();
                }
                if (e.key === "Escape") {
                  onClose();
                }
                if (e.key === "Tab") {
                  e.preventDefault();
                  replaceInputRef.current?.focus();
                }
              }}
            />
            {/* Search icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            {/* Match counter */}
            {findText && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {matchCount > 0 ? (
                  <span className="text-[11px] font-medium text-zinc-500">
                    <span className="text-violet-400">{currentMatch}</span>
                    <span className="text-zinc-600">/</span>
                    <span className="text-zinc-500">{matchCount}</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-red-400/70">No matches</span>
                )}
              </div>
            )}
          </div>

          {/* Replace input */}
          <div className="relative">
            <input
              ref={replaceInputRef}
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replace with..."
              className="w-full rounded-lg border border-white/[0.06] bg-zinc-800/50 pl-8 pr-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:border-amber-500/40 focus:bg-zinc-800/80 focus:ring-1 focus:ring-amber-500/10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (e.shiftKey) replaceAll();
                  else replaceCurrent();
                }
                if (e.key === "Escape") {
                  onClose();
                }
                if (e.key === "Tab" && e.shiftKey) {
                  e.preventDefault();
                  findInputRef.current?.focus();
                }
              }}
            />
            {/* Replace icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={findPrev}
              disabled={!findText || matchCount === 0}
              className="rounded-lg border border-white/[0.06] bg-zinc-800/50 px-2.5 py-2 text-xs font-medium text-zinc-400 transition-all hover:bg-zinc-700/50 hover:text-zinc-200 hover:border-white/10 disabled:opacity-25 disabled:cursor-not-allowed"
              title="Previous match (Shift+Enter)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button
              onClick={findNext}
              disabled={!findText || matchCount === 0}
              className="rounded-lg border border-white/[0.06] bg-zinc-800/50 px-2.5 py-2 text-xs font-medium text-zinc-400 transition-all hover:bg-zinc-700/50 hover:text-zinc-200 hover:border-white/10 disabled:opacity-25 disabled:cursor-not-allowed"
              title="Next match (Enter)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            <div className="w-px h-6 bg-white/[0.04] mx-0.5" />
            <button
              onClick={replaceCurrent}
              disabled={!findText || matchCount === 0}
              className="rounded-lg border border-amber-500/15 bg-amber-500/8 px-3 py-2 text-xs font-medium text-amber-400/80 transition-all hover:bg-amber-500/15 hover:text-amber-300 disabled:opacity-25 disabled:cursor-not-allowed whitespace-nowrap"
              title="Replace current (Enter in replace field)"
            >
              Replace
            </button>
            <button
              onClick={replaceAll}
              disabled={!findText || matchCount === 0}
              className="rounded-lg border border-violet-500/15 bg-violet-500/8 px-3 py-2 text-xs font-medium text-violet-400/80 transition-all hover:bg-violet-500/15 hover:text-violet-300 disabled:opacity-25 disabled:cursor-not-allowed whitespace-nowrap"
              title="Replace all (Shift+Enter in replace field)"
            >
              All
            </button>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/15 bg-zinc-700/50 text-violet-500 focus:ring-violet-500/30 focus:ring-offset-0 cursor-pointer transition-all"
            />
            <span className="text-[11px] text-zinc-600 group-hover:text-zinc-400 transition-colors">
              Aa
              <span className="ml-1 text-zinc-700">Case</span>
            </span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={wholeWord}
              onChange={(e) => setWholeWord(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/15 bg-zinc-700/50 text-violet-500 focus:ring-violet-500/30 focus:ring-offset-0 cursor-pointer transition-all"
            />
            <span className="text-[11px] text-zinc-600 group-hover:text-zinc-400 transition-colors">
              ab
              <span className="ml-1 text-zinc-700">Word</span>
            </span>
          </label>
          <div className="flex-1" />
          {matchCount > 0 && (
            <span className="text-[10px] text-zinc-600/60 font-mono">
              {matchCount} result{matchCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
