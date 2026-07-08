import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowUpCircle, Trash2, Pencil, Plus, UserCog, SquareCheckBig, Loader2 } from 'lucide-react';
import { getWeeksSince } from '@/lib/utils';
import BookSearch from './BookSearch';
import { toast } from 'sonner';
import { studentApi, taskApi } from '@/src/services/api';
import { MESSAGES } from '@/src/constants/messages';

const getCurrentTimeHHMM = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

// ----------------------------------------------------
// 1. 일괄하원 팝업
// ----------------------------------------------------
interface BulkDismissDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
}

export function BulkDismissDialog({ open, onOpenChange, onConfirm, isSubmitting }: BulkDismissDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-250">
        <div className="p-8 text-center space-y-6">
          <div className="w-[54px] h-[54px] bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-[27px] h-[27px] text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">일괄 하원</h3>
            <p className="text-sm text-zinc-600 font-normal leading-relaxed">
              정말로 모든 등원 중인 학생들을<br />
              일괄 하원 처리하시겠습니까?
            </p>
          </div>
          <div className="flex gap-3">
            <DialogClose render={
              <Button className="flex-1 h-12 rounded-2xl bg-zinc-100/80 hover:bg-zinc-200/80 text-zinc-500 font-bold border-none cursor-pointer">
                취소
              </Button>
            } />
            <Button 
              variant="destructive"
              className="flex-1 h-12 rounded-2xl font-bold shadow-lg shadow-destructive/20 cursor-pointer"
              onClick={onConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? '처리 중...' : '하원'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------
// 2. 학생 추가 팝업
// ----------------------------------------------------
interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: {
    name: string;
    grade: string;
    level: string;
    subProgram: string;
    attendanceDays: string[];
    booksCompleted: number;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export function AddStudentDialog({ open, onOpenChange, onAdd, isSubmitting }: AddStudentDialogProps) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [level, setLevel] = useState('1');
  const [subProgram, setSubProgram] = useState('');
  const [attendanceDays, setAttendanceDays] = useState<string[]>([]);
  const [booksCompleted, setBooksCompleted] = useState<number>(0);

  useEffect(() => {
    if (open) {
      setName('');
      setGrade('');
      setLevel('1');
      setSubProgram('');
      setAttendanceDays([]);
      setBooksCompleted(0);
    }
  }, [open]);

  const handleSubmit = () => {
    onAdd({
      name,
      grade,
      level,
      subProgram,
      attendanceDays,
      booksCompleted
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] border-none shadow-2xl p-6 bg-white">
        <div className="space-y-5">
          <div className="text-left border-b border-solid border-zinc-100 pb-3">
            <h3 className="text-[19px] font-bold text-zinc-800">새로운 학생 등록</h3>
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <Input
                placeholder="이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl h-10 border-neutral-200 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 h-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer text-neutral-700"
                >
                  <option value="" disabled hidden>학년 선택</option>
                  <option value="유7">유7</option>
                  <option value="초1">초1</option>
                  <option value="초2">초2</option>
                  <option value="초3">초3</option>
                  <option value="초4">초4</option>
                  <option value="초5">초5</option>
                  <option value="초6">초6</option>
                  <option value="중1">중1</option>
                  <option value="중2">중2</option>
                  <option value="중3">중3</option>
                </select>
              </div>

              <div className="space-y-1">
                <select 
                  value={level} 
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 h-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer text-neutral-700"
                >
                  <option value="" disabled hidden>레벨 선택</option>
                  <option value="0">기초</option>
                  <option value="1">Lv.1</option>
                  <option value="2">Lv.2</option>
                  <option value="3">Lv.3</option>
                  <option value="4">Lv.4</option>
                  <option value="5">Lv.5</option>
                  <option value="6">Lv.6</option>
                  <option value="7">Lv.7</option>
                  <option value="8">Lv.8</option>
                  <option value="9">Lv.9</option>
                  <option value="10">Lv.10</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Input
                placeholder="서브프로그램 (예: 독해력, 어휘력)"
                value={subProgram}
                onChange={(e) => setSubProgram(e.target.value)}
                className="rounded-xl h-10 border-neutral-200 text-sm"
              />
            </div>

            <div className="space-y-1">
              <div className="grid grid-cols-6 gap-1.5 pt-1">
                {['월', '화', '수', '목', '금', '토'].map((day) => {
                  const isSelected = attendanceDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setAttendanceDays(attendanceDays.filter(d => d !== day));
                        } else {
                          setAttendanceDays([...attendanceDays, day]);
                        }
                      }}
                      className={`h-9 rounded-xl border text-sm font-semibold transition-all ${
                        isSelected
                          ? 'bg-primary border-primary text-white shadow-sm font-bold'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Input
                type="number"
                min="0"
                placeholder="완독권수 시작값 (기본: 0)"
                onChange={(e) => setBooksCompleted(Number(e.target.value) || 0)}
                className="rounded-xl h-10 border-neutral-200 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <DialogClose render={
              <Button 
                type="button"
                className="flex-1 h-11 rounded-xl bg-zinc-100/80 hover:bg-zinc-200/80 text-zinc-600 font-bold border-none cursor-pointer"
              >
                취소
              </Button>
            } />
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="flex-1 h-11 rounded-xl bg-blue-100/70 hover:bg-blue-200/70 text-primary font-bold shadow-lg shadow-blue-500/15 border border-solid border-white cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 active:outline-none disabled:opacity-50 disabled:shadow-none disabled:border-none"
            >
              {isSubmitting ? '등록 중...' : '학생 추가'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------
// 3. 학생 삭제 팝업
// ----------------------------------------------------
interface DeleteStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
}

export function DeleteStudentDialog({ open, onOpenChange, studentName, onConfirm, isSubmitting }: DeleteStudentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-250">
        <div className="p-8 text-center space-y-6">
          <div className="w-[54px] h-[54px] bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-[27px] h-[27px] text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">{studentName} 학생 삭제</h3>
            <p className="text-sm text-zinc-600 font-normal leading-relaxed">
              정말로 이 학생을 삭제하시겠습니까?<br />
              <span className="text-destructive font-semibold">학생 정보와 모든 커리큘럼 기록이 영구 삭제됩니다.</span>
            </p>
          </div>
          <div className="flex gap-3">
            <DialogClose render={
              <Button className="flex-1 h-12 rounded-2xl bg-zinc-100/80 hover:bg-zinc-200/80 text-zinc-500 font-bold border-none cursor-pointer">
                취소
              </Button>
            } />
            <Button 
              variant="destructive"
              className="flex-1 h-12 rounded-2xl font-bold shadow-lg shadow-destructive/20 cursor-pointer"
              onClick={onConfirm}
              disabled={isSubmitting}
            >
              삭제
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------
// 4. 등원 팝업
// ----------------------------------------------------
interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  onConfirm: (isAttending: boolean, dismissalTime: string) => Promise<void>;
}

export function AttendanceDialog({ open, onOpenChange, studentName, onConfirm }: AttendanceDialogProps) {
  const [arrivalTime, setArrivalTime] = useState('');
  const [dismissalTime, setDismissalTime] = useState('');
  const [addedMinutes, setAddedMinutes] = useState(0);

  useEffect(() => {
    if (open) {
      const nowHHMM = getCurrentTimeHHMM();
      setArrivalTime(nowHHMM);
      setDismissalTime(nowHHMM);
      setAddedMinutes(0);
    }
  }, [open]);

  const handleArrivalTimeChange = (val: string) => {
    setArrivalTime(val);
    setDismissalTime(val);
    setAddedMinutes(0);
  };

  const handleAddMinutes = (min: number) => {
    setAddedMinutes(prev => {
      const newMins = prev + min;
      const [hh, mm] = arrivalTime.split(':').map(Number);
      const targetDate = new Date();
      targetDate.setHours(hh);
      targetDate.setMinutes(mm + newMins);
      const targetHH = String(targetDate.getHours()).padStart(2, '0');
      const targetMM = String(targetDate.getMinutes()).padStart(2, '0');
      setDismissalTime(`${targetHH}:${targetMM}`);
      return newMins;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-[400px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
        <div className="w-full p-5 min-h-0 min-[370px]:p-6 sm:p-10 flex flex-col items-center text-center space-y-5 sm:space-y-7">
          <div className="space-y-2">
            <h3 className="text-xl min-[370px]:text-[22px] font-bold text-foreground tracking-tight">{studentName} 학생 등원</h3>
          </div>
          
          <div className="w-full space-y-4 min-[370px]:space-y-5 px-1 text-left">
            <div className="flex items-center justify-center gap-3 min-[370px]:gap-4 w-full">
              <div className="flex flex-col items-center">
                <Input 
                  type="time" 
                  value={arrivalTime}
                  onChange={(e) => handleArrivalTimeChange(e.target.value)}
                  className="w-[110px] min-[370px]:w-[125px] rounded-2xl h-[60px] min-[370px]:h-[68px] border-border/40 bg-secondary/10 focus:ring-4 focus:ring-primary/10 focus:bg-white text-center font-bold text-base min-[370px]:text-lg tracking-wide transition-all"
                />
              </div>

              <div className="flex flex-col items-center gap-1 flex-1 max-w-[180px]">
                <div className="grid grid-cols-3 gap-1 w-full">
                  {[15, 30, 60, 90, 120, 180].map((min) => (
                    <Button
                      key={min}
                      type="button"
                      variant="outline"
                      onClick={() => handleAddMinutes(min)}
                      className="h-7 min-[370px]:h-8 text-[11px] min-[370px]:text-[13px] font-bold p-0 rounded-lg border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-black transition-colors"
                    >
                      {min}
                    </Button>
                  ))}
                </div>
                {addedMinutes > 0 && (
                  <button 
                    type="button"
                    onClick={() => {
                      setAddedMinutes(0);
                      setDismissalTime(arrivalTime);
                    }}
                    className="text-[9px] min-[370px]:text-[10px] text-destructive hover:underline font-bold cursor-pointer mt-0.5"
                  >
                    +{addedMinutes}분 초기화
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 min-[370px]:gap-3 border-t border-solid border-zinc-100 pt-4">
              <label className="text-[13px] min-[370px]:text-[14px] font-medium text-[#427fe1] leading-tight text-center w-[70px] min-[370px]:w-[84px] shrink-0">
                하원 예정
              </label>
              <Input 
                type="time" 
                value={dismissalTime}
                onChange={(e) => setDismissalTime(e.target.value)}
                className="w-full max-w-[190px] min-[370px]:max-w-[216px] rounded-2xl h-10 min-[370px]:h-11 border-primary/20 bg-primary/5 focus:ring-4 focus:ring-primary/10 focus:bg-white text-center font-bold text-base min-[370px]:text-lg tracking-wider text-primary transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <DialogClose render={
              <Button 
                className="flex-1 h-12 rounded-2xl bg-zinc-100/80 hover:bg-zinc-200/80 text-zinc-500 font-bold border-none cursor-pointer"
              >
                취소
              </Button>
            } />
            <Button 
              className="flex-1 h-12 rounded-2xl bg-blue-100/70 hover:bg-blue-200/70 text-primary font-semibold shadow-lg shadow-blue-500/15 border border-solid border-white cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 active:outline-none disabled:opacity-50 disabled:shadow-none disabled:border-none"
              onClick={() => onConfirm(true, dismissalTime)}
            >
              등원
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------
// 5. 학생정보 수정 팝업 (통합 팝업)
// ----------------------------------------------------
interface StudentEditInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    name: string;
    grade: string;
    level?: string;
    subProgram?: string;
    attendanceDays?: string;
    homeworkMissed?: number;
    booksCompleted?: number;
    lastResultDate?: string;
  } | null;
  onSave: (data: {
    grade: string;
    level: string;
    subProgram: string;
    attendanceDays: string[];
    homeworkMissed: number;
    booksCompleted: number;
    lastResultDate: string;
  }) => Promise<void>;
  isSaving: boolean;
  onRefresh?: () => void;
}

export function StudentEditInfoDialog({ open, onOpenChange, student, onSave, isSaving, onRefresh }: StudentEditInfoDialogProps) {
  const [grade, setGrade] = useState('');
  const [level, setLevel] = useState('0');
  const [subProgram, setSubProgram] = useState('');
  const [attendanceDays, setAttendanceDays] = useState<string[]>([]);
  const [homeworkMissed, setHomeworkMissed] = useState<number>(0);
  const [booksCompleted, setBooksCompleted] = useState<number>(0);
  const [lastResultDate, setLastResultDate] = useState('');
  const [isProcessingTask, setIsProcessingTask] = useState(false);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [isLevelUpConfirmOpen, setIsLevelUpConfirmOpen] = useState(false);

  useEffect(() => {
    if (student) {
      setGrade(student.grade || '');
      setLevel(student.level || '0');
      setSubProgram(student.subProgram || '');
      setAttendanceDays(
        student.attendanceDays
          ? student.attendanceDays.split(',').map(s => s.trim()).filter(Boolean)
          : []
      );
      setHomeworkMissed(student.homeworkMissed || 0);
      setBooksCompleted(student.booksCompleted || 0);
      setLastResultDate(student.lastResultDate || '');
    }
  }, [student, open]);

  const handleTaskCompletion = async () => {
    if (!student) return;
    setIsProcessingTask(true);
    try {
      // 1. Get today's local date in YYYY-MM-DD
      const today = new Date();
      const offset = today.getTimezoneOffset() * 60000;
      const todayLocalDate = new Date(today.getTime() - offset).toISOString().split('T')[0];

      // 2. Fetch tasks
      const tasks = await taskApi.get();

      // 3. Find matching task: category === '결과물' && name === student.name && status === '예정'
      const matchingTask = tasks.find(t => 
        String(t.category).trim() === '결과물' && 
        String(t.name).trim() === student.name.trim() && 
        String(t.status).trim() === '예정'
      );

      if (matchingTask) {
        if (!matchingTask.sheetRowIndex) {
          throw new Error('할일의 행 번호를 찾을 수 없습니다.');
        }
        await taskApi.update(matchingTask.sheetRowIndex, {
          date: todayLocalDate,
          name: matchingTask.name,
          category: matchingTask.category,
          familyClass: matchingTask.familyClass || '',
          todo: matchingTask.todo,
          status: '완료',
          memo: matchingTask.memo || ''
        });
      } else {
        await taskApi.add({
          date: todayLocalDate,
          name: student.name,
          category: '결과물',
          familyClass: '',
          todo: `${student.name} 결과물 배부`,
          status: '완료',
          memo: ''
        });
      }

      // 4. Update student's lastResultDate in database immediately
      await studentApi.update(student.name, {
        lastResultDate: todayLocalDate
      });

      // 5. Update local state
      setLastResultDate(todayLocalDate);

      // 6. Show success toast notification
      toast.success(MESSAGES.students.resultDistributionSuccess(student.name));

      // 7. Call onRefresh callback if present to synchronize other parts of the dashboard
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      console.error('Error processing result task:', error);
      toast.error(MESSAGES.students.processingError(error.message));
    } finally {
      setIsProcessingTask(false);
    }
  };

  const handleLevelUpConfirm = async () => {
    if (!student) return;
    setIsLevelingUp(true);
    try {
      await studentApi.levelUp(student.name);
      toast.success(MESSAGES.students.levelUpSuccess(student.name));
      setLevel(String((parseInt(level) || 0) + 1));
      setBooksCompleted(0);
      setIsLevelUpConfirmOpen(false);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLevelingUp(false);
    }
  };

  const handleSave = () => {
    onSave({
      grade,
      level,
      subProgram,
      attendanceDays,
      homeworkMissed,
      booksCompleted,
      lastResultDate
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] border-none shadow-2xl p-6 bg-white">
        <div className="space-y-5">
          <div className="text-left border-b border-solid border-zinc-100 pb-3">
            <h3 className="text-[19px] font-bold text-zinc-800">{student?.name} 학생 정보 수정</h3>
          </div>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 h-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer text-neutral-700"
                >
                  <option value="" disabled hidden>학년 선택</option>
                  <option value="유7">유7</option>
                  <option value="초1">초1</option>
                  <option value="초2">초2</option>
                  <option value="초3">초3</option>
                  <option value="초4">초4</option>
                  <option value="초5">초5</option>
                  <option value="초6">초6</option>
                  <option value="중1">중1</option>
                  <option value="중2">중2</option>
                  <option value="중3">중3</option>
                </select>
              </div>

              <div className="space-y-1">
                <select 
                  value={level} 
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 h-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer text-neutral-700"
                >
                  <option value="" disabled hidden>레벨 선택</option>
                  <option value="0">기초</option>
                  <option value="1">Lv.1</option>
                  <option value="2">Lv.2</option>
                  <option value="3">Lv.3</option>
                  <option value="4">Lv.4</option>
                  <option value="5">Lv.5</option>
                  <option value="6">Lv.6</option>
                  <option value="7">Lv.7</option>
                  <option value="8">Lv.8</option>
                  <option value="9">Lv.9</option>
                  <option value="10">Lv.10</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Input
                placeholder="서브프로그램 (예: 독해력, 어휘력)"
                value={subProgram}
                onChange={(e) => setSubProgram(e.target.value)}
                className="rounded-xl h-10 border-neutral-200 text-sm"
              />
            </div>

            <div className="space-y-1">
              <div className="grid grid-cols-6 gap-1.5 pt-1">
                {['월', '화', '수', '목', '금', '토'].map((day) => {
                  const isSelected = attendanceDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setAttendanceDays(attendanceDays.filter(d => d !== day));
                        } else {
                          setAttendanceDays([...attendanceDays, day]);
                        }
                      }}
                      className={`h-9 rounded-xl border text-sm font-semibold transition-all ${
                        isSelected
                          ? 'bg-primary border-primary text-white shadow-sm font-bold'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="grid grid-cols-2 gap-3 flex-1">
                <div className="space-y-1">
                  <Input
                    type="number"
                    min="0"
                    placeholder="숙제 미수행 없음"
                    value={homeworkMissed === 0 ? '' : homeworkMissed}
                    onChange={(e) => {
                      const val = e.target.value;
                      setHomeworkMissed(val === '' ? 0 : Number(val));
                    }}
                    className="rounded-xl h-10 border-neutral-200 text-sm placeholder:text-neutral-400"
                  />
                </div>

                <div className="space-y-1">
                  <Input
                    type="number"
                    min="0"
                    placeholder="완독 권수"
                    value={booksCompleted}
                    onChange={(e) => setBooksCompleted(Number(e.target.value) || 0)}
                    className="rounded-xl h-10 border-neutral-200 text-sm"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isLevelingUp}
                onClick={() => setIsLevelUpConfirmOpen(true)}
                className="h-10 w-10 shrink-0 rounded-xl border-neutral-200 text-neutral-500 hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer flex items-center justify-center"
                title="레벨업 (커리큘럼 초기화)"
              >
                {isLevelingUp ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ArrowUpCircle className="w-5 h-5" />
                )}
              </Button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={lastResultDate}
                  onChange={(e) => setLastResultDate(e.target.value)}
                  className="rounded-xl h-10 border-neutral-200 text-sm flex-1 cursor-pointer"
                />
                <div className="w-24 shrink-0 text-center text-sm font-semibold text-neutral-700 bg-neutral-50 border border-neutral-200 h-10 flex items-center justify-center rounded-xl px-2">
                  {lastResultDate ? (
                    typeof getWeeksSince(lastResultDate) === 'number' ? (
                      `${getWeeksSince(lastResultDate)}주 전`
                    ) : (
                      '-'
                    )
                  ) : (
                    '-'
                  )}
                </div>
                <Button
                  id="btn-complete-result-task"
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isProcessingTask}
                  onClick={handleTaskCompletion}
                  className="h-10 w-10 shrink-0 rounded-xl border-neutral-200 text-neutral-500 hover:text-green-600 hover:bg-green-50 transition-all flex items-center justify-center cursor-pointer"
                  title="결과물 배부 완료 처리"
                >
                  {isProcessingTask ? (
                    <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                  ) : (
                    <SquareCheckBig className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <DialogClose render={
              <Button 
                type="button"
                className="flex-1 h-11 rounded-xl bg-zinc-100/80 hover:bg-zinc-200/80 text-zinc-600 font-bold border-none cursor-pointer"
              >
                취소
              </Button>
            } />
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 h-11 rounded-xl bg-blue-100/70 hover:bg-blue-200/70 text-primary font-bold shadow-lg shadow-blue-500/15 border border-solid border-white cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 active:outline-none disabled:opacity-50 disabled:shadow-none disabled:border-none"
            >
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
        <LevelUpDialog
          open={isLevelUpConfirmOpen}
          onOpenChange={setIsLevelUpConfirmOpen}
          studentName={student?.name || ''}
          currentLevel={level}
          onConfirm={handleLevelUpConfirm}
          isSubmitting={isLevelingUp}
        />
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------
// 6. 도서 기록 수정 팝업 (모바일 전용)
// ----------------------------------------------------
interface MobileEditCurriculumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    bookId: string;
    index: number;
    status: string;
    bookTitle: string;
  } | null;
  onSave: (
    bookId: string,
    originalIndex: number,
    data: { index: number; status: string; bookTitle: string }
  ) => Promise<void>;
  isSaving: boolean;
  statusOptions?: string[];
  extraActions?: React.ReactNode;
}

/* [모바일 전용 팝업] */
export function MobileEditCurriculumDialog({ 
  open, 
  onOpenChange, 
  item, 
  onSave, 
  isSaving,
  statusOptions = ['대기', '독서중', '독서완료', '글쓰기중', '글쓰기완료'],
  extraActions
}: MobileEditCurriculumDialogProps) {
  const [index, setIndex] = useState(1);
  const [status, setStatus] = useState('독서중');
  const [bookTitle, setBookTitle] = useState('');

  useEffect(() => {
    if (item) {
      setIndex(item.index);
      setStatus(item.status);
      setBookTitle(item.bookTitle);
    }
  }, [item, open]);

  const handleSave = () => {
    if (!item) return;
    onSave(item.bookId, item.index, { index, status, bookTitle });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[380px] rounded-[2.5rem] border-none shadow-2xl p-6 bg-white">
        <div className="space-y-5">
          <div className="text-left border-b border-solid border-zinc-100 pb-3">
            <h3 className="text-[19px] font-bold text-zinc-800">도서 기록 수정</h3>
          </div>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Input
                  type="number"
                  placeholder="순서"
                  value={index}
                  onChange={(e) => setIndex(parseInt(e.target.value) || 0)}
                  className="rounded-xl h-10 border-neutral-200 text-sm text-center"
                />
              </div>

              <div className="col-span-2">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-xl px-3 h-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer text-neutral-700"
                >
                  {statusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Input
                placeholder="도서명"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                className="rounded-xl h-10 border-neutral-200 text-sm"
              />
            </div>

            {/* Extra Actions if any */}
            {extraActions && (
              <div className="pt-1">
                {extraActions}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <DialogClose render={
              <Button 
                type="button"
                className="flex-1 h-11 rounded-xl bg-zinc-100/80 hover:bg-zinc-200/80 text-zinc-600 font-bold border-none cursor-pointer"
              >
                취소
              </Button>
            } />
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 h-11 rounded-xl bg-blue-100/70 hover:bg-blue-200/70 text-primary font-bold shadow-lg shadow-blue-500/15 border border-solid border-white cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 active:outline-none disabled:opacity-50 disabled:shadow-none disabled:border-none"
            >
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------
// 7. 도서 추가 팝업 (커리큘럼 추가 팝업)
// ----------------------------------------------------
interface AddCurriculumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  books: any[];
  existingBookIds: string[];
  onSelect: (bookTitle: string) => void;
}

export function AddCurriculumDialog({ open, onOpenChange, studentName, books, existingBookIds, onSelect }: AddCurriculumDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl bg-white p-6">
        <DialogHeader>
          <DialogTitle className="text-[21px] font-bold mt-2 ml-1">{studentName} 학생 도서 추가</DialogTitle>
        </DialogHeader>
        <div className="pt-2">
          <BookSearch 
            books={books} 
            existingBookIds={existingBookIds}
            onSelect={(bookTitle) => {
              onSelect(bookTitle);
            }} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------
// 8. 레벨업 팝업
// ----------------------------------------------------
interface LevelUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  currentLevel: string | number;
  onConfirm: () => Promise<void>;
  isSubmitting?: boolean;
}

export function LevelUpDialog({ open, onOpenChange, studentName, currentLevel, onConfirm, isSubmitting }: LevelUpDialogProps) {
  const targetLevel = (parseInt(String(currentLevel)) || 0) + 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white">
        <div className="p-8 text-center space-y-6">
          <div className="w-[54px] h-[54px] bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <ArrowUpCircle className="w-[27px] h-[27px] text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">{studentName} 학생 레벨업</h3>
            <p className="text-sm text-zinc-600 font-normal leading-relaxed">
              {studentName} 학생을 <span className="text-primary font-bold">{targetLevel}레벨</span>로 레벨업 하시겠습니까?<br />
              <span className="text-destructive font-semibold">레벨업 시 모든 커리큘럼 데이터가 삭제됩니다.</span>
            </p>
          </div>
          <div className="flex gap-3">
            <DialogClose render={
              <Button 
                type="button" 
                className="flex-1 h-12 rounded-2xl bg-zinc-100/80 hover:bg-zinc-200/80 text-zinc-500 font-bold border-none cursor-pointer"
              >
                취소
              </Button>
            } />
            <Button 
              className="flex-1 h-12 rounded-2xl bg-blue-100/70 hover:bg-blue-200/70 text-primary font-bold shadow-lg shadow-blue-500/15 border border-solid border-white cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 active:outline-none disabled:opacity-50 disabled:shadow-none disabled:border-none"
              onClick={onConfirm}
              disabled={isSubmitting}
            >
              확인
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
