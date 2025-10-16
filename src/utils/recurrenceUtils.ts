import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, isSameDay, startOfDay } from 'date-fns';

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  end_date?: string | null;
  days_of_week?: number[] | null;
  day_of_month?: number | null;
  month_of_year?: number | null;
}

export interface EventException {
  exception_date: string;
  is_cancelled: boolean;
  override_start_time?: string | null;
  override_end_time?: string | null;
  override_location?: string | null;
  override_description?: string | null;
}

export interface RecurringEvent {
  id: string;
  start_time: string;
  end_time: string;
  recurrence_rule: RecurrenceRule;
  exceptions: EventException[];
}

export interface EventInstance {
  originalId: string;
  start: Date;
  end: Date;
  isException: boolean;
  isCancelled: boolean;
  overrides?: Partial<EventException>;
}

export function generateRecurrenceInstances(
  event: RecurringEvent,
  rangeStart: Date,
  rangeEnd: Date
): EventInstance[] {
  const instances: EventInstance[] = [];
  const rule = event.recurrence_rule;
  const eventStart = new Date(event.start_time);
  const eventEnd = new Date(event.end_time);
  const duration = eventEnd.getTime() - eventStart.getTime();

  let currentDate = new Date(eventStart);
  const endLimit = rule.end_date ? new Date(rule.end_date) : addYears(rangeEnd, 2);
  const maxInstances = 1000; // Safety limit
  let instanceCount = 0;

  while (isBefore(currentDate, endLimit) && instanceCount < maxInstances) {
    // Check if this instance falls within our view range
    if (!isBefore(currentDate, rangeStart) && !isAfter(currentDate, rangeEnd)) {
      const exception = event.exceptions.find(ex => 
        isSameDay(new Date(ex.exception_date), currentDate)
      );

      if (exception?.is_cancelled) {
        // Skip cancelled instances
      } else {
        const instanceStart = exception?.override_start_time 
          ? new Date(exception.override_start_time)
          : new Date(currentDate);
        
        const instanceEnd = exception?.override_end_time
          ? new Date(exception.override_end_time)
          : new Date(currentDate.getTime() + duration);

        instances.push({
          originalId: event.id,
          start: instanceStart,
          end: instanceEnd,
          isException: !!exception,
          isCancelled: false,
          overrides: exception ? {
            override_location: exception.override_location,
            override_description: exception.override_description
          } : undefined
        });
      }
    }

    // Calculate next occurrence
    switch (rule.frequency) {
      case 'daily':
        currentDate = addDays(currentDate, rule.interval);
        break;
      case 'weekly':
        if (rule.days_of_week && rule.days_of_week.length > 0) {
          // Find next matching day of week
          let foundNext = false;
          for (let i = 1; i <= 7; i++) {
            const testDate = addDays(currentDate, i);
            if (rule.days_of_week.includes(testDate.getDay())) {
              currentDate = testDate;
              foundNext = true;
              break;
            }
          }
          if (!foundNext) {
            currentDate = addWeeks(currentDate, rule.interval);
          }
        } else {
          currentDate = addWeeks(currentDate, rule.interval);
        }
        break;
      case 'monthly':
        currentDate = addMonths(currentDate, rule.interval);
        break;
      case 'yearly':
        currentDate = addYears(currentDate, rule.interval);
        break;
    }

    instanceCount++;
  }

  return instances;
}
