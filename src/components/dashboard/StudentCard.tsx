import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Student, Curriculum, DashboardData } from '../../types';
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
  setData?: React.Dispatch<React.SetStateAction<DashboardData | null>>;
}

const StudentCard: React.FC<StudentCardProps> = ({ student, progressList, onRefresh, onSelectStudent, setData }) => {
  const [updating, setUpdating] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, { status?: string }>>({});
  const [writingConfirmItem, setWritingConfirmItem] = useState<Curriculum | null>(null);
  const [isEditingSubProgram, setIsEditingSubProgram] = useState(false);
  const [subProgramValue, setSubProgramValue] = useState(student.subProgram || '');
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [editingCurriculumKeys, setEditingCurriculumKeys] = useState<Record<string, boolean>>({});

  const handleAttendanceConfirm = async (isAttending: boolean, dismissalTime: string) => {
    // 1. Optimistically update local state immediately
    if (setData) {
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          students: prev.students.map(s => {
            if (s.name === student.name) {
              return {
                ...s,
                isAttending,
                dismissalTime
              };
            }
            return s;
          })
        };
      });
    }

    setIsAttendanceOpen(false);
    toast.success(MESSAGES.students.attendanceSuccess(student.name, isAttending));

    // Background call
    attendanceApi.update({ name: student.name, isAttending, dismissalTime })
      .then(() => {
        onRefresh(); // silent sync
      })
      .catch((error: any) => {
        toast.error(`출결 저장 실패: ${error.message}`);
        onRefresh(); // rollback/resync on error
      });
  };

  const handleSubProgramUpdate = () => {
    // 1. Optimistically update local state immediately
    if (setData) {
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          students: prev.students.map(s => {
            if (s.name === student.name) {
              return { ...s, subProgram: subProgramValue };
            }
            return s;
          })
        };
      });
    }

    setIsEditingSubProgram(false);
    toast.success(MESSAGES.dashboard.subprogramUpdated);

    // Background call
    studentApi.update(student.name, { subProgram: subProgramValue })
      .then(() => {
        onRefresh();
      })
      .catch((error: any) => {
        toast.error(`세부프로그램 저장 실패: ${error.message}`);
        onRefresh(); // rollback/resync on error
      });
  };

  const handleAddToWritingStatus = (item: Curriculum) => {
    setWritingConfirmItem(null);
    toast.success(MESSAGES.dashboard.writingTrackerAdded);

    // Background call
    writingStatusApi.update({ 
      name: student.name, 
      bookTitle: item.bookTitle,
      progress: '완료' 
    })
      .then(() => {
        onRefresh();
      })
      .catch((error: any) => {
        toast.error(`글쓰기 추가 실패: ${error.message}`);
        onRefresh(); // rollback/resync on error
      });
  };

  const handleCheckout = () => {
    // 1. Optimistically update local state immediately
    if (setData) {
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          students: prev.students.map(s => {
            if (s.name === student.name) {
              return {
                ...s,
                isAttending: false
              };
            }
            return s;
          })
        };
      });
    }

    toast.success(MESSAGES.dashboard.dismissalSuccess(student.name));

    // Background call
    attendanceApi.update({ name: student.name, isAttending: false })
      .then(() => {
        onRefresh();
      })
      .catch((error: any) => {
        toast.error(`하원 처리 실패: ${error.message}`);
        onRefresh(); // rollback/resync on error
      });
  };

  const handleHomework = (isDone: boolean) => {
    // 1. Optimistically update local state immediately
    if (setData) {
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          students: prev.students.map(s => {
            if (s.name === student.name) {
              const previousChecked = s.homeworkChecked;
              const previousMissedToday = s.homeworkMissedToday;
              let currentMissedCount = s.homeworkMissed;
              
              if (isDone) {
                // If it was marked as missed before, decrement missed count
                if (previousChecked && previousMissedToday) {
                  currentMissedCount = Math.max(0, s.homeworkMissed - 1);
                }
              } else {
                // If it wasn't marked as missed before, increment missed count
                if (!previousChecked || !previousMissedToday) {
                  currentMissedCount = s.homeworkMissed + 1;
                }
              }

              return {
                ...s,
                homeworkChecked: true,
                homeworkMissedToday: !isDone,
                homeworkMissed: currentMissedCount
              };
            }
            return s;
          })
        };
      });
    }

    toast.success(isDone ? MESSAGES.dashboard.homeworkDone : MESSAGES.dashboard.homeworkNotSubmitted);

    // Background call
    homeworkApi.update({ name: student.name, isDone })
      .then(() => {
        onRefresh();
      })
      .catch((error: any) => {
        toast.error(`숙제 상태 저장 실패: ${error.message}`);
        onRefresh(); // rollback/resync on error
      });
  };

  const handleStatusUpdate = (bookId: string, index: number, forcedStatus?: string) => {
    const key = `${student.name}-${bookId}-${index}`;
    const statusVal = forcedStatus || localStatuses[key]?.status || progressList.find(item => item.bookId === bookId && item.index === index)?.status;
    if (!statusVal) return;

    if (forcedStatus) {
      setLocalStatuses(prev => ({
        ...prev,
        [key]: { ...prev[key], status: forcedStatus }
      }));
    }

    // 1. Optimistically update local state immediately
    if (setData) {
      setData(prev => {
        if (!prev) return prev;

        let updatedStudents = prev.students;
        const previousItem = prev.curriculums.find(c => c.studentName === student.name && c.bookId === bookId && c.index === index);

        if (previousItem && previousItem.status !== statusVal) {
          const isBook = bookId && bookId.trim() !== '' && bookId.trim() !== '-';
          if (isBook) {
            updatedStudents = prev.students.map(s => {
              if (s.name === student.name) {
                let diff = 0;
                if (statusVal === '통과' && previousItem.status !== '통과') diff = 1;
                else if (previousItem.status === '통과' && statusVal !== '통과') diff = -1;

                return {
                  ...s,
                  booksCompleted: Math.max(0, s.booksCompleted + diff)
                };
              }
              return s;
            });
          }
        }

        return {
          ...prev,
          students: updatedStudents,
          curriculums: prev.curriculums.map(c => {
            if (c.studentName === student.name && c.bookId === bookId && c.index === index) {
              return { ...c, status: statusVal as any };
            }
            return c;
          })
        };
      });
    }

    setEditingCurriculumKeys(prev => ({ ...prev, [key]: false }));
    toast.success(MESSAGES.dashboard.progressUpdated);

    // Background call
    curriculumApi.update({ 
      studentName: student.name, 
      bookId, 
      status: statusVal,
      originalIndex: index
    })
      .then(() => {
        onRefresh();
      })
      .catch((error: any) => {
        toast.error(`진도 저장 실패: ${error.message}`);
        onRefresh(); // rollback/resync on error
      });
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
               {student.noHomework ? (
                 <span className="text-sm font-medium text-zinc-400 block">숙제 없음</span>
               ) : (
                 <p className="text-sm font-medium text-foreground">
                   숙제 미수행 <span className={student.homeworkMissed > 0 ? 'text-destructive' : ''}>{student.homeworkMissed}회</span>
                 </p>
               )}
            </div>
            {!student.noHomework && (
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
            )}
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
            const isCompleted = currentStatus.status === '통과';

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
                        : isCompleted
                          ? 'text-emerald-600 bg-emerald-50 border border-emerald-100 font-semibold'
                          : isWriting 
                            ? 'text-purple-600 hover:bg-purple-50'
                            : isProgressing
                              ? 'text-blue-600 hover:bg-blue-50'
                              : 'text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50'
                    }`}
                    onClick={() => handleStatusUpdate(item.bookId, item.index, '통과')}
                    disabled={updating === key}
                    title="통과로 바로 저장"
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
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-full text-primary hover:bg-primary/10 transition-all flex items-center justify-center cursor-pointer border border-zinc-100/75"
                        onClick={() => handleStatusUpdate(item.bookId, item.index)}
                        disabled={updating === key}
                        title="저장"
                      >
                        <Save className="w-3.5 h-3.5 stroke-[2]" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all flex items-center justify-center cursor-pointer border border-zinc-100/75"
                        onClick={() => setEditingCurriculumKeys(prev => ({ ...prev, [key]: false }))}
                        title="취소"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                      <select 
                        className={`bg-white border rounded-full px-2 py-0.5 text-[12px] font-medium focus:ring-1 outline-none shadow-sm ${
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
                    </div>
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
