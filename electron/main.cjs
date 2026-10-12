// 증액저축 계산기 — Electron 메인 프로세스. 작은 창 하나에 dist/index.html 을 띄운다.
const path = require('node:path')
const { app, BrowserWindow, Menu, screen } = require('electron')

function createWindow() {
    // 노트북처럼 작업 영역이 낮으면 창 높이를 거기에 맞춘다.
    const workHeight = screen.getPrimaryDisplay().workAreaSize.height - 40
    const win = new BrowserWindow({
        width: 460,
        height: Math.min(820, workHeight),
        minWidth: 400,
        minHeight: Math.min(640, workHeight),
        title: '증액저축 계산기',
        backgroundColor: '#f6f2ea',
        show: false,
        webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
    })
    win.once('ready-to-show', () => win.show())
    // 앱 안에서 새 창을 열지 않는다.
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

Menu.setApplicationMenu(null)

// 두 번 실행하면 저장소(Local Storage)를 두 프로세스가 나눠 쓰게 되므로, 하나만 띄우고 기존 창을 앞으로 가져온다.
if (!app.requestSingleInstanceLock()) {
    app.quit()
} else {
    app.on('second-instance', () => {
        const win = BrowserWindow.getAllWindows()[0]
        if (win === undefined) return
        if (win.isMinimized()) win.restore()
        win.focus()
    })
    app.whenReady().then(createWindow)
    app.on('window-all-closed', () => app.quit())
}
