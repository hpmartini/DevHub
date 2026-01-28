import { useState, useEffect, useCallback } from 'react';
import { fetchSystemHealth, updateNodeVersion, updateNpmVersion } from '../services/api';
import type { SystemHealthReport } from '../types';
import type { Alert } from '../components/SystemAlerts';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

export interface SystemHealthAlertAction {
  actionId: string;
  actionLabel: string;
  data?: Record<string, unknown>;
}

export type EnrichedAlert = Alert & SystemHealthAlertAction;

export function useSystemHealth(hasDockerProjects: boolean) {
  const [health, setHealth] = useState<SystemHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const report = await fetchSystemHealth();
      setHealth(report);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  // Transform health data into alerts
  const alerts: EnrichedAlert[] = [];

  if (health) {
    if (health.node.isOutdated) {
      alerts.push({
        id: 'node-outdated',
        type: 'warning',
        title: 'Node Update Available',
        message: `Current: v${health.node.current} → Latest LTS: v${health.node.latest} (managed by ${health.node.manager})`,
        actionId: 'update-node',
        actionLabel: health.node.manager === 'system' ? 'View Instructions' : 'Update Node',
        data: { version: health.node.latest, manager: health.node.manager },
      });
    }

    if (health.npm.isOutdated) {
      alerts.push({
        id: 'npm-outdated',
        type: 'warning',
        title: 'npm Update Available',
        message: `Current: v${health.npm.current} → Latest: v${health.npm.latest}`,
        actionId: 'update-npm',
        actionLabel: 'Update npm',
      });
    }

    if (!health.docker.available && hasDockerProjects) {
      alerts.push({
        id: 'docker-missing',
        type: 'error',
        title: 'Docker Not Available',
        message: 'Docker projects detected but Docker is not installed.',
        actionId: 'no-action',
        actionLabel: '',
      });
    } else if (health.docker.available && !health.docker.daemonRunning && hasDockerProjects) {
      alerts.push({
        id: 'docker-stopped',
        type: 'error',
        title: 'Docker Daemon Not Running',
        message: 'Docker is installed but the daemon is not running. Start Docker Desktop.',
        actionId: 'no-action',
        actionLabel: '',
      });
    }

    health.disk.forEach((d) => {
      if (d.isLow) {
        alerts.push({
          id: `disk-low-${d.path}`,
          type: 'warning',
          title: 'Low Disk Space',
          message: `${d.path}: ${d.availableGB} GB available`,
          actionId: 'no-action',
          actionLabel: '',
        });
      }
    });

    if (alerts.length === 0) {
      alerts.push({
        id: 'all-healthy',
        type: 'success',
        title: 'System Healthy',
        message: `Node v${health.node.current}, npm v${health.npm.current}, Git v${health.git.version || 'N/A'}${health.docker.available ? `, Docker v${health.docker.version}` : ''}`,
        actionId: 'no-action',
        actionLabel: '',
      });
    }
  }

  const handleAction = useCallback(async (actionId: string, data?: Record<string, unknown>) => {
    if (actionId === 'update-node' && data?.version) {
      const result = await updateNodeVersion(data.version as string);
      if (result.instructions) {
        alert(result.instructions);
      }
      refresh();
    } else if (actionId === 'update-npm') {
      await updateNpmVersion();
      refresh();
    }
  }, [refresh]);

  return {
    health,
    alerts,
    loading,
    error,
    refresh,
    handleAction,
  };
}
