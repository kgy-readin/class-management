import { Book, Student, Curriculum, WritingStatus, DashboardData } from '../types';

const GAS_URL = import.meta.env.VITE_GAS_WEB_APP_URL;
const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEETS_ID;

// Helper to get sheet data directly from Google Sheets (Read-only)
// This bypasses GAS and works if the sheet is shared as "Anyone with the link can view"
async function getSheetData(sheet: string, range: string) {
  if (!SHEET_ID) throw new Error('VITE_GOOGLE_SHEETS_ID is not set');
  
  // Use Google Visualization API for direct JSON fetching
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}&range=${encodeURIComponent(range)}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Direct Read Error: ${response.statusText}`);
    
    const text = await response.text();
    // The response is wrapped in "google.visualization.Query.setResponse(...);"
    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/)?.[1];
    if (!jsonStr) {
      if (text.includes('<!doctype html>')) {
        throw new Error('구글 시트 접근 권한이 없습니다. 시트의 공유 설정을 "링크가 있는 모든 사용자에게 공개(뷰어)"로 변경해 주세요.');
      }
      throw new Error('Invalid response format from Google Sheets');
    }
    
    const data = JSON.parse(jsonStr);
    if (data.status === 'error') {
      throw new Error(`Google Sheets Error: ${data.errors[0].detailed_message}`);
    }
    
    // Determine expected column count from range (e.g., "A2:J" -> 10)
    const rangeMatch = range.match(/([A-Z]+)\d*:([A-Z]+)/);
    let expectedCols = 0;
    if (rangeMatch) {
      const start = rangeMatch[1].split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0);
      const end = rangeMatch[2].split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0);
      expectedCols = end - start + 1;
    }

    // Convert gviz format to raw array format [[col1, col2, ...], ...]
    return data.table.rows.map((row: any) => {
      const cells = Array(expectedCols).fill(null);
      if (row.c) {
        row.c.forEach((cell: any, i: number) => {
          if (i < expectedCols && cell && cell.v !== null && cell.v !== undefined) {
            let val = cell.v;
            
            // Handle Google Sheets Date/Time format: "Date(2024,3,15)" or "Date(1899,11,30,16,35,0)"
            if (typeof val === 'string' && val.startsWith('Date(')) {
              const dMatch = val.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
              if (dMatch) {
                const [_, y, m, d, h, min, s] = dMatch;
                const year = y;
                const month = String(Number(m) + 1).padStart(2, '0');
                const day = String(d).padStart(2, '0');
                
                if (h !== undefined && min !== undefined) {
                  // If it has time components, it might be a Time value or a DateTime value
                  const hour = String(h).padStart(2, '0');
                  const minute = String(min).padStart(2, '0');
                  const second = String(s || 0).padStart(2, '0');
                  
                  // If the year is 1899, it's likely a Time-only value from Google Sheets
                  if (year === '1899') {
                    val = `${hour}:${minute}`;
                  } else {
                    val = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
                  }
                } else {
                  val = `${year}-${month}-${day}`;
                }
              }
            } else if (cell.f) {
              // Prefer formatted value for display if it's not a special Date string
              // This helps with currency, percentages, and specifically Time values if they come as numbers
              val = cell.f;
            }
            cells[i] = val;
          }
        });
      }
      return cells;
    });
  } catch (error: any) {
    console.error('Direct fetch failed:', error.message);
    throw error;
  }
}

// Helper to update sheet data via GAS (Writing still requires GAS or OAuth)
async function updateSheetData(sheet: string, range: string, values: any[][]) {
  if (!GAS_URL || !GAS_URL.startsWith('http')) {
    throw new Error('데이터를 수정하려면 GAS 웹 앱 URL 설정이 필요합니다. (VITE_GAS_WEB_APP_URL이 http로 시작하는 올바른 주소인지 확인하세요.)');
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      // Use text/plain to avoid CORS preflight (OPTIONS) which GAS doesn't handle well
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'update', sheet, range, values }),
    });
    
    if (!response.ok) throw new Error(`GAS Update Error: ${response.statusText}`);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('GAS Web App이 JSON이 아닌 HTML을 반환했습니다. GAS 배포 설정에서 "액세스 권한이 있는 사용자"를 "모든 사용자(Anyone)"로 설정했는지 확인하세요.');
    }

    return await response.json();
  } catch (error: any) {
    console.error('GAS Update Failed:', error);
    if (error.message === 'Failed to fetch') {
      throw new Error('GAS 서버에 연결할 수 없습니다. GAS URL이 정확한지, 그리고 배포 설정이 "모든 사용자(Anyone)"로 되어 있는지 확인해 주세요.');
    }
    throw error;
  }
}

// Helper to delete rows via GAS
async function deleteRows(sheet: string, keyColumn: number, keyValue: string) {
  if (!GAS_URL || !GAS_URL.startsWith('http')) {
    throw new Error('데이터를 삭제하려면 GAS 웹 앱 URL 설정이 필요합니다.');
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'deleteRows', sheet, keyColumn, keyValue }),
    });
    
    if (!response.ok) throw new Error(`GAS Delete Error: ${response.statusText}`);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('GAS Web App이 JSON이 아닌 HTML을 반환했습니다. GAS 배포 설정에서 "액세스 권한이 있는 사용자"를 "모든 사용자(Anyone)"로 설정했는지 확인하세요.');
    }

    return await response.json();
  } catch (error: any) {
    console.error('GAS Delete Failed:', error);
    throw error;
  }
}

// Helper to delete a specific row by its index
async function deleteRow(sheet: string, rowIndex: number) {
  if (!GAS_URL || !GAS_URL.startsWith('http')) {
    throw new Error('데이터를 삭제하려면 GAS 웹 앱 URL 설정이 필요합니다.');
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'deleteRow', sheet, row: rowIndex }),
    });
    
    if (!response.ok) throw new Error(`GAS Delete Row Error: ${response.statusText}`);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('GAS Web App이 JSON이 아닌 HTML을 반환했습니다.');
    }

    return await response.json();
  } catch (error: any) {
    console.error('GAS Delete Row Failed:', error);
    throw error;
  }
}

export const dataApi = {
  getConfig: () => ({
    // Either SHEET_ID (for reading) or GAS_URL (for writing) is enough to start
    isConfigured: !!SHEET_ID || (!!GAS_URL && GAS_URL.startsWith('http')),
    gasUrl: GAS_URL,
    canWrite: !!GAS_URL && GAS_URL.startsWith('http')
  }),
  fetchData: async (refreshBooks = false): Promise<DashboardData> => {
    // If we don't even have a SHEET_ID, we can't do anything
    if (!SHEET_ID) {
      throw new Error('VITE_GOOGLE_SHEETS_ID가 설정되지 않았습니다. 환경 변수를 확인해 주세요.');
    }
    const fetchPromises = [
      getSheetData('학생정보', 'A2:J'),
      getSheetData('커리큘럼', 'A2:G'),
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
        info: row[4] || '',
        bookId: row[5] || '',
        status: row[6] as any || '예정',
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
    // Fetch columns A to I to find the current missed count in column I
    const studentsRaw = await getSheetData('학생정보', 'A2:I');
    const rowIndex = studentsRaw.findIndex((row: any[]) => String(row[0] || '').trim() === String(data.name).trim()) + 2;
    if (rowIndex < 2) throw new Error('Student not found');

    const currentCount = Number(studentsRaw[rowIndex - 2][8]) || 0;
    // If homework is done, count resets to 0. Otherwise, increments by 1.
    const newCount = data.isDone ? 0 : currentCount + 1;

    // G: 숙제검사, H: 미수행, I: 숙제안함
    // Update G (Check), H (MissedToday), I (Accumulated Missed)
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
    const curriculumsRaw = await getSheetData('커리큘럼', 'A2:G');
    const rowIndex = curriculumsRaw.findIndex((row: any[]) => {
      const rowStudentName = String(row[0] || '').trim();
      const rowBookId = String(row[5] || '').trim();
      const rowIndexVal = parseInt(row[1]) || 0;
      
      const isMatch = rowStudentName === String(data.studentName).trim() && 
                     rowIndexVal === data.originalIndex;
      
      const targetBookId = String(data.bookId || '').trim();
      if (targetBookId && targetBookId !== '-') {
        return isMatch && rowBookId === targetBookId;
      }
      return isMatch;
    }) + 2;
    
    if (rowIndex < 2) throw new Error('Curriculum entry not found');

    const updates = [];
    if (data.index !== undefined) updates.push(updateSheetData('커리큘럼', `B${rowIndex}`, [[data.index]]));
    if (data.bookTitle !== undefined) updates.push(updateSheetData('커리큘럼', `C${rowIndex}`, [[data.bookTitle]]));
    if (data.status !== undefined) updates.push(updateSheetData('커리큘럼', `G${rowIndex}`, [[data.status]]));
    
    const previousStatus = String(curriculumsRaw[rowIndex - 2][6] || '').trim();
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

    const curriculumsRaw = await getSheetData('커리큘럼', 'A2:G');

    let bookLevel = '';
    let bookId = '';
    let info = '';

    if (data.isWriting) {
      bookLevel = '';
      bookId = '';
      info = '';
    } else {
      const book = books.find(b => b.title === data.bookTitle);
      if (!book) throw new Error('Book not found');
      bookLevel = book.level;
      bookId = book.id;
      info = `${book.therapy}/${book.difficulty}`;
    }

    const studentCurriculum = curriculumsRaw.filter((row: any[]) => row[0] === data.studentName);
    const indices = studentCurriculum.map((row: any[]) => Number(row[1]) || 0);
    const nextIndex = (indices.length > 0 ? Math.max(...indices) : 0) + 1;

    const newRow = [
      data.studentName, 
      nextIndex, 
      data.isWriting ? '글쓰기' : data.bookTitle, 
      bookLevel, 
      info, 
      bookId, 
      '예정'
    ];
    const nextEmptyRow = curriculumsRaw.length + 2;

    await updateSheetData('커리큘럼', `A${nextEmptyRow}:G${nextEmptyRow}`, [newRow]);
    return { success: true, index: nextIndex };
  },
  remove: async (data: { studentName: string; bookId: string; index: number }) => {
    const curriculumsRaw = await getSheetData('커리큘럼', 'A2:G');
    const rowIndex = curriculumsRaw.findIndex((row: any[]) => {
      const rowStudentName = String(row[0] || '').trim();
      const rowBookId = String(row[5] || '').trim();
      const rowIndexVal = parseInt(row[1]) || 0;
      
      const isMatch = rowStudentName === String(data.studentName).trim() && 
                     rowIndexVal === data.index;
      
      const targetBookId = String(data.bookId || '').trim();
      if (targetBookId && targetBookId !== '-') {
        return isMatch && rowBookId === targetBookId;
      }
      return isMatch;
    }) + 2;
    
    if (rowIndex < 2) throw new Error('삭제할 항목을 찾을 수 없습니다.');

    await deleteRow('커리큘럼', rowIndex);
    return { success: true };
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
  },
  update: async (name: string, data: Partial<Student>) => {
    const studentsRaw = await getSheetData('학생정보', 'A2:J');
    const studentRowIndex = studentsRaw.findIndex((row: any[]) => row[0] === name) + 2;
    if (studentRowIndex < 2) throw new Error('Student not found');

    if (data.subProgram !== undefined) {
      await updateSheetData('학생정보', `D${studentRowIndex}`, [[data.subProgram]]);
    }
    return { success: true };
  }
};

export const writingStatusApi = {
  get: async (): Promise<WritingStatus[]> => {
    const data = await getSheetData('글쓰기현황', 'A2:D');
    return data
      .filter((row: any[]) => row && row[1]) // Filter out rows without a name
      .map((row: any[]) => ({
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
