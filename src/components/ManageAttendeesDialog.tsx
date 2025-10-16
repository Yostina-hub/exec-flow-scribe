import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, X, Search, UserCheck, UserX } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Attendee {
  id: string;
  user_id: string;
  role: string;
  response_status: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface ManageAttendeesDialogProps {
  meetingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ManageAttendeesDialog = ({
  meetingId,
  open,
  onOpenChange,
  onSuccess,
}: ManageAttendeesDialogProps) => {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (open && meetingId) {
      fetchData();
    }
  }, [open, meetingId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch meeting details
      const { data: meeting } = await supabase
        .from('meetings')
        .select('title')
        .eq('id', meetingId)
        .single();

      if (meeting) setMeetingTitle(meeting.title);

      // Fetch current attendees
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('meeting_attendees')
        .select('id, user_id, role, response_status, profiles(full_name, email)')
        .eq('meeting_id', meetingId);

      if (attendeesError) throw attendeesError;
      setAttendees(attendeesData as Attendee[] || []);

      // Fetch all users for adding new attendees
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (usersError) throw usersError;
      setAllUsers(usersData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Could not load attendee data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAttendee = async (userId: string, role: string = 'required') => {
    try {
      // Check if already attending
      const existing = attendees.find(a => a.user_id === userId);
      if (existing) {
        toast({
          title: 'Already Attending',
          description: 'This person is already an attendee',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('meeting_attendees')
        .insert({
          meeting_id: meetingId,
          user_id: userId,
          role,
        });

      if (error) throw error;

      toast({
        title: 'Attendee Added',
        description: 'Successfully added to the meeting',
      });

      fetchData();
    } catch (error: any) {
      console.error('Error adding attendee:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not add attendee',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveAttendee = async (attendeeId: string) => {
    try {
      const { error } = await supabase
        .from('meeting_attendees')
        .delete()
        .eq('id', attendeeId);

      if (error) throw error;

      toast({
        title: 'Attendee Removed',
        description: 'Successfully removed from the meeting',
      });

      fetchData();
    } catch (error: any) {
      console.error('Error removing attendee:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not remove attendee',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateRole = async (attendeeId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('meeting_attendees')
        .update({ role: newRole })
        .eq('id', attendeeId);

      if (error) throw error;

      toast({
        title: 'Role Updated',
        description: 'Attendee role has been changed',
      });

      fetchData();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Could not update role',
        variant: 'destructive',
      });
    }
  };

  const availableUsers = allUsers.filter(
    user => !attendees.some(a => a.user_id === user.id) &&
    (searchQuery === '' || 
     user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <UserCheck className="h-3 w-3 text-success" />;
      case 'declined':
        return <UserX className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Attendees
          </DialogTitle>
          <DialogDescription>
            {meetingTitle && `Managing attendees for "${meetingTitle}"`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading attendees...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Attendees */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Current Attendees ({attendees.length})</h3>
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-2">
                  {attendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {attendee.profiles?.full_name?.substring(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {attendee.profiles?.full_name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {attendee.profiles?.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(attendee.response_status)}
                          <Select
                            value={attendee.role}
                            onValueChange={(value) => handleUpdateRole(attendee.id, value)}
                          >
                            <SelectTrigger className="w-[120px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="required">Required</SelectItem>
                              <SelectItem value="optional">Optional</SelectItem>
                              <SelectItem value="organizer">Organizer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAttendee(attendee.id)}
                        className="ml-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Add Attendees */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Add Attendees</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <ScrollArea className="h-[150px] pr-4">
                <div className="space-y-2">
                  {availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {user.full_name?.substring(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAddAttendee(user.id)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  ))}
                  {availableUsers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {searchQuery ? 'No users found' : 'All users are already attendees'}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};