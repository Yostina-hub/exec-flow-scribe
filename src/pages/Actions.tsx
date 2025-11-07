import { Layout } from "@/components/Layout";
import { CreateActionDialog } from "@/components/CreateActionDialog";
import { TaskExportManager } from "@/components/actions/TaskExportManager";
import { GubaTaskProposals } from "@/components/guba/GubaTaskProposals";
import { GubaDashboard } from "@/components/guba/GubaDashboard";
import { GubaSidebar } from "@/components/guba/GubaSidebar";
import { TaskReassignmentDialog } from "@/components/guba/TaskReassignmentDialog";
import { GubaLearningAnalytics } from "@/components/guba/GubaLearningAnalytics";
import { BulkOperationsManager } from "@/components/guba/BulkOperationsManager";
import { TaskTemplatesManager } from "@/components/guba/TaskTemplatesManager";
import { TaskDependencyManager } from "@/components/guba/TaskDependencyManager";
import { TaskDependencyGraph } from "@/components/guba/TaskDependencyGraph";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search, Filter, Loader2, Calendar, Users, Clock, AlertCircle, CheckCircle2, ArrowUpDown, MoreHorizontal, Trash2, Edit, ListTodo, LayoutGrid, BarChart3, Sparkles, Target, AlertOctagon, Network } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"due_date" | "priority" | "status">("due_date");
  const [gubaEnabled, setGubaEnabled] = useState(false);
  const [showGubaDashboard, setShowGubaDashboard] = useState(false);
  const [showGubaSidebar, setShowGubaSidebar] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDependencyGraph, setShowDependencyGraph] = useState(false);
  const [dependencyTaskId, setDependencyTaskId] = useState<string | null>(null);
  const [reassignTask, setReassignTask] = useState<any>(null);
  const [recentMeetings, setRecentMeetings] = useState<any[]>([]);
  const [selectedMeetingForTasks, setSelectedMeetingForTasks] = useState<string>("");
  const [bulkOperation, setBulkOperation] = useState<"reassign" | "status" | "priority" | "delete" | "due_date" | null>(null);

  useEffect(() => {
    const checkGubaStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from('guba_settings')
        .select('enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setGubaEnabled(data?.enabled || false);

      // Fetch recent meetings
      if (data?.enabled) {
        const { data: meetingsData } = await supabase
          .from('meetings')
          .select('id, title, start_time')
          .order('start_time', { ascending: false })
          .limit(10);
        
        if (meetingsData && meetingsData.length > 0) {
          setRecentMeetings(meetingsData);
          setSelectedMeetingForTasks(meetingsData[0].id);
        }
      }
    };
    checkGubaStatus();
  }, []);

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
    let filtered = actions;
    
    if (searchQuery) {
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (a.assignee?.full_name || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (filterPriority !== "all") {
      filtered = filtered.filter((a) => a.priority === filterPriority);
    }
    
    return filtered.sort((a, b) => {
      if (sortBy === "due_date") {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (sortBy === "priority") {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      }
      return 0;
    });
  };

  const handleBulkAction = (operation: "reassign" | "status" | "priority" | "delete" | "due_date") => {
    if (selectedItems.size === 0) {
      toast({ title: "No items selected", variant: "destructive" });
      return;
    }
    setBulkOperation(operation);
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === actions.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(actions.map(a => a.id)));
    }
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
    <Card className="group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 border-2 hover:border-primary/50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Checkbox
            checked={selectedItems.has(action.id)}
            onCheckedChange={() => toggleItem(action.id)}
            className="mt-1"
          />
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                  {action.title}
                </h3>
                {action.description && (
                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">{action.description}</p>
                )}
                {action.meeting && (
                  <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    From: {action.meeting.title}
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setReassignTask(action)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Reassign
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDependencyTaskId(action.id)}>
                    <Network className="h-4 w-4 mr-2" />
                    Manage Dependencies
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Complete
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={priorityVariant[action.priority] || "secondary"} className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {action.priority}
              </Badge>
              <Badge variant={statusVariant[action.status] || "outline"} className="gap-1">
                {action.status === "completed" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {action.status.replace("_", " ")}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {action.assignee?.full_name || "Unassigned"}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Due {format(new Date(action.due_date), "MMM d, yyyy")}
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
      <div className="flex min-h-screen">
        <div className="flex-1 space-y-6 animate-fade-in p-6">
        {/* Executive Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 p-8 border border-blue-500/20">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <ListTodo className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium">Action Management</span>
              </div>
              <h1 className="text-5xl font-black font-['Space_Grotesk']">Action Items</h1>
              <p className="text-muted-foreground text-lg">Track and manage follow-ups and deliverables</p>
            </div>
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                <Switch 
                  checked={gubaEnabled} 
                  onCheckedChange={async (checked) => {
                    setGubaEnabled(checked);
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      await supabase.from('guba_settings').upsert({
                        user_id: user.id,
                        enabled: checked,
                        auto_generate_on_minutes: true,
                        auto_assign_enabled: true,
                        preferred_language: 'en'
                      });
                      toast({
                        title: checked ? "Guba AI Enabled" : "Guba AI Disabled",
                        description: checked ? "AI task features are now active" : "AI task features are now disabled"
                      });
                    }
                  }} 
                />
                <Label className="cursor-pointer font-semibold">Guba AI</Label>
              </div>
              {gubaEnabled && (
                <>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                    <Switch checked={showAnalytics} onCheckedChange={setShowAnalytics} />
                    <Label className="cursor-pointer">Analytics</Label>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
                    <Switch checked={showGubaDashboard} onCheckedChange={setShowGubaDashboard} />
                    <Label className="cursor-pointer">Tasks Dashboard</Label>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30">
                    <Switch checked={showTemplates} onCheckedChange={setShowTemplates} />
                    <Label className="cursor-pointer">Templates</Label>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30">
                    <Switch checked={showGubaSidebar} onCheckedChange={setShowGubaSidebar} />
                    <Label className="cursor-pointer">AI Panel</Label>
                  </div>
                </>
              )}
              <Button 
                variant="outline" 
                className="gap-2 hover-scale"
                onClick={() => setShowDependencyGraph(true)}
              >
                <Network className="h-4 w-4" />
                Dependency Graph
              </Button>
              <Button variant="outline" className="gap-2 hover-scale">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </Button>
              <CreateActionDialog />
            </div>
          </div>
        </div>

        {/* Task Templates Manager */}
        {gubaEnabled && showTemplates && (
          <TaskTemplatesManager />
        )}

        {/* Guba Learning Analytics */}
        {gubaEnabled && showAnalytics && !showTemplates && (
          <GubaLearningAnalytics />
        )}

        {/* Guba Analytics Dashboard */}
        {gubaEnabled && showAnalytics && !showGubaDashboard && !showTemplates && (
          <GubaDashboard />
        )}

        {/* Guba Task Dashboard */}
        {gubaEnabled && showGubaDashboard && !showTemplates && (
          <div className="space-y-4">
            {recentMeetings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    Generate AI Tasks from Meeting
                  </CardTitle>
                  <CardDescription>Select a recent meeting to generate actionable tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={selectedMeetingForTasks} onValueChange={setSelectedMeetingForTasks}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a meeting" />
                    </SelectTrigger>
                    <SelectContent>
                      {recentMeetings.map((meeting) => (
                        <SelectItem key={meeting.id} value={meeting.id}>
                          {meeting.title} - {format(new Date(meeting.start_time), 'MMM d, yyyy')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}
            <GubaTaskProposals 
              meetingId={selectedMeetingForTasks}
              onTasksAccepted={fetchActions}
            />
          </div>
        )}

        {/* Task Export Manager */}
        <TaskExportManager actionItems={actions} />

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-2 hover:border-warning/50 transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Pending
                </CardDescription>
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold">{pendingActions.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-2 hover:border-blue-500/50 transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4" />
                  In Progress
                </CardDescription>
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ArrowUpDown className="h-5 w-5 text-blue-500" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold">{inProgressActions.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-2 hover:border-green-500/50 transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Completed
                </CardDescription>
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold">{completedActions.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardDescription className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Completion Rate
                </CardDescription>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
              </div>
              <CardTitle className="text-4xl font-bold">
                {actions.length > 0 ? Math.round((completedActions.length / actions.length) * 100) : 0}%
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Toolbar */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-1 gap-2 w-full md:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search actions..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Priority
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterPriority("all")}>
                    All Priorities
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterPriority("high")}>
                    High Priority
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterPriority("medium")}>
                    Medium Priority
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterPriority("low")}>
                    Low Priority
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy("due_date")}>
                    By Due Date
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("priority")}>
                    By Priority
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("status")}>
                    By Status
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex gap-2">
              {selectedItems.size > 0 ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={toggleSelectAll}
                    className="gap-2"
                  >
                    {selectedItems.size === actions.length ? "Deselect All" : "Select All"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="default" className="gap-2">
                        <span>{selectedItems.size} selected</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => handleBulkAction("reassign")}>
                        <Users className="h-4 w-4 mr-2" />
                        Reassign Tasks
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction("status")}>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Update Status
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction("priority")}>
                        <Target className="h-4 w-4 mr-2" />
                        Update Priority
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkAction("due_date")}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Update Due Date
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleBulkAction("delete")}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Tasks
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : null}
              <div className="flex items-center border rounded-lg">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="rounded-r-none"
                >
                  <ListTodo className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-l-none"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Guba Task Proposals - Show for all users when enabled */}
        {gubaEnabled && selectedMeetingForTasks && (
          <Card className="border-2 border-purple-500/20 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    Guba AI Task Generation
                  </CardTitle>
                  <CardDescription>
                    Generate actionable tasks from meeting minutes
                  </CardDescription>
                </div>
                {recentMeetings.length > 0 && (
                  <Select value={selectedMeetingForTasks} onValueChange={setSelectedMeetingForTasks}>
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Select meeting" />
                    </SelectTrigger>
                    <SelectContent>
                      {recentMeetings.map((meeting) => (
                        <SelectItem key={meeting.id} value={meeting.id}>
                          {meeting.title} - {format(new Date(meeting.start_time), "MMM d, yyyy")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <GubaTaskProposals 
                meetingId={selectedMeetingForTasks} 
                onTasksAccepted={() => fetchActions()}
              />
            </CardContent>
          </Card>
        )}

        {/* Tabs - Only show when not in Templates mode */}
        {!showTemplates && (
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
        )}
        </div>

        {/* Guba Sidebar */}
        {gubaEnabled && showGubaSidebar && <GubaSidebar />}

        {/* Task Reassignment Dialog */}
        <TaskReassignmentDialog
          open={!!reassignTask}
          onOpenChange={(open) => !open && setReassignTask(null)}
          task={reassignTask}
          onReassigned={() => {
            fetchActions();
            setReassignTask(null);
          }}
        />

        {/* Bulk Operations Manager */}
        {bulkOperation && (
          <BulkOperationsManager
            selectedTaskIds={Array.from(selectedItems)}
            operation={bulkOperation}
            onClose={() => setBulkOperation(null)}
            onComplete={() => {
              fetchActions();
              setSelectedItems(new Set());
              setBulkOperation(null);
            }}
          />
        )}

        {/* Task Dependency Manager */}
        {dependencyTaskId && (
          <TaskDependencyManager
            taskId={dependencyTaskId}
            onClose={() => setDependencyTaskId(null)}
          />
        )}

        {/* Task Dependency Graph */}
        {showDependencyGraph && (
          <TaskDependencyGraph
            onClose={() => setShowDependencyGraph(false)}
          />
        )}
      </div>
    </Layout>
  );
};

export default Actions;
