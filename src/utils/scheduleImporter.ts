import { supabase } from "@/integrations/supabase/client";

interface ScheduleMeeting {
  title: string;
  description?: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startHour: number;
  startMinute: number;
  durationMinutes: number;
  frequency: 'weekly' | 'biweekly';
  location?: string;
}

const scheduleData: ScheduleMeeting[] = [
  // Monday meetings
  {
    title: "Project Horizon Board Meeting",
    description: "MENAB Sales & Marketing Solutions - selling Ovid Real Estate's 60,000 housing units and Kavod's 6,000 Shops",
    dayOfWeek: 1,
    startHour: 9,
    startMinute: 0,
    durationMinutes: 240, // 9am-1pm
    frequency: 'weekly',
    location: "Board Room"
  },
  {
    title: "Meeting with KIDI",
    description: "Chief of Staff + Leads Corp Finance, Digitization & Reading Culture Initiatives, Talent Acquisition Taskforce",
    dayOfWeek: 1,
    startHour: 11,
    startMinute: 0,
    durationMinutes: 60,
    frequency: 'weekly',
    location: "Conference Room"
  },
  {
    title: "Revenue Council: Misge",
    description: "One-time revenue council meeting",
    dayOfWeek: 1,
    startHour: 16,
    startMinute: 0,
    durationMinutes: 60,
    frequency: 'weekly',
    location: "Virtual"
  },
  {
    title: "Revenue Council: Yale",
    description: "Weekly revenue council meeting",
    dayOfWeek: 1,
    startHour: 17,
    startMinute: 0,
    durationMinutes: 60,
    frequency: 'weekly',
    location: "Virtual"
  },
  {
    title: "Meeting with All Councils Chairs",
    description: "Daily meeting with all council chairs",
    dayOfWeek: 1,
    startHour: 17,
    startMinute: 0,
    durationMinutes: 60,
    frequency: 'weekly',
    location: "Conference Room"
  },
  {
    title: "Meeting with YALE",
    description: "Ovid Construction CEO + Leader of 4 Ovid Manufacturing Companies",
    dayOfWeek: 1,
    startHour: 11,
    startMinute: 0,
    durationMinutes: 60,
    frequency: 'biweekly',
    location: "Conference Room"
  },
  {
    title: "Meeting with TITI",
    description: "Ovid PMO CEO + Scaling Up Coordinator, Head of Vision 2035",
    dayOfWeek: 1,
    startHour: 11,
    startMinute: 0,
    durationMinutes: 60,
    frequency: 'biweekly',
    location: "Conference Room"
  },

  // Tuesday meetings
  {
    title: "Meeting with MULE",
    description: "Ovid Real Estate CEO + Leader of 5-2nd generation contractors, 2-Supply Chain Companies & 3-SPVs",
    dayOfWeek: 2,
    startHour: 9,
    startMinute: 0,
    durationMinutes: 120,
    frequency: 'weekly',
    location: "Conference Room"
  },
  {
    title: "Revenue Council: Sam",
    description: "Weekly revenue council meeting",
    dayOfWeek: 2,
    startHour: 17,
    startMinute: 0,
    durationMinutes: 60,
    frequency: 'weekly',
    location: "Virtual"
  },
  {
    title: "Meeting with All Councils Chairs",
    description: "Daily meeting with all council chairs",
    dayOfWeek: 2,
    startHour: 17,
    startMinute: 0,
    durationMinutes: 60,
    frequency: 'weekly',
    location: "Conference Room"
  },
  {
    title: "Meeting with Elton",
    description: "Every two weeks - focus on key initiatives and strategic goals",
    dayOfWeek: 2,
    startHour: 9,
    startMinute: 0,
    durationMinutes: 120,
    frequency: 'biweekly',
    location: "Executive Office"
  },

  // Wednesday meetings
  {
    title: "Meeting with BINI",
    description: "Ovid Trading CEO + Leader of 3-Logistics Taskforce",
    dayOfWeek: 3,
    startHour: 9,
    startMinute: 0,
    durationMinutes: 120,
    frequency: 'weekly',
    location: "Conference Room"
  },
  {
    title: "Revenue Council: Mule",
    description: "Weekly revenue council meeting",
    dayOfWeek: 3,
    startHour: 17,
    startMinute: 0,
    durationMinutes: 60,
    frequency: 'weekly',
    location: "Virtual"
  },
  {
    title: "Meeting with All Councils Chairs",
    description: "Daily meeting with all council chairs",
    dayOfWeek: 3,
    startHour: 17,
    startMinute: 0,
    durationMinutes: 60,
    frequency: 'weekly',
    location: "Conference Room"
  },
  {
    title: "Meeting with MISGE",
    description: "Kavod Commercial CEO + Leader of 5-2nd generation contractors, 5-Supply Chain Companies",
    dayOfWeek: 3,
    startHour: 9,
    startMinute: 0,
    durationMinutes: 120,
    frequency: 'biweekly',
    location: "Conference Room"
  },

  // Thursday meetings
  {
    title: "Ermias - Road",
    description: "Road inspection and review",
    dayOfWeek: 4,
    startHour: 9,
    startMinute: 0,
    durationMinutes: 120,
    frequency: 'weekly',
    location: "Field Visit"
  },
  {
    title: "Meeting with TTI",
    description: "Ovid PMO CEO Scaling Up Coordinator, Head Vision 2035",
    dayOfWeek: 4,
    startHour: 11,
    startMinute: 0,
    durationMinutes: 60,
    frequency: 'weekly',
    location: "Conference Room"
  },
  {
    title: "Revenue Council: Misge",
    description: "Weekly revenue council meeting",
    dayOfWeek: 4,
    startHour: 17,
    startMinute: 0,
    durationMinutes: 60,
    frequency: 'weekly',
    location: "Virtual"
  },
  {
    title: "Meeting with All Councils Chairs",
    description: "Daily meeting with all council chairs",
    dayOfWeek: 4,
    startHour: 17,
    startMinute: 0,
    durationMinutes: 60,
    frequency: 'weekly',
    location: "Conference Room"
  },
  {
    title: "Meeting with SAM",
    description: "African Capital Partners Inv Bank Rep + Leader of Growth Partner Initiative",
    dayOfWeek: 4,
    startHour: 9,
    startMinute: 0,
    durationMinutes: 60,
    frequency: 'biweekly',
    location: "Conference Room"
  },

  // Friday meetings
  {
    title: "Meeting with KEBI",
    description: "Ovid PMO CoO, Head of Ovid Design & Engineering, Lead 100 Blocks",
    dayOfWeek: 5,
    startHour: 9,
    startMinute: 0,
    durationMinutes: 120,
    frequency: 'weekly',
    location: "Conference Room"
  },
  {
    title: "Revenue Council: Kebi",
    description: "Weekly revenue council meeting",
    dayOfWeek: 5,
    startHour: 17,
    startMinute: 0,
    durationMinutes: 60,
    frequency: 'weekly',
    location: "Virtual"
  },
  {
    title: "Meeting with All Councils Chairs",
    description: "Daily meeting with all council chairs",
    dayOfWeek: 5,
    startHour: 17,
    startMinute: 0,
    durationMinutes: 60,
    frequency: 'weekly',
    location: "Conference Room"
  },
  {
    title: "20 Project owners & 7 Councils Chairs Evaluation Meeting",
    description: "Bi-weekly evaluation meeting with all project owners and council chairs",
    dayOfWeek: 5,
    startHour: 9,
    startMinute: 0,
    durationMinutes: 180,
    frequency: 'biweekly',
    location: "Board Room"
  },
];

