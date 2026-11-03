// العملية الرئيسية لـ Electron: تفتح النافذة وتعرض إشعارات ويندوز
const { app, BrowserWindow, ipcMain, Notification, shell } = require('electron');
const path = require('path');

// يضبطه مشغّل التطوير (electron/dev.cjs)؛ بدونه نفتح الملفات المبنية
const DEV_SERVER = process.env.VITE_DEV_SERVER;

// ضروري حتى يظهر اسم التطبيق وأيقونته في إشعارات ويندوز
const APP_ID = 'com.timeup.desktop';
// ويندوز يعرض ملف .ico بوضوح أكبر في شريط المهام
const ICON = path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png');
const NOTIFICATION_ICON = path.join(__dirname, 'icon.png');

let mainWindow = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#061F41',
    show: false,
    title: 'TIME UP',
    icon: ICON,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // نعرض النافذة بأكثر من طريقة: بعض الأجهزة لا تُطلق ready-to-show
  const reveal = (reason) => {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isVisible()) return;
    mainWindow.show();
    mainWindow.focus();
    console.log('[window] shown via', reason);
  };
  mainWindow.once('ready-to-show', () => reveal('ready-to-show'));
  mainWindow.webContents.once('did-finish-load', () => reveal('did-finish-load'));
  setTimeout(() => reveal('timeout'), 3000);

  mainWindow.webContents.on('did-fail-load', (_event, code, description) => {
    console.log('[window] load failed:', code, description);
  });

  // الروابط الخارجية تُفتح في المتصفح وليس داخل التطبيق
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (DEV_SERVER) {
    // خادم Vite قد لا يكون جاهزاً بعد — نعيد المحاولة حتى يعمل
    const load = () => {
      mainWindow.loadURL(DEV_SERVER).catch(() => setTimeout(load, 600));
    };
    load();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
};

/** إشعار ويندوز — الضغط عليه يفتح المشترك في التطبيق */
ipcMain.on('notify', (_event, payload) => {
  if (!Notification.isSupported()) return;

  const notification = new Notification({
    title: payload?.title || 'TIME UP',
    body: payload?.body || '',
    icon: NOTIFICATION_ICON,
  });

  notification.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('open-subscriber', payload?.id || null);
  });

  notification.show();
});

app.whenReady().then(() => {
  app.setAppUserModelId(APP_ID);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
