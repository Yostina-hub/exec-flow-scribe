import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileText, MessageSquare, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface SearchResult {
  type: 'transcription' | 'minute' | 'agenda';
  content: string;
  timestamp?: string;
  speaker?: string;
  created_at?: string;
  title?: string;
  matchedKeywords: string[];
}

interface MeetingKeywordSearchProps {
  meetingId: string;
}

export const MeetingKeywordSearch = ({ meetingId }: MeetingKeywordSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [searchQuery, meetingId]);

  const performSearch = async () => {
    setIsSearching(true);
    try {
      const keywords = searchQuery.toLowerCase().split(' ').filter(k => k.length >= 2);
      const foundResults: SearchResult[] = [];

      // Search transcriptions
      const { data: transcriptions } = await supabase
        .from('transcriptions')
        .select('content, speaker_name, timestamp')
        .eq('meeting_id', meetingId);

      if (transcriptions) {
        transcriptions.forEach((trans) => {
          const contentLower = trans.content.toLowerCase();
          const matched = keywords.filter(k => contentLower.includes(k));
          if (matched.length > 0) {
            foundResults.push({
              type: 'transcription',
              content: trans.content,
              speaker: trans.speaker_name,
              timestamp: trans.timestamp,
              matchedKeywords: matched,
            });
          }
        });
      }

      // Search minutes
      const { data: minutes } = await supabase
        .from('minutes_versions')
        .select('content, created_at')
        .eq('meeting_id', meetingId);

      if (minutes) {
        minutes.forEach((minute) => {
          const contentLower = minute.content.toLowerCase();
          const matched = keywords.filter(k => contentLower.includes(k));
          if (matched.length > 0) {
            // Split content into paragraphs and find matching ones
            const paragraphs = minute.content.split('\n\n');
            paragraphs.forEach((para) => {
              if (para.length > 20 && keywords.some(k => para.toLowerCase().includes(k))) {
                foundResults.push({
                  type: 'minute',
                  content: para,
                  created_at: minute.created_at,
                  matchedKeywords: matched,
                });
              }
            });
          }
        });
      }

      // Search agenda items
      const { data: agendaItems } = await supabase
        .from('agenda_items')
        .select('title, description')
        .eq('meeting_id', meetingId);

      if (agendaItems) {
        agendaItems.forEach((item) => {
          const searchText = `${item.title} ${item.description || ''}`.toLowerCase();
          const matched = keywords.filter(k => searchText.includes(k));
          if (matched.length > 0) {
            foundResults.push({
              type: 'agenda',
              title: item.title,
              content: item.description || '',
              matchedKeywords: matched,
            });
          }
        });
      }

      // Sort by relevance (number of matched keywords)
      foundResults.sort((a, b) => b.matchedKeywords.length - a.matchedKeywords.length);
      setResults(foundResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const highlightKeywords = (text: string, keywords: string[]) => {
    let highlighted = text;
    keywords.forEach((keyword) => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark class="bg-primary/30 px-1 rounded">$1</mark>');
    });
    return highlighted;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'transcription':
        return <MessageSquare className="h-4 w-4" />;
      case 'minute':
        return <FileText className="h-4 w-4" />;
      case 'agenda':
        return <Clock className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'transcription':
        return 'Transcript';
      case 'minute':
        return 'Minutes';
      case 'agenda':
        return 'Agenda';
      default:
        return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Keyword Search
        </CardTitle>
        <CardDescription>
          Search across transcripts, minutes, and agenda items
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search for keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Type at least 2 characters to search
          </p>
        )}

        {searchQuery.length >= 2 && (
          <ScrollArea className="h-[400px] pr-4">
            {isSearching ? (
              <p className="text-sm text-muted-foreground text-center py-8">Searching...</p>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No results found for "{searchQuery}"
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Found {results.length} result{results.length !== 1 ? 's' : ''}
                </p>
                {results.map((result, idx) => (
                  <Card key={idx} className="border-primary/20">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="gap-1">
                          {getTypeIcon(result.type)}
                          {getTypeLabel(result.type)}
                        </Badge>
                        {result.speaker && (
                          <Badge variant="outline">{result.speaker}</Badge>
                        )}
                        {result.timestamp && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(result.timestamp), { addSuffix: true })}
                          </span>
                        )}
                        {result.created_at && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      {result.title && (
                        <h4 className="font-medium text-sm">{result.title}</h4>
                      )}
                      <p
                        className="text-sm text-muted-foreground leading-relaxed"
                        dangerouslySetInnerHTML={{
                          __html: highlightKeywords(
                            result.content.substring(0, 200) + (result.content.length > 200 ? '...' : ''),
                            result.matchedKeywords
                          )
                        }}
                      />
                      <div className="flex gap-1 flex-wrap">
                        {result.matchedKeywords.map((kw, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
