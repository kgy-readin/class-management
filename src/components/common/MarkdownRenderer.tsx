import React, { ReactNode } from 'react';

// Block represents structured parsed markdown block items
export interface Block {
  type: 'callout' | 'hr' | 'h1' | 'h2' | 'h3' | 'bullet' | 'bullet1' | 'bullet2' | 'bullet3' | 'empty' | 'p';
  text?: string;
  children?: Block[];
}

// DocTab represents general hierarchically structured documents (used across CommentBank, ParentNewsletters, etc.)
export interface DocTab {
  id: string;
  title: string;
  text?: string;
  childTabs?: DocTab[];
  isFolder?: boolean;
}

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
      } else if (processedLine.startsWith('### ')) {
        processedLine = processedLine.slice(4);
      }

      // Strip bullet indicators '* ', '- ', or '+ '
      if (processedLine.startsWith('- ') || processedLine.startsWith('* ') || processedLine.startsWith('+ ')) {
        processedLine = processedLine.slice(2);
      }

      // Remove inline markup: **, __, _
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
        if (processedLine.startsWith('__', i)) {
          const close = processedLine.indexOf('__', i + 2);
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

    // Heading 3
    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4) });
      i++;
      continue;
    }

    // 5. Bullet lists (Level 1, 2, 3)
    if (line.startsWith('* ')) {
      blocks.push({ type: 'bullet1', text: line.slice(2) });
      i++;
      continue;
    }
    if (line.startsWith('- ')) {
      blocks.push({ type: 'bullet2', text: line.slice(2) });
      i++;
      continue;
    }
    if (line.startsWith('+ ')) {
      blocks.push({ type: 'bullet3', text: line.slice(2) });
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

// Highlights the bullet characters '●' and '■' by rendering them in blue
export const renderWithHighlightedBullet = (text: string, baseKey: number | string): ReactNode => {
  if (!text.includes('●') && !text.includes('■')) return text;
  
  const segments = text.split(/([●■])/);
  const elements: ReactNode[] = [];
  
  segments.forEach((seg, index) => {
    if (seg === '●' || seg === '■') {
      elements.push(
        <span key={`bullet-${baseKey}-${index}`} className="text-blue-700/80 font-bold">
          {seg}
        </span>
      );
    } else if (seg) {
      elements.push(seg);
    }
  });
  
  return <React.Fragment key={baseKey}>{elements}</React.Fragment>;
};

// Custom inline styles parsing
export const parseInlineStyles = (text: string): ReactNode => {
  const parts: ReactNode[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    let matched = false;

    // Bold: **text**
    if (text.startsWith('**', currentIndex)) {
      const closingIndex = text.indexOf('**', currentIndex + 2);
      if (closingIndex !== -1) {
        const content = text.slice(currentIndex + 2, closingIndex);
        parts.push(
          <span key={currentIndex} className="font-semibold text-neutral-800">
            {parseInlineStyles(content)}
          </span>
        );
        currentIndex = closingIndex + 2;
        matched = true;
      }
    }
    // Underline: __text__
    else if (text.startsWith('__', currentIndex)) {
      const closingIndex = text.indexOf('__', currentIndex + 2);
      if (closingIndex !== -1) {
        const content = text.slice(currentIndex + 2, closingIndex);
        parts.push(
          <span key={currentIndex} className="underline decoration-neutral-400">
            {parseInlineStyles(content)}
          </span>
        );
        currentIndex = closingIndex + 2;
        matched = true;
      }
    }
    // Italic: _text_
    else if (text.startsWith('_', currentIndex)) {
      const closingIndex = text.indexOf('_', currentIndex + 1);
      if (closingIndex !== -1) {
        const content = text.slice(currentIndex + 1, closingIndex);
        parts.push(
          <span key={currentIndex} className="italic text-blue-700/80">
            {parseInlineStyles(content)}
          </span>
        );
        currentIndex = closingIndex + 1;
        matched = true;
      }
    }

    if (!matched) {
      const nextSpecial = [];
      const bIdx = text.indexOf('**', currentIndex + 1);
      if (bIdx !== -1) nextSpecial.push(bIdx);
      const uIdx = text.indexOf('__', currentIndex + 1);
      if (uIdx !== -1) nextSpecial.push(uIdx);
      const iIdx = text.indexOf('_', currentIndex + 1);
      if (iIdx !== -1) nextSpecial.push(iIdx);

      const nextIndex = nextSpecial.length > 0 ? Math.min(...nextSpecial) : text.length;
      const plainText = text.slice(currentIndex, nextIndex);
      parts.push(renderWithHighlightedBullet(plainText, currentIndex));
      currentIndex = nextIndex;
    }
  }

  return <>{parts}</>;
};

export const renderBlocks = (blocks: Block[]): ReactNode => {
  return (
    <div className="space-y-1">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'hr':
            return <hr key={idx} className="my-4 border-t border-neutral-200/80" />;
          case 'h1':
            return (
              <h1 key={idx} style={{ fontSize: 'calc(1em + 3px)', marginTop: idx === 0 ? '0' : '1.0em' }} className="font-bold text-blue-700/80 mb-2 block">
                {parseInlineStyles(block.text || '')}
              </h1>
            );
          case 'h2':
            return (
              <h2 key={idx} style={{ fontSize: 'calc(1em + 1.5px)', marginTop: idx === 0 ? '0' : '0.8em' }} className="font-bold text-blue-700/80 mb-1.5 block">
                {parseInlineStyles(block.text || '')}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={idx} style={{ fontSize: 'calc(1em + 0.5px)', marginTop: idx === 0 ? '0' : '0.6em' }} className="font-bold text-zinc-650 mb-1 block">
                {parseInlineStyles(block.text || '')}
              </h3>
            );
          case 'bullet1':
          case 'bullet':
            return (
              <div key={idx} className="pl-[5px] flex items-start gap-[10px] leading-[1.8] text-zinc-650">
                <span style={{ fontSize: '6px' }} className="text-[#1f2937] font-bold select-none mt-[8px] transform translate-y-[0.5px] shrink-0 block leading-none">●</span>
                <span className="flex-1">{parseInlineStyles(block.text || '')}</span>
              </div>
            );
          case 'bullet2':
            return (
              <div key={idx} className="pl-[17px] flex items-start gap-[10px] leading-[1.8] text-zinc-650">
                <span style={{ fontSize: '7px' }} className="text-[#4b5563] font-bold select-none mt-[7px] shrink-0 block leading-none">○</span>
                <span className="flex-1">{parseInlineStyles(block.text || '')}</span>
              </div>
            );
          case 'bullet3':
            return (
              <div key={idx} className="pl-[29px] flex items-start gap-[10px] leading-[1.8] text-zinc-650">
                <span style={{ fontSize: '7px' }} className="text-[#6b7280] font-normal select-none mt-[8px] shrink-0 block leading-none">■</span>
                <span className="flex-1">{parseInlineStyles(block.text || '')}</span>
              </div>
            );
          case 'callout':
            return (
              <div key={idx} className="bg-neutral-100/70 rounded-xl p-4 my-2.5 text-zinc-650 overflow-hidden">
                {renderBlocks(block.children || [])}
              </div>
            );
          case 'empty':
            return <div key={idx} className="leading-[1.8] min-h-[1.8em] select-none pointer-events-none">&nbsp;</div>;
          case 'p':
          default:
            return (
              <p key={idx} className="leading-[1.8] text-zinc-650">
                {parseInlineStyles(block.text || '')}
              </p>
            );
        }
      })}
    </div>
  );
};

export interface MarkdownRendererProps {
  text: string;
}

export default function MarkdownRenderer({ text }: MarkdownRendererProps) {
  const lines = text.split('\n');
  const blocks = parseLinesToBlocks(lines);
  return renderBlocks(blocks);
}
