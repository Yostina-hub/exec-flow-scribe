import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TaskExportManagerProps {
  actionItems?: any[];
  meetingId?: string;
}

export const TaskExportManager = ({ actionItems, meetingId }: TaskExportManagerProps) => {
  const [exportPlatform, setExportPlatform] = useState<string>("google_tasks");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const platforms = [
    { value: "google_tasks", label: "Google Tasks", icon: "📝" },
    { value: "microsoft_todo", label: "Microsoft To-Do", icon: "✓" },
    { value: "asana", label: "Asana", icon: "🎯" },
    { value: "todoist", label: "Todoist", icon: "✔️" },
    { value: "trello", label: "Trello", icon: "📋" },
    { value: "notion", label: "Notion", icon: "📄" },
  ];

  const handleExport = async () => {
    setIsExporting(true);

    try {
      // Get action items to export
      let itemsToExport = actionItems;
      
      if (!itemsToExport) {
        const query = supabase
          .from('action_items')
          .select(`
            *,
            assigned_user:profiles!action_items_assigned_to_fkey(full_name, email),
            created_user:profiles!action_items_created_by_fkey(full_name)
          `)
          .order('created_at', { ascending: false });

        if (meetingId) {
          query.eq('meeting_id', meetingId);
        }

        const { data, error } = await query;
        if (error) throw error;
        itemsToExport = data || [];
      }

      if (!itemsToExport || itemsToExport.length === 0) {
        toast({
          title: "No Tasks to Export",
          description: "There are no action items to export.",
          variant: "destructive",
        });
        return;
      }

      // Call edge function to export tasks
      const { data, error } = await supabase.functions.invoke('export-tasks', {
        body: {
          platform: exportPlatform,
          tasks: itemsToExport.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            dueDate: item.due_date,
            priority: item.priority,
            status: item.status,
            assignee: item.assigned_user?.email,
            assigneeName: item.assigned_user?.full_name,
          }))
        }
      });

      if (error) throw error;

      toast({
        title: "Tasks Exported",
        description: `Successfully exported ${itemsToExport.length} tasks to ${platforms.find(p => p.value === exportPlatform)?.label}`,
      });

      // If the platform provides a link, open it
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export tasks",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = () => {
    if (!actionItems || actionItems.length === 0) {
      toast({
        title: "No Tasks to Export",
        description: "There are no action items to export.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = ['Title', 'Description', 'Assignee', 'Due Date', 'Priority', 'Status'];
    const rows = actionItems.map(item => [
      item.title,
      item.description || '',
      item.assigned_user?.full_name || '',
      item.due_date || '',
      item.priority || '',
      item.status || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `action-items-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "CSV Exported",
      description: `Exported ${actionItems.length} tasks to CSV file`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Task Export
        </CardTitle>
        <CardDescription>
          Export action items to external task management tools
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Export Platform</label>
          <Select value={exportPlatform} onValueChange={setExportPlatform}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((platform) => (
                <SelectItem key={platform.value} value={platform.value}>
                  <span className="flex items-center gap-2">
                    {platform.icon} {platform.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border p-4 space-y-2">
          <p className="text-sm font-medium">Export Features</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3" />
              Syncs task title, description, and due dates
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3" />
              Preserves priority and status
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3" />
              Assigns to team members when possible
            </li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="flex-1"
          >
            {isExporting ? (
              "Exporting..."
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                Export to {platforms.find(p => p.value === exportPlatform)?.label}
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleExportCSV}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>

        <Badge variant="outline" className="w-full justify-center">
          Configure API keys in Settings → Integrations
        </Badge>
      </CardContent>
    </Card>
  );
};
