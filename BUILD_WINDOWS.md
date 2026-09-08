# Emreh Windows build

This project is configured as a desktop Electron app.

## Local Windows build

Install Node.js 22+, then from the project folder run:

```powershell
npm install
npm run lint
npm run dist:win
```

The installer is written to `release/Emreh-Setup-1.0.0.exe`.

## GitHub Actions

The repository includes `.github/workflows/build-windows.yml`. Run it from the Actions tab with **Build Emreh for Windows**. It installs dependencies, type-checks the project, builds the Vite/Express app, and produces the Windows x64 NSIS installer as a downloadable workflow artifact.
