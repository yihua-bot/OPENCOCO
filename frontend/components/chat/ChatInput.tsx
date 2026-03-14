"use client";
import { useState, useRef, KeyboardEvent, useEffect } from "react";
import { Send, Paperclip, Link, Brain, Video, ChevronDown, RectangleHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiKeyDrawer } from "@/components/settings/ApiKeyDrawer";
import { useApiKeyStore, STORYBOARD_PROVIDERS, VIDEO_PROVIDERS } from "@/lib/apiKeyStore";

const STYLE_PACKS = [
  { id: "default",     name: "通用",   icon: "🎬" },
  { id: "commercial",  name: "广告片", icon: "📢" },
  { id: "documentary", name: "纪录片", icon: "🎥" },
  { id: "shortdrama",  name: "短剧",   icon: "🎭" },
  { id: "mv",          name: "MV",     icon: "🎵" },
];

export const ASPECT_RATIOS = [
  { id: "16:9",  label: "16:9",  desc: "横屏标准" },
  { id: "9:16",  label: "9:16",  desc: "竖屏短视频" },
  { id: "1:1",   label: "1:1",   desc: "方形" },
  { id: "4:3",   label: "4:3",   desc: "传统电视" },
  { id: "3:2",   label: "3:2",   desc: "电影胶片" },
  { id: "21:9",  label: "21:9",  desc: "超宽银幕" },
];

interface ChatInputProps {
  onSend: (content: string, stylePackId: string, aspectRatio: string) => void;
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

export function ChatInput({ onSend, disabled, placeholder = "Describe your video idea...", value: externalValue, onChange }: ChatInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const value = externalValue !== undefined ? externalValue : internalValue;
  const setValue = (v: string) => {
    if (onChange) onChange(v);
    else setInternalValue(v);
  };
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"storyboard" | "video">("storyboard");
  const [stylePackId, setStylePackId] = useState("default");
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [ratioMenuOpen, setRatioMenuOpen] = useState(false);

  const { sbEntries, sbActiveId, vidEntries, vidActiveId } = useApiKeyStore();
  const sb = sbEntries.find((e) => e.id === sbActiveId) ?? sbEntries[0] ?? null;
  const vid = vidEntries.find((e) => e.id === vidActiveId) ?? vidEntries[0] ?? null;
  const sbLabel = sb
    ? STORYBOARD_PROVIDERS.find((p) => p.value === sb.provider)?.label.split(" ")[0] ?? sb.provider
    : "未配置";
  const vidLabel = vid
    ? VIDEO_PROVIDERS.find((p) => p.value === vid.provider)?.label.split(" ")[0] ?? vid.provider
    : "未配置";

  const activePack = STYLE_PACKS.find((p) => p.id === stylePackId) ?? STYLE_PACKS[0];

  useEffect(() => {
    if (externalValue !== undefined && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
      const len = externalValue.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [externalValue]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, stylePackId, aspectRatio);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  return (
    <>
      <div className="border border-white/10 rounded-2xl bg-white/5 backdrop-blur-sm p-3 focus-within:border-orange-500/20 transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "w-full bg-transparent text-sm text-white placeholder:text-gray-500 resize-none outline-none leading-relaxed",
            "min-h-[24px] max-h-[160px]"
          )}
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1">
            <button className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors" title="Attach file">
              <Paperclip size={16} />
            </button>
            <button className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors" title="Paste URL">
              <Link size={16} />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className={cn(
              "p-2 rounded-xl transition-all",
              value.trim() && !disabled
                ? "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-900/30"
                : "bg-white/5 text-gray-600 cursor-not-allowed"
            )}
          >
            <Send size={16} />
          </button>
        </div>

        {/* Model + style row */}
        <div className="flex gap-2 mt-2 pt-2 border-t border-white/5 flex-wrap">
          <button
            onClick={() => { setDrawerTab("storyboard"); setDrawerOpen(true); }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/30 transition-all group"
          >
            <Brain size={12} className="text-orange-400" />
            <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">
              分镜: <span className="text-gray-300">{sbLabel}</span>
            </span>
          </button>
          <button
            onClick={() => { setDrawerTab("video"); setDrawerOpen(true); }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-orange-500/30 transition-all group"
          >
            <Video size={12} className="text-blue-400" />
            <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">
              视频: <span className="text-gray-300">{vidLabel}</span>
            </span>
          </button>

          {/* Style pack selector */}
          <div className="relative">
            <button
              onClick={() => setStyleMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 transition-all group"
            >
              <span className="text-xs">{activePack.icon}</span>
              <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">
                {activePack.name}
              </span>
              <ChevronDown size={10} className="text-gray-600" />
            </button>
            {styleMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setStyleMenuOpen(false)} />
                <div className="absolute bottom-full mb-1 left-0 z-20 bg-gray-900 border border-white/10 rounded-xl p-1 shadow-xl min-w-[120px]">
                  {STYLE_PACKS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setStylePackId(p.id); setStyleMenuOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors text-left",
                        stylePackId === p.id
                          ? "bg-purple-500/20 text-purple-300"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <span>{p.icon}</span>
                      {p.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Aspect ratio selector */}
          <div className="relative">
            <button
              onClick={() => setRatioMenuOpen((o) => !o)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-500/30 transition-all group"
            >
              <RectangleHorizontal size={11} className="text-green-400" />
              <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">{aspectRatio}</span>
              <ChevronDown size={10} className="text-gray-600" />
            </button>
            {ratioMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setRatioMenuOpen(false)} />
                <div className="absolute bottom-full mb-1 left-0 z-20 bg-gray-900 border border-white/10 rounded-xl p-1 shadow-xl min-w-[140px]">
                  {ASPECT_RATIOS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => { setAspectRatio(r.id); setRatioMenuOpen(false); }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors text-left",
                        aspectRatio === r.id
                          ? "bg-green-500/20 text-green-300"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <span className="font-mono">{r.label}</span>
                      <span className="text-gray-600 text-[10px]">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ApiKeyDrawer
        open={drawerOpen}
        defaultTab={drawerTab}
        onClose={() => setDrawerOpen(false)}
      />
    </>
  );
}
