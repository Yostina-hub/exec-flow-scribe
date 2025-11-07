import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, ZoomIn, ZoomOut, Maximize2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TaskDependencyGraphProps {
  onClose: () => void;
}

interface TaskNode {
  id: string;
  title: string;
  status: string;
  priority: string;
  x: number;
  y: number;
  level: number;
}

interface DependencyEdge {
  from: string;
  to: string;
  type: string;
}

interface CriticalPathInfo {
  tasks: string[];
  duration: number;
}

export function TaskDependencyGraph({ onClose }: TaskDependencyGraphProps) {
  const [nodes, setNodes] = useState<TaskNode[]>([]);
  const [edges, setEdges] = useState<DependencyEdge[]>([]);
  const [criticalPath, setCriticalPath] = useState<CriticalPathInfo | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const { toast } = useToast();

  useEffect(() => {
    loadGraphData();
  }, []);

  const loadGraphData = async () => {
    try {
      // Load all tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('action_items')
        .select('id, title, status, priority')
        .order('created_at');

      if (tasksError) throw tasksError;

      // Load all dependencies
      const { data: dependencies, error: depsError } = await supabase
        .from('guba_task_dependencies' as any)
        .select('task_id, depends_on_task_id, dependency_type');

      if (depsError) throw depsError;

      const deps = dependencies as any[] || [];

      // Build graph structure
      const taskMap = new Map(tasks?.map(t => [t.id, t]) || []);
      const adjList = new Map<string, string[]>();
      const inDegree = new Map<string, number>();

      // Initialize
      tasks?.forEach(task => {
        adjList.set(task.id, []);
        inDegree.set(task.id, 0);
      });

      // Build adjacency list
      deps.forEach(dep => {
        adjList.get(dep.depends_on_task_id)?.push(dep.task_id);
        inDegree.set(dep.task_id, (inDegree.get(dep.task_id) || 0) + 1);
      });

      // Topological sort for level assignment
      const levels = new Map<string, number>();
      const queue: string[] = [];

      inDegree.forEach((degree, taskId) => {
        if (degree === 0) {
          queue.push(taskId);
          levels.set(taskId, 0);
        }
      });

      while (queue.length > 0) {
        const current = queue.shift()!;
        const currentLevel = levels.get(current) || 0;

        adjList.get(current)?.forEach(neighbor => {
          const newDegree = (inDegree.get(neighbor) || 0) - 1;
          inDegree.set(neighbor, newDegree);

          levels.set(neighbor, Math.max(levels.get(neighbor) || 0, currentLevel + 1));

          if (newDegree === 0) {
            queue.push(neighbor);
          }
        });
      }

      // Position nodes
      const levelCounts = new Map<number, number>();
      const levelPositions = new Map<number, number>();

      levels.forEach((level) => {
        levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
        levelPositions.set(level, 0);
      });

      const positionedNodes: TaskNode[] = tasks?.map(task => {
        const level = levels.get(task.id) || 0;
        const position = levelPositions.get(level) || 0;
        const count = levelCounts.get(level) || 1;

        levelPositions.set(level, position + 1);

        return {
          ...task,
          level,
          x: level * 250 + 100,
          y: (position * 150) + (400 - (count * 75)) + 100,
        };
      }) || [];

      const graphEdges: DependencyEdge[] = deps.map(dep => ({
        from: dep.depends_on_task_id,
        to: dep.task_id,
        type: dep.dependency_type,
      }));

      setNodes(positionedNodes);
      setEdges(graphEdges);

      // Calculate critical path
      calculateCriticalPath(positionedNodes, graphEdges);
    } catch (error: any) {
      console.error('Error loading graph:', error);
      toast({
        title: "Error",
        description: "Failed to load dependency graph",
        variant: "destructive",
      });
    }
  };

  const calculateCriticalPath = (nodes: TaskNode[], edges: DependencyEdge[]) => {
    // Simple critical path: longest chain of blocking dependencies
    const adjList = new Map<string, string[]>();
    nodes.forEach(node => adjList.set(node.id, []));
    
    edges.filter(e => e.type === 'blocking').forEach(edge => {
      adjList.get(edge.from)?.push(edge.to);
    });

    let longestPath: string[] = [];
    
    const dfs = (nodeId: string, path: string[], visited: Set<string>) => {
      if (visited.has(nodeId)) return;
      
      visited.add(nodeId);
      path.push(nodeId);
      
      if (path.length > longestPath.length) {
        longestPath = [...path];
      }
      
      adjList.get(nodeId)?.forEach(neighbor => {
        dfs(neighbor, path, visited);
      });
      
      path.pop();
      visited.delete(nodeId);
    };

    nodes.forEach(node => {
      if (node.level === 0) {
        dfs(node.id, [], new Set());
      }
    });

    setCriticalPath({
      tasks: longestPath,
      duration: longestPath.length,
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(2, prev * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'in_progress': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Task Dependency Graph
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {criticalPath && criticalPath.tasks.length > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Critical Path: {criticalPath.tasks.length} tasks in longest dependency chain
            </AlertDescription>
          </Alert>
        )}

        <div 
          className="relative w-full h-[calc(90vh-200px)] bg-muted/20 rounded-lg overflow-hidden cursor-move"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            width="100%"
            height="100%"
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
              transformOrigin: '0 0',
            }}
          >
            {/* Draw edges */}
            {edges.map((edge, i) => {
              const fromNode = nodes.find(n => n.id === edge.from);
              const toNode = nodes.find(n => n.id === edge.to);
              if (!fromNode || !toNode) return null;

              const isCritical = criticalPath?.tasks.includes(edge.from) && 
                                 criticalPath?.tasks.includes(edge.to);

              return (
                <g key={i}>
                  <line
                    x1={fromNode.x + 100}
                    y1={fromNode.y + 40}
                    x2={toNode.x}
                    y2={toNode.y + 40}
                    stroke={isCritical ? '#ef4444' : (edge.type === 'blocking' ? '#3b82f6' : '#94a3b8')}
                    strokeWidth={isCritical ? 3 : 2}
                    strokeDasharray={edge.type === 'informational' ? '5,5' : undefined}
                    markerEnd="url(#arrowhead)"
                  />
                </g>
              );
            })}

            {/* Arrow marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#3b82f6" />
              </marker>
            </defs>

            {/* Draw nodes */}
            {nodes.map((node) => {
              const isCritical = criticalPath?.tasks.includes(node.id);
              
              return (
                <g key={node.id}>
                  <rect
                    x={node.x}
                    y={node.y}
                    width={200}
                    height={80}
                    rx={8}
                    fill={isCritical ? '#fef2f2' : '#ffffff'}
                    stroke={isCritical ? '#ef4444' : getStatusColor(node.status)}
                    strokeWidth={isCritical ? 3 : 2}
                  />
                  <foreignObject x={node.x} y={node.y} width={200} height={80}>
                    <div className="p-3 h-full flex flex-col justify-between">
                      <div className="text-xs font-medium truncate" title={node.title}>
                        {node.title}
                      </div>
                      <div className="flex gap-1">
                        <Badge 
                          style={{ 
                            backgroundColor: getStatusColor(node.status) + '20',
                            color: getStatusColor(node.status),
                            borderColor: getStatusColor(node.status) + '40',
                          }}
                          className="text-[10px] px-1 py-0"
                          variant="outline"
                        >
                          {node.status}
                        </Badge>
                        <Badge 
                          style={{ 
                            backgroundColor: getPriorityColor(node.priority) + '20',
                            color: getPriorityColor(node.priority),
                            borderColor: getPriorityColor(node.priority) + '40',
                          }}
                          className="text-[10px] px-1 py-0"
                          variant="outline"
                        >
                          {node.priority}
                        </Badge>
                      </div>
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Network className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>No tasks with dependencies yet</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500" />
            <span>Blocking</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-slate-400 border-dashed border-t-2" />
            <span>Informational</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500" style={{ height: '3px' }} />
            <span>Critical Path</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