export async function importSchedule(): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, message: "User not authenticated" };
    }

    // Create or fetch categories for color coding
    const categoryMap: Record<string, string> = {};
    
    const categories = [
      { name: "Board Meeting", color_hex: "#8B5CF6", pattern: ["Board Meeting", "Project Horizon"] },
      { name: "Executive 1:1", color_hex: "#3B82F6", pattern: ["Meeting with"] },
      { name: "Revenue Council", color_hex: "#10B981", pattern: ["Revenue Council"] },
      { name: "Council Chairs", color_hex: "#F59E0B", pattern: ["Councils Chairs"] },
      { name: "Strategic", color_hex: "#EF4444", pattern: ["Evaluation Meeting"] },
      { name: "Operations", color_hex: "#6366F1", pattern: ["Road", "Field"] }
    ];

    // Create categories if they don't exist
    for (const cat of categories) {
      const { data: existing } = await supabase
        .from('event_categories')
        .select('id')
        .eq('name', cat.name)
        .single();

      if (existing) {
        categoryMap[cat.name] = existing.id;
      } else {
        const { data: newCat } = await supabase
          .from('event_categories')
          .insert({
            name: cat.name,
            color_hex: cat.color_hex,
            description: `Auto-created for ${cat.name}`,
            created_by: user.id
          })
          .select('id')
          .single();
        
        if (newCat) {
          categoryMap[cat.name] = newCat.id;
        }
      }
    }

    // Helper function to assign category based on meeting title
    const getCategoryId = (title: string): string | undefined => {
      for (const cat of categories) {
        if (cat.pattern.some(p => title.includes(p))) {
          return categoryMap[cat.name];
        }
      }
      return undefined;
    };

    // Get the first Monday of October 2025 (Week 42 starts Oct 13, 2025)
    const baseDate = new Date('2025-10-13'); // Monday, Oct 13, 2025
    let insertedCount = 0;

    for (const meeting of scheduleData) {
      // Calculate the date for this meeting
      const meetingDate = new Date(baseDate);
      const dayDiff = meeting.dayOfWeek - 1; // baseDate is Monday (1)
      meetingDate.setDate(meetingDate.getDate() + dayDiff);
      
      // Set the time
      meetingDate.setHours(meeting.startHour, meeting.startMinute, 0, 0);
      
      // Calculate end time
      const endTime = new Date(meetingDate);
      endTime.setMinutes(endTime.getMinutes() + meeting.durationMinutes);

      // Insert the meeting with category
      const categoryId = getCategoryId(meeting.title);
      const { data: insertedMeeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          title: meeting.title,
          description: meeting.description || '',
          start_time: meetingDate.toISOString(),
          end_time: endTime.toISOString(),
          location: meeting.location || 'TBD',
          status: 'scheduled',
          created_by: user.id,
          category_id: categoryId,
          is_recurring: true
        })
        .select()
        .single();

      if (meetingError) {
        console.error(`Error inserting meeting ${meeting.title}:`, meetingError);
        continue;
      }

      // Add the creator as an attendee
      await supabase.from('meeting_attendees').insert({
        meeting_id: insertedMeeting.id,
        user_id: user.id,
        attended: false,
      });

      // Create recurrence rule
      const { error: recurrenceError } = await supabase
        .from('recurrence_rules')
        .insert({
          meeting_id: insertedMeeting.id,
          frequency: meeting.frequency === 'weekly' ? 'weekly' : 'weekly',
          interval: meeting.frequency === 'weekly' ? 1 : 2,
          day_of_week: meeting.dayOfWeek,
          end_date: '2025-12-31', // End of year
        });

      if (recurrenceError) {
        console.error(`Error creating recurrence for ${meeting.title}:`, recurrenceError);
      }

      insertedCount++;
    }

    return { 
      success: true, 
      message: `Successfully imported ${insertedCount} recurring meetings from the CEO schedule`,
      count: insertedCount 
    };
  } catch (error) {
    console.error('Error importing schedule:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to import schedule' 
    };
  }
}
