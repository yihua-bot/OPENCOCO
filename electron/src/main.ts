import { app, BrowserWindow, shell, dialog, ipcMain, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import { spawn, ChildProcess } from 'child_process';
import { findFreePort } from './portFinder';
import { autoUpdater } from 'electron-updater';

const Store = require('electron-store');

autoUpdater.logger = console;
autoUpdater.autoDownload = false;

let mainWindow: BrowserWindow | null = null;
let updateCheckInterval: NodeJS.Timeout | null = null;
let backendProcess: ChildProcess | null = null;
let frontendProcess: ChildProcess | null = null;
let autoUpdateEnabled = false;

const isDev = !app.isPackaged;

if (isDev) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
  });
}

const store = new Store({
  name: 'coco-settings',
  defaults: {
    dataPath: '',
    locale: 'en',
  },
});

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key) result[key] = value;
  }
  return result;
}

function loadRuntimeEnv(): Record<string, string> {
  const candidates = isDev
    ? [path.join(__dirname, '..', '..', 'backend', '.env')]
    : [
        path.join(app.getPath('userData'), 'backend.env'),
        path.join(process.resourcesPath, 'backend.env'),
      ];

  for (const envPath of candidates) {
    try {
      if (fs.existsSync(envPath)) {
        return parseEnvFile(fs.readFileSync(envPath, 'utf8'));
      }
    } catch (err) {
      console.warn(`[env] failed to load ${envPath}:`, err);
    }
  }
  return {};
}

function getReleaseConfig(): { owner: string; repo: string } {
  const runtimeEnv = loadRuntimeEnv();
  return {
    owner: (process.env.GITHUB_RELEASE_OWNER || runtimeEnv.GITHUB_RELEASE_OWNER || '').trim(),
    repo: (process.env.GITHUB_RELEASE_REPO || runtimeEnv.GITHUB_RELEASE_REPO || '').trim(),
  };
}

function configureAutoUpdater(): boolean {
  const release = getReleaseConfig();
  if (!release.owner || !release.repo) {
    console.log('[updater] GitHub release feed is not configured');
    return false;
  }

  autoUpdater.setFeedURL(`https://github.com/${release.owner}/${release.repo}/releases/latest/download`);
  console.log(`[updater] Using GitHub releases feed ${release.owner}/${release.repo}`);
  return true;
}

function getResourcesPath(): string {
  return isDev
    ? path.join(__dirname, '..', 'resources')
    : process.resourcesPath;
}

function getBackendBinary(): string {
  const bin = process.platform === 'win32' ? 'coco-backend.exe' : 'coco-backend';
  return path.join(getResourcesPath(), 'coco-backend', bin);
}

function getBackendDevPython(backendDir: string): string {
  const venvPython = path.join(
    backendDir,
    '.venv',
    'Scripts',
    process.platform === 'win32' ? 'python.exe' : 'python'
  );
  const unixVenvPython = path.join(backendDir, '.venv', 'bin', 'python');
  if (fs.existsSync(venvPython)) return venvPython;
  if (fs.existsSync(unixVenvPython)) return unixVenvPython;
  return process.platform === 'win32' ? 'python' : 'python3';
}

function getBackendLaunch(): { command: string; args: string[]; cwd?: string } {
  if (isDev) {
    const backendDir = path.join(__dirname, '..', '..', 'backend');
    const python = getBackendDevPython(backendDir);
    return {
      command: python,
      args: [path.join(backendDir, 'main.py')],
      cwd: backendDir,
    };
  }

  return {
    command: getBackendBinary(),
    args: [],
  };
}

function getFrontendPath(): string {
  return isDev
    ? path.join(__dirname, '..', '..', 'frontend', '.next', 'standalone')
    : path.join(process.resourcesPath, 'frontend');
}

function syncStandaloneStaticAssets(frontendPath: string): void {
  if (!isDev) return;
  const sourceStaticPath = path.join(frontendPath, '..', 'static');
  const targetStaticPath = path.join(frontendPath, '.next', 'static');
  if (!fs.existsSync(sourceStaticPath)) {
    console.warn(`[frontend] static assets not found at ${sourceStaticPath}`);
    return;
  }

  try {
    fs.rmSync(targetStaticPath, { recursive: true, force: true });
    fs.cpSync(sourceStaticPath, targetStaticPath, { recursive: true });
  } catch (err) {
    console.error('[frontend] failed to sync static assets:', err);
  }
}

function getNodeBin(): string {
  if (isDev) return 'node';
  const bin = process.platform === 'win32' ? 'node.exe' : 'node';
  return path.join(getResourcesPath(), bin);
}

function getDataPath(): string {
  const customPath = store.get('dataPath') as string;
  return customPath || app.getPath('userData');
}

