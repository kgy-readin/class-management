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

export function getWeeksSince(dateStr: string | null | undefined): number | '-' {
  if (!dateStr || !dateStr.trim()) return '-';
  const lastDate = new Date(dateStr.trim());
  if (isNaN(lastDate.getTime())) return '-';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, Math.floor(diffDays / 7));
}

export function isResultDelayed(levelStr: string, lastResultDate: string | null | undefined): boolean {
  const weeks = getWeeksSince(lastResultDate);
  if (weeks === '-') return false;
  
  const levelNum = parseFloat(levelStr) || 0;
  if (levelNum <= 3) {
    return weeks >= 13;
  } else {
    return weeks >= 21;
  }
}

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
