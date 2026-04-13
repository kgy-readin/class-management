import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DashboardData, Student, Curriculum } from '../types';
import { toast } from 'sonner';
import { Clock, LogOut, Save, Users, NotebookPen, Star, User, Library, PlusCircle, Heart } from 'lucide-react';

interface DashboardProps {
  data: DashboardData | null;
  onRefresh: () => void;
  onSelectStudent: (name: string) => void;
}

export default function Dashboard({ data, onRefresh, onSelectStudent }: DashboardProps) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, { status?: string }>>({});

  if (!data) return null;

  const attendingStudents = data.students
    .filter(s => s.isAttending)
    .sort((a, b) => {
      if (!a.dismissalTime || a.dismissalTime === '미설정') return 1;
      if (!b.dismissalTime || b.dismissalTime === '미설정') return -1;
      return new Date(a.dismissalTime).getTime() - new Date(b.dismissalTime).getTime();
    });

  const getStudentCurriculum = (studentName: string) => {
    return data.curriculums
      .filter(c => c.studentName === studentName)
      .sort((a, b) => a.index - b.index);
  };

  const getProgressList = (studentName: string) => {
    const curriculum = getStudentCurriculum(studentName);
    return curriculum
      .filter(item => item.status !== '통과')
      .slice(0, 3);
  };

  const handleAddToWritingStatus = async (studentName: string, item: Curriculum) => {
    if (!window.confirm(`'${item.bookTitle}' 도서로 글쓰기를 추가합니까?`)) return;

    setUpdating(`writing-${studentName}-${item.bookId}`);
    try {
      const response = await fetch('/api/writing-status/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: studentName, 
          bookId: item.bookId, 
          bookTitle: item.bookTitle,
          progress: '진행' 
        }),
      });
      if (!response.ok) throw new Error('글쓰기 추가 실패');
      toast.success('글쓰기 현황에 추가되었습니다.');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleCheckout = async (name: string) => {
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, isAttending: false }),
      });
      if (!response.ok) throw new Error('Checkout failed');
      toast.success(`${name} 학생이 하원하였습니다.`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleHomework = async (name: string, isDone: boolean) => {
    setUpdating(`${name}-homework`);
    try {
      const response = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, isDone }),
      });
      if (!response.ok) throw new Error('Homework update failed');
      toast.success(isDone ? '숙제 완료 처리되었습니다.' : '숙제 미제출 카운트가 증가했습니다.');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusUpdate = async (studentName: string, bookId: string) => {
    const status = localStatuses[`${studentName}-${bookId}`];
    if (!status?.status) return;

    setUpdating(`${studentName}-${bookId}`);
    try {
      const response = await fetch('/api/curriculum/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentName, 
          bookId, 
          status: status.status
        }),
      });
      if (!response.ok) throw new Error('Status update failed');
      toast.success('진도가 업데이트되었습니다.');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(null);
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr || timeStr === '미설정') return '미설정';
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return timeStr;
      return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
    } catch {
      return timeStr;
    }
  };

  const formatLevel = (level: any) => {
    const l = String(level);
    if (l === '0' || l === '0.0' || !l) return '기초';
    return `Lv.${l}`;
  };

  const today = new Date();
  const dateString = today.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  return (
    <div className="space-y-6">
      {/* Date Banner */}
      <div className="w-full bg-white/50 backdrop-blur-sm border border-border/30 rounded-[1.5rem] py-4 px-6 flex items-center justify-center shadow-sm">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary/60" />
          <span className="text-sm font-black text-foreground/80 tracking-tight">
            {dateString}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {attendingStudents.length === 0 ? (
        <div className="col-span-full flex flex-col items-center justify-center py-24 text-muted-foreground bg-white rounded-[2.5rem] border border-dashed border-border/50 shadow-sm">
          <div className="w-20 h-20 bg-secondary rounded-[2rem] flex items-center justify-center mb-6">
            <Users className="w-10 h-10 text-primary/40" />
          </div>
          <p className="text-xl font-black text-foreground mb-2">현재 등원 중인 학생이 없습니다.</p>
          <p className="text-sm font-medium opacity-60">학생 관리 탭에서 등원 체크를 해주세요.</p>
        </div>
      ) : (
        attendingStudents.map(student => {
          const progressList = getProgressList(student.name);

          return (
            <Card key={student.name} className="overflow-hidden border-border/20 shadow-none hover:shadow-xl transition-all duration-500 rounded-[2.5rem] bg-[#F7F9FF] group flex flex-col">
              {/* Card Top Header */}
              <div className="px-6 py-3 w-full">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h3 className="text-[20px] font-black text-foreground translate-x-[4px] translate-y-[1px]">{student.name}</h3>
                    <div className="flex items-center gap-2 translate-x-[4px] translate-y-[2px]">
                      <span className="text-sm font-bold text-foreground/60">{formatTime(student.dismissalTime)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 -translate-x-[2px]">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-full text-foreground bg-white/50 hover:bg-white/80 shadow-sm transition-all"
                      onClick={() => onSelectStudent(student.name)}
                    >
                      <User className="w-5 h-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-full text-foreground bg-white/50 hover:bg-white/80 shadow-sm transition-all"
                      onClick={() => handleCheckout(student.name)}
                    >
                      <LogOut className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 space-y-3 bg-white flex-1 rounded-b-[2.5rem]">
                {/* 1. Homework Block */}
                <div className="flex items-center gap-3 bg-secondary/20 p-2 rounded-2xl border border-border/30 h-[52px]">
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-foreground">
                      숙제 미제출: <span className={student.homeworkMissed > 0 ? 'text-destructive' : ''}>{student.homeworkMissed}회</span>
                    </p>
                  </div>
                  <div className="flex gap-1.5 pr-[1.5px]">
                    {student.homeworkChecked ? (
                      <div className="h-8 px-4 rounded-full text-[11px] font-black bg-primary text-white flex items-center justify-center leading-none shadow-sm -translate-x-[2px]">
                        검사 완료
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          className="h-8 px-3 rounded-full text-[11px] font-normal bg-white text-primary border-primary/20 hover:bg-primary/5 transition-all flex items-center justify-center leading-none"
                          onClick={() => handleHomework(student.name, true)}
                          disabled={updating === `${student.name}-homework`}
                        >
                          수행
                        </Button>
                        <Button
                          variant="outline"
                          className="h-8 px-3 rounded-full text-[11px] font-normal bg-white text-destructive border-destructive/20 hover:bg-destructive hover:text-white transition-all flex items-center justify-center leading-none"
                          onClick={() => handleHomework(student.name, false)}
                          disabled={updating === `${student.name}-homework`}
                        >
                          안함
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. Sub-program Block */}
                <div className="flex items-center gap-3 bg-secondary/20 p-2 rounded-2xl border border-border/30 h-[52px]">
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    <Library className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] font-black text-foreground truncate block">
                      {student.subProgram || '서브프로그램 미설정'}
                    </span>
                  </div>
                </div>

                {/* 3-5. Progress List (Books/Writing) */}
                {progressList.map((item: Curriculum) => {
                  const key = `${student.name}-${item.bookId}`;
                  const currentStatus = localStatuses[key] || { 
                    status: item.status
                  };
                  const isWriting = item.bookTitle === '글쓰기';

                  return (
                    <div 
                      key={item.index} 
                      className={`flex items-center gap-3 p-2 rounded-2xl border h-[52px] ${
                        isWriting 
                          ? 'bg-[#faf5ff] border-[#f3e8ff]' 
                          : 'bg-secondary/20 border-border/30'
                      }`}
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-8 w-8 rounded-xl shrink-0 ${
                          updating === key 
                            ? 'animate-pulse' 
                            : isWriting 
                              ? 'text-purple-600 hover:bg-purple-100' 
                              : 'text-primary hover:bg-primary/10'
                        }`}
                        onClick={() => handleStatusUpdate(student.name, item.bookId)}
                        disabled={updating === key}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] truncate">
                          <span className={`font-bold ${isWriting ? 'text-purple-900' : 'text-black'}`}>{item.bookTitle}</span>
                          {!isWriting && <span className="text-primary font-normal ml-1.5">{item.bookId}</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 pr-[1.5px]">
                        <select 
                          className={`bg-white border-none rounded-full px-2 py-1 text-[11px] font-normal focus:ring-1 outline-none shadow-sm -translate-x-[2px] ${
                            isWriting 
                              ? 'ring-purple-400 text-purple-900' 
                              : 'ring-primary/20 text-foreground'
                          }`}
                          value={currentStatus.status}
                          onChange={(e) => setLocalStatuses(prev => ({
                            ...prev,
                            [key]: { ...currentStatus, status: e.target.value }
                          }))}
                        >
                          {['예정', '진행', '통과', '불통'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        
                        {!isWriting && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 rounded-full text-primary/40 hover:text-primary hover:bg-primary/10"
                            onClick={() => handleAddToWritingStatus(student.name, item)}
                            disabled={updating === `writing-${student.name}-${item.bookId}`}
                          >
                            <PlusCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {isWriting && (
                          <div className="h-7 w-7 flex items-center justify-center text-purple-400/60">
                            <Heart className="w-4 h-4 fill-purple-400/40" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {progressList.length === 0 && (
                  <div className="text-center py-4 border border-dashed border-border/50 rounded-2xl">
                    <p className="text-xs font-bold text-muted-foreground">커리큘럼을 추가해 주세요.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
      </div>
    </div>
  );
}