async function startBackend(port: number): Promise<void> {
  const dataPath = getDataPath();
  const dbPath = path.join(dataPath, 'coco.db');
  const uploadsPath = path.join(dataPath, 'uploads');
  const runtimeEnv = loadRuntimeEnv();
  const cloudAuthUrl = process.env.CLOUD_AUTH_URL || runtimeEnv.CLOUD_AUTH_URL || '';
  const appEnvironment = process.env.ENVIRONMENT || runtimeEnv.ENVIRONMENT || (isDev ? 'development' : 'production');
  fs.mkdirSync(uploadsPath, { recursive: true });
  const launch = getBackendLaunch();
  if (!isDev && process.platform !== 'win32') {
    try { fs.chmodSync(launch.command, 0o755); } catch (_) { }
  }

  backendProcess = spawn(launch.command, launch.args, {
    env: {
      ...process.env,
      ...runtimeEnv,
      DATABASE_URL: `sqlite:///${dbPath}`,
      UPLOAD_DIR: uploadsPath,
      SECRET_KEY: 'coco-desktop-secret',
      PORT: String(port),
      HOST: '127.0.0.1',
      ENVIRONMENT: appEnvironment,
      CLOUD_AUTH_URL: cloudAuthUrl,
      POLAR_ACCESS_TOKEN: process.env.POLAR_ACCESS_TOKEN || runtimeEnv.POLAR_ACCESS_TOKEN || '',
      POLAR_PRODUCT_ID: process.env.POLAR_PRODUCT_ID || runtimeEnv.POLAR_PRODUCT_ID || '',
      POLAR_API_BASE: process.env.POLAR_API_BASE || runtimeEnv.POLAR_API_BASE || '',
      POLAR_CHECKOUT_URL: process.env.POLAR_CHECKOUT_URL || runtimeEnv.POLAR_CHECKOUT_URL || '',
    },
    cwd: launch.cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  backendProcess.stdout?.on('data', (d: Buffer) => console.log('[backend]', d.toString().trim()));
  backendProcess.stderr?.on('data', (d: Buffer) => console.error('[backend]', d.toString().trim()));
  backendProcess.on('exit', (code: number | null) => console.log('[backend] exited', code));

  await waitForPort(port, 30_000);
  console.log(`[backend] ready on port ${port}`);
  console.log(`[backend] data path: ${dataPath}`);
}

async function startFrontend(backendPort: number, frontendPort: number): Promise<void> {
  const frontendPath = getFrontendPath();
  const serverScript = path.join(frontendPath, 'server.js');
  const nodeBin = getNodeBin();
  syncStandaloneStaticAssets(frontendPath);

  frontendProcess = spawn(nodeBin, [serverScript], {
    env: {
      ...process.env,
      PORT: String(frontendPort),
      HOSTNAME: '127.0.0.1',
      NEXT_PUBLIC_API_URL: `http://127.0.0.1:${backendPort}`,
    },
    cwd: frontendPath,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  frontendProcess.stdout?.on('data', (d: Buffer) => console.log('[frontend]', d.toString().trim()));
  frontendProcess.stderr?.on('data', (d: Buffer) => console.error('[frontend]', d.toString().trim()));
  frontendProcess.on('exit', (code: number | null) => console.log('[frontend] exited', code));

  await waitForPort(frontendPort, 30_000);
  console.log(`[frontend] ready on port ${frontendPort}`);
}

function waitForPort(port: number, timeout: number): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const socket = new net.Socket();
      socket.setTimeout(200);
      socket.on('connect', () => { socket.destroy(); resolve(); });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - start > timeout) {
          reject(new Error(`Port ${port} not ready after ${timeout}ms`));
        } else {
          setTimeout(check, 300);
        }
      });
      socket.on('timeout', () => { socket.destroy(); setTimeout(check, 300); });
      socket.connect(port, '127.0.0.1');
    };
    check();
  });
}

