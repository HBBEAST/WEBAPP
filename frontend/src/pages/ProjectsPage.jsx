import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProjects, createProject } from '../lib/api';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProjectsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const qc = useQueryClient();

  const { data: projects, isLoading } = useQuery({ queryKey: ['projects'], queryFn: getProjects });

  const createMut = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setShowCreate(false);
      setForm({ name: '', description: '' });
      toast.success('Project created!');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    createMut.mutate(form);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-0.5">Manage your projects and teams</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> New project
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My awesome project" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea className="input resize-none" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What's this project about?" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={createMut.isPending}>
                  {createMut.isPending ? 'Creating…' : 'Create project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projects list */}
      {isLoading ? (
        <p className="text-gray-400">Loading…</p>
      ) : projects?.length === 0 ? (
        <div className="text-center py-16">
          <FolderKanban size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No projects yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first project to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="card p-5 flex items-center gap-4 hover:border-brand-200 hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                <FolderKanban size={20} className="text-brand-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 group-hover:text-brand-600 transition-colors">{project.name}</p>
                {project.description && <p className="text-sm text-gray-400 truncate">{project.description}</p>}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-gray-400">{project.members.length} member{project.members.length !== 1 ? 's' : ''}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{project._count.tasks} task{project._count.tasks !== 1 ? 's' : ''}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs font-medium text-brand-500">
                    {project.members.find((m) => m.userId === project.createdById)?.role === 'ADMIN' ? 'You are admin' : 'Member'}
                  </span>
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-300 group-hover:text-brand-400 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
