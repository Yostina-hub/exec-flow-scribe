import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Grid3x3, List, ChevronDown, FileText } from "lucide-react";
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
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-card/50">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8" />
                <h1 className="text-2xl font-bold">NotebookLM</h1>
              </div>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
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
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading notebooks...</p>
            </div>
          ) : notebooks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notebooks yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first notebook to get started
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create new notebook
              </Button>
            </div>
          ) : (
            <>
              {/* Featured Notebooks */}
              {activeTab !== "my" && featuredNotebooks.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-xl font-semibold mb-4">Featured notebooks</h2>
                  <div className="rounded-lg border bg-card overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40%]">Title</TableHead>
                          <TableHead>Sources</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {featuredNotebooks.map((notebook) => (
                          <TableRow
                            key={notebook.id}
                            className="cursor-pointer hover:bg-muted/50"
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
                <div className="rounded-lg border bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Title</TableHead>
                        <TableHead>Sources</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentNotebooks.map((notebook) => (
                        <TableRow
                          key={notebook.id}
                          className="cursor-pointer hover:bg-muted/50"
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
