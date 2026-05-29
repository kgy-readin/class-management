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
  progress: '진행' | '완성';
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
