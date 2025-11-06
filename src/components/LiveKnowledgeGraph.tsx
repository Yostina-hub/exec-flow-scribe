import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface KnowledgeNode {
  id: string;
  label: string;
  type: 'topic' | 'person' | 'decision' | 'action';
  connections: string[];
  importance: number;
}

interface LiveKnowledgeGraphProps {
  meetingId: string;
}

export const LiveKnowledgeGraph = ({ meetingId }: LiveKnowledgeGraphProps) => {
  const [nodes, setNodes] = useState<KnowledgeNode[]>([
    { id: '1', label: 'Q4 Strategy', type: 'topic', connections: ['2', '3'], importance: 95 },
    { id: '2', label: 'CEO', type: 'person', connections: ['1', '4'], importance: 88 },
    { id: '3', label: 'Budget Allocation', type: 'decision', connections: ['1', '5'], importance: 92 },
    { id: '4', label: 'Market Analysis', type: 'topic', connections: ['2'], importance: 78 },
    { id: '5', label: 'Review Financials', type: 'action', connections: ['3'], importance: 85 },
  ]);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const getNodeColor = (type: KnowledgeNode['type']) => {
    switch (type) {
      case 'topic': return 'from-blue-500 to-cyan-500';
      case 'person': return 'from-purple-500 to-pink-500';
      case 'decision': return 'from-green-500 to-emerald-500';
      case 'action': return 'from-orange-500 to-yellow-500';
    }
  };

  const getNodeIcon = (type: KnowledgeNode['type']) => {
    switch (type) {
      case 'topic': return '📚';
      case 'person': return '👤';
      case 'decision': return '✅';
      case 'action': return '🎯';
    }
  };

  // Simulate real-time graph updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly update node importance
      setNodes((prev) =>
        prev.map((node) => ({
          ...node,
          importance: Math.max(50, Math.min(100, node.importance + (Math.random() * 10 - 5))),
        }))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="border-0 bg-gradient-to-br from-background via-muted/10 to-background backdrop-blur-xl overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-pulse" />
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Network className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Knowledge Graph</CardTitle>
              <CardDescription>Live meeting connections</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {nodes.length} nodes
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        {/* Graph Visualization */}
        <div className="relative h-64 bg-muted/10 rounded-lg border border-border/50 overflow-hidden">
          <svg className="w-full h-full">
            {/* Connections */}
            {nodes.map((node) =>
              node.connections.map((connId) => {
                const targetNode = nodes.find((n) => n.id === connId);
                if (!targetNode) return null;
                const fromIndex = nodes.indexOf(node);
                const toIndex = nodes.indexOf(targetNode);
                const fromAngle = (fromIndex / nodes.length) * 2 * Math.PI;
                const toAngle = (toIndex / nodes.length) * 2 * Math.PI;
                const centerX = 200;
                const centerY = 128;
                const radius = 80;
                return (
                  <motion.line
                    key={`${node.id}-${connId}`}
                    x1={centerX + Math.cos(fromAngle) * radius}
                    y1={centerY + Math.sin(fromAngle) * radius}
                    x2={centerX + Math.cos(toAngle) * radius}
                    y2={centerY + Math.sin(toAngle) * radius}
                    stroke={hoveredNode === node.id || hoveredNode === connId ? "hsl(var(--primary))" : "hsl(var(--border))"}
                    strokeWidth={hoveredNode === node.id || hoveredNode === connId ? 2 : 1}
                    strokeOpacity={0.3}
                    animate={{ strokeOpacity: hoveredNode === node.id || hoveredNode === connId ? 0.8 : 0.3 }}
                  />
                );
              })
            )}
            {/* Nodes */}
            {nodes.map((node, index) => {
              const angle = (index / nodes.length) * 2 * Math.PI;
              const centerX = 200;
              const centerY = 128;
              const radius = 80;
              const x = centerX + Math.cos(angle) * radius;
              const y = centerY + Math.sin(angle) * radius;
              return (
                <g key={node.id}>
                  <motion.circle
                    cx={x}
                    cy={y}
                    r={hoveredNode === node.id ? 20 : 15}
                    fill={`url(#node-gradient-${node.id})`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    animate={{
                      scale: hoveredNode === node.id ? [1, 1.2, 1] : 1,
                      r: node.importance / 5,
                    }}
                    transition={{ duration: 0.3 }}
                  />
                  <defs>
                    <radialGradient id={`node-gradient-${node.id}`}>
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--secondary))" />
                    </radialGradient>
                  </defs>
                  <text
                    x={x}
                    y={y + 30}
                    textAnchor="middle"
                    className="text-xs fill-foreground font-medium"
                  >
                    {getNodeIcon(node.type)} {node.label.slice(0, 12)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Node Details */}
        {hoveredNode && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/50"
          >
            {(() => {
              const node = nodes.find((n) => n.id === hoveredNode);
              if (!node) return null;
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">
                      {getNodeIcon(node.type)} {node.label}
                    </span>
                    <Badge variant="outline">{Math.round(node.importance)}% relevance</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Connected to {node.connections.length} other{' '}
                    {node.connections.length === 1 ? 'element' : 'elements'}
                  </p>
                </div>
              );
            })()}
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
