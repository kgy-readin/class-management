import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { Book, Student, Curriculum, WritingStatus } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const GAS_URL = process.env.GAS_WEB_APP_URL;

// Helper to get sheet data via GAS
async function getSheetData(sheet: string, range: string) {
  if (!GAS_URL) throw new Error('GAS_WEB_APP_URL is not set');
  const url = `${GAS_URL}?action=read&sheet=${encodeURIComponent(sheet)}&range=${encodeURIComponent(range)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GAS Read Error: ${response.statusText}`);
  return await response.json();
}

// Helper to update sheet data via GAS
async function updateSheetData(sheet: string, range: string, values: any[][]) {
  if (!GAS_URL) throw new Error('GAS_WEB_APP_URL is not set');
  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', sheet, range, values }),
  });
  if (!response.ok) throw new Error(`GAS Update Error: ${response.statusText}`);
  return await response.json();
}

// Helper to clear sheet data via GAS
async function clearSheetData(sheet: string, range: string) {
  if (!GAS_URL) throw new Error('GAS_WEB_APP_URL is not set');
  const response = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'clear', sheet, range }),
  });
  if (!response.ok) throw new Error(`GAS Clear Error: ${response.statusText}`);
  return await response.json();
}

// API Routes
app.get('/api/config', (req, res) => {
  res.json({
    isConfigured: !!GAS_URL,
    gasUrl: GAS_URL,
  });
});

