"use client";
import { useState } from "react";
import { usePlanningStore } from "@/lib/planningStore";
import { useApiKeyStore, IMAGE_PROVIDERS } from "@/lib/apiKeyStore";
import { api, Shot } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Loader2, GripVertical, Check, Image, ImageOff, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  projectId: string;
  onGenerateStart: () => void;
}

export function PlanningPanel({ projectId, onGenerateStart }: Props) {
  const { storyboard, updateShot, setMode, refreshStoryboard } = usePlanningStore();
  const { imgEntries, imgActiveId, sbEntries, sbActiveId } = useApiKeyStore();
  const imgConfig = imgEntries.find((e) => e.id === imgActiveId) ?? imgEntries[0] ?? null;
  const sbConfig = sbEntries.find((e) => e.id === sbActiveId) ?? sbEntries[0] ?? null;

  const [saving, setSaving] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [allPreviewLoading, setAllPreviewLoading] = useState(false);
  const [refineInput, setRefineInput] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineMessages, setRefineMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  if (!storyboard) return null;

  const handleShotChange = async (shot: Shot, field: keyof Shot, value: string | number) => {
    updateShot(shot.id, { [field]: value } as Partial<Shot>);
    setSaving(shot.id);
    try {
      await api.updateShot(projectId, storyboard.id, shot.id, { [field]: value } as Partial<Shot>);
    } finally {
      setSaving(null);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.generateShots(projectId, storyboard.id);
      setMode("generating");
      onGenerateStart();
    } finally {
      setGenerating(false);
    }
  };

  const getImgPayload = () => ({
    provider: imgConfig?.provider ?? "mock",
    api_key: imgConfig?.apiKey ?? "",
    model: imgConfig?.model ?? "",
    base_url: imgConfig?.baseUrl,
  });

  const handlePreviewOne = async (shot: Shot) => {
    setPreviewLoading(shot.id);
    try {
      const res = await api.generateShotPreview(projectId, storyboard.id, shot.id, getImgPayload());
      updateShot(shot.id, { preview_image_url: res.preview_image_url } as Partial<Shot>);
    } catch (e) {
      console.error(e);
    } finally {
      setPreviewLoading(null);
    }
  };

  const handlePreviewAll = async () => {
    setAllPreviewLoading(true);
    try {
      const res = await api.generateAllPreviews(projectId, storyboard.id, getImgPayload());      for (const r of res.results) {
        if (r.preview_image_url) {
          updateShot(r.shot_id, { preview_image_url: r.preview_image_url } as Partial<Shot>);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAllPreviewLoading(false);
    }
  };

  const handleRefine = async () => {
    const trimmed = refineInput.trim();
    if (!trimmed || refining) return;
    setRefineMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setRefineInput("");
    setRefining(true);
    try {
      const res = await api.streamMessage(
        projectId,
        trimmed,
        sbConfig ? { provider: sbConfig.provider, api_key: sbConfig.apiKey, model: sbConfig.model, base_url: sbConfig.baseUrl, fallbacks: sbConfig.fallbacks?.map(f => ({ provider: f.provider, api_key: f.apiKey, model: f.model, base_url: f.baseUrl })) } : undefined,
        undefined,
        "default",
        storyboard.id,
      );
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      let newStoryboardId: string | null = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "text") aiText += data.content;
            else if (data.type === "done") newStoryboardId = data.storyboard_id;
          } catch {}
        }
      }
      setRefineMessages((prev) => [...prev, { role: "assistant", content: aiText }]);
      // Refresh storyboard
      if (newStoryboardId) {
        const sb = await api.getStoryboard(projectId, newStoryboardId);
        refreshStoryboard(sb);
      }
    } catch (e) {
      setRefineMessages((prev) => [...prev, { role: "assistant", content: "修改失败，请重试" }]);
    } finally {
      setRefining(false);
    }
  };

  const totalDuration = storyboard.shots.reduce((sum, s) => sum + s.duration, 0);
  const imgProviderLabel = imgConfig
    ? IMAGE_PROVIDERS.find((p) => p.value === imgConfig.provider)?.label ?? imgConfig.provider
    : "Mock";

  return (
    <div className="h-full flex flex-col bg-[#120e0a]">
      <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between flex-shrink-0">
        <div>
          <span className="text-xs font-semibold text-gray-400">Shot Plan</span>
          <span className="text-xs text-gray-600 ml-2">{storyboard.shots.length} shots · {totalDuration.toFixed(0)}s total</span>
        </div>
        <button
          onClick={handlePreviewAll}
          disabled={allPreviewLoading}
          title={`生成所有分镜预览图 (${imgProviderLabel})`}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          {allPreviewLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          全部预览
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {storyboard.shots.map((shot, i) => (
          <div key={shot.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {/* Preview image */}
            <div className="relative aspect-video bg-black/40 group">
              {shot.preview_image_url ? (
                <img
                  src={shot.preview_image_url}
                  alt={`Shot ${i + 1} preview`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-700">
                  <ImageOff size={20} />
                </div>
              )}
              {/* Generate preview button overlay */}
              <button
                onClick={() => handlePreviewOne(shot)}
                disabled={previewLoading === shot.id}
                className={cn(
                  "absolute inset-0 flex items-center justify-center transition-opacity",
                  shot.preview_image_url
                    ? "opacity-0 group-hover:opacity-100 bg-black/50"
                    : "opacity-100"
                )}
              >
                {previewLoading === shot.id ? (
                  <Loader2 size={18} className="animate-spin text-orange-400" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Image size={16} className="text-gray-400" />
                    <span className="text-xs text-gray-400">生成预览图</span>
                  </div>
                )}
              </button>
            </div>

            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <GripVertical size={12} className="text-gray-600" />
                <span className="text-xs font-medium text-orange-400">Shot {i + 1}</span>
                {saving === shot.id && <Loader2 size={10} className="animate-spin text-gray-500" />}
              </div>
              <textarea
                className="w-full bg-transparent text-xs text-gray-300 resize-none outline-none border border-white/10 rounded-lg p-2 focus:border-orange-500/40"
                rows={2}
                value={shot.description}
                onChange={(e) => handleShotChange(shot, "description", e.target.value)}
                placeholder="Visual description..."
              />
              <input
                className="w-full bg-transparent text-xs text-gray-400 outline-none border border-white/10 rounded-lg px-2 py-1 focus:border-orange-500/40"
                value={shot.script}
                onChange={(e) => handleShotChange(shot, "script", e.target.value)}
                placeholder="On-screen text / subtitle..."
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Duration</span>
                <input
                  type="number" min={1} max={30} step={0.5}
                  className="w-16 bg-transparent text-xs text-gray-300 outline-none border border-white/10 rounded px-2 py-0.5 text-center"
                  value={shot.duration}
                  onChange={(e) => handleShotChange(shot, "duration", parseFloat(e.target.value))}
                />
                <span className="text-xs text-gray-600">s</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/5 flex-shrink-0 space-y-2">
        {/* Refine chat messages */}
        {refineMessages.length > 0 && (
          <div className="space-y-1.5 max-h-28 overflow-y-auto">
            {refineMessages.map((m, i) => (
              <div key={i} className={cn("text-xs rounded-lg px-2.5 py-1.5 leading-relaxed",
                m.role === "user" ? "bg-orange-600/20 text-orange-200 ml-4" : "bg-white/5 text-gray-300 mr-4")}>
                {m.content}
              </div>
            ))}
          </div>
        )}

        {/* Refine input */}
        <div className="flex gap-2">
          <input
            value={refineInput}
            onChange={(e) => setRefineInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRefine()}
            placeholder="告诉 AI 如何修改分镜..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-gray-600 outline-none focus:border-orange-500/30"
          />
          <button
            onClick={handleRefine}
            disabled={!refineInput.trim() || refining}
            className="p-1.5 rounded-lg bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 disabled:opacity-40 transition-colors"
          >
            {refining ? <Loader2 size={13} className="animate-spin" /> : <MessageSquare size={13} />}
          </button>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm py-2 rounded-xl flex items-center justify-center gap-2"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Generate All Shots
        </Button>
      </div>
    </div>
  );
}
