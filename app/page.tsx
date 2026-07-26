"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import BBCodeToolbar from "@/components/BBCodeToolbar";
import FindReplace from "@/components/FindReplace";
import ImgurConverter from "@/components/ImgurConverter";
import { useToasts } from "@/components/Toast";
import { useModal } from "@/components/Modal";
import { tagCategories, type BBCodeTag } from "@/lib/bbcode";
import {
  loadEditorText,
  saveEditorText,
  loadConversions,
  saveConversions,
  clearAllData,
  type SavedConversion,
} from "@/lib/storage";

import Link from "next/link";

export default function Home() {
  const [text, setText] = useState("");
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showImgurConverter, setShowImgurConverter] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [lineCount, setLineCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState<"saved" | "saving" | null>(null);
  const [conversions, setConversions] = useState<SavedConversion[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addToast } = useToasts();
  const { showConfirm, showPrompt } = useModal();

  // ─── Load saved data on mount ───────────────────────────────────────────
  useEffect(() => {
    const savedText = loadEditorText();
    if (savedText) {
      setText(savedText);
      setCharCount(savedText.length);
      setWordCount(savedText.trim() ? savedText.trim().split(/\s+/).length : 0);
      setLineCount(savedText ? savedText.split("\n").length : 0);
    }
    setConversions(loadConversions());
  }, []);

  // ─── Auto-save: debounced save when text changes ──────────────────────
  useEffect(() => {
    // Skip the initial empty-text save
    if (text === "" && charCount === 0) return;

    // Clear previous timer
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    setSavedIndicator("saving");

    saveTimerRef.current = setTimeout(() => {
      saveEditorText(text);
      setSavedIndicator("saved");

      // Clear indicator after 2s
      if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
      indicatorTimerRef.current = setTimeout(() => {
        setSavedIndicator(null);
      }, 2000);
    }, 600); // 600ms debounce

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
    };
  }, [text]);

  // Update stats
  const updateStats = useCallback((val: string) => {
    setText(val);
    setCharCount(val.length);
    setWordCount(val.trim() ? val.trim().split(/\s+/).length : 0);
    setLineCount(val ? val.split("\n").length : 0);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateStats(e.target.value);
    },
    [updateStats]
  );

  // Apply a BBCode tag to the text (synchronous part — value prompts use showPrompt)
  const applyTag = useCallback(
    (tag: BBCodeTag) => {
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selectedText = text.substring(start, end);

      if (tag.selfClosing) {
        const finalText = text.substring(0, start) + tag.openTag + text.substring(end);
        setText(finalText);
        updateStats(finalText);
        setTimeout(() => {
          ta.focus();
          ta.setSelectionRange(start + tag.openTag.length, start + tag.openTag.length);
        }, 0);
        return;
      }

      if (tag.hasValue) {
        // Show the prompt modal asynchronously
        showPrompt({
          title: `Tag: ${tag.label}`,
          message: `Enter a value for the ${tag.label} tag.`,
          defaultValue: tag.valuePlaceholder || "",
          placeholder: tag.valuePlaceholder || "Enter value...",
          confirmLabel: "Apply",
          cancelLabel: "Cancel",
        }).then((value) => {
          if (value === null) return;
          const openWithValue = `${tag.openTag}${value}]`;
          const finalText =
            text.substring(0, start) +
            openWithValue +
            (selectedText || "") +
            tag.closeTag +
            text.substring(end);

          setText(finalText);
          updateStats(finalText);
          setTimeout(() => {
            ta.focus();
            const cursorPos = start + openWithValue.length + (selectedText ? selectedText.length : 0);
            ta.setSelectionRange(cursorPos, cursorPos);
          }, 0);
        });
        return;
      }

      const insertion = selectedText
        ? tag.openTag + selectedText + tag.closeTag
        : tag.openTag + tag.closeTag;

      const finalText = text.substring(0, start) + insertion + text.substring(end);
      setText(finalText);
      updateStats(finalText);

      setTimeout(() => {
        ta.focus();
        const cursorPos = start + (selectedText ? insertion.length : tag.openTag.length);
        ta.setSelectionRange(cursorPos, cursorPos);
      }, 0);
    },
    [text, updateStats, showPrompt]
  );

  // Insert new list item
  const insertListItem = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const pos = ta.selectionStart;
    const newText = text.substring(0, pos) + "\n[*] " + text.substring(pos);
    setText(newText);
    updateStats(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(pos + 5, pos + 5);
    }, 0);
  }, [text, updateStats]);

  // Handle global hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (!isCtrl) return;

      if (e.shiftKey && e.key.toLowerCase() === "f") {
        if (!(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          setShowFindReplace((prev) => !prev);
          return;
        }
      }

      if (e.shiftKey && e.key.toLowerCase() === "u") {
        if (!(e.target instanceof HTMLInputElement)) {
          e.preventDefault();
          setShowImgurConverter((prev) => !prev);
          return;
        }
      }

      // Ctrl+Enter: Insert new list item
      if (e.key === "Enter" && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        insertListItem();
        return;
      }

      const activeEl = document.activeElement;
      if (activeEl !== textareaRef.current) return;

      for (const cat of tagCategories) {
        for (const tag of cat.tags) {
          if (!tag.hotkey) continue;
          const parts = tag.hotkey.split("+");
          const needsShift = parts.includes("shift");
          const key = parts[parts.length - 1].toLowerCase();

          if (e.key.toLowerCase() === key && e.shiftKey === needsShift && !e.altKey) {
            e.preventDefault();
            applyTag(tag);
            return;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [applyTag, insertListItem]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async () => {
    if (!text) {
      addToast("Nothing to copy!", "warning");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      addToast("BBCode copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast("Failed to copy to clipboard", "error");
    }
  }, [text, addToast]);

  // Clear with confirmation
  const clearText = useCallback(() => {
    if (!text) return;
    showConfirm({
      title: "Clear All Text",
      message: "Are you sure you want to clear all text? This action cannot be undone.",
      confirmLabel: "Clear",
      cancelLabel: "Cancel",
      variant: "danger",
    }).then((confirmed) => {
      if (confirmed) {
        setText("");
        updateStats("");
        addToast("Text cleared", "info");
        textareaRef.current?.focus();
      }
    });
  }, [text, updateStats, addToast, showConfirm]);

  const handleApplyTag = useCallback((tag: BBCodeTag) => applyTag(tag), [applyTag]);

  // ─── Reset All: wipe editor text + conversion history ─────────────────────
  const handleResetAll = useCallback(() => {
    showConfirm({
      title: "Reset Everything",
      message: "This will permanently delete your editor text and all conversion history. Are you sure?",
      confirmLabel: "Reset All",
      cancelLabel: "Cancel",
      variant: "danger",
    }).then((confirmed) => {
      if (confirmed) {
        clearAllData();
        setText("");
        updateStats("");
        setConversions([]);
        addToast("All data has been reset", "info");
      }
    });
  }, [showConfirm, addToast, updateStats]);

  return (
    <div className="flex flex-col h-full bg-[#07070b]">
      {/* Gradient accent line at top */}
      <div className="h-[2px] bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500/50 animate-gradient" />

      {/* Header */}
      <header className="border-b border-white/[0.03] bg-[#07070b]/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 lg:px-6 py-3">
          {/* Left: Logo + Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border border-white/[0.06]">
                <span className="text-base">🅱️</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white/90 tracking-tight leading-tight">
                  BBCode Helper
                </h1>
                <p className="text-[10px] text-zinc-600 leading-tight">ECRP</p>
              </div>
            </div>

            {/* Keyboard hints */}
            <div className="hidden md:flex items-center gap-1.5 ml-3 pl-3 border-l border-white/[0.04]">
              <kbd className="inline-flex items-center gap-1 rounded-md border border-white/[0.04] bg-white/[0.02] px-1.5 py-1 font-mono text-[9px] text-zinc-600">
                <span className="text-zinc-500">Ctrl+Shift+F</span>
              </kbd>
              <span className="text-[9px] text-zinc-700">Find</span>
            </div>
          </div>

          {/* Center: Page nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/convert"
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.04] bg-zinc-800/30 px-3 py-1.5 text-[11px] font-medium text-zinc-400 transition-all hover:border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-300"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              Image Converter
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFindReplace((prev) => !prev)}
              className={`relative flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all duration-200 ${
                showFindReplace
                  ? "border-violet-500/25 bg-violet-500/10 text-violet-300 shadow-lg shadow-violet-500/5"
                  : "border-white/[0.04] bg-zinc-800/30 text-zinc-400 hover:border-white/[0.08] hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
              title="Find & Replace (Ctrl+Shift+F)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <span className="hidden sm:inline">Find</span>
            </button>

            <button
              onClick={() => setShowImgurConverter((prev) => !prev)}
              className={`relative flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-all duration-200 ${
                showImgurConverter
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300 shadow-lg shadow-emerald-500/5"
                  : "border-white/[0.04] bg-zinc-800/30 text-zinc-400 hover:border-white/[0.08] hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
              title="Imgur to ImgBB Converter (Ctrl+Shift+U)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span className="hidden sm:inline">Imgur</span>
            </button>

            {/* Quick insert list item */}
            <button
              onClick={insertListItem}
              className="rounded-lg border border-white/[0.04] bg-zinc-800/30 px-2 py-1.5 text-[11px] font-medium text-zinc-500 transition-all hover:border-white/[0.08] hover:bg-zinc-800/50 hover:text-zinc-300"
              title="Insert new list item (Ctrl+Enter)"
            >
              Ctrl+Enter: Insert [*]
            </button>

            {/* Copy */}
            <button
              onClick={copyToClipboard}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 ${
                copied
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                  : "border-white/[0.04] bg-zinc-800/30 text-zinc-400 hover:border-white/[0.08] hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
              title="Copy to clipboard"
            >
              {copied ? (
                <span className="flex items-center gap-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Done
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                  Copy
                </span>
              )}
            </button>

            {/* Clear text */}
            <button
              onClick={clearText}
              className="rounded-lg border border-white/[0.04] bg-zinc-800/30 px-2 py-1.5 text-[11px] font-medium text-zinc-600 transition-all hover:border-rose-500/20 hover:bg-rose-500/5 hover:text-rose-400"
              title="Clear all text"
              disabled={!text}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>

            {/* Reset All */}
            <button
              onClick={handleResetAll}
              className="rounded-lg border border-white/[0.04] bg-zinc-800/30 px-2 py-1.5 text-[11px] font-medium text-zinc-600 transition-all hover:border-rose-500/20 hover:bg-rose-500/5 hover:text-rose-400"
              title="Reset all data — editor text & conversion history"
              disabled={!text && conversions.length === 0}
            >
              <span className="flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
                Reset
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <BBCodeToolbar onApplyTag={handleApplyTag} />

      {/* Find & Replace Panel */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        showFindReplace ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
      }`}>
        <FindReplace
          text={text}
          onChange={(newText) => updateStats(newText)}
          textareaRef={textareaRef}
          isOpen={true}
          onClose={() => setShowFindReplace(false)}
        />
      </div>

      {/* Imgur Converter Panel */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        showImgurConverter ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      }`}>
        <ImgurConverter
          text={text}
          onTextUpdate={(newText) => updateStats(newText)}
          isOpen={true}
          onClose={() => setShowImgurConverter(false)}
          onConversionResults={(results) => {
            const existing = loadConversions();
            const merged = [...results, ...existing];
            saveConversions(merged);
            setConversions(merged);
          }}
        />
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex relative min-h-0">
        <div className="flex-1 flex flex-col">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            className="
              flex-1 w-full resize-none border-0
              bg-[#07070b]
              px-5 sm:px-8 py-5
              text-sm leading-[21px]
              text-zinc-200 placeholder-zinc-800
              outline-none font-mono
              selection:bg-violet-500/25
              focus:ring-0
              transition-colors duration-200
              scrollbar-custom
            "
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
      </div>

      {/* Status Bar */}
      <footer className="flex items-center justify-between border-t border-white/[0.03] bg-[#07070b] px-4 lg:px-6 py-2">
        <div className="flex items-center gap-4">
          {[
            { label: "Lines", value: lineCount },
            { label: "Words", value: wordCount },
            { label: "Chars", value: charCount },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium text-zinc-600/60 uppercase tracking-wider">{stat.label}</span>
              <span className="text-[11px] font-mono text-zinc-400 tabular-nums">{stat.value}</span>
            </div>
          ))}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-zinc-600/60 uppercase tracking-wider">Size</span>
            <span className="text-[11px] font-mono text-zinc-500">
              {charCount > 0 ? `${(charCount / 1024).toFixed(1)} KB` : "0 KB"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active panel indicators */}
          {(showFindReplace || showImgurConverter) && (
            <div className="flex items-center gap-1.5">
              {showFindReplace && (
                <span className="inline-flex items-center gap-1 rounded border border-violet-500/10 bg-violet-500/5 px-1.5 py-0.5 text-[9px] text-violet-500/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500/50" />
                  Find
                </span>
              )}
              {showImgurConverter && (
                <span className="inline-flex items-center gap-1 rounded border border-emerald-500/10 bg-emerald-500/5 px-1.5 py-0.5 text-[9px] text-emerald-500/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/50" />
                  Imgur
                </span>
              )}

            </div>
          )}
          {/* Auto-save indicator */}
          {savedIndicator === "saving" && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-500/10 bg-amber-500/5 px-1.5 py-0.5 text-[9px] text-amber-500/50 animate-fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500/50 animate-pulse" />
              Saving
            </span>
          )}
          {savedIndicator === "saved" && (
            <span className="inline-flex items-center gap-1 rounded border border-emerald-500/10 bg-emerald-500/5 px-1.5 py-0.5 text-[9px] text-emerald-500/60 animate-fade-in">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Saved
            </span>
          )}
          {/* Discord indicator */}
          <a
            href="https://discord.com/users/fulcain"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/10 bg-indigo-500/5 px-2 py-1 text-[10px] font-medium text-indigo-300/70 transition-all hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-indigo-200 group"
            title="Contact @fulcain on Discord"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="group-hover:scale-110 transition-transform duration-200">
              <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>@fulcain</span>
          </a>
          <span className="text-[9px] text-zinc-700 font-mono">v1.0</span>
        </div>
      </footer>
    </div>
  );
}
