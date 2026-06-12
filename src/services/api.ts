import { Book, Student, Curriculum, WritingStatus, DashboardData, Task, StudentLogEntry, MeetingNote } from '../types';
import { MESSAGES } from '../constants/messages';

function cleanSpreadsheetId(idOrUrl: string | undefined): string {
  if (!idOrUrl) return '';
  const trimmed = idOrUrl.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  const firstSlash = trimmed.indexOf('/');
  if (firstSlash !== -1) {
    return trimmed.substring(0, firstSlash);
  }
  return trimmed;
}

const GAS_URL = import.meta.env.VITE_GAS_WEB_APP_URL;
const SHEET_ID = cleanSpreadsheetId(import.meta.env.VITE_GOOGLE_SHEETS_ID);
export const DOCS_ID = cleanSpreadsheetId(import.meta.env.VITE_GOOGLE_DOCS_ID);
export const RPN_DOCS_ID = cleanSpreadsheetId(import.meta.env.VITE_RPN_DOCS_ID);

// Helper to get sheet data directly from Google Sheets (Read-only)
// This bypasses GAS and works if the sheet is shared as "Anyone with the link can view"
async function getSheetData(sheet: string, range: string) {
  if (!SHEET_ID) throw new Error(MESSAGES.api.sheetIdNotSetInternal);
  
  // Use Google Visualization API for direct JSON fetching
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheet)}&range=${encodeURIComponent(range)}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(MESSAGES.api.directReadError(response.statusText));
    
    const text = await response.text();
    // The response is wrapped in "google.visualization.Query.setResponse(...);"
    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/)?.[1];
    if (!jsonStr) {
      if (text.includes('<!doctype html>')) {
        throw new Error(MESSAGES.api.sheetPermissionError);
      }
      throw new Error(MESSAGES.api.invalidResponseFormat);
    }
    
    const data = JSON.parse(jsonStr);
    if (data.status === 'error') {
      throw new Error(MESSAGES.api.googleSheetsError(data.errors[0].detailed_message));
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
    throw new Error(MESSAGES.api.gasUrlRequiredForUpdate);
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      // Use text/plain to avoid CORS preflight (OPTIONS) which GAS doesn't handle well
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'update', sheet, range, values }),
    });
    
    if (!response.ok) throw new Error(MESSAGES.api.gasUpdateError(response.statusText));
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(MESSAGES.api.gasHtmlResponseError);
    }

    return await response.json();
  } catch (error: any) {
    console.error('GAS Update Failed:', error);
    if (error.message === 'Failed to fetch') {
      throw new Error(MESSAGES.api.gasConnectionError);
    }
    throw error;
  }
}

// Helper to delete rows via GAS
async function deleteRows(sheet: string, keyColumn: number, keyValue: string) {
  if (!GAS_URL || !GAS_URL.startsWith('http')) {
    throw new Error(MESSAGES.api.gasUrlRequiredForDelete);
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'deleteRows', sheet, keyColumn, keyValue }),
    });
    
    if (!response.ok) throw new Error(MESSAGES.api.gasDeleteError(response.statusText));
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(MESSAGES.api.gasHtmlResponseError);
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
    throw new Error(MESSAGES.api.gasUrlRequiredForDelete);
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'deleteRow', sheet, row: rowIndex }),
    });
    
    if (!response.ok) throw new Error(MESSAGES.api.gasDeleteRowError(response.statusText));
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(MESSAGES.api.gasHtmlGenericError);
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
      throw new Error(MESSAGES.api.sheetIdNotSet);
    }
    const fetchPromises = [
      getSheetData('학생정보', 'A2:L'),
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
        attendanceDays: row[4] || '',
        isAttending: row[5] === true || row[5] === 'TRUE',
        dismissalTime: row[6] || '',
        homeworkChecked: row[7] === true || row[7] === 'TRUE',
        homeworkMissedToday: row[8] === true || row[8] === 'TRUE',
        homeworkMissed: Number(row[9]) || 0,
        booksCompleted: Number(row[10]) || 0,
        lastResultDate: row[11] || '',
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
    if (rowIndex < 2) throw new Error(MESSAGES.api.studentNotFound);

    await updateSheetData('학생정보', `F${rowIndex}:I${rowIndex}`, [
      [data.isAttending ? 'TRUE' : 'FALSE', data.isAttending ? (data.dismissalTime || '') : '', 'FALSE', 'FALSE']
    ]);
    return { success: true };
  },
  bulkDismiss: async () => {
    const studentsRaw = await getSheetData('학생정보', 'A2:I');
    const updatedFtoI = studentsRaw.map((row) => {
      const isAttending = row[5] === true || row[5] === 'TRUE';
      if (isAttending) {
        return ['FALSE', '', 'FALSE', 'FALSE'];
      } else {
        const originalF = row[5] === true || row[5] === 'TRUE' ? 'TRUE' : 'FALSE';
        const originalG = row[6] || '';
        const originalH = row[7] === true || row[7] === 'TRUE' ? 'TRUE' : 'FALSE';
        const originalI = row[8] === true || row[8] === 'TRUE' ? 'TRUE' : 'FALSE';
        return [originalF, originalG, originalH, originalI];
      }
    });
    await updateSheetData('학생정보', `F2:I${studentsRaw.length + 1}`, updatedFtoI);
    return { success: true };
  }
};

