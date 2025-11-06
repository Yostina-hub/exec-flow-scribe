import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Grid3x3, List, ChevronDown, FileText, Loader2, Sparkles, Search, Filter, Copy, Share2, Download, MoreHorizontal, Clock, BookOpen, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateNotebookDialog } from "@/components/CreateNotebookDialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Notebook {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  user_id: string;
  source_count?: number;
}

const NotebooksLibrary = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("recent");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadNotebooks();
    
    // Real-time updates for notebooks
    const channel = supabase
      .channel('notebooks-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notebooks'
        },
        () => {
          loadNotebooks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNotebooks = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Fetch notebooks with source count
      const { data, error } = await supabase
        .from("notebooks")
        .select(`
          id,
          title,
          description,
          created_at,
          user_id
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get source counts for each notebook
      const notebooksWithCounts = await Promise.all(
        (data || []).map(async (notebook) => {
          const { count } = await supabase
            .from("notebook_sources")
            .select("*", { count: "exact", head: true })
            .eq("notebook_id", notebook.id);
          
          return {
            ...notebook,
            source_count: count || 0,
          };
        })
      );

      setNotebooks(notebooksWithCounts);
    } catch (error) {
      console.error("Error loading notebooks:", error);
      toast({
        title: "Error",
        description: "Failed to load notebooks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotebookClick = (notebookId: string) => {
    navigate(`/notebook?notebook=${notebookId}`);
  };

  const handleNotebookCreated = (notebookId: string) => {
    setShowCreateDialog(false);
    loadNotebooks();
    navigate(`/notebook?notebook=${notebookId}`);
  };

  const filteredNotebooks = notebooks.filter(notebook => 
    notebook.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    notebook.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedNotebooks = [...filteredNotebooks].sort((a, b) => {
    if (sortBy === "recent") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === "oldest") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  const featuredNotebooks = sortedNotebooks.slice(0, 5);
  const recentNotebooks = sortedNotebooks;

  return (
    <Layout>
      <div className="min-h-screen bg-background animate-fade-in">
        {/* Executive Header */}
        <div className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6 animate-fade-in">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-xl hover-scale transition-all">
                  <FileText className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">NotebookLM Library</h1>
                  <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                    AI-powered research and analysis workspace
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="px-3 py-1.5 text-sm">
                  {notebooks.length} {notebooks.length === 1 ? "Notebook" : "Notebooks"}
                </Badge>
                <Button 
                  onClick={() => setShowCreateDialog(true)} 
                  size="lg" 
                  className="gap-2 shadow-lg hover:shadow-xl transition-all hover-scale bg-gradient-to-r from-primary to-primary/90"
                >
                  <Plus className="h-5 w-5" />
                  Create New
                </Button>
              </div>
            </div>

            <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notebooks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background/60 backdrop-blur-sm border shadow-sm"
                  />
                </div>
                
                <div className="flex items-center border rounded-lg bg-background/60 backdrop-blur-sm shadow-sm">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="rounded-r-none hover-scale transition-all"
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="rounded-l-none hover-scale transition-all"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 bg-background/60 backdrop-blur-sm shadow-sm hover-scale transition-all">
                      <span className="font-medium">
                        {sortBy === "recent" && "Most recent"}
                        {sortBy === "oldest" && "Oldest"}
                        {sortBy === "title" && "Title"}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur-sm z-50">
                    <DropdownMenuItem onClick={() => setSortBy("recent")} className="cursor-pointer">
                      Most recent
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("oldest")} className="cursor-pointer">
                      Oldest
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("title")} className="cursor-pointer">
                      Title
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-background/60 backdrop-blur-sm border shadow-sm">
                  <TabsTrigger value="all" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-primary-foreground">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="my" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-primary-foreground">
                    My notebooks
                  </TabsTrigger>
                  <TabsTrigger value="featured" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-primary-foreground">
                    Featured
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-6 py-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 animate-fade-in">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <div className="absolute inset-0 bg-primary/20 blur-3xl animate-pulse" />
              </div>
              <p className="text-lg text-muted-foreground animate-pulse font-medium">Loading notebooks...</p>
            </div>
          ) : sortedNotebooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-scale-in">
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center mb-6">
                <Search className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">No notebooks found</h3>
              <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
                Try adjusting your search or create a new notebook
              </p>
              <Button onClick={() => setShowCreateDialog(true)} size="lg" className="gap-2 shadow-md hover-scale">
                <Plus className="h-5 w-5" />
                Create new notebook
              </Button>
            </div>
          ) : notebooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-scale-in">
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center mb-6">
                <FileText className="h-12 w-12 text-muted-foreground/50" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">No notebooks yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md leading-relaxed">
                Create your first notebook to start organizing and analyzing your content with AI
              </p>
              <Button onClick={() => setShowCreateDialog(true)} size="lg" className="gap-2 shadow-md hover-scale">
                <Plus className="h-5 w-5" />
                Create new notebook
              </Button>
            </div>
          ) : (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                  {sortedNotebooks.map((notebook, index) => (
                    <Card
                      key={notebook.id}
                      className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border-2 hover:border-primary/50 animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                      onClick={() => handleNotebookClick(notebook.id)}
                    >
                      <div className="h-32 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20 relative overflow-hidden">
                        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
                        <div className="absolute top-4 left-4">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <BookOpen className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="absolute top-4 right-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur-sm hover:bg-background">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="z-50">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                toast({ title: "Coming soon", description: "Duplicate notebook feature" });
                              }}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                toast({ title: "Coming soon", description: "Share notebook feature" });
                              }}>
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                toast({ title: "Coming soon", description: "Export notebook feature" });
                              }}>
                                <Download className="h-4 w-4 mr-2" />
                                Export
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">
                          {notebook.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 text-sm">
                          {notebook.description || "No description"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            <span>{notebook.source_count || 0} sources</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{format(new Date(notebook.created_at), "MMM d")}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <Zap className="h-3 w-3 mr-1" />
                            AI-Ready
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border bg-gradient-to-b from-card to-card/50 overflow-hidden shadow-md hover:shadow-xl transition-all">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[40%] font-semibold">Title</TableHead>
                        <TableHead className="font-semibold">Sources</TableHead>
                        <TableHead className="font-semibold">Created</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedNotebooks.map((notebook) => (
                        <TableRow
                          key={notebook.id}
                          className="cursor-pointer hover:bg-accent/50 transition-colors animate-fade-in"
                          onClick={() => handleNotebookClick(notebook.id)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                                <BookOpen className="h-5 w-5 text-white" />
                              </div>
                              <div>
                                <div className="font-semibold">{notebook.title}</div>
                                {notebook.description && (
                                  <div className="text-xs text-muted-foreground line-clamp-1">{notebook.description}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="gap-1.5">
                              <FileText className="h-3 w-3" />
                              {notebook.source_count || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(notebook.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="z-50">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  toast({ title: "Coming soon", description: "Duplicate notebook feature" });
                                }}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  toast({ title: "Coming soon", description: "Share notebook feature" });
                                }}>
                                  <Share2 className="h-4 w-4 mr-2" />
                                  Share
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  toast({ title: "Coming soon", description: "Export notebook feature" });
                                }}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Export
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <CreateNotebookDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onNotebookCreated={handleNotebookCreated}
      />
    </Layout>
  );
};

export default NotebooksLibrary;
