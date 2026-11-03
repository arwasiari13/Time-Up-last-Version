// جسر محدود بين الواجهة وويندوز: إشعارات فقط
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  versions: { electron: process.versions.electron, chrome: process.versions.chrome },

  notify: (payload) => ipcRenderer.send('notify', payload),

  /** يُستدعى عند الضغط على إشعار — يعيد دالة لإلغاء الاشتراك */
  onOpenSubscriber: (callback) => {
    const handler = (_event, id) => callback(id);
    ipcRenderer.on('open-subscriber', handler);
    return () => ipcRenderer.removeListener('open-subscriber', handler);
  },
});
