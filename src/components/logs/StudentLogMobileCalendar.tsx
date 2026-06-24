import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import StudentCombobox from '../common/StudentCombobox';
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

interface StudentLogMobileCalendarProps {
  logs: StudentLogEntry[];
  fetchLogs: () => Promise<void>;
  currentMonth: Date;
  setCurrentMonth: (date: Date | ((prev: Date) => Date)) => void;
  setViewMode: (mode: 'monthly' | 'student') => void;
  handleOpenAddDialog: (initialDate?: Date) => void;
  sortedStudents: Student[];
  selectedDate?: Date;
  setSelectedDate?: (date: Date) => void;
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

export default function StudentLogMobileCalendar({
  logs,
  fetchLogs,
  currentMonth,
  setCurrentMonth,
  setViewMode,
  handleOpenAddDialog,
  sortedStudents,
  selectedDate: propSelectedDate,
  setSelectedDate: propSetSelectedDate
}: StudentLogMobileCalendarProps) {
  const [_localSelectedDate, _setLocalSelectedDate] = useState<Date>(new Date());
  
  const selectedDate = propSelectedDate || _localSelectedDate;
  const setSelectedDate = propSetSelectedDate || _setLocalSelectedDate;
  
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

  return (
    <div className="flex flex-col gap-6">
      
      {/* 1. Mini Month Calendar Card */}
      <Card className="rounded-[2rem] border-none ring-0 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-5" style={{ paddingTop: '16px', paddingBottom: '16px' }}>
          
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
            
            {/* Student View Toggle Button */}
            <div className="absolute right-0">
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-full text-zinc-650 hover:text-zinc-900 border border-solid border-zinc-100 bg-white/50 hover:bg-white/80 shadow-sm transition-all cursor-pointer flex items-center justify-center shrink-0"
                onClick={() => setViewMode('student')}
                title="학생뷰로 보기"
              >
                <User className="w-5 h-5" />
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
                  onClick={() => setSelectedDate(day)}
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

      {/* 2. Recent Records List / Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden" style={{ minHeight: '350px', paddingBottom: '12px' }}>
        
        {/* Title & Plus Control Button */}
        <div className="px-6 py-3 border-b border-solid border-zinc-100 flex items-center justify-between" style={{ height: '76px', borderColor: '#f4f4f5' }}>
          <div>
            <h2 className="text-[17px] font-semibold text-zinc-800 tracking-tight">
              {format(selectedDate, 'M월 d일')} 기록
            </h2>
          </div>
          <Button
            size="icon"
            variant="outline"
            className="h-10 w-10 rounded-full text-foreground border border-solid border-zinc-100 bg-white/50 hover:bg-white/80 shadow-sm transition-all cursor-pointer"
            onClick={() => handleOpenAddDialog(selectedDate)}
            title="새 기록 등록"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Timeline list of logs for chosen day */}
        <div className="divide-y divide-solid divide-zinc-100 bg-white p-5">
          {selectedDateLogs.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="flex flex-col items-center gap-2 text-zinc-500">
                <CalendarDays className="w-8 h-8 opacity-20" />
                <p className="text-[13px] font-medium text-zinc-500">기록된 내용이 없습니다.</p>
              </div>
            </div>
          ) : (
            selectedDateLogs.map((log, idx) => {
              const isEditing = editingLog === log;
              const badgeStyle = getCategoryTagStyle(log.category);

              return (
                <div key={`${log.name}-${idx}`} className="py-4 flex flex-col gap-2 relative last:pb-0 first:pt-0">
                  <div className="flex-1 min-w-0 space-y-2">
                    
                    {/* Log item Header Line */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isEditing && editForm ? (
                          <div className="w-[120px]">
                            <StudentCombobox
                              students={sortedStudents}
                              value={editForm.name}
                              onChange={(val) => setEditForm(prev => prev ? ({ ...prev, name: val }) : null)}
                              placeholder="학생선택"
                              inputClassName="bg-white border-solid border-zinc-200 text-xs !h-7 py-0 px-2 !rounded font-medium"
                              className="!w-[120px]"
                            />
                          </div>
                        ) : (
                          <span className="text-[13px] font-medium text-zinc-800">{log.name}</span>
                        )}

                        {isEditing && editForm ? (
                          <select
                            className="text-[12px] h-7 bg-white border border-solid border-zinc-200 rounded px-1.5 py-0.5 outline-none focus:ring-1 ring-primary/20 font-medium"
                            value={editForm.category}
                            onChange={e => setEditForm(prev => prev ? ({ ...prev, category: e.target.value }) : null)}
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-flex items-center justify-center h-5 px-2 rounded-full text-[11.5px] font-medium select-none text-center ${badgeStyle}`}>
                            {log.category}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isEditing ? (
                          <>
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
                                  content: log.content,
                                  name: log.name
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

                    {/* Content Body Display/Input */}
                    <div className="text-[13px] font-medium text-zinc-800 leading-relaxed pr-2">
                      {isEditing && editForm ? (
                        <textarea
                          rows={2}
                          className="w-full bg-white border border-solid border-zinc-200 rounded px-2 py-1.5 text-[13px] font-normal leading-relaxed focus:outline-none focus:ring-1 ring-primary/20 resize-none"
                          value={editForm.content}
                          onChange={e => setEditForm(prev => prev ? ({ ...prev, content: e.target.value }) : null)}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap break-all mt-1">
                          {log.content}
                        </p>
                      )}
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* --- CONFIRM DELETE DIALOG --- */}
      <Dialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <DialogContent className="sm:max-w-[360px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-250">
          <div className="p-8 text-center space-y-6">
            <div className="w-[54px] h-[54px] bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-[27px] h-[27px] text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-foreground">교무기록 삭제</h3>
              <p className="text-sm text-zinc-600 font-normal leading-relaxed">
                <span className="text-destructive font-bold">'{deletingItem?.name}'</span> 학생의 <br />
                <span className="font-semibold text-zinc-750">'{deletingItem?.category}'</span> 기록을 삭제하시겠습니까?
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button 
                type="button"
                className="flex-1 h-12 rounded-2xl bg-zinc-100/80 hover:bg-zinc-200/80 text-zinc-500 font-bold border-none cursor-pointer"
                onClick={() => setDeletingItem(null)}
              >
                취소
              </Button>
              <Button 
                type="button"
                variant="destructive"
                className="flex-1 h-12 rounded-2xl font-extrabold shadow-lg shadow-destructive/20 cursor-pointer"
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
}
