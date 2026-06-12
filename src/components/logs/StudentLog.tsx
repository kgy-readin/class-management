import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import StudentLogCalendar from './StudentLogCalendar';
import StudentLogStudents from './StudentLogStudents';
import StudentLogMobileCalendar from './StudentLogMobileCalendar';
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
  const [viewMode, setViewMode] = useState<'monthly' | 'student'>('monthly');
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
    } else if (parts[1] === 'date') {
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
      setViewMode('monthly');
    } else if (parts[1] === 'monthly') {
      setViewMode('monthly');
    } else {
      // Default /logs
      setViewMode('monthly');
    }
  }, [location.pathname, students]);

  const handleSetViewMode = (mode: 'monthly' | 'student') => {
    if (mode === 'monthly') {
      navigate('/logs/monthly');
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

      {/* --- MOBILE MONTHLY VIEW --- */}
      {viewMode === 'monthly' && isMobile && (
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
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none shadow-2xl p-7 bg-white overflow-hidden animate-in fade-in zoom-in duration-300">
          <div className="space-y-6">
            
            {/* Popover Title */}
            <div className="text-left border-b border-solid border-zinc-100 pb-3">
              <h3 className="text-[19px] font-medium text-zinc-800">학생 기록 추가</h3>
            </div>

            <div className="space-y-5">
              
              {/* Row: Date & Student side-by-side (병렬 배치) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <input
                    type="date"
                    className="w-full min-w-0 bg-zinc-50 border border-solid border-zinc-100 rounded-xl px-3 py-2.5 text-[14px] font-medium focus:ring-1 focus:ring-primary/20 hover:border-zinc-300 focus:bg-white outline-none transition-all cursor-pointer"
                    value={addForm.date}
                    onChange={e => setAddForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="min-w-0">
                  <StudentCombobox
                    students={sortedStudents}
                    value={addForm.name}
                    onChange={(val) => setAddForm(prev => ({ ...prev, name: val }))}
                    placeholder="학생명"
                    inputClassName="bg-zinc-50 border-solid border-zinc-100"
                  />
                </div>
              </div>

              {/* Category selector in 3x3 Button Grid (3열 3행 배치) */}
              <div>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => {
                    const isSelected = addForm.category === cat;
                    const tagStyle = getCategoryTagStyle(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setAddForm(prev => ({ ...prev, category: cat }))}
                        className={`py-2 rounded-xl text-xs font-semibold transition-all text-center cursor-pointer ${tagStyle} ${
                          isSelected 
                            ? 'scale-102 ring-2 ring-zinc-400/35 opacity-100'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detail Content textarea */}
              <div>
                <textarea
                  rows={4}
                  placeholder="기록할 내용을 작성해 주세요."
                  className="w-full bg-zinc-50 border border-solid border-zinc-100 rounded-lg px-4 py-3 text-[14px] font-normal leading-relaxed focus:ring-1 focus:ring-primary/20 hover:border-zinc-300 focus:bg-white outline-none transition-all resize-none"
                  value={addForm.content}
                  onChange={e => setAddForm(prev => ({ ...prev, content: e.target.value }))}
                />
              </div>

            </div>

            {/* Save and Cancel buttons */}
            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setAddOpen(false)} 
                className="flex-1 h-11 rounded-xl font-medium cursor-pointer"
              >
                취소
              </Button>
              <Button 
                type="button" 
                onClick={handleAddLog} 
                className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium shadow-lg shadow-primary/10 cursor-pointer"
                disabled={submittingAdd}
              >
                {submittingAdd ? '저장 중...' : '저장'}
              </Button>
            </div>

          </div>
        </DialogContent>
      </Dialog>

    </div>
  );

  function handleCellClick(day: Date) {
    handleOpenAddDialog(day);
  }
}
