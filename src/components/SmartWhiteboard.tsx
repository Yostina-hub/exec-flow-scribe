import { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Paintbrush,
  Eraser,
  Square,
  Circle,
  Type,
  Image,
  Undo,
  Redo,
  Download,
  Trash2,
  Palette,
  PenTool,
  MousePointer
} from 'lucide-react';

interface SmartWhiteboardProps {
  meetingId: string;
  currentUserId: string;
}

interface DrawingAction {
  type: 'draw' | 'erase' | 'shape' | 'text';
  data: any;
  userId: string;
  timestamp: number;
}

export function SmartWhiteboard({ meetingId, currentUserId }: SmartWhiteboardProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'shape' | 'text' | 'select'>('pen');
  const [color, setColor] = useState('#3b82f6');
  const [lineWidth, setLineWidth] = useState(3);
  const [history, setHistory] = useState<DrawingAction[]>([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, { x: number; y: number; color: string }>>(new Map());

  useEffect(() => {
    setupCanvas();
    setupRealtimeSync();
  }, [meetingId]);

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Set default drawing properties
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
  };

  const setupRealtimeSync = () => {
    const channel = supabase
      .channel(`whiteboard-${meetingId}`)
      .on('broadcast', { event: 'draw' }, ({ payload }) => {
        if (payload.userId !== currentUserId) {
          applyRemoteDrawing(payload);
        }
      })
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (payload.userId !== currentUserId) {
          updateRemoteCursor(payload.userId, payload.x, payload.y, payload.color);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) {
      // Update cursor position for others
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      broadcastCursor(x, y);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 3 : lineWidth;

    ctx.lineTo(x, y);
    ctx.stroke();

    // Broadcast drawing to other participants
    broadcastDrawing({
      type: 'draw',
      x,
      y,
      color: ctx.strokeStyle,
      lineWidth: ctx.lineWidth
    });
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.closePath();

    // Save to history
    const action: DrawingAction = {
      type: 'draw',
      data: canvas.toDataURL(),
      userId: currentUserId,
      timestamp: Date.now()
    };
    
    setHistory(prev => [...prev.slice(0, historyStep + 1), action]);
    setHistoryStep(prev => prev + 1);
  };

  const broadcastDrawing = async (data: any) => {
    const channel = supabase.channel(`whiteboard-${meetingId}`);
    await channel.send({
      type: 'broadcast',
      event: 'draw',
      payload: {
        ...data,
        userId: currentUserId
      }
    });
  };

  const broadcastCursor = async (x: number, y: number) => {
    const channel = supabase.channel(`whiteboard-${meetingId}`);
    await channel.send({
      type: 'broadcast',
      event: 'cursor',
      payload: {
        userId: currentUserId,
        x,
        y,
        color
      }
    });
  };

  const applyRemoteDrawing = (data: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.lineWidth;
    ctx.lineTo(data.x, data.y);
    ctx.stroke();
  };

  const updateRemoteCursor = (userId: string, x: number, y: number, cursorColor: string) => {
    setRemoteCursors(prev => {
      const newMap = new Map(prev);
      newMap.set(userId, { x, y, color: cursorColor });
      return newMap;
    });

    // Remove cursor after 2 seconds of inactivity
    setTimeout(() => {
      setRemoteCursors(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    }, 2000);
  };

  const undo = () => {
    if (historyStep <= 0) return;
    
    setHistoryStep(prev => prev - 1);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = history[historyStep - 1]?.data || '';
  };

  const redo = () => {
    if (historyStep >= history.length - 1) return;
    
    setHistoryStep(prev => prev + 1);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new window.Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = history[historyStep + 1]?.data || '';
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
    setHistoryStep(0);

    toast({
      title: "Canvas cleared",
      description: "All drawings have been removed",
    });
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `whiteboard-${meetingId}-${Date.now()}.png`;
    link.href = url;
    link.click();

    toast({
      title: "Downloaded",
      description: "Whiteboard saved as image",
    });
  };

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#000000'];
  const lineWidths = [2, 3, 5, 8];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Paintbrush className="h-5 w-5" />
          Smart Whiteboard
        </CardTitle>
        <CardDescription>Collaborative real-time drawing and brainstorming</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap p-3 bg-muted/50 rounded-lg">
          <div className="flex gap-1">
            <Button
              variant={tool === 'pen' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('pen')}
            >
              <PenTool className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'eraser' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('eraser')}
            >
              <Eraser className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'select' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTool('select')}
            >
              <MousePointer className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex gap-1">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-all ${
                  color === c ? 'border-primary scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex gap-1">
            {lineWidths.map((w) => (
              <Button
                key={w}
                variant={lineWidth === w ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLineWidth(w)}
              >
                <div 
                  className="rounded-full bg-current"
                  style={{ width: `${w * 2}px`, height: `${w * 2}px` }}
                />
              </Button>
            ))}
          </div>

          <div className="h-6 w-px bg-border" />

          <Button variant="outline" size="sm" onClick={undo} disabled={historyStep <= 0}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={historyStep >= history.length - 1}>
            <Redo className="h-4 w-4" />
          </Button>
          
          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={downloadCanvas}>
            <Download className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="destructive" size="sm" onClick={clearCanvas}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative rounded-lg border-2 border-dashed border-muted-foreground/20 bg-white overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="w-full h-full cursor-crosshair"
            style={{ touchAction: 'none' }}
          />

          {/* Remote Cursors */}
          {Array.from(remoteCursors.entries()).map(([userId, cursor]) => (
            <div
              key={userId}
              className="absolute w-3 h-3 rounded-full pointer-events-none transition-all duration-100"
              style={{
                left: cursor.x,
                top: cursor.y,
                backgroundColor: cursor.color,
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 10px ${cursor.color}`
              }}
            />
          ))}

          {/* Active Users Badge */}
          <Badge 
            variant="secondary" 
            className="absolute top-3 right-3 backdrop-blur-sm"
          >
            {remoteCursors.size + 1} active
          </Badge>
        </div>

        {/* Quick Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Real-time collaboration enabled</span>
          <span>{history.length} actions saved</span>
        </div>
      </CardContent>
    </Card>
  );
}
