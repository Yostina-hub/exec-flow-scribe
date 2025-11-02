// Amharic Email Templates for Ethiopian Telecom

export interface EmailTemplate {
  subject: string;
  body: string;
}

export const amharicTemplates = {
  meetingInvitation: (meetingTitle: string, date: string, time: string, location: string): EmailTemplate => ({
    subject: `ስብሰባ ግብዣ: ${meetingTitle}`,
    body: `
      <div dir="rtl" style="font-family: 'Noto Sans Ethiopic', Arial, sans-serif; padding: 20px;">
        <h2 style="color: #2563eb;">ወደ ስብሰባ ተጋብዘዋል</h2>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>${meetingTitle}</h3>
          <p><strong>ቀን:</strong> ${date}</p>
          <p><strong>ሰዓት:</strong> ${time}</p>
          <p><strong>ቦታ:</strong> ${location}</p>
        </div>

        <p>እባክዎን መገኘትዎን ያረጋግጡ።</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            የኢትዮጵያ ቴሌኮም<br/>
            አስፈፃሚ ስብሰባ አስተዳደር ስርዓት
          </p>
        </div>
      </div>
    `
  }),

  minutesDistribution: (meetingTitle: string, minutesSummary: string): EmailTemplate => ({
    subject: `የስብሰባ ማጠቃለያ: ${meetingTitle}`,
    body: `
      <div dir="rtl" style="font-family: 'Noto Sans Ethiopic', Arial, sans-serif; padding: 20px;">
        <h2 style="color: #2563eb;">የስብሰባ ማጠቃለያ</h2>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>${meetingTitle}</h3>
          <div style="margin-top: 15px;">
            ${minutesSummary}
          </div>
        </div>

        <p>PDF ተያያዥ ላይ ሙሉውን ማጠቃለያ ያገኛሉ።</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            የኢትዮጵያ ቴሌኮም<br/>
            አስፈፃሚ ስብሰባ አስተዳደር ስርዓት
          </p>
        </div>
      </div>
    `
  }),

  actionItemReminder: (actionTitle: string, dueDate: string): EmailTemplate => ({
    subject: `የስራ አስታዋሽ: ${actionTitle}`,
    body: `
      <div dir="rtl" style="font-family: 'Noto Sans Ethiopic', Arial, sans-serif; padding: 20px;">
        <h2 style="color: #f59e0b;">የስራ አስታዋሽ</h2>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
          <h3>${actionTitle}</h3>
          <p><strong>የመጨረሻ ቀን:</strong> ${dueDate}</p>
        </div>

        <p>እባክዎን ይህንን ስራ በተቀመጠው ጊዜ ውስጥ ያጠናቅቁ።</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            የኢትዮጵያ ቴሌኮም<br/>
            አስፈፃሚ ስብሰባ አስተዳደር ስርዓት
          </p>
        </div>
      </div>
    `
  }),

  signatureRequest: (documentName: string): EmailTemplate => ({
    subject: `የፊርማ ጥያቄ: ${documentName}`,
    body: `
      <div dir="rtl" style="font-family: 'Noto Sans Ethiopic', Arial, sans-serif; padding: 20px;">
        <h2 style="color: #8b5cf6;">የፊርማ ጥያቄ</h2>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p>የሚከተለው ሰነድ ፊርማዎን እየጠበቀ ነው:</p>
          <h3 style="margin-top: 10px;">${documentName}</h3>
        </div>

        <p>እባክዎን ሰነዱን ገምግመው በስርዓቱ ላይ ይፈርሙ።</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            የኢትዮጵያ ቴሌኮም<br/>
            አስፈፃሚ ስብሰባ አስተዳደር ስርዓት
          </p>
        </div>
      </div>
    `
  }),

  urgentNotification: (title: string, message: string): EmailTemplate => ({
    subject: `አስቸኳይ: ${title}`,
    body: `
      <div dir="rtl" style="font-family: 'Noto Sans Ethiopic', Arial, sans-serif; padding: 20px;">
        <div style="background: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 20px;">
          <h2 style="color: #dc2626; margin: 0;">⚠️ አስቸኳይ መልዕክት</h2>
        </div>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>${title}</h3>
          <p style="margin-top: 10px;">${message}</p>
        </div>

        <p style="color: #dc2626; font-weight: bold;">እባክዎን ወዲያውኑ እርምጃ ይውሰዱ።</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            የኢትዮጵያ ቴሌኮም<br/>
            አስፈፃሚ ስብሰባ አስተዳደር ስርዓት
          </p>
        </div>
      </div>
    `
  })
};

export function getAmharicTemplate(
  templateType: keyof typeof amharicTemplates,
  ...args: string[]
): EmailTemplate {
  const template = amharicTemplates[templateType] as (...args: string[]) => EmailTemplate;
  if (!template) {
    throw new Error(`Template ${templateType} not found`);
  }
  return template(...args);
}
