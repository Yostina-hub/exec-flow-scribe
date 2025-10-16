import { format, startOfDay, addHours } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
                      <button
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className="calendar-event-card absolute left-2 right-2 rounded-lg p-3 text-left group"
                        style={{
                          backgroundColor: event.category?.color_hex || 
                            (event.status === 'completed' ? 'hsl(142 71% 45%)' : 
                             event.status === 'in-progress' ? 'hsl(38 92% 50%)' : 'hsl(237 83% 28%)'),
                          top: position.top,
                          height: position.height,
                          minHeight: "40px",
                          perspective: '1000px'
                        }}
                      >
                        <div className="event-shimmer rounded-lg" />
                        
                        <div className="relative z-10">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0 text-white">
                              <div className="font-bold truncate flex items-center gap-1.5 text-sm">
                                {event.title}
                                {conflict && (
                                  <Badge variant="destructive" className="text-xs">
                                    Conflict
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-white/90 mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(event.start_time), "h:mm a")} - {format(new Date(event.end_time), "h:mm a")}
                              </div>
                              {event.location && (
                                <div className="text-xs text-white/80 truncate mt-1 flex items-center gap-1">
                                  📍 {event.location}
                                </div>
                              )}
                            </div>
                            {event.attendee_count && event.attendee_count > 0 && (
                              <div className="glass-morphism rounded-full px-2 py-1 flex items-center gap-1 text-white shrink-0">
                                <Users className="h-3 w-3" />
                                <span className="text-xs font-medium">{event.attendee_count}</span>
                              </div>
                            )}
                          </div>

                          {/* Enhanced Reveal on Hover */}
                          <div className="event-details-reveal mt-3 glass-morphism rounded-lg p-3 border border-white/30 space-y-2">
                            {event.category && (
                              <div className="flex items-center gap-2">
                                <div 
                                  className="h-3 w-3 rounded-full ring-2 ring-white/50" 
                                  style={{ backgroundColor: event.category.color_hex }}
                                />
                                <span className="text-white/90 text-xs font-medium">
                                  {event.category.name}
                                </span>
                              </div>
                            )}
                            <div className="text-white/80 text-xs">
                              {event.timezone || 'Africa/Addis_Ababa'}
                            </div>
                            <div className="holographic-text font-bold text-sm pt-1 flex items-center gap-2">
                              Click for full details
                              <span className="inline-block animate-bounce">→</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
