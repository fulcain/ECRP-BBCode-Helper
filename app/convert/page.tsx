"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { uploadToImgBB, uploadFileToImgBB, type ImageConvertResult } from "@/lib/imgbb";
import { useToasts } from "@/components/Toast";
import { useModal } from "@/components/Modal";
import { loadConversions, saveConversions, clearAllData } from "@/lib/storage";
import Link from "next/link";

type InputMode = "url" | "file" | "clipboard";

/** Convert a SavedConversion into an ImageConvertResult for display in the grid */
function savedToResult(conv: { id: string; originalUrl: string; newUrl: string; thumbnailUrl?: string; success: boolean; error?: string; savedAt: number }): ImageConvertResult {
  return {
    id: conv.id,
    originalName: conv.originalUrl.split("/").pop() || "image",
    originalUrl: conv.originalUrl,
    thumbnailUrl: conv.thumbnailUrl || conv.newUrl,
    directUrl: conv.success ? conv.newUrl : "",
    bbCodeUrl: conv.success ? `[img]${conv.newUrl}[/img]` : "",
    deleteUrl: "",
    size: 0,
    success: conv.success,
    error: conv.error,
  };
}

export default function ConvertPage() {
  const { addToast } = useToasts();
  const { showConfirm } = useModal();
  const [inputMode, setInputMode] = useState<InputMode>("url");
  const [urlInput, setUrlInput] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [results, setResults] = useState<ImageConvertResult[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [clipboardProgress, setClipboardProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Load saved conversions into the grid on mount ────────────────────
  useEffect(() => {
    const saved = loadConversions();
    if (saved.length > 0) {
      setResults(saved.map(savedToResult));
    }
  }, []);

  // ─── Persist helper: save to localStorage + add to grid ──────────────
  const persistAndShow = useCallback((result: ImageConvertResult) => {
    // Save to localStorage
    const saved = loadConversions();
    const entry = {
      id: result.id,
      originalUrl: result.originalUrl || result.originalName,
      newUrl: result.directUrl,
      thumbnailUrl: result.thumbnailUrl,
      success: result.success,
      error: result.error,
      savedAt: Date.now(),
    };
    saveConversions([entry, ...saved]);
    // Add to grid
    setResults((prev) => [result, ...prev]);
  }, []);

  const persistFailed = useCallback((originalUrl: string, error?: string) => {
    const saved = loadConversions();
    const entry = {
      id: crypto.randomUUID(),
      originalUrl,
      newUrl: "",
      success: false,
      error,
      savedAt: Date.now(),
    };
    saveConversions([entry, ...saved]);
    setResults((prev) => [
      {
        id: entry.id,
        originalName: originalUrl.split("/").pop() || "image",
        originalUrl,
        thumbnailUrl: "",
        directUrl: "",
        bbCodeUrl: "",
        deleteUrl: "",
        size: 0,
        success: false,
        error,
      },
      ...prev,
    ]);
  }, []);

  // ─── Upload images pasted from the clipboard (sequentially) ──────────
  // ─── Dedupe clipboard images by content hash (identical ones skipped) ──
  const dedupeClipboardFiles = useCallback(async (files: File[]): Promise<File[]> => {
    const seen = new Set<string>();
    const unique: File[] = [];
    for (const file of files) {
      let hash = "";
      try {
        const buf = await file.arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", buf);
        hash = Array.from(new Uint8Array(digest))
          .slice(0, 8)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      } catch {
        hash = `${file.type}:${file.size}`;
      }
      if (!seen.has(hash)) {
        seen.add(hash);
        unique.push(file);
      }
    }
    return unique;
  }, []);

  // ─── Upload images pasted from the clipboard (sequentially) ──────────
  const convertClipboardImages = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      setIsConverting(true);

      let successCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const name = file.name || "clipboard-image.png";
        setClipboardProgress({ current: i + 1, total: files.length });

        const response = await uploadFileToImgBB(file, name);

        if (response.success && response.data) {
          const result: ImageConvertResult = {
            id: response.data.id,
            originalName: `📋 ${name}`,
            thumbnailUrl: response.data.thumb.url,
            directUrl: response.data.url,
            bbCodeUrl: `[img]${response.data.url}[/img]`,
            deleteUrl: response.data.delete_url,
            size: response.data.size,
            success: true,
          };
          persistAndShow(result);
          successCount++;
        } else {
          persistFailed(name, response.error);
          addToast(`Failed: ${name} - ${response.error}`, "error");
        }
      }

      addToast(
        successCount === 0
          ? "Clipboard upload failed"
          : files.length === 1
          ? "Image uploaded from clipboard!"
          : `Uploaded ${successCount} of ${files.length} images from clipboard`,
        successCount === 0 ? "error" : "success"
      );

      setClipboardProgress(null);
      setIsConverting(false);
    },
    [addToast, persistAndShow, persistFailed]
  );

  // ─── Preview clipboard image(s) + confirm before uploading ──────────
  const previewAndUploadClipboard = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const unique = await dedupeClipboardFiles(files);
      if (unique.length === 0) {
        addToast("No new images — the clipboard matches an existing one", "info");
        return;
      }

      // Object URLs keep the thumbnails alive while the modal is open
      const urls = unique.map((f) => URL.createObjectURL(f));

      const confirmed = await showConfirm({
        title: unique.length === 1 ? "Upload this image?" : `Upload ${unique.length} images?`,
        message:
          unique.length === 1
            ? "This image is on your clipboard. Upload it to ImgBB and add it to your history?"
            : `These ${unique.length} images are on your clipboard. Upload them to ImgBB and add them to your history?`,
        confirmLabel: unique.length === 1 ? "Upload" : `Upload ${unique.length}`,
        cancelLabel: "Cancel",
        content: (
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {unique.map((f, i) => (
              <div
                key={i}
                className="w-20 shrink-0 overflow-hidden rounded-lg border border-white/[0.06] bg-zinc-800/50"
                title={f.name}
              >
                <img
                  src={urls[i]}
                  alt={f.name}
                  className="h-14 w-full object-cover"
                />
                <div className="truncate px-1 py-0.5 text-[8px] text-zinc-500">
                  {f.name}
                </div>
              </div>
            ))}
          </div>
        ),
      });

      urls.forEach((u) => URL.revokeObjectURL(u));

      if (confirmed) {
        convertClipboardImages(unique);
      } else {
        addToast("Clipboard upload cancelled", "info");
      }
    },
    [dedupeClipboardFiles, showConfirm, convertClipboardImages, addToast]
  );

  // ─── Global paste handler: Ctrl+V with image(s) on the clipboard ─────
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length === 0) return;
      previewAndUploadClipboard(files);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [previewAndUploadClipboard]);

  // ─── "Paste from Clipboard" button (falls back to Ctrl+V hint) ────────
  const pasteFromClipboard = useCallback(async () => {
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read();
        const files: File[] = [];
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith("image/"));
          if (imageType) {
            const blob = await item.getType(imageType);
            files.push(
              new File([blob], `clipboard-image-${files.length + 1}.png`, { type: imageType })
            );
          }
        }
        if (files.length > 0) {
          previewAndUploadClipboard(files);
        } else {
          addToast("No image found in clipboard", "warning");
        }
      } else {
        addToast("Clipboard API unavailable — press Ctrl+V to paste instead", "warning");
      }
    } catch {
      addToast("Couldn't read clipboard — press Ctrl+V to paste instead", "warning");
    }
  }, [addToast, previewAndUploadClipboard]);

  // ─── Remove a single result (grid + localStorage) ──────────────────────
  const removeResult = useCallback((resultId: string, deleteUrl?: string) => {
    setResults((prev) => prev.filter((r) => r.id !== resultId));
    const saved = loadConversions();
    saveConversions(saved.filter((s) => s.id !== resultId));
    // If ImgBB delete URL exists, open it too
    if (deleteUrl) {
      window.open(deleteUrl, "_blank");
    }
  }, []);

  // ─── Reset All ───────────────────────────────────────────────────────
  const handleResetAll = useCallback(() => {
    showConfirm({
      title: "Reset Everything",
      message: "This will permanently delete all converted images. Are you sure?",
      confirmLabel: "Reset All",
      cancelLabel: "Cancel",
      variant: "danger",
    }).then((confirmed) => {
      if (confirmed) {
        clearAllData();
        setResults([]);
        addToast("All data has been reset", "info");
      }
    });
  }, [showConfirm, addToast]);

  // ─── Convert a single image URL ──────────────────────────────────────
  const convertUrl = useCallback(async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      addToast("Please enter an image URL", "warning");
      return;
    }

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
      persistAndShow(result);
      addToast("Image converted successfully!", "success");
      setUrlInput("");
    } else {
      addToast(`Failed: ${response.error}`, "error");
      persistFailed(trimmed, response.error);
    }
    setIsConverting(false);
  }, [urlInput, addToast, persistAndShow, persistFailed]);

  // Handle Enter key on URL input
  const handleUrlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      convertUrl();
    }
  };

  // ─── Convert uploaded files ──────────────────────────────────────────
  const convertFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      const imageFiles = fileArray.filter((f) => f.type.startsWith("image/"));
      if (imageFiles.length === 0) {
        addToast("Please select image files only", "warning");
        return;
      }

      setIsConverting(true);

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        addToast(`Converting ${i + 1}/${imageFiles.length}: ${file.name}`, "info");

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
          persistAndShow(result);
        } else {
          persistFailed(file.name, response.error);
          addToast(`Failed: ${file.name} - ${response.error}`, "error");
        }
      }

      addToast(`Converted ${imageFiles.length} image(s)`, "success");
      setIsConverting(false);
    },
    [addToast, persistAndShow, persistFailed]
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
    if (bytes === 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Remove all failed results (grid + localStorage)
  const removeFailedResults = () => {
    const failedCount = results.filter((r) => !r.success).length;
    if (failedCount === 0) return;
    showConfirm({
      title: "Remove Failed Uploads",
      message: `Remove ${failedCount} failed conversion${failedCount !== 1 ? "s" : ""} from the grid and saved history?`,
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      variant: "danger",
    }).then((confirmed) => {
      if (confirmed) {
        setResults((prev) => prev.filter((r) => r.success));
        const saved = loadConversions();
        saveConversions(saved.filter((s) => s.success));
        addToast(`Removed ${failedCount} failed conversion${failedCount !== 1 ? "s" : ""}`, "info");
      }
    });
  };

  // Clear all results (grid + localStorage)
  const clearResults = () => {
    if (results.length > 0) {
      showConfirm({
        title: "Clear All Results",
        message: "Remove all converted images from the grid and saved history?",
        confirmLabel: "Clear",
        cancelLabel: "Cancel",
        variant: "danger",
      }).then((confirmed) => {
        if (confirmed) {
          setResults([]);
          saveConversions([]);
          addToast("All results cleared", "info");
        }
      });
    }
  };

  const successCount = results.filter((r) => r.success).length;

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
                Clear all
              </button>
            )}

            <button
              onClick={handleResetAll}
              disabled={results.length === 0}
              className="rounded-lg border border-white/[0.04] bg-zinc-800/30 px-2.5 py-1.5 text-[11px] font-medium text-zinc-500 transition-all hover:border-rose-500/20 hover:bg-rose-500/5 hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Reset all saved conversion data"
            >
              Reset
            </button>

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
          <button
            onClick={() => setInputMode("clipboard")}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all ${
              inputMode === "clipboard"
                ? "bg-zinc-700/50 text-white border border-white/[0.08]"
                : "text-zinc-500 hover:text-zinc-300 border border-transparent"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              </svg>
              Paste Image
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

        {/* Paste from Clipboard */}
        {inputMode === "clipboard" && (
          <div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={pasteFromClipboard}
              className={`
                relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200
                ${
                  dragOver
                    ? "border-cyan-500/50 bg-cyan-500/5"
                    : "border-white/[0.06] bg-zinc-800/20 hover:border-white/[0.12] hover:bg-zinc-800/30"
                }
              `}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/50 border border-white/[0.04]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-300">
                    Copy one or more images, then paste them here
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">
                    Screenshots & images copied from the web — press Ctrl+V anywhere on this page, multiple images upload one by one
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    pasteFromClipboard();
                  }}
                  className="mt-1 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-400 transition-all hover:bg-cyan-500/20"
                >
                  <span className="flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Paste from Clipboard
                  </span>
                </button>
              </div>
            </div>

            {isConverting && (
              <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {clipboardProgress && clipboardProgress.total > 1
                  ? `Uploading ${clipboardProgress.current}/${clipboardProgress.total} images from clipboard...`
                  : "Uploading image from clipboard..."}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Grid — unified: shows both session + saved */}
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
              Paste an image URL, upload files, or press Ctrl+V with a copied image. Converted images will appear here and persist across sessions.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-500">
                {results.length} image{results.length !== 1 ? "s" : ""} converted
                {successCount > 0 && (
                  <span className="text-emerald-500/50 ml-2">
                    {successCount} successful
                  </span>
                )}
                {results.length - successCount > 0 && (
                  <span className="text-red-400/50 ml-2">
                    {results.length - successCount} failed
                  </span>
                )}
              </span>

              {results.length - successCount > 0 && (
                <button
                  onClick={removeFailedResults}
                  className="rounded-lg border border-rose-500/15 bg-rose-500/5 px-2.5 py-1 text-[10px] font-medium text-rose-400/80 transition-all hover:bg-rose-500/10 hover:text-rose-300"
                >
                  Remove {results.length - successCount} failed
                </button>
              )}
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
                      <div className="relative h-full">
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <span className="text-2xl">❌</span>
                            <p className="text-[10px] text-red-400/70 mt-1">Upload failed</p>
                          </div>
                        </div>

                        {/* Always-visible remove (touch-friendly) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeResult(result.id);
                          }}
                          title="Remove failed conversion"
                          aria-label="Remove failed conversion"
                          className="absolute top-1.5 right-1.5 rounded-md border border-red-500/20 bg-black/60 p-1 text-red-300/80 backdrop-blur-sm transition-all hover:bg-red-500/40 hover:text-white"
                        >
                          <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>

                        {/* Remove failed on hover */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeResult(result.id);
                            }}
                            className="rounded-lg border border-red-500/30 bg-black/50 px-2.5 py-1 text-[9px] font-medium text-red-300 backdrop-blur-sm transition-all hover:bg-red-500/50 hover:text-white"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Overlay actions on hover */}
                    {result.success && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-between px-2 py-2 opacity-0 group-hover:opacity-100">
                        <a
                          href={result.directUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-white/20 bg-black/50 px-2.5 py-1 text-[9px] font-medium text-white backdrop-blur-sm transition-all hover:bg-black/70"
                        >
                          Open
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeResult(result.id, result.deleteUrl);
                          }}
                          className="rounded-lg border border-white/20 bg-black/50 px-2.5 py-1 text-[9px] font-medium text-zinc-400 backdrop-blur-sm transition-all hover:bg-red-500/50 hover:text-white"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Info & Actions */}
                  <div className="p-3 space-y-2">
                    {/* File name */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-medium text-zinc-400 truncate flex-1">
                        {result.originalName}
                      </span>
                      {result.size > 0 && (
                        <span className="text-[9px] text-zinc-600 whitespace-nowrap">
                          {formatSize(result.size)}
                        </span>
                      )}
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
          {successCount > 0 && (
            <>
              <span className="text-zinc-700/50">|</span>
              <span className="text-[10px] text-emerald-600/60">Successful</span>
              <span className="text-[11px] font-mono text-emerald-400/70 tabular-nums">
                {successCount}
              </span>
            </>
          )}
        </div>
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
      </footer>
    </div>
  );
}
