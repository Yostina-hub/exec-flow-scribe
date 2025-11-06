import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Play, Square, Trash2 } from "lucide-react";

interface BreakoutRoom {
  id: string;
  room_number: number;
  room_name: string;
  status: string;
  duration_minutes: number;
  started_at: string | null;
  ended_at: string | null;
  assignments: Array<{
    id: string;
    user_id: string;
    joined_at: string | null;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  }>;
}

interface Participant {
  id: string;
  user_id: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface BreakoutRoomsManagerProps {
  meetingId: string;
  isHost: boolean;
}

export function BreakoutRoomsManager({ meetingId, isHost }: BreakoutRoomsManagerProps) {
  const [rooms, setRooms] = useState<BreakoutRoom[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [numRooms, setNumRooms] = useState(3);
  const [duration, setDuration] = useState(15);
  const { toast } = useToast();

  useEffect(() => {
    fetchRooms();
    fetchParticipants();

    const channel = supabase
      .channel('breakout-rooms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'breakout_rooms',
          filter: `meeting_id=eq.${meetingId}`,
        },
        () => {
          fetchRooms();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'breakout_room_assignments',
        },
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  const fetchRooms = async () => {
    const { data: roomsData, error } = await supabase
      .from("breakout_rooms")
      .select("*")
      .eq("meeting_id", meetingId)
      .order("room_number");

    if (error) {
      console.error("Error fetching breakout rooms:", error);
      return;
    }

    if (!roomsData) {
      setRooms([]);
      return;
    }

    // Fetch assignments separately with profile data
    const roomsWithAssignments = await Promise.all(
      roomsData.map(async (room) => {
        const { data: assignments } = await supabase
          .from("breakout_room_assignments")
          .select("id, user_id, joined_at")
          .eq("breakout_room_id", room.id);

        const assignmentsWithProfiles = await Promise.all(
          (assignments || []).map(async (assignment) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("id", assignment.user_id)
              .single();

            return {
              ...assignment,
              profiles: profile || { full_name: "Unknown", avatar_url: null },
            };
          })
        );

        return {
          ...room,
          assignments: assignmentsWithProfiles,
        };
      })
    );

    setRooms(roomsWithAssignments);
  };

  const fetchParticipants = async () => {
    const { data, error } = await supabase
      .from("meeting_attendees")
      .select("id, user_id, profiles(id, full_name, avatar_url)")
      .eq("meeting_id", meetingId);

    if (error) {
      console.error("Error fetching participants:", error);
      return;
    }

    setParticipants(data || []);
  };

  const createRooms = async () => {
    if (!isHost) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const roomsToCreate = Array.from({ length: numRooms }, (_, i) => ({
      meeting_id: meetingId,
      room_number: i + 1,
      room_name: `Room ${i + 1}`,
      duration_minutes: duration,
      status: 'pending',
      created_by: user.id,
    }));

    const { error } = await supabase
      .from("breakout_rooms")
      .insert(roomsToCreate);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create breakout rooms",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: `Created ${numRooms} breakout rooms`,
    });
  };

  const autoAssignParticipants = async () => {
    if (!isHost || rooms.length === 0) return;

    const unassigned = participants.filter(
      (p) => !rooms.some((r) => r.assignments.some((a) => a.user_id === p.user_id))
    );

    const assignments = unassigned.map((p, i) => ({
      breakout_room_id: rooms[i % rooms.length].id,
      user_id: p.user_id,
    }));

    const { error } = await supabase
      .from("breakout_room_assignments")
      .insert(assignments);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to assign participants",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Participants assigned to rooms",
    });
  };

  const startRoom = async (roomId: string) => {
    if (!isHost) return;

    const { error } = await supabase
      .from("breakout_rooms")
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq("id", roomId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to start room",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Room Started",
      description: "Breakout room is now active",
    });
  };

  const endRoom = async (roomId: string) => {
    if (!isHost) return;

    const { error } = await supabase
      .from("breakout_rooms")
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq("id", roomId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to end room",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Room Ended",
      description: "Breakout room has been closed",
    });
  };

  const deleteRoom = async (roomId: string) => {
    if (!isHost) return;

    const { error } = await supabase
      .from("breakout_rooms")
      .delete()
      .eq("id", roomId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete room",
        variant: "destructive",
      });
      return;
    }
  };

  const assignToRoom = async (roomId: string, userId: string) => {
    if (!isHost) return;

    const { error } = await supabase
      .from("breakout_room_assignments")
      .insert({ breakout_room_id: roomId, user_id: userId });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to assign participant",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      active: "default",
      completed: "secondary",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (!isHost && rooms.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Breakout Rooms
        </CardTitle>
        <CardDescription>
          Create and manage breakout rooms for focused discussions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isHost && rooms.length === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numRooms">Number of Rooms</Label>
                <Input
                  id="numRooms"
                  type="number"
                  min="1"
                  max="10"
                  value={numRooms}
                  onChange={(e) => setNumRooms(parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="5"
                  max="120"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                />
              </div>
            </div>
            <Button onClick={createRooms} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create Breakout Rooms
            </Button>
          </div>
        )}

        {isHost && rooms.length > 0 && (
          <Button onClick={autoAssignParticipants} variant="outline" className="w-full">
            <Users className="h-4 w-4 mr-2" />
            Auto-Assign Participants
          </Button>
        )}

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {rooms.map((room) => (
              <Card key={room.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{room.room_name}</CardTitle>
                      <CardDescription>
                        {room.duration_minutes} minutes • {room.assignments.length} participants
                      </CardDescription>
                    </div>
                    {getStatusBadge(room.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {room.assignments.map((assignment) => (
                      <Badge key={assignment.id} variant="secondary">
                        {assignment.profiles.full_name}
                      </Badge>
                    ))}
                  </div>

                  {isHost && (
                    <div className="flex gap-2">
                      {room.status === 'pending' && (
                        <Button onClick={() => startRoom(room.id)} size="sm">
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                      )}
                      {room.status === 'active' && (
                        <Button onClick={() => endRoom(room.id)} size="sm" variant="destructive">
                          <Square className="h-4 w-4 mr-1" />
                          End
                        </Button>
                      )}
                      <Button onClick={() => deleteRoom(room.id)} size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {isHost && room.status === 'pending' && (
                    <Select onValueChange={(userId) => assignToRoom(room.id, userId)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add participant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {participants
                          .filter((p) => !room.assignments.some((a) => a.user_id === p.user_id))
                          .map((p) => (
                            <SelectItem key={p.user_id} value={p.user_id}>
                              {p.profiles.full_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
