// Normalize/sanitize AI markdown so it renders fully
export const normalizeAIMarkdown = (raw: string): string => {
  if (!raw) return '';
  let text = raw.replace(/\u0000/g, '').replace(/\r\n?/g, '\n');

  // Convert box-drawing horizontal rules to markdown hr
  text = text.replace(/[\u2500-\u257F\u2550-\u2570]{6,}/g, '\n\n---\n\n');

  const lines = text.split('\n');
  const out: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip lines that are ONLY separator characters (colons, dashes, pipes, spaces)
    // but NOT actual table rows with content
    if (/^[\s|]*[:=\-]+[\s|:=\-]*$/.test(trimmed) && trimmed.length > 5) {
      continue;
    }
    
    // Check if this is a table header line (has pipes and content)
    const isTableRow = /^\s*\|.*\|\s*$/.test(trimmed);
    
    if (isTableRow) {
      out.push(line);
      
      // Check if next line is a proper separator
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        const hasProperSeparator = /^\s*\|[\s\-:]+\|\s*$/.test(nextLine) && nextLine.split('|').length > 2;
        
        // If no proper separator, add one
        if (!hasProperSeparator) {
          const cols = trimmed.split('|').filter((c) => c.trim().length > 0).length;
          if (cols > 0) {
            out.push('| ' + Array(cols).fill('---').join(' | ') + ' |');
          }
        }
      }
    } else {
      out.push(line);
    }
  }
  
  return out.join('\n');
};
