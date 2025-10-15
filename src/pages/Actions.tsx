import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search, Plus, Filter } from "lucide-react";
import { useState } from "react";

interface ActionItem {
  id: string;
  task: string;
  assignee: string;
  deadline: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed";
  meeting: string;
}

const allActions: ActionItem[] = [
  {
    id: "1",
    task: "Review Q4 financial projections",
    assignee: "CFO",
    deadline: "Dec 18",
    priority: "high",
    status: "in-progress",
    meeting: "Executive Strategy Review",
  },
  {
    id: "2",
    task: "Finalize hiring plan for 2025",
    assignee: "CHRO",
    deadline: "Dec 20",
    priority: "medium",
    status: "pending",
    meeting: "Quarterly Planning Session",
  },
  {
    id: "3",
    task: "Approve marketing budget",
    assignee: "CMO",
    deadline: "Dec 22",
    priority: "high",
    status: "pending",
    meeting: "Budget Review Meeting",
  },
  {
    id: "4",
    task: "Schedule investor presentations",
    assignee: "CoS",
    deadline: "Dec 25",
    priority: "low",
    status: "in-progress",
    meeting: "Investor Relations Call",
  },
  {
    id: "5",
    task: "Update product roadmap document",
    assignee: "CPO",
    deadline: "Dec 19",
    priority: "high",
    status: "in-progress",
    meeting: "Product Roadmap Discussion",
  },
  {
    id: "6",
    task: "Prepare board presentation",
    assignee: "CEO",
    deadline: "Dec 23",
    priority: "high",
    status: "pending",
    meeting: "Leadership Team Meeting",
  },
  {
    id: "7",
    task: "Review vendor contracts",
    assignee: "CFO",
    deadline: "Dec 15",
    priority: "medium",
    status: "completed",
    meeting: "Budget Review Meeting",
  },
  {
    id: "8",
    task: "Conduct team performance reviews",
    assignee: "CHRO",
    deadline: "Dec 10",
    priority: "medium",
    status: "completed",
    meeting: "Leadership Team Meeting",
  },
];

const priorityVariant = {
  high: "destructive" as const,
  medium: "warning" as const,
  low: "secondary" as const,
};

const statusVariant = {
  pending: "outline" as const,
  "in-progress": "warning" as const,
  completed: "success" as const,
};

const Actions = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const pendingActions = allActions.filter((a) => a.status === "pending");
  const inProgressActions = allActions.filter((a) => a.status === "in-progress");
  const completedActions = allActions.filter((a) => a.status === "completed");

  const filterActions = (actions: ActionItem[]) => {
    if (!searchQuery) return actions;
    return actions.filter(
      (a) =>
        a.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.assignee.toLowerCase().includes(searchQuery.toLowerCase())
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
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <Checkbox
            checked={selectedItems.has(action.id)}
            onCheckedChange={() => toggleItem(action.id)}
            className="mt-1"
          />
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-base">{action.task}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                From: {action.meeting}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={priorityVariant[action.priority]}>
                {action.priority}
              </Badge>
              <Badge variant={statusVariant[action.status]}>
                {action.status.replace("-", " ")}
              </Badge>
              <span className="text-xs text-muted-foreground">
                • Assigned to {action.assignee}
              </span>
              <span className="text-xs text-muted-foreground">
                • Due {action.deadline}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="space-y-6">
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
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Action
            </Button>
          </div>
        </div>

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
            <TabsTrigger value="all">All ({allActions.length})</TabsTrigger>
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
            {filterActions(allActions).map((action) => (
              <ActionItemCard key={action.id} action={action} />
            ))}
          </TabsContent>

          <TabsContent value="pending" className="space-y-4 mt-6">
            {filterActions(pendingActions).map((action) => (
              <ActionItemCard key={action.id} action={action} />
            ))}
          </TabsContent>

          <TabsContent value="in-progress" className="space-y-4 mt-6">
            {filterActions(inProgressActions).map((action) => (
              <ActionItemCard key={action.id} action={action} />
            ))}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-6">
            {filterActions(completedActions).map((action) => (
              <ActionItemCard key={action.id} action={action} />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Actions;
