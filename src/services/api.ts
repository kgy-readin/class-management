import { Book, Student, Curriculum, WritingStatus, DashboardData } from '../types';

const GAS_URL = import.meta.env.VITE_GAS_WEB_APP_URL;

// Helper to get sheet data via GAS
async function getSheetData(sheet: string, range: string) {
  if (!GAS_URL) throw new Error('VITE_GAS_WEB_APP_URL is not set');
  const url = `${GAS_URL}?action=read&sheet=${encodeURIComponent(sheet)}&range=${encodeURIComponent(range)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GAS Read Error: ${response.statusText}`);
  return await response.json();
}

// Helper to update sheet data via GAS
async function updateSheetData(sheet: string, range: string, values: any[][]) {
  if (!GAS_URL) throw new Error('VITE_GAS_WEB_APP_URL is not set');
  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', sheet, range, values }),
  });
  if (!response.ok) throw new Error(`GAS Update Error: ${response.statusText}`);
  return await response.json();
}

// Helper to delete rows via GAS
async function deleteRows(sheet: string, keyColumn: number, keyValue: string) {
  if (!GAS_URL) throw new Error('VITE_GAS_WEB_APP_URL is not set');
  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'deleteRows', sheet, keyColumn, keyValue }),
  });
  if (!response.ok) throw new Error(`GAS Delete Error: ${response.statusText}`);
  return await response.json();
}

export const dataApi = {
  getConfig: () => ({
    isConfigured: !!GAS_URL,
    gasUrl: GAS_URL,
  }),
  fetchData: async (refreshBooks = false): Promise<DashboardData> => {
    const fetchPromises = [
      getSheetData('학생정보', 'A2:J'),
      getSheetData('커리큘럼', 'A2:F'),
    ];

    const cachedBooksStr = localStorage.getItem('cachedBooks');
    const lastCacheTime = Number(localStorage.getItem('lastCacheTime') || 0);
    const CACHE_TTL = 30 * 60 * 1000; // 30 minutes for better performance
    const now = Date.now();

    let books: Book[] = [];
    let shouldFetchBooks = refreshBooks || !cachedBooksStr || (now - lastCacheTime > CACHE_TTL);

    if (shouldFetchBooks) {
      fetchPromises.push(getSheetData('도서목록', 'A2:I'));
    } else if (cachedBooksStr) {
      books = JSON.parse(cachedBooksStr);
    }

    const results = await Promise.all(fetchPromises);
    
    const studentsRaw = results[0];
    const curriculumsRaw = results[1];
    
    if (shouldFetchBooks) {
      const booksRaw = results[2];
      books = booksRaw
        .filter((row: any[]) => row[1])
        .map((row: any[]) => ({
          level: row[0] || '',
          title: row[1] || '',
          id: row[2] || '',
          difficulty: row[3] || '',
          category: row[4] || '',
          therapy: row[5] || '',
          career: row[6] || '',
          audio: row[7] || '',
          type: row[8] || '',
        }));
      localStorage.setItem('cachedBooks', JSON.stringify(books));
      localStorage.setItem('lastCacheTime', String(now));
    }

    const students: Student[] = studentsRaw
      .filter((row: any[]) => row[0])
      .map((row: any[]) => ({
        name: row[0] || '',
        grade: row[1] || '',
        level: row[2] || '',
        subProgram: row[3] || '',
        isAttending: row[4] === true || row[4] === 'TRUE',
        dismissalTime: row[5] || '',
        homeworkChecked: row[6] === true || row[6] === 'TRUE',
        homeworkMissedToday: row[7] === true || row[7] === 'TRUE',
        homeworkMissed: Number(row[8]) || 0,
        booksCompleted: Number(row[9]) || 0,
      }));

    const curriculums: Curriculum[] = curriculumsRaw
      .filter((row: any[]) => row[0] && row[2])
      .map((row: any[]) => ({
        studentName: row[0] || '',
        index: parseInt(row[1]) || 0,
        bookTitle: row[2] || '',
        bookLevel: row[3] || '',
        bookId: row[4] || '',
        status: row[5] as any || '예정',
      }));

    return { books, students, curriculums };
  }
};

