import React, { ReactNode } from 'react';
import { Block } from './commentBankTypes';
import { parseLinesToBlocks } from './commentBankUtils';

interface CommentBankRendererProps {
  text: string;
}

// Highlights the bullet character '●' by rendering it in blue
export const renderWithHighlightedBullet = (text: string, baseKey: number | string): ReactNode => {
  if (!text.includes('●')) return text;
  
  const segments = text.split('●');
  const elements: ReactNode[] = [];
  
  segments.forEach((seg, index) => {
    if (index > 0) {
      elements.push(
        <span key={`bullet-${baseKey}-${index}`} className="text-blue-700/70 font-bold">
          ●
        </span>
      );
    }
    if (seg) {
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
    // Italic: _text_
    else if (text.startsWith('_', currentIndex)) {
      const closingIndex = text.indexOf('_', currentIndex + 1);
      if (closingIndex !== -1) {
        const content = text.slice(currentIndex + 1, closingIndex);
        parts.push(
          <span key={currentIndex} className="italic text-blue-700/70">
            {parseInlineStyles(content)}
          </span>
        );
        currentIndex = closingIndex + 1;
        matched = true;
      }
    }
    // Underline: ~text~
    else if (text.startsWith('~', currentIndex)) {
      const closingIndex = text.indexOf('~', currentIndex + 1);
      if (closingIndex !== -1) {
        const content = text.slice(currentIndex + 1, closingIndex);
        parts.push(
          <span key={currentIndex} className="underline decoration-neutral-400">
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
      const iIdx = text.indexOf('_', currentIndex + 1);
      if (iIdx !== -1) nextSpecial.push(iIdx);
      const uIdx = text.indexOf('~', currentIndex + 1);
      if (uIdx !== -1) nextSpecial.push(uIdx);

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
              <h1 key={idx} className="text-[17px] md:text-[21px] font-bold text-blue-700/70 mt-4 mb-2 block">
                {parseInlineStyles(block.text || '')}
              </h1>
            );
          case 'h2':
            return (
              <h2 key={idx} className="text-[15.5px] md:text-[19.5px] font-bold text-blue-700/70 mt-3 mb-1.5 block">
                {parseInlineStyles(block.text || '')}
              </h2>
            );
          case 'bullet':
            return (
              <div key={idx} className="pl-[5px] flex items-start gap-[18px] leading-[1.8] text-zinc-650">
                <span className="text-neutral-500 mt-2.5 shrink-0 block w-1.5 h-1.5 rounded-full bg-neutral-400" />
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
            return <div key={idx} className="h-2" />;
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

export default function CommentBankRenderer({ text }: CommentBankRendererProps) {
  const lines = text.split('\n');
  const blocks = parseLinesToBlocks(lines);
  return renderBlocks(blocks);
}
