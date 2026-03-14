const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("coco_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  // Auth
  register: (email: string, password: string, name: string) =>
    request<{ access_token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>("/api/auth/me"),

  // Projects
  listProjects: () => request<Project[]>("/api/projects"),
  createProject: (data: { title?: string; template_id?: string }) =>
    request<Project>("/api/projects", { method: "POST", body: JSON.stringify(data) }),
  getProject: (id: string) => request<Project>(`/api/projects/${id}`),
  updateProject: (id: string, data: Partial<Project>) =>
    request<Project>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProject: (id: string) =>
    request(`/api/projects/${id}`, { method: "DELETE" }),

  // Project context (记忆)
  getContext: (projectId: string) =>
    request<{ context_md: string }>(`/api/projects/${projectId}/context`),
  updateContext: (projectId: string, context_md: string) =>
    request<{ ok: boolean }>(`/api/projects/${projectId}/context`, {
      method: "PUT",
      body: JSON.stringify({ context_md }),
    }),

  // Edit log (创作日志)
  getEditLog: (projectId: string) =>
    request<{ edit_log: { timestamp: string; op: string; desc: string; command: string }[] }>(
      `/api/projects/${projectId}/edit-log`
    ),

  // Style packs
  listStylePacks: () =>
    request<{ id: string; name: string; description: string; icon: string }[]>("/api/style-packs"),

  // Shot preview images
  generateShotPreview: (
    projectId: string, storyboardId: string, shotId: string,
    imgConfig: { provider: string; api_key: string; model: string; base_url?: string },
  ) =>
    request<{ preview_image_url: string }>(
      `/api/projects/${projectId}/storyboards/${storyboardId}/shots/${shotId}/preview`,
      { method: "POST", body: JSON.stringify(imgConfig) },
    ),
  generateAllPreviews: (
    projectId: string, storyboardId: string,
    imgConfig: { provider: string; api_key: string; model: string; base_url?: string },
  ) =>
    request<{ results: { shot_id: string; preview_image_url?: string; error?: string }[] }>(
      `/api/projects/${projectId}/storyboards/${storyboardId}/shots/preview-all`,
      { method: "POST", body: JSON.stringify(imgConfig) },
    ),

  // Messages
  listMessages: (projectId: string) =>
    request<Message[]>(`/api/projects/${projectId}/messages`),

  // Videos
  getVideo: (id: string) => request<Video>(`/api/videos/${id}`),

  // Templates
  listTemplates: () => request<Template[]>("/api/templates"),

  // Storyboards
  getStoryboard: (projectId: string, storyboardId: string) =>
    request<Storyboard>(`/api/projects/${projectId}/storyboards/${storyboardId}`),
  updateShot: (projectId: string, storyboardId: string, shotId: string, data: Partial<Shot>) =>
    request<Shot>(`/api/projects/${projectId}/storyboards/${storyboardId}/shots/${shotId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  generateShots: (projectId: string, storyboardId: string) =>
    request<{ ok: boolean; shot_count: number }>(
      `/api/projects/${projectId}/storyboards/${storyboardId}/generate`,
      { method: "POST" }
    ),
  composeVideo: (projectId: string, storyboardId: string) =>
    request<{ ok: boolean }>(
      `/api/projects/${projectId}/storyboards/${storyboardId}/compose`,
      { method: "POST" }
    ),

  // Timeline LLM edit
  timelineEdit: (
    command: string,
    clips: { id: string; index: number; script: string; duration: number; transition: string }[],
    llmConfig?: { provider: string; api_key: string; model: string; base_url?: string },
    projectId?: string,
  ) =>
    request<{ op: string; desc: string; params: Record<string, unknown> }>("/api/timeline/edit", {
      method: "POST",
      body: JSON.stringify({ command, clips, llm_config: llmConfig, project_id: projectId }),
    }),

  // Streaming message
  streamMessage: (
    projectId: string,
    content: string,
    llmConfig?: { provider: string; api_key: string; model: string; base_url?: string; fallbacks?: { provider: string; api_key: string; model: string; base_url?: string }[] },
    videoConfig?: { provider: string; api_key: string; api_secret?: string; base_url?: string },
    stylePackId?: string,
    storyboardId?: string,
  ) => {
    const token = getToken();
    return fetch(`${API_BASE}/api/projects/${projectId}/messages/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        content,
        llm_config: llmConfig,
        video_config: videoConfig,
        style_pack_id: stylePackId ?? "default",
        storyboard_id: storyboardId,
      }),
    });
  },
};

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  plan: "free" | "pro" | "business";
  credits: number;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  thumbnail_url: string;
  status: "idle" | "generating" | "done" | "failed";
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  video_id: string | null;
}

export interface Video {
  id: string;
  project_id: string;
  url: string;
  thumbnail_url: string;
  duration: number;
  status: "pending" | "processing" | "done" | "failed";
  meta: Record<string, unknown>;
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  preview_url: string;
  prompt_template: string;
}

export interface Shot {
  id: string;
  storyboard_id: string;
  order: number;
  description: string;
  script: string;
  duration: number;
  status: "pending" | "processing" | "done" | "failed";
  video_id: string | null;
  video: Video | null;
  preview_image_url: string | null;
  created_at: string;
}

export interface Storyboard {
  id: string;
  project_id: string;
  prompt: string;
  title: string;
  final_video_id: string | null;
  shots: Shot[];
  created_at: string;
}
