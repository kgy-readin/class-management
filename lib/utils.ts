import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatLevel = (level: any) => {
  const l = String(level);
  if (l === '0' || l === '0.0' || l === '' || l === 'null' || l === 'undefined') return '기초';
  if (l === '11') return '구연동화';
  return `Lv.${l}`;
};

export const formatTime = (timeStr: string) => {
  if (!timeStr || timeStr === '미설정') return '미설정';
  
  // Handle HH:mm format directly
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(':');
    return `${h.padStart(2, '0')}:${m}`;
  }

  try {
    // If it's a full ISO string or similar
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) {
      // Try parsing HH:mm:ss
      const match = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}`;
      }
      return timeStr;
    }
    
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
  } catch {
    return timeStr;
  }
};
