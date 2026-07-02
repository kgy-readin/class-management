import React from 'react';

/**
 * Renders text with any bracket enclosed strings (e.g., [중요]) in bold/semibold.
 */
export function renderBoldBrackets(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, index) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <span key={index} className="font-medium text-zinc-900">
          {part}
        </span>
      );
    }
    return part;
  });
}
