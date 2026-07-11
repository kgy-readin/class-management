import { format, differenceInCalendarDays, startOfDay, startOfWeek, isSameDay, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';

// Helper to parse date strings
export const parseTaskDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  try {
    const cleaned = dateStr.replace(/\//g, '-').trim();
    const parts = cleaned.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) return parsed;
    return null;
  } catch {
    return null;
  }
};

// Safe checks for overdue task
export const isTaskOverdue = (taskDateStr: string, status: string): boolean => {
  if (!taskDateStr) return false;
  if (status === '완료' || status === '취소') return false;
  const d = parseTaskDate(taskDateStr);
  if (!d) return false;
  const today = startOfDay(new Date());
  return startOfDay(d) < today;
};

// Strict check if task is before today (strictly, before today for Family View styling)
export const isTaskDateBeforeToday = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const d = parseTaskDate(dateStr);
  if (!d) return false;
  const today = startOfDay(new Date());
  return startOfDay(d) < today;
};

// Helper check if task date is today
export const isTodayTask = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const d = parseTaskDate(dateStr);
  if (!d) return false;
  return isSameDay(d, new Date());
};

// Family View date text color styling based on overdue days:
// 1~30 days overdue -> blue text, 31+ days overdue -> red text, else normal text color
export const getFamilyTaskDateClass = (dateStr: string): string => {
  if (!dateStr) return 'text-zinc-750';
  const d = parseTaskDate(dateStr);
  if (!d) return 'text-zinc-750';
  const today = startOfDay(new Date());
  const taskDate = startOfDay(d);
  
  if (taskDate < today) {
     const diffTime = today.getTime() - taskDate.getTime();
     const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
     if (diffDays >= 1 && diffDays <= 30) {
       return 'text-blue-600 font-medium';
     } else if (diffDays >= 31) {
       return 'text-red-600 font-medium';
     }
  }
  return 'text-zinc-750';
};

export const formatTaskDateDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  const d = parseTaskDate(dateStr);
  if (!d) return dateStr;
  return format(d, 'M월 d일', { locale: ko });
};

export const formatRelativeTaskDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = parseTaskDate(dateStr);
  if (!d) return dateStr;

  const today = new Date();
  const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetZero = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffDays = differenceInCalendarDays(targetZero, todayZero);

  if (diffDays === 0) return '오늘';
  if (diffDays === 1) return '내일';
  if (diffDays === -1) return '어제';
  if (diffDays === 2) return '모레';
  if (diffDays === -2) return '그저께';

  if (Math.abs(diffDays) <= 7) {
    const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const dayOfWeek = weekdays[getDay(targetZero)];

    const todayWeekStart = startOfWeek(todayZero, { weekStartsOn: 0 });
    const targetWeekStart = startOfWeek(targetZero, { weekStartsOn: 0 });
    const diffWeeks = Math.round(differenceInCalendarDays(targetWeekStart, todayWeekStart) / 7);

    if (diffWeeks === 0) {
      return `이번주 ${dayOfWeek}`;
    } else if (diffWeeks === 1) {
      return `다음주 ${dayOfWeek}`;
    } else if (diffWeeks === -1) {
      return `지난주 ${dayOfWeek}`;
    }
  }

  return format(d, 'M월 d일', { locale: ko });
};

export const formatTaskDateYYMMDD = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = parseTaskDate(dateStr);
  if (!d) return dateStr;
  return format(d, 'yy. MM. dd.');
};
