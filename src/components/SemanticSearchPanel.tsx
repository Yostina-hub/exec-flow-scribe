import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Brain, Clock, User, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SearchResult {
  id: string;
  content: string;
  speaker_name: string;
  ts: string;
  similarity: number;
  emotion?: {
    primary_emotion: string;
    sentiment: string;
    energy_level: string;
  };
}

interface SemanticSearchPanelProps {
  meetingId?: string;
  onResultClick?: (timestamp: string) => void;
}

export function SemanticSearchPanel({ meetingId, onResultClick }: SemanticSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [emotionFilter, setEmotionFilter] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const { toast } = useToast();

  const performSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Enter a search query",
        description: "Please type something to search for",
        variant: "destructive",
      });
      return;
    }

    setSearching(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: {
          query: query.trim(),
          meetingId: meetingId,
          emotionFilter: emotionFilter || undefined,
          limit: 15,
        },
      });

      if (error) throw error;

      if (data.success) {
        setResults(data.results);
        toast({
          title: "Search complete",
          description: `Found ${data.results.length} semantic matches`,
        });
      }
    } catch (error: any) {
      console.error('Semantic search error:', error);
      toast({
        title: "Search failed",
        description: error.message || "Could not perform semantic search",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <CardTitle>Semantic Search</CardTitle>
        </div>
        <CardDescription>
          AI-powered search across transcriptions - find meaning, not just keywords
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="e.g., 'moments of tension during budget discussion'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && performSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={performSearch} disabled={searching}>
            {searching ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={emotionFilter} onValueChange={setEmotionFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by emotion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All emotions</SelectItem>
              <SelectItem value="joy">Joy</SelectItem>
              <SelectItem value="confidence">Confidence</SelectItem>
              <SelectItem value="anxiety">Anxiety</SelectItem>
              <SelectItem value="frustration">Frustration</SelectItem>
              <SelectItem value="anger">Anger</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        <ScrollArea className="h-[400px] w-full pr-4">
          {results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Enter a query to start semantic search</p>
              <p className="text-sm mt-1">Find conversations by meaning, tone, or context</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((result) => (
                <Card
                  key={result.id}
                  className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => onResultClick?.(result.ts)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-3.5 h-3.5" />
                        <span className="font-medium">{result.speaker_name || 'Unknown'}</span>
                        <Clock className="w-3.5 h-3.5 ml-2" />
                        <span>{new Date(result.ts).toLocaleTimeString()}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(result.similarity * 100)}% match
                      </Badge>
                    </div>
                    
                    <p className="text-sm leading-relaxed">{result.content}</p>
                    
                    {result.emotion && (
                      <div className="flex gap-2 pt-2">
                        <Badge variant="outline" className="text-xs">
                          {result.emotion.primary_emotion}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getSentimentColor(result.emotion.sentiment)}`}
                        >
                          {result.emotion.sentiment}
                        </Badge>
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {result.emotion.energy_level} energy
                        </Badge>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Tips */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p className="font-medium mb-1">💡 Search tips:</p>
          <ul className="space-y-0.5 ml-4">
            <li>• Search by concept: "disagreements about timeline"</li>
            <li>• Filter by emotion: "anxious moments"</li>
            <li>• Context-aware: "when they discussed budget concerns"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
