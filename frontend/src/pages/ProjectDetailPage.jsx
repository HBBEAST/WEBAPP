import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProject, createTask, updateTask, deleteTask, addMember, removeMember, deleteProject } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Plus, Trash2, UserPlus, UserMinus, ArrowLeft, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const STATUS_COLORS = {
  TODO: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  REVIEW: 'bg-yellow-100 text-yellow-700',
  DONE: 'bg-green-100 text-green-700',
};
const PRIORITY_COLORS = {
  LOW: 'bg-gray-50 text-gray-500',
  MEDIUM: 'bg-blue-50 text-blue-600',
  HIGH: 'bg-orange-50 text-orange-600',
  URGENT: 'bg-red-50 text-red-600',
};

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showTask, setShowTask] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'MEDIUM', status: 'TODO', assigneeId: '', dueDate: '' });
  const [inviteEmail, setInviteEmail] = useState('');
  const [activeTab, setActiveTab] = useState('tasks');
  const [filterStatus, setFilterStatus] = useState('');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => getProject(projectId),
  });

  const myRole = project?.members?.find((m) => m.userId === user?.id)?.role;
  const isAdmin = myRole === 'ADMIN';

  const createTaskMut = useMutation({
    mutationFn: (data) => createTask({ ...data, projectId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', projectId] }); setShowTask(false); setTaskForm({ title: '', description: '', priority: 'MEDIUM', status: 'TODO', assigneeId: '', dueDate: '' }); toast.success('Task created!'); },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const updateTaskMut = useMutation({
    mutationFn: ({ id, data }) => updateTask(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', projectId] }); toast.success('Updated!'); },
    onError: () => toast.error('Update failed'),
  });

  const deleteTaskMut = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', projectId] }); toast.success('Task deleted'); },
  });

  const addMemberMut = useMutation({
    mutationFn: (email) => addMember(projectId, { email }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', projectId] }); setShowInvite(false); setInviteEmail(''); toast.success('Member added!'); },
    onError: (err) => toast.error(err.response?.data?.message || 'User not found'),
  });

  const removeMemberMut = useMutation({
    mutationFn: (userId) => removeMember(projectId, userId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', projectId] }); toast.success('Member removed'); },
  });

  const deleteProjectMut = useMutation({
    mutationFn: () => deleteProject(projectId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); navigate('/projects'); toast.success('Project deleted'); },
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading…</div>;
  if (!project) return <div className="p-8 text-gray-400">Project not found</div>;

  const tasks = (project.tasks || []).filter((t) => !filterStatus || t.status === filterStatus);

  const handleStatusChange = (task, status) => {
    updateTaskMut.mutate({ id: task.id, data: { status } });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate('/projects')} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4 transition-colors">
          <ArrowLeft size={16} /> Projects
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{project.name}</h1>
            {project.description && <p className="text-gray-500 mt-1">{project.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button onClick={() => setShowInvite(true)} className="btn-secondary flex items-center gap-2 text-sm">
                  <UserPlus size={16} /> Invite
                </button>
                <button onClick={() => { if (confirm('Delete this project?')) deleteProjectMut.mutate(); }} className="btn-danger flex items-center gap-2 text-sm">
                  <Trash2 size={16} /> Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        {['tasks', 'team'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tab} {tab === 'tasks' ? `(${project.tasks?.length || 0})` : `(${project.members?.length || 0})`}
          </button>
        ))}
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <select className="input w-auto text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All status</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <button onClick={() => setShowTask(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus size={16} /> Add task
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare size={36} className="mx-auto text-gray-200 mb-2" />
              <p className="text-gray-400 text-sm">No tasks yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="card p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium ${task.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {task.title}
                      </p>
                      <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                    </div>
                    {task.description && <p className="text-xs text-gray-400 mt-1 truncate">{task.description}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      {task.assignee && (
                        <span className="text-xs text-gray-400">→ {task.assignee.name}</span>
                      )}
                      {task.dueDate && (
                        <span className={`text-xs ${new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                          Due {format(new Date(task.dueDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task, e.target.value)}
                      className={`text-xs rounded-full px-2.5 py-1 border-0 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 ${STATUS_COLORS[task.status]}`}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                    {(isAdmin || task.createdById === user?.id) && (
                      <button onClick={() => { if (confirm('Delete task?')) deleteTaskMut.mutate(task.id); }} className="text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="space-y-2">
          {project.members?.map((member) => (
            <div key={member.id} className="card p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm flex-shrink-0">
                {member.user.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                <p className="text-xs text-gray-400">{member.user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${member.role === 'ADMIN' ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-600'}`}>
                  {member.role}
                </span>
                {isAdmin && member.userId !== user?.id && (
                  <button onClick={() => { if (confirm('Remove member?')) removeMemberMut.mutate(member.userId); }} className="text-gray-300 hover:text-red-400 transition-colors">
                    <UserMinus size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create task modal */}
      {showTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New task</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input className="input" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Task title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="input resize-none" rows={2} value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select className="input" value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                    {PRIORITY_OPTIONS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                  <select className="input" value={taskForm.assigneeId} onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}>
                    <option value="">Unassigned</option>
                    {project.members?.map((m) => <option key={m.userId} value={m.userId}>{m.user.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
                <input type="date" className="input" value={taskForm.dueDate} onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })} />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowTask(false)} className="btn-secondary">Cancel</button>
                <button onClick={() => createTaskMut.mutate(taskForm)} className="btn-primary" disabled={!taskForm.title || createTaskMut.isPending}>
                  {createTaskMut.isPending ? 'Creating…' : 'Create task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite member</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input className="input" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@example.com" />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowInvite(false)} className="btn-secondary">Cancel</button>
                <button onClick={() => addMemberMut.mutate(inviteEmail)} className="btn-primary" disabled={!inviteEmail || addMemberMut.isPending}>
                  {addMemberMut.isPending ? 'Inviting…' : 'Invite'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
