import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Sparkles,
  Info
} from 'lucide-react';
import { NoteObject, ObjectType } from '../../../types/notes';
import { extractNoteLinks, extractNoteTags } from '../../../utils/notesStorage';

interface NotesKnowledgeGraphProps {
  notes: NoteObject[];
  onSelectNote: (noteId: string) => void;
  activeNoteId?: string;
}

interface SimNode {
  id: string;
  noteId?: string;
  title: string;
  type: ObjectType | 'tag';
  icon: string;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  degree: number;
}

interface SimLink {
  sourceId: string;
  targetId: string;
}

const TYPE_COLORS: Record<string, string> = {
  concept: '#8b5cf6', // Purple
  project: '#10b981', // Emerald
  diary: '#f59e0b',   // Amber
  task: '#3b82f6',    // Blue
  meeting: '#ec4899', // Pink
  resource: '#06b6d4',// Cyan
  book: '#f97316',    // Orange
  note: '#6366f1',    // Indigo
  tag: '#eab308'      // Gold
};

export const NotesKnowledgeGraph: React.FC<NotesKnowledgeGraphProps> = ({
  notes,
  onSelectNote,
  activeNoteId
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [showTags, setShowTags] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);

  // Transform / Camera
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const isDraggingCanvas = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const draggedNode = useRef<SimNode | null>(null);

  // Build nodes and links
  const { initialNodes, initialLinks } = useMemo(() => {
    const nodeMap = new Map<string, SimNode>();
    const links: SimLink[] = [];

    // 1. Add Note nodes
    notes.forEach((note) => {
      const color = TYPE_COLORS[note.type] || '#6366f1';
      nodeMap.set(note.id, {
        id: note.id,
        noteId: note.id,
        title: note.title,
        type: note.type,
        icon: note.icon || '📄',
        color,
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 400,
        vx: 0,
        vy: 0,
        radius: 12,
        degree: 0
      });
    });

    // 2. Build links and degree count from [[Links]]
    const titleToId = new Map<string, string>();
    notes.forEach((n) => titleToId.set(n.title.trim().toLowerCase(), n.id));

    notes.forEach((note) => {
      const outgoing = extractNoteLinks(note.blocks);
      outgoing.forEach((targetTitle) => {
        const targetId = titleToId.get(targetTitle.trim().toLowerCase());
        if (targetId && targetId !== note.id) {
          links.push({ sourceId: note.id, targetId });
          const src = nodeMap.get(note.id);
          const tgt = nodeMap.get(targetId);
          if (src) src.degree += 1;
          if (tgt) tgt.degree += 1;
        }
      });

      // Tags as nodes if enabled
      if (showTags && note.tags && note.tags.length > 0) {
        note.tags.forEach((tag) => {
          const tagId = `tag-${tag.toLowerCase()}`;
          if (!nodeMap.has(tagId)) {
            nodeMap.set(tagId, {
              id: tagId,
              title: `#${tag}`,
              type: 'tag',
              icon: '#',
              color: TYPE_COLORS.tag,
              x: (Math.random() - 0.5) * 350,
              y: (Math.random() - 0.5) * 350,
              vx: 0,
              vy: 0,
              radius: 8,
              degree: 0
            });
          }
          links.push({ sourceId: note.id, targetId: tagId });
          const src = nodeMap.get(note.id);
          const tgt = nodeMap.get(tagId);
          if (src) src.degree += 1;
          if (tgt) tgt.degree += 1;
        });
      }
    });

    // Scale radius by degree
    nodeMap.forEach((node) => {
      node.radius = Math.min(26, Math.max(8, 8 + Math.sqrt(node.degree) * 4));
    });

    return {
      initialNodes: Array.from(nodeMap.values()),
      initialLinks: links
    };
  }, [notes, showTags]);

  const nodesRef = useRef<SimNode[]>(initialNodes);
  const linksRef = useRef<SimLink[]>(initialLinks);
  const nodeIndexRef = useRef<Map<string, SimNode>>(new Map());

  const [isSettled, setIsSettled] = useState(false);
  const isSimulatingRef = useRef(true);
  const animationFrameIdRef = useRef<number | null>(null);

  // Keep node index lookup synchronized without recreating inside animation frame
  useEffect(() => {
    nodesRef.current = initialNodes;
    linksRef.current = initialLinks;
    const map = new Map<string, SimNode>();
    initialNodes.forEach((n) => map.set(n.id, n));
    nodeIndexRef.current = map;
    wakeSimulation(2);
  }, [initialNodes, initialLinks]);

  // Center camera on load
  const resetCamera = () => {
    if (containerRef.current) {
      cameraRef.current = {
        x: containerRef.current.clientWidth / 2,
        y: containerRef.current.clientHeight / 2,
        zoom: 1
      };
      if (!isSimulatingRef.current) {
        renderCanvas();
      }
    }
  };

  // Pure static canvas render (0% CPU, no physics step)
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nodes = nodesRef.current;
    const links = linksRef.current;
    const nodeIndex = nodeIndexRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(cameraRef.current.x, cameraRef.current.y);
    ctx.scale(cameraRef.current.zoom, cameraRef.current.zoom);

    // Render links
    for (let k = 0; k < links.length; k++) {
      const l = links[k];
      const src = nodeIndex.get(l.sourceId);
      const tgt = nodeIndex.get(l.targetId);
      if (src && tgt) {
        const isHighlighted =
          (hoveredNode && (hoveredNode.id === src.id || hoveredNode.id === tgt.id)) ||
          (activeNoteId && (activeNoteId === src.id || activeNoteId === tgt.id));

        ctx.strokeStyle = isHighlighted ? 'rgba(59, 130, 246, 0.7)' : 'rgba(150, 150, 160, 0.2)';
        ctx.lineWidth = isHighlighted ? 1.8 : 0.8;
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.stroke();
      }
    }

    // Render nodes
    const q = searchQuery.toLowerCase().trim();

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const isHovered = hoveredNode?.id === n.id;
      const isActive = activeNoteId === n.id;
      const isMatch = q ? n.title.toLowerCase().includes(q) : true;
      const typeMatch = selectedTypeFilter === 'all' || n.type === selectedTypeFilter;

      const opacity = (!isMatch || !typeMatch) ? 0.2 : 1;

      // Outer glow on active or hover
      if ((isHovered || isActive) && opacity > 0.5) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = n.color + '40';
        ctx.fill();
      }

      // Main node circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fillStyle = n.color;
      ctx.globalAlpha = opacity;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = isHovered || isActive ? 2.5 : 1;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Label
      if (cameraRef.current.zoom > 0.6 || isHovered || isActive) {
        ctx.font = `${isHovered ? 'bold ' : ''}11px sans-serif`;
        ctx.fillStyle = isHovered ? '#3b82f6' : '#9ca3af';
        ctx.textAlign = 'center';
        ctx.fillText(n.title, n.x, n.y + n.radius + 14);
      }
    }

    ctx.restore();
  };

  // Physics simulation tick (runs until kinetic energy settles below epsilon)
  const simulationTick = () => {
    const nodes = nodesRef.current;
    const links = linksRef.current;
    const nodeIndex = nodeIndexRef.current;

    // 1. Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy + 10;
        const dist = Math.sqrt(distSq);
        if (dist < 400) {
          const force = 800 / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }
    }

    // 2. Spring force along links
    for (let k = 0; k < links.length; k++) {
      const l = links[k];
      const src = nodeIndex.get(l.sourceId);
      const tgt = nodeIndex.get(l.targetId);
      if (src && tgt) {
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const desired = 80;
        const spring = (dist - desired) * 0.03;
        const fx = (dx / dist) * spring;
        const fy = (dy / dist) * spring;
        src.vx += fx;
        src.vy += fy;
        tgt.vx -= fx;
        tgt.vy -= fy;
      }
    }

    // 3. Center gravity and damping + compute total kinetic energy
    let totalEnergy = 0;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n === draggedNode.current) continue;

      // Centering force
      n.vx -= n.x * 0.003;
      n.vy -= n.y * 0.003;

      // Damping
      n.vx *= 0.88;
      n.vy *= 0.88;

      n.x += n.vx;
      n.y += n.vy;

      totalEnergy += n.vx * n.vx + n.vy * n.vy;
    }

    // 4. Render canvas frame
    renderCanvas();

    // 5. Check if simulation can sleep to save battery and GPU
    if (totalEnergy < 0.008 && !draggedNode.current) {
      isSimulatingRef.current = false;
      setIsSettled(true);
      animationFrameIdRef.current = null;
    } else {
      animationFrameIdRef.current = requestAnimationFrame(simulationTick);
    }
  };

  const wakeSimulation = (initialKick = 0) => {
    if (initialKick > 0) {
      nodesRef.current.forEach((n) => {
        n.vx += (Math.random() - 0.5) * initialKick;
        n.vy += (Math.random() - 0.5) * initialKick;
      });
    }
    if (!isSimulatingRef.current) {
      isSimulatingRef.current = true;
      setIsSettled(false);
      animationFrameIdRef.current = requestAnimationFrame(simulationTick);
    }
  };

  // Mount effect & Resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (containerRef.current && canvas) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
        if (cameraRef.current.x === 0) resetCamera();
        if (!isSimulatingRef.current) {
          renderCanvas();
        }
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    resetCamera();
    wakeSimulation(3);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update static render when hover, search or filters change while paused
  useEffect(() => {
    if (!isSimulatingRef.current) {
      renderCanvas();
    }
  }, [hoveredNode, activeNoteId, searchQuery, selectedTypeFilter]);

  // Pointer interactions (Pan, Zoom, Drag nodes)
  const getSimCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    return {
      x: (cx - cameraRef.current.x) / cameraRef.current.zoom,
      y: (cy - cameraRef.current.y) / cameraRef.current.zoom
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getSimCoords(e.clientX, e.clientY);

    // Check if clicked a node
    const clicked = nodesRef.current.find((n) => {
      const dx = n.x - x;
      const dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
    });

    if (clicked) {
      draggedNode.current = clicked;
      wakeSimulation();
    } else {
      isDraggingCanvas.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getSimCoords(e.clientX, e.clientY);

    if (draggedNode.current) {
      draggedNode.current.x = x;
      draggedNode.current.y = y;
      draggedNode.current.vx = 0;
      draggedNode.current.vy = 0;
      wakeSimulation();
    } else if (isDraggingCanvas.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      cameraRef.current.x += dx;
      cameraRef.current.y += dy;
      dragStart.current = { x: e.clientX, y: e.clientY };
      if (!isSimulatingRef.current) {
        renderCanvas();
      }
    } else {
      // Hover detection
      const found = nodesRef.current.find((n) => {
        const dx = n.x - x;
        const dy = n.y - y;
        return Math.sqrt(dx * dx + dy * dy) <= n.radius + 4;
      });
      const nextFound = found || null;
      if (nextFound?.id !== hoveredNode?.id) {
        setHoveredNode(nextFound);
      }
    }
  };

  const handleMouseUp = () => {
    if (draggedNode.current) {
      // If it was a clean click without massive drag, select the note!
      if (draggedNode.current.noteId) {
        onSelectNote(draggedNode.current.noteId);
      }
      draggedNode.current = null;
      wakeSimulation(1);
    }
    isDraggingCanvas.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(3, Math.max(0.2, cameraRef.current.zoom * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    cameraRef.current.x = mouseX - (mouseX - cameraRef.current.x) * (newZoom / cameraRef.current.zoom);
    cameraRef.current.y = mouseY - (mouseY - cameraRef.current.y) * (newZoom / cameraRef.current.zoom);
    cameraRef.current.zoom = newZoom;

    if (!isSimulatingRef.current) {
      renderCanvas();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-0 overflow-hidden bg-white/50 dark:bg-black/40 backdrop-blur-xl select-none">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-md p-1.5 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-lg text-xs">
          <div className="flex items-center gap-1.5 px-2 text-gray-500">
            <Search className="w-3.5 h-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search graph nodes..."
              className="bg-transparent outline-none w-36 sm:w-48 text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
            />
          </div>

          <div className="h-4 w-px bg-gray-200 dark:bg-white/10" />

          {/* Type Filter */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="bg-transparent outline-none text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer pr-1"
          >
            <option value="all">All Types</option>
            <option value="concept">Concepts</option>
            <option value="project">Projects</option>
            <option value="diary">Diaries</option>
            <option value="task">Tasks</option>
            <option value="meeting">Meetings</option>
            <option value="note">Notes</option>
          </select>

          <button
            type="button"
            onClick={() => setShowTags(!showTags)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              showTags
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            #Tags
          </button>
        </div>

        {/* Right Section: Settle Status & Zoom Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Energy & Physics Status Badge */}
          <div className="bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-gray-200/80 dark:border-white/10 shadow-lg flex items-center gap-1.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
            <span
              className={`w-2 h-2 rounded-full transition-colors ${
                isSettled ? 'bg-emerald-500 shadow-xs' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span>{isSettled ? 'Settled (0% CPU)' : 'Simulating...'}</span>
          </div>

          {/* Zoom & Reset Controls */}
          <div className="flex items-center gap-1 bg-white/90 dark:bg-[#18181b]/90 backdrop-blur-md p-1 rounded-xl border border-gray-200/80 dark:border-white/10 shadow-lg">
            <button
              type="button"
              onClick={() => {
                cameraRef.current.zoom = Math.min(3, cameraRef.current.zoom * 1.2);
                if (!isSimulatingRef.current) renderCanvas();
              }}
              title="Zoom In"
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                cameraRef.current.zoom = Math.max(0.2, cameraRef.current.zoom * 0.8);
                if (!isSimulatingRef.current) renderCanvas();
              }}
              title="Zoom Out"
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                resetCamera();
                wakeSimulation(5);
              }}
              title="Re-layout & Reset View"
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Hovered Node Preview HUD (bottom-left) */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 max-w-sm bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-xl p-3 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xl text-xs space-y-1 animate-in fade-in zoom-in-95 pointer-events-none">
          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: hoveredNode.color }}
            />
            <span className="truncate">{hoveredNode.title}</span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <span className="capitalize">{hoveredNode.type}</span>
            <span>•</span>
            <span>{hoveredNode.degree} connected relations</span>
          </div>
          <div className="text-[10px] text-blue-500 font-semibold pt-0.5">
            Click node to jump directly into editor
          </div>
        </div>
      )}

      {/* Legend Badge (bottom-right) */}
      <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200/60 dark:border-white/10 text-[10px] text-gray-500 hidden sm:flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-500" /> Concept
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Project
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Diary
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> Task/Note
        </span>
      </div>
    </div>
  );
};
