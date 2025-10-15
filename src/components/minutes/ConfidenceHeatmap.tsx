import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface Segment {
  id: string;
  confidence: number;
  speaker: string;
  timestamp: string;
}

interface ConfidenceHeatmapProps {
  segments: Segment[];
}

export function ConfidenceHeatmap({ segments }: ConfidenceHeatmapProps) {
  const lowConfidenceSegments = segments.filter(s => s.confidence < 0.7);
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-500';
    if (confidence >= 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Confidence Heatmap</h3>
          {lowConfidenceSegments.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span>{lowConfidenceSegments.length} low confidence segments</span>
            </div>
          )}
        </div>

        {/* Heatmap visualization */}
        <div className="flex gap-1 h-8">
          {segments.map((segment) => (
            <div
              key={segment.id}
              className={`flex-1 rounded-sm transition-opacity hover:opacity-70 cursor-pointer ${getConfidenceColor(
                segment.confidence
              )}`}
              title={`${segment.speaker} - ${(segment.confidence * 100).toFixed(0)}% confidence`}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span>High (&gt;90%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-yellow-500" />
            <span>Medium (70-90%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span>Low (&lt;70%)</span>
          </div>
        </div>

        {/* Low confidence segments list */}
        {lowConfidenceSegments.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-xs font-semibold">Segments Needing Review:</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {lowConfidenceSegments.map((segment) => (
                <div
                  key={segment.id}
                  className="text-xs p-2 rounded bg-muted hover:bg-muted/80 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{segment.speaker}</span>
                    <span className="text-muted-foreground">{segment.timestamp}</span>
                  </div>
                  <div className="text-destructive">
                    {(segment.confidence * 100).toFixed(0)}% confidence
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
