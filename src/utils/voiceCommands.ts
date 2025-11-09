// Voice command utilities and definitions

export interface VoiceCommand {
  phrases: string[];
  action: string;
  description: string;
  category: 'recording' | 'actions' | 'meeting' | 'navigation' | 'dictation';
  isDictation?: boolean;
}

export const AMHARIC_COMMANDS = {
  startRecording: ['ጀምር መቅረጽ', 'መቅረጽ ጀምር', 'ቅዳ ጀምር', 'ቀረፃ ጀምር'],
  stopRecording: ['አቁም መቅረጽ', 'መቅረጽ አቁም', 'ቅዳ አቁም', 'ቀረፃ አቁም'],
  addAction: ['ተግባር ጨምር', 'አዲስ ተግባር', 'ስራ ጨምር', 'ታስክ ጨምር'],
  addDecision: ['ውሳኔ ጨምር', 'አዲስ ውሳኔ', 'ውሳኔ መዝግብ', 'ውሳኔ ፃፍ'],
  generateMinutes: ['ደቂቃዎች ፍጠር', 'ማጠቃለያ ፍጠር', 'ሪፖርት ፍጠር', 'ደቂቃዎች ሰራ'],
  endMeeting: ['ስብሰባ አብቃ', 'ስብሰባ ዝጋ', 'ስብሰባ ጨርስ', 'ስብሰባ አጠናቅ'],
  pauseRecording: ['ቆም መቅረጽ', 'ለአፍታ ቁም', 'ማቆም'],
  resumeRecording: ['ቀጥል መቅረጽ', 'እንደገና ጀምር', 'ቀጥል'],
};

export const ENGLISH_COMMANDS = {
  startRecording: ['start recording', 'begin recording', 'start capture', 'record now'],
  stopRecording: ['stop recording', 'end recording', 'stop capture', 'end capture'],
  addAction: ['add action', 'create action', 'new action', 'add task', 'create task'],
  addDecision: ['add decision', 'record decision', 'new decision', 'save decision'],
  generateMinutes: ['generate minutes', 'create minutes', 'make minutes', 'produce minutes'],
  endMeeting: ['end meeting', 'close meeting', 'finish meeting', 'conclude meeting'],
  pauseRecording: ['pause recording', 'pause capture', 'hold recording'],
  resumeRecording: ['resume recording', 'continue recording', 'unpause recording'],
};

export const ALL_COMMANDS: VoiceCommand[] = [
  // Recording commands
  {
    phrases: [...ENGLISH_COMMANDS.startRecording, ...AMHARIC_COMMANDS.startRecording],
    action: 'startRecording',
    description: 'Start recording the meeting',
    category: 'recording',
  },
  {
    phrases: [...ENGLISH_COMMANDS.stopRecording, ...AMHARIC_COMMANDS.stopRecording],
    action: 'stopRecording',
    description: 'Stop recording the meeting',
    category: 'recording',
  },
  {
    phrases: [...ENGLISH_COMMANDS.pauseRecording, ...AMHARIC_COMMANDS.pauseRecording],
    action: 'pauseRecording',
    description: 'Pause the recording',
    category: 'recording',
  },
  {
    phrases: [...ENGLISH_COMMANDS.resumeRecording, ...AMHARIC_COMMANDS.resumeRecording],
    action: 'resumeRecording',
    description: 'Resume the recording',
    category: 'recording',
  },
  // Action item commands
  {
    phrases: [...ENGLISH_COMMANDS.addAction, ...AMHARIC_COMMANDS.addAction],
    action: 'addAction',
    description: 'Navigate to add action item',
    category: 'actions',
  },
  {
    phrases: [...ENGLISH_COMMANDS.addDecision, ...AMHARIC_COMMANDS.addDecision],
    action: 'addDecision',
    description: 'Navigate to record decision',
    category: 'actions',
  },
  // Meeting commands
  {
    phrases: [...ENGLISH_COMMANDS.generateMinutes, ...AMHARIC_COMMANDS.generateMinutes],
    action: 'generateMinutes',
    description: 'Generate meeting minutes',
    category: 'meeting',
  },
  {
    phrases: [...ENGLISH_COMMANDS.endMeeting, ...AMHARIC_COMMANDS.endMeeting],
    action: 'endMeeting',
    description: 'End the meeting session',
    category: 'meeting',
  },
];