export const homeworkApi = {
  update: async (data: { name: string; isDone: boolean }) => {
    // Fetch columns A to J to find the current missed count in column J
    const studentsRaw = await getSheetData('학생정보', 'A2:J');
    const rowIndex = studentsRaw.findIndex((row: any[]) => String(row[0] || '').trim() === String(data.name).trim()) + 2;
    if (rowIndex < 2) throw new Error(MESSAGES.api.studentNotFound);

    const currentCount = Number(studentsRaw[rowIndex - 2][9]) || 0;
    // If homework is done, count resets to 0. Otherwise, increments by 1.
    const newCount = data.isDone ? 0 : currentCount + 1;

    // H: 숙제검사, I: 미수행, J: 숙제안함
    // Update H (Check), I (MissedToday), J (Accumulated Missed)
    await updateSheetData('학생정보', `H${rowIndex}:J${rowIndex}`, [['TRUE', data.isDone ? 'FALSE' : 'TRUE', newCount]]);
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
    
    if (rowIndex < 2) throw new Error(MESSAGES.api.curriculumNotFound);

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
        const studentsRaw = await getSheetData('학생정보', 'A2:K');
        const studentRowIndex = studentsRaw.findIndex((row: any[]) => String(row[0]).trim() === String(data.studentName).trim()) + 2;
        if (studentRowIndex >= 2) {
          const currentCompleted = Number(studentsRaw[studentRowIndex - 2][10]) || 0;
          await updateSheetData('학생정보', `K${studentRowIndex}`, [[currentCompleted + 1]]);
        }
      } else if (previousStatus === '통과') {
        const studentsRaw = await getSheetData('학생정보', 'A2:K');
        const studentRowIndex = studentsRaw.findIndex((row: any[]) => String(row[0]).trim() === String(data.studentName).trim()) + 2;
        if (studentRowIndex >= 2) {
          const currentCompleted = Number(studentsRaw[studentRowIndex - 2][10]) || 0;
          await updateSheetData('학생정보', `K${studentRowIndex}`, [[Math.max(0, currentCompleted - 1)]]);
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
      if (!book) throw new Error(MESSAGES.api.bookNotFound);
      bookLevel = book.level;
      bookId = book.id;
      info = `${book.therapy} / ${book.difficulty}`;
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
    
    if (rowIndex < 2) throw new Error(MESSAGES.api.itemNotFoundToDelete);

    await deleteRow('커리큘럼', rowIndex);
    return { success: true };
  }
};

export const studentApi = {
  levelUp: async (name: string) => {
    const studentsRaw = await getSheetData('학생정보', 'A2:L');
    const studentRowIndex = studentsRaw.findIndex((row: any[]) => row[0] === name) + 2;
    if (studentRowIndex < 2) throw new Error(MESSAGES.api.studentNotFound);

    const studentRow = studentsRaw[studentRowIndex - 2];
    const currentLevel = parseInt(studentRow[2]) || 0;
    
    studentRow[2] = currentLevel + 1;
    studentRow[10] = 0;
    
    await updateSheetData('학생정보', `A${studentRowIndex}:L${studentRowIndex}`, [studentRow]);
    await deleteRows('커리큘럼', 1, name);

    return { success: true };
  },
  update: async (name: string, data: Partial<Student>) => {
    const studentsRaw = await getSheetData('학생정보', 'A2:A');
    const studentRowIndex = studentsRaw.findIndex((row: any[]) => String(row[0]).trim() === name.trim()) + 2;
    if (studentRowIndex < 2) throw new Error(MESSAGES.api.studentNotFound);

    if (data.grade !== undefined) {
      await updateSheetData('학생정보', `B${studentRowIndex}`, [[data.grade]]);
    }
    if (data.level !== undefined) {
      await updateSheetData('학생정보', `C${studentRowIndex}`, [[data.level]]);
    }
    if (data.subProgram !== undefined) {
      await updateSheetData('학생정보', `D${studentRowIndex}`, [[data.subProgram]]);
    }
    if (data.attendanceDays !== undefined) {
      await updateSheetData('학생정보', `E${studentRowIndex}`, [[data.attendanceDays]]);
    }
    if (data.homeworkMissed !== undefined) {
      await updateSheetData('학생정보', `J${studentRowIndex}`, [[data.homeworkMissed]]);
    }
    if (data.booksCompleted !== undefined) {
      await updateSheetData('학생정보', `K${studentRowIndex}`, [[data.booksCompleted]]);
    }
    if (data.lastResultDate !== undefined) {
      await updateSheetData('학생정보', `L${studentRowIndex}`, [[data.lastResultDate]]);
    }
    return { success: true };
  },
  add: async (data: { name: string; grade: string; level: string; subProgram: string; attendanceDays: string; booksCompleted: number; lastResultDate?: string }) => {
    const studentsRaw = await getSheetData('학생정보', 'A2:A');
    const exists = studentsRaw.some((row: any[]) => String(row[0] || '').trim() === data.name.trim());
    if (exists) {
      throw new Error(MESSAGES.api.studentNameExists);
    }

    const nextEmptyRow = studentsRaw.length + 2;
    const newRow = [
      data.name,
      data.grade,
      data.level,
      data.subProgram,
      data.attendanceDays,
      'FALSE',
      '',
      'FALSE',
      'FALSE',
      0,
      data.booksCompleted,
      data.lastResultDate || ''
    ];
    await updateSheetData('학생정보', `A${nextEmptyRow}:L${nextEmptyRow}`, [newRow]);
    return { success: true };
  },
  delete: async (name: string) => {
    await deleteRows('학생정보', 1, name);
    try {
      await deleteRows('커리큘럼', 1, name);
    } catch (e) {
      // fine if no curriculum entries
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
  remove: async (data: { name: string; bookTitle: string; date: string }) => {
    const writingRaw = await getSheetData('글쓰기현황', 'A2:D');
    const targetDate = String(data.date).split('T')[0];
    const rowIndex = writingRaw.findIndex((row: any[]) => {
      const rowDate = String(row[0]).split('T')[0];
      return String(row[1]).trim() === String(data.name).trim() && 
             String(row[2]).trim() === String(data.bookTitle).trim() &&
             rowDate === targetDate;
    }) + 2;
    
    if (rowIndex < 2) throw new Error(MESSAGES.api.itemNotFoundToDelete);
    await deleteRow('글쓰기현황', rowIndex);
    return { success: true };
  },
  clear: async (startDate?: string, endDate?: string) => {
    if (!startDate || !endDate) {
      await updateSheetData('글쓰기현황', 'A2:D1000', Array(999).fill(['', '', '', '']));
      return { success: true };
    }

    // Load current data
    const writingRaw = await getSheetData('글쓰기현황', 'A2:D');

    // Filter rows to keep (those OUTSIDE the date range)
    const rowsToKeep = writingRaw.filter((row: any[]) => {
      if (!row || !row[1]) return false; // Ignore completely empty rows
      if (!row[0]) return true; // Keep cells without a date
      try {
        const rowDateStr = String(row[0]).substring(0, 10);
        // If rowDateStr is within [startDate, endDate], it should be deleted (so return false)
        if (rowDateStr >= startDate && rowDateStr <= endDate) {
          return false;
        }
      } catch (e) {
        // preserve on error
      }
      return true;
    });

    // Write back the kept rows and blank helper values for the rest
    const newValues = Array(999).fill(null).map((_, i) => {
      if (i < rowsToKeep.length) {
        const r = rowsToKeep[i];
        return [r[0] || '', r[1] || '', r[2] || '', r[3] || '진행'];
      }
      return ['', '', '', ''];
    });

    await updateSheetData('글쓰기현황', 'A2:D1000', newValues);
    return { success: true };
  }
};

export const taskApi = {
  get: async (): Promise<Task[]> => {
    const data = await getSheetData('업무', 'A2:G');
    return data
      .map((row: any[], index: number) => ({
        sheetRowIndex: index + 2,
        date: row[0] || '',
        name: row[1] || '',
        category: row[2] || '',
        familyClass: row[3] || '',
        todo: row[4] || '',
        status: row[5] || '예정',
        memo: row[6] || '',
      }))
      .filter((task: Task) => task.todo || task.category || task.name);
  },
  add: async (task: Omit<Task, 'sheetRowIndex'>) => {
    const existing = await getSheetData('업무', 'A2:G');
    const nextEmptyRow = existing.length + 2;
    const newRow = [
      task.date,
      task.name,
      task.category,
      task.familyClass,
      task.todo,
      task.status,
      task.memo
    ];
    await updateSheetData('업무', `A${nextEmptyRow}:G${nextEmptyRow}`, [newRow]);
    return { success: true, sheetRowIndex: nextEmptyRow };
  },
  update: async (sheetRowIndex: number, task: Omit<Task, 'sheetRowIndex'>) => {
    const updatedRow = [
      task.date,
      task.name,
      task.category,
      task.familyClass,
      task.todo,
      task.status,
      task.memo
    ];
    await updateSheetData('업무', `A${sheetRowIndex}:G${sheetRowIndex}`, [updatedRow]);
    return { success: true };
  },
  remove: async (sheetRowIndex: number) => {
    await deleteRow('업무', sheetRowIndex);
    return { success: true };
  }
};

export const noteApi = {
  getRawText: async (): Promise<string> => {
    if (!GAS_URL || !GAS_URL.startsWith('http')) {
      throw new Error(MESSAGES.api.memoUrlRequiredForRead);
    }
    try {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'getRawText', spreadsheetId: SHEET_ID, documentId: DOCS_ID })
      });
      if (!response.ok) throw new Error(MESSAGES.api.gasGetMemoError(response.statusText));
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(MESSAGES.api.gasResponseHtmlCheck);
      }
      
      const res = await response.json();
      if (res.error) throw new Error(res.error);
      return res.text || '';
    } catch (e: any) {
      console.warn('GAS getRawText Failed (Using local/offline fallback):', e.message || e);
      throw e;
    }
  },

  saveRawText: async (text: string): Promise<{ success: boolean }> => {
    if (!GAS_URL || !GAS_URL.startsWith('http')) {
      throw new Error(MESSAGES.api.memoUrlRequiredForSave);
    }
    try {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'saveRawText', text, spreadsheetId: SHEET_ID, documentId: DOCS_ID })
      });
      if (!response.ok) throw new Error(MESSAGES.api.gasSaveMemoError(response.statusText));
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(MESSAGES.api.gasResponseHtmlCheck);
      }

      const res = await response.json();
      if (res.error) throw new Error(res.error);
      return { success: !!res.success };
    } catch (e: any) {
      console.error('GAS saveRawText Failed:', e);
      throw e;
    }
  },

  getTabsData: async (customDocId?: string): Promise<any[]> => {
    if (!GAS_URL || !GAS_URL.startsWith('http')) {
      throw new Error(MESSAGES.api.memoUrlRequiredForRead);
    }
    const documentId = customDocId || DOCS_ID;
    try {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'getTabsData', spreadsheetId: SHEET_ID, documentId })
      });
      if (!response.ok) throw new Error(MESSAGES.api.gasGetTabsError(response.statusText));
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(MESSAGES.api.gasResponseHtmlCheck);
      }
      
      const res = await response.json();
      if (res.error) throw new Error(res.error);
      return res.tabs || [];
    } catch (e: any) {
      console.error('GAS getTabsData Failed:', e);
      throw e;
    }
  },

  saveTabSpecification: async (tabId: string, text: string, customDocId?: string): Promise<{ success: boolean }> => {
    if (!GAS_URL || !GAS_URL.startsWith('http')) {
      throw new Error(MESSAGES.api.memoUrlRequiredForSave);
    }
    const documentId = customDocId || DOCS_ID;
    try {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'saveTabSpecification', tabId, text, spreadsheetId: SHEET_ID, documentId })
      });
      if (!response.ok) throw new Error(MESSAGES.api.gasSaveTabError(response.statusText));
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(MESSAGES.api.gasResponseHtmlCheck);
      }

      const res = await response.json();
      if (res.error) throw new Error(res.error);
      return { success: !!res.success };
    } catch (e: any) {
      console.error('GAS saveTabSpecification Failed:', e);
      throw e;
    }
  }
};

