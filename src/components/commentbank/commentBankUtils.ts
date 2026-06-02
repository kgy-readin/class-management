import { Block } from './commentBankTypes';

/**
 * Strips markdown-like markup characters helper to copy clean text to clipboard safely
 */
export const stripMarkdown = (text: string): string => {
  if (!text) return '';
  return text
    .split('\n')
    .map(line => {
      let trimmed = line.trim();
      // Remove horizontal lines completely
      if (trimmed === '---' || trimmed === '***') {
        return '';
      }

      // Strip leading callout indicator '>' and any subsequent space
      let processedLine = line;
      while (processedLine.startsWith('>')) {
        processedLine = processedLine.slice(1);
        if (processedLine.startsWith(' ')) {
          processedLine = processedLine.slice(1);
        }
      }

      // Check if now it starts with heading
      if (processedLine.startsWith('# ')) {
        processedLine = processedLine.slice(2);
      } else if (processedLine.startsWith('## ')) {
        processedLine = processedLine.slice(3);
      }

      // Strip bullet indicators '- ' or '* '
      if (processedLine.startsWith('- ') || processedLine.startsWith('* ')) {
        processedLine = processedLine.slice(2);
      }

      // Remove inline markup: **, _, ~
      let result = '';
      let i = 0;
      while (i < processedLine.length) {
        if (processedLine.startsWith('**', i)) {
          const close = processedLine.indexOf('**', i + 2);
          if (close !== -1) {
            result += processedLine.slice(i + 2, close);
            i = close + 2;
            continue;
          }
        }
        if (processedLine.startsWith('_', i)) {
          const close = processedLine.indexOf('_', i + 1);
          if (close !== -1) {
            result += processedLine.slice(i + 1, close);
            i = close + 1;
            continue;
          }
        }
        if (processedLine.startsWith('~', i)) {
          const close = processedLine.indexOf('~', i + 1);
          if (close !== -1) {
            result += processedLine.slice(i + 1, close);
            i = close + 1;
            continue;
          }
        }
        result += processedLine[i];
        i++;
      }
      return result;
    })
    .join('\n');
};

/**
 * Parses markdown flat lines recursively into logical layout blocks
 */
export const parseLinesToBlocks = (lines: string[]): Block[] => {
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Group contiguous callout lines
    if (line.startsWith('>')) {
      const calloutLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        let innerLine = lines[i].slice(1);
        if (innerLine.startsWith(' ')) {
          innerLine = innerLine.slice(1);
        }
        calloutLines.push(innerLine);
        i++;
      }
      const calloutChildren = parseLinesToBlocks(calloutLines);
      blocks.push({
        type: 'callout',
        children: calloutChildren
      });
      continue;
    }

    // 2. Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 3. Heading 1
    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.slice(2) });
      i++;
      continue;
    }

    // 4. Heading 2
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3) });
      i++;
      continue;
    }

    // 5. Bullet lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({ type: 'bullet', text: line.slice(2) });
      i++;
      continue;
    }

    // 6. Empty line separation
    if (trimmed === '') {
      blocks.push({ type: 'empty' });
      i++;
      continue;
    }

    // 7. Standard Paragraph
    blocks.push({ type: 'p', text: line });
    i++;
  }
  return blocks;
};
