import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AddLogDialog } from './LogPopups';
import StudentLogCalendar from './StudentLogCalendar';
import StudentLogStudents from './StudentLogStudents';
import StudentLogMobileCalendar from './StudentLogMobileCalendar';
import StudentLogMonthlyDetail from './StudentLogMonthlyDetail';
import StudentCombobox from '../common/StudentCombobox';
import { isKoreanHoliday } from './holidayUtils';
import { 
  StudentLogEntry, 
  LOG_CATEGORY_COLORS, 
  getTagColor, 
  Student,
  getShortHash
} from '../../types';
import { studentLogApi } from '@/src/services/api';
import { toast } from 'sonner';
import { MESSAGES } from '@/src/constants/messages';
import { format } from 'date-fns';

interface StudentLogProps {
  students: Student[];
}

const CATEGORIES = [
  '지도방향', '특이사항', '성장긍정',
  '쓰기부진', '읽기부진', '학업부진',
  '문제행동', '가정소통', '운영방침'
];

const getCategoryTagStyle = (category: string): string => {
  const colorName = LOG_CATEGORY_COLORS[category] || '기본';
  return getTagColor(colorName);
};

export default function StudentLog({ students = [] }: StudentLogProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [logs, setLogs] = useState<StudentLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'monthly' | 'student' | 'monthly-detail'>('monthly');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Add Log Dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    date: '',
    name: '',
    category: '특이사항',
    content: ''
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Responsive / Mobile state
  const [isMobile, setIsMobile] = useState(false);

  const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  useEffect(() => {
    const handleResize = () => {
      const mobileStatus = window.innerWidth < 768;
      setIsMobile(mobileStatus);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await studentLogApi.get();
      setLogs(data);
    } catch (error: any) {
      toast.error(MESSAGES.studentLog.loadError(error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Sync state from URL on mount and location changes
  useEffect(() => {
    const pathname = location.pathname;
    if (!pathname.startsWith('/logs')) return;

    const parts = pathname.split('/').filter(Boolean); // ["logs", ...]
    
    if (parts[1] === 'students') {
      setViewMode('student');
      const hash = parts[2];
      if (hash) {
        const found = students.find(s => getShortHash(s.name) === hash);
        if (found) {
          setSelectedStudent(found.name);
        } else {
          setSelectedStudent('');
        }
      } else {
        setSelectedStudent('');
      }
    } else if (parts[1] === 'date' || parts[1] === 'detail') {
      const dateStr = parts[2];
      if (dateStr) {
        try {
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            setSelectedDate(parsedDate);
            setCurrentMonth(parsedDate);
          }
        } catch (e) {}
      }
      const checkMobile = window.innerWidth < 768;
      if (parts[1] === 'detail') {
        setViewMode('monthly-detail');
      } else {
        setViewMode(checkMobile ? 'monthly' : 'monthly-detail');
      }
    } else if (parts[1] === 'monthly') {
      setViewMode('monthly');
    } else {
      // Default /logs
      setViewMode('monthly');
    }
  }, [location.pathname, students]);

  const handleSetViewMode = (mode: 'monthly' | 'student' | 'monthly-detail') => {
    if (mode === 'monthly') {
      navigate('/logs/monthly');
    } else if (mode === 'monthly-detail') {
      navigate(`/logs/detail/${format(selectedDate || new Date(), 'yyyy-MM-dd')}`);
    } else {
      if (selectedStudent) {
        navigate(`/logs/students/${getShortHash(selectedStudent)}`);
      } else {
        navigate('/logs/students');
      }
    }
  };

  const handleSetSelectedStudent = (name: string) => {
    setSelectedStudent(name);
    navigate(`/logs/students/${getShortHash(name)}`);
  };

  const handleSetSelectedDate = (date: Date) => {
    setSelectedDate(date);
    navigate(`/logs/date/${format(date, 'yyyy-MM-dd')}`);
  };

  const handleOpenAddDialog = (initialDate?: Date) => {
    setAddForm({
      date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      name: selectedStudent || '',
      category: '특이사항',
      content: ''
    });
    setAddOpen(true);
  };

  const handleAddLog = async () => {
    if (!addForm.name) {
      toast.error(MESSAGES.studentLog.selectStudent);
      return;
    }
    if (!addForm.category) {
      toast.error(MESSAGES.studentLog.selectCategory);
      return;
    }
    if (!addForm.content.trim()) {
      toast.error(MESSAGES.studentLog.enterContent);
      return;
    }

    setSubmittingAdd(true);
    try {
      await studentLogApi.add({
        date: addForm.date,
        name: addForm.name,
        category: addForm.category,
        content: addForm.content.trim()
      });
      toast.success(MESSAGES.studentLog.addSuccess);
      setAddOpen(false);
      fetchLogs();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmittingAdd(false);
    }
  };

  if (loading) {
    return <div className="text-center py-24 text-zinc-400 font-medium">로딩 중...</div>;
  }

  return (
    <div className="space-y-6">

      {/* --- MONTHLY VIEW --- */}
      {viewMode === 'monthly' && !isMobile && (
        <StudentLogCalendar
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          setViewMode={handleSetViewMode}
          setCurrentPage={() => {}} // Dummy as it's handled internally in StudentLogStudents
          logs={logs}
          handleCellClick={handleCellClick}
          getCategoryTagStyle={getCategoryTagStyle}
          isKoreanHoliday={isKoreanHoliday}
        />
      )}

      {/* --- MONTHLY DETAIL VIEW --- */}
      {viewMode === 'monthly-detail' && !isMobile && (
        <StudentLogMonthlyDetail
          logs={logs}
          fetchLogs={fetchLogs}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          setViewMode={handleSetViewMode}
          handleOpenAddDialog={handleOpenAddDialog}
          sortedStudents={sortedStudents}
          selectedDate={selectedDate}
          setSelectedDate={handleSetSelectedDate}
        />
      )}

      {/* --- MOBILE MONTHLY VIEW --- */}
      {(viewMode === 'monthly' || viewMode === 'monthly-detail') && isMobile && (
        <StudentLogMobileCalendar
          logs={logs}
          fetchLogs={fetchLogs}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          setViewMode={handleSetViewMode}
          handleOpenAddDialog={handleOpenAddDialog}
          sortedStudents={sortedStudents}
          selectedDate={selectedDate}
          setSelectedDate={handleSetSelectedDate}
        />
      )}

      {/* --- STUDENT VIEW --- */}
      {viewMode === 'student' && (
        <StudentLogStudents
          sortedStudents={sortedStudents}
          selectedStudent={selectedStudent}
          setSelectedStudent={handleSetSelectedStudent}
          logs={logs}
          fetchLogs={fetchLogs}
          isMobile={isMobile}
          setViewMode={handleSetViewMode}
          handleOpenAddDialog={handleOpenAddDialog}
        />
      )}

      {/* --- ADD NEW ENTRY DIALOG (POPUP) --- */}
      <AddLogDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        students={sortedStudents}
        addForm={addForm}
        setAddForm={setAddForm}
        onConfirm={handleAddLog}
        isSubmitting={submittingAdd}
        categories={CATEGORIES}
        getCategoryTagStyle={getCategoryTagStyle}
      />

    </div>
  );

  function handleCellClick(day: Date) {
    handleOpenAddDialog(day);
  }
}
