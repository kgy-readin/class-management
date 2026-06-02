import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import StudentLogCharts from './StudentLogCharts';
import { 
  StudentLogEntry, 
  LOG_CATEGORY_COLORS, 
  getTagColor, 
  Student 
} from '../../types';
import { studentLogApi } from '@/src/services/api';
import { toast } from 'sonner';
import { 
  CalendarDays, 
  User, 
  Trash2, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp, 
  PieChart as PieIcon, 
  X,
  FileText,
  UsersRound,
  Pencil
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  parseISO 
} from 'date-fns';
import { ko } from 'date-fns/locale';

interface StudentLogProps {
  students: Student[];
}

const CATEGORIES = [
  '지도방향', '특이사항', '성장긍정',
  '쓰기부진', '읽기부진', '학업부진',
  '문제행동', '가정소통', '운영방침'
];

const CAT_HEX_COLORS: Record<string, string> = {
  '특이사항': 'rgba(161, 161, 170, 0.9)',   // zinc-400/90
  '지도방향': 'rgba(161, 161, 170, 0.9)',   // zinc-400/90
  '성장긍정': 'rgba(16, 185, 129, 0.9)',    // emerald-500/90
  '쓰기부진': 'rgba(251, 191, 36, 0.9)',    // amber-400/90
  '읽기부진': 'rgba(251, 191, 36, 0.9)',    // same as amber-400/90
  '학업부진': 'rgba(249, 115, 22, 0.9)',     // orange-500/90
  '문제행동': 'rgba(239, 68, 68, 0.9)',     // red-500/90
  '가정소통': 'rgba(59, 130, 246, 0.9)',    // blue-500/90
  '운영방침': 'rgba(139, 92, 246, 0.9)'     // violet-500/90
};

const getCategoryTagStyle = (category: string): string => {
  const colorName = LOG_CATEGORY_COLORS[category] || '기본';
  return getTagColor(colorName);
};

// 2026 Korean legal holidays hardcoded/statically precalculated
const isKoreanHoliday = (date: Date): boolean => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  if (month === 1 && day === 1) return true; // 새해 첫날
  if (month === 2 && (day === 16 || day === 17 || day === 18)) return true; // 설날 연휴
  if (month === 3 && (day === 1 || day === 2)) return true; // 삼일절, 대체공휴일
  if (month === 5 && (day === 1 || day === 5 || day === 24 || day === 25)) return true; // 근로자의 날, 어린이날, 부처님오신날, 대체공휴일
  if (month === 6 && (day === 3 || day === 6)) return true; // 지방선거, 현충일
  if (month === 7 && day === 17) return true; // 제헌절
  if (month === 8 && (day === 15 || day === 17)) return true; // 광복절, 대체공휴일
  if (month === 9 && (day === 24 || day === 25 || day === 26)) return true; // 추석 연휴
  if (month === 10 && (day === 3 || day === 5 || day === 9)) return true; // 개천절, 대체공휴일, 한글날
  if (month === 12 && day === 25) return true; // 성탄절
  
  return false;
};

