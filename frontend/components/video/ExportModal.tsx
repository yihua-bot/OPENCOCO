"use client";
import { useState } from "react";
import { X, Download, Loader2, Check, Film, Type, Music, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineClip {
  id: string;
  video: { url: string };
  script: string;
  duration: number;
}

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  projectTitle: string;
  timelineClips: TimelineClip[];
  finalVideoUrl?: string;
}

type ExportItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  available: boolean;
  getUrl: () => string | null;
  ext: string;
};

async function downloadUrl(url: string, filename: string) {
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

function generateSRT(clips: TimelineClip[]): string {
  let srt = "";
  let t = 0;
  clips.forEach((clip, i) => {
    if (!clip.script) { t += clip.duration; return; }
    const start = formatSRTTime(t);
    const end = formatSRTTime(t + clip.duration);
    srt += `${i + 1}\n${start} --> ${end}\n${clip.script}\n\n`;
    t += clip.duration;
  });
  return srt;
}

function formatSRTTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function ExportModal({ open, onClose, projectTitle, timelineClips, finalVideoUrl }: ExportModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(["video"]));
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [done, setDone] = useState<Set<string>>(new Set());

  if (!open) return null;

  const hasVideo = !!(finalVideoUrl || timelineClips[0]?.video.url);
  const hasSubtitles = timelineClips.some((c) => c.script);

  const items: ExportItem[] = [
    {
      id: "video",
      label: "视频",
      icon: <Film size={14} />,
      available: hasVideo,
      ext: "mp4",
      getUrl: () => finalVideoUrl || timelineClips[0]?.video.url || null,
    },
    {
      id: "subtitles",
      label: "字幕 (SRT)",
      icon: <Type size={14} />,
      available: hasSubtitles,
      ext: "srt",
      getUrl: () => null, // generated client-side
    },
    {
      id: "music",
      label: "背景音乐",
      icon: <Music size={14} />,
      available: false, // not yet supported
      ext: "mp3",
      getUrl: () => null,
    },
    {
      id: "voiceover",
      label: "配音",
      icon: <Mic size={14} />,
      available: false, // not yet supported
      ext: "mp3",
      getUrl: () => null,
    },
  ];

  const toggle = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item?.available) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExportOne = async (item: ExportItem) => {
    if (!item.available) return;
    setDownloading((prev) => new Set(prev).add(item.id));
    try {
      if (item.id === "subtitles") {
        const srt = generateSRT(timelineClips);
        downloadText(srt, `${projectTitle}.srt`);
      } else {
        const url = item.getUrl();
        if (url) await downloadUrl(url, `${projectTitle}.${item.ext}`);
      }
      setDone((prev) => new Set(prev).add(item.id));
      setTimeout(() => setDone((prev) => { const n = new Set(prev); n.delete(item.id); return n; }), 2000);
    } finally {
      setDownloading((prev) => { const n = new Set(prev); n.delete(item.id); return n; });
    }
  };

  const handleExportSelected = async () => {
    for (const item of items) {
      if (selected.has(item.id) && item.available) {
        await handleExportOne(item);
      }
    }
  };

  const anySelected = items.some((i) => selected.has(i.id) && i.available);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-80 bg-gray-950 border border-white/10 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <span className="text-sm font-medium text-white">导出</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Items */}
        <div className="p-4 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                !item.available
                  ? "border-white/5 opacity-40 cursor-not-allowed"
                  : selected.has(item.id)
                    ? "border-orange-500/40 bg-orange-500/5 cursor-pointer"
                    : "border-white/8 hover:bg-white/5 cursor-pointer"
              )}
              onClick={() => toggle(item.id)}
            >
              {/* Checkbox */}
              <div className={cn(
                "w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors",
                selected.has(item.id) && item.available
                  ? "border-orange-500 bg-orange-500"
                  : "border-gray-600"
              )}>
                {selected.has(item.id) && item.available && <Check size={10} className="text-white" />}
              </div>

              {/* Icon + label */}
              <div className={cn("flex items-center gap-2 flex-1", item.available ? "text-gray-300" : "text-gray-600")}>
                {item.icon}
                <span className="text-sm">{item.label}</span>
                {!item.available && <span className="text-xs text-gray-600 ml-auto">暂不支持</span>}
              </div>

              {/* Single download */}
              {item.available && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleExportOne(item); }}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-blue-400 transition-colors flex-shrink-0"
                  title={`单独下载${item.label}`}
                >
                  {downloading.has(item.id)
                    ? <Loader2 size={13} className="animate-spin" />
                    : done.has(item.id)
                      ? <Check size={13} className="text-green-400" />
                      : <Download size={13} />
                  }
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <button
            onClick={handleExportSelected}
            disabled={!anySelected}
            className={cn(
              "w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors",
              anySelected
                ? "bg-orange-600 hover:bg-orange-700 text-white"
                : "bg-white/5 text-gray-600 cursor-not-allowed"
            )}
          >
            <Download size={14} />
            导出所选
          </button>
        </div>
      </div>
    </>
  );
}
