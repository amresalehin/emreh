import JSZip from 'jszip';
import { VirtualFile, FileTreeNode, ZipProject } from '../types';
import { getMimeType, isTextFile } from './mime';

/**
 * Normalizes a virtual file path (removes leading slashes, resolves .. and .)
 */
export function normalizePath(path: string): string {
  // Replace backslashes with forward slashes
  let clean = path.replace(/\\/g, '/');
  // Remove leading slashes
  clean = clean.replace(/^\/+/, '');
  
  const segments = clean.split('/');
  const resolved: string[] = [];
  
  for (const seg of segments) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      resolved.pop();
    } else {
      resolved.push(seg);
    }
  }
  
  return resolved.join('/');
}

/**
 * Resolves a relative path against a base file directory
 * e.g., basePath="pages/sub/index.html", relativePath="../styles/app.css" -> "pages/styles/app.css"
 */
export function resolveRelativePath(baseFilePath: string, relativePath: string): string {
  // If it's an absolute URL (http://, https://, data:, blob:), return as is
  if (/^(?:[a-z]+:)?\/\//i.test(relativePath) || relativePath.startsWith('data:') || relativePath.startsWith('blob:') || relativePath.startsWith('#')) {
    return relativePath;
  }
  
  // Clean query strings or hashes for path lookup
  const [cleanRelPath] = relativePath.split(/[?#]/);
  
  // Strip leading slash if treated as root
  if (cleanRelPath.startsWith('/')) {
    return normalizePath(cleanRelPath);
  }
  
  // Get directory of baseFilePath
  const baseDirSegments = baseFilePath.split('/');
  baseDirSegments.pop(); // remove file name
  
  const combined = baseDirSegments.length > 0 
    ? `${baseDirSegments.join('/')}/${cleanRelPath}`
    : cleanRelPath;
    
  return normalizePath(combined);
}

/**
 * Extracts a ZIP file and generates an in-memory Virtual File System
 */
export async function loadZipArchive(file: File | Blob, projectName?: string): Promise<ZipProject> {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);
  
  const rawEntries: { path: string; entry: JSZip.JSZipObject }[] = [];
  
  zipContent.forEach((relativePath, entry) => {
    // Ignore OS metadata and junk files
    if (
      relativePath.startsWith('__MACOSX/') ||
      relativePath.includes('/.DS_Store') ||
      relativePath.endsWith('.DS_Store') ||
      relativePath.startsWith('thumbs.db')
    ) {
      return;
    }
    rawEntries.push({ path: relativePath, entry });
  });

  // Check if all files are inside a common root directory (e.g. "my-project-main/")
  let commonPrefix = '';
  const nonDirEntries = rawEntries.filter(e => !e.entry.dir);
  if (nonDirEntries.length > 0) {
    const firstPathParts = nonDirEntries[0].path.split('/');
    if (firstPathParts.length > 1) {
      const candidate = firstPathParts[0] + '/';
      const allSharePrefix = nonDirEntries.every(e => e.path.startsWith(candidate));
      if (allSharePrefix) {
        commonPrefix = candidate;
      }
    }
  }

  const filesMap = new Map<string, VirtualFile>();
  const availableHtmlFiles: string[] = [];
  let totalSize = 0;

  for (const { path, entry } of rawEntries) {
    if (entry.dir) continue;
    
    // Strip common prefix if present
    let cleanPath = commonPrefix && path.startsWith(commonPrefix) ? path.slice(commonPrefix.length) : path;
    cleanPath = normalizePath(cleanPath);
    if (!cleanPath) continue;

    const fileName = cleanPath.split('/').pop() || cleanPath;
    const mimeType = getMimeType(fileName);
    const isText = isTextFile(fileName, mimeType);

    let content: string | undefined;
    let blob: Blob;

    if (isText) {
      content = await entry.async('string');
      blob = new Blob([content], { type: mimeType });
    } else {
      const arrayBuffer = await entry.async('arraybuffer');
      blob = new Blob([arrayBuffer], { type: mimeType });
    }

    const blobUrl = URL.createObjectURL(blob);
    const size = blob.size;
    totalSize += size;

    if (cleanPath.toLowerCase().endsWith('.html') || cleanPath.toLowerCase().endsWith('.htm')) {
      availableHtmlFiles.push(cleanPath);
    }

    filesMap.set(cleanPath, {
      name: fileName,
      path: cleanPath,
      isDirectory: false,
      content,
      blob,
      blobUrl,
      size,
      mimeType,
      lastModified: entry.date ? entry.date.getTime() : Date.now(),
    });
  }

  // Find best default entry point
  let entryPoint = '';
  const prioritizedNames = ['index.html', 'index.htm', 'main.html', 'app.html', 'default.html'];
  
  for (const pName of prioritizedNames) {
    if (filesMap.has(pName)) {
      entryPoint = pName;
      break;
    }
  }

  // If not at root, look for index.html in subdirectories (like dist/index.html or public/index.html)
  if (!entryPoint) {
    const rootOrDistIndex = availableHtmlFiles.find(f => f.endsWith('index.html') || f.endsWith('index.htm'));
    if (rootOrDistIndex) {
      entryPoint = rootOrDistIndex;
    } else if (availableHtmlFiles.length > 0) {
      entryPoint = availableHtmlFiles[0];
    }
  }

  const name = projectName || (file instanceof File ? file.name.replace(/\.zip$/i, '') : 'Imported Web App');

  return {
    name,
    files: filesMap,
    entryPoint,
    availableHtmlFiles,
    totalSize,
    fileCount: filesMap.size,
    loadedAt: new Date(),
    rawZipBlob: file,
  };
}

/**
 * Creates a ZipProject from a dictionary of virtual files (for sample apps)
 */
export function createProjectFromFiles(name: string, filesRecord: Record<string, string>, defaultEntry: string = 'index.html'): ZipProject {
  const filesMap = new Map<string, VirtualFile>();
  const availableHtmlFiles: string[] = [];
  let totalSize = 0;

  for (const [rawPath, content] of Object.entries(filesRecord)) {
    const cleanPath = normalizePath(rawPath);
    const fileName = cleanPath.split('/').pop() || cleanPath;
    const mimeType = getMimeType(fileName);
    const blob = new Blob([content], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    const size = blob.size;
    totalSize += size;

    if (cleanPath.toLowerCase().endsWith('.html') || cleanPath.toLowerCase().endsWith('.htm')) {
      availableHtmlFiles.push(cleanPath);
    }

    filesMap.set(cleanPath, {
      name: fileName,
      path: cleanPath,
      isDirectory: false,
      content,
      blob,
      blobUrl,
      size,
      mimeType,
      lastModified: Date.now(),
    });
  }

  return {
    name,
    files: filesMap,
    entryPoint: defaultEntry,
    availableHtmlFiles,
    totalSize,
    fileCount: filesMap.size,
    loadedAt: new Date(),
  };
}

/**
 * Converts flat files map to a structured nested file tree
 */
export function buildFileTree(files: Map<string, VirtualFile>): FileTreeNode[] {
  const rootNodes: FileTreeNode[] = [];
  const mapNodes = new Map<string, FileTreeNode>();

  // Sort paths alphabetically
  const sortedPaths = Array.from(files.keys()).sort();

  for (const filePath of sortedPaths) {
    const parts = filePath.split('/');
    let currentPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const prevPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!mapNodes.has(currentPath)) {
        const ext = isFile ? part.split('.').pop() : undefined;
        const fileObj = isFile ? files.get(filePath) : undefined;
        const newNode: FileTreeNode = {
          id: currentPath,
          name: part,
          path: currentPath,
          isDirectory: !isFile,
          size: fileObj?.size,
          extension: ext,
          mimeType: fileObj?.mimeType,
          children: isFile ? undefined : [],
        };

        mapNodes.set(currentPath, newNode);

        if (prevPath && mapNodes.has(prevPath)) {
          mapNodes.get(prevPath)!.children!.push(newNode);
        } else if (i === 0) {
          rootNodes.push(newNode);
        }
      }
    }
  }

  // Sort folders first, then files alphabetically
  function sortNodes(nodes: FileTreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) {
        sortNodes(node.children);
      }
    }
  }

  sortNodes(rootNodes);
  return rootNodes;
}

/**
 * Exports current project files as a downloadable ZIP
 */
export async function exportProjectToZip(project: ZipProject): Promise<Blob> {
  const zip = new JSZip();

  const entries: [string, VirtualFile][] = Array.from(project.files.entries());

  for (const [path, file] of entries) {
    if (file.content !== undefined) {
      zip.file(String(path), file.content);
    } else if (file.blob) {
      zip.file(String(path), file.blob);
    }
  }

  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}
