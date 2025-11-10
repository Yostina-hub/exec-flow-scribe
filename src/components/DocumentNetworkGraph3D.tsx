import { useRef, useState, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Sphere, Line } from "@react-three/drei";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { 
  Network, 
  RefreshCw, 
  Loader2,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DocumentNode {
  id: string;
  title: string;
  urgency: string;
  priority: number;
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
}

interface RelationshipEdge {
  source: string;
  target: string;
  type: string;
  strength: number;
}

const Node = ({ 
  node, 
  onClick, 
  isSelected 
}: { 
  node: DocumentNode; 
  onClick: () => void;
  isSelected: boolean;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current && (hovered || isSelected)) {
      meshRef.current.scale.lerp(
        new THREE.Vector3(1.5, 1.5, 1.5),
        0.1
      );
    } else if (meshRef.current) {
      meshRef.current.scale.lerp(
        new THREE.Vector3(1, 1, 1),
        0.1
      );
    }
  });

  const getNodeSize = () => {
    if (node.urgency === "critical") return 0.8;
    if (node.urgency === "high") return 0.6;
    return 0.4;
  };

  return (
    <group position={node.position}>
      <Sphere
        ref={meshRef}
        args={[getNodeSize(), 32, 32]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={node.color}
          emissive={node.color}
          emissiveIntensity={hovered || isSelected ? 0.5 : 0.2}
          metalness={0.3}
          roughness={0.4}
        />
      </Sphere>
      
      {(hovered || isSelected) && (
        <Text
          position={[0, getNodeSize() + 0.5, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          {node.title.substring(0, 30)}
        </Text>
      )}
    </group>
  );
};

const Edge = ({ 
  start, 
  end, 
  strength,
  type 
}: { 
  start: number[]; 
  end: number[];
  strength: number;
  type: string;
}) => {
  const getEdgeColor = () => {
    switch (type) {
      case "follow_up": return "#3b82f6";
      case "contradicts": return "#ef4444";
      case "supports": return "#10b981";
      case "similar_topic": return "#a855f7";
      case "referenced_in": return "#f97316";
      case "prerequisite": return "#eab308";
      default: return "#6b7280";
    }
  };

  return (
    <Line
      points={[start as any, end as any]}
      color={getEdgeColor()}
      lineWidth={strength * 2}
      transparent
      opacity={0.4}
    />
  );
};

const NetworkGraph = ({ 
  nodes, 
  edges, 
  onNodeClick,
  selectedNodeId 
}: { 
  nodes: DocumentNode[]; 
  edges: RelationshipEdge[];
  onNodeClick: (nodeId: string) => void;
  selectedNodeId: string | null;
}) => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {edges.map((edge, idx) => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (!sourceNode || !targetNode) return null;
        
        return (
          <Edge
            key={idx}
            start={sourceNode.position}
            end={targetNode.position}
            strength={edge.strength}
            type={edge.type}
          />
        );
      })}
      
      {nodes.map(node => (
        <Node
          key={node.id}
          node={node}
          onClick={() => onNodeClick(node.id)}
          isSelected={selectedNodeId === node.id}
        />
      ))}
      
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        minDistance={5}
        maxDistance={50}
      />
    </>
  );
};

