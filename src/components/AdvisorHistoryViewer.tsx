import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { History, MessageCircle, Calendar, Clock, Sparkles, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';

interface AdvisorHistoryViewerProps {
  meetingId: string;
  currentConversationId: string | null;
}

interface Conversation {
  id: string;
  started_at: string;
  ended_at: string | null;
  session_summary: string | null;
  key_insights: any;
  message_count: number;
}

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp: string;
}

export function AdvisorHistoryViewer({ meetingId, currentConversationId }: AdvisorHistoryViewerProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, [meetingId]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('advisor_conversations')
        .select(`
          id,
          started_at,
          ended_at,
          session_summary,
          key_insights,
          advisor_messages(count)
        `)
        .eq('meeting_id', meetingId)
        .order('started_at', { ascending: false });

      if (error) throw error;

      const conversationsWithCount = data?.map(conv => ({
        id: conv.id,
        started_at: conv.started_at,
        ended_at: conv.ended_at,
        session_summary: conv.session_summary,
        key_insights: conv.key_insights,
        message_count: (conv.advisor_messages as any)?.[0]?.count || 0
      })) || [];

      setConversations(conversationsWithCount);
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('advisor_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setMessages((data || []).map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      })));
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading conversation history...</p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <History className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-xl font-semibold mb-2">No Conversation History</h3>
          <p className="text-muted-foreground">
            Your advisor conversations will appear here. They are automatically saved for future reference.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
      {/* Conversations List */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Past Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="space-y-2 p-4">
              {conversations.map((conv) => (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedConversation === conv.id
                        ? 'ring-2 ring-primary bg-primary/5'
                        : conv.id === currentConversationId
                        ? 'bg-green-50 border-green-200'
                        : ''
                    }`}
                    onClick={() => setSelectedConversation(conv.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {new Date(conv.started_at).toLocaleDateString()}
                          </span>
                        </div>
                        {conv.id === currentConversationId && (
                          <Badge variant="default" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(conv.started_at), { addSuffix: true })}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {conv.message_count} messages
                        </span>
                        {conv.key_insights && Array.isArray(conv.key_insights) && conv.key_insights.length > 0 && (
                          <span className="flex items-center gap-1 text-primary">
                            <Sparkles className="h-3 w-3" />
                            {conv.key_insights.length} insights
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Messages View */}
      <Card className="col-span-2 border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {selectedConversation ? 'Conversation Details' : 'Select a Session'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedConversation ? (
            <div className="flex flex-col items-center justify-center h-[600px] text-center">
              <ChevronRight className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                Select a conversation from the list to view details and messages
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Key Insights */}
              {(() => {
                const conv = conversations.find(c => c.id === selectedConversation);
                const insights = Array.isArray(conv?.key_insights) ? conv.key_insights : [];
                return insights.length > 0 && (
                  <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-primary/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Key Insights from Session
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {insights.map((insight: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-2 p-2 bg-white/50 rounded-lg">
                            <Badge variant="outline" className="mt-0.5">
                              {insight.category}
                            </Badge>
                            <p className="text-sm flex-1">{insight.content}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })()}

              <Separator />

              {/* Messages */}
              <ScrollArea className="h-[450px] pr-4">
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: msg.role === 'user' ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl p-4 ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white'
                            : 'bg-muted border border-border'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </p>
                        <p className="text-xs opacity-60 mt-2">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
