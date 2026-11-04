/**
 * Application configuration constants
 * Shared between Electron and the main application
 */

/** Application name used throughout the app */
export const APP_NAME = 'Orkumo';

/**
 * userData folder name from before the rename to Orkumo (issue #196). Electron derives userData from the
 * app name, so without pinning existing installs would start with empty data. Packaged builds used
 * electron-builder's productName, dev runs the package.json name.
 */
export const legacyUserDataDir = (isPackaged) =>
  isPackaged ? 'DevOrbitDashboard' : 'devorbit-dashboard';
