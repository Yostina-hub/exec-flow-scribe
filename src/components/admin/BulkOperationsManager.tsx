import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Shield, CheckSquare, Calendar } from "lucide-react";

interface BulkOperation {
  id: string;
  operation_type: string;
  entity_type: string;
  total_items: number;
  successful_items: number;
  failed_items: number;
  status: string;
  started_at: string;
  completed_at: string | null;
}

export function BulkOperationsManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [operationType, setOperationType] = useState<'assign_roles' | 'update_access'>('assign_roles');
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
    fetchOperations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('batch_operations_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batch_operations',
        },
        () => {
          fetchOperations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").limit(100),
        supabase.from("roles").select("*"),
      ]);

      if (usersRes.data) setUsers(usersRes.data);
      if (rolesRes.data) setRoles(rolesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchOperations = async () => {
    try {
      const { data, error } = await supabase
        .from("batch_operations" as any)
        .select("*")
        .order("started_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      setOperations((data as any) || []);
    } catch (error) {
      console.error("Error fetching operations:", error);
    }
  };

  const handleBulkAssignRoles = async () => {
    if (selectedUsers.length === 0 || selectedRoles.length === 0) {
      toast({
        title: "Selection required",
        description: "Please select at least one user and one role",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("bulk_assign_roles" as any, {
        _user_ids: selectedUsers,
        _role_ids: selectedRoles,
        _assigned_by: user.id,
      }) as { data: any; error: any };

      if (error) throw error;

      toast({
        title: "Bulk operation completed",
        description: `Successfully assigned roles to ${data.success_count} users`,
      });

      setSelectedUsers([]);
      setSelectedRoles([]);
      fetchOperations();
    } catch (error: any) {
      console.error("Error:", error);
      toast({
        title: "Operation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Bulk Operations
          </CardTitle>
          <CardDescription>
            Perform bulk actions on users, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="operation-type">Operation Type</Label>
            <Select
              value={operationType}
              onValueChange={(value: any) => setOperationType(value)}
            >
              <SelectTrigger id="operation-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assign_roles">Assign Roles</SelectItem>
                <SelectItem value="update_access">Update Meeting Access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {operationType === 'assign_roles' && (
            <>
              <div className="space-y-3">
                <Label>Select Users</Label>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-4 space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={user.id}
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers([...selectedUsers, user.id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter((id) => id !== user.id));
                          }
                        }}
                      />
                      <Label htmlFor={user.id} className="cursor-pointer flex-1">
                        {user.full_name || user.email}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedUsers.length} user(s) selected
                </p>
              </div>

              <div className="space-y-3">
                <Label>Select Roles</Label>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-4 space-y-2">
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={role.id}
                        checked={selectedRoles.includes(role.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedRoles([...selectedRoles, role.id]);
                          } else {
                            setSelectedRoles(selectedRoles.filter((id) => id !== role.id));
                          }
                        }}
                      />
                      <Label htmlFor={role.id} className="cursor-pointer flex-1">
                        <div>
                          <p className="font-medium">{role.name}</p>
                          <p className="text-xs text-muted-foreground">{role.description}</p>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedRoles.length} role(s) selected
                </p>
              </div>

              <Button
                onClick={handleBulkAssignRoles}
                disabled={loading || selectedUsers.length === 0 || selectedRoles.length === 0}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Assign Roles to {selectedUsers.length} User(s)
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Operations</CardTitle>
          <CardDescription>History of bulk operations performed</CardDescription>
        </CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No bulk operations performed yet
            </p>
          ) : (
            <div className="space-y-3">
              {operations.map((op) => (
                <div
                  key={op.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">
                        {op.operation_type.replace('_', ' ')}
                      </span>
                      <Badge variant="outline">{op.entity_type}</Badge>
                      {getStatusBadge(op.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {op.successful_items} / {op.total_items} successful
                      {op.failed_items > 0 && ` · ${op.failed_items} failed`}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(op.started_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
