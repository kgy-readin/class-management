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
  try {
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
  } catch {
    return timeStr;
  }
};
