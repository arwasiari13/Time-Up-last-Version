/**
 * مشغّل Electron.
 * بعض الطرفيات (مثل VS Code) تضبط ELECTRON_RUN_AS_NODE=1،
 * فيعمل Electron كـ Node عادي ولا تفتح أي نافذة — نحذف المتغيّر قبل التشغيل.
 */
const { spawn } = require('child_process');
const path = require('path');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

// بدون --prod نحمّل خادم Vite أثناء التطوير
if (!process.argv.includes('--prod')) {
  env.VITE_DEV_SERVER = env.VITE_DEV_SERVER || 'http://localhost:5190';
}

const child = spawn(electronPath, [path.join(__dirname, 'main.cjs')], { stdio: 'inherit', env });
child.on('close', (code) => process.exit(code ?? 0));
