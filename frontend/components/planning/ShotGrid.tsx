"use client";
import { Shot } from "@/lib/api";
import { Loader2, Film, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  shots: Shot[];
  onShotClick: (shot: Shot) => void;
  onAssemble: () => void;
  assembling: boolean;
}

export function ShotGrid({ shots, onShotClick, onAssemble, assembling }: Props) {
  const done = shots.filter((s) => s.status === "done").length;
  const allDone = done === shots.length && shots.length > 0;

  return (
    <div className="h-full flex flex-col bg-[#0a0806] p-4">
      <div className="mb-3 flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {done}/{shots.length} shots done
        </span>
        <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-500"
            style={{ width: shots.length ? `${(done / shots.length) * 100}%` : "0%" }}
          />
        </div>
        {allDone && (
          <button
            onClick={onAssemble}
            disabled={assembling}
            className="flex items-center gap-1.5 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-xs rounded-lg transition-colors whitespace-nowrap"
          >
            {assembling ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Assemble
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1">
        {shots.map((shot, i) => (
          <button
            key={shot.id}
            onClick={() => shot.status === "done" && onShotClick(shot)}
            className={cn(
              "rounded-xl border overflow-hidden text-left transition-all",
              shot.status === "done"
                ? "border-green-500/30 hover:border-green-500/60 cursor-pointer"
                : "border-white/10 cursor-default"
            )}
          >
            <div className="aspect-video bg-black relative">
              {(shot.preview_image_url || shot.video?.thumbnail_url) ? (
                <img
                  src={shot.video?.thumbnail_url || shot.preview_image_url!}
                  alt={`Shot ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-700">
                  <Film size={20} />
                </div>
              )}
              {shot.status === "processing" && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 size={18} className="animate-spin text-orange-400" />
                </div>
              )}
              {shot.status === "done" && (
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </div>
              )}
              {shot.status === "failed" && (
                <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center">
                  <X size={18} className="text-red-400" />
                </div>
              )}
            </div>
            <div className="px-2 py-1.5">
              <p className="text-xs text-gray-400 font-medium">Shot {i + 1}</p>
              <p className="text-xs text-gray-600 truncate">{shot.description}</p>
              {shot.script && (
                <p className="text-xs text-orange-400/70 truncate mt-0.5">"{shot.script}"</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
