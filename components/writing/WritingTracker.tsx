import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WritingStatus, getTagColor, Student, getShortHash } from '../../types';
import { toast } from 'sonner';
import { MESSAGES } from '@/src/constants/messages';
import { BookText, Calendar as CalendarIcon, Trash2, Save, X, Pencil, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { writingStatusApi } from '@/src/services/api';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import StudentCombobox from '../common/StudentCombobox';
import { AddWritingDialog, DeleteWritingDialog, ClearWritingDialog } from './WritingPopups';
import { isKoreanHoliday } from '../logs/holidayUtils';

const MONTHS_ENG = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const formatMonthValue = (date: Date): string => {
  const year = date.getFullYear();
  const monthIdx = date.getMonth();
  const monthName = MONTHS_ENG[monthIdx];
  return `${year}-${monthName}`;
};

const parseMonthValue = (str: string): Date | null => {
  const parts = str.toLowerCase().split('-');
  if (parts.length !== 2) return null;
  const year = parseInt(parts[0], 10);
  if (isNaN(year)) return null;

  let monthIdx = -1;
  const secondPart = parts[1];

  monthIdx = MONTHS_ENG.indexOf(secondPart.slice(0, 3));
  if (monthIdx === -1) {
    const numericMonth = parseInt(secondPart, 10);
    if (!isNaN(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
      monthIdx = numericMonth - 1;
    }
  }

  if (monthIdx !== -1) {
    const d = new Date();
    d.setFullYear(year);
    d.setMonth(monthIdx);
    d.setDate(1);
    return d;
  }
  return null;
};

export default function WritingTracker({ students = [] }: { students?: Student[] }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [statuses, setStatuses] = useState<WritingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [clearing, setClearing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ date: string; bookTitle: string; progress: string } | null>(null);


  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearType, setClearType] = useState<'all' | 'period'>('period');
  const [clearStartDate, setClearStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [clearEndDate, setClearEndDate] = useState(() => {
    return format(new Date(), 'yyyy-MM-dd');
  });

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    date: '',
    name: '',
    bookTitle: '',
    progress: '완료'
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [deletingItem, setDeletingItem] = useState<WritingStatus | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  const studentFirstProgressMap = useMemo(() => {
    if (!selectedStudent) return {};
    const map: Record<string, string> = {};
    for (const status of statuses) {
      if (status.name === selectedStudent) {
        if (!map[status.date]) {
          map[status.date] = status.progress;
        }
      }
    }
    return map;
  }, [statuses, selectedStudent]);

  const isCompletedDay = (date: Date) => {
    if (!selectedStudent) return false;
    const dateStr = format(date, 'yyyy-MM-dd');
    return studentFirstProgressMap[dateStr] === '완료';
  };

  const isOngoingDay = (date: Date) => {
    if (!selectedStudent) return false;
    const dateStr = format(date, 'yyyy-MM-dd');
    return studentFirstProgressMap[dateStr] === '진행';
  };

  const handleOpenAddDialog = () => {
    setAddForm({
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      name: selectedStudent || '',
      bookTitle: '',
      progress: '완료'
    });
    setAddOpen(true);
  };

  const handleAddStatus = async () => {
    if (!addForm.name) {
      toast.error(MESSAGES.writing.selectStudent);
      return;
    }
    if (!addForm.bookTitle.trim()) {
      toast.error(MESSAGES.writing.enterBook);
      return;
    }
    setSubmittingAdd(true);
    try {
      await writingStatusApi.update({
        name: addForm.name,
        bookTitle: addForm.bookTitle.trim(),
        progress: addForm.progress,
        date: addForm.date
      });
      toast.success(MESSAGES.writing.addSuccess);
      setAddOpen(false);
      fetchWritingStatus();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleDeleteStatus = async (item: WritingStatus) => {
    setIsDeleting(true);
    try {
      await writingStatusApi.remove({
        name: item.name,
        bookTitle: item.bookTitle,
        date: item.date
      });
      toast.success(MESSAGES.writing.deleteSuccess);
      setDeletingItem(null);
      fetchWritingStatus();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchWritingStatus = async () => {
    try {
      const result = await writingStatusApi.get();
      setStatuses(result);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWritingStatus();
  }, []);

  // Sync state from URL
  useEffect(() => {
    const pathname = location.pathname;
    if (!pathname.startsWith('/writing')) return;

    const parts = pathname.split('/').filter(Boolean); // ["writing", ...]
    if (parts[1] === 'date') {
      const dateStr = parts[2];
      if (dateStr) {
        try {
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            setSelectedDate(parsedDate);
            setCurrentMonth(parsedDate);
            setSelectedStudent(null);
            return;
          }
        } catch (e) {}
      }
    } else if (parts[1] === 'month') {
      const monthStr = parts[2];
      if (monthStr) {
        const parsedMonth = parseMonthValue(monthStr);
        if (parsedMonth) {
          setSelectedDate(undefined);
          setCurrentMonth(parsedMonth);
          setSelectedStudent(null);
          return;
        }
      }
    } else if (parts[1] === 'students') {
      const hash = parts[2];
      if (hash) {
        const found = students.find(s => getShortHash(s.name) === hash);
        if (found) {
          setSelectedStudent(found.name);
          setSelectedDate(undefined);
          return;
        } else {
          const uniqueNames = Array.from(new Set(statuses.map(s => s.name)));
          const foundInStatus = uniqueNames.find(n => getShortHash(n) === hash);
          if (foundInStatus) {
            setSelectedStudent(foundInStatus);
            setSelectedDate(undefined);
            return;
          }
        }
      }
    }
    
    // Default /writing
    setSelectedDate(new Date());
    setSelectedStudent(null);
  }, [location.pathname, students, statuses]);

  const handleClearMonth = async () => {
    if (clearType === 'period') {
      if (!clearStartDate || !clearEndDate) {
        toast.error('시작일과 종료일을 입력해 주세요.');
        return;
      }
      if (clearStartDate > clearEndDate) {
        toast.error('시작일은 종료일보다 이전이어야 합니다.');
        return;
      }
    }

    setClearing(true);
    try {
      if (clearType === 'period') {
        await writingStatusApi.clear(clearStartDate, clearEndDate);
        toast.success(`${clearStartDate} ~ ${clearEndDate} 기간의 데이터가 삭제되었습니다.`);
      } else {
        await writingStatusApi.clear();
        toast.success(MESSAGES.writing.clearMonthlySuccess);
      }
      setClearDialogOpen(false);
      fetchWritingStatus();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setClearing(false);
    }
  };

  const handleStatusUpdate = async (status: WritingStatus) => {
    if (!editValues) return;
    const key = `${status.name}-${status.bookTitle}-${status.date}`;
    setUpdatingStatus(key);
    try {
      await writingStatusApi.update({ 
        name: status.name, 
        bookTitle: editValues.bookTitle,
        progress: editValues.progress,
        date: editValues.date,
        originalDate: status.date,
        originalBookTitle: status.bookTitle
      });
      toast.success(MESSAGES.writing.updateSuccess);
      setEditingKey(null);
      fetchWritingStatus();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (loading) return <div className="text-center py-20 text-zinc-400">로딩 중...</div>;

  const filteredStatuses = statuses
    .filter(status => {
      try {
        const statusDate = parseISO(status.date);
        if (selectedStudent) return status.name === selectedStudent;
        if (selectedDate) return isSameDay(statusDate, selectedDate);
        return statusDate.getMonth() === currentMonth.getMonth() && 
               statusDate.getFullYear() === currentMonth.getFullYear();
      } catch {
        return false;
      }
    })
    .sort((a, b) => {
      if (selectedStudent) {
        // Sort by date ascending when a student is selected
        return a.date.localeCompare(b.date);
      }
      if (!selectedStudent && !selectedDate) {
        // 월 전체보기: 날짜 오름차순 정렬, 날짜가 같으면 이름 오름차순
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.name.localeCompare(b.name, 'ko');
      }
      // Default sort by name ascending (e.g. 특정 날짜 선택 시)
      return a.name.localeCompare(b.name, 'ko');
    });

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      navigate(`/writing/date/${format(date, 'yyyy-MM-dd')}`);
    } else {
      navigate('/writing');
    }
  };

  const handleStudentSelect = (name: string | null) => {
    if (name) {
      navigate(`/writing/students/${getShortHash(name)}`);
    } else {
      navigate('/writing');
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const daysInRange = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="w-full lg:w-80 shrink-0 flex flex-col sm:flex-row lg:flex-col gap-4">
        <Card className="rounded-[2rem] border-none ring-0 shadow-sm overflow-hidden bg-white sm:flex-[4] lg:flex-none sm:min-w-[320px] lg:min-w-0 h-fit">
          <CardContent className="p-5" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
            
            {/* Calendar Header */}
            <div className="relative flex items-center justify-center h-10 mb-4 w-full">
              <div className="flex items-center gap-[4px]">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full w-8 h-8 hover:bg-zinc-100 cursor-pointer"
                  onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                >
                  <ChevronLeft className="w-4 h-4 text-zinc-650" />
                </Button>
                <span className="text-[15.5px] font-semibold text-zinc-800 select-none text-center min-w-[90px]">
                  {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full w-8 h-8 hover:bg-zinc-100 cursor-pointer"
                  onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                >
                  <ChevronRight className="w-4 h-4 text-zinc-650" />
                </Button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2 font-normal">
              {['월', '화', '수', '목', '금', '토', '일'].map((dayName, index) => (
                <div 
                  key={dayName} 
                  className={`text-[13px] font-medium py-1 select-none ${
                    index === 6 ? 'text-red-500' : 'text-zinc-650'
                  }`}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {daysInRange.map((day) => {
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isSameDay(day, new Date());
                const isSunday = day.getDay() === 0;

                const isCompleted = isCompletedDay(day);
                const isOngoing = isOngoingDay(day);

                // Determine base text and circle classes
                let circleClass = "w-8 h-8 rounded-full flex items-center justify-center transition-all relative ";
                let textClass = "text-[14px] select-none ";

                if (isSelected) {
                  circleClass += "bg-primary text-white font-bold shadow-sm shadow-primary/25";
                } else if (isCompleted) {
                  circleClass += "bg-blue-100 text-blue-600 font-bold hover:bg-blue-200/70";
                } else if (isOngoing) {
                  circleClass += "bg-amber-100 text-amber-700 font-bold hover:bg-amber-200/70";
                } else {
                  circleClass += isCurrentMonth ? "hover:bg-zinc-100" : "";
                  if (isCurrentMonth) {
                    textClass += (isSunday || isKoreanHoliday(day)) ? "text-red-500" : "text-zinc-850";
                  } else {
                    textClass += "text-zinc-350";
                  }
                }

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => {
                      if (isSelected) {
                        handleDateSelect(undefined);
                      } else {
                        handleDateSelect(day);
                      }
                    }}
                    className={`py-1 flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all select-none relative ${
                      isCurrentMonth ? "" : "opacity-40"
                    }`}
                  >
                    <div className={circleClass}>
                      <span className={textClass}>
                        {format(day, 'd')}
                      </span>
                      {isTodayDate && (
                        <span className={`absolute bottom-[2px] left-0 right-0 h-[2.5px] rounded-full mx-auto w-2.5 ${isSelected ? 'bg-white' : 'bg-primary'}`} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </CardContent>
        </Card>

        <div className="sm:flex-[6] lg:flex-none flex flex-col gap-4 sm:h-[330px] lg:h-auto">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1 h-10 rounded-xl font-semibold text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 border-zinc-200 border-solid flex items-center justify-center transition-all bg-white gap-2"
              onClick={() => {
                const targetDate = selectedDate || currentMonth || new Date();
                navigate(`/writing/month/${formatMonthValue(targetDate)}`);
              }}
              title={`${format(currentMonth, 'M월')} 전체 보기`}
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl font-semibold text-xs text-muted-foreground hover:text-rose-600 hover:bg-rose-50 border-zinc-200 border-solid flex items-center justify-center transition-all cursor-pointer"
              disabled={clearing}
              onClick={() => {
                setClearType('period');
                setClearDialogOpen(true);
              }}
              title="글쓰기 데이터 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="bg-[#FFFFFF] rounded-[2rem] border-none ring-0 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="px-5 py-3 border-b border-border/50 bg-white">
              <h3 className="text-[13px] font-normal text-zinc-600 uppercase tracking-widest mt-1 ml-1">학생별 보기</h3>
            </div>
            <div className="p-2.5 flex-1 overflow-y-auto custom-scrollbar max-h-[200px] sm:max-h-none lg:max-h-[300px]">
              <div className="grid grid-cols-3 gap-1.5 pb-2">
                <Button
                  variant="ghost"
                  className={`h-9 rounded-xl text-sm font-normal justify-center px-3 ${!selectedStudent && selectedDate ? 'bg-blue-200/20 text-primary font-medium' : 'text-zinc-500'}`}
                  onClick={() => handleStudentSelect(null)}
                >
                  전체
                </Button>
                {(Array.from(new Set(statuses.map(s => s.name))) as string[]).sort().map(name => (
                  <Button
                    key={name}
                    variant="ghost"
                    className={`h-9 rounded-xl text-sm font-normal justify-center px-3 truncate ${selectedStudent === name ? 'bg-blue-200/20 text-primary font-medium' : 'text-zinc-500'}`}
                    onClick={() => handleStudentSelect(name)}
                  >
                    {name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-[#FFFFFF] rounded-[2.5rem] border-none ring-0 shadow-sm overflow-hidden mb-2">
          <div className="px-8 pt-6 pb-2 border-b border-border/50 bg-white flex items-center justify-between" style={{ paddingBottom: '8px' }}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FFFFFF] rounded-xl shadow-sm">
                <BookText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedStudent ? `${selectedStudent} 학생 글쓰기 기록` : 
                   selectedDate ? format(selectedDate, 'yyyy년 MM월 dd일', { locale: ko }) : 
                   `${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월 글쓰기 기록`}
                </h2>
                <p className="text-[13px] font-medium text-zinc-500">총 {filteredStatuses.length}건의 기록</p>
              </div>
            </div>

            <Button
              size="icon"
              variant="outline"
              className="h-10 w-10 rounded-full text-foreground border-zinc-200/80 bg-white/50 hover:bg-white/80 shadow-sm transition-all"
              onClick={handleOpenAddDialog}
              title="글쓰기 기록 추가"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="bg-zinc-50/70">
                <tr className="bg-zinc-50/70 border-b border-solid border-zinc-100">
                  <th className="w-[13%] px-6 py-4 text-[14px] font-semibold text-zinc-600 uppercase tracking-widest text-center">날짜</th>
                  <th className="w-[13%] px-5 py-4 text-[14px] font-semibold text-zinc-600 uppercase tracking-widest">학생명</th>
                  <th className="w-[48%] px-6 py-4 text-[14px] font-semibold text-zinc-600 uppercase tracking-widest">도서명</th>
                  <th className="w-[13%] px-6 py-4 text-[14px] font-semibold text-zinc-600 uppercase tracking-widest text-center">상태</th>
                  <th className="w-[13%] px-6 py-4 text-[14px] font-semibold text-zinc-600 uppercase tracking-widest text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredStatuses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <CalendarIcon className="w-10 h-10 opacity-20" />
                        <p className="text-[16px] font-medium text-zinc-500">해당 기간의 기록이 없습니다.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStatuses.map((status, idx) => {
                    const key = `${status.name}-${status.bookTitle}-${status.date}`;
                    const isEditing = editingKey === key;
                    return (
                      <tr key={`${status.name}-${idx}`} className="hover:bg-secondary/5 transition-colors group">
                        <td className="px-6 py-2.5 whitespace-nowrap text-center">
                          {isEditing ? (
                            <input 
                              type="date"
                              className="w-full text-[13px] md:text-[15px] bg-white border border-border/50 rounded px-1 py-0.5 outline-none focus:ring-1 ring-primary/20 text-center cursor-pointer h-7"
                              value={editValues?.date || ''}
                              onChange={(e) => setEditValues(prev => prev ? { ...prev, date: e.target.value } : null)}
                              onClick={(e) => {
                                try { e.currentTarget.showPicker(); } catch {}
                              }}
                            />
                          ) : (
                            <span className="text-[13px] md:text-[15px] font-normal text-muted-foreground">{format(parseISO(status.date), 'MM.dd')}</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 whitespace-nowrap"><span className="text-[13px] md:text-[15px] font-normal text-foreground">{status.name}</span></td>
                        <td className="px-6 py-2.5">
                          {isEditing ? (
                            <input 
                              className="w-full text-[13px] md:text-[15px] bg-white border border-border/50 rounded px-2 py-0.5 outline-none focus:ring-1 ring-primary/20"
                              value={editValues?.bookTitle}
                              onChange={(e) => setEditValues(prev => prev ? { ...prev, bookTitle: e.target.value } : null)}
                            />
                          ) : (
                            <span className="text-[13px] md:text-[15px] font-normal text-foreground line-clamp-1" title={status.bookTitle}>{status.bookTitle}</span>
                          )}
                        </td>
                        <td className="px-6 py-2.5 whitespace-nowrap">
                          <div className="flex justify-center">
                            {isEditing ? (
                              <select
                                className="text-[13px] md:text-[15px] font-normal bg-white border border-border/50 rounded px-1 py-0.5 outline-none focus:ring-1 ring-primary/20"
                                value={editValues?.progress}
                                onChange={(e) => setEditValues(prev => prev ? { ...prev, progress: e.target.value } : null)}
                              >
                              {['진행', '완료'].map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            ) : (
                              <Badge className={`rounded-lg font-normal text-xs sm:text-sm px-1.5 lg:px-2 ${
                                ((status.progress as string) === '완료' || (status.progress as string) === '완성') ? getTagColor('파란색') :
                                status.progress === '진행' ? getTagColor('노란색') :
                                getTagColor('기본')
                              }`}>
                                {((status.progress as string) === '완료' || (status.progress as string) === '완성') ? '완료' : status.progress}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-2.5 whitespace-nowrap">
                          <div className="flex justify-center gap-1.5">
                            {isEditing ? (
                              <>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => handleStatusUpdate(status)} disabled={updatingStatus === key}><Save className="w-4 h-4" /></Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-secondary" onClick={() => setEditingKey(null)}><X className="w-4 h-4" /></Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  size="icon"
                                  variant="ghost" 
                                  className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                                  onClick={() => { setEditingKey(key); setEditValues({ date: status.date, bookTitle: status.bookTitle, progress: status.progress }); }}
                                  title="수정"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                  onClick={() => setDeletingItem(status)}
                                  title="삭제"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-border/30">
            {filteredStatuses.length === 0 ? (
              <div className="px-8 py-20 text-center">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <CalendarIcon className="w-10 h-10 opacity-20" />
                  <p className="text-[18px] font-medium text-zinc-500">해당 기간의 기록이 없습니다.</p>
                </div>
              </div>
            ) : (
              filteredStatuses.map((status, idx) => {
                const key = `${status.name}-${status.bookTitle}-${status.date}`;
                const isEditing = editingKey === key;
                return (
                  <div key={`${status.name}-${idx}`} className="p-6 space-y-4 hover:bg-secondary/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <input 
                            type="date"
                            className="text-xs bg-white border border-border/50 rounded px-2 py-1 outline-none focus:ring-1 ring-primary/20 cursor-pointer h-7"
                            value={editValues?.date || ''}
                            onChange={(e) => setEditValues(prev => prev ? { ...prev, date: e.target.value } : null)}
                            onClick={(e) => {
                              try { e.currentTarget.showPicker(); } catch {}
                            }}
                          />
                        ) : (
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">{format(parseISO(status.date), 'M월 d일')}</span>
                        )}
                        <span className="text-sm font-normal text-foreground whitespace-nowrap shrink-0">{status.name}</span>
                        {!isEditing && (
                          <Badge className={`rounded-lg font-normal text-[11px] px-1.5 py-0.5 ${
                            ((status.progress as string) === '완료' || (status.progress as string) === '완성') ? getTagColor('파란색') :
                            status.progress === '진행' ? getTagColor('노란색') :
                            getTagColor('기본')
                          }`}>
                            {((status.progress as string) === '완료' || (status.progress as string) === '완성') ? '완료' : status.progress}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => handleStatusUpdate(status)} disabled={updatingStatus === key}><Save className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-secondary" onClick={() => setEditingKey(null)}><X className="w-4 h-4" /></Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg" 
                              onClick={() => { setEditingKey(key); setEditValues({ date: status.date, bookTitle: status.bookTitle, progress: status.progress }); }}
                              title="수정"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                              onClick={() => setDeletingItem(status)}
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {isEditing ? (
                        <div className="space-y-3">
                          <input className="w-full text-sm bg-white border border-border/50 rounded-xl px-3 py-2 outline-none focus:ring-1 ring-primary/20" value={editValues?.bookTitle} onChange={(e) => setEditValues(prev => prev ? { ...prev, bookTitle: e.target.value } : null)} placeholder="도서명" />
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">상태 변경</span>
                            <select className="text-xs font-normal bg-white border border-border/50 rounded-lg px-2 py-1 outline-none focus:ring-1 ring-primary/20" value={editValues?.progress} onChange={(e) => setEditValues(prev => prev ? { ...prev, progress: e.target.value } : null)}>
                              {['진행', '완료'].map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[15px] font-normal text-foreground leading-tight">{status.bookTitle}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Adding Dialog */}
      <AddWritingDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        students={sortedStudents}
        addForm={addForm}
        setAddForm={setAddForm}
        onConfirm={handleAddStatus}
        isSubmitting={submittingAdd}
      />

      {/* Deleting Dialog */}
      <DeleteWritingDialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        deletingItem={deletingItem}
        onConfirm={() => deletingItem && handleDeleteStatus(deletingItem)}
        isSubmitting={isDeleting}
      />

      {/* Clear Dialog */}
      <ClearWritingDialog
        open={clearDialogOpen}
        onOpenChange={setClearDialogOpen}
        clearType={clearType}
        setClearType={setClearType}
        clearStartDate={clearStartDate}
        setClearStartDate={setClearStartDate}
        clearEndDate={clearEndDate}
        setClearEndDate={setClearEndDate}
        onConfirm={handleClearMonth}
        isSubmitting={clearing}
      />
    </div>
  );
}