app.get('/api/data', async (req, res) => {
  try {
    const [booksRaw, studentsRaw, curriculumsRaw] = await Promise.all([
      getSheetData('도서목록', 'A2:I'),
      getSheetData('학생정보', 'A2:I'),
      getSheetData('커리큘럼', 'A2:F'),
    ]);

    const books: Book[] = booksRaw
      .filter((row: any[]) => row[1]) // Filter out rows without a title
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

    const students: Student[] = studentsRaw
      .filter((row: any[]) => row[0]) // Filter out rows without a name
      .map((row: any[]) => ({
      name: row[0] || '',
      grade: row[1] || '',
      level: row[2] || '',
      subProgram: row[3] || '',
      isAttending: row[4] === true || row[4] === 'TRUE',
      dismissalTime: row[5] || '',
      homeworkChecked: row[6] === true || row[6] === 'TRUE',
      homeworkMissed: Number(row[7]) || 0,
      booksCompleted: Number(row[8]) || 0,
    }));

    const curriculums: Curriculum[] = curriculumsRaw
      .filter((row: any[]) => row[0] && row[2]) // Filter out rows without student name or book title
      .map((row: any[]) => ({
      studentName: row[0] || '',
      index: parseInt(row[1]) || 0,
      bookTitle: row[2] || '',
      bookLevel: row[3] || '',
      bookId: row[4] || '',
      status: row[5] as any || '예정',
    }));

    res.json({ books, students, curriculums });
  } catch (error: any) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/attendance', async (req, res) => {
  const { name, isAttending, dismissalTime } = req.body;
  try {
    const studentsRaw = await getSheetData('학생정보', 'A2:A');
    const rowIndex = studentsRaw.findIndex((row: any[]) => row[0] === name) + 2;
    if (rowIndex < 2) throw new Error('Student not found');

    // Update attendance (E), dismissalTime (F), and reset homeworkChecked (G)
    await updateSheetData('학생정보', `E${rowIndex}:G${rowIndex}`, [
      [isAttending ? 'TRUE' : 'FALSE', isAttending ? dismissalTime : '', 'FALSE']
    ]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/homework', async (req, res) => {
  const { name, isDone } = req.body;
  try {
    const studentsRaw = await getSheetData('학생정보', 'A2:I');
    const rowIndex = studentsRaw.findIndex((row: any[]) => row[0] === name) + 2;
    if (rowIndex < 2) throw new Error('Student not found');

    const currentCount = Number(studentsRaw[rowIndex - 2][7]) || 0;
    const newCount = isDone ? 0 : currentCount + 1;

    // Update both homeworkChecked (G) and homeworkMissed (H)
    await updateSheetData('학생정보', `G${rowIndex}:H${rowIndex}`, [['TRUE', newCount]]);
    
    res.json({ success: true, newCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/curriculum/update', async (req, res) => {
  const { studentName, bookId, status } = req.body;
  try {
    const curriculumsRaw = await getSheetData('커리큘럼', 'A2:F');
    const rowIndex = curriculumsRaw.findIndex((row: any[]) => row[0] === studentName && row[4] === bookId) + 2;
    if (rowIndex < 2) throw new Error('Curriculum entry not found');

    await updateSheetData('커리큘럼', `F${rowIndex}`, [[status]]);

    if (status === '통과') {
      const studentsRaw = await getSheetData('학생정보', 'A2:I');
      const studentRowIndex = studentsRaw.findIndex((row: any[]) => row[0] === studentName) + 2;
      if (studentRowIndex >= 2) {
        const currentCompleted = Number(studentsRaw[studentRowIndex - 2][8]) || 0;
        await updateSheetData('학생정보', `I${studentRowIndex}`, [[currentCompleted + 1]]);
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/curriculum/add', async (req, res) => {
  const { studentName, bookTitle, isWriting } = req.body;
  try {
    const [booksRaw, curriculumsRaw] = await Promise.all([
      getSheetData('도서목록', 'A2:C'),
      getSheetData('커리큘럼', 'A2:F'),
    ]);

    let bookLevel = '';
    let bookId = '';

    if (isWriting) {
      bookLevel = '';
      bookId = '';
    } else {
      const book = booksRaw.find((row: any[]) => row[1] === bookTitle);
      if (!book) throw new Error('Book not found');
      bookLevel = book[0];
      bookId = book[2];
    }

    const studentCurriculum = curriculumsRaw.filter((row: any[]) => row[0] === studentName);
    const indices = studentCurriculum.map((row: any[]) => Number(row[1]) || 0);
    const nextIndex = (indices.length > 0 ? Math.max(...indices) : 0) + 1;

    const newRow = [studentName, nextIndex, isWriting ? '글쓰기' : bookTitle, bookLevel, bookId, '예정'];
    const nextEmptyRow = curriculumsRaw.length + 2;

    await updateSheetData('커리큘럼', `A${nextEmptyRow}:F${nextEmptyRow}`, [newRow]);
    res.json({ success: true, index: nextIndex });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/level-up', async (req, res) => {
  const { name } = req.body;
  try {
    const studentsRaw = await getSheetData('학생정보', 'A2:I');
    const studentRowIndex = studentsRaw.findIndex((row: any[]) => row[0] === name) + 2;
    if (studentRowIndex < 2) throw new Error('Student not found');

    const currentLevel = parseInt(studentsRaw[studentRowIndex - 2][2]) || 0;
    // Update Level (C) and Reset Completed Books (I)
    await updateSheetData('학생정보', `C${studentRowIndex}`, [[currentLevel + 1]]);
    await updateSheetData('학생정보', `I${studentRowIndex}`, [[0]]);

    // Delete all rows for this student in '커리큘럼' sheet
    if (!GAS_URL) throw new Error('GAS_WEB_APP_URL is not set');
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteRows', sheet: '커리큘럼', keyColumn: 1, keyValue: name }),
    });
    
    if (!response.ok) throw new Error('Failed to delete curriculum rows');

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/writing-status', async (req, res) => {
  try {
    const data = await getSheetData('글쓰기현황', 'A2:E');
    const writingStatus: WritingStatus[] = data.map((row: any[]) => ({
      date: row[0] || '',
      name: row[1] || '',
      bookTitle: row[2] || '',
      bookId: row[3] || '',
      progress: row[4] as any || '진행',
    }));
    res.json(writingStatus);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/writing-status/update', async (req, res) => {
  const { name, bookId, bookTitle, progress } = req.body;
  try {
    const writingRaw = await getSheetData('글쓰기현황', 'A2:E');
    const date = new Date().toISOString().split('T')[0];
    
    // Check if entry already exists for this student and book
    const rowIndex = writingRaw.findIndex((row: any[]) => row[1] === name && row[3] === bookId) + 2;
    
    const newRow = [date, name, bookTitle, bookId, progress];
    
    if (rowIndex >= 2) {
      // Update existing
      await updateSheetData('글쓰기현황', `A${rowIndex}:E${rowIndex}`, [newRow]);
    } else {
      // Add new
      const nextEmptyRow = writingRaw.length + 2;
      await updateSheetData('글쓰기현황', `A${nextEmptyRow}:E${nextEmptyRow}`, [newRow]);
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/writing-status/clear', async (req, res) => {
  try {
    // Clear data from '글쓰기현황' sheet, keeping the header row (A1:E1)
    await updateSheetData('글쓰기현황', 'A2:E1000', Array(999).fill(['', '', '', '', '']));
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
