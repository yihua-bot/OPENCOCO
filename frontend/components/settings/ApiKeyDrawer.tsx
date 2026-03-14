"use client";
import { useState } from "react";
import { X, Eye, EyeOff, ChevronDown, Brain, Video, Image, Plus, Trash2, Check, ChevronLeft, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useApiKeyStore,
  STORYBOARD_PROVIDERS,
  STORYBOARD_MODELS,
  VIDEO_PROVIDERS,
  IMAGE_PROVIDERS,
  StoryboardProvider,
  VideoProvider,
  ImageProvider,
  StoryboardEntry,
  VideoEntry,
  ImageEntry,
} from "@/lib/apiKeyStore";

type Tab = "storyboard" | "video" | "image";
type View = "list" | "edit";

interface ApiKeyDrawerProps {
  open: boolean;
  defaultTab?: Tab;
  onClose: () => void;
}
// ── Shared primitives ─────────────────────────────────────────────────────────
function SelectField<T extends string>({
  value, options, onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white pr-8 outline-none focus:border-orange-500/50 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-gray-900">{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

function KeyInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-gray-400">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "sk-..."}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 pr-9 outline-none focus:border-orange-500/50 font-mono"
        />
        <button type="button" onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-gray-400">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 outline-none focus:border-orange-500/50"
      />
    </div>
  );
}

function providerLabel(provider: string, list: { value: string; label: string }[]) {
  return list.find((p) => p.value === provider)?.label ?? provider;
}

function maskKey(key: string) {
  if (!key) return "未配置";
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 4) + "••••••••" + key.slice(-4);
}

// ── Storyboard list view ──────────────────────────────────────────────────────
function SbList({ onAdd, onEdit }: { onAdd: () => void; onEdit: (id: string) => void }) {
  const { sbEntries, sbActiveId, setSbActive, deleteSbEntry } = useApiKeyStore();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {sbEntries.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">还没有添加任何分镜模型</p>
      ) : (
        sbEntries.map((e) => (
          <div key={e.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border transition-colors",
              sbActiveId === e.id
                ? "border-orange-500/40 bg-orange-500/5"
                : "border-white/8 bg-white/3 hover:bg-white/5"
            )}
          >
            {/* Active indicator */}
            <button onClick={() => setSbActive(e.id)}
              className={cn(
                "w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors",
                sbActiveId === e.id ? "border-orange-500 bg-orange-500" : "border-gray-600 hover:border-gray-400"
              )}>
              {sbActiveId === e.id && <Check size={10} className="text-white m-auto" />}
            </button>

            {/* Info */}
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSbActive(e.id)}>
              <p className="text-sm text-white truncate">
                {providerLabel(e.provider, STORYBOARD_PROVIDERS)}
              </p>
              <p className="text-xs text-gray-500 truncate">{e.model} · {maskKey(e.apiKey)}</p>
            </div>

            {/* Actions */}
            <button onClick={() => onEdit(e.id)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0">
              <Pencil size={13} />
            </button>
            {confirmDelete === e.id ? (
              <div className="flex gap-1">
                <button onClick={() => { deleteSbEntry(e.id); setConfirmDelete(null); }}
                  className="px-2 py-1 rounded text-xs bg-red-600 hover:bg-red-700 text-white transition-colors">删除</button>
                <button onClick={() => setConfirmDelete(null)}
                  className="px-2 py-1 rounded text-xs text-gray-400 hover:text-white transition-colors">取消</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(e.id)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))
      )}

      <button onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/15 text-sm text-gray-500 hover:text-gray-300 hover:border-white/30 transition-colors">
        <Plus size={14} />
        添加分镜模型
      </button>
    </div>
  );
}

