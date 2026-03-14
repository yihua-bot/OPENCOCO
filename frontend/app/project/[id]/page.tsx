"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, Project, Video, Message } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { usePlanningStore, EditorMode } from "@/lib/planningStore";
import { useApiKeyStore } from "@/lib/apiKeyStore";
import { Navbar } from "@/components/layout/Navbar";
import { VideoPlayer } from "@/components/video/VideoPlayer";
import { ExportModal } from "@/components/video/ExportModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { ChatInput } from "@/components/chat/ChatInput";
import { PlanningPanel } from "@/components/planning/PlanningPanel";
import { ShotGrid } from "@/components/planning/ShotGrid";
import { AssetLibrary } from "@/components/planning/AssetLibrary";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { ArrowLeft, Edit2, Check, Film, Loader2, RotateCcw, Music, Type, Video as VideoIcon, Scissors, Share2, Download } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface MessageWithVideo extends Message {
  videoData?: Video | null;
}

interface TimelineClip {
  id: string;
  video: Video;
  script: string;
  duration: number;
  transition: "none" | "fade" | "cut";
}

interface EditHistoryEntry {
  desc: string;
  prev: TimelineClip[];
}

type SelectedTrack = "video" | "script" | "music" | null;

const MODE_LABELS: Record<EditorMode, string> = {
  chat: "Chat",
  planning: "Planning",
  generating: "Generating",
  composing: "Composing",
  done: "Done",
};

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuthStore();
  const { mode, storyboard, setStoryboard, setMode, refreshStoryboard } = usePlanningStore();
  const { sbEntries, sbActiveId, vidEntries, vidActiveId } = useApiKeyStore();
  const sbConfig = sbEntries.find((e) => e.id === sbActiveId) ?? sbEntries[0] ?? null;
  const vidConfig = vidEntries.find((e) => e.id === vidActiveId) ?? vidEntries[0] ?? null;

  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<MessageWithVideo[]>([]);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [pendingVideoId, setPendingVideoId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [assembling, setAssembling] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<SelectedTrack>(null);
  const [editHistory, setEditHistory] = useState<EditHistoryEntry[]>([]);
  const [editInput, setEditInput] = useState("");
  const [dragAsset, setDragAsset] = useState<{ id: string; videoUrl: string; thumbnailUrl: string; duration: number; script: string } | null>(null);
  const [timelineDragOver, setTimelineDragOver] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | undefined>();
  const [contextMd, setContextMd] = useState("");
  const [contextOpen, setContextOpen] = useState(false);
  const [contextSaving, setContextSaving] = useState(false);
  const [editLog, setEditLog] = useState<{ timestamp: string; op: string; desc: string; command: string }[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    loadProject();
  }, [token, id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const loadProject = async () => {
    try {
      const p = await api.getProject(id);
      setProject(p);
      setTitleValue(p.title);
      // Load context and edit log in parallel
      const [msgs, ctxRes, logRes] = await Promise.all([
        api.listMessages(id),
        api.getContext(id).catch(() => ({ context_md: "" })),
        api.getEditLog(id).catch(() => ({ edit_log: [] })),
      ]);
      setContextMd(ctxRes.context_md);
      setEditLog(logRes.edit_log);
      const withVideos = await Promise.all(
        msgs.map(async (m) => {
          if (m.video_id) {
            try { return { ...m, videoData: await api.getVideo(m.video_id) }; }
            catch { return { ...m, videoData: null }; }
          }
          return { ...m, videoData: null };
        })
      );
      setMessages(withVideos);
      const videos = withVideos.filter((m) => m.videoData?.status === "done").map((m) => m.videoData!);
      if (videos.length > 0) setActiveVideo(videos[videos.length - 1]);

      // Restore timeline clips if mode=done and storyboard is persisted for this project
      if (mode === "done" && storyboard && storyboard.project_id === id) {
        const clips: TimelineClip[] = storyboard.shots
          .filter((s) => s.status === "done" && s.video)
          .map((s) => ({
            id: s.id,
            video: s.video!,
            script: s.script,
            duration: s.duration,
            transition: "cut" as const,
          }));
        if (clips.length > 0) setTimelineClips(clips);
      }
    } catch { router.push("/dashboard"); }
  };

  // Poll for single pending video (chat mode)
  useEffect(() => {
    if (!pendingVideoId) return;
    const interval = setInterval(async () => {
      try {
        const video = await api.getVideo(pendingVideoId);
        if (video.status === "done" || video.status === "failed") {
          clearInterval(interval);
          setPendingVideoId(null);
          setMessages((prev) => prev.map((m) => m.video_id === pendingVideoId ? { ...m, videoData: video } : m));
          if (video.status === "done") {
            setActiveVideo(video);
            setProject((prev) => prev ? { ...prev, status: "done" } : prev);
          }
        }
      } catch { clearInterval(interval); setPendingVideoId(null); }
    }, 2000);
    return () => clearInterval(interval);
  }, [pendingVideoId]);

  // Poll storyboard during generating mode
  useEffect(() => {
    if (mode !== "generating" || !storyboard) return;
    const interval = setInterval(async () => {
      try {
        const sb = await api.getStoryboard(id, storyboard.id);
        refreshStoryboard(sb);
        const allDone = sb.shots.every((s) => s.status === "done" || s.status === "failed");
        if (allDone) clearInterval(interval);
      } catch { clearInterval(interval); }
    }, 2000);
    return () => clearInterval(interval);
  }, [mode, storyboard?.id]);

  // Poll final video during composing mode
  useEffect(() => {
    if (mode !== "composing" || !storyboard?.final_video_id) return;
    const interval = setInterval(async () => {
      try {
        const video = await api.getVideo(storyboard.final_video_id!);
        if (video.status === "done") {
          clearInterval(interval);
          setActiveVideo(video);
          setMode("done");
          // Build timeline from shots
          if (storyboard) {
            const clips: TimelineClip[] = storyboard.shots
              .filter((s) => s.status === "done" && s.video)
              .map((s) => ({
                id: s.id,
                video: s.video!,
                script: s.script,
                duration: s.duration,
                transition: "cut" as const,
              }));
            setTimelineClips(clips);
          }
          setProject((prev) => prev ? { ...prev, status: "done" } : prev);
        }
      } catch { clearInterval(interval); }
    }, 2000);
    return () => clearInterval(interval);
  }, [mode, storyboard?.final_video_id]);

  const handleSend = async (content: string, stylePackId = "default", aspectRatio = "16:9") => {
    // In done mode, route to edit command handler
    if (mode === "done") {
      await handleEditCommand(content);
      return;
    }
    const tempMsg: MessageWithVideo = {
      id: `temp-${Date.now()}`, role: "user", content,
      created_at: new Date().toISOString(), video_id: null, videoData: null,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setStreaming(true);
    setStreamingText("");
    try {
      const res = await api.streamMessage(
        id,
        content,
        sbConfig ? { provider: sbConfig.provider, api_key: sbConfig.apiKey, model: sbConfig.model, base_url: sbConfig.baseUrl, fallbacks: sbConfig.fallbacks?.map(f => ({ provider: f.provider, api_key: f.apiKey, model: f.model, base_url: f.baseUrl })) } : undefined,
        vidConfig ? { provider: vidConfig.provider, api_key: vidConfig.apiKey, api_secret: vidConfig.apiSecret, base_url: vidConfig.baseUrl } : undefined,
        stylePackId,
      );
      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let assistantMsgId = "";
      let videoId: string | null = null;
      let storyboardId: string | null = null;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "text") { assistantText += data.content; setStreamingText(assistantText); }
            else if (data.type === "done") {
              assistantMsgId = data.message_id;
              videoId = data.video_id;
              storyboardId = data.storyboard_id;
            }
          } catch {}
        }
      }
      setMessages((prev) => [...prev, {
        id: assistantMsgId, role: "assistant", content: assistantText,
        created_at: new Date().toISOString(), video_id: videoId, videoData: null,
      }]);
      setStreamingText("");
      if (storyboardId) {
        const sb = await api.getStoryboard(id, storyboardId);
        setStoryboard(sb);
      } else if (videoId) {
        setPendingVideoId(videoId);
        setProject((prev) => prev ? { ...prev, status: "generating" } : prev);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("积分不足") || msg.includes("402")) {
        setMessages((prev) => [...prev, {
          id: `err-${Date.now()}`, role: "assistant",
          content: "⚠️ 积分不足，无法继续生成。请联系管理员充值。",
          created_at: new Date().toISOString(), video_id: null, videoData: null,
        }]);
      } else {
        console.error(e);
      }
    }
    finally { setStreaming(false); }
  };

  const addClipToTimeline = (asset: { id: string; videoUrl: string; thumbnailUrl: string; duration: number; script: string }) => {
    setTimelineClips((prev) => {
      if (prev.find((c) => c.id === asset.id)) return prev; // already in timeline
      const newClip: TimelineClip = {
        id: asset.id,
        video: { id: asset.id, project_id: id, url: asset.videoUrl, thumbnail_url: asset.thumbnailUrl, duration: asset.duration, status: "done", meta: {}, created_at: "" },
        script: asset.script,
        duration: asset.duration,
        transition: "cut",
      };
      return [...prev, newClip];
    });
  };

  const handleEditCommand = async (content: string) => {
    const clips = timelineClips;
    const clipInfos = clips.map((c, i) => ({
      id: c.id,
      index: i + 1,
      script: c.script,
      duration: c.duration,
      transition: c.transition,
    }));

    // Optimistically add user message
    setMessages((prev) => [
      ...prev,
      { id: `edit-u-${Date.now()}`, role: "user", content, created_at: new Date().toISOString(), video_id: null, videoData: null },
    ]);

    let op = "unknown", desc = "", params: Record<string, unknown> = {};
    try {
      const result = await api.timelineEdit(
        content,
        clipInfos,
        sbConfig ? { provider: sbConfig.provider, api_key: sbConfig.apiKey, model: sbConfig.model, base_url: sbConfig.baseUrl } : undefined,
        id,
      );
      op = result.op;
      desc = result.desc;
      params = result.params;
    } catch {
      // silently fall through to unknown
    }

    let newClips: TimelineClip[] | null = null;

    if (op === "duration") {
      const idx = (params.index as number) - 1;
      const dur = params.value as number;
      if (idx >= 0 && idx < clips.length) {
        newClips = clips.map((c, i) => i === idx ? { ...c, duration: dur } : c);
      }
    } else if (op === "script") {
      const idx = (params.index as number) - 1;
      const text = params.text as string;
      if (idx >= 0 && idx < clips.length) {
        newClips = clips.map((c, i) => i === idx ? { ...c, script: text } : c);
      }
    } else if (op === "delete") {
      const idx = (params.index as number) - 1;
      if (idx >= 0 && idx < clips.length) {
        newClips = clips.filter((_, i) => i !== idx);
        if (selectedClipId === clips[idx]?.id) setSelectedClipId(null);
      }
    } else if (op === "swap") {
      const a = (params.index_a as number) - 1;
      const b = (params.index_b as number) - 1;
      if (a >= 0 && b >= 0 && a < clips.length && b < clips.length && a !== b) {
        newClips = [...clips];
        [newClips[a], newClips[b]] = [newClips[b], newClips[a]];
      }
    } else if (op === "transition") {
      const idx = (params.index as number) - 1;
      const type = params.type as "fade" | "cut" | "none";
      if (idx >= 0 && idx < clips.length) {
        newClips = clips.map((c, i) => i === idx ? { ...c, transition: type } : c);
      }
    }

    if (newClips) {
      setEditHistory((prev) => [...prev.slice(-9), { desc, prev: clips }]);
      setTimelineClips(newClips);
      setMessages((prev) => [
        ...prev,
        { id: `edit-a-${Date.now()}`, role: "assistant", content: `✓ ${desc}`, created_at: new Date().toISOString(), video_id: null, videoData: null },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        { id: `edit-a-${Date.now()}`, role: "assistant", content: "没有识别到有效的编辑指令，试试：「把第2段时长改成6秒」或「删除第3段」", created_at: new Date().toISOString(), video_id: null, videoData: null },
      ]);
    }
  };

  const handleUndo = () => {
    if (editHistory.length === 0) return;
    const last = editHistory[editHistory.length - 1];
    setTimelineClips(last.prev);
    setEditHistory(prev => prev.slice(0, -1));
  };

  const handleAssemble = async () => {
    if (!storyboard) return;
    setAssembling(true);
    try {
      await api.composeVideo(id, storyboard.id);
      setMode("composing");
      // Refresh storyboard to get final_video_id once it's set
      const poll = setInterval(async () => {
        const sb = await api.getStoryboard(id, storyboard.id);
        refreshStoryboard(sb);
        if (sb.final_video_id) clearInterval(poll);
      }, 2000);
    } finally {
      setAssembling(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/project/${id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setShareOpen(true);
    }
  };

  const handleExport = async () => {
    if (storyboard?.final_video_id && !finalVideoUrl) {
      const v = await api.getVideo(storyboard.final_video_id).catch(() => null);
      if (v?.url) setFinalVideoUrl(v.url);
    }
    setExportModalOpen(true);
  };

  const saveTitle = async () => {
    if (!project || !titleValue.trim()) return;
    setEditingTitle(false);
    setProject(await api.updateProject(id, { title: titleValue }));
  };

  const allVideos = messages.filter((m) => m.videoData).map((m) => m.videoData!);
  const shotAssets = storyboard?.shots ?? [];

  if (!project) return (
    <div className="min-h-screen bg-[#0c0a08] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="h-screen bg-[#0c0a08] flex flex-col overflow-hidden">
      <Navbar />

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-white/5 bg-[#120e0a] flex-shrink-0">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm"><ArrowLeft size={15} /></Button>
        </Link>
        {editingTitle ? (
          <div className="flex items-center gap-2">
            <input value={titleValue} onChange={(e) => setTitleValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveTitle()}
              className="bg-white/5 border border-orange-500/50 rounded-lg px-3 py-1 text-sm text-white outline-none" autoFocus />
            <Button size="sm" onClick={saveTitle}><Check size={13} /></Button>
          </div>
        ) : (
          <button onClick={() => setEditingTitle(true)} className="flex items-center gap-2 text-sm font-medium text-white hover:text-gray-300 group">
            {project.title}
            <Edit2 size={11} className="opacity-0 group-hover:opacity-100 text-gray-500" />
          </button>
        )}
        <StatusBadge status={project.status} />
        {/* Mode indicator */}
        <div className={cn(
          "ml-auto px-2.5 py-0.5 rounded-full text-xs font-medium",
          mode === "chat" && "bg-white/10 text-gray-400",
          mode === "planning" && "bg-orange-500/20 text-orange-400 animate-pulse",
          mode === "generating" && "bg-orange-500/20 text-orange-400",
          mode === "composing" && "bg-orange-500/20 text-orange-400 animate-pulse",
          mode === "done" && "bg-green-500/20 text-green-400",
        )}>
          {mode === "generating" && storyboard
            ? `Generating ${storyboard.shots.filter(s => s.status === "done").length}/${storyboard.shots.length}`
            : MODE_LABELS[mode]}
        </div>

        {/* Share & Export */}
        <div className="flex items-center gap-2 relative">
          {/* Share button */}
          <div className="relative">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all"
            >
              <Share2 size={13} />
              {shareCopied ? "Copied!" : "Share"}
            </button>
            {/* Share popover fallback */}
            {shareOpen && (
              <div className="absolute right-0 top-9 z-50 bg-[#1a1410] border border-white/10 rounded-xl p-3 w-64 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Share link</span>
                  <button onClick={() => setShareOpen(false)} className="text-gray-600 hover:text-white text-xs">✕</button>
                </div>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/project/${id}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-300 outline-none"
                  />
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(`${window.location.origin}/project/${id}`);
                      setShareCopied(true);
                      setShareOpen(false);
                      setTimeout(() => setShareCopied(false), 2000);
                    }}
                    className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded-lg transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={timelineClips.length === 0 && !storyboard?.final_video_id}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              timelineClips.length > 0 || storyboard?.final_video_id
                ? "bg-orange-600 hover:bg-orange-700 text-white border border-orange-500"
                : "bg-white/5 text-gray-600 border border-white/10 cursor-not-allowed"
            )}
          >
            <Download size={13} />
            Export
          </button>
        </div>
      </div>

      {/* Export modal */}
      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        projectTitle={project?.title ?? "video"}
        timelineClips={timelineClips}
        finalVideoUrl={finalVideoUrl}
      />
      <div className="flex-1 min-h-0">
        <Allotment>
          {/* LEFT — Asset Library */}
          <Allotment.Pane minSize={140} preferredSize={200}>
            <AssetLibrary
              shots={shotAssets}
              clips={allVideos}
              onSelect={(url) => {
                const v = allVideos.find(v => v.url === url) ?? shotAssets.find(s => s.video?.url === url)?.video ?? null;
                if (v) setActiveVideo(v);
              }}
              activeUrl={activeVideo?.url}
              timelineIds={timelineClips.map(c => c.id)}
              onAddToTimeline={addClipToTimeline}
              onDragStart={setDragAsset}
            />
          </Allotment.Pane>

          {/* CENTER — Preview + Timeline */}
          <Allotment.Pane minSize={300}>
            <Allotment vertical>
              {/* Video preview or ShotGrid */}
              <Allotment.Pane minSize={120}>
                {(mode === "generating" || mode === "composing") && storyboard ? (
                  <ShotGrid
                    shots={storyboard.shots}
                    onShotClick={(shot) => shot.video && setActiveVideo(shot.video)}
                    onAssemble={handleAssemble}
                    assembling={assembling}
                  />
                ) : (
                  <div className="h-full bg-[#0a0806] flex items-center justify-center p-6">
                    {activeVideo ? (
                      <div className="w-full max-w-3xl">
                        <VideoPlayer video={activeVideo} />
                      </div>
                    ) : project.status === "generating" ? (
                      <div className="text-center">
                        <div className="w-14 h-14 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">Generating your video...</p>
                      </div>
                    ) : (
                      <div className="text-center text-gray-700">
                        <div className="text-5xl mb-3 opacity-20">🎬</div>
                        <p className="text-sm">Preview appears here</p>
                        <p className="text-xs mt-1 opacity-60">Describe your video on the right to get started</p>
                      </div>
                    )}
                  </div>
                )}
              </Allotment.Pane>

              {/* Timeline */}
              <Allotment.Pane minSize={80} preferredSize={160}>
                <div
                  className={cn("h-full flex flex-col transition-colors", timelineDragOver ? "bg-orange-500/5" : "bg-[#120e0a]")}
                  onDragOver={(e) => { e.preventDefault(); setTimelineDragOver(true); }}
                  onDragLeave={() => setTimelineDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setTimelineDragOver(false);
                    if (dragAsset) { addClipToTimeline(dragAsset); setDragAsset(null); }
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) { setSelectedClipId(null); setSelectedTrack(null); }
                  }}
                >
                  <div className="px-3 py-1.5 border-b border-white/5 flex-shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Timeline</span>
                      {timelineDragOver && <span className="text-xs text-orange-400 animate-pulse">Drop to add</span>}
                    </div>
                    {editHistory.length > 0 && (
                      <button onClick={handleUndo} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                        <RotateCcw size={10} /> 撤销
                      </button>
                    )}
                  </div>
                  <div className="flex flex-1 min-h-0">
                    <div className="w-16 flex-shrink-0 border-r border-white/5 flex flex-col">
                      {[
                        { label: "Video", icon: <VideoIcon size={9} /> },
                        { label: "Script", icon: <Type size={9} /> },
                        { label: "Music", icon: <Music size={9} /> },
                      ].map(({ label, icon }) => (
                        <div key={label} className="flex-1 flex items-center gap-1 px-2 border-b border-white/5 last:border-0">
                          <span className="text-gray-700">{icon}</span>
                          <span className="text-xs text-gray-600">{label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 overflow-x-auto" onClick={() => { setSelectedClipId(null); setSelectedTrack(null); }}>
                      {/* Video track */}
                      <div className="h-1/3 border-b border-white/5 flex items-center px-2 gap-1.5">
                        {timelineClips.map((item, i) => (
                          <div key={item.id}
                            onClick={(e) => { e.stopPropagation(); setActiveVideo(item.video); setSelectedClipId(item.id); setSelectedTrack("video"); }}
                            className={cn(
                              "h-8 rounded flex items-center px-2 cursor-pointer flex-shrink-0 border transition-all",
                              selectedClipId === item.id && selectedTrack === "video"
                                ? "border-orange-500 bg-orange-500/20 ring-1 ring-orange-500/30"
                                : activeVideo?.id === item.video.id
                                  ? "border-orange-500/50 bg-orange-500/10"
                                  : "border-white/10 bg-white/5 hover:bg-white/10"
                            )}
                            style={{ width: `${Math.max(60, item.duration * 12)}px` }}>
                            <span className="text-xs text-gray-400 truncate">Shot {i + 1}</span>
                            {item.transition === "fade" && <Scissors size={8} className="ml-auto text-blue-400 flex-shrink-0" />}
                          </div>
                        ))}
                        {timelineClips.length === 0 && (
                          <span className="text-xs text-gray-700">No clips yet</span>
                        )}
                      </div>
                      {/* Script track */}
                      <div className="h-1/3 border-b border-white/5 flex items-center px-2 gap-1.5">
                        {timelineClips.map((item, i) => (
                          <div key={item.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedClipId(item.id); setSelectedTrack("script"); }}
                            className={cn(
                              "h-5 rounded border flex items-center px-2 flex-shrink-0 cursor-pointer transition-all",
                              selectedClipId === item.id && selectedTrack === "script"
                                ? "bg-blue-500/20 border-blue-400/60 ring-1 ring-blue-400/30"
                                : "bg-blue-500/10 border-blue-500/20 hover:border-blue-400/40"
                            )}
                            style={{ width: `${Math.max(60, item.duration * 12)}px` }}>
                            <span className="text-xs text-blue-400/70 truncate">{item.script || `Shot ${i + 1}`}</span>
                          </div>
                        ))}
                      </div>
                      {/* Music track */}
                      <div className="h-1/3 flex items-center px-2">
                        {timelineClips.length > 0 && (
                          <div
                            onClick={(e) => { e.stopPropagation(); setSelectedClipId(null); setSelectedTrack("music"); }}
                            className={cn(
                              "h-5 rounded border border-dashed flex items-center px-2 cursor-pointer transition-all",
                              selectedTrack === "music"
                                ? "bg-green-500/20 border-green-400/60 ring-1 ring-green-400/30"
                                : "bg-green-500/10 border-green-500/20 hover:border-green-400/40"
                            )}
                            style={{ width: `${timelineClips.reduce((s, c) => s + Math.max(60, c.duration * 12), 0) + (timelineClips.length - 1) * 6}px` }}>
                            <span className="text-xs text-green-600/60">Background music</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>

          {/* RIGHT — Chat / Planning / Edit Panel */}
          <Allotment.Pane minSize={220} preferredSize={300}>
            {mode === "planning" ? (
              <PlanningPanel projectId={id} onGenerateStart={() => {}} />
            ) : mode === "done" && timelineClips.length > 0 ? (() => {
              // Derive selected clip info for context-aware chips
              const selIdx = selectedClipId ? timelineClips.findIndex(c => c.id === selectedClipId) : -1;
              const selN = selIdx + 1;
              const chips = [
                { label: "调整时长", fill: selN > 0 ? `把第${selN}段时长改成` : "把第几段时长改成几秒" },
                { label: "修改文案", fill: selN > 0 ? `把第${selN}段文案改成「` : "把第几段文案改成「" },
                { label: "替换片段", fill: selN > 0 ? `重新生成第${selN}段，` : "重新生成第几段" },
                { label: "调换顺序", fill: selN > 0 ? `把第${selN}段和第` : "把第几段和第几段对调" },
                { label: "删除片段", fill: selN > 0 ? `删除第${selN}段` : "删除第几段" },
                { label: "添加转场", fill: selN > 0 ? `在第${selN}段后添加淡入淡出转场` : "在第几段后添加转场" },
              ];
              const placeholder = selectedTrack === "music"
                ? "描述背景音乐风格，比如：换成节奏更快的战斗音乐"
                : selectedTrack === "script" && selN > 0
                  ? `修改 Shot ${selN} 的文案，比如：改成「决战时刻」`
                  : selN > 0
                    ? `对 Shot ${selN} 说点什么，比如：时长改成6秒`
                    : "描述你想做的修改，比如：把第2段文案改成更有力量感的";
              return (
                <div className="h-full bg-[#120e0a] flex flex-col">
                  {/* Header */}
                  <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-400">Edit</span>
                    <span className="text-xs text-gray-600">
                      {selN > 0
                        ? `Shot ${selN} · ${selectedTrack === "script" ? "Script" : selectedTrack === "music" ? "Music" : "Video"}`
                        : selectedTrack === "music" ? "Music track" : "No selection"}
                    </span>
                  </div>
                  {/* Quick chips */}
                  <div className="px-3 pt-2.5 pb-2 border-b border-white/5 flex-shrink-0 space-y-1.5">
                    <div className="flex flex-wrap gap-1.5">
                      {chips.slice(0, 3).map(chip => (
                        <button key={chip.label} onClick={() => setEditInput(chip.fill)}
                          className="px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-gray-400 hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-300 transition-all">
                          {chip.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {chips.slice(3).map(chip => (
                        <button key={chip.label} onClick={() => setEditInput(chip.fill)}
                          className="px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-gray-400 hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-300 transition-all">
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Edit history */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                    {messages.length === 0 && editHistory.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                        <div className="text-xl opacity-30">✂️</div>
                        <p className="text-gray-600 text-xs max-w-[180px]">点击时间轴片段选中，再用自然语言描述修改</p>
                      </div>
                    )}
                    {messages.map((msg) => (
                      <div key={msg.id} className={cn(
                        "text-xs rounded-xl px-3 py-2 leading-relaxed",
                        msg.role === "user"
                          ? "bg-orange-600/20 text-orange-200 border border-orange-500/20 ml-4"
                          : "bg-white/5 text-gray-300 border border-white/10 mr-4"
                      )}>
                        {msg.content}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  {/* Input */}
                  <div className="p-3 border-t border-white/5 flex-shrink-0">
                    <ChatInput
                      onSend={(v) => { handleSend(v); setEditInput(""); }}
                      disabled={false}
                      placeholder={placeholder}
                      value={editInput}
                      onChange={setEditInput}
                    />
                  </div>

                  {/* 项目记忆 */}
                  <div className="border-t border-white/5 flex-shrink-0">
                    <button
                      onClick={() => setContextOpen((o) => !o)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <span>🧠 项目记忆</span>
                      <span className={cn("transition-transform", contextOpen ? "rotate-180" : "")}>▾</span>
                    </button>
                    {contextOpen && (
                      <div className="px-3 pb-3 space-y-2">
                        <textarea
                          value={contextMd}
                          onChange={(e) => setContextMd(e.target.value)}
                          placeholder="记录风格偏好、常用镜头语言、品牌调性等，AI 生成分镜时会参考这里的内容..."
                          rows={4}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-gray-600 resize-none outline-none focus:border-orange-500/30"
                        />
                        <button
                          onClick={async () => {
                            setContextSaving(true);
                            await api.updateContext(id, contextMd).catch(() => {});
                            setContextSaving(false);
                          }}
                          className="px-3 py-1 rounded-lg text-xs bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                        >
                          {contextSaving ? "保存中..." : "保存"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 创作日志 */}
                  <div className="border-t border-white/5 flex-shrink-0">
                    <button
                      onClick={() => setLogOpen((o) => !o)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <span>📋 创作日志 {editLog.length > 0 && `(${editLog.length})`}</span>
                      <span className={cn("transition-transform", logOpen ? "rotate-180" : "")}>▾</span>
                    </button>
                    {logOpen && (
                      <div className="px-3 pb-3 max-h-40 overflow-y-auto space-y-1.5">
                        {editLog.length === 0 ? (
                          <p className="text-xs text-gray-600">暂无编辑记录</p>
                        ) : (
                          [...editLog].reverse().map((entry, i) => (
                            <div key={i} className="text-xs text-gray-500 border-l-2 border-white/10 pl-2">
                              <span className="text-gray-600">{new Date(entry.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                              <span className="ml-2 text-gray-400">{entry.desc}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })() : (
              <div className="h-full bg-[#120e0a] flex flex-col">
                <div className="px-3 py-2 border-b border-white/5 flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Describe</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                  {messages.length === 0 && !streaming && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-8">
                      <div className="text-2xl">✨</div>
                      <p className="text-gray-500 text-xs max-w-[200px]">Describe your video idea and Coco will create it for you.</p>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn(
                      "text-xs rounded-xl px-3 py-2 leading-relaxed",
                      msg.role === "user"
                        ? "bg-orange-600/20 text-orange-200 border border-orange-500/20 ml-4"
                        : "bg-white/5 text-gray-300 border border-white/10 mr-4"
                    )}>
                      {msg.content}
                      {msg.videoData?.status === "done" && (
                        <button onClick={() => setActiveVideo(msg.videoData!)}
                          className="mt-1.5 flex items-center gap-1 text-orange-400 hover:text-orange-300">
                          <Film size={10} /> View clip
                        </button>
                      )}
                    </div>
                  ))}
                  {streaming && streamingText && (
                    <div className="bg-white/5 text-gray-300 border border-white/10 rounded-xl px-3 py-2 text-xs mr-4 leading-relaxed">
                      {streamingText}<span className="inline-block w-0.5 h-3 bg-orange-400 ml-0.5 animate-pulse" />
                    </div>
                  )}
                  {streaming && !streamingText && (
                    <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 mr-4">
                      <Loader2 size={12} className="animate-spin text-orange-400" />
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 border-t border-white/5 flex-shrink-0">
                  <ChatInput onSend={handleSend} disabled={streaming || mode !== "chat"} placeholder="Describe your video..." />
                </div>
              </div>
            )}
          </Allotment.Pane>
        </Allotment>
      </div>
    </div>
  );
}

