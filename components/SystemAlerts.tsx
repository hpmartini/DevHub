import React from 'react';
import { AlertCircle, Activity, CheckCircle } from 'lucide-react';

export interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  actionLabel?: string;
  actionId?: string;
}

interface SystemAlertsProps {
  alerts?: Alert[];
  onAction?: (actionId: string, data?: Record<string, unknown>) => void;
}

const defaultAlerts: Alert[] = [
  {
    id: '1',
    type: 'info',
    title: 'Loading...',
    message: 'Checking system health...',
  },
];

const alertStyles = {
  warning: {
    container: 'bg-yellow-500/10 border-yellow-500/20',
    icon: AlertCircle,
    iconClass: 'text-yellow-500',
    titleClass: 'text-yellow-200',
    messageClass: 'text-yellow-500/70',
  },
  info: {
    container: 'bg-gray-700/30 border-gray-600/30',
    icon: Activity,
    iconClass: 'text-gray-400',
    titleClass: 'text-gray-300',
    messageClass: 'text-gray-500',
  },
  success: {
    container: 'bg-emerald-500/10 border-emerald-500/20',
    icon: CheckCircle,
    iconClass: 'text-emerald-500',
    titleClass: 'text-emerald-200',
    messageClass: 'text-emerald-500/70',
  },
  error: {
    container: 'bg-red-500/10 border-red-500/20',
    icon: AlertCircle,
    iconClass: 'text-red-500',
    titleClass: 'text-red-200',
    messageClass: 'text-red-500/70',
  },
};

export const SystemAlerts: React.FC<SystemAlertsProps> = ({ alerts = defaultAlerts, onAction }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-lg font-semibold text-gray-200 mb-4">System Alerts</h3>
      <div className="space-y-4">
        {alerts.map((alert) => {
          const style = alertStyles[alert.type];
          const Icon = style.icon;
          return (
            <div
              key={alert.id}
              className={`p-3 border rounded-lg flex gap-3 ${style.container}`}
            >
              <Icon className={`shrink-0 ${style.iconClass}`} size={20} />
              <div className="flex-1">
                <div className={`text-sm font-medium ${style.titleClass}`}>
                  {alert.title}
                </div>
                <div className={`text-xs mt-1 ${style.messageClass}`}>
                  {alert.message}
                </div>
                {alert.actionLabel && alert.actionId && alert.actionId !== 'no-action' && onAction && (
                  <button
                    onClick={() => onAction(alert.actionId!)}
                    className="mt-2 text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                  >
                    {alert.actionLabel}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
