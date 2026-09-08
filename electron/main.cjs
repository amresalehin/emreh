const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');

const PORT = 3000;

function waitForServer(url, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });

      req.on('error', retry);
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - started > timeout) {
        reject(new Error(`Emreh server did not start within ${timeout}ms.`));
        return;
      }
      setTimeout(check, 200);
    };

    check();
  });
}

async function startLocalServer() {
  const serverFile = path.join(__dirname, '..', 'dist', 'server.cjs');

  process.env.NODE_ENV = 'production';
  process.env.EMREH_DIST_PATH = path.join(__dirname, '..', 'dist');

  // server.cjs starts the Express API and static frontend server.
  require(serverFile);
  await waitForServer(`http://127.0.0.1:${PORT}/api/health`);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#0d0e10',
    autoHideMenuBar: true,
    title: 'Emreh',
    icon: path.join(__dirname, '..', 'public', 'favicon.svg'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  win.loadURL(`http://127.0.0.1:${PORT}/`);

  return win;
}

app.whenReady().then(async () => {
  try {
    await startLocalServer();
    createWindow();
  } catch (error) {
    console.error('[Emreh] Failed to start:', error);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
