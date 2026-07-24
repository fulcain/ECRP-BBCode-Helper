"use client";

import { useState, useCallback } from "react";
import {
  uploadToImgBB,
  findAllImgTagUrls,
  type ConversionResult,
} from "@/lib/imgbb";

import type { SavedConversion } from "@/lib/storage";

interface ImgurConverterProps {
  text: string;
  onTextUpdate: (newText: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onConversionResults?: (results: SavedConversion[]) => void;
}

export default function ImgurConverter({
  text,
  onTextUpdate,
  isOpen,
  onClose,
  onConversionResults,
}: ImgurConverterProps) {
  const [url, setUrl] = useState("");
  const [isBatchMode, setIsBatchMode] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [singleResult, setSingleResult] = useState<string | null>(null);

  // Scan for image URLs inside [img] tags (skip ImgBB)
  const imageLinksInText = findAllImgTagUrls(text);
  const hasImageLinks = imageLinksInText.length > 0;

  // Convert a single URL
  const convertSingleUrl = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed || !trimmed.startsWith("http")) {
      setSingleResult("Please paste a valid image URL (http/https).");
      return;
    }

    setIsConverting(true);
    setSingleResult(null);

    const response = await uploadToImgBB(trimmed);
    if (response.success && response.data) {
      setSingleResult(`✅ Converted! Direct URL: ${response.data.url}`);
      onConversionResults?.([{
        id: crypto.randomUUID(),
        originalUrl: trimmed,
        newUrl: response.data.url,
        thumbnailUrl: response.data.thumb.url,
        success: true,
        savedAt: Date.now(),
      }]);
    } else {
      setSingleResult(`❌ Failed: ${response.error}`);
      onConversionResults?.([{
        id: crypto.randomUUID(),
        originalUrl: trimmed,
        newUrl: trimmed,
        success: false,
        error: response.error,
        savedAt: Date.now(),
      }]);
    }

    setIsConverting(false);
  }, [url, onConversionResults]);

  // Batch convert all image URLs in [img] tags
  const batchConvert = useCallback(async () => {
    if (imageLinksInText.length === 0) return;

    setIsConverting(true);
    setResults([]);
    let currentText = text;
    const savedConversions: SavedConversion[] = [];

    for (let i = 0; i < imageLinksInText.length; i++) {
      const imgUrl = imageLinksInText[i];
      setProgress({ current: i + 1, total: imageLinksInText.length });

      const response = await uploadToImgBB(imgUrl);

      if (response.success && response.data) {
        const result: ConversionResult = {
          originalUrl: imgUrl,
          newUrl: response.data.url,
          success: true,
        };
        setResults((prev) => [...prev, result]);
        currentText = currentText.split(imgUrl).join(response.data.url);

        savedConversions.push({
          id: crypto.randomUUID(),
          originalUrl: imgUrl,
          newUrl: response.data.url,
          thumbnailUrl: response.data.thumb.url,
          success: true,
          savedAt: Date.now(),
        });
      } else {
        setResults((prev) => [
          ...prev,
          {
            originalUrl: imgUrl,
            newUrl: imgUrl,
            success: false,
            error: response.error,
          },
        ]);

        savedConversions.push({
          id: crypto.randomUUID(),
          originalUrl: imgUrl,
          newUrl: imgUrl,
          success: false,
          error: response.error,
          savedAt: Date.now(),
        });
      }
    }

    onTextUpdate(currentText);
    onConversionResults?.(savedConversions);
    setIsConverting(false);
    setProgress({ current: 0, total: 0 });
  }, [text, imageLinksInText, onTextUpdate, onConversionResults]);

  if (!isOpen) return null;

  return (
    <div className="border-b border-white/10 bg-zinc-900/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Image Host → ImgBB
        </span>
        <button
          onClick={onClose}
          className="rounded p-1 text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1L13 13M13 1L1 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="px-4 pb-3 space-y-3">
        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBatchMode(true)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              isBatchMode
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                : "bg-zinc-800/60 text-zinc-400 border border-white/5 hover:text-white"
            }`}
          >
            Batch Scan BBCode
          </button>
          <button
            onClick={() => setIsBatchMode(false)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              !isBatchMode
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                : "bg-zinc-800/60 text-zinc-400 border border-white/5 hover:text-white"
            }`}
          >
            Single URL
          </button>
        </div>

        {isBatchMode ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                {hasImageLinks
                  ? `Found ${imageLinksInText.length} image link${
                      imageLinksInText.length !== 1 ? "s" : ""
                    } in [img] tags (ImgBB links skipped)`
                  : "No non-ImgBB image links found in [img] tags"}
              </span>
            </div>

            {/* Show found links */}
            {hasImageLinks && (
              <div className="max-h-24 overflow-y-auto rounded-lg border border-white/5 bg-zinc-800/40 p-2 space-y-1">
                {imageLinksInText.map((link, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono truncate"
                  >
                    <span className="text-zinc-600 shrink-0">#{i + 1}</span>
                    <span className="truncate">{link}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={batchConvert}
              disabled={!hasImageLinks || isConverting}
              className="w-full rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isConverting
                ? `Converting ${progress.current}/${progress.total}...`
                : `Convert ${hasImageLinks ? imageLinksInText.length : "All"} Image${
                    imageLinksInText.length !== 1 ? "s" : ""
                  } → ImgBB`}
            </button>

            {/* Progress bar */}
            {isConverting && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-violet-500 transition-all duration-300"
                  style={{
                    width: `${
                      progress.total > 0
                        ? (progress.current / progress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="max-h-32 overflow-y-auto rounded-lg border border-white/5 bg-zinc-800/40 p-2 space-y-1">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 text-[10px] font-mono truncate ${
                      r.success ? "text-emerald-500" : "text-red-400"
                    }`}
                  >
                    <span>{r.success ? "✅" : "❌"}</span>
                    <span className="truncate">
                      {r.success
                        ? r.newUrl
                        : `${r.originalUrl} - ${r.error}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste any image URL to convert to ImgBB"
              className="w-full rounded-lg border border-white/10 bg-zinc-800/80 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 outline-none transition-all focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
            />
            <button
              onClick={convertSingleUrl}
              disabled={!url || isConverting}
              className="w-full rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isConverting ? "Converting..." : "Convert to ImgBB"}
            </button>
            {singleResult && (
              <div className="rounded-lg border border-white/5 bg-zinc-800/40 p-2 text-xs font-mono text-zinc-400 truncate">
                {singleResult}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
