import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { FolderKanban, CheckSquare, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

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

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });

  if (isLoading) return <div className="p-8 text-gray-400">Loading dashboard…</div>;

  const stats = [
    { label: 'Projects', value: data?.totalProjects, icon: FolderKanban, color: 'text-brand-500 bg-brand-50' },
    { label: 'My Tasks', value: data?.totalTasks, icon: CheckSquare, color: 'text-green-500 bg-green-50' },
    { label: 'Overdue', value: data?.overdueTasks, icon: AlertTriangle, color: 'text-red-500 bg-red-50' },
    { label: 'In Progress', value: data?.byStatus?.IN_PROGRESS, icon: Clock, color: 'text-yellow-500 bg-yellow-50' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Good {getGreeting()}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 mt-1">Here's what's happening with your projects</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
            <p className="text-sm text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Task status</h2>
          <div className="space-y-3">
            {Object.entries(data?.byStatus || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`badge ${STATUS_COLORS[status]}`}>{status.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-brand-500 h-1.5 rounded-full"
                      style={{ width: `${data?.totalTasks ? (count / data.totalTasks) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-4 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent tasks */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Recent tasks</h2>
          {data?.recentTasks?.length === 0 ? (
            <p className="text-sm text-gray-400">No tasks assigned yet</p>
          ) : (
            <div className="space-y-3">
              {data?.recentTasks?.map((task) => (
                <Link key={task.id} to={`/projects/${task.project.id}`} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors -mx-3 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-brand-600">{task.title}</p>
                    <p className="text-xs text-gray-400">{task.project.name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
                    {task.dueDate && (
                      <span className="text-xs text-gray-400">
                        {format(new Date(task.dueDate), 'MMM d')}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
