import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Student, Curriculum } from '../../types';
import { toast } from 'sonner';
import { LogOut, Save, Star, User, Library, PlusCircle, Heart, FilePlus, X } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import { attendanceApi, homeworkApi, curriculumApi, writingStatusApi, studentApi } from '@/src/services/api';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';

interface StudentCardProps {
  student: Student;
  progressList: Curriculum[];
  onRefresh: () => void;
  onSelectStudent: (name: string) => void;
}

const StudentCard: React.FC<StudentCardProps> = ({ student, progressList, onRefresh, onSelectStudent }) => {
  const [updating, setUpdating] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, { status?: string }>>({});
  const [writingConfirmItem, setWritingConfirmItem] = useState<Curriculum | null>(null);
  const [isEditingSubProgram, setIsEditingSubProgram] = useState(false);
  const [subProgramValue, setSubProgramValue] = useState(student.subProgram || '');

  const handleSubProgramUpdate = async () => {
    setUpdating(`${student.name}-subprogram`);
    try {
      await studentApi.update(student.name, { subProgram: subProgramValue });
      toast.success('서브프로그램이 업데이트되었습니다.');
      setIsEditingSubProgram(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleAddToWritingStatus = async (item: Curriculum) => {
    setUpdating(`writing-${student.name}-${item.bookId}`);
    try {
      await writingStatusApi.update({ 
        name: student.name, 
        bookTitle: item.bookTitle,
        progress: '진행' 
      });
      toast.success('글쓰기 현황에 추가되었습니다.');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(null);
      setWritingConfirmItem(null);
    }
  };

  const handleCheckout = async () => {
    try {
      await attendanceApi.update({ name: student.name, isAttending: false });
      toast.success(`${student.name} 학생이 하원하였습니다.`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleHomework = async (isDone: boolean) => {
    setUpdating(`${student.name}-homework`);
    try {
      await homeworkApi.update({ name: student.name, isDone });
      toast.success(isDone ? '숙제 완료 처리되었습니다.' : '숙제 미제출 카운트가 증가했습니다.');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusUpdate = async (bookId: string, index: number) => {
    const status = localStatuses[`${student.name}-${bookId}-${index}`];
    if (!status?.status) return;
    setUpdating(`${student.name}-${bookId}`);
    try {
      await curriculumApi.update({ 
        studentName: student.name, 
        bookId, 
        status: status.status,
        originalIndex: index
      });
      toast.success('진도가 업데이트되었습니다.');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <Card className="overflow-hidden shadow-none hover:shadow-xl transition-all duration-500 rounded-[2.5rem] bg-white group flex flex-col">
      <div className="px-6 py-2 w-full mb-[-8px]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h3 className="text-[20px] font-extrabold text-foreground translate-x-[4px] translate-y-[1px]">{student.name}</h3>
            <div className="flex items-center gap-2 translate-x-[4px] translate-y-[2px]">
              <span className="text-sm font-bold text-foreground/60">{formatTime(student.dismissalTime)}</span>
            </div>
          </div>
          <div className="flex gap-2 -translate-x-[2px]">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-full text-foreground bg-white/50 hover:bg-white/80 shadow-sm transition-all border border-[#ecedef]"
              onClick={() => onSelectStudent(student.name)}
            >
              <User className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-full text-foreground bg-white/50 hover:bg-white/80 shadow-sm transition-all border border-[#ecedef]"
              onClick={handleCheckout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="pt-4 px-4 pb-3 space-y-2 flex-1 border-t border-border/30">
        <div className="flex items-center gap-3 bg-secondary/20 p-2 rounded-2xl border border-border/30 h-[44px]">
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <Star className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              숙제 미제출: <span className={student.homeworkMissed > 0 ? 'text-destructive' : ''}>{student.homeworkMissed}회</span>
            </p>
          </div>
          <div className="flex gap-1.5 pr-[1.5px]">
            {student.homeworkChecked ? (
              student.homeworkMissedToday ? (
                <div className="h-8 px-4 rounded-full text-[11px] font-extrabold bg-destructive text-white flex items-center justify-center leading-none shadow-sm -translate-x-[2px]">
                  미수행
                </div>
              ) : (
                <div className="h-8 px-4 rounded-full text-[11px] font-extrabold bg-primary text-white flex items-center justify-center leading-none shadow-sm -translate-x-[2px]">
                  검사 완료
                </div>
              )
            ) : (
              <>
                <Button
                  variant="outline"
                  className="h-8 px-3 rounded-full text-[11px] font-normal bg-white text-primary border-primary/20 hover:bg-primary/5 transition-all flex items-center justify-center leading-none"
                  onClick={() => handleHomework(true)}
                  disabled={updating === `${student.name}-homework`}
                >
                  수행
                </Button>
                <Button
                  variant="outline"
                  className="h-8 px-3 rounded-full text-[11px] font-normal bg-white text-destructive border-destructive/20 hover:bg-destructive hover:text-white transition-all flex items-center justify-center leading-none"
                  onClick={() => handleHomework(false)}
                  disabled={updating === `${student.name}-homework`}
                >
                  안함
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 bg-secondary/20 p-2 rounded-2xl border border-border/30 h-[44px]">
          <div className="w-8 h-8 flex items-center justify-center shrink-0">
            <Library className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {isEditingSubProgram ? (
              <input
                className="w-full bg-white border border-border/50 rounded-lg px-2 py-1 text-xs font-normal focus:ring-1 ring-primary/20 outline-none"
                value={subProgramValue}
                onChange={(e) => setSubProgramValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubProgramUpdate();
                  if (e.key === 'Escape') setIsEditingSubProgram(false);
                }}
              />
            ) : (
              <span className="text-sm font-semibold text-foreground truncate block">
                {student.subProgram || '서브프로그램 미설정'}
              </span>
            )}
          </div>
          <div className="flex gap-1 pr-[1.5px]">
            {isEditingSubProgram ? (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full text-primary hover:bg-primary/10"
                  onClick={handleSubProgramUpdate}
                  disabled={updating === `${student.name}-subprogram`}
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:bg-secondary"
                  onClick={() => {
                    setIsEditingSubProgram(false);
                    setSubProgramValue(student.subProgram || '');
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => {
                  setSubProgramValue(student.subProgram || '');
                  setIsEditingSubProgram(true);
                }}
              >
                <PlusCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {progressList.map((item) => {
          const key = `${student.name}-${item.bookId}-${item.index}`;
          const currentStatus = localStatuses[key] || { status: item.status };
          const isWriting = item.bookTitle === '글쓰기';

          return (
            <div 
              key={item.index} 
              className={`flex items-center gap-3 p-2 rounded-2xl border h-[44px] ${
                isWriting ? 'bg-[#faf5ff] border-[#f3e8ff]' : 'bg-secondary/20 border-border/30'
              }`}
            >
              <Button
                size="icon"
                variant="ghost"
                className={`h-8 w-8 rounded-xl shrink-0 ${
                  updating === key ? 'animate-pulse' : isWriting ? 'text-purple-600 hover:bg-purple-100' : 'text-primary hover:bg-primary/10'
                }`}
                onClick={() => handleStatusUpdate(item.bookId, item.index)}
                disabled={updating === key}
              >
                <Save className="w-4 h-4" />
              </Button>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                  <span className={`font-semibold ${isWriting ? 'text-purple-900' : 'text-black'}`}>{item.bookTitle}</span>
                  {!isWriting && <span className="text-primary font-medium ml-1.5">{item.bookId}</span>}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 pr-[1.5px]">
                <select 
                  className={`bg-white border-none rounded-full px-2 py-1 text-[11px] font-normal focus:ring-1 outline-none shadow-sm -translate-x-[2px] ${
                    isWriting ? 'ring-purple-400 text-purple-900' : 'ring-primary/20 text-foreground'
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
                  <Dialog open={writingConfirmItem?.bookId === item.bookId} onOpenChange={(open) => !open && setWritingConfirmItem(null)}>
                    <DialogTrigger render={
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-full text-primary/40 hover:text-primary hover:bg-primary/10"
                        onClick={() => setWritingConfirmItem(item)}
                        disabled={updating === `writing-${student.name}-${item.bookId}`}
                      >
                        <PlusCircle className="w-4 h-4" />
                      </Button>
                    } />
                    <DialogContent className="sm:max-w-[360px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                      <div className="p-8 text-center space-y-6">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                          <FilePlus className="w-8 h-8 text-primary" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-extrabold text-foreground">글쓰기 추가</h3>
                          <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                            <span className="text-primary font-bold">'{item.bookTitle}'</span> 도서로<br />
                            글쓰기 현황을 추가하시겠습니까?
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <DialogClose render={
                            <Button 
                              variant="secondary" 
                              className="flex-1 h-12 rounded-2xl font-bold"
                            >
                              취소
                            </Button>
                          } />
                          <Button 
                            className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-extrabold shadow-lg shadow-primary/20"
                            onClick={() => handleAddToWritingStatus(item)}
                          >
                            추가
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
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
};

export default StudentCard;