export const beginnerFeedbackApi = {
  get: async (): Promise<{ bookTitle: string; content: string }[]> => {
    const data = await getSheetData('기초첨삭', 'A2:B');
    return data
      .filter((row: any[]) => row && row[0])
      .map((row: any[]) => ({
        bookTitle: String(row[0] || '').trim(),
        content: String(row[1] || '').trim(),
      }));
  },
  update: async (originalBookTitle: string, data: { bookTitle: string; content: string }) => {
    const rawData = await getSheetData('기초첨삭', 'A2:B');
    const rowIndex = rawData.findIndex((row: any[]) => String(row[0] || '').trim() === originalBookTitle.trim()) + 2;
    if (rowIndex < 2) {
      const nextEmptyRow = rawData.length + 2;
      await updateSheetData('기초첨삭', `A${nextEmptyRow}:B${nextEmptyRow}`, [[data.bookTitle, data.content]]);
    } else {
      await updateSheetData('기초첨삭', `A${rowIndex}:B${rowIndex}`, [[data.bookTitle, data.content]]);
    }
    return { success: true };
  }
};

export const studentLogApi = {
  get: async (): Promise<StudentLogEntry[]> => {
    const data = await getSheetData('교무수첩', 'A2:D');
    return data
      .filter((row: any[]) => row && row[1]) // Filter out empty name rows
      .map((row: any[]) => ({
        date: row[0] || '',
        name: row[1] || '',
        category: row[2] || '',
        content: row[3] || '',
      }));
  },
  add: async (data: StudentLogEntry) => {
    const rawData = await getSheetData('교무수첩', 'A2:D');
    const nextEmptyRow = rawData.length + 2;
    const targetDate = data.date || new Date().toISOString().split('T')[0];
    const newRow = [targetDate, data.name, data.category, data.content];
    await updateSheetData('교무수첩', `A${nextEmptyRow}:D${nextEmptyRow}`, [newRow]);
    return { success: true };
  },
  remove: async (data: { name: string; date: string; category: string; content: string }) => {
    const rawData = await getSheetData('교무수첩', 'A2:D');
    const targetDate = String(data.date).split('T')[0];
    const targetCategory = String(data.category || '').trim();
    const targetContent = String(data.content || '').trim();
    
    const rowIndex = rawData.findIndex((row: any[]) => {
      const rowDate = String(row[0]).split('T')[0];
      return String(row[1]).trim() === String(data.name).trim() &&
             String(row[2]).trim() === targetCategory &&
             String(row[3]).trim() === targetContent &&
             rowDate === targetDate;
    }) + 2;

    if (rowIndex < 2) throw new Error(MESSAGES.api.itemNotFoundToDelete);
    await deleteRow('교무수첩', rowIndex);
    return { success: true };
  },
  update: async (original: StudentLogEntry, updated: StudentLogEntry) => {
    const rawData = await getSheetData('교무수첩', 'A2:D');
    const origDate = String(original.date || '').split('T')[0];
    const origCategory = String(original.category || '').trim();
    const origContent = String(original.content || '').trim();
    const origName = String(original.name || '').trim();

    const rowIndex = rawData.findIndex((row: any[]) => {
      const rowDate = String(row[0]).split('T')[0];
      return String(row[1]).trim() === origName &&
             String(row[2]).trim() === origCategory &&
             String(row[3]).trim() === origContent &&
             rowDate === origDate;
    }) + 2;

    if (rowIndex < 2) throw new Error(MESSAGES.api.itemNotFoundToEdit);
    const newRow = [updated.date, updated.name, updated.category, updated.content];
    await updateSheetData('교무수첩', `A${rowIndex}:D${rowIndex}`, [newRow]);
    return { success: true };
  }
};

export const meetingNoteApi = {
  get: async (): Promise<MeetingNote[]> => {
    const data = await getSheetData('회의록', 'A2:C');
    return data
      .map((row: any[], index: number) => ({
        sheetRowIndex: index + 2,
        date: row[0] || '',
        title: row[1] || '',
        content: row[2] || '',
      }))
      .filter((note: MeetingNote) => note.title || note.content);
  },
  add: async (note: Omit<MeetingNote, 'sheetRowIndex'>) => {
    const existing = await getSheetData('회의록', 'A2:C');
    const nextEmptyRow = existing.length + 2;
    const newRow = [note.date, note.title, note.content];
    await updateSheetData('회의록', `A${nextEmptyRow}:C${nextEmptyRow}`, [newRow]);
    return { success: true, sheetRowIndex: nextEmptyRow };
  },
  update: async (sheetRowIndex: number, note: MeetingNote) => {
    const updatedRow = [note.date, note.title, note.content];
    await updateSheetData('회의록', `A${sheetRowIndex}:C${sheetRowIndex}`, [updatedRow]);
    return { success: true };
  },
  remove: async (sheetRowIndex: number) => {
    await deleteRow('회의록', sheetRowIndex);
    return { success: true };
  }
};