export const DocumentNetworkGraph3D = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: graphData, isLoading, refetch } = useQuery({
    queryKey: ["document-network-3d"],
    queryFn: async () => {
      try {
        // Fetch documents with insights - simplified query
        const { data: insightsData, error: insightsError } = await (supabase as any)
          .from("notebook_intelligence_insights")
          .select("id, source_id, insights, priority_score, urgency_level")
          .eq("requires_action", true)
          .eq("user_id", user?.id || "")
          .limit(30);

        if (insightsError) throw insightsError;

        // Fetch source titles separately
        const sourceIds = (insightsData || []).map((i: any) => i.source_id);
        const { data: sourcesData, error: sourcesError } = await (supabase as any)
          .from("notebook_sources")
          .select("id, title")
          .in("id", sourceIds);

        if (sourcesError) throw sourcesError;

        // Combine the data
        const insights = (insightsData || []).map((insight: any) => ({
          ...insight,
          notebook_sources: (sourcesData || []).find((s: any) => s.id === insight.source_id)
        }));

        // Fetch relationships
        const { data: relationships, error: relError } = await (supabase as any)
          .from("notebook_document_relationships")
          .select("source_document_id, related_document_id, relationship_type, relationship_strength")
          .eq("user_id", user?.id || "");

        if (relError) throw relError;

        return { 
          insights: insights as any[], 
          relationships: (relationships || []) as any[] 
        };
      } catch (error) {
        console.error("Error fetching graph data:", error);
        throw error;
      }
    },
  });

  const { nodes, edges } = useMemo(() => {
    if (!graphData?.insights) return { nodes: [], edges: [] };

    // Filter nodes by urgency
    const filteredInsights = urgencyFilter === "all" 
      ? graphData.insights 
      : graphData.insights.filter((i: any) => i.urgency_level === urgencyFilter);

    // Create nodes with force-directed layout
    const nodeMap = new Map();
    const processedNodes: DocumentNode[] = filteredInsights.map((insight: any, idx: number) => {
      const angle = (idx / filteredInsights.length) * Math.PI * 2;
      const radius = 8;
      
      const getColor = () => {
        switch (insight.urgency_level) {
          case "critical": return "#ef4444";
          case "high": return "#f97316";
          case "medium": return "#eab308";
          case "low": return "#10b981";
          default: return "#6b7280";
        }
      };

      const node: DocumentNode = {
        id: insight.source_id,
        title: insight.notebook_sources?.title || "Untitled",
        urgency: insight.urgency_level,
        priority: insight.priority_score,
        position: [
          Math.cos(angle) * radius,
          Math.sin(angle) * radius * 0.5,
          Math.sin(angle * 2) * 3
        ],
        velocity: [0, 0, 0],
        color: getColor(),
      };

      nodeMap.set(node.id, node);
      return node;
    });

    // Create edges from relationships
    const processedEdges: RelationshipEdge[] = (graphData.relationships || [])
      .filter((rel: any) => 
        nodeMap.has(rel.source_document_id) && 
        nodeMap.has(rel.related_document_id)
      )
      .map((rel: any) => ({
        source: rel.source_document_id,
        target: rel.related_document_id,
        type: rel.relationship_type,
        strength: rel.relationship_strength,
      }));

    // Apply simple force-directed layout
    for (let i = 0; i < 50; i++) {
      // Repulsion between nodes
      for (let j = 0; j < processedNodes.length; j++) {
        for (let k = j + 1; k < processedNodes.length; k++) {
          const node1 = processedNodes[j];
          const node2 = processedNodes[k];
          
          const dx = node2.position[0] - node1.position[0];
          const dy = node2.position[1] - node1.position[1];
          const dz = node2.position[2] - node1.position[2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          if (distance < 3) {
            const force = (3 - distance) * 0.1;
            const angle = Math.atan2(dy, dx);
            const angleZ = Math.atan2(dz, dx);
            
            node1.position[0] -= Math.cos(angle) * force;
            node1.position[1] -= Math.sin(angle) * force;
            node1.position[2] -= Math.sin(angleZ) * force;
            
            node2.position[0] += Math.cos(angle) * force;
            node2.position[1] += Math.sin(angle) * force;
            node2.position[2] += Math.sin(angleZ) * force;
          }
        }
      }

      // Attraction along edges
      processedEdges.forEach(edge => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        
        if (sourceNode && targetNode) {
          const dx = targetNode.position[0] - sourceNode.position[0];
          const dy = targetNode.position[1] - sourceNode.position[1];
          const dz = targetNode.position[2] - sourceNode.position[2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          
          const force = (distance - 5) * 0.01 * edge.strength;
          const angle = Math.atan2(dy, dx);
          const angleZ = Math.atan2(dz, dx);
          
          sourceNode.position[0] += Math.cos(angle) * force;
          sourceNode.position[1] += Math.sin(angle) * force;
          sourceNode.position[2] += Math.sin(angleZ) * force;
          
          targetNode.position[0] -= Math.cos(angle) * force;
          targetNode.position[1] -= Math.sin(angle) * force;
          targetNode.position[2] -= Math.sin(angleZ) * force;
        }
      });
    }

    return { nodes: processedNodes, edges: processedEdges };
  }, [graphData, urgencyFilter]);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    navigate(`/notebooks?source=${nodeId}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            3D Document Network
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            3D Document Network
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => refetch()}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-orange-500" />
            <span className="text-xs text-muted-foreground">High</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-muted-foreground">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Low</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {nodes.length === 0 ? (
          <div className="text-center py-8">
            <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No documents to visualize
            </p>
          </div>
        ) : (
          <div className={isFullscreen ? "h-[calc(100vh-140px)]" : "h-[600px]"}>
            <Canvas camera={{ position: [0, 0, 20], fov: 60 }}>
              <Suspense fallback={null}>
                <NetworkGraph
                  nodes={nodes}
                  edges={edges}
                  onNodeClick={handleNodeClick}
                  selectedNodeId={selectedNode}
                />
              </Suspense>
            </Canvas>
          </div>
        )}
        
        <div className="mt-4 text-xs text-muted-foreground text-center">
          <p>Click and drag to rotate • Scroll to zoom • Click nodes to view documents</p>
          <p className="mt-1">{nodes.length} documents • {edges.length} relationships</p>
        </div>
      </CardContent>
    </Card>
  );
};
