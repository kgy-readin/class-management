import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WritingStatus } from '../../types';
import { toast } from 'sonner';
import { FileText, Calendar as CalendarIcon, Trash2, Save, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { writingStatusApi } from '@/src/services/api';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';

import 'react-day-picker/dist/style.css';

export default function WritingStatusView() {
  const [statuses, setStatuses] = useState<WritingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [clearing, setClearing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ date: string; bookTitle: string; progress: string } | null>(null);

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

  const handleClearMonth = async () => {
    setClearing(true);
    try {
      await writingStatusApi.clear();
      toast.success('이번 달 데이터가 삭제되었습니다.');
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
      toast.success('정보가 업데이트되었습니다.');
      setEditingKey(null);
      fetchWritingStatus();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdatingStatus(null);
    }
  };

  if (loading) return <div className="text-center py-20 text-neutral-400">로딩 중...</div>;

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
      // Default sort by name ascending
      return a.name.localeCompare(b.name, 'ko');
    });

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) setSelectedStudent(null);
  };

  const handleStudentSelect = (name: string | null) => {
    setSelectedStudent(name);
    if (name) setSelectedDate(undefined);
    else setSelectedDate(new Date());
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="w-full lg:w-80 shrink-0 flex flex-col sm:flex-row lg:flex-col gap-4">
        <Card className="rounded-[2.5rem] shadow-sm bg-[#FFFFFF] overflow-hidden sm:flex-[4] lg:flex-none sm:min-w-[320px] lg:min-w-0 sm:h-[330px] lg:h-auto">
          <CardContent className="p-0">
            <style>{`
              .rdp { --rdp-accent-color: var(--primary); --rdp-background-color: var(--primary-foreground); margin: 0; font-size: 13px; width: 100%; display: flex; flex-direction: column; align-items: center; padding-bottom: 12px; }
              .rdp-months { width: 100%; display: flex; justify-content: center; padding: 0.3rem 1rem 0.3rem 1rem; }
              .rdp-caption_label { font-weight: 600; transform: translate(12px, -4px); }
              .rdp-nav { transform: translateX(-12px) scale(0.8); }
              .rdp-day_selected:not([disabled]), .rdp-day_selected:focus:not([disabled]), .rdp-day_selected:hover:not([disabled]) { background-color: var(--primary); color: white; border-radius: 10px; }
              .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: var(--secondary); border-radius: 10px; }
              .rdp-head_cell { font-size: 11px; font-weight: 600; color: var(--muted-foreground); padding-bottom: 8px; }
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

        <div className="sm:flex-[6] lg:flex-none flex flex-col gap-4 sm:h-[330px] lg:h-auto">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1 h-10 rounded-xl font-semibold text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 border-[#ecedef] border-solid flex items-center justify-center transition-all"
              onClick={() => {
                setSelectedDate(undefined);
                setSelectedStudent(null);
              }}
              title={`${format(currentMonth, 'M월')} 전체 보기`}
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>

            <Dialog>
              <DialogTrigger render={
                <Button
                  variant="outline"
                  className="flex-1 h-10 rounded-xl font-semibold text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 border-[#ecedef] border-solid flex items-center justify-center transition-all"
                  disabled={clearing}
                  title="이번달 마무리"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              } />
              <DialogContent className="sm:max-w-[360px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                <div className="p-8 text-center space-y-6">
                  <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                    <Trash2 className="w-8 h-8 text-destructive" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">정말로 글쓰기 데이터를 리셋할까요?</h3>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                      이 작업은 되돌릴 수 없으며<br />
                      <span className="text-destructive">모든 기록이 삭제됩니다.</span>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <DialogClose render={<Button variant="secondary" className="flex-1 h-12 rounded-2xl font-semibold">취소</Button>} />
                    <DialogClose render={
                      <Button 
                        variant="destructive" 
                        className="flex-1 h-12 rounded-2xl font-semibold shadow-lg shadow-destructive/20"
                        onClick={handleClearMonth}
                      >
                        확인
                      </Button>
                    } />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-[#FFFFFF] rounded-[2rem] ring-1 ring-foreground/5 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="px-5 py-3 border-b border-border/50 bg-secondary/10">
              <h3 className="text-[12px] font-normal text-muted-foreground uppercase tracking-widest mt-1 ml-1">학생별 보기</h3>
            </div>
            <div className="p-2.5 flex-1 overflow-y-auto custom-scrollbar max-h-[200px] sm:max-h-none lg:max-h-[300px]">
              <div className="grid grid-cols-3 gap-1.5 pb-2">
                <Button
                  variant="ghost"
                  className={`h-9 rounded-xl text-xs font-semibold justify-start px-3 ${!selectedStudent && selectedDate ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                  onClick={() => handleStudentSelect(null)}
                >
                  전체
                </Button>
                {(Array.from(new Set(statuses.map(s => s.name))) as string[]).sort().map(name => (
                  <Button
                    key={name}
                    variant="ghost"
                    className={`h-9 rounded-xl text-xs font-semibold justify-start px-3 truncate ${selectedStudent === name ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
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
        <div className="bg-[#FFFFFF] rounded-[2.5rem] shadow-sm overflow-hidden mb-2">
          <div className="px-8 py-6 border-b border-border/50 bg-secondary/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#FFFFFF] rounded-xl shadow-sm">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selectedStudent ? `${selectedStudent} 학생 글쓰기 기록` : 
                   selectedDate ? format(selectedDate, 'yyyy년 MM월 dd일', { locale: ko }) : 
                   `${format(currentMonth, 'yyyy년 MM월')} 글쓰기 기록`}
                </h2>
                <p className="text-xs font-medium text-muted-foreground">총 {filteredStatuses.length}건의 기록</p>
              </div>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-secondary/5">
                  <th className="w-[13%] px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">날짜</th>
                  <th className="w-[13%] px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">학생명</th>
                  <th className="w-[48%] px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">도서명</th>
                  <th className="w-[13%] px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest text-center">상태</th>
                  <th className="w-[13%] px-6 py-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredStatuses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <CalendarIcon className="w-10 h-10 opacity-20" />
                        <p className="font-semibold">해당 기간의 기록이 없습니다.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStatuses.map((status, idx) => {
                    const key = `${status.name}-${status.bookTitle}-${status.date}`;
                    const isEditing = editingKey === key;
                    return (
                      <tr key={`${status.name}-${idx}`} className="hover:bg-secondary/5 transition-colors group">
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          {isEditing ? (
                            <input 
                              type="date"
                              className="w-full text-[13px] bg-white border border-border/50 rounded px-1 py-0.5 outline-none focus:ring-1 ring-primary/20"
                              value={editValues?.date}
                              onChange={(e) => setEditValues(prev => prev ? { ...prev, date: e.target.value } : null)}
                            />
                          ) : (
                            <span className="text-[13px] font-normal text-muted-foreground">{format(parseISO(status.date), 'M/d')}</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap"><span className="text-[13px] font-normal text-foreground">{status.name}</span></td>
                        <td className="px-6 py-3.5">
                          {isEditing ? (
                            <input 
                              className="w-full text-[13px] bg-white border border-border/50 rounded px-2 py-0.5 outline-none focus:ring-1 ring-primary/20"
                              value={editValues?.bookTitle}
                              onChange={(e) => setEditValues(prev => prev ? { ...prev, bookTitle: e.target.value } : null)}
                            />
                          ) : (
                            <span className="text-[13px] font-normal text-foreground line-clamp-1" title={status.bookTitle}>{status.bookTitle}</span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <div className="flex justify-center">
                            {isEditing ? (
                              <select
                                className="text-[13px] font-normal bg-white border border-border/50 rounded px-1 py-0.5 outline-none focus:ring-1 ring-primary/20"
                                value={editValues?.progress}
                                onChange={(e) => setEditValues(prev => prev ? { ...prev, progress: e.target.value } : null)}
                              >
                                {['진행', '완성'].map(p => <option key={p} value={p}>{p}</option>)}
                              </select>
                            ) : (
                              <span className={`text-[13px] font-bold ${status.progress === '완성' ? 'text-primary' : 'text-amber-600'}`}>{status.progress}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <div className="flex justify-center gap-2">
                            {isEditing ? (
                              <>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => handleStatusUpdate(status)} disabled={updatingStatus === key}><Save className="w-4 h-4" /></Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-secondary" onClick={() => setEditingKey(null)}><X className="w-4 h-4" /></Button>
                              </>
                            ) : (
                              <Button 
                                variant="ghost" size="sm" className="text-xs font-bold text-muted-foreground hover:text-primary h-8 px-2"
                                onClick={() => { setEditingKey(key); setEditValues({ date: status.date, bookTitle: status.bookTitle, progress: status.progress }); }}
                              >수정</Button>
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
                  <p className="font-semibold">해당 기간의 기록이 없습니다.</p>
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
                          <input type="date" className="text-xs bg-white border border-border/50 rounded px-2 py-1 outline-none focus:ring-1 ring-primary/20" value={editValues?.date} onChange={(e) => setEditValues(prev => prev ? { ...prev, date: e.target.value } : null)} />
                        ) : (
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">{format(parseISO(status.date), 'M월 d일')}</span>
                        )}
                        <span className="text-sm font-normal text-foreground">{status.name}</span>
                        {!isEditing && <span className={`text-sm font-normal ${status.progress === '완성' ? 'text-primary' : 'text-amber-600'}`}>({status.progress})</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => handleStatusUpdate(status)} disabled={updatingStatus === key}><Save className="w-4 h-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-secondary" onClick={() => setEditingKey(null)}><X className="w-4 h-4" /></Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" className="text-xs font-bold text-muted-foreground hover:text-primary h-8 px-2" onClick={() => { setEditingKey(key); setEditValues({ date: status.date, bookTitle: status.bookTitle, progress: status.progress }); }}>수정</Button>
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
                              {['진행', '완성'].map(p => <option key={p} value={p}>{p}</option>)}
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
    </div>
  );
}
