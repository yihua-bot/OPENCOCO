"use client";
import { useState } from "react";
import { Shot, Video } from "@/lib/api";
import { Film, Play, Plus, X, PlusCircle, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetItem {
  id: string;
  label: string;
  thumbnailUrl: string;
  duration: number;
  videoUrl: string;
  script: string;
  inTimeline: boolean;
}

interface Props {
  shots: Shot[];
  clips: Video[];
  onSelect: (url: string) => void;
  activeUrl?: string;
  timelineIds: string[];
  onAddToTimeline: (asset: { id: string; videoUrl: string; thumbnailUrl: string; duration: number; script: string }) => void;
  onDragStart: (asset: { id: string; videoUrl: string; thumbnailUrl: string; duration: number; script: string }) => void;
}

async function downloadAsset(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank");
  }
}

export function AssetLibrary({ shots, clips, onSelect, activeUrl, timelineIds, onAddToTimeline, onDragStart }: Props) {
  const [previewAsset, setPreviewAsset] = useState<AssetItem | null>(null);

  const shotAssets: AssetItem[] = shots
    .filter((s) => s.status === "done" && s.video)
    .map((s) => ({
      id: s.id,
      label: `Shot ${s.order + 1}`,
      thumbnailUrl: s.video!.thumbnail_url,
      duration: s.duration,
      videoUrl: s.video!.url,
      script: s.script,
      inTimeline: timelineIds.includes(s.id),
    }));

  const clipAssets: AssetItem[] = clips
    .filter((v) => v.status === "done" && !shots.find((s) => s.video_id === v.id))
    .map((v) => ({
      id: v.id,
      label: "Clip",
      thumbnailUrl: v.thumbnail_url,
      duration: v.duration,
      videoUrl: v.url,
      script: "",
      inTimeline: timelineIds.includes(v.id),
    }));

  const all = [...shotAssets, ...clipAssets];

  return (
    <div className="h-full flex flex-col bg-[#0d0a07] relative">
      <div className="px-3 py-2 border-b border-white/5 flex-shrink-0 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assets</span>
        <span className="text-xs text-gray-700">{all.length}</span>
      </div>

      {all.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-700 gap-2">
          <Film size={24} />
          <p className="text-xs">No assets yet</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {all.map((asset) => (
            <div
              key={asset.id}
              draggable
              onDragStart={(e) => { e.dataTransfer.effectAllowed = "copy"; onDragStart(asset); }}
              className={cn(
                "w-full flex items-center gap-2 p-1.5 rounded-lg transition-colors text-left group cursor-grab active:cursor-grabbing border",
                activeUrl === asset.videoUrl
                  ? "bg-orange-500/20 border-orange-500/30"
                  : "hover:bg-white/5 border-transparent hover:border-white/10"
              )}
            >
              {/* Thumbnail */}
              <button
                onClick={() => { onSelect(asset.videoUrl); setPreviewAsset(asset); }}
                className="relative w-14 h-9 rounded overflow-hidden bg-black flex-shrink-0"
              >
                {asset.thumbnailUrl ? (
                  <img src={asset.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-700">
                    <Film size={12} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Play size={10} className="text-white" />
                </div>
              </button>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-300 truncate">{asset.label}</p>
                <p className="text-xs text-gray-600">{asset.duration.toFixed(1)}s</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); downloadAsset(asset.videoUrl, `${asset.label}.mp4`); }}
                  title="下载"
                  className="p-1 rounded text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                >
                  <Download size={13} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onAddToTimeline(asset); }}
                  title={asset.inTimeline ? "Already in timeline" : "Add to timeline"}
                  className={cn(
                    "p-1 rounded transition-colors",
                    asset.inTimeline
                      ? "text-green-500/60 cursor-default"
                      : "text-gray-500 hover:text-orange-400 hover:bg-orange-500/10"
                  )}
                >
                  <PlusCircle size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Inline video preview modal */}
      {previewAsset && (
        <div className="absolute inset-0 bg-black/90 flex flex-col z-10">
          <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
            <span className="text-xs text-gray-400">{previewAsset.label} · {previewAsset.duration.toFixed(1)}s</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadAsset(previewAsset.videoUrl, `${previewAsset.label}.mp4`)}
                className="text-gray-500 hover:text-blue-400 transition-colors"
                title="下载"
              >
                <Download size={14} />
              </button>
              <button onClick={() => setPreviewAsset(null)} className="text-gray-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-3">
            {previewAsset.videoUrl ? (
              <video
                src={previewAsset.videoUrl}
                autoPlay
                className="w-full rounded-lg max-h-full"
                poster={previewAsset.thumbnailUrl || undefined}
                onContextMenu={(e) => e.preventDefault()}
                controlsList="nodownload"
                disablePictureInPicture
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-600">
                <Film size={24} />
                <p className="text-xs">No video URL</p>
              </div>
            )}
          </div>
          {!previewAsset.inTimeline && (
            <div className="px-3 pb-3 flex-shrink-0">
              <button
                onClick={() => { onAddToTimeline(previewAsset); setPreviewAsset(null); }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs transition-colors"
              >
                <Plus size={12} /> Add to Timeline
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