function createWindow(frontendPort: number, backendPort: number): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.webContents.on('dom-ready', () => {
    const runtimeEnv = loadRuntimeEnv();
    const appEnvironment = process.env.ENVIRONMENT || runtimeEnv.ENVIRONMENT || (isDev ? 'development' : 'production');
    const cloudAuthUrl = process.env.CLOUD_AUTH_URL || runtimeEnv.CLOUD_AUTH_URL || '';
    mainWindow?.webContents.executeJavaScript(`
      window.BACKEND_URL = 'http://127.0.0.1:${backendPort}';
      window.APP_ENVIRONMENT = '${appEnvironment}';
      window.CLOUD_AUTH_URL = '${cloudAuthUrl}';
    `).catch(console.error);
  });

  mainWindow.loadURL(`http://127.0.0.1:${frontendPort}`);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error(`[window] did-fail-load: ${code} ${desc}`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('close', (e) => {
    if (process.platform === 'darwin' && !isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function showMainWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

ipcMain.handle('get-data-path', () => {
  return {
    current: getDataPath(),
    default: app.getPath('userData'),
  };
});

ipcMain.handle('select-data-path', async () => {
  if (!mainWindow) return { success: false, error: 'No window' };
  
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Data Storage Location',
    message: 'Choose where to store your projects and database',
  });
  
  if (result.canceled) return { success: false, canceled: true };
  
  const selectedPath = result.filePaths[0];
  store.set('dataPath', selectedPath);
  
  return { success: true, path: selectedPath };
});

ipcMain.handle('reset-data-path', () => {
  store.set('dataPath', '');
  return { success: true, path: app.getPath('userData') };
});

ipcMain.handle('get-locale', () => {
  return store.get('locale') || 'en';
});

ipcMain.on('get-locale-sync', (event) => {
  event.returnValue = store.get('locale') || 'en';
});

ipcMain.handle('set-locale', (_event, locale: string) => {
  store.set('locale', locale);
  return { success: true };
});

ipcMain.handle('check-for-updates', async () => {
  if (isDev) return { available: false, version: null, error: 'Development mode' };
  if (!autoUpdateEnabled) {
    return { available: false, version: null, error: 'Auto update is not configured' };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      available: result?.updateInfo?.version !== app.getVersion(),
      version: result?.updateInfo?.version,
      currentVersion: app.getVersion(),
    };
  } catch (error) {
    console.error('Check for updates failed:', error);
    return { available: false, error: String(error) };
  }
});

ipcMain.handle('download-update', async () => {
  if (isDev) return { success: false, error: 'Development mode' };
  if (!autoUpdateEnabled) return { success: false, error: 'Auto update is not configured' };
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error('Download update failed:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('quit-and-install', () => {
  if (!autoUpdateEnabled) return;
  autoUpdater.quitAndInstall();
});

autoUpdater.on('checking-for-update', () => {
  console.log('[updater] Checking for update...');
  mainWindow?.webContents.send('update-message', { type: 'checking' });
});

autoUpdater.on('update-available', (info) => {
  console.log('[updater] Update available:', info.version);
  mainWindow?.webContents.send('update-message', { 
    type: 'available', 
    version: info.version,
    currentVersion: app.getVersion(),
  });
});

autoUpdater.on('update-not-available', () => {
  console.log('[updater] No update available');
  mainWindow?.webContents.send('update-message', { type: 'not-available' });
});

autoUpdater.on('error', (err) => {
  console.error('[updater] Error:', err);
  mainWindow?.webContents.send('update-message', { type: 'error', error: err.message });
});

autoUpdater.on('download-progress', (progress) => {
  console.log(`[updater] Download progress: ${progress.percent}%`);
  mainWindow?.webContents.send('update-message', { 
    type: 'progress', 
    percent: progress.percent,
  });
});

autoUpdater.on('update-downloaded', () => {
  console.log('[updater] Update downloaded');
  mainWindow?.webContents.send('update-message', { type: 'downloaded' });
});

app.whenReady().then(async () => {
  try {
    autoUpdateEnabled = !isDev && configureAutoUpdater();
    console.log(`[app] data path: ${getDataPath()}`);
    const backendPort = await findFreePort(18800);
    const frontendPort = await findFreePort(13800);
    await startBackend(backendPort);
    await startFrontend(backendPort, frontendPort);
    createWindow(frontendPort, backendPort);

    if (autoUpdateEnabled) {
      setTimeout(() => {
        console.log('[updater] Auto-checking for updates...');
        autoUpdater.checkForUpdates().catch(console.error);
      }, 5000);

      // 每小时检查一次更新
      updateCheckInterval = setInterval(() => {
        console.log('[updater] Periodic update check...');
        autoUpdater.checkForUpdates().catch(console.error);
      }, 60 * 60 * 1000);
    }
  } catch (err) {
    console.error('Startup failed:', err);
    const { dialog } = require('electron');
    dialog.showErrorBox('CoCo startup error', String(err));
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  showMainWindow();
});

let isQuitting = false;

app.on('before-quit', () => {
  isQuitting = true;
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
  }
  backendProcess?.kill('SIGTERM');
  frontendProcess?.kill('SIGTERM');
});

app.on('will-quit', () => {
  backendProcess?.kill('SIGTERM');
  frontendProcess?.kill('SIGTERM');
});

function quitApp() {
  isQuitting = true;
  mainWindow?.destroy();
  backendProcess?.kill('SIGTERM');
  frontendProcess?.kill('SIGTERM');
  app.quit();
}

if (process.platform === 'darwin') {
  app.dock.setMenu(Menu.buildFromTemplate([
    {
      label: '退出 CoCo',
      click: () => {
        quitApp();
      }
    }
  ]));
}
