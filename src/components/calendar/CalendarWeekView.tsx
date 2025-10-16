import { useState } from "react";
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, getWeek, isSameDay, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

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
  timezone?: string;
  attendee_count?: number;
}

interface CalendarWeekViewProps {
  events: CalendarEvent[];
  currentWeek: Date;
  onWeekChange: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  timezone?: string;
}

export function CalendarWeekView({
  events,
  currentWeek,
  onWeekChange,
  onEventClick,
  timezone = "UTC"
}: CalendarWeekViewProps) {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const weekNumber = getWeek(currentWeek);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDay = (day: Date) => {
    return events.filter(event => 
      isSameDay(new Date(event.start_time), day)
    );
  };

  const getEventPosition = (event: CalendarEvent) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    return {
      top: `${(startHour / 24) * 100}%`,
      height: `${Math.max((duration / 24) * 100, 2)}%`
    };
  };

  const hasConflict = (event: CalendarEvent, dayEvents: CalendarEvent[]) => {
    return dayEvents.some(other => {
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
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
            </h2>
            <p className="text-sm text-muted-foreground">
              Week {weekNumber} • {timezone}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onWeekChange(subWeeks(currentWeek, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onWeekChange(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onWeekChange(addWeeks(currentWeek, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Day Headers */}
        <div className="grid grid-cols-8 border-b bg-muted/50">
          <div className="p-2 text-xs text-muted-foreground font-medium">
            Time
          </div>
          {weekDays.map(day => (
            <div
              key={day.toString()}
              className={cn(
                "p-2 text-center border-l",
                isToday(day) && "bg-primary/10"
              )}
            >
              <div className="text-xs text-muted-foreground font-medium">
                {format(day, "EEE")}
              </div>
              <div className={cn(
                "text-lg font-semibold mt-1",
                isToday(day) && "text-primary"
              )}>
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>

        {/* Time Grid */}
        <div className="grid grid-cols-8 relative">
          {/* Hours */}
          <div className="border-r">
            {hours.map(hour => (
              <div
                key={hour}
                className="h-16 border-b text-xs text-muted-foreground p-2"
              >
                {format(new Date().setHours(hour, 0), "h a")}
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {weekDays.map(day => {
            const dayEvents = getEventsForDay(day);
            
            return (
              <div
                key={day.toString()}
                className="relative border-l"
              >
                {/* Hour Lines */}
                {hours.map(hour => (
                  <div
                    key={hour}
                    className="h-16 border-b"
                  />
                ))}

                {/* Events */}
                {dayEvents.map(event => {
                  const position = getEventPosition(event);
                  const conflict = hasConflict(event, dayEvents);
                  
                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      className="calendar-event-hover absolute left-1 right-1 rounded-md px-2 py-1 text-left overflow-visible group"
                      style={{
                        top: position.top,
                        height: position.height,
                        backgroundColor: event.category?.color_hex || 
                          (event.status === 'completed' ? 'hsl(142 71% 45%)' : 
                           event.status === 'in-progress' ? 'hsl(38 92% 50%)' : 'hsl(237 83% 28%)'),
                        minHeight: "32px"
                      }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-white truncate flex items-center gap-1">
                            {event.title}
                            {conflict && (
                              <Badge variant="destructive" className="text-[10px] py-0 px-1 h-4">
                                !
                              </Badge>
                            )}
                          </div>
                          {event.location && (
                            <div className="text-xs text-white/80 truncate">
                              {event.location}
                            </div>
                          )}
                        </div>
                        {event.attendee_count && event.attendee_count > 0 && (
                          <div className="flex items-center gap-1 text-white">
                            <Users className="h-3 w-3" />
                            <span className="text-[10px]">{event.attendee_count}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Subtle reveal on hover */}
                      <div className="calendar-event-details">
                        <div className="text-[10px] text-white/90 pt-1 border-t border-white/20">
                          {format(new Date(event.start_time), "h:mm a")} - {format(new Date(event.end_time), "h:mm a")}
                          {event.category && (
                            <span className="ml-2 opacity-75">• {event.category.name}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
