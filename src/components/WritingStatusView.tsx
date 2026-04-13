import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WritingStatus } from '../types';
import { toast } from 'sonner';
import { FileText, Calendar as CalendarIcon, User, BookOpen, CheckCircle2, Clock, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

// Import react-day-picker styles
import 'react-day-picker/dist/style.css';

export default function WritingStatusView() {
  const [statuses, setStatuses] = useState<WritingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [clearing, setClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const fetchWritingStatus = async () => {
    try {
      const response = await fetch('/api/writing-status');
      if (!response.ok) throw new Error('Failed to fetch writing status');
      const result = await response.json();
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

  const handleClearMonth = async () => {
    if (!confirm('이번 달 데이터를 모두 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    
    setClearing(true);
    try {
      const response = await fetch('/api/writing-status/clear', { method: 'POST' });
      if (!response.ok) throw new Error('데이터 삭제 실패');
      toast.success('이번 달 데이터가 삭제되었습니다.');
      fetchWritingStatus();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setClearing(false);
    }
  };

  const handleStatusUpdate = async (status: WritingStatus, newProgress: string) => {
    const key = `${status.name}-${status.bookId}-${status.date}`;
    setUpdatingStatus(key);
    try {
      const response = await fetch('/api/writing-status/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: status.name, 
          bookId: status.bookId, 
          bookTitle: status.bookTitle,
          progress: newProgress 
        }),
      });
      if (!response.ok) throw new Error('업데이트 실패');
      toast.success('상태가 업데이트되었습니다.');
      fetchWritingStatus();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (loading) return <div className="text-center py-20 text-neutral-400">로딩 중...</div>;

  const filteredStatuses = statuses.filter(status => {
    try {
      const statusDate = parseISO(status.date);
      
      // If student is selected, show all records for that student regardless of date
      if (selectedStudent) {
        return status.name === selectedStudent;
      }

      // Otherwise, apply date/month filtering
      if (selectedDate) {
        return isSameDay(statusDate, selectedDate);
      }
      
      // Default: show current month's records
      return statusDate.getMonth() === currentMonth.getMonth() && 
             statusDate.getFullYear() === currentMonth.getFullYear();
    } catch {
      return false;
    }
  });

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) setSelectedStudent(null);
  };

  const handleStudentSelect = (name: string | null) => {
    setSelectedStudent(name);
    if (name) setSelectedDate(undefined);
    else setSelectedDate(new Date()); // Reset to today when clicking 'All'
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar: Calendar & Actions & Student Filter */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col sm:flex-row lg:flex-col gap-4">
        <Card className="rounded-[2.5rem] border-border/50 shadow-sm bg-white overflow-hidden sm:flex-[4] lg:flex-none sm:min-w-[320px] lg:min-w-0">
          <CardContent className="p-0">
            <style>{`
              .rdp { 
                --rdp-accent-color: var(--primary); 
                --rdp-background-color: var(--primary-foreground); 
                margin: 0; 
                font-size: 13px; 
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .rdp-months {
                width: 100%;
                display: flex;
                justify-content: center;
                padding: 0.3rem 1rem 0.3rem 1rem;
              }
              .rdp-caption_label { 
                font-weight: 900; 
                transform: translate(12px, -4px);
              }
              .rdp-nav {
                transform: translateX(-12px) scale(0.8);
              }
              .rdp-day_selected:not([disabled]), .rdp-day_selected:focus:not([disabled]), .rdp-day_selected:hover:not([disabled]) {
                background-color: var(--primary);
                color: white;
                border-radius: 10px;
              }
              .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
                background-color: var(--secondary);
                border-radius: 10px;
              }
              .rdp-head_cell { font-size: 11px; font-weight: 900; color: var(--muted-foreground); padding-bottom: 8px; }
              .rdp-table { width: 100%; border-collapse: collapse; max-width: 280px; }
              .rdp-cell { padding: 1px; }
              .rdp-button { width: 32px; height: 32px; display: flex; items-center: center; justify-content: center; }
            `}</style>
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={ko}
              className="mx-auto"
            />
          </CardContent>
        </Card>

        <div className="sm:flex-[6] lg:flex-none flex flex-col gap-4">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1 h-10 rounded-xl font-bold text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 border-dashed flex items-center justify-center transition-all"
              onClick={() => {
                setSelectedDate(undefined);
                setSelectedStudent(null);
              }}
              title={`${format(currentMonth, 'M월')} 전체 보기`}
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              className="flex-1 h-10 rounded-xl font-bold text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 border-dashed flex items-center justify-center transition-all"
              onClick={() => setShowConfirm(true)}
              disabled={clearing}
              title="이번달 마무리"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Student Filter List */}
          <div className="bg-white rounded-[2rem] border border-border/50 shadow-sm overflow-hidden flex-1">
            <div className="px-5 py-3 border-b border-border/50 bg-secondary/10">
              <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">학생별 보기</h3>
            </div>
            <div className="p-2.5 max-h-[200px] lg:max-h-[300px] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-3 gap-1.5">
                <Button
                  variant="ghost"
                  className={`h-9 rounded-xl text-xs font-bold justify-start px-3 ${!selectedStudent && selectedDate ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => handleStudentSelect(null)}
                >
                  전체
                </Button>
                {(Array.from(new Set(statuses.map(s => s.name))) as string[]).sort().map(name => (
                  <Button
                    key={name}
                    variant="ghost"
                    className={`h-9 rounded-xl text-xs font-bold justify-start px-3 truncate ${selectedStudent === name ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
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

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-sm rounded-[2rem] shadow-2xl border-none overflow-hidden animate-in zoom-in-95 duration-200">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-foreground">정말로 글쓰기 데이터를 리셋할까요?</h3>
                <p className="text-sm text-muted-foreground font-medium">이 작업은 되돌릴 수 없으며 모든 기록이 삭제됩니다.</p>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="flex-1 h-12 rounded-2xl font-bold"
                  onClick={() => setShowConfirm(false)}
                >
                  취소
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1 h-12 rounded-2xl font-black shadow-lg shadow-destructive/20"
                  onClick={() => {
                    setShowConfirm(false);
                    handleClearMonth();
                  }}
                >
                  확인
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Right Content: Table View */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-[2.5rem] border border-border/50 shadow-sm overflow-hidden mb-2">
          <div className="px-8 py-6 border-b border-border/50 bg-secondary/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground">
                  {selectedStudent ? `${selectedStudent} 학생 글쓰기 기록` : 
                   selectedDate ? format(selectedDate, 'yyyy년 MM월 dd일', { locale: ko }) : 
                   `${format(currentMonth, 'yyyy년 MM월')} 글쓰기 기록`}
                </h2>
                <p className="text-xs font-bold text-muted-foreground">총 {filteredStatuses.length}건의 기록</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-secondary/5">
                  <th className="w-[15%] px-8 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest">날짜</th>
                  <th className="w-[20%] px-8 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest">학생명</th>
                  <th className="w-[50%] px-8 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest">도서명</th>
                  <th className="w-[15%] px-8 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-widest text-center">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredStatuses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <CalendarIcon className="w-10 h-10 opacity-20" />
                        <p className="font-bold">해당 기간의 기록이 없습니다.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStatuses.map((status, idx) => (
                    <tr key={`${status.name}-${idx}`} className="hover:bg-secondary/5 transition-colors group">
                      <td className="px-8 py-3.5">
                        <span className="text-[13px] font-normal text-muted-foreground">
                          {format(parseISO(status.date), 'M/d')}
                        </span>
                      </td>
                      <td className="px-8 py-3.5">
                        <span className="text-[13px] font-normal text-foreground">{status.name}</span>
                      </td>
                      <td className="px-8 py-3.5">
                        <span className="text-[13px] font-normal text-foreground line-clamp-1">{status.bookTitle}</span>
                      </td>
                      <td className="px-8 py-3.5">
                        <div className="flex justify-center">
                          <select
                            className={`text-[13px] font-normal bg-transparent border-none focus:ring-0 outline-none cursor-pointer ${
                              status.progress === '완성' ? 'text-primary' : 'text-amber-600'
                            }`}
                            value={status.progress}
                            onChange={(e) => handleStatusUpdate(status, e.target.value)}
                            disabled={updatingStatus === `${status.name}-${status.bookId}-${status.date}`}
                          >
                            {['진행', '완성'].map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
