import { format, startOfDay, addHours } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status?: string;
  category?: {
    name: string;
    color_hex: string;
  };
  location?: string;
  timezone: string;
  attendees?: Array<{ user_id: string; response_status: string }>;
  attendee_count?: number;
}

interface CalendarDayViewProps {
  events: CalendarEvent[];
  currentDay: Date;
  onDayChange: (newDay: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  timezone?: string;
}

export function CalendarDayView({ 
  events, 
  currentDay, 
  onDayChange, 
  onEventClick,
  timezone = "UTC" 
}: CalendarDayViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const navigateDay = (direction: "prev" | "next") => {
    const newDay = new Date(currentDay);
    newDay.setDate(newDay.getDate() + (direction === "next" ? 1 : -1));
    onDayChange(newDay);
  };

  const goToToday = () => {
    onDayChange(new Date());
  };

  const getEventsForHour = (hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      const eventHour = eventStart.getHours();
      const eventEndHour = new Date(event.end_time).getHours();
      const eventEndMinutes = new Date(event.end_time).getMinutes();
      
      return eventHour <= hour && (eventEndHour > hour || (eventEndHour === hour && eventEndMinutes > 0));
    });
  };

  const getEventPosition = (event: CalendarEvent, hour: number) => {
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(event.end_time);
    const hourStart = new Date(currentDay);
    hourStart.setHours(hour, 0, 0, 0);
    
    const startMinutes = eventStart.getHours() === hour 
      ? eventStart.getMinutes() 
      : 0;
    
    const endHour = eventEnd.getHours();
    const endMinutes = eventEnd.getMinutes();
    const durationInHour = endHour === hour 
      ? endMinutes - startMinutes
      : 60 - startMinutes;
    
    return {
      top: `${(startMinutes / 60) * 100}%`,
      height: `${(durationInHour / 60) * 100}%`,
    };
  };

  const hasConflict = (event: CalendarEvent) => {
    return events.some(other => {
      if (other.id === event.id) return false;
      const start1 = new Date(event.start_time);
      const end1 = new Date(event.end_time);
      const start2 = new Date(other.start_time);
      const end2 = new Date(other.end_time);
      return start1 < end2 && start2 < end1;
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDay("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateDay("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {format(currentDay, "EEEE, MMMM d, yyyy")}
          </h2>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          {hours.map(hour => {
            const hourEvents = getEventsForHour(hour);
            
            return (
              <div key={hour} className="flex border-b last:border-b-0 min-h-[80px]">
                <div className="w-20 flex-shrink-0 border-r p-2 text-sm text-muted-foreground bg-muted/30">
                  {format(addHours(startOfDay(currentDay), hour), "h:mm a")}
                </div>
                <div className="flex-1 p-2 relative">
                  {hourEvents.map(event => {
                    const position = getEventPosition(event, hour);
                    const conflict = hasConflict(event);
                    
                    return (
                      <Tooltip key={event.id} delayDuration={200}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => onEventClick?.(event)}
                            className="calendar-event-hover absolute left-2 right-2 rounded-md p-2 text-left text-sm"
                            style={{
                              backgroundColor: event.category?.color_hex || 
                                (event.status === 'completed' ? 'hsl(142 71% 45%)' : 
                                 event.status === 'in-progress' ? 'hsl(38 92% 50%)' : 'hsl(237 83% 28%)'),
                              top: position.top,
                              height: position.height,
                              minHeight: "40px",
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0 text-white">
                                <div className="font-semibold truncate flex items-center gap-1">
                                  {event.title}
                                  {conflict && (
                                    <Badge variant="destructive" className="text-xs">
                                      Conflict
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs opacity-90 truncate">
                                  {format(new Date(event.start_time), "h:mm a")} - {format(new Date(event.end_time), "h:mm a")}
                                </div>
                                {event.location && (
                                  <div className="text-xs opacity-75 truncate mt-1">
                                    📍 {event.location}
                                  </div>
                                )}
                              </div>
                              {event.attendee_count && event.attendee_count > 0 && (
                                <div className="flex items-center gap-1 text-white text-xs">
                                  <Users className="h-3 w-3" />
                                  <span>{event.attendee_count}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Subtle reveal on hover */}
                            {event.category && (
                              <div className="calendar-event-details">
                                <div className="text-xs text-white/90 pt-2 border-t border-white/20 flex items-center gap-2">
                                  <div 
                                    className="h-2 w-2 rounded-full" 
                                    style={{ backgroundColor: event.category.color_hex }}
                                  />
                                  <span>{event.category.name}</span>
                                </div>
                              </div>
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-2">
                            <div className="font-semibold">{event.title}</div>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                <span>{format(new Date(event.start_time), "MMM d, h:mm a")} - {format(new Date(event.end_time), "h:mm a")}</span>
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3" />
                                  <span>{event.location}</span>
                                </div>
                              )}
                              {event.category && (
                                <div className="flex items-center gap-2">
                                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: event.category.color_hex }} />
                                  <span>{event.category.name}</span>
                                </div>
                              )}
                              {event.attendee_count && event.attendee_count > 0 && (
                                <div className="flex items-center gap-2">
                                  <Users className="h-3 w-3" />
                                  <span>{event.attendee_count} attendee{event.attendee_count !== 1 ? 's' : ''}</span>
                                </div>
                              )}
                              {event.status && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {event.status}
                                  </Badge>
                                </div>
                              )}
                              {event.timezone && (
                                <div className="text-xs text-muted-foreground">
                                  Timezone: {event.timezone}
                                </div>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
