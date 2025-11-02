import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Search, Star, Download, Filter, User, Clock, Sparkles } from 'lucide-react';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Transcription {
  id: string;
  content: string;
  speaker_name: string | null;
  timestamp: string;
  confidence_score: number | null;
  detected_language?: string;
}

interface EnhancedTranscriptionDisplayProps {
  transcriptions: Transcription[];
  onHighlight?: (transcriptionId: string, content: string) => void;
  isRecording?: boolean;
}

const SPEAKER_COLORS = [
  'from-blue-500/20 to-blue-500/5 border-blue-500/30',
  'from-purple-500/20 to-purple-500/5 border-purple-500/30',
  'from-green-500/20 to-green-500/5 border-green-500/30',
  'from-orange-500/20 to-orange-500/5 border-orange-500/30',
  'from-pink-500/20 to-pink-500/5 border-pink-500/30',
  'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30',
];

export const EnhancedTranscriptionDisplay = ({
  transcriptions,
  onHighlight,
  isRecording = false
}: EnhancedTranscriptionDisplayProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());

  // Extract unique speakers
  const speakers = useMemo(() => {
    return [...new Set(transcriptions.map(t => t.speaker_name || 'Unknown'))];
  }, [transcriptions]);

  // Get speaker color
  const getSpeakerColor = (speaker: string) => {
    const index = speakers.indexOf(speaker);
    return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
  };

  // Filter transcriptions
  const filteredTranscriptions = useMemo(() => {
    return transcriptions.filter(t => {
      const matchesSearch = searchQuery === '' || 
        t.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSpeaker = selectedSpeaker === null || 
        (t.speaker_name || 'Unknown') === selectedSpeaker;
      return matchesSearch && matchesSpeaker;
    });
  }, [transcriptions, searchQuery, selectedSpeaker]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleHighlight = (transcriptionId: string, content: string) => {
    setHighlightedIds(prev => new Set([...prev, transcriptionId]));
    onHighlight?.(transcriptionId, content);
  };

  const exportTranscription = () => {
    const text = filteredTranscriptions
      .map(t => `[${formatTime(t.timestamp)}] ${t.speaker_name || 'Unknown'}: ${t.content}`)
      .join('\n\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcription-${new Date().toISOString()}.txt`;
    a.click();
  };

  return (
    <Card className="border-2">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-background">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Live Transcription
            </CardTitle>
            <CardDescription className="mt-1">
              AI-powered real-time speech-to-text with speaker detection
            </CardDescription>
          </div>
          {isRecording && (
            <Badge variant="destructive" className="gap-2 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-white" />
              Recording
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        {/* Search and Filter Bar */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transcription..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={exportTranscription}
            disabled={filteredTranscriptions.length === 0}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Speaker Filter */}
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={selectedSpeaker === null ? "default" : "outline"}
            onClick={() => setSelectedSpeaker(null)}
            className="gap-2"
          >
            <Filter className="h-3 w-3" />
            All Speakers
          </Button>
          {speakers.map(speaker => (
            <Button
              key={speaker}
              size="sm"
              variant={selectedSpeaker === speaker ? "default" : "outline"}
              onClick={() => setSelectedSpeaker(speaker === selectedSpeaker ? null : speaker)}
              className="gap-2"
            >
              <User className="h-3 w-3" />
              {speaker}
            </Button>
          ))}
        </div>

        <Separator />

        {/* Transcription List */}
        <ScrollArea className="h-[500px] pr-4">
          <AnimatePresence>
            {filteredTranscriptions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-muted-foreground"
              >
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">
                  {searchQuery || selectedSpeaker 
                    ? 'No transcriptions match your filters' 
                    : 'Start recording to see live transcription'}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {filteredTranscriptions.map((transcript, index) => (
                  <motion.div
                    key={transcript.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="group"
                  >
                    <div
                      className={cn(
                        "relative p-4 rounded-lg border-l-4 bg-gradient-to-r transition-all hover:shadow-md",
                        getSpeakerColor(transcript.speaker_name || 'Unknown'),
                        highlightedIds.has(transcript.id) && "ring-2 ring-yellow-500/50"
                      )}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="gap-1">
                            <User className="h-3 w-3" />
                            {transcript.speaker_name || 'Unknown Speaker'}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(transcript.timestamp)}
                          </span>
                          {transcript.confidence_score && (
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(transcript.confidence_score * 100)}% confidence
                            </Badge>
                          )}
                          {transcript.detected_language && (
                            <Badge variant="secondary" className="text-xs">
                              {transcript.detected_language}
                            </Badge>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                          onClick={() => handleHighlight(transcript.id, transcript.content)}
                        >
                          <Star className={cn(
                            "h-3 w-3",
                            highlightedIds.has(transcript.id) && "fill-yellow-500 text-yellow-500"
                          )} />
                          Highlight
                        </Button>
                      </div>

                      {/* Content */}
                      <p className="text-sm leading-relaxed">
                        {transcript.content}
                      </p>
                    </div>

                    {index < filteredTranscriptions.length - 1 && (
                      <Separator className="my-2" />
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Stats Footer */}
        <div className="pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filteredTranscriptions.length} transcription{filteredTranscriptions.length !== 1 ? 's' : ''}
            {(searchQuery || selectedSpeaker) && ` (filtered)`}
          </span>
          <span>
            {speakers.length} speaker{speakers.length !== 1 ? 's' : ''} detected
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
