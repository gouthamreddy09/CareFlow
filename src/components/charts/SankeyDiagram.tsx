import { useMemo, useState, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { PatientFlowPath } from '../../types/flow';
import { categorizeDepartment, CATEGORY_COLORS } from '../../services/patientFlowService';

interface SankeyDiagramProps {
  paths: PatientFlowPath[];
  height?: number;
}

interface SankeyNode {
  id: string;
  x: number;
  y: number;
  height: number;
  color: string;
  value: number;
  layer: number;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
  sourceNode: SankeyNode;
  targetNode: SankeyNode;
}

export function SankeyDiagram({ paths, height = 600 }: SankeyDiagramProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { nodes, links, svgWidth, svgHeight } = useMemo(() => {
    if (paths.length === 0) {
      return { nodes: [], links: [], svgWidth: 1200, svgHeight: 800 };
    }

    const nodeFlow = new Map<string, number>();
    const connections = new Map<string, Set<string>>();
    const reverseConnections = new Map<string, Set<string>>();

    paths.forEach(p => {
      nodeFlow.set(p.from, (nodeFlow.get(p.from) || 0) + p.count);
      nodeFlow.set(p.to, (nodeFlow.get(p.to) || 0) + p.count);

      if (!connections.has(p.from)) connections.set(p.from, new Set());
      if (!reverseConnections.has(p.to)) reverseConnections.set(p.to, new Set());

      connections.get(p.from)!.add(p.to);
      reverseConnections.get(p.to)!.add(p.from);
    });

    const allNodeIds = Array.from(nodeFlow.keys());
    const layers: string[][] = [];
    const nodeLayer = new Map<string, number>();
    const assigned = new Set<string>();

    const startNodes = allNodeIds.filter(id => !reverseConnections.has(id) || reverseConnections.get(id)!.size === 0);

    if (startNodes.length === 0) {
      const sortedByFlow = allNodeIds.sort((a, b) => (nodeFlow.get(b) || 0) - (nodeFlow.get(a) || 0));
      layers.push([sortedByFlow[0]]);
      assigned.add(sortedByFlow[0]);
      nodeLayer.set(sortedByFlow[0], 0);
    } else {
      layers.push(startNodes);
      startNodes.forEach(n => {
        assigned.add(n);
        nodeLayer.set(n, 0);
      });
    }

    let currentLayerIdx = 0;
    while (assigned.size < allNodeIds.length && currentLayerIdx < 10) {
      const nextLayer: string[] = [];
      const currentLayer = layers[currentLayerIdx];

      currentLayer.forEach(nodeId => {
        const targets = connections.get(nodeId);
        if (targets) {
          targets.forEach(targetId => {
            if (!assigned.has(targetId)) {
              nextLayer.push(targetId);
              assigned.add(targetId);
              nodeLayer.set(targetId, currentLayerIdx + 1);
            }
          });
        }
      });

      if (nextLayer.length > 0) {
        layers.push(Array.from(new Set(nextLayer)));
      }
      currentLayerIdx++;
    }

    allNodeIds.forEach(id => {
      if (!assigned.has(id)) {
        layers[layers.length - 1].push(id);
        nodeLayer.set(id, layers.length - 1);
      }
    });

    const maxNodesInLayer = Math.max(...layers.map(l => l.length));
    const calculatedHeight = Math.max(800, maxNodesInLayer * 80 + 100);
    const width = Math.max(1600, layers.length * 300);

    const padding = { left: 150, right: 150, top: 50, bottom: 50 };
    const nodeWidth = 30;
    const availableWidth = width - padding.left - padding.right - nodeWidth;
    const layerSpacing = layers.length > 1 ? availableWidth / (layers.length - 1) : 0;

    const maxFlow = Math.max(...Array.from(nodeFlow.values()));
    const sankeyNodes: SankeyNode[] = [];

    layers.forEach((layer, layerIdx) => {
      const sortedLayer = layer.sort((a, b) => (nodeFlow.get(b) || 0) - (nodeFlow.get(a) || 0));

      const availableHeight = calculatedHeight - padding.top - padding.bottom;
      const minNodeHeight = 50;
      const maxNodeHeight = 120;

      let currentY = padding.top;
      const spacing = sortedLayer.length > 1 ? 30 : 0;

      sortedLayer.forEach((nodeId, idx) => {
        const flow = nodeFlow.get(nodeId) || 0;
        const nodeHeight = Math.min(
          Math.max((flow / maxFlow) * availableHeight * 0.5, minNodeHeight),
          maxNodeHeight
        );

        const category = categorizeDepartment(nodeId);
        const color = CATEGORY_COLORS[category] || '#6B7280';

        sankeyNodes.push({
          id: nodeId,
          x: padding.left + layerIdx * layerSpacing,
          y: currentY,
          height: nodeHeight,
          color,
          value: flow,
          layer: layerIdx,
        });

        currentY += nodeHeight + spacing;
      });
    });

    const nodeById = new Map(sankeyNodes.map(n => [n.id, n]));

    const sankeyLinks: SankeyLink[] = paths
      .filter(p => nodeById.has(p.from) && nodeById.has(p.to))
      .map(p => ({
        source: p.from,
        target: p.to,
        value: p.count,
        sourceNode: nodeById.get(p.from)!,
        targetNode: nodeById.get(p.to)!,
      }));

    return { nodes: sankeyNodes, links: sankeyLinks, svgWidth: width, svgHeight: calculatedHeight };
  }, [paths]);

  if (paths.length === 0 || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-400" style={{ height }}>
        No patient flow data available
      </div>
    );
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.2, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.2, 0.3));
  };

  const handleFitToScreen = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const scaleX = containerWidth / svgWidth;
      const scaleY = containerHeight / svgHeight;
      const newZoom = Math.min(scaleX, scaleY) * 0.95;
      setZoom(newZoom);
    }
  };

  return (
    <div className="relative">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4 text-gray-700" />
        </button>
        <button
          onClick={handleFitToScreen}
          className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4 text-gray-700" />
        </button>
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4 text-gray-700" />
        </button>
        <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 shadow-sm">
          {Math.round(zoom * 100)}%
        </div>
      </div>
      <div
        ref={containerRef}
        className="w-full bg-gray-50 rounded-lg border border-gray-200 scrollbar-thin"
        style={{
          height: `${height}px`,
          overflow: 'auto',
          position: 'relative'
        }}
      >
        <svg
          width={svgWidth * zoom}
          height={svgHeight * zoom}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="xMinYMin meet"
          style={{ display: 'block' }}
        >
        <defs>
          {links.map((link, i) => (
            <linearGradient key={i} id={`gradient-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={link.sourceNode.color} stopOpacity="0.6" />
              <stop offset="100%" stopColor={link.targetNode.color} stopOpacity="0.4" />
            </linearGradient>
          ))}
        </defs>

        {links.map((link, i) => {
          const sourceNode = link.sourceNode;
          const targetNode = link.targetNode;
          const isHighlighted = hoveredNode === link.source || hoveredNode === link.target || hoveredLink === i;

          const sourceY = sourceNode.y + sourceNode.height / 2;
          const targetY = targetNode.y + targetNode.height / 2;
          const sourceX = sourceNode.x + 30;
          const targetX = targetNode.x;

          const midX = (sourceX + targetX) / 2;

          const path = `
            M ${sourceX} ${sourceY}
            C ${midX} ${sourceY},
              ${midX} ${targetY},
              ${targetX} ${targetY}
          `;

          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredLink(i)}
              onMouseLeave={() => setHoveredLink(null)}
              style={{ cursor: 'pointer' }}
            >
              <path
                d={path}
                fill="none"
                stroke={`url(#gradient-${i})`}
                strokeWidth={Math.max(4, Math.min(link.value / 3, 20))}
                opacity={isHighlighted ? 0.9 : 0.5}
                strokeLinecap="round"
                style={{ transition: 'all 0.2s' }}
              />
              {hoveredLink === i && (
                <g>
                  <rect
                    x={midX - 45}
                    y={(sourceY + targetY) / 2 - 22}
                    width="90"
                    height="44"
                    fill="rgba(0, 0, 0, 0.9)"
                    rx="8"
                    stroke="white"
                    strokeWidth="1"
                  />
                  <text
                    x={midX}
                    y={(sourceY + targetY) / 2 - 6}
                    textAnchor="middle"
                    fontSize="13"
                    fontWeight="600"
                    fill="white"
                  >
                    {link.value} patients
                  </text>
                  <text
                    x={midX}
                    y={(sourceY + targetY) / 2 + 10}
                    textAnchor="middle"
                    fontSize="11"
                    fill="rgba(255, 255, 255, 0.8)"
                  >
                    {link.source} → {link.target}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {nodes.map((node, i) => {
          const isHighlighted = hoveredNode === node.id;
          const isLeftSide = node.layer < Math.max(...nodes.map(n => n.layer)) / 2;
          const labelX = isLeftSide ? node.x + 38 : node.x - 8;
          const labelAnchor = isLeftSide ? 'start' : 'end';

          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x={node.x}
                y={node.y}
                width="30"
                height={node.height}
                fill={node.color}
                rx="6"
                opacity={isHighlighted ? 1 : 0.9}
                stroke={isHighlighted ? node.color : 'none'}
                strokeWidth={isHighlighted ? 3 : 0}
                style={{
                  transition: 'all 0.2s',
                  filter: isHighlighted ? 'brightness(1.1) drop-shadow(0 0 8px rgba(0,0,0,0.3))' : 'none'
                }}
              />

              <text
                x={labelX}
                y={node.y + node.height / 2 - 8}
                textAnchor={labelAnchor}
                fontSize="14"
                fontWeight="600"
                fill="#1F2937"
              >
                {node.id}
              </text>
              <text
                x={labelX}
                y={node.y + node.height / 2 + 8}
                textAnchor={labelAnchor}
                fontSize="12"
                fill="#6B7280"
              >
                {node.value} patients
              </text>
            </g>
          );
        })}
        </svg>
      </div>
    </div>
  );
}