// ── Storyboard edit form ──────────────────────────────────────────────────────
function SbEditForm({ entryId, onBack }: { entryId: string | null; onBack: () => void }) {
  const { sbEntries, addSbEntry, updateSbEntry } = useApiKeyStore();
  const existing = entryId ? sbEntries.find((e) => e.id === entryId) : null;

  const [provider, setProvider] = useState<StoryboardProvider>(existing?.provider ?? "claude");
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? "");
  const [model, setModel] = useState(existing?.model ?? STORYBOARD_MODELS["claude"][0]);
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? "");

  const handleProviderChange = (p: StoryboardProvider) => {
    setProvider(p);
    setModel(STORYBOARD_MODELS[p][0] ?? "");
  };

  const handleSave = () => {
    if (entryId) {
      updateSbEntry(entryId, { provider, apiKey, model, baseUrl: baseUrl || undefined });
    } else {
      addSbEntry({ provider, apiKey, model, baseUrl: baseUrl || undefined });
    }
    onBack();
  };

  const models = STORYBOARD_MODELS[provider];

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs text-gray-400">Provider</label>
        <SelectField value={provider} options={STORYBOARD_PROVIDERS} onChange={handleProviderChange} />
      </div>

      <KeyInput label="API Key" value={apiKey} onChange={setApiKey}
        placeholder={provider === "claude" ? "sk-ant-..." : "sk-..."} />

      {provider === "custom" ? (
        <>
          <TextField label="Base URL" value={baseUrl} onChange={setBaseUrl}
            placeholder="https://api.example.com/v1" />
          <TextField label="Model" value={model} onChange={setModel} placeholder="gpt-4o" />
        </>
      ) : (
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400">Model</label>
          <SelectField value={model} options={models.map((m) => ({ value: m, label: m }))} onChange={setModel} />
        </div>
      )}

      <p className="text-xs text-gray-500">Key 仅存储在本地浏览器，不会上传到服务器。</p>

      <div className="flex gap-2 pt-1">
        <button onClick={onBack}
          className="flex-1 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
          取消
        </button>
        <button onClick={handleSave}
          className="flex-1 py-2 rounded-lg text-sm bg-orange-600 hover:bg-orange-700 text-white transition-colors">
          保存
        </button>
      </div>
    </div>
  );
}

// ── Video list view ───────────────────────────────────────────────────────────
function VidList({ onAdd, onEdit }: { onAdd: () => void; onEdit: (id: string) => void }) {
  const { vidEntries, vidActiveId, setVidActive, deleteVidEntry } = useApiKeyStore();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {vidEntries.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">还没有添加任何视频模型</p>
      ) : (
        vidEntries.map((e) => (
          <div key={e.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border transition-colors",
              vidActiveId === e.id
                ? "border-orange-500/40 bg-orange-500/5"
                : "border-white/8 bg-white/3 hover:bg-white/5"
            )}
          >
            <button onClick={() => setVidActive(e.id)}
              className={cn(
                "w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors",
                vidActiveId === e.id ? "border-orange-500 bg-orange-500" : "border-gray-600 hover:border-gray-400"
              )}>
              {vidActiveId === e.id && <Check size={10} className="text-white m-auto" />}
            </button>

            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setVidActive(e.id)}>
              <p className="text-sm text-white truncate">
                {providerLabel(e.provider, VIDEO_PROVIDERS)}
              </p>
              <p className="text-xs text-gray-500 truncate">{maskKey(e.apiKey)}</p>
            </div>

            <button onClick={() => onEdit(e.id)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0">
              <Pencil size={13} />
            </button>
            {confirmDelete === e.id ? (
              <div className="flex gap-1">
                <button onClick={() => { deleteVidEntry(e.id); setConfirmDelete(null); }}
                  className="px-2 py-1 rounded text-xs bg-red-600 hover:bg-red-700 text-white transition-colors">删除</button>
                <button onClick={() => setConfirmDelete(null)}
                  className="px-2 py-1 rounded text-xs text-gray-400 hover:text-white transition-colors">取消</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(e.id)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))
      )}

      <button onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/15 text-sm text-gray-500 hover:text-gray-300 hover:border-white/30 transition-colors">
        <Plus size={14} />
        添加视频模型
      </button>
    </div>
  );
}

