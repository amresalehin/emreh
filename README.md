<div align="center">
  <img width="80" height="80" alt="Emreh Logo" src="./public/app-icon.svg" />
  <h1>Emreh (همراه)</h1>
  <p><strong>Personal Life Companion & Dynamic Timeline</strong></p>
  <p>A private, client-side life dashboard integrating daily timelines, journals, bookmarks, places, and memories.</p>
</div>

---

## 🚀 Live Demo on GitHub Pages

The application is deployed to GitHub Pages at:
```
https://<username>.github.io/<repository>/
```

---

## ⚙️ GitHub Pages Setup Instructions

### 1. Enable GitHub Actions for GitHub Pages
GitHub Pages must be configured to deploy from **GitHub Actions** rather than a static branch. Follow these steps:

1. Open your repository on GitHub.
2. Click **Settings** (top navigation tab of your repository).
3. In the left sidebar under the **Code and automation** section, click **Pages**.
4. Under **Build and deployment**:
   - Change **Source** from *"Deploy from a branch"* to **"GitHub Actions"**.
5. Save changes (if prompted).

### 2. Automatic CI/CD Deployment
The repository includes an automated workflow at [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml). Whenever you push to `main` or `master`:
- It checks out the code and sets up Node.js 20.
- Runs `npm ci` (or `npm install`).
- Automatically injects the repository subpath base URL via `GITHUB_REPOSITORY` (e.g., `/${repo}/`).
- Executes `npm run build` to compile the optimized production bundle to `dist/`.
- Generates a `404.html` fallback for client-side SPA routing.
- Uploads the production `dist/` artifact and deploys it live via official GitHub Actions (`actions/deploy-pages@v4`).

> **Note:** The deployment serves the compiled bundle (`dist/index.html` and `dist/assets/*`). Source files like `/src/main.tsx` are never served on GitHub Pages.

---

## 💻 Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or yarn

### Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/<username>/<repository>.git
   cd <repository>
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables** (Optional for AI features):
   ```bash
   cp .env.example .env.local
   ```
   Add your `GEMINI_API_KEY` if you plan to use AI timeline summarization.

4. **Start the local development server**:
   ```bash
   npm run dev
   ```
   The app will run locally at `http://localhost:3000`.

5. **Test the production build locally**:
   ```bash
   npm run build
   npm run start
   # Or preview client build:
   npx vite preview
   ```

---

## 🛠️ Tech Stack & Architecture
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion
- **Build System**: Vite 6 with dynamic repository-aware base path resolution
- **Persistence**: 100% Client-Side with IndexedDB & LocalStorage
- **CI/CD**: GitHub Actions with GitHub Pages Artifact Deployment
