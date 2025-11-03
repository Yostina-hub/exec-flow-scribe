import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Grid3x3, List, ChevronDown, FileText, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateNotebookDialog } from "@/components/CreateNotebookDialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sortBy, setSortBy] = useState("recent");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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

  const sortedNotebooks = [...notebooks].sort((a, b) => {
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
  const recentNotebooks = sortedNotebooks.slice(0, 10);

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

            <div className="flex items-center justify-between animate-fade-in" style={{ animationDelay: '0.1s' }}>
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

              <div className="flex items-center gap-2">
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
              {/* Featured Notebooks */}
              {activeTab !== "my" && featuredNotebooks.length > 0 && (
                <div className="mb-12 animate-fade-in">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    Featured notebooks
                  </h2>
                  <div className="rounded-xl border bg-gradient-to-b from-card to-card/50 overflow-hidden shadow-md hover:shadow-xl transition-all">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[40%] font-semibold">Title</TableHead>
                          <TableHead className="font-semibold">Sources</TableHead>
                          <TableHead className="font-semibold">Created</TableHead>
                          <TableHead className="font-semibold">Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {featuredNotebooks.map((notebook) => (
                          <TableRow
                            key={notebook.id}
                            className="cursor-pointer hover:bg-accent/50 transition-colors animate-fade-in"
                            onClick={() => handleNotebookClick(notebook.id)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                {notebook.title}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {notebook.source_count} Sources
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(notebook.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              Owner
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Recent Notebooks */}
              <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <h2 className="text-xl font-semibold mb-4">
                  {activeTab === "my" ? "My notebooks" : "Recent notebooks"}
                </h2>
                <div className="rounded-xl border bg-gradient-to-b from-card to-card/50 overflow-hidden shadow-md hover:shadow-xl transition-all">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[40%] font-semibold">Title</TableHead>
                        <TableHead className="font-semibold">Sources</TableHead>
                        <TableHead className="font-semibold">Created</TableHead>
                        <TableHead className="font-semibold">Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentNotebooks.map((notebook) => (
                        <TableRow
                          key={notebook.id}
                          className="cursor-pointer hover:bg-accent/50 transition-colors animate-fade-in"
                          onClick={() => handleNotebookClick(notebook.id)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              {notebook.title}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {notebook.source_count} Sources
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(notebook.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            Owner
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
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
