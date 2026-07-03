import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Student, Curriculum } from '../../types';
import { toast } from 'sonner';
import { MESSAGES } from '@/src/constants/messages';
import { LogOut, Save, Star, User, BookA, FilePlus, X, Smile, Check, Circle, Pencil } from 'lucide-react';
import { formatTime, isResultDelayed } from '@/lib/utils';
import { attendanceApi, homeworkApi, curriculumApi, writingStatusApi, studentApi } from '@/src/services/api';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import StudentMemoPopover from '../students/StudentMemoPopover';
import { AttendanceDialog } from '../students/StudentPopups';

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
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [editingCurriculumKeys, setEditingCurriculumKeys] = useState<Record<string, boolean>>({});

  const handleAttendanceConfirm = async (isAttending: boolean, dismissalTime: string) => {
    try {
      await attendanceApi.update({ name: student.name, isAttending, dismissalTime });
      toast.success(MESSAGES.students.attendanceSuccess(student.name, isAttending));
      setIsAttendanceOpen(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSubProgramUpdate = async () => {
    setUpdating(`${student.name}-subprogram`);
    try {
      await studentApi.update(student.name, { subProgram: subProgramValue });
      toast.success(MESSAGES.dashboard.subprogramUpdated);
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
        progress: '완료' 
      });
      toast.success(MESSAGES.dashboard.writingTrackerAdded);
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
      toast.success(MESSAGES.dashboard.dismissalSuccess(student.name));
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleHomework = async (isDone: boolean) => {
    setUpdating(`${student.name}-homework`);
    try {
      await homeworkApi.update({ name: student.name, isDone });
      toast.success(isDone ? MESSAGES.dashboard.homeworkDone : MESSAGES.dashboard.homeworkNotSubmitted);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusUpdate = async (bookId: string, index: number) => {
    const key = `${student.name}-${bookId}-${index}`;
    const statusVal = localStatuses[key]?.status || progressList.find(item => item.bookId === bookId && item.index === index)?.status;
    if (!statusVal) return;
    setUpdating(`${student.name}-${bookId}`);
    try {
      await curriculumApi.update({ 
        studentName: student.name, 
        bookId, 
        status: statusVal,
        originalIndex: index
      });
      toast.success(MESSAGES.dashboard.progressUpdated);
      onRefresh();
      setEditingCurriculumKeys(prev => ({ ...prev, [key]: false }));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <Card className="relative shadow-sm hover:shadow-xl transition-all duration-500 rounded-[2.5rem] bg-white group flex flex-col pt-3 pb-2 border-none ring-0">
      <div className="px-6 py-2 w-full mb-[-8px]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h3 className="text-[19px] font-bold text-foreground translate-x-[4px] translate-y-[1px]">{student.name}</h3>
            <div className="flex items-center gap-2 translate-x-[4px] translate-y-[2px]">
              <span 
                onClick={() => setIsAttendanceOpen(true)}
                className="text-sm font-semibold text-foreground/60 hover:text-primary transition-colors cursor-pointer hover:underline decoration-dotted decoration-primary/50 underline-offset-4"
                title="하원 예정시간 변경"
              >
                {formatTime(student.dismissalTime)}
              </span>
              {isResultDelayed(student.level, student.lastResultDate) && (
                <span className="text-sm font-medium text-red-600/90 text-left">결과물</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 -translate-x-[2px] items-center">
            <StudentMemoPopover 
              student={student} 
              onRefresh={onRefresh} 
              onlyIfNotEmpty={true}
              buttonClassName="h-9 w-9 rounded-full text-zinc-500 bg-white/50 hover:bg-zinc-100/80 transition-all flex items-center justify-center cursor-pointer"
              iconSizeClass="w-[18px] h-[18px] stroke-[2.2]"
              className="flex items-center justify-center shrink-0"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-full text-foreground bg-white/50 hover:bg-white/80 shadow-sm transition-all border border-zinc-200/80"
              onClick={() => onSelectStudent(student.name)}
            >
              <User className="w-[18px] h-[18px]" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-full text-foreground bg-white/50 hover:bg-white/80 shadow-sm transition-all border border-zinc-200/80"
              onClick={handleCheckout}
            >
              <LogOut className="w-[18px] h-[18px]" />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="pt-2 px-5 pb-2 flex flex-col flex-1 border-t border-zinc-100/70">
        <div className="flex flex-col divide-y divide-zinc-100/70">
          {/* Homework row */}
          <div className="flex items-center gap-3 h-11">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <Smile className="w-[18px] h-[18px] text-primary stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-sm font-medium text-foreground">
                숙제 미수행 <span className={student.homeworkMissed > 0 ? 'text-destructive' : ''}>{student.homeworkMissed}회</span>
              </p>
            </div>
            <div className="flex gap-1 pr-[1.5px] items-center">
              {student.homeworkChecked ? (
                student.homeworkMissedToday ? (
                  <span className="px-[9px] py-0.5 rounded-full text-[12px] font-medium bg-destructive text-white border border-destructive select-none shadow-sm -translate-x-[2px]">
                    안함
                  </span>
                ) : (
                  <span className="px-[9px] py-0.5 rounded-full text-[12px] font-medium bg-primary text-white border border-primary select-none shadow-sm -translate-x-[2px]">
                    완료
                  </span>
                )
              ) : (
                <>
                  <button
                    onClick={() => handleHomework(true)}
                    disabled={updating === `${student.name}-homework`}
                    className="px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-blue-50 text-blue-700 border border-blue-200 shadow-sm hover:opacity-80 transition-all select-none disabled:opacity-50"
                  >
                    완료
                  </button>
                  <button
                    onClick={() => handleHomework(false)}
                    disabled={updating === `${student.name}-homework`}
                    className="px-2.5 py-0.5 rounded-full text-[12px] font-medium bg-red-50 text-red-700 border border-red-200 shadow-sm hover:opacity-80 transition-all select-none disabled:opacity-50"
                  >
                    안함
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Sub-program row */}
          <div className="flex items-center gap-3 h-11">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 text-primary stroke-[2.5]" />
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
                <span className={`text-sm font-medium truncate block ${student.subProgram ? 'text-foreground' : 'text-zinc-400'}`}>
                  {student.subProgram || '서브 없음'}
                </span>
              )}
            </div>
            <div className="flex gap-1 pr-[1.5px] items-center">
              {isEditingSubProgram ? (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-primary hover:bg-primary/10"
                    onClick={handleSubProgramUpdate}
                    disabled={updating === `${student.name}-subprogram`}
                  >
                    <Check className="w-[18px] h-[18px] stroke-[2]" />
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
                    <X className="w-[18px] h-[18px]" />
                  </Button>
                </>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full text-zinc-200 hover:text-primary hover:bg-primary/10"
                  onClick={() => {
                    setSubProgramValue(student.subProgram || '');
                    setIsEditingSubProgram(true);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Curriculum rows */}
          {progressList.map((item, idx) => {
            const key = `${student.name}-${item.bookId}-${item.index}`;
            const currentStatus = localStatuses[key] || { status: item.status };
            const isWriting = item.bookTitle === '글쓰기';
            const isProgressing = currentStatus.status === '진행';

            return (
              <div 
                key={`${key}-${idx}`} 
                className="flex items-center gap-3 h-11"
              >
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                      updating === key 
                        ? 'animate-pulse' 
                        : editingCurriculumKeys[key]
                          ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 font-semibold border border-emerald-200'
                          : isWriting 
                            ? 'text-purple-600 hover:bg-purple-50'
                            : isProgressing
                              ? 'text-blue-600 hover:bg-blue-50'
                              : 'text-primary hover:bg-primary/5'
                    }`}
                    onClick={() => {
                      if (!editingCurriculumKeys[key]) {
                        setEditingCurriculumKeys(prev => ({ ...prev, [key]: true }));
                      } else {
                        handleStatusUpdate(item.bookId, item.index);
                      }
                    }}
                    disabled={updating === key}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </Button>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    <span className={`font-medium ${
                      isWriting 
                        ? 'text-purple-900 font-medium' 
                        : 'text-zinc-800'
                    }`}>{item.bookTitle}</span>
                    {!isWriting && (
                      <span className="font-medium ml-1.5 text-primary">{item.bookId}</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 pr-[1.5px]">
                  {editingCurriculumKeys[key] ? (
                    <select 
                      className={`bg-white border rounded-full px-2 py-0.5 text-[12px] font-medium focus:ring-1 outline-none shadow-sm -translate-x-[2px] ${
                        isProgressing
                          ? 'ring-amber-400 text-amber-900 border-amber-200'
                          : isWriting 
                            ? 'ring-purple-400 text-purple-900 border-purple-200' 
                            : 'ring-primary/20 text-foreground border-zinc-200'
                      }`}
                      value={currentStatus.status}
                      onChange={(e) => setLocalStatuses(prev => ({
                        ...prev,
                        [key]: { ...currentStatus, status: e.target.value }
                      }))}
                    >
                      {['예정', '진행', '통과', '불통'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <span 
                      onClick={() => setEditingCurriculumKeys(prev => ({ ...prev, [key]: true }))}
                      className={`px-2.5 py-0.5 rounded-full text-[12px] font-medium cursor-pointer select-none transition-all hover:opacity-80 shadow-sm ${
                        currentStatus.status === '진행'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : currentStatus.status === '통과'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : currentStatus.status === '불통'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                      }`}
                    >
                      {currentStatus.status}
                    </span>
                  )}
                  
                </div>
              </div>
            );
          })}
        </div>

        {progressList.length === 0 && (
          <div className="text-center py-4 border border-dashed border-zinc-150 rounded-2xl mt-2">
            <p className="text-xs font-semibold text-muted-foreground">커리큘럼을 추가해 주세요.</p>
          </div>
        )}
      </CardContent>

      <AttendanceDialog
        open={isAttendanceOpen}
        onOpenChange={setIsAttendanceOpen}
        studentName={student.name}
        onConfirm={handleAttendanceConfirm}
      />
    </Card>
  );
};

export default StudentCard;
