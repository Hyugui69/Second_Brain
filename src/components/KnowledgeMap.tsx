import { useState, useEffect, useCallback } from 'react';
import { supabase, Memory, Goal, Connection } from '../lib/supabase';
import { categories, getCategoryColor } from '../lib/utils';
import {
  GitBranch,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';

interface KnowledgeMapProps {
  userId: string;
}

interface Node {
  id: string;
  type: 'memory' | 'goal';
  title: string;
  category: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  strength: number;
  aiDiscovered: boolean;
}

export function KnowledgeMap({ userId }: KnowledgeMapProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    const { data: memoriesData } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .limit(50);

    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    const { data: connectionsData } = await supabase
      .from('connections')
      .select('*')
      .eq('user_id', userId);

    if (memoriesData) setMemories(memoriesData);
    if (goalsData) setGoals(goalsData);
    if (connectionsData) setConnections(connectionsData);

    generateGraph(memoriesData || [], goalsData || [], connectionsData || []);
    setLoading(false);
  };

  const generateGraph = useCallback((mems: Memory[], gs: Goal[], conns: Connection[]) => {
    const centerX = 400;
    const centerY = 300;
    const radius = Math.min(mems.length + gs.length, 20) * 30;

    const newNodes: Node[] = [];

    gs.forEach((goal, i) => {
      const angle = (i / gs.length) * 2 * Math.PI - Math.PI / 2;
      newNodes.push({
        id: goal.id,
        type: 'goal',
        title: goal.title,
        category: goal.category,
        x: centerX + Math.cos(angle) * radius * 0.3,
        y: centerY + Math.sin(angle) * radius * 0.3,
        vx: 0,
        vy: 0,
      });
    });

    mems.forEach((memory, i) => {
      const angle = (i / mems.length) * 2 * Math.PI;
      const r = radius * (0.5 + Math.random() * 0.5);
      newNodes.push({
        id: memory.id,
        type: 'memory',
        title: memory.title,
        category: memory.category,
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
      });
    });

    const newEdges: Edge[] = conns.map(conn => ({
      id: conn.id,
      source: conn.source_id,
      target: conn.target_id,
      strength: conn.strength,
      aiDiscovered: conn.ai_discovered,
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(0.5, Math.min(2, prev + delta)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getNodeById = (id: string): Node | undefined => nodes.find(n => n.id === id);

  const getConnectedNodes = (nodeId: string): string[] => {
    const connected = new Set<string>();
    edges.forEach(edge => {
      if (edge.source === nodeId) connected.add(edge.target);
      if (edge.target === nodeId) connected.add(edge.source);
    });
    return Array.from(connected);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
      <div className="border-b border-slate-700/50 px-6 py-4 bg-slate-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Carte des connaissances</h2>
              <p className="text-sm text-slate-400">{nodes.length} nœuds, {edges.length} connexions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleZoom(-0.1)}
              className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => handleZoom(0.1)}
              className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button
              onClick={resetView}
              className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={loadData}
              className="p-2 rounded-lg bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-sm text-slate-400">Objectifs</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-slate-400">Notes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-8 bg-gradient-to-r from-slate-500 to-emerald-500" />
            <span className="text-sm text-slate-400">Connexions IA</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <GitBranch className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400 mb-2">Aucune donnée à afficher</p>
            <p className="text-sm text-slate-500">Ajoutez des notes et objectifs pour voir les connexions</p>
          </div>
        ) : (
          <svg
            className="w-full h-full"
            viewBox="0 0 800 600"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {edges.map((edge) => {
                const sourceNode = getNodeById(edge.source);
                const targetNode = getNodeById(edge.target);
                if (!sourceNode || !targetNode) return null;

                const isHighlighted =
                  hoveredNode?.id === edge.source ||
                  hoveredNode?.id === edge.target ||
                  selectedNode?.id === edge.source ||
                  selectedNode?.id === edge.target;

                return (
                  <line
                    key={edge.id}
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke={isHighlighted ? '#10b981' : edge.aiDiscovered ? '#06b6d4' : '#475569'}
                    strokeWidth={edge.strength / 3}
                    strokeOpacity={isHighlighted ? 1 : 0.3}
                    strokeDasharray={edge.aiDiscovered ? '5,5' : 'none'}
                  />
                );
              })}

              {nodes.map((node) => {
                const isConnectedToSelected =
                  selectedNode && getConnectedNodes(selectedNode.id).includes(node.id);
                const isHighlighted =
                  node.id === selectedNode?.id ||
                  node.id === hoveredNode?.id ||
                  isConnectedToSelected;

                return (
                  <g key={node.id}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.type === 'goal' ? 28 : 22}
                      fill={node.type === 'goal' ? '#10b981' : '#3b82f6'}
                      stroke={isHighlighted ? '#fff' : 'transparent'}
                      strokeWidth={isHighlighted ? 3 : 0}
                      strokeOpacity={isHighlighted ? 1 : 0.5}
                      className="cursor-pointer"
                      onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                      onMouseEnter={() => setHoveredNode(node)}
                      onMouseLeave={() => setHoveredNode(null)}
                    />
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.type === 'goal' ? 24 : 18}
                      fill={node.type === 'goal' ? '#064e3b' : '#1e3a5f'}
                      className="pointer-events-none"
                    />
                    <text
                      x={node.x}
                      y={node.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={node.type === 'goal' ? 12 : 10}
                      fontWeight={node.type === 'goal' ? 'bold' : 'normal'}
                      className="pointer-events-none select-none"
                    >
                      {node.title.substring(0, 12)}
                      {node.title.length > 12 ? '...' : ''}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {selectedNode && (
          <div className="absolute bottom-4 left-4 right-4 bg-slate-800/95 backdrop-blur-sm rounded-xl border border-slate-700 p-4 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${
                    selectedNode.type === 'goal' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}>
                    {selectedNode.type === 'goal' ? 'Objectif' : 'Note'}
                  </span>
                  <span className="text-sm text-slate-400">{selectedNode.category}</span>
                </div>
                <h3 className="text-lg font-semibold text-white">{selectedNode.title}</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {getConnectedNodes(selectedNode.id).length} connexions
                </p>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
