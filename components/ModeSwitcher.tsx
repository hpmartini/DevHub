import React from 'react';
import { MessagesSquare, Workflow, Kanban, Code2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

export const MODES = [
  { path: '/agents', label: 'Agents', icon: MessagesSquare },
  { path: '/workflows', label: 'Workflows', icon: Workflow },
  { path: '/board', label: 'Board', icon: Kanban },
  { path: '/code', label: 'Code', icon: Code2 },
] as const;

/** Work modes of the active context (#184): the route is the state, one click switches */
export const ModeSwitcher: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <div
      role="group"
      aria-label="Mode"
      className="flex items-center rounded border border-gray-700 bg-gray-950 p-0.5 shrink-0"
    >
      {MODES.map(({ path, label, icon: Icon }) => {
        const active = pathname === path;
        return (
          <button
            key={path}
            onClick={() => !active && navigate(path)}
            aria-pressed={active}
            aria-label={label}
            title={label}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cursor ${
              active ? 'bg-sel text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Icon size={13} aria-hidden />
            <span className="hidden lg:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
};
