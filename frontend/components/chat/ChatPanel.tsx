"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { api, Message, Video } from "@/lib/api";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { Loader2 } from "lucide-react";

interface ChatPanelProps {
  projectId: string;
  onVideoUpdate?: (video: Video) => void;
}

interface MessageWithVideo extends Message {
  videoData?: Video | null;
}

export function ChatPanel({ projectId, onVideoUpdate }: ChatPanelProps) {
  const [messages, setMessages] = useState<MessageWithVideo[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [pendingVideoId, setPendingVideoId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = useCallback(async () => {
    try {
      const msgs = await api.listMessages(projectId);
      // Load videos for messages that have them
      const withVideos = await Promise.all(
        msgs.map(async (m) => {
          if (m.video_id) {
            try {
              const video = await api.getVideo(m.video_id);
              return { ...m, videoData: video };
            } catch {
              return { ...m, videoData: null };
            }
          }
          return { ...m, videoData: null };
        })
      );
      setMessages(withVideos);
    } catch (e) {
      console.error(e);
    }
  }, [projectId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // Poll for video completion
  useEffect(() => {
    if (!pendingVideoId) return;
    const interval = setInterval(async () => {
      try {
        const video = await api.getVideo(pendingVideoId);
        if (video.status === "done" || video.status === "failed") {
          clearInterval(interval);
          setPendingVideoId(null);
          // Update the message that has this video
          setMessages((prev) =>
            prev.map((m) =>
              m.video_id === pendingVideoId ? { ...m, videoData: video } : m
            )
          );
          if (video.status === "done" && onVideoUpdate) {
            onVideoUpdate(video);
          }
        }
      } catch {
        clearInterval(interval);
        setPendingVideoId(null);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [pendingVideoId, onVideoUpdate]);

  const handleSend = async (content: string) => {
    // Optimistically add user message
    const tempUserMsg: MessageWithVideo = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      created_at: new Date().toISOString(),
      video_id: null,
      videoData: null,
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setStreaming(true);
    setStreamingText("");

    try {
      const res = await api.streamMessage(projectId, content);
      if (!res.body) return;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let assistantMsgId = "";
      let videoId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "text") {
              assistantText += data.content;
              setStreamingText(assistantText);
            } else if (data.type === "done") {
              assistantMsgId = data.message_id;
              videoId = data.video_id;
            }
          } catch {}
        }
      }

      // Replace streaming text with real message
      const assistantMsg: MessageWithVideo = {
        id: assistantMsgId,
        role: "assistant",
        content: assistantText,
        created_at: new Date().toISOString(),
        video_id: videoId,
        videoData: null,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingText("");

      if (videoId) {
        setPendingVideoId(videoId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-2xl">
              🎬
            </div>
            <p className="text-gray-400 text-sm max-w-xs">
              Describe your video idea and I&apos;ll create it for you. You can also paste a URL, upload images, or choose a template.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} video={msg.videoData} />
        ))}

        {/* Streaming assistant message */}
        {streaming && streamingText && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-xs font-bold text-white">
              M
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-200 max-w-[80%]">
              {streamingText}
              <span className="inline-block w-1 h-4 bg-orange-400 ml-1 animate-pulse" />
            </div>
          </div>
        )}

        {streaming && !streamingText && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-xs font-bold text-white">
              M
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 size={16} className="animate-spin text-orange-400" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5">
        <ChatInput onSend={handleSend} disabled={streaming} />
      </div>
    </div>
  );
}
