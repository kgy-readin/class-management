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
  status: '예정' | '진행' | '통과' | '불통';
}

export interface WritingStatus {
  date: string;
  name: string;
  bookTitle: string;
  progress: '진행' | '완성';
}

export interface DashboardData {
  students: Student[];
  curriculums: Curriculum[];
  books: Book[];
}
