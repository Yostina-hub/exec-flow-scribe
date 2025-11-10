import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Sparkles, ChevronRight, AlertCircle, BookOpen, Inbox } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function ExecutiveAdvisor() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Section - Ethio Telecom Branded */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(86,53%,51%)] via-[hsl(198,100%,37%)] to-[hsl(86,53%,35%)] p-8 lg:p-12 text-white shadow-2xl">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(86,53%,51%)]/20 to-[hsl(198,100%,37%)]/20 animate-pulse"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl glass backdrop-blur-xl border-white/30 bg-white/10">
                <Brain className="h-8 w-8 animate-pulse drop-shadow-lg" />
              </div>
              <Badge variant="secondary" className="text-sm px-3 py-1 bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30">
                AI-Powered Intelligence
              </Badge>
            </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-display font-bold mb-4 drop-shadow-lg">
            Executive Intelligence Hub
          </h1>
          <p className="text-lg lg:text-xl text-white/95 max-w-2xl mb-8 drop-shadow-md">
            Your AI-powered workspace for document intelligence and strategic insights powered by Ethiopian Telecom innovation.
          </p>
        </div>
      </div>

      {/* AI Tools Cards */}
      <div className="space-y-6">
        {/* NotebookLM Library Card */}
        <Card 
          className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border-2 hover:border-primary/50 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10"
          onClick={() => navigate('/notebooks-library')}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <BookOpen className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">NotebookLM Library</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    AI-powered research and analysis workspace. Chat with your documents, meetings, and sources using advanced AI.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI Chat
                    </Badge>
                    <Badge variant="secondary" className="text-xs">Document Analysis</Badge>
                    <Badge variant="secondary" className="text-xs">Meeting Insights</Badge>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </CardContent>
        </Card>

        {/* Executive Inbox Card */}
        <Card 
          className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border-2 hover:border-primary/50 bg-gradient-to-br from-orange-500/10 via-red-500/10 to-pink-500/10"
          onClick={() => navigate('/executive-inbox')}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Inbox className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">Executive Inbox</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    AI-prioritized documents requiring your attention with smart urgency indicators and recommended response deadlines.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Priority Scoring
                    </Badge>
                    <Badge variant="secondary" className="text-xs">Urgency Tracking</Badge>
                    <Badge variant="secondary" className="text-xs">Smart Deadlines</Badge>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
