import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserCog, Shield, Users, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  role_name: string;
  user_name: string;
  user_email: string;
}

export function RoleAssignmentManager() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (profiles) setUsers(profiles);

      // Fetch escalation roles
      const { data: rolesData } = await supabase
        .from('roles')
        .select('id, name, description')
        .in('name', ['Chief of Staff', 'CEO', 'Admin'])
        .order('name');

      if (rolesData) setRoles(rolesData);

      // Fetch existing role assignments
      const { data: assignments } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role_id,
          roles!inner(name),
          profiles!inner(full_name, email)
        `);

      if (assignments) {
        const formatted = assignments.map((a: any) => ({
          id: a.id,
          user_id: a.user_id,
          role_id: a.role_id,
          role_name: a.roles.name,
          user_name: a.profiles.full_name || 'Unknown',
          user_email: a.profiles.email || '',
        }));
        setUserRoles(formatted);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load role assignments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast({
        title: 'Missing Selection',
        description: 'Please select both a user and a role',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const { data: currentUser } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser,
          role_id: selectedRole,
          assigned_by: currentUser?.user?.id,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already Assigned',
            description: 'This user already has this role',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return;
      }

      // Verify persisted (when readable)
      const currentUserId = currentUser?.user?.id;
      const { data: verify, error: verifyError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', selectedUser)
        .eq('role_id', selectedRole)
        .maybeSingle();

      if (!verify && !(verifyError && selectedUser !== currentUserId)) {
        throw new Error('Role assignment did not persist.');
      }

      toast({
        title: 'Success',
        description: 'Role assigned successfully',
      });

      setSelectedUser('');
      setSelectedRole('');
      fetchData();
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign role',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Role removed successfully',
      });

      fetchData();
    } catch (error: any) {
      console.error('Error removing role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove role',
        variant: 'destructive',
      });
    }
  };

  const getRoleIcon = (roleName: string) => {
    if (roleName === 'CEO') return Shield;
    if (roleName === 'Chief of Staff') return UserCog;
    return Users;
  };

  const getRoleColor = (roleName: string) => {
    if (roleName === 'CEO') return 'destructive';
    if (roleName === 'Chief of Staff') return 'default';
    return 'secondary';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const chiefOfStaffAssignments = userRoles.filter(ur => ur.role_name === 'Chief of Staff');
  const ceoAssignments = userRoles.filter(ur => ur.role_name === 'CEO');
  const adminAssignments = userRoles.filter(ur => ur.role_name === 'Admin');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Escalation Role Management</CardTitle>
          <CardDescription>
            Assign users to escalation roles for automated notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertDescription>
              <strong>Chief of Staff:</strong> Receives Level 1 escalations (blocked actions or due within 1 day)
              <br />
              <strong>CEO:</strong> Receives Level 2 escalations (overdue actions) and weekly progress reports
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Select Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                      {role.description && (
                        <span className="text-xs text-muted-foreground ml-2">
                          - {role.description}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleAssignRole} disabled={saving} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              {saving ? 'Assigning...' : 'Assign Role'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5" />
              CEO
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ceoAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No CEO assigned</p>
            ) : (
              ceoAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{assignment.user_name}</p>
                    <p className="text-xs text-muted-foreground">{assignment.user_email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRole(assignment.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCog className="w-5 h-5" />
              Chief of Staff
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {chiefOfStaffAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No Chief of Staff assigned</p>
            ) : (
              chiefOfStaffAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{assignment.user_name}</p>
                    <p className="text-xs text-muted-foreground">{assignment.user_email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRole(assignment.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" />
              Admins
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {adminAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No admins assigned</p>
            ) : (
              adminAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-2 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{assignment.user_name}</p>
                    <p className="text-xs text-muted-foreground">{assignment.user_email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRole(assignment.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Role Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {userRoles.map((assignment) => {
              const RoleIcon = getRoleIcon(assignment.role_name);
              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <RoleIcon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{assignment.user_name}</p>
                      <p className="text-sm text-muted-foreground">{assignment.user_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleColor(assignment.role_name)}>
                      {assignment.role_name}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRole(assignment.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {userRoles.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No role assignments yet. Assign roles above to get started.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
