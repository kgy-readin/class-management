import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeleteLogDialog } from './LogPopups';
import StudentCombobox from '../common/StudentCombobox';
import { renderBoldBrackets } from '../common/TextHelpers';
import { 
  StudentLogEntry, 
  LOG_CATEGORY_COLORS, 
  getTagColor, 
  Student 
} from '../../types';
import { studentLogApi } from '@/src/services/api';
import { toast } from 'sonner';
import { MESSAGES } from '@/src/constants/messages';
import { 
  CalendarDays, 
  Trash2, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  CalendarCheck,
  Calendar,
  Pencil,
  Save,
  X
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
import { isKoreanHoliday } from './holidayUtils';

interface StudentLogMonthlyDetailProps {
  logs: StudentLogEntry[];
  fetchLogs: () => Promise<void>;
  currentMonth: Date;
  setCurrentMonth: (date: Date | ((prev: Date) => Date)) => void;
  setViewMode: (mode: 'monthly' | 'student' | 'monthly-detail') => void;
  handleOpenAddDialog: (initialDate?: Date) => void;
  sortedStudents: Student[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
}

const CATEGORIES = [
  '지도방향', '특이사항', '성장긍정',
  '쓰기부진', '읽기부진', '학업부진',
  '문제행동', '가정소통', '운영방침'
];

const CAT_HEX_COLORS: Record<string, string> = {
  '특이사항': 'rgba(161, 161, 170, 0.7)',   // zinc-400
  '지도방향': 'rgba(161, 161, 170, 0.7)',   // zinc-400
  '성장긍정': 'rgba(16, 185, 129, 0.9)',    // emerald-500
  '쓰기부진': 'rgba(251, 191, 36, 0.9)',    // amber-400
  '읽기부진': 'rgba(251, 191, 36, 0.9)',    // same as amber-400
  '학업부진': 'rgba(249, 115, 22, 0.9)',     // orange-500
  '문제행동': 'rgba(239, 68, 68, 0.9)',     // red-500
  '가정소통': 'rgba(59, 130, 246, 0.9)',    // blue-500
  '운영방침': 'rgba(139, 92, 246, 0.9)'     // violet-500
};

const getCategoryTagStyle = (category: string): string => {
  const colorName = LOG_CATEGORY_COLORS[category] || '기본';
  return getTagColor(colorName);
};

export default function StudentLogMonthlyDetail({
  logs,
  fetchLogs,
  currentMonth,
  setCurrentMonth,
  setViewMode,
  handleOpenAddDialog,
  sortedStudents,
  selectedDate,
  setSelectedDate,
}: StudentLogMonthlyDetailProps) {
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Edit Log State
  const [editingLog, setEditingLog] = useState<StudentLogEntry | null>(null);
  const [editForm, setEditForm] = useState<{ date: string; category: string; content: string; name: string } | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete Confirm Dialog
  const [deletingItem, setDeletingItem] = useState<StudentLogEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Month navigation calculation
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const daysInRange = eachDayOfInterval({ start: startDate, end: endDate });

  // Get logs for the clicked date
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const selectedDateLogs = logs.filter(log => String(log.date).split('T')[0] === selectedDateStr);

  // Pagination calculation
  const totalPages = Math.ceil(selectedDateLogs.length / itemsPerPage) || 1;
  const pageLogs = selectedDateLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleDeleteLog = async (item: StudentLogEntry) => {
    setIsDeleting(true);
    try {
      await studentLogApi.remove(item);
      toast.success(MESSAGES.studentLog.deleteSuccess);
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
      toast.error(MESSAGES.studentLog.enterContent);
      return;
    }
    if (!editForm.name) {
      toast.error(MESSAGES.studentLog.selectStudent);
      return;
    }

    setSubmittingEdit(true);
    try {
      await studentLogApi.update(editingLog, {
        date: editForm.date,
        name: editForm.name,
        category: editForm.category,
        content: editForm.content.trim()
      });
      toast.success(MESSAGES.studentLog.editSuccess);
      setEditingLog(null);
      setEditForm(null);
      fetchLogs();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

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
    <div className="flex flex-col lg:flex-row gap-6">
      
      {/* Left Column: Mini Calendar (Identical to Mobile Mini Calendar, responsive size) */}
      <div className="w-full lg:w-[26%] xl:w-[28%] lg:min-w-[328px] shrink-0 flex flex-col gap-4">
        <Card className="rounded-[2rem] border-none ring-0 shadow-sm overflow-hidden bg-white">
          <CardContent className="p-5" style={{ paddingTop: '12px', paddingBottom: '8px' }}>
            
            {/* Header */}
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
                <span className="text-[15.5px] font-semibold text-zinc-800 select-none text-center">
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

            {/* Week headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2 font-normal">
              {['월', '화', '수', '목', '금', '토', '일'].map((dayName, index) => (
                <div 
                  key={dayName} 
                  className={`text-[14px] py-1 select-none ${
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
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayLogs = logs.filter(log => String(log.date).split('T')[0] === dateStr);
                
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isTodayDate = isSameDay(day, new Date());
                const isSunday = day.getDay() === 0;

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => {
                      setSelectedDate(day);
                      setCurrentPage(1);
                    }}
                    className={`py-1.5 flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all select-none relative ${
                      isSelected
                        ? 'bg-zinc-100/70 font-bold'
                        : isCurrentMonth
                          ? 'hover:bg-zinc-50'
                          : 'opacity-40'
                    } ${
                      isCurrentMonth
                        ? (isSunday || isKoreanHoliday(day)) ? 'text-red-500' : 'text-zinc-900'
                        : 'text-zinc-350'
                    }`}
                  >
                    <div className="relative flex flex-col items-center h-5 justify-center">
                      <span className="text-[15px] leading-tight select-none">
                        {format(day, 'd')}
                      </span>
                      {isTodayDate && (
                        <span className="absolute bottom-[-2px] left-0 right-0 h-[2.5px] bg-current rounded-full" />
                      )}
                    </div>
                    
                    {/* Faint small dots representing categories below number (max 4) */}
                    <div className="flex gap-[1.5px] justify-center mt-1 h-1.5 w-full overflow-hidden px-1">
                      {dayLogs.slice(0, 4).map((log, idx) => {
                        const color = CAT_HEX_COLORS[log.category] || 'rgba(161, 161, 170, 0.7)';
                        return (
                          <span 
                            key={idx} 
                            className="w-[4.8px] h-[4.8px] rounded-full shrink-0" 
                            style={{ backgroundColor: color }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Right Column: Detailed Records Table for Selected Date */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden" style={{ minHeight: '350px', paddingBottom: '12px' }}>
          
          {/* Header with Title and Control Buttons */}
          <div className="px-8 py-3 border-b border-solid border-zinc-100 flex items-center justify-between" style={{ height: '76px', borderColor: '#f4f4f5' }}>
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-[17px] md:text-lg font-semibold text-zinc-800 tracking-tight">
                  {format(selectedDate, 'M월 d일 교무기록')}
                </h2>
              </div>
            </div>

            {/* Buttons (Desktop layout with view options) */}
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-full text-foreground border border-solid border-zinc-100 bg-white/50 hover:bg-white/80 shadow-sm transition-all cursor-pointer"
                onClick={() => handleOpenAddDialog(selectedDate)}
                title="추가"
              >
                <Plus className="w-5 h-5" />
              </Button>

              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-full text-foreground border border-solid border-zinc-100 bg-white/50 hover:bg-white/80 shadow-sm transition-all cursor-pointer"
                onClick={() => {
                  setViewMode('student');
                }}
                title="학생뷰로 보기"
              >
                <User className="w-5 h-5" />
              </Button>

              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-full text-foreground border border-solid border-zinc-100 bg-white/50 hover:bg-white/80 shadow-sm transition-all cursor-pointer"
                onClick={() => setViewMode('monthly')}
                title="먼슬리뷰 보기"
              >
                <Calendar className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Records List/Table */}
          <div className="overflow-x-auto min-h-[350px] m-0 p-0" style={{ paddingTop: '0px' }}>
            <table className="w-full text-left border-collapse table-fixed m-0 p-0">
              <thead className="bg-zinc-50/70">
                <tr className="bg-zinc-50/70 border-b border-solid border-zinc-100">
                  <th className="w-[12%] px-4 py-3 text-[14px] font-semibold text-zinc-650 uppercase tracking-wider text-center align-middle">이름</th>
                  <th className="w-[13%] px-4 py-3 text-[14px] font-semibold text-zinc-650 uppercase tracking-wider text-center align-middle">태그</th>
                  <th className="w-[60%] px-4 py-3 text-[14px] font-semibold text-zinc-650 uppercase tracking-wider text-center align-middle">내용</th>
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

                    if (isEditing && editForm) {
                      return (
                        <tr key={`${log.name}-${idx}`} className="bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                          {/* Student Name Edit */}
                          <td className="px-3 pt-[12px] pb-[12px] whitespace-nowrap text-center align-top overflow-visible">
                            <StudentCombobox
                              students={sortedStudents}
                              value={editForm.name}
                              onChange={(val) => setEditForm({ ...editForm, name: val })}
                              placeholder="학생 선택"
                              inputClassName="bg-white border-solid border-zinc-200 text-xs !h-8 py-0 px-2 !rounded font-medium w-full"
                            />
                          </td>

                          {/* Category Edit */}
                          <td className="px-3 pt-[12px] pb-[12px] whitespace-nowrap text-center align-top overflow-visible">
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
                          <td className="px-3 pt-[12px] pb-[12px] text-left align-top overflow-visible">
                            <textarea
                              rows={2}
                              ref={(el) => {
                                if (el) {
                                  el.style.height = 'auto';
                                  el.style.height = Math.min(el.scrollHeight, 160) + 'px';
                                }
                              }}
                              className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[14px] font-normal leading-relaxed focus:outline-none focus:border-primary resize-none min-h-[52px] max-h-[160px] overflow-y-auto [field-sizing:content]"
                              value={editForm.content}
                              onChange={e => {
                                setEditForm({ ...editForm, content: e.target.value });
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
                              }}
                            />
                          </td>

                          {/* Actions during Edit */}
                          <td className="px-3 pt-[12px] pb-[12px] whitespace-nowrap text-center align-top overflow-visible">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={submittingEdit}
                                onClick={handleUpdateLog}
                                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                                title="저장"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={submittingEdit}
                                onClick={() => {
                                  setEditingLog(null);
                                  setEditForm(null);
                                }}
                                className="h-7 w-7 text-zinc-400 hover:text-zinc-550 hover:bg-zinc-50 rounded-lg cursor-pointer"
                                title="취소"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={`${log.name}-${idx}`} className="hover:bg-zinc-50/20 transition-colors group">
                        
                        {/* Student Name */}
                        <td className="px-4 pt-[12px] pb-[12px] whitespace-nowrap text-center align-top">
                          <span className="text-[14px] font-semibold text-zinc-800 leading-5">{log.name}</span>
                        </td>

                        {/* Category Tag */}
                        <td className="px-4 pt-[12px] pb-[12px] whitespace-nowrap text-center align-top">
                          <div className="flex justify-center items-center w-full">
                            <div className={`inline-flex items-center justify-center h-[21px] px-2.5 text-[11.5px] font-semibold rounded-full select-none text-center min-w-[72px] ${getCategoryTagStyle(log.category)}`}>
                              {log.category}
                            </div>
                          </div>
                        </td>

                        {/* Content text */}
                        <td className="px-4 pt-[12px] pb-[12px] text-left align-top">
                          <div className="text-[14px] font-normal text-zinc-800 leading-5 whitespace-pre-wrap break-all">
                            {renderBoldBrackets(log.content)}
                          </div>
                        </td>

                        {/* Manage Actions */}
                        <td className="px-4 pt-[12px] pb-[12px] whitespace-nowrap text-center align-top">
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
                                  content: log.content,
                                  name: log.name
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

          {/* Pagination bar */}
          {totalPages > 1 && (
            <div className="px-8 py-5 border-t border-zinc-100 bg-white flex items-center justify-center gap-1.5 select-none">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg cursor-pointer text-zinc-500"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

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

      {/* --- CONFIRM DELETE DIALOG --- */}
      <DeleteLogDialog
        open={!!deletingItem}
        onOpenChange={(open) => !open && setDeletingItem(null)}
        deletingItem={deletingItem}
        onConfirm={() => deletingItem && handleDeleteLog(deletingItem)}
        isSubmitting={isDeleting}
      />
      
    </div>
  );
}
