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

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950/30 to-slate-950">
      {/* Animated Background Elements - Reduced on mobile */}
      <div className="absolute inset-0 hidden lg:block">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-500/25 to-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-br from-cyan-500/15 to-sky-500/15 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      {/* Simplified mobile background */}
      <div className="absolute inset-0 lg:hidden bg-gradient-to-br from-blue-500/10 to-cyan-500/5" />

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
          {/* Hero Section */}
          <div className="text-white space-y-8 animate-fade-in hidden lg:block">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-md border border-blue-400/40 shadow-lg shadow-blue-500/20">
              <Sparkles className="h-4 w-4 text-cyan-300 animate-pulse" />
              <span className="text-sm font-semibold text-white">Next-Gen Meeting Platform</span>
            </div>

            <h1 className="text-6xl font-bold leading-tight font-['Space_Grotesk'] drop-shadow-lg">
              <span className="text-white">Transform Your</span>
              <span className="block text-white drop-shadow-2xl">
                Executive Meetings
              </span>
            </h1>

            <p className="text-xl text-white leading-relaxed drop-shadow-md font-semibold">
              AI-powered transcription, real-time insights, and intelligent automation for the modern executive office.
            </p>

            <div className="grid grid-cols-3 gap-6 pt-8">
              {[
                { icon: Zap, label: "Real-time AI", desc: "Live transcription" },
                { icon: Shield, label: "Enterprise Grade", desc: "Bank-level security" },
                { icon: TrendingUp, label: "Smart Analytics", desc: "Actionable insights" },
              ].map((feature, i) => (
                <div 
                  key={i} 
                  className="p-5 rounded-xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 hover:border-cyan-400/50 hover:shadow-xl hover:shadow-cyan-500/20 transition-all duration-300 hover:scale-105 cursor-pointer group"
                >
                  <feature.icon className="h-7 w-7 text-cyan-300 group-hover:text-emerald-300 transition-colors mb-3 drop-shadow-lg" />
                  <h3 className="font-bold text-base mb-1.5 text-white drop-shadow-md">{feature.label}</h3>
                  <p className="text-sm text-white/90 font-medium">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Auth Card */}
          <div className="animate-scale-in w-full lg:w-auto h-full lg:h-auto">
            <Card className="border-0 lg:border lg:border-cyan-200/50 bg-white/95 backdrop-blur-xl shadow-none lg:shadow-2xl lg:shadow-cyan-500/20 lg:rounded-2xl rounded-none min-h-screen lg:min-h-0 flex flex-col justify-center py-8 lg:py-0">
              <CardHeader className="space-y-3 lg:space-y-4 px-4 sm:px-6 pt-6 lg:pt-6 pb-4 lg:pb-6">
                <div className="flex items-center justify-center lg:justify-start gap-2 lg:gap-3">
                  <div className="h-10 w-10 lg:h-14 lg:w-14 rounded-lg lg:rounded-xl bg-gradient-to-br from-blue-500 via-cyan-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/50 animate-glow">
                    <Sparkles className="h-5 w-5 lg:h-7 lg:w-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl lg:text-3xl font-bold font-['Space_Grotesk'] bg-gradient-to-r from-gray-900 via-cyan-600 to-emerald-600 bg-clip-text text-transparent">
                      MeetingHub
                    </h1>
                    <p className="text-[10px] lg:text-sm text-cyan-600 font-medium">Executive Suite</p>
                  </div>
                </div>
                <CardDescription className="text-sm lg:text-base text-gray-600 font-medium text-center lg:text-left">
                  Access your AI-powered executive dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 lg:px-6 pb-6 lg:pb-8">
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-100 border border-gray-200 h-10 lg:h-auto">
                    <TabsTrigger value="signin" className="text-sm lg:text-base data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">Sign In</TabsTrigger>
                    <TabsTrigger value="signup" className="text-sm lg:text-base data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin" className="animate-fade-in mt-4 lg:mt-6">
                    <form onSubmit={handleSignIn} className="space-y-3 lg:space-y-4">
                      <div className="space-y-1.5 lg:space-y-2">
                        <Label htmlFor="email" className="text-sm lg:text-base text-gray-700 font-medium">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-10 lg:h-10 text-sm lg:text-base bg-white/95 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                        />
                      </div>
                      <div className="space-y-1.5 lg:space-y-2">
                        <Label htmlFor="password" className="text-sm lg:text-base text-gray-700 font-medium">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-10 lg:h-10 text-sm lg:text-base bg-white/95 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20"
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
                        <Label htmlFor="fullname" className="text-sm lg:text-base text-gray-700 font-medium">Full Name</Label>
                        <Input
                          id="fullname"
                          type="text"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          className="h-10 lg:h-10 text-sm lg:text-base bg-white/95 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                        />
                      </div>
                      <div className="space-y-1.5 lg:space-y-2">
                        <Label htmlFor="usertitle" className="text-sm lg:text-base text-gray-700 font-medium">Title</Label>
                        <Input
                          id="usertitle"
                          type="text"
                          placeholder="CEO"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="h-10 lg:h-10 text-sm lg:text-base bg-white/95 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                        />
                      </div>
                      <div className="space-y-1.5 lg:space-y-2">
                        <Label htmlFor="signup-email" className="text-sm lg:text-base text-gray-700 font-medium">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-10 lg:h-10 text-sm lg:text-base bg-white/95 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                        />
                      </div>
                      <div className="space-y-1.5 lg:space-y-2">
                        <Label htmlFor="signup-password" className="text-sm lg:text-base text-gray-700 font-medium">Password</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-10 lg:h-10 text-sm lg:text-base bg-white/95 border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20"
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