export const attendanceApi = {
  update: async (data: { name: string; isAttending: boolean; dismissalTime?: string }) => {
    const studentsRaw = await getSheetData('학생정보', 'A2:A');
    const rowIndex = studentsRaw.findIndex((row: any[]) => row[0] === data.name) + 2;
    if (rowIndex < 2) throw new Error('Student not found');

    await updateSheetData('학생정보', `E${rowIndex}:H${rowIndex}`, [
      [data.isAttending ? 'TRUE' : 'FALSE', data.isAttending ? (data.dismissalTime || '') : '', 'FALSE', 'FALSE']
    ]);
    return { success: true };
  }
};

export const homeworkApi = {
  update: async (data: { name: string; isDone: boolean }) => {
    const studentsRaw = await getSheetData('학생정보', 'A2:J');
    const rowIndex = studentsRaw.findIndex((row: any[]) => row[0] === data.name) + 2;
    if (rowIndex < 2) throw new Error('Student not found');

    const currentCount = Number(studentsRaw[rowIndex - 2][8]) || 0;
    const newCount = data.isDone ? currentCount : currentCount + 1;

    await updateSheetData('학생정보', `G${rowIndex}:I${rowIndex}`, [['TRUE', data.isDone ? 'FALSE' : 'TRUE', newCount]]);
    return { success: true, newCount };
  }
};

export const curriculumApi = {
  update: async (data: { 
    studentName: string; 
    bookId: string; 
    status: string; 
    index?: number; 
    bookTitle?: string;
    originalIndex?: number;
  }) => {
    const curriculumsRaw = await getSheetData('커리큘럼', 'A2:F');
    const rowIndex = curriculumsRaw.findIndex((row: any[]) => 
      String(row[0]).trim() === String(data.studentName).trim() && 
      String(row[4]).trim() === String(data.bookId).trim() && 
      parseInt(row[1]) === data.originalIndex
    ) + 2;
    
    if (rowIndex < 2) throw new Error('Curriculum entry not found');

    const updates = [];
    if (data.index !== undefined) updates.push(updateSheetData('커리큘럼', `B${rowIndex}`, [[data.index]]));
    if (data.bookTitle !== undefined) updates.push(updateSheetData('커리큘럼', `C${rowIndex}`, [[data.bookTitle]]));
    if (data.status !== undefined) updates.push(updateSheetData('커리큘럼', `F${rowIndex}`, [[data.status]]));
    
    const previousStatus = String(curriculumsRaw[rowIndex - 2][5] || '').trim();
    const newStatus = String(data.status || '').trim();
    
    await Promise.all(updates);

    const isBook = data.bookId && String(data.bookId).trim() !== '' && String(data.bookId).trim() !== '-';
    
    if (isBook && data.status !== undefined && newStatus !== previousStatus) {
      if (newStatus === '통과') {
        const studentsRaw = await getSheetData('학생정보', 'A2:J');
        const studentRowIndex = studentsRaw.findIndex((row: any[]) => String(row[0]).trim() === String(data.studentName).trim()) + 2;
        if (studentRowIndex >= 2) {
          const currentCompleted = Number(studentsRaw[studentRowIndex - 2][9]) || 0;
          await updateSheetData('학생정보', `J${studentRowIndex}`, [[currentCompleted + 1]]);
        }
      } else if (previousStatus === '통과') {
        const studentsRaw = await getSheetData('학생정보', 'A2:J');
        const studentRowIndex = studentsRaw.findIndex((row: any[]) => String(row[0]).trim() === String(data.studentName).trim()) + 2;
        if (studentRowIndex >= 2) {
          const currentCompleted = Number(studentsRaw[studentRowIndex - 2][9]) || 0;
          await updateSheetData('학생정보', `J${studentRowIndex}`, [[Math.max(0, currentCompleted - 1)]]);
        }
      }
    }

    return { success: true };
  },
  add: async (data: { studentName: string; bookTitle?: string; isWriting: boolean }) => {
    const cachedBooksStr = localStorage.getItem('cachedBooks');
    let books: Book[] = cachedBooksStr ? JSON.parse(cachedBooksStr) : [];
    
    if (books.length === 0) {
      const booksRaw = await getSheetData('도서목록', 'A2:I');
      books = booksRaw
        .filter((row: any[]) => row[1])
        .map((row: any[]) => ({
          level: row[0] || '',
          title: row[1] || '',
          id: row[2] || '',
          difficulty: row[3] || '',
          category: row[4] || '',
          therapy: row[5] || '',
          career: row[6] || '',
          audio: row[7] || '',
          type: row[8] || '',
        }));
      localStorage.setItem('cachedBooks', JSON.stringify(books));
    }

    const curriculumsRaw = await getSheetData('커리큘럼', 'A2:F');

    let bookLevel = '';
    let bookId = '';

    if (data.isWriting) {
      bookLevel = '';
      bookId = '';
    } else {
      const book = books.find(b => b.title === data.bookTitle);
      if (!book) throw new Error('Book not found');
      bookLevel = book.level;
      bookId = book.id;
    }

    const studentCurriculum = curriculumsRaw.filter((row: any[]) => row[0] === data.studentName);
    const indices = studentCurriculum.map((row: any[]) => Number(row[1]) || 0);
    const nextIndex = (indices.length > 0 ? Math.max(...indices) : 0) + 1;

    const newRow = [data.studentName, nextIndex, data.isWriting ? '글쓰기' : data.bookTitle, bookLevel, bookId, '예정'];
    const nextEmptyRow = curriculumsRaw.length + 2;

    await updateSheetData('커리큘럼', `A${nextEmptyRow}:F${nextEmptyRow}`, [newRow]);
    return { success: true, index: nextIndex };
  }
};

