import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Settings, Plus, Edit, Trash2, AlertCircle } from 'lucide-react';

interface ApprovalRulesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ApprovalRule {
  id: string;
  rule_name: string;
  description: string;
  priority: number;
  is_active: boolean;
  conditions: {
    meeting_type?: string;
    sensitivity_level?: string;
    department_id?: string;
  };
  approver_user_ids: string[];
  require_all_approvers: boolean;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

export function ApprovalRulesManager({ open, onOpenChange }: ApprovalRulesManagerProps) {
  const { toast } = useToast();
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    rule_name: '',
    description: '',
    priority: 0,
    is_active: true,
    meeting_type: '',
    sensitivity_level: '',
    department_id: '',
    approver_user_ids: [] as string[],
    require_all_approvers: false,
  });

  useEffect(() => {
    if (open) {
      loadRules();
      loadUsers();
    }
  }, [open]);

  const loadRules = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('approval_rules')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setRules((data as any) || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load approval rules',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
    }
  };

  const handleSaveRule = async () => {
    if (!formData.rule_name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Rule name is required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.approver_user_ids.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one approver is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const conditions: any = {};
      if (formData.meeting_type) conditions.meeting_type = formData.meeting_type;
      if (formData.sensitivity_level) conditions.sensitivity_level = formData.sensitivity_level;
      if (formData.department_id) conditions.department_id = formData.department_id;

      const ruleData = {
        rule_name: formData.rule_name,
        description: formData.description,
        priority: formData.priority,
        is_active: formData.is_active,
        conditions,
        approver_user_ids: formData.approver_user_ids,
        require_all_approvers: formData.require_all_approvers,
      };

      if (editingRule) {
        const { error } = await supabase
          .from('approval_rules')
          .update(ruleData)
          .eq('id', editingRule.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Rule updated successfully' });
      } else {
        const { error } = await supabase
          .from('approval_rules')
          .insert(ruleData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Rule created successfully' });
      }

      setShowForm(false);
      setEditingRule(null);
      resetForm();
      loadRules();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save rule',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const { error } = await supabase
        .from('approval_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Rule deleted successfully' });
      loadRules();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to delete rule',
        variant: 'destructive',
      });
    }
  };

  const handleEditRule = (rule: ApprovalRule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      description: rule.description || '',
      priority: rule.priority,
      is_active: rule.is_active,
      meeting_type: rule.conditions.meeting_type || '',
      sensitivity_level: rule.conditions.sensitivity_level || '',
      department_id: rule.conditions.department_id || '',
      approver_user_ids: rule.approver_user_ids,
      require_all_approvers: rule.require_all_approvers,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      rule_name: '',
      description: '',
      priority: 0,
      is_active: true,
      meeting_type: '',
      sensitivity_level: '',
      department_id: '',
      approver_user_ids: [],
      require_all_approvers: false,
    });
  };

  const toggleApprover = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      approver_user_ids: prev.approver_user_ids.includes(userId)
        ? prev.approver_user_ids.filter(id => id !== userId)
        : [...prev.approver_user_ids, userId],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Settings className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle>Approval Rules</DialogTitle>
              <DialogDescription>
                Configure conditional approval routing based on meeting properties
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!showForm ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Rules are evaluated by priority. First matching rule assigns approvers.
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </div>

            <ScrollArea className="h-[500px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <AlertCircle className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : rules.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No approval rules configured</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-4 rounded-lg border bg-card space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{rule.rule_name}</h4>
                            {!rule.is_active && (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                            <Badge variant="secondary">Priority: {rule.priority}</Badge>
                          </div>
                          {rule.description && (
                            <p className="text-sm text-muted-foreground">{rule.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRule(rule)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRule(rule.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="text-sm space-y-1">
                        <div className="text-muted-foreground">
                          <strong>Conditions:</strong>
                          {Object.keys(rule.conditions).length === 0 ? (
                            <span className="ml-2">All meetings (default rule)</span>
                          ) : (
                            <div className="ml-2 space-y-1">
                              {rule.conditions.meeting_type && (
                                <div>Type: {rule.conditions.meeting_type}</div>
                              )}
                              {rule.conditions.sensitivity_level && (
                                <div>Sensitivity: {rule.conditions.sensitivity_level}</div>
                              )}
                              {rule.conditions.department_id && (
                                <div>Department: {rule.conditions.department_id}</div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          <strong>Approvers:</strong> {rule.approver_user_ids.length}
                          {rule.require_all_approvers && ' (all required)'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Rule Name *</Label>
                <Input
                  value={formData.rule_name}
                  onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                  placeholder="e.g., Executive Meetings Approval"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe when this rule applies..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Active</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Conditions (leave empty for "any")</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs">Meeting Type</Label>
                    <Select
                      value={formData.meeting_type}
                      onValueChange={(value) => setFormData({ ...formData, meeting_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any</SelectItem>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="board">Board</SelectItem>
                        <SelectItem value="executive">Executive</SelectItem>
                        <SelectItem value="department">Department</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Sensitivity Level</Label>
                    <Select
                      value={formData.sensitivity_level}
                      onValueChange={(value) => setFormData({ ...formData, sensitivity_level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="confidential">Confidential</SelectItem>
                        <SelectItem value="highly_confidential">Highly Confidential</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Department</Label>
                    <Input
                      value={formData.department_id}
                      onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                      placeholder="Department ID"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Approvers * ({formData.approver_user_ids.length} selected)</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.require_all_approvers}
                      onCheckedChange={(checked) => setFormData({ ...formData, require_all_approvers: checked })}
                    />
                    <Label className="text-xs">Require all</Label>
                  </div>
                </div>
                <ScrollArea className="h-48 rounded-lg border p-2">
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => toggleApprover(user.id)}
                      >
                        <input
                          type="checkbox"
                          checked={formData.approver_user_ids.includes(user.id)}
                          onChange={() => {}}
                          className="cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium">{user.full_name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingRule(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveRule}>
                {editingRule ? 'Update' : 'Create'} Rule
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