// ── Video edit form ───────────────────────────────────────────────────────────
function VidEditForm({ entryId, onBack }: { entryId: string | null; onBack: () => void }) {
  const { vidEntries, addVidEntry, updateVidEntry } = useApiKeyStore();
  const existing = entryId ? vidEntries.find((e) => e.id === entryId) : null;

  const [provider, setProvider] = useState<VideoProvider>(existing?.provider ?? "kling");
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? "");
  const [apiSecret, setApiSecret] = useState(existing?.apiSecret ?? "");
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? "");

  const handleSave = () => {
    const data = {
      provider,
      apiKey,
      apiSecret: apiSecret || undefined,
      baseUrl: baseUrl || undefined,
    };
    if (entryId) {
      updateVidEntry(entryId, data);
    } else {
      addVidEntry(data);
    }
    onBack();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs text-gray-400">Provider</label>
        <SelectField value={provider} options={VIDEO_PROVIDERS}
          onChange={(p) => { setProvider(p); setApiKey(""); setApiSecret(""); }} />
      </div>

      <KeyInput label="API Key" value={apiKey} onChange={setApiKey} />

      {provider === "kling" && (
        <KeyInput label="API Secret" value={apiSecret} onChange={setApiSecret} />
      )}

      {provider === "custom" && (
        <TextField label="Base URL" value={baseUrl} onChange={setBaseUrl}
          placeholder="https://api.example.com/v1" />
      )}

      <p className="text-xs text-gray-500">Key 仅存储在本地浏览器，不会上传到服务器。</p>

      <div className="flex gap-2 pt-1">
        <button onClick={onBack}
          className="flex-1 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
          取消
        </button>
        <button onClick={handleSave}
          className="flex-1 py-2 rounded-lg text-sm bg-orange-600 hover:bg-orange-700 text-white transition-colors">
          保存
        </button>
      </div>
    </div>
  );
}

// ── Image list view ───────────────────────────────────────────────────────────
function ImgList({ onAdd, onEdit }: { onAdd: () => void; onEdit: (id: string) => void }) {
  const { imgEntries, imgActiveId, setImgActive, deleteImgEntry } = useApiKeyStore();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {imgEntries.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">还没有添加图片模型，默认使用免费占位图</p>
      ) : (
        imgEntries.map((e) => (
          <div key={e.id} className={cn("flex items-center gap-3 p-3 rounded-xl border transition-colors",
            imgActiveId === e.id ? "border-orange-500/40 bg-orange-500/5" : "border-white/8 bg-white/3 hover:bg-white/5")}>
            <button onClick={() => setImgActive(e.id)} className={cn("w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors",
              imgActiveId === e.id ? "border-orange-500 bg-orange-500" : "border-gray-600 hover:border-gray-400")}>
              {imgActiveId === e.id && <Check size={10} className="text-white m-auto" />}
            </button>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setImgActive(e.id)}>
              <p className="text-sm text-white truncate">{IMAGE_PROVIDERS.find(p => p.value === e.provider)?.label ?? e.provider}</p>
              <p className="text-xs text-gray-500 truncate">{e.model || "默认模型"}</p>
            </div>
            <button onClick={() => onEdit(e.id)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"><Pencil size={13} /></button>
            {confirmDelete === e.id ? (
              <div className="flex gap-1">
                <button onClick={() => { deleteImgEntry(e.id); setConfirmDelete(null); }} className="px-2 py-1 rounded text-xs bg-red-600 hover:bg-red-700 text-white transition-colors">删除</button>
                <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 rounded text-xs text-gray-400 hover:text-white transition-colors">取消</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(e.id)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"><Trash2 size={13} /></button>
            )}
          </div>
        ))
      )}
      <button onClick={onAdd} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/15 text-sm text-gray-500 hover:text-gray-300 hover:border-white/30 transition-colors">
        <Plus size={14} />添加图片模型
      </button>
    </div>
  );
}

