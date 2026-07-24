"use client";

import { useState, useRef, useCallback } from "react";
import { uploadToImgBB, uploadFileToImgBB, type ImageConvertResult } from "@/lib/imgbb";
import { useToasts } from "@/components/Toast";
import Link from "next/link";

type InputMode = "url" | "file";

export default function ConvertPage() {
  const { addToast } = useToasts();
  const [inputMode, setInputMode] = useState<InputMode>("url");
  const [urlInput, setUrlInput] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [results, setResults] = useState<ImageConvertResult[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert a single image URL
  const convertUrl = useCallback(async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      addToast("Please enter an image URL", "warning");
      return;
    }

    // Validate it looks like a URL
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      addToast("Please enter a valid URL (http:// or https://)", "warning");
      return;
    }

    setIsConverting(true);
    const response = await uploadToImgBB(trimmed);

    if (response.success && response.data) {
      const result: ImageConvertResult = {
        id: response.data.id,
        originalName: trimmed.split("/").pop() || "image",
        originalUrl: trimmed,
        thumbnailUrl: response.data.thumb.url,
        directUrl: response.data.url,
        bbCodeUrl: `[img]${response.data.url}[/img]`,
        deleteUrl: response.data.delete_url,
        size: response.data.size,
        success: true,
      };
      setResults((prev) => [result, ...prev]);
      addToast("Image converted successfully!", "success");
      setUrlInput("");
    } else {
      addToast(`Failed: ${response.error}`, "error");
    }
    setIsConverting(false);
  }, [urlInput, addToast]);

  // Handle Enter key on URL input
  const handleUrlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      convertUrl();
    }
  };

  // Convert uploaded files
  const convertFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      // Filter for image types
      const imageFiles = fileArray.filter((f) =>
        f.type.startsWith("image/")
      );
      if (imageFiles.length === 0) {
        addToast("Please select image files only", "warning");
        return;
      }

      setIsConverting(true);

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        addToast(
          `Converting ${i + 1}/${imageFiles.length}: ${file.name}`,
          "info"
        );

        const response = await uploadFileToImgBB(file);

        if (response.success && response.data) {
          const result: ImageConvertResult = {
            id: response.data.id,
            originalName: file.name,
            thumbnailUrl: response.data.thumb.url,
            directUrl: response.data.url,
            bbCodeUrl: `[img]${response.data.url}[/img]`,
            deleteUrl: response.data.delete_url,
            size: response.data.size,
            success: true,
          };
          setResults((prev) => [result, ...prev]);
        } else {
          const result: ImageConvertResult = {
            id: crypto.randomUUID(),
            originalName: file.name,
            thumbnailUrl: "",
            directUrl: "",
            bbCodeUrl: "",
            deleteUrl: "",
            size: file.size,
            success: false,
            error: response.error,
          };
          setResults((prev) => [result, ...prev]);
          addToast(`Failed: ${file.name} - ${response.error}`, "error");
        }
      }

      addToast(`Converted ${imageFiles.length} image(s)`, "success");
      setIsConverting(false);
    },
    [addToast]
  );

  // File input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      convertFiles(e.target.files);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      convertFiles(e.dataTransfer.files);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      addToast("Link copied!", "success");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      addToast("Failed to copy", "error");
    }
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Clear all results
  const clearResults = () => {
    if (results.length > 0) {
      setResults([]);
      addToast("Results cleared", "info");
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#07070b]">
      {/* Gradient accent line at top */}
      <div className="h-[2px] bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500/50 animate-gradient" />

      {/* Header with navigation */}
      <header className="border-b border-white/[0.03] bg-[#07070b]/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 lg:px-6 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg border border-white/[0.04] bg-zinc-800/30 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition-all hover:border-white/[0.08] hover:text-zinc-200"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Editor
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-white/[0.06]">
                <span className="text-base">🖼️</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white/90 tracking-tight leading-tight">
                  Image Converter
                </h1>
                <p className="text-[10px] text-zinc-600 leading-tight">Upload → ImgBB</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {results.length > 0 && (
              <button
                onClick={clearResults}
                className="rounded-lg border border-white/[0.04] bg-zinc-800/30 px-2.5 py-1.5 text-[11px] font-medium text-zinc-500 transition-all hover:border-rose-500/20 hover:bg-rose-500/5 hover:text-rose-400"
              >
                Clear results
              </button>
            )}

            <Link
              href="/"
              className="rounded-lg border border-white/[0.04] bg-zinc-800/30 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition-all hover:border-violet-500/20 hover:bg-violet-500/10 hover:text-violet-300"
            >
              BBCode Editor
            </Link>
          </div>
        </div>
      </header>

      {/* Input Section */}
      <div className="border-b border-white/[0.03] px-4 lg:px-6 py-4">
        {/* Mode Toggle */}
        <div className="flex items-center gap-1 mb-4">
          <button
            onClick={() => setInputMode("url")}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
              inputMode === "url"
                ? "bg-zinc-700/50 text-white border border-white/[0.08]"
                : "text-zinc-500 hover:text-zinc-300 border border-transparent"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
              Image URL
            </span>
          </button>
          <button
            onClick={() => setInputMode("file")}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
              inputMode === "file"
                ? "bg-zinc-700/50 text-white border border-white/[0.08]"
                : "text-zinc-500 hover:text-zinc-300 border border-transparent"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload File
            </span>
          </button>
        </div>

        {/* URL Input */}
        {inputMode === "url" && (
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={handleUrlKeyDown}
                placeholder="Paste an image URL (e.g. https://i.imgur.com/abc123.png)"
                className="w-full rounded-lg border border-white/[0.06] bg-zinc-800/50 pl-9 pr-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none transition-all focus:border-emerald-500/40 focus:bg-zinc-800/80 focus:ring-1 focus:ring-emerald-500/10"
              />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <button
              onClick={convertUrl}
              disabled={isConverting || !urlInput.trim()}
              className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isConverting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Converting
                </span>
              ) : (
                "Convert"
              )}
            </button>
          </div>
        )}

        {/* File Upload */}
        {inputMode === "file" && (
          <div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200
                ${
                  dragOver
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-white/[0.06] bg-zinc-800/20 hover:border-white/[0.12] hover:bg-zinc-800/30"
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/50 border border-white/[0.04]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-300">
                    Drop images here or click to browse
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">
                    Supports JPG, PNG, GIF, WEBP — multiple files allowed
                  </p>
                </div>
              </div>
            </div>

            {isConverting && (
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Uploading & converting images...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Section */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/30 border border-white/[0.04] mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-zinc-600">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <h3 className="text-sm font-medium text-zinc-500">No conversions yet</h3>
            <p className="text-xs text-zinc-700 mt-1 max-w-xs">
              Paste an image URL or upload files above. Converted images and their ImgBB links will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-500">
                {results.length} image{results.length !== 1 ? "s" : ""} converted
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {results.map((result) => (
                <div
                  key={`${result.id}-${result.originalName}`}
                  className="group rounded-xl border border-white/[0.04] bg-zinc-800/20 overflow-hidden transition-all duration-200 hover:border-white/[0.08] hover:bg-zinc-800/30"
                >
                  {/* Image Preview */}
                  <div className="relative aspect-[16/10] bg-zinc-900/50 overflow-hidden">
                    {result.success ? (
                      <img
                        src={result.thumbnailUrl}
                        alt={result.originalName}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <span className="text-2xl">❌</span>
                          <p className="text-[10px] text-red-400/70 mt-1">Upload failed</p>
                        </div>
                      </div>
                    )}

                    {/* Overlay actions on hover */}
                    {result.success && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <a
                          href={result.directUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-white/20 bg-black/50 px-3 py-1.5 text-[10px] font-medium text-white backdrop-blur-sm transition-all hover:bg-black/70"
                        >
                          Open original
                        </a>
                      </div>
                    )}

                    {/* Delete URL badge */}
                    {result.success && (
                      <a
                        href={result.deleteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 right-2 rounded border border-white/[0.06] bg-black/40 px-1.5 py-0.5 text-[8px] text-zinc-500 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                        title="Delete image from ImgBB"
                      >
                        Delete
                      </a>
                    )}
                  </div>

                  {/* Info & Actions */}
                  <div className="p-3 space-y-2">
                    {/* File name */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-medium text-zinc-400 truncate flex-1">
                        {result.originalName}
                      </span>
                      <span className="text-[9px] text-zinc-600 whitespace-nowrap">
                        {formatSize(result.size)}
                      </span>
                    </div>

                    {/* Direct link + copy */}
                    {result.success && (
                      <div className="space-y-1.5">
                        {/* Direct URL */}
                        <div className="flex items-center gap-1">
                          <input
                            readOnly
                            value={result.directUrl}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            className="flex-1 rounded border border-white/[0.04] bg-zinc-900/50 px-2 py-1 text-[9px] font-mono text-zinc-500 truncate outline-none cursor-text"
                          />
                          <button
                            onClick={() => copyToClipboard(result.directUrl, `direct-${result.id}`)}
                            className={`shrink-0 rounded border px-1.5 py-1 text-[9px] font-medium transition-all ${
                              copiedId === `direct-${result.id}`
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                : "border-white/[0.06] bg-zinc-800/50 text-zinc-500 hover:border-white/[0.12] hover:text-zinc-300"
                            }`}
                          >
                            {copiedId === `direct-${result.id}` ? "Copied!" : "Copy"}
                          </button>
                        </div>

                        {/* BBCode [img] link */}
                        <div className="flex items-center gap-1">
                          <input
                            readOnly
                            value={result.bbCodeUrl}
                            onClick={(e) => (e.target as HTMLInputElement).select()}
                            className="flex-1 rounded border border-violet-500/10 bg-zinc-900/50 px-2 py-1 text-[9px] font-mono text-violet-400/70 truncate outline-none cursor-text"
                          />
                          <button
                            onClick={() => copyToClipboard(result.bbCodeUrl, `bbcode-${result.id}`)}
                            className={`shrink-0 rounded border px-1.5 py-1 text-[9px] font-medium transition-all ${
                              copiedId === `bbcode-${result.id}`
                                ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                                : "border-white/[0.06] bg-zinc-800/50 text-zinc-500 hover:border-violet-500/20 hover:text-violet-400"
                            }`}
                          >
                            {copiedId === `bbcode-${result.id}` ? "Copied!" : "[img]"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Error message */}
                    {!result.success && result.error && (
                      <p className="text-[10px] text-red-400/70 truncate">{result.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <footer className="flex items-center justify-between border-t border-white/[0.03] bg-[#07070b] px-4 lg:px-6 py-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-600/60">Total converted</span>
          <span className="text-[11px] font-mono text-zinc-400 tabular-nums">{results.length}</span>
          {results.filter((r) => r.success).length > 0 && (
            <>
              <span className="text-zinc-700/50">|</span>
              <span className="text-[10px] text-emerald-600/60">Successful</span>
              <span className="text-[11px] font-mono text-emerald-400/70 tabular-nums">
                {results.filter((r) => r.success).length}
              </span>
            </>
          )}
        </div>
        <span className="text-[9px] text-zinc-700 font-mono">v1.0</span>
      </footer>
    </div>
  );
}
