import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Grid3x3, List, ChevronDown, FileText, Loader2 } from "lucide-react";
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
        {/* Header */}
        <div className="border-b bg-gradient-to-r from-card/80 via-card/50 to-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">NotebookLM</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">AI-powered research workspace</p>
                </div>
              </div>
              <Button onClick={() => setShowCreateDialog(true)} size="lg" className="gap-2 shadow-md hover:shadow-lg transition-all hover-scale">
                <Plus className="h-5 w-5" />
                Create new
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="my">My notebooks</TabsTrigger>
                  <TabsTrigger value="featured">Featured notebooks</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2">
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="rounded-r-none"
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      {sortBy === "recent" && "Most recent"}
                      {sortBy === "oldest" && "Oldest"}
                      {sortBy === "title" && "Title"}
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover z-50">
                    <DropdownMenuItem onClick={() => setSortBy("recent")}>
                      Most recent
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                      Oldest
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy("title")}>
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
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse" />
              </div>
              <p className="text-muted-foreground animate-pulse">Loading notebooks...</p>
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
                <div className="mb-12">
                  <h2 className="text-xl font-semibold mb-4">Featured notebooks</h2>
                  <div className="rounded-lg border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  {activeTab === "my" ? "My notebooks" : "Recent notebooks"}
                </h2>
                <div className="rounded-lg border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