export function matchCommand(transcript: string): VoiceCommand | null {
  const normalized = transcript.toLowerCase().trim();
  
  return ALL_COMMANDS.find(cmd => 
    cmd.phrases.some(phrase => {
      const phraseNormalized = phrase.toLowerCase();
      return normalized.includes(phraseNormalized) || phraseNormalized.includes(normalized);
    })
  ) || null;
}

export function matchDictation(transcript: string): { type: 'action' | 'decision', content: string } | null {
  const normalized = transcript.toLowerCase().trim();
  
  // Action dictation patterns
  const actionPrefixes = ['add action:', 'create task:', 'action item:', 'new action:', 'task:'];
  for (const prefix of actionPrefixes) {
    if (normalized.startsWith(prefix)) {
      return {
        type: 'action',
        content: transcript.trim()
      };
    }
  }
  
  // Decision dictation patterns
  const decisionPrefixes = ['add decision:', 'record decision:', 'new decision:', 'decision:'];
  for (const prefix of decisionPrefixes) {
    if (normalized.startsWith(prefix)) {
      return {
        type: 'decision',
        content: transcript.trim()
      };
    }
  }
  
  return null;
}

export function matchAssignment(transcript: string): { assigneeName: string } | null {
  const normalized = transcript.toLowerCase().trim();
  
  // Assignment patterns: "assign this to NAME", "give this to NAME", "reassign to NAME"
  const patterns = [
    /(?:assign|give|reassign)(?:\s+this)?(?:\s+task)?(?:\s+to)\s+(.+)/i,
    /(?:make)\s+(.+?)(?:\s+the)?(?:\s+assignee)/i,
    /(?:change|switch)(?:\s+assignee)?(?:\s+to)\s+(.+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      // Clean up the extracted name
      let name = match[1].trim();
      // Remove trailing words that might be captured
      name = name.replace(/\s+(please|thanks|thank you)$/i, '').trim();
      return { assigneeName: name };
    }
  }
  
  return null;
}

export function matchPriorityChange(transcript: string): { priority: 'low' | 'medium' | 'high' } | null {
  const normalized = transcript.toLowerCase().trim();
  
  // Priority change patterns
  const patterns = [
    /(?:make|set|change|mark)(?:\s+this)?(?:\s+task)?(?:\s+as)?(?:\s+priority)?(?:\s+to)?\s+(high|urgent|important|critical|top)/i,
    /(?:make|set|change|mark)(?:\s+this)?(?:\s+task)?(?:\s+as)?(?:\s+priority)?(?:\s+to)?\s+(medium|normal|moderate|regular)/i,
    /(?:make|set|change|mark)(?:\s+this)?(?:\s+task)?(?:\s+as)?(?:\s+priority)?(?:\s+to)?\s+(low|minor|not urgent)/i,
    /(?:increase|raise|bump|elevate)(?:\s+the)?(?:\s+priority)/i,
    /(?:decrease|lower|reduce|downgrade)(?:\s+the)?(?:\s+priority)/i,
    /(?:urgent|high priority|critical)/i,
  ];
  
  // Check for "increase/raise priority" - default to high
  if (normalized.match(/(?:increase|raise|bump|elevate)(?:\s+the)?(?:\s+priority)/i)) {
    return { priority: 'high' };
  }
  
  // Check for "decrease/lower priority" - default to low
  if (normalized.match(/(?:decrease|lower|reduce|downgrade)(?:\s+the)?(?:\s+priority)/i)) {
    return { priority: 'low' };
  }
  
  // Map priority keywords to levels
  const highKeywords = ['high', 'urgent', 'important', 'critical', 'top'];
  const mediumKeywords = ['medium', 'normal', 'moderate', 'regular'];
  const lowKeywords = ['low', 'minor', 'not urgent'];
  
  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      const keyword = match[1].toLowerCase();
      
      if (highKeywords.includes(keyword)) {
        return { priority: 'high' };
      } else if (mediumKeywords.includes(keyword)) {
        return { priority: 'medium' };
      } else if (lowKeywords.includes(keyword)) {
        return { priority: 'low' };
      }
    }
  }
  
  return null;
}

export function getCommandsByCategory(category: VoiceCommand['category']): VoiceCommand[] {
  return ALL_COMMANDS.filter(cmd => cmd.category === category);
}

export function getAllCommands(): VoiceCommand[] {
  return ALL_COMMANDS;
}