// ── Image edit form ───────────────────────────────────────────────────────────
function ImgEditForm({ entryId, onBack }: { entryId: string | null; onBack: () => void }) {
  const { imgEntries, addImgEntry, updateImgEntry } = useApiKeyStore();
  const existing = entryId ? imgEntries.find((e) => e.id === entryId) : null;
  const [provider, setProvider] = useState<ImageProvider>(existing?.provider ?? "mock");
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? "");
  const [model, setModel] = useState(existing?.model ?? "");
  const [baseUrl, setBaseUrl] = useState(existing?.baseUrl ?? "");

  const handleSave = () => {
    const data = { provider, apiKey, model, baseUrl: baseUrl || undefined };
    if (entryId) updateImgEntry(entryId, data); else addImgEntry(data);
    onBack();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs text-gray-400">Provider</label>
        <SelectField value={provider} options={IMAGE_PROVIDERS} onChange={(p) => { setProvider(p); setApiKey(""); setModel(""); }} />
      </div>
      {provider !== "mock" && <KeyInput label="API Key" value={apiKey} onChange={setApiKey} />}
      {provider === "openai" && (
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400">Model</label>
          <SelectField value={model || "dall-e-3"} options={[{value:"dall-e-3",label:"DALL-E 3"},{value:"dall-e-2",label:"DALL-E 2"}]} onChange={setModel} />
        </div>
      )}
      {provider === "custom" && (
        <>
          <TextField label="Base URL" value={baseUrl} onChange={setBaseUrl} placeholder="https://api.example.com/v1" />
          <TextField label="Model" value={model} onChange={setModel} placeholder="dall-e-3" />
        </>
      )}
      <p className="text-xs text-gray-500">Key 仅存储在本地浏览器，不会上传到服务器。</p>
      <div className="flex gap-2 pt-1">
        <button onClick={onBack} className="flex-1 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors">取消</button>
        <button onClick={handleSave} className="flex-1 py-2 rounded-lg text-sm bg-orange-600 hover:bg-orange-700 text-white transition-colors">保存</button>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export function ApiKeyDrawer({ open, defaultTab = "storyboard", onClose }: ApiKeyDrawerProps) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [view, setView] = useState<View>("list");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Reset to list view when modal opens
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) { setTab(defaultTab); setView("list"); setEditingId(null); }
  }

  if (!open) return null;

  const isEditing = view === "edit";

  const handleEdit = (id: string) => { setEditingId(id); setView("edit"); };
  const handleAdd = () => { setEditingId(null); setView("edit"); };
  const handleBack = () => { setView("list"); setEditingId(null); };

  const handleTabChange = (t: Tab) => { setTab(t); setView("list"); setEditingId(null); };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-96 bg-gray-950 border border-white/10 rounded-2xl flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
          {isEditing && (
            <button onClick={handleBack}
              className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors -ml-1">
              <ChevronLeft size={16} />
            </button>
          )}
          <span className="text-sm font-medium text-white flex-1">
            {isEditing ? (editingId ? "编辑模型" : "添加模型") : "模型管理"}
          </span>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {([
            { key: "storyboard", icon: <Brain size={13} />, label: "分镜" },
            { key: "video",      icon: <Video size={13} />, label: "视频" },
            { key: "image",      icon: <Image size={13} />, label: "图片" },
          ] as { key: Tab; icon: React.ReactNode; label: string }[]).map(({ key, icon, label }) => (
            <button key={key} onClick={() => handleTabChange(key)}
              className={cn("flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors",
                tab === key ? "text-orange-400 border-b-2 border-orange-500" : "text-gray-500 hover:text-gray-300")}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 max-h-[60vh]">
          {tab === "storyboard"
            ? isEditing ? <SbEditForm entryId={editingId} onBack={handleBack} /> : <SbList onAdd={handleAdd} onEdit={handleEdit} />
            : tab === "video"
              ? isEditing ? <VidEditForm entryId={editingId} onBack={handleBack} /> : <VidList onAdd={handleAdd} onEdit={handleEdit} />
              : isEditing ? <ImgEditForm entryId={editingId} onBack={handleBack} /> : <ImgList onAdd={handleAdd} onEdit={handleEdit} />
          }
        </div>

        {/* Footer — only on list view */}
        {!isEditing && (
          <div className="px-5 py-4 border-t border-white/10 flex justify-end">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm bg-orange-600 hover:bg-orange-700 text-white transition-colors">
              完成
            </button>
          </div>
        )}
      </div>
    </>
  );
}
