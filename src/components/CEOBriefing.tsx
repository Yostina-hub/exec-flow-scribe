import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  ChevronLeft,
  ChevronRight,
  X,
  TrendingUp,
  AlertTriangle,
  Target,
  CheckCircle2,
  Sparkles,
  BarChart3,
  ArrowRight,
  Loader2,
  Brain,
  Zap,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Timer,
  TimerOff
} from 'lucide-react';
import { toast } from 'sonner';

interface BriefingData {
  executive_summary: string;
  key_metrics: string[];
  strengths: string[];
  concerns: string[];
  priorities: string[];
  recommendations: string[];
  next_actions: string[];
  context?: any;
}

interface CEOBriefingProps {
  open: boolean;
  onClose: () => void;
}

export function CEOBriefing({ open, onClose }: CEOBriefingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [animating, setAnimating] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [presenterImage, setPresenterImage] = useState<string | null>(null);
  const [loadingPresenter, setLoadingPresenter] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const narratingRef = useRef(false);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      generateBriefing();
      generatePresenter();
    } else {
      // Full cleanup when closing
      stopNarration();
      clearAutoAdvanceTimer();
      setCurrentSlide(0);
      setVoiceEnabled(false);
      setIsPaused(false);
      setVoiceError(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && briefing && voiceEnabled && !loading) {
      narrateCurrentSlide();
    }
  }, [open, currentSlide, briefing, voiceEnabled, loading]);

  // Auto-advance timer (works independently of voice)
  useEffect(() => {
    clearAutoAdvanceTimer();
    
    if (open && briefing && autoAdvance && !loading && !isNarrating && currentSlide < slides.length - 1) {
      // Auto-advance after 12 seconds if not narrating
      autoAdvanceTimerRef.current = setTimeout(() => {
        setAnimating(true);
        setTimeout(() => {
          setCurrentSlide(prev => prev + 1);
          setAnimating(false);
        }, 150);
      }, 12000);
    }
    
    return () => clearAutoAdvanceTimer();
  }, [open, currentSlide, briefing, autoAdvance, loading, isNarrating]);

  const generateBriefing = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-executive-briefing', {
        body: {}
      });

      if (error) throw error;

      if (data?.briefing) {
        setBriefing(data.briefing);
      } else {
        throw new Error('No briefing data received');
      }
    } catch (error: any) {
      console.error('Failed to generate briefing:', error);
      toast.error('Failed to generate executive briefing');
    } finally {
      setLoading(false);
    }
  };

  const generatePresenter = async () => {
    setLoadingPresenter(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-presenter-image', {
        body: {}
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setPresenterImage(data.imageUrl);
      }
    } catch (error: any) {
      console.error('Failed to generate presenter:', error);
      // Don't show error toast, just fail silently
    } finally {
      setLoadingPresenter(false);
    }
  };

  const clearAutoAdvanceTimer = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  };

  const stopNarration = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsNarrating(false);
    setIsPaused(false);
    narratingRef.current = false;
  };

  const getNarrationText = (slideIndex: number): string => {
    if (!briefing) return '';
    
    const slideTexts = [
      `Executive Overview. ${briefing.executive_summary}`,
      `Key Performance Metrics. ${briefing.key_metrics.join('. ')}`,
      `Organizational Strengths and Achievements. ${briefing.strengths.join('. ')}`,
      `Areas of Concern and Risks. ${briefing.concerns.join('. ')}`,
      `Strategic Priorities and Focus Areas. ${briefing.priorities.join('. ')}`,
      `Strategic Recommendations. ${briefing.recommendations.join('. ')}`,
      `Immediate Next Actions. ${briefing.next_actions.join('. ')}. This concludes your executive briefing.`
    ];
    
    return slideTexts[slideIndex] || '';
  };

  const narrateCurrentSlide = async () => {
    if (!voiceEnabled || narratingRef.current) return;
    
    stopNarration();
    narratingRef.current = true;
    setIsNarrating(true);
    
    const text = getNarrationText(currentSlide);
    if (!text) {
      setIsNarrating(false);
      narratingRef.current = false;
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice: 'onyx' }
      });

      if (error) {
        console.error('TTS error:', error);
        setVoiceError('Voice narration unavailable. Please check API configuration.');
        setIsNarrating(false);
        narratingRef.current = false;
        setVoiceEnabled(false);
        return;
      }

      const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
      audioRef.current = audio;

      audio.onended = () => {
        setIsNarrating(false);
        narratingRef.current = false;
        // Auto-advance to next slide
        if (currentSlide < slides.length - 1) {
          setTimeout(() => {
            setCurrentSlide(prev => prev + 1);
          }, 1000);
        }
      };

      audio.onerror = () => {
        setIsNarrating(false);
        narratingRef.current = false;
      };

      await audio.play();
    } catch (error: any) {
      console.error('Narration error:', error);
      setIsNarrating(false);
      narratingRef.current = false;
      setVoiceEnabled(false);
      
      if (error.message?.includes('quota')) {
        setVoiceError('Voice quota exceeded. Please check your OpenAI billing.');
        toast.error('Voice narration quota exceeded');
      } else if (error.message?.includes('API key')) {
        setVoiceError('OpenAI API key not configured.');
        toast.error('Voice narration requires API key configuration');
      } else {
        setVoiceError('Voice narration unavailable.');
      }
    }
  };

  const togglePause = () => {
    if (!audioRef.current) return;
    
    if (isPaused) {
      audioRef.current.play();
      setIsPaused(false);
    } else {
      audioRef.current.pause();
      setIsPaused(true);
    }
  };

  const toggleVoice = () => {
    if (voiceEnabled) {
      stopNarration();
    } else {
      setVoiceError(null);
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      stopNarration();
      clearAutoAdvanceTimer();
      setAnimating(true);
      setTimeout(() => {
        setCurrentSlide(prev => prev + 1);
        setAnimating(false);
      }, 150);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      stopNarration();
      clearAutoAdvanceTimer();
      setAnimating(true);
      setTimeout(() => {
        setCurrentSlide(prev => prev - 1);
        setAnimating(false);
      }, 150);
    }
  };

  const slides = briefing ? [
    {
      title: 'Executive Overview',
      icon: Brain,
      gradient: 'from-purple-500 to-pink-500',
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">AI-Powered Analysis</h3>
              <p className="text-sm text-muted-foreground">Real-time organizational insights</p>
            </div>
          </div>
          <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
            <p className="text-lg leading-relaxed">{briefing.executive_summary}</p>
          </div>
          {briefing.context && (
            <div className="grid grid-cols-3 gap-4 animate-fade-in">
              <Card className="border-purple-500/20 hover:border-purple-500/40 transition-all hover-scale">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-purple-500 animate-pulse">
                    {briefing.context.meetings?.total || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Meetings</div>
                  <Progress value={85} className="mt-2 h-1" />
                </CardContent>
              </Card>
              <Card className="border-purple-500/20 hover:border-purple-500/40 transition-all hover-scale">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-pink-500 animate-pulse">
                    {briefing.context.actions?.stats?.total || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Action Items</div>
                  <Progress value={briefing.context.actions?.completion_rate || 0} className="mt-2 h-1" />
                </CardContent>
              </Card>
              <Card className="border-purple-500/20 hover:border-purple-500/40 transition-all hover-scale">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-blue-500 animate-pulse">
                    {briefing.context.actions?.completion_rate || 0}%
                  </div>
                  <div className="text-sm text-muted-foreground">Completion Rate</div>
                  <Progress value={briefing.context.actions?.completion_rate || 0} className="mt-2 h-1" />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Key Performance Metrics',
      icon: BarChart3,
      gradient: 'from-blue-500 to-cyan-500',
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Performance Metrics</h3>
              <p className="text-sm text-muted-foreground">Current organizational indicators</p>
            </div>
          </div>
          {briefing.key_metrics.length > 0 ? (
            <div className="space-y-4">
              {briefing.key_metrics.map((metric, idx) => (
                <Card 
                  key={idx} 
                  className="border-blue-500/20 hover:border-blue-500/40 transition-all hover-scale animate-fade-in"
                  style={{ animationDelay: `${idx * 150}ms` }}
                >
                  <CardContent className="pt-6 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 animate-pulse">
                      <span className="text-white font-bold">{idx + 1}</span>
                    </div>
                    <p className="text-lg flex-1">{metric}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No key metrics available
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Strengths & Achievements',
      icon: CheckCircle2,
      gradient: 'from-green-500 to-emerald-500',
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Organizational Strengths</h3>
              <p className="text-sm text-muted-foreground">What's working well</p>
            </div>
          </div>
          {briefing.strengths.length > 0 ? (
            <div className="space-y-4">
              {briefing.strengths.map((strength, idx) => (
                <Card 
                  key={idx} 
                  className="border-green-500/20 hover:border-green-500/40 transition-all hover-scale animate-fade-in"
                  style={{ animationDelay: `${idx * 150}ms` }}
                >
                  <CardContent className="pt-6 flex items-start gap-4">
                    <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-1 animate-pulse" />
                    <p className="text-lg flex-1">{strength}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No strengths identified
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Concerns & Risks',
      icon: AlertTriangle,
      gradient: 'from-orange-500 to-red-500',
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Areas of Concern</h3>
              <p className="text-sm text-muted-foreground">Requires immediate attention</p>
            </div>
          </div>
          {briefing.concerns.length > 0 ? (
            <div className="space-y-4">
              {briefing.concerns.map((concern, idx) => (
                <Card 
                  key={idx} 
                  className="border-orange-500/20 hover:border-orange-500/40 transition-all hover-scale animate-fade-in"
                  style={{ animationDelay: `${idx * 150}ms` }}
                >
                  <CardContent className="pt-6 flex items-start gap-4">
                    <AlertTriangle className="h-6 w-6 text-orange-500 flex-shrink-0 mt-1 animate-pulse" />
                    <div className="flex-1">
                      <Badge variant="destructive" className="mb-2 animate-pulse">Priority</Badge>
                      <p className="text-lg">{concern}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No major concerns identified
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Strategic Priorities',
      icon: Target,
      gradient: 'from-indigo-500 to-purple-500',
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Focus Areas</h3>
              <p className="text-sm text-muted-foreground">Where to direct energy</p>
            </div>
          </div>
          {briefing.priorities.length > 0 ? (
            <div className="space-y-4">
              {briefing.priorities.map((priority, idx) => (
                <Card 
                  key={idx} 
                  className="border-indigo-500/20 hover:border-indigo-500/40 transition-all hover-scale animate-fade-in"
                  style={{ animationDelay: `${idx * 150}ms` }}
                >
                  <CardContent className="pt-6 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 animate-pulse">
                      <span className="text-white font-bold">{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold mb-2">Priority {idx + 1}</p>
                      <p className="text-base text-muted-foreground">{priority}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No priorities identified
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Recommendations',
      icon: TrendingUp,
      gradient: 'from-teal-500 to-green-500',
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-teal-500 to-green-500 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Strategic Recommendations</h3>
              <p className="text-sm text-muted-foreground">AI-driven suggestions</p>
            </div>
          </div>
          {briefing.recommendations.length > 0 ? (
            <div className="space-y-4">
              {briefing.recommendations.map((rec, idx) => (
                <Card 
                  key={idx} 
                  className="border-teal-500/20 hover:border-teal-500/40 transition-all hover-scale animate-fade-in"
                  style={{ animationDelay: `${idx * 150}ms` }}
                >
                  <CardContent className="pt-6 flex items-start gap-4">
                    <Zap className="h-6 w-6 text-teal-500 flex-shrink-0 mt-1 animate-pulse" />
                    <p className="text-lg flex-1">{rec}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No recommendations available
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Next Actions',
      icon: ArrowRight,
      gradient: 'from-violet-500 to-fuchsia-500',
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <ArrowRight className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Immediate Actions</h3>
              <p className="text-sm text-muted-foreground">What to do next</p>
            </div>
          </div>
          {briefing.next_actions.length > 0 ? (
            <div className="space-y-4">
              {briefing.next_actions.map((action, idx) => (
                <Card 
                  key={idx} 
                  className="border-violet-500/20 hover:border-violet-500/40 transition-all hover-scale animate-fade-in"
                  style={{ animationDelay: `${idx * 150}ms` }}
                >
                  <CardContent className="pt-6 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0 animate-pulse">
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-lg flex-1">{action}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No immediate actions required
            </div>
          )}
          <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10">
            <CardContent className="pt-6">
              <p className="text-center text-sm text-muted-foreground">
                This briefing was generated using AI analysis. Review all recommendations with your leadership team before implementation.
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }
  ] : [];

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 px-8">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
            <h3 className="text-2xl font-bold mb-2">Analyzing Your Organization</h3>
            <p className="text-muted-foreground text-center max-w-md">
              AI is processing meetings, actions, decisions, and performance data to generate your executive briefing...
            </p>
          </div>
        ) : briefing ? (
          <>
            <DialogHeader className={`p-6 bg-gradient-to-r ${slides[currentSlide]?.gradient} text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {slides[currentSlide] && slides[currentSlide].icon && (
                    (() => {
                      const IconComponent = slides[currentSlide].icon;
                      return <IconComponent className="h-6 w-6" />;
                    })()
                  )}
                  <DialogTitle className="text-2xl">{slides[currentSlide]?.title}</DialogTitle>
                  {isNarrating && (
                    <div className="flex items-center gap-2 ml-4">
                      <div className="flex gap-1">
                        <div className="w-1 h-4 bg-white animate-pulse" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1 h-4 bg-white animate-pulse" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1 h-4 bg-white animate-pulse" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-sm">AI Speaking...</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAutoAdvance(!autoAdvance)}
                    className="text-white hover:bg-white/20"
                    title={autoAdvance ? 'Disable auto-advance' : 'Enable auto-advance'}
                  >
                    {autoAdvance ? <Timer className="h-5 w-5" /> : <TimerOff className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleVoice}
                    className="text-white hover:bg-white/20"
                    title={voiceEnabled ? 'Disable voice (requires OpenAI API key)' : 'Enable voice'}
                  >
                    {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  </Button>
                  {isNarrating && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={togglePause}
                      className="text-white hover:bg-white/20"
                      title={isPaused ? 'Resume' : 'Pause'}
                    >
                      {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="text-white hover:bg-white/20"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                {slides.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      idx === currentSlide ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </DialogHeader>

            <div className={`p-8 overflow-y-auto max-h-[calc(90vh-200px)] transition-all duration-300 ${animating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
              {voiceError && (
                <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg text-sm text-orange-500 animate-fade-in">
                  {voiceError}
                </div>
              )}
              
              {/* AI Presenter Avatar */}
              {presenterImage && (
                <div className="fixed bottom-8 right-8 z-50 animate-fade-in">
                  <div className={`relative transition-all duration-300 ${isNarrating ? 'scale-110' : 'scale-100'}`}>
                    <div className={`absolute inset-0 rounded-2xl blur-xl transition-opacity duration-300 ${
                      isNarrating ? 'opacity-70 bg-gradient-to-r from-purple-500 to-pink-500' : 'opacity-0'
                    }`} />
                    <div className={`relative rounded-2xl overflow-hidden border-4 transition-all duration-300 ${
                      isNarrating 
                        ? 'border-purple-500 shadow-2xl shadow-purple-500/50' 
                        : 'border-border shadow-lg'
                    }`}>
                      <img 
                        src={presenterImage} 
                        alt="AI Presenter"
                        className="w-48 h-48 object-cover"
                      />
                      {isNarrating && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-900/90 to-transparent p-3">
                          <div className="flex items-center gap-2 text-white">
                            <div className="flex gap-1">
                              <div className="w-1 h-3 bg-white animate-pulse" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-1 h-3 bg-white animate-pulse" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-1 h-3 bg-white animate-pulse" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span className="text-xs font-medium">Presenting...</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {loadingPresenter && !presenterImage && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-2xl">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {slides[currentSlide]?.content}
            </div>

            <div className="p-6 border-t flex items-center justify-between bg-muted/30">
              <Button
                variant="outline"
                onClick={prevSlide}
                disabled={currentSlide === 0}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="text-sm text-muted-foreground">
                Slide {currentSlide + 1} of {slides.length}
              </div>

              <Button
                onClick={nextSlide}
                disabled={currentSlide === slides.length - 1}
                className="gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 px-8">
            <AlertTriangle className="h-16 w-16 text-orange-500 mb-6" />
            <h3 className="text-2xl font-bold mb-2">Failed to Generate Briefing</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Unable to generate executive briefing. Please try again.
            </p>
            <Button onClick={generateBriefing}>
              Retry
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}