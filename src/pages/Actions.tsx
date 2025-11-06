import { Layout } from "@/components/Layout";
import { CreateActionDialog } from "@/components/CreateActionDialog";
import { TaskExportManager } from "@/components/actions/TaskExportManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search, Filter, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ActionItem {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  status: string;
  assigned_to: string;
  meeting_id: string | null;
  assignee?: { full_name: string };
  meeting?: { title: string };
}

const priorityVariant: Record<string, "destructive" | "warning" | "secondary"> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

const statusVariant: Record<string, "outline" | "warning" | "success"> = {
  pending: "outline",
  in_progress: "warning",
  completed: "success",
};

const Actions = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActions();
    
    // Real-time subscription for action items
    const channel = supabase
      .channel('actions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'action_items'
        },
        () => {
          console.log('Action items changed, refetching...');
          fetchActions();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchActions = async () => {
    try {
      const { data, error } = await supabase
        .from("action_items")
        .select("*")
        .order("due_date", { ascending: true });

      if (error) throw error;
      
      // Fetch related data separately
      const enrichedActions = await Promise.all((data || []).map(async (action) => {
        const [assignee, meeting] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("id", action.assigned_to).maybeSingle(),
          action.meeting_id 
            ? supabase.from("meetings").select("title").eq("id", action.meeting_id).maybeSingle()
            : Promise.resolve({ data: null })
        ]);
        
        return {
          ...action,
          assignee: assignee.data,
          meeting: meeting.data
        };
      }));
      
      setActions(enrichedActions);
    } catch (error) {
      console.error("Failed to fetch actions:", error);
    } finally {
      setLoading(false);
    }
  };

  const pendingActions = actions.filter((a) => a.status === "pending");
  const inProgressActions = actions.filter((a) => a.status === "in_progress");
  const completedActions = actions.filter((a) => a.status === "completed");

  const filterActions = (actions: ActionItem[]) => {
    if (!searchQuery) return actions;
    return actions.filter(
      (a) =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.assignee?.full_name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const ActionItemCard = ({ action }: { action: ActionItem }) => (
    <Card className="hover:shadow-md transition-all duration-300">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Checkbox
            checked={selectedItems.has(action.id)}
            onCheckedChange={() => toggleItem(action.id)}
            className="mt-1"
          />
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-base">{action.title}</h3>
              {action.description && (
                <p className="text-sm text-muted-foreground mt-1">{action.description}</p>
              )}
              {action.meeting && (
                <p className="text-sm text-muted-foreground mt-1">
                  From: {action.meeting.title}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={priorityVariant[action.priority] || "secondary"}>
                {action.priority}
              </Badge>
              <Badge variant={statusVariant[action.status] || "outline"}>
                {action.status.replace("_", " ")}
              </Badge>
              <span className="text-xs text-muted-foreground">
                • Assigned to {action.assignee?.full_name || "Unassigned"}
              </span>
              <span className="text-xs text-muted-foreground">
                • Due {format(new Date(action.due_date), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Action Items</h1>
            <p className="text-muted-foreground mt-2">
              Track follow-ups and deliverables from meetings
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <CreateActionDialog />
          </div>
        </div>

        {/* Task Export Manager */}
        <TaskExportManager actionItems={actions} />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-3xl">{pendingActions.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>In Progress</CardDescription>
              <CardTitle className="text-3xl">{inProgressActions.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-3xl">{completedActions.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search actions..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All ({actions.length})</TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({pendingActions.length})
            </TabsTrigger>
            <TabsTrigger value="in-progress">
              In Progress ({inProgressActions.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedActions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-6">
            {filterActions(actions).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No actions found
              </div>
            ) : (
              filterActions(actions).map((action) => (
                <ActionItemCard key={action.id} action={action} />
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4 mt-6">
            {filterActions(pendingActions).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No pending actions
              </div>
            ) : (
              filterActions(pendingActions).map((action) => (
                <ActionItemCard key={action.id} action={action} />
              ))
            )}
          </TabsContent>

          <TabsContent value="in-progress" className="space-y-4 mt-6">
            {filterActions(inProgressActions).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No actions in progress
              </div>
            ) : (
              filterActions(inProgressActions).map((action) => (
                <ActionItemCard key={action.id} action={action} />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-6">
            {filterActions(completedActions).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No completed actions
              </div>
            ) : (
              filterActions(completedActions).map((action) => (
                <ActionItemCard key={action.id} action={action} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Actions;