export const studentApi = {
  levelUp: async (name: string) => {
    const studentsRaw = await getSheetData('학생정보', 'A2:J');
    const studentRowIndex = studentsRaw.findIndex((row: any[]) => row[0] === name) + 2;
    if (studentRowIndex < 2) throw new Error('Student not found');

    const studentRow = studentsRaw[studentRowIndex - 2];
    const currentLevel = parseInt(studentRow[2]) || 0;
    
    studentRow[2] = currentLevel + 1;
    studentRow[9] = 0;
    
    await updateSheetData('학생정보', `A${studentRowIndex}:J${studentRowIndex}`, [studentRow]);
    await deleteRows('커리큘럼', 1, name);

    return { success: true };
  }
};

export const writingStatusApi = {
  get: async (): Promise<WritingStatus[]> => {
    const data = await getSheetData('글쓰기현황', 'A2:D');
    return data.map((row: any[]) => ({
      date: row[0] || '',
      name: row[1] || '',
      bookTitle: row[2] || '',
      progress: row[3] as any || '진행',
    }));
  },
  update: async (data: { 
    name: string; 
    bookTitle: string; 
    progress: string; 
    date?: string;
    originalDate?: string;
    originalBookTitle?: string;
  }) => {
    const writingRaw = await getSheetData('글쓰기현황', 'A2:D');
    const date = data.date || new Date().toISOString().split('T')[0];
    
    const searchDate = data.originalDate || date;
    const searchTitle = data.originalBookTitle || data.bookTitle;

    const rowIndex = writingRaw.findIndex((row: any[]) => {
      const rowDate = String(row[0]).split('T')[0];
      const targetDate = String(searchDate).split('T')[0];
      return String(row[1]).trim() === String(data.name).trim() && 
             String(row[2]).trim() === String(searchTitle).trim() &&
             rowDate === targetDate;
    }) + 2;
    
    const newRow = [date, data.name, data.bookTitle, data.progress];
    
    if (rowIndex >= 2) {
      await updateSheetData('글쓰기현황', `A${rowIndex}:D${rowIndex}`, [newRow]);
    } else {
      const nextEmptyRow = writingRaw.length + 2;
      await updateSheetData('글쓰기현황', `A${nextEmptyRow}:D${nextEmptyRow}`, [newRow]);
    }
    
    return { success: true };
  },
  clear: async () => {
    await updateSheetData('글쓰기현황', 'A2:D1000', Array(999).fill(['', '', '', '']));
    return { success: true };
  }
};
