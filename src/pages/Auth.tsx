import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Zap, Shield, TrendingUp } from "lucide-react";
import { useIsGuest } from "@/hooks/useIsGuest";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isGuest, loading: guestLoading } = useIsGuest();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // If there's an auth error (like invalid refresh token), sign out
      if (error) {
        console.error("Auth error on load:", error);
        supabase.auth.signOut();
        return;
      }
      
      if (session && !guestLoading) {
        navigate(isGuest ? "/guest" : "/");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle token refresh failures
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.log("Token refresh failed, signing out");
        await supabase.auth.signOut();
        return;
      }
      
      if (session) {
        // Small delay to allow guest status to update
        setTimeout(() => {
          if (!guestLoading) {
            navigate(isGuest ? "/guest" : "/");
          }
        }, 300);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isGuest, guestLoading]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            title,
          },
        },
      });

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account created!",
          description: "You can now sign in to your account",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Theme Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeSwitcher />
      </div>
      
      {/* Enhanced Animated Background - Executive Grade */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-600/20 via-cyan-500/15 to-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-purple-600/15 via-pink-500/10 to-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-br from-cyan-500/10 to-sky-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black,transparent)]" />

      {/* Floating Particles - Hidden on mobile for performance */}
      <div className="absolute inset-0 overflow-hidden hidden lg:block">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/15 to-transparent hidden lg:block" />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-0 lg:p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center h-full lg:h-auto">
          {/* Hero Section - Executive Focus */}
          <div className="text-white space-y-8 animate-fade-in hidden lg:block pr-12">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 backdrop-blur-xl border border-emerald-400/50 shadow-xl shadow-emerald-500/20">
              <Sparkles className="h-5 w-5 text-emerald-300 animate-pulse" />
              <span className="text-base font-bold text-white tracking-wide">Enterprise Meeting Intelligence</span>
            </div>

            <h1 className="text-7xl font-black leading-[1.1] font-['Space_Grotesk'] drop-shadow-2xl">
              <span className="bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent">
                Digital Meeting
              </span>
              <span className="block bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent mt-2">
                Excellence
              </span>
            </h1>

            <p className="text-xl text-blue-100/90 leading-relaxed drop-shadow-lg font-medium max-w-xl">
              Transform executive meetings with AI-powered intelligence. Real-time transcription, automated minutes, and actionable insights for organizational excellence.
            </p>

            <div className="grid grid-cols-3 gap-6 pt-12">
              {[
                { icon: Zap, label: "Real-Time AI", desc: "Instant transcription & translation", color: "from-yellow-500 to-orange-500" },
                { icon: Shield, label: "Enterprise Secure", desc: "Bank-grade encryption", color: "from-blue-500 to-cyan-500" },
                { icon: TrendingUp, label: "Executive Analytics", desc: "Decision intelligence", color: "from-emerald-500 to-teal-500" },
              ].map((feature, i) => (
                <div 
                  key={i} 
                  className="group relative p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all duration-500 hover:scale-105 hover:-translate-y-1 cursor-pointer"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                  <div className={`relative p-3 w-fit rounded-xl bg-gradient-to-br ${feature.color} shadow-lg group-hover:shadow-2xl transition-all duration-500 mb-4`}>
                    <feature.icon className="h-6 w-6 text-white drop-shadow-lg" />
                  </div>
                  <h3 className="relative font-bold text-lg mb-2 text-white drop-shadow-md">{feature.label}</h3>
                  <p className="relative text-sm text-blue-100/80 font-medium leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Auth Card - Executive Edition */}
          <div className="animate-scale-in w-full lg:w-auto h-full lg:h-auto">
            <Card className="border-0 lg:border-2 lg:border-emerald-400/30 bg-slate-900/95 backdrop-blur-2xl shadow-none lg:shadow-[0_20px_70px_-15px_rgba(16,185,129,0.3)] lg:rounded-3xl rounded-none min-h-screen lg:min-h-0 flex flex-col justify-center py-8 lg:py-0 relative overflow-hidden">
              {/* Card Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
              
              <CardHeader className="space-y-4 px-4 sm:px-8 pt-8 lg:pt-8 pb-4 lg:pb-6 relative">
                <div className="flex items-center justify-center lg:justify-start gap-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl blur-xl opacity-50 animate-pulse" />
                    <div className="relative h-14 w-14 lg:h-16 lg:w-16 rounded-2xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-500 flex items-center justify-center shadow-2xl animate-glow">
                      <Sparkles className="h-7 w-7 lg:h-8 lg:w-8 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-4xl font-black font-['Space_Grotesk'] bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                      MeetingHub
                    </h1>
                    <p className="text-sm lg:text-base text-emerald-400 font-bold tracking-wide">Executive Edition</p>
                  </div>
                </div>
                <CardDescription className="text-base lg:text-lg text-white font-bold text-center lg:text-left">
                  Secure access to your organization's intelligence platform
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 lg:px-6 pb-6 lg:pb-8">
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-800 border border-slate-700 h-10 lg:h-auto">
                    <TabsTrigger value="signin" className="text-sm lg:text-base data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">Sign In</TabsTrigger>
                    <TabsTrigger value="signup" className="text-sm lg:text-base data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin" className="animate-fade-in mt-4 lg:mt-6">
                    <form onSubmit={handleSignIn} className="space-y-3 lg:space-y-4">
                      <div className="space-y-1.5 lg:space-y-2">
                        <Label htmlFor="email" className="text-sm lg:text-base text-white font-semibold">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-10 lg:h-10 text-sm lg:text-base bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20"
                        />
                      </div>
                      <div className="space-y-1.5 lg:space-y-2">
                        <Label htmlFor="password" className="text-sm lg:text-base text-white font-semibold">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-10 lg:h-10 text-sm lg:text-base bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full h-11 lg:h-10 text-sm lg:text-base bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 hover:from-blue-600 hover:via-cyan-600 hover:to-emerald-600 text-white font-semibold shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105"
                        disabled={loading}
                      >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign In
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="animate-fade-in mt-4 lg:mt-6">
                    <form onSubmit={handleSignUp} className="space-y-3 lg:space-y-4">
                      <div className="space-y-1.5 lg:space-y-2">
                        <Label htmlFor="fullname" className="text-sm lg:text-base text-white font-semibold">Full Name</Label>
                        <Input
                          id="fullname"
                          type="text"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          className="h-10 lg:h-10 text-sm lg:text-base bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20"
                        />
                      </div>
                      <div className="space-y-1.5 lg:space-y-2">
                        <Label htmlFor="usertitle" className="text-sm lg:text-base text-white font-semibold">Title</Label>
                        <Input
                          id="usertitle"
                          type="text"
                          placeholder="CEO"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="h-10 lg:h-10 text-sm lg:text-base bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20"
                        />
                      </div>
                      <div className="space-y-1.5 lg:space-y-2">
                        <Label htmlFor="signup-email" className="text-sm lg:text-base text-white font-semibold">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-10 lg:h-10 text-sm lg:text-base bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20"
                        />
                      </div>
                      <div className="space-y-1.5 lg:space-y-2">
                        <Label htmlFor="signup-password" className="text-sm lg:text-base text-white font-semibold">Password</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-10 lg:h-10 text-sm lg:text-base bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full h-11 lg:h-10 text-sm lg:text-base bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 hover:from-blue-600 hover:via-cyan-600 hover:to-emerald-600 text-white font-semibold shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105"
                        disabled={loading}
                      >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Account
                      </Button>
                      
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-slate-700" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-slate-900 px-2 text-slate-400">Or</span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11 lg:h-10 text-sm lg:text-base border-2 border-slate-700 text-white hover:bg-slate-800"
                        onClick={() => navigate('/guest-signup')}
                      >
                        Request Guest Access
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.8;
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Auth;
