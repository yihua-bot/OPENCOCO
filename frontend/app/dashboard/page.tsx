"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, Project, Template } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { TemplateGrid } from "@/components/templates/TemplateGrid";
import { Plus, Search, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/Input";

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, fetchMe } = useAuthStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token) { router.push("/login"); return; }
    fetchMe();
    loadProjects();
    api.listTemplates().then(setTemplates).catch(console.error);
  }, [token]);

  const loadProjects = async () => {
    try {
      const data = await api.listProjects();
      setProjects(data);
    } catch { router.push("/login"); }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const project = await api.createProject({
        title: newTitle || selectedTemplate?.name || "Untitled Project",
        template_id: selectedTemplate?.id,
      });
      router.push(`/project/${project.id}`);
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this project?")) return;
    await api.deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const filtered = projects.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0c0a08]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">My Projects</h1>
            <p className="text-gray-500 text-sm mt-1">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={() => setShowNewModal(true)}>
            <Plus size={16} /> New project
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Projects grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-4xl mb-4">🎬</div>
            <p className="text-gray-400 mb-4">No projects yet</p>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus size={16} /> Create your first video
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((project) => (
              <Link key={project.id} href={`/project/${project.id}`}>
                <div className="group rounded-xl border border-white/10 bg-white/5 hover:border-orange-500/20 hover:bg-orange-500/20 transition-all overflow-hidden cursor-pointer">
                  {/* Thumbnail */}
                  <div className="aspect-video bg-gradient-to-br from-orange-900/30 to-amber-900/30 relative">
                    {project.thumbnail_url ? (
                      <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-30">🎬</div>
                    )}
                    <div className="absolute top-2 right-2">
                      <StatusBadge status={project.status} />
                    </div>
                    <button
                      onClick={(e) => handleDelete(project.id, e)}
                      className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/60 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-white truncate">{project.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(project.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#161210] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">New Project</h2>
              <button onClick={() => setShowNewModal(false)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Project title (optional)</label>
                <Input
                  placeholder="My awesome video"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-3 block">Choose a template</label>
                <TemplateGrid
                  templates={templates}
                  selectedId={selectedTemplate?.id}
                  onSelect={(t) => setSelectedTemplate(selectedTemplate?.id === t.id ? null : t)}
                />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-white/10">
              <Button variant="outline" onClick={() => setShowNewModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating} className="flex-1">
                {creating ? "Creating..." : "Create project"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