export default function StudentLog({ students = [] }: StudentLogProps) {
  const [logs, setLogs] = useState<StudentLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'monthly' | 'student'>('monthly');
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Add Log Dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    date: '',
    name: '',
    category: '특이사항',
    content: ''
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Delete Confirm Dialog
  const [deletingItem, setDeletingItem] = useState<StudentLogEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Responsive / Mobile state
  const [isMobile, setIsMobile] = useState(false);

  // Edit Log State
  const [editingLog, setEditingLog] = useState<StudentLogEntry | null>(null);
  const [editForm, setEditForm] = useState<{ date: string; category: string; content: string } | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  const sortedStudents = [...students].sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  useEffect(() => {
    const handleResize = () => {
      const mobileStatus = window.innerWidth < 768;
      setIsMobile(mobileStatus);
      if (mobileStatus) {
        setViewMode('student');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync default student when list loaded
  useEffect(() => {
    if (sortedStudents.length > 0 && !selectedStudent) {
      setSelectedStudent(sortedStudents[0].name);
    }
  }, [sortedStudents, selectedStudent]);

  const fetchLogs = async () => {
    try {
      const data = await studentLogApi.get();
      setLogs(data);
    } catch (error: any) {
      toast.error('로그 데이터를 불러오는데 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleOpenAddDialog = (initialDate?: Date) => {
    setAddForm({
      date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      name: selectedStudent || (sortedStudents[0]?.name || ''),
      category: '특이사항',
      content: ''
    });
    setAddOpen(true);
  };

  const handleAddLog = async () => {
    if (!addForm.name) {
      toast.error('학생을 선택해 주세요.');
      return;
    }
    if (!addForm.category) {
      toast.error('카테고리를 선택해 주세요.');
      return;
    }
    if (!addForm.content.trim()) {
      toast.error('내용을 입력해 주세요.');
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
      toast.success('기록이 성공적으로 추가되었습니다.');
      setAddOpen(false);
      fetchLogs();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleDeleteLog = async (item: StudentLogEntry) => {
    setIsDeleting(true);
    try {
      await studentLogApi.remove(item);
      toast.success('기록이 삭제되었습니다.');
      setDeletingItem(null);
      fetchLogs();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateLog = async () => {
    if (!editingLog || !editForm) return;
    if (!editForm.content.trim()) {
      toast.error('내용을 입력해 주세요.');
      return;
    }
    
    setSubmittingEdit(true);
    try {
      await studentLogApi.update(editingLog, {
        date: editForm.date,
        name: editingLog.name,
        category: editForm.category,
        content: editForm.content.trim()
      });
      toast.success('기록이 성공적으로 수정되었습니다.');
      setEditingLog(null);
      setEditForm(null);
      fetchLogs();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  if (loading) {
    return <div className="text-center py-24 text-zinc-400 font-medium">로딩 중...</div>;
  }

  // --- Process data for MONTHLY VIEW ---
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const daysInRange = eachDayOfInterval({ start: startDate, end: endDate });

  // --- Process data for STUDENT VIEW ---
  const currentStudentLogs = logs.filter(log => log.name === selectedStudent);
  
  // Sort student logs by Date descending for list display
  const studentLogsSorted = [...currentStudentLogs].sort((a, b) => b.date.localeCompare(a.date));
  
  // Total pages
  const totalPages = Math.ceil(studentLogsSorted.length / itemsPerPage) || 1;
  const pageLogs = studentLogsSorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Recharts: Category counts
  const categoryCounts: Record<string, number> = {};
  currentStudentLogs.forEach(log => {
    categoryCounts[log.category] = (categoryCounts[log.category] || 0) + 1;
  });
  const pieData = Object.keys(categoryCounts).map(cat => ({
    name: cat,
    value: categoryCounts[cat]
  }));

  // Recharts: Trend data only for months with records, sorted chronologically
  const trendData: { name: string; '기록 수': number }[] = [];
  const monthGroups: Record<string, { label: string; count: number }> = {};
  
  currentStudentLogs.forEach(log => {
    try {
      const logDate = parseISO(log.date);
      const key = format(logDate, 'yyyy-MM');
      const label = format(logDate, 'M월');
      if (!monthGroups[key]) {
        monthGroups[key] = { label, count: 0 };
      }
      monthGroups[key].count += 1;
    } catch {
      // Ignore
    }
  });

  const sortedMonthKeys = Object.keys(monthGroups).sort();
  sortedMonthKeys.forEach(key => {
    trendData.push({
      name: monthGroups[key].label,
      '기록 수': monthGroups[key].count
    });
  });

  // Page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-6">

      {/* --- MONTHLY VIEW --- */}
      {viewMode === 'monthly' && !isMobile && (
        <Card className="rounded-[2.5rem] border-none ring-0 shadow-sm overflow-hidden bg-white">
          <CardContent className="p-8" style={{ paddingTop: '8px' }}>
            
            {/* Header with calendar controls */}
            <div className="relative flex items-center justify-center" style={{ height: '40px', marginBottom: '16px' }}>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full w-9 h-9 border-none bg-transparent hover:bg-zinc-100 shadow-none text-zinc-650"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="w-4.5 h-4.5" />
                </Button>
                <span className="text-[19px] font-semibold text-zinc-800 tracking-tight select-none px-2 min-w-[120px] text-center">
                  {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full w-9 h-9 border-none bg-transparent hover:bg-zinc-100 shadow-none text-zinc-650"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="w-4.5 h-4.5" />
                </Button>
              </div>

              <div className="absolute right-0">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 rounded-full text-foreground border border-solid border-zinc-100 bg-white/50 hover:bg-white/80 shadow-sm transition-all"
                  onClick={() => {
                    setViewMode('student');
                    setCurrentPage(1);
                  }}
                  title="학생뷰로 보기"
                >
                  <User className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-2 mb-2 text-center">
              {['월', '화', '수', '목', '금', '토', '일'].map((dayName, index) => (
                <div 
                  key={dayName} 
                  className={`text-[14px] font-medium py-1.5 select-none ${
                    index === 6 ? 'text-red-500' : 'text-zinc-800'
                  }`}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Monthly Grid */}
            <div className="grid grid-cols-7 gap-2">
              {daysInRange.map((day) => {
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayLogs = logs.filter(log => String(log.date).split('T')[0] === dateStr);
                const isSunday = day.getDay() === 0;
                
                // Show up to 4 tags directly (2 columns x 2 rows)
                const maxVisibleTags = 4;
                const visibleLogs = dayLogs.length > maxVisibleTags ? dayLogs.slice(dayLogs.length - maxVisibleTags) : dayLogs;
                const extraLogsCount = dayLogs.length > maxVisibleTags ? dayLogs.length - maxVisibleTags : 0;

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => handleCellClick(day)}
                    className={`min-h-[120px] border border-solid border-zinc-100 p-3.5 rounded-lg shadow-sm gap-1.5 flex flex-col justify-between cursor-pointer transition-all hover:bg-zinc-50/50 hover:border-zinc-200 select-none relative ${
                      isSameDay(day, new Date())
                        ? 'bg-blue-50/70'
                        : isCurrentMonth ? 'bg-white' : 'bg-zinc-50/30 opacity-40'
                    }`}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[14px] font-medium leading-none ${
                        isSameDay(day, new Date()) 
                          ? 'text-blue-500 font-semibold' 
                          : (isSunday || isKoreanHoliday(day)) ? 'text-red-500' : 'text-zinc-800'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      
                      {extraLogsCount > 0 && (
                        <span className="text-[10px] font-extrabold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-full">
                          +{extraLogsCount}
                        </span>
                      )}
                    </div>

                    {/* Tags matching logs under the day */}
                    <div className="flex-1 mt-3 grid grid-cols-1 lg:grid-cols-2 grid-rows-2 gap-[3px] content-end items-end" style={{ minHeight: '44px', width: '100%' }}>
                      {visibleLogs.map((log, lIdx) => {
                        const tagStyle = getCategoryTagStyle(log.category);
                        // Under 'lg' width, 1 column. 
                        // If there are 2 logs: lIdx 0 is on row 2, lIdx 1 is on row 1.
                        // On 'lg' width and up, 2 columns.
                        const colClass = lIdx % 2 === 0 ? 'lg:col-start-1 col-start-1' : 'lg:col-start-2 col-start-1';
                        const rowClass = lIdx < 2 
                          ? (lIdx === 0 ? 'row-start-2 lg:row-start-2' : 'row-start-1 lg:row-start-2') 
                          : 'lg:row-start-1';
                        
                        return (
                          <div 
                            key={`${log.name}-${lIdx}`} 
                            className={`relative group ${lIdx >= 2 ? 'hidden lg:block' : ''} ${colClass} ${rowClass} w-full`}
                          >
                            <div 
                              className={`rounded-lg font-normal py-0.5 truncate text-center block ${tagStyle} w-full`}
                              style={{ fontSize: '11.5px', minWidth: '0' }}
                            >
                              {log.name}
                            </div>

                            {/* Custom Hover Popup (Simple/Clean White card with rounded-[20px] border-radius, clean normal leading to prevent squishing) */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 bg-white border border-solid border-zinc-100 p-3.5 rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:pointer-events-none w-[300px] pointer-events-none transition-all duration-200">
                              <div className="whitespace-normal text-left">
                                <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                                  <span className="text-[13px] font-medium text-zinc-800 leading-normal">{log.name}</span>
                                  <span className="text-[10px] font-medium text-zinc-500 bg-zinc-50 border border-solid border-zinc-200/60 px-1.5 py-0.5 rounded-full leading-normal select-none">
                                    {log.category}
                                  </span>
                                </div>
                                <div className="text-[12px] text-zinc-700 font-normal leading-normal select-none">
                                  {log.content}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* --- STUDENT VIEW --- */}
      {viewMode === 'student' && (
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Left Column: Selector & Analytics Charts (Hidden totally on Mobile except for top selector) */}
          <div className="w-full lg:w-[26%] xl:w-[28%] shrink-0 flex flex-col gap-4">
            
            {/* Student Selector Card */}
            <Card className="rounded-[2rem] border-none ring-0 shadow-sm bg-white overflow-hidden" style={{ height: '80px', paddingTop: '0px', paddingBottom: '0px' }}>
              <CardContent className="p-5 flex items-center justify-between gap-4" style={{ paddingTop: '10px', paddingBottom: '10px', paddingRight: '20px', paddingLeft: '20px', height: '80px' }}>
                <div className="flex items-center gap-2">
                  <UsersRound className="w-5 h-5 text-zinc-500" />
                  <label className="text-[15px] font-semibold text-zinc-800 tracking-wider shrink-0 select-none">학생 선택</label>
                </div>
                <select
                  value={selectedStudent}
                  onChange={(e) => {
                    setSelectedStudent(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-zinc-50 border border-solid border-zinc-100 rounded-xl px-3 py-2 text-[14px] font-semibold focus:ring-1 focus:ring-primary/20 hover:border-zinc-300 focus:bg-white outline-none transition-all cursor-pointer min-w-[124px]"
                  style={{ width: '180px', height: '44px', paddingTop: '8px', fontSize: isMobile ? '15px' : '16px', fontWeight: '600' }}
                >
                  {sortedStudents.map(std => (
                    <option key={std.name} value={std.name}>{std.name}</option>
                  ))}
                </select>
              </CardContent>
            </Card>

            {/* Charts: Hidden on mobile and tablet portrait, shown on tablet landscape/desktop */}
            {selectedStudent && (
              <StudentLogCharts 
                pieData={pieData} 
                trendData={trendData} 
                CAT_HEX_COLORS={CAT_HEX_COLORS} 
              />
            )}
          </div>
 
          {/* Right Column: Recent Records Table */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden" style={{ minHeight: '350px', paddingBottom: '12px' }}>
              
              {/* Header with Title and Control Buttons */}
              <div className="px-8 py-3 border-b border-solid border-zinc-100 flex items-center justify-between" style={{ height: '76px', borderColor: '#f4f4f5' }}>
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-[17px] md:text-lg font-semibold text-zinc-800 tracking-tight">
                      최근 기록
                    </h2>
                  </div>
                </div>
 
                {/* Buttons (Desktop layout vs Mobile) */}
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-10 w-10 rounded-full text-foreground border border-solid border-zinc-100 bg-white/50 hover:bg-white/80 shadow-sm transition-all"
                    onClick={() => handleOpenAddDialog()}
                    title="추가"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>

                  {!isMobile && (
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-10 w-10 rounded-full text-foreground border border-solid border-zinc-100 bg-white/50 hover:bg-white/80 shadow-sm transition-all"
                      onClick={() => setViewMode('monthly')}
                      title="먼슬리뷰 보기"
                    >
                      <CalendarDays className="w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Records List/Table */}
              {/* Desktop version: Hidden on mobile */}
              <div className="hidden md:block overflow-x-auto min-h-[350px] m-0 p-0" style={{ paddingTop: '0px', marginLeft: '0px', marginRight: '0px', marginTop: '0px' }}>
                <table className="w-full text-left border-collapse table-fixed m-0 p-0" style={{ marginTop: '0px', paddingTop: '0px' }}>
                  <thead className="bg-zinc-50/70">
                    <tr className="bg-zinc-50/70 border-b border-solid border-zinc-100">
                      <th className="w-[10%] px-4 py-3 text-[14px] font-semibold text-zinc-650 uppercase tracking-wider text-center align-middle">날짜</th>
                      <th className="w-[13%] px-4 py-3 text-[14px] font-semibold text-zinc-650 uppercase tracking-wider text-center align-middle">태그</th>
                      <th className="w-[62%] px-4 py-3 text-[14px] font-semibold text-zinc-650 uppercase tracking-wider text-center align-middle">내용</th>
                      <th className="w-[15%] px-4 py-3 text-[14px] font-semibold text-zinc-650 uppercase tracking-wider text-center align-middle">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-solid divide-zinc-100 bg-white">
                    {pageLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-2 text-zinc-500">
                            <CalendarDays className="w-10 h-10 opacity-20" />
                            <p className="text-[16px] font-medium">기록된 내용이 없습니다.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      pageLogs.map((log, idx) => {
                        const isEditing = editingLog === log;
                        const colorName = LOG_CATEGORY_COLORS[log.category] || '기본';
                        const badgeStyle = getTagColor(colorName);
                        
                        let dateFormatted = '';
                        try {
                          dateFormatted = format(parseISO(log.date), 'MM.dd');
                        } catch {
                          dateFormatted = log.date;
                        }

                        if (isEditing && editForm) {
                          return (
                            <tr key={`${log.name}-${idx}`} className="bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                              {/* Date Edit */}
                              <td className="px-3 py-2 whitespace-nowrap text-center">
                                <input
                                  type="date"
                                  className="w-full h-8 px-1.5 border border-zinc-200 rounded text-[14px] font-normal text-zinc-800 bg-white focus:border-primary focus:outline-none"
                                  value={editForm.date}
                                  onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                />
                              </td>

                              {/* Category Edit */}
                              <td className="px-3 py-2 whitespace-nowrap text-center">
                                <select
                                  className="w-full h-8 px-1.5 border border-zinc-200 rounded text-[14px] font-normal text-zinc-800 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/25 cursor-pointer"
                                  value={editForm.category}
                                  onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                >
                                  {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              </td>

                              {/* Content Edit */}
                              <td className="px-3 py-2 text-left">
                                <input
                                  type="text"
                                  className="w-full h-8 px-2 border border-zinc-200 rounded text-[14px] font-normal text-zinc-800 bg-white focus:border-primary focus:outline-none"
                                  value={editForm.content}
                                  onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                                />
                              </td>

                              {/* Control Actions during Edit */}
                              <td className="px-3 py-2 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <Button
                                    size="sm"
                                    className="h-8 px-2.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg shadow-sm"
                                    onClick={handleUpdateLog}
                                    disabled={submittingEdit}
                                  >
                                    저장
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2 text-xs text-zinc-500 hover:bg-zinc-100 rounded-lg"
                                    onClick={() => {
                                      setEditingLog(null);
                                      setEditForm(null);
                                    }}
                                  >
                                    취소
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={`${log.name}-${idx}`} className="hover:bg-zinc-50/20 transition-colors group">
                            
                            {/* Date */}
                            <td className="px-4 py-2.5 whitespace-nowrap text-center">
                              <span className="text-[14px] font-normal text-zinc-800">{dateFormatted}</span>
                            </td>

                            {/* Category */}
                            <td className="px-4 py-2.5 whitespace-nowrap text-center">
                              <div className="flex justify-center items-center w-full">
                                <div className={`inline-flex items-center justify-center h-7 px-3 text-[13px] font-semibold rounded-full select-none text-center min-w-[76px] ${getCategoryTagStyle(log.category)}`}>
                                  {log.category}
                                </div>
                              </div>
                            </td>

                            {/* Content */}
                            <td className="px-4 py-2.5 text-left">
                              <span className="text-[14px] font-normal text-zinc-800 line-clamp-1" title={log.content}>
                                {log.content}
                              </span>
                            </td>

                            {/* Control Actions */}
                            <td className="px-4 py-2.5 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-150/50 rounded-lg cursor-pointer"
                                  onClick={() => {
                                    setEditingLog(log);
                                    setEditForm({
                                      date: log.date.split('T')[0],
                                      category: log.category,
                                      content: log.content
                                    });
                                  }}
                                  title="수정"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-zinc-400 hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                                  onClick={() => setDeletingItem(log)}
                                  title="삭제"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile version: Hidden on desktop (Timeline Layout) */}
              <div className="md:hidden divide-y divide-solid divide-zinc-100 bg-white p-5">
                {pageLogs.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-zinc-500">
                      <CalendarDays className="w-8 h-8 opacity-20" />
                      <p className="text-[12px] font-medium text-zinc-500">기록된 내용이 없습니다.</p>
                    </div>
                  </div>
                ) : (
                  pageLogs.map((log, idx) => {
                    const isEditing = editingLog === log;
                    const badgeStyle = getCategoryTagStyle(log.category);
                    
                    let dateFormatted = '';
                    try {
                      dateFormatted = format(parseISO(log.date), 'M월 d일');
                    } catch {
                      dateFormatted = log.date;
                    }

                    return (
                      <div key={`${log.name}-${idx}`} className="py-4 flex flex-col gap-2 relative last:pb-0 first:pt-0">
                        {/* Card Content container */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isEditing && editForm ? (
                                <input
                                  type="date"
                                  className="text-[13px] h-7 bg-white border border-zinc-200 rounded px-1.5 py-0.5 outline-none focus:ring-1 ring-primary/20"
                                  value={editForm.date}
                                  onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                                />
                              ) : (
                                <span className="text-[13px] font-medium text-zinc-800">{dateFormatted}</span>
                              )}
                              
                              {isEditing && editForm ? (
                                <select
                                  className="text-[13px] h-7 bg-white border border-zinc-200 rounded px-1.5 py-0.5 outline-none focus:ring-1 ring-primary/20"
                                  value={editForm.category}
                                  onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                                >
                                  {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className={`inline-flex items-center justify-center h-5 px-2.5 rounded-full text-[11.5px] font-semibold select-none text-center ${badgeStyle}`}>
                                  {log.category}
                                </span>
                              )}
                            </div>

                            {/* Actions on Mobile */}
                            <div className="flex items-center gap-1 shrink-0">
                              {isEditing ? (
                                <>
                                  <Button 
                                    size="sm" 
                                    className="h-6 px-2.5 text-[12px] bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded shadow-sm cursor-pointer"
                                    onClick={handleUpdateLog}
                                    disabled={submittingEdit}
                                  >
                                    저장
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-6 px-2.5 text-[12px] text-zinc-500 hover:bg-zinc-100 rounded cursor-pointer"
                                    onClick={() => {
                                      setEditingLog(null);
                                      setEditForm(null);
                                    }}
                                  >
                                    취소
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-7 w-7 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg cursor-pointer"
                                    onClick={() => {
                                      setEditingLog(log);
                                      setEditForm({
                                        date: log.date.split('T')[0],
                                        category: log.category,
                                        content: log.content
                                      });
                                    }}
                                    title="수정"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-zinc-400 hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                                    onClick={() => setDeletingItem(log)}
                                    title="삭제"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Content text strictly 13px and beautiful, breaking word wrapping nicely */}
                          <div className="text-[13px] font-medium text-zinc-800 leading-relaxed pr-2">
                            {isEditing && editForm ? (
                              <input
                                type="text"
                                className="w-full h-8 px-2 border border-zinc-200 rounded text-[13px] font-medium text-zinc-800 bg-white focus:border-primary focus:outline-none"
                                value={editForm.content}
                                onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                              />
                            ) : (
                              <p className="whitespace-pre-wrap break-all">{log.content}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Beautiful custom-made Pagination bar */}
              {totalPages > 1 && (
                <div className="px-8 py-5 border-t border-zinc-100 bg-white flex items-center justify-center gap-1.5 select-none">
                  
                  {/* Prev page */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg cursor-pointer text-zinc-500"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {/* Interconnected page numbers */}
                  {getPageNumbers().map((pageNum, idx) => {
                    const isEllipsis = pageNum === '...';
                    const isActive = pageNum === currentPage;
                    return isEllipsis ? (
                      <span key={`ell-${idx}`} className="w-8 text-center text-zinc-400 text-xs font-bold leading-8 select-none">
                        ...
                      </span>
                    ) : (
                      <button
                        key={`page-${pageNum}`}
                        type="button"
                        onClick={() => handlePageChange(pageNum as number)}
                        className={`h-8 min-w-[32px] px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-primary text-white font-extrabold shadow-sm shadow-primary/20'
                            : 'text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {/* Next page */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg cursor-pointer text-zinc-500"
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-500">날짜</label>
                  <input
                    type="date"
                    className="w-full bg-zinc-50 border border-solid border-zinc-100 rounded-xl px-3 py-2.5 text-[14px] font-medium focus:ring-1 focus:ring-primary/20 hover:border-zinc-300 focus:bg-white outline-none transition-all cursor-pointer"
                    value={addForm.date}
                    onChange={e => setAddForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-500">학생명</label>
                  <select
                    className="w-full bg-zinc-50 border border-solid border-zinc-100 rounded-xl px-3 py-2.5 text-[14px] font-medium focus:ring-1 focus:ring-primary/20 hover:border-zinc-300 focus:bg-white outline-none transition-all cursor-pointer"
                    value={addForm.name}
                    onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                  >
                    <option value="" disabled>학생 선택</option>
                    {sortedStudents.map(std => (
                      <option key={std.name} value={std.name}>{std.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category selector in 3x3 Button Grid (3열 3행 배치) */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-500 block">카테고리</label>
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
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-500 block">내용</label>
                <textarea
                  rows={4}
                  placeholder="대화 내용, 과제 상태, 피드백 등 내용을 적어주세요."
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

      {/* --- CONFIRM DELETE DIALOG --- */}
      <Dialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <DialogContent className="sm:max-w-[360px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-250">
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8 text-destructive" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-[17px] font-black text-foreground">교무수첩 기록 삭제</h3>
              <p className="text-sm text-zinc-500 font-semibold leading-relaxed">
                <span className="text-destructive font-extrabold">'{deletingItem?.name}'</span> 학생의 <br />
                <span className="font-extrabold text-zinc-700">'{deletingItem?.category}'</span> 기록을 삭제하시겠습니까?
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button 
                type="button"
                variant="secondary" 
                className="flex-1 h-11 rounded-xl font-extrabold cursor-pointer"
                onClick={() => setDeletingItem(null)}
              >
                취소
              </Button>
              <Button 
                type="button"
                variant="destructive"
                className="flex-1 h-11 rounded-xl font-extrabold shadow-lg shadow-destructive/20 cursor-pointer"
                onClick={() => deletingItem && handleDeleteLog(deletingItem)}
                disabled={isDeleting}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
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
