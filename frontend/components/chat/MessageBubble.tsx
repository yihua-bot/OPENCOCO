"use client";
import { Message, Video } from "@/lib/api";
import { cn } from "@/lib/utils";
import { VideoPlayer } from "@/components/video/VideoPlayer";

interface MessageBubbleProps {
  message: Message;
  video?: Video | null;
}

export function MessageBubble({ message, video }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold",
        isUser ? "bg-orange-600 text-white" : "bg-gradient-to-br from-orange-500 to-amber-500 text-white"
      )}>
        {isUser ? "U" : "C"}
      </div>

      <div className={cn("flex flex-col gap-2 max-w-[80%]", isUser ? "items-end" : "items-start")}>
        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-orange-600 text-white rounded-tr-sm"
            : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm"
        )}>
          {message.content}
        </div>

        {/* Video attached to this message */}
        {video && (
          <div className="w-full max-w-sm">
            <VideoPlayer video={video} />
          </div>
        )}
      </div>
    </div>
  );
}
