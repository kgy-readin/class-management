export interface Book {
  level: string;
  title: string;
  id: string;
  difficulty: string;
  category: string;
  therapy: string;
  career: string;
  audio: string;
  type: string;
}

export interface Student {
  name: string;
  grade: string;
  level: string;
  subProgram: string;
  attendanceDays: string;
  isAttending: boolean;
  dismissalTime: string;
  homeworkMissed: number;
  booksCompleted: number;
  homeworkChecked: boolean;
  homeworkMissedToday: boolean;
}

export interface Curriculum {
  studentName: string;
  index: number;
  bookTitle: string;
  bookLevel: string;
  bookId: string;
  info: string;
  status: '예정' | '진행' | '통과' | '불통';
}

export interface WritingStatus {
  date: string;
  name: string;
  bookTitle: string;
  progress: '진행' | '완료';
}

export interface Task {
  sheetRowIndex?: number; // 구글 시트 행 번호 (삭제/수정용)
  date: string;       // 날짜
  name: string;       // 이름 (학생명)
  category: string;   // 카테고리 (긴급, 중요, 가통, 알림장, 결과물, 보고, 반복, 기타)
  familyClass: string;// 가통분류 (첫날, 한달, 정기, 중등)
  todo: string;       // 할일
  status: string;     // 상태 (예정, 진행, 보류, 대기, 완료, 취소)
  memo: string;       // 메모
}

export interface Note {
  sheetRowIndex?: number; // Row index in Google Sheets for editing/deleting (A2:B)
  parent: string;         // 상위항목
  memo: string;           // 메모
}

export interface DashboardData {
  students: Student[];
  curriculums: Curriculum[];
  books: Book[];
}

export const TAG_COLORS: Record<string, string> = {
  // English key mappings
  default: 'bg-zinc-100 text-zinc-700 font-medium',
  gray: 'bg-zinc-200/80 text-zinc-700 font-medium',
  brown: 'bg-yellow-800/17 text-yellow-950 font-medium',
  orange: 'bg-orange-700/17 text-amber-950 font-medium',
  yellow: 'bg-yellow-500/25 text-yellow-950 font-medium',
  green: 'bg-green-600/17 text-emerald-950 font-medium',
  blue: 'bg-sky-600/17 text-blue-950 font-medium',
  purple: 'bg-violet-700/12 text-violet-950 font-medium',
  pink: 'bg-pink-600/12 text-pink-950 font-medium',
  red: 'bg-red-600/12 text-rose-950 font-medium',

  // Korean key mappings
  기본: 'bg-zinc-200/60 text-zinc-700 font-medium',
  회색: 'bg-zinc-200/80 text-zinc-700 font-medium',
  갈색: 'bg-yellow-800/17 text-yellow-950 font-medium',
  주황색: 'bg-orange-700/17 text-amber-950 font-medium',
  노란색: 'bg-yellow-500/25 text-yellow-950 font-medium',
  초록색: 'bg-green-600/17 text-emerald-950 font-medium',
  파란색: 'bg-sky-600/17 text-blue-950 font-medium',
  보라색: 'bg-violet-700/12 text-violet-950 font-medium',
  분홍색: 'bg-pink-600/12 text-pink-950 font-medium',
  빨간색: 'bg-red-600/12 text-rose-950 font-medium',
};

export function getTagColor(colorNameOrKey: string): string {
  // Fallback to searching lowercase or the exact value, defaulting to 'default' color
  const key = colorNameOrKey?.trim();
  return TAG_COLORS[key] || TAG_COLORS[key.toLowerCase()] || TAG_COLORS['default'];
}
