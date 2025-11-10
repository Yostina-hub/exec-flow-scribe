import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Plus, Edit, Trash2, Loader2, Users, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Department {
  id: string;
  name: string;
  name_am: string | null;
  description: string | null;
  parent_department_id: string | null;
  head_user_id: string | null;
  level: number;
  head?: { full_name: string };
  parent?: { name: string };
}

export const DepartmentManager = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    name_am: "",
    description: "",
    parent_department_id: "",
    head_user_id: "",
    level: 1
  });

  useEffect(() => {
    fetchDepartments();
    fetchUsers();
  }, []);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('level', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      // Enrich with head and parent info separately
      const enriched = await Promise.all((data || []).map(async (dept) => {
        const [head, parent] = await Promise.all([
          dept.head_user_id 
            ? supabase.from('profiles').select('full_name').eq('id', dept.head_user_id).maybeSingle()
            : Promise.resolve({ data: null }),
          dept.parent_department_id
            ? supabase.from('departments').select('name').eq('id', dept.parent_department_id).maybeSingle()
            : Promise.resolve({ data: null })
        ]);
        
        return {
          ...dept,
          head: head.data,
          parent: parent.data
        };
      }));

      setDepartments(enriched);
    } catch (error) {
      console.error('Error fetching departments:', error);
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingDept) {
        const { error } = await supabase
          .from('departments')
          .update({
            name: formData.name,
            name_am: formData.name_am || null,
            description: formData.description || null,
            parent_department_id: (formData.parent_department_id && formData.parent_department_id !== 'no-parent') ? formData.parent_department_id : null,
            head_user_id: (formData.head_user_id && formData.head_user_id !== 'no-head') ? formData.head_user_id : null,
            level: formData.level
          })
          .eq('id', editingDept.id);

        if (error) throw error;
        
        toast({
          title: "Department Updated",
          description: "Department has been updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('departments')
          .insert({
            name: formData.name,
            name_am: formData.name_am || null,
            description: formData.description || null,
            parent_department_id: (formData.parent_department_id && formData.parent_department_id !== 'no-parent') ? formData.parent_department_id : null,
            head_user_id: (formData.head_user_id && formData.head_user_id !== 'no-head') ? formData.head_user_id : null,
            level: formData.level
          });

        if (error) throw error;
        
        toast({
          title: "Department Created",
          description: "New department has been created successfully",
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchDepartments();
    } catch (error: any) {
      console.error('Error saving department:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save department",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      name_am: dept.name_am || "",
      description: dept.description || "",
      parent_department_id: dept.parent_department_id || "",
      head_user_id: dept.head_user_id || "",
      level: dept.level
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;

    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Department Deleted",
        description: "Department has been deleted successfully",
      });

      fetchDepartments();
    } catch (error: any) {
      console.error('Error deleting department:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete department",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      name_am: "",
      description: "",
      parent_department_id: "",
      head_user_id: "",
      level: 1
    });
    setEditingDept(null);
  };

  const getLevelLabel = (level: number) => {
    switch (level) {
      case 1: return "Executive";
      case 2: return "Manager/Department";
      case 3: return "Team/Expert";
      default: return `Level ${level}`;
    }
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return "destructive";
      case 2: return "warning";
      case 3: return "secondary";
      default: return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Department Management
            </CardTitle>
            <CardDescription>
              Manage organizational structure and department hierarchy
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingDept ? 'Edit Department' : 'Create New Department'}
                </DialogTitle>
                <DialogDescription>
                  Set up organizational structure for intelligent task assignment
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Department Name (English)</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name_am">Department Name (Amharic)</Label>
                    <Input
                      id="name_am"
                      value={formData.name_am}
                      onChange={(e) => setFormData({ ...formData, name_am: e.target.value })}
                      placeholder="የክፍል ስም"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="level">Hierarchy Level</Label>
                    <Select value={formData.level.toString()} onValueChange={(v) => setFormData({ ...formData, level: parseInt(v) })}>
                      <SelectTrigger id="level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Executive</SelectItem>
                        <SelectItem value="2">2 - Manager/Department</SelectItem>
                        <SelectItem value="3">3 - Team/Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parent">Parent Department</Label>
                    <Select value={formData.parent_department_id} onValueChange={(v) => setFormData({ ...formData, parent_department_id: v })}>
                      <SelectTrigger id="parent">
                        <SelectValue placeholder="None (Top Level)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-parent">None (Top Level)</SelectItem>
                        {departments.filter(d => d.id !== editingDept?.id).map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="head">Department Head</Label>
                  <Select value={formData.head_user_id} onValueChange={(v) => setFormData({ ...formData, head_user_id: v })}>
                    <SelectTrigger id="head">
                      <SelectValue placeholder="Select department head" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-head">None</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingDept ? 'Update' : 'Create'} Department
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {departments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No departments yet. Create your first department to get started.
            </p>
          ) : (
            departments.map((dept) => (
              <Card key={dept.id} className="border-2 hover:border-primary/30 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{dept.name}</h3>
                        {dept.name_am && (
                          <span className="text-sm text-muted-foreground">({dept.name_am})</span>
                        )}
                      </div>
                      {dept.description && (
                        <p className="text-sm text-muted-foreground">{dept.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getLevelColor(dept.level) as any}>
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {getLevelLabel(dept.level)}
                        </Badge>
                        {(dept.head as any)?.full_name && (
                          <Badge variant="outline" className="gap-1">
                            <Users className="h-3 w-3" />
                            Head: {(dept.head as any).full_name}
                          </Badge>
                        )}
                        {(dept.parent as any)?.name && (
                          <Badge variant="outline">
                            Reports to: {(dept.parent as any).name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(dept)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(dept.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
