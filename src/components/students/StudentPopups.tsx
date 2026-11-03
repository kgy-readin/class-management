import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowUpCircle, Trash2, Pencil, Plus, UserCog, SquareCheckBig, Loader2, RefreshCw, ChevronDown } from 'lucide-react';
import { getWeeksSince } from '@/lib/utils';
import BookSearch from './BookSearch';
import { toast } from 'sonner';
import { studentApi, taskApi, bookApi } from '@/src/services/api';
import { MESSAGES, TITLES } from '@/src/constants/messages';
import { Student, DashboardData } from '../../types';

const getCurrentTimeHHMM = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const GRADE_OPTIONS = [
  { label: '유7', value: '유7' },
  { label: '초1', value: '초1' },
  { label: '초2', value: '초2' },
  { label: '초3', value: '초3' },
  { label: '초4', value: '초4' },
  { label: '초5', value: '초5' },
  { label: '초6', value: '초6' },
  { label: '중1', value: '중1' },
  { label: '중2', value: '중2' },
  { label: '중3', value: '중3' },
];

const LEVEL_OPTIONS = [
  { label: '기초', value: '0' },
  { label: 'Lv.1', value: '1' },
  { label: 'Lv.2', value: '2' },
  { label: 'Lv.3', value: '3' },
  { label: 'Lv.4', value: '4' },
  { label: 'Lv.5', value: '5' },
  { label: 'Lv.6', value: '6' },
  { label: 'Lv.7', value: '7' },
  { label: 'Lv.8', value: '8' },
  { label: 'Lv.9', value: '9' },
  { label: 'Lv.10', value: '10' },
];

const MARATHON_OPTIONS = ['1코스', '2코스', '어휘', '사실', '추론', '비판', '4코스'];

interface PopupSelectProps {
  options: { label: string; value: string }[];
  selectedValue: string;
  onChange: (value: string) => void;
  placeholder: string;
}

function PopupSelect({ options, selectedValue, onChange, placeholder }: PopupSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectedOption = options.find((opt) => opt.value === selectedValue || opt.label === selectedValue);
  const buttonText = selectedOption ? selectedOption.label : (selectedValue ? selectedValue : placeholder);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-normal focus:ring-2 focus:ring-primary/20 outline-none flex items-center justify-between text-left cursor-pointer w-full text-neutral-700 hover:border-neutral-300 transition-colors"
      >
        <span className="truncate">{buttonText}</span>
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform shrink-0 ml-1 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-neutral-200 shadow-xl rounded-lg p-1.5 max-h-[220px] overflow-y-auto">
          {options.map((option) => {
            const isSelected = selectedValue === option.value || selectedValue === option.label;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 hover:bg-neutral-50 rounded-md cursor-pointer transition-colors text-sm font-medium select-none flex items-center justify-between ${
                  isSelected ? 'bg-primary/5 text-primary font-bold' : 'text-zinc-700'
                }`}
              >
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

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
    readingMarathon?: string;
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
  const [readingMarathon, setReadingMarathon] = useState('');
  const [subProgram, setSubProgram] = useState('');
  const [attendanceDays, setAttendanceDays] = useState<string[]>([]);
  const [booksCompleted, setBooksCompleted] = useState<number>(0);

  useEffect(() => {
    if (open) {
      setName('');
      setGrade('');
      setLevel('1');
      setReadingMarathon('');
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
      readingMarathon,
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
                <PopupSelect
                  options={GRADE_OPTIONS}
                  selectedValue={grade}
                  onChange={setGrade}
                  placeholder="학년 선택"
                />
              </div>

              <div className="space-y-1">
                <PopupSelect
                  options={LEVEL_OPTIONS}
                  selectedValue={level}
                  onChange={setLevel}
                  placeholder="레벨 선택"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="grid grid-cols-7 gap-1 pt-1">
                {MARATHON_OPTIONS.map((opt) => {
                  const isSelected = readingMarathon
                    .split(/[,/]/)
                    .map((s) => s.trim())
                    .includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        let list = readingMarathon
                          ? readingMarathon.split(/[,/]/).map((s) => s.trim()).filter(Boolean)
                          : [];
                        if (list.includes(opt)) {
                          list = list.filter((item) => item !== opt);
                        } else {
                          list.push(opt);
                        }
                        list.sort((a, b) => {
                          const idxA = MARATHON_OPTIONS.indexOf(a);
                          const idxB = MARATHON_OPTIONS.indexOf(b);
                          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                          if (idxA !== -1) return -1;
                          if (idxB !== -1) return 1;
                          return a.localeCompare(b);
                        });
                        setReadingMarathon(list.join(', '));
                      }}
                      className={`h-9 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-primary border-primary text-white shadow-sm font-bold'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
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
        <div className="w-full px-5 pt-4 pb-4 min-h-0 min-[370px]:px-6 min-[370px]:pt-5 min-[370px]:pb-5 sm:px-10 sm:pt-9 sm:pb-9 flex flex-col items-center text-center space-y-5 sm:space-y-7">
          <div className="space-y-2">
            <h3 className="text-xl min-[370px]:text-[22px] font-bold text-foreground tracking-tight">{studentName} 학생 등원</h3>
          </div>
          
          <div className="w-full space-y-4 min-[370px]:space-y-5 px-1 text-left">
            <div className="grid grid-cols-2 gap-3 min-[370px]:gap-4 w-full items-center">
              <div className="flex flex-col items-center w-full">
                <Input 
                  type="time" 
                  value={arrivalTime}
                  onChange={(e) => handleArrivalTimeChange(e.target.value)}
                  className="w-full rounded-2xl h-[66px] min-[370px]:h-[72px] border-border/40 bg-secondary/10 focus:ring-4 focus:ring-primary/10 focus:bg-white text-center font-bold text-base min-[370px]:text-lg tracking-wide transition-all"
                />
              </div>

              <div className="flex flex-col items-center justify-center gap-1 w-full">
                <div className="grid grid-cols-2 gap-1.5 w-full">
                  {[15, 30, 60, 90].map((min) => (
                    <Button
                      key={min}
                      type="button"
                      variant="outline"
                      onClick={() => handleAddMinutes(min)}
                      className="h-[30px] min-[370px]:h-[33px] text-[12px] min-[370px]:text-[13px] font-bold p-0 rounded-lg border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:text-black transition-colors"
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
    isHidden?: boolean;
    name: string;
    grade: string;
    level?: string;
    readingMarathon?: string;
    subProgram?: string;
    attendanceDays?: string;
    homeworkMissed?: number;
    booksCompleted?: number;
    lastResultDate?: string;
    noHomework?: boolean;
  } | null;
  onSave: (data: {
    isHidden?: boolean;
    grade: string;
    level: string;
    readingMarathon?: string;
    subProgram: string;
    attendanceDays: string[];
    homeworkMissed: number;
    booksCompleted: number;
    lastResultDate: string;
    noHomework?: boolean;
  }) => Promise<void>;
  isSaving: boolean;
  setData?: React.Dispatch<React.SetStateAction<DashboardData | null>>;
  onRefresh?: () => void;
}

export function StudentEditInfoDialog({ open, onOpenChange, student, onSave, isSaving, setData, onRefresh }: StudentEditInfoDialogProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [grade, setGrade] = useState('');
  const [level, setLevel] = useState('0');
  const [readingMarathon, setReadingMarathon] = useState('');
  const [subProgram, setSubProgram] = useState('');
  const [attendanceDays, setAttendanceDays] = useState<string[]>([]);
  const [homeworkMissed, setHomeworkMissed] = useState<number>(0);
  const [booksCompleted, setBooksCompleted] = useState<number>(0);
  const [lastResultDate, setLastResultDate] = useState('');
  const [noHomework, setNoHomework] = useState(false);
  const [isProcessingTask, setIsProcessingTask] = useState(false);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [isLevelUpConfirmOpen, setIsLevelUpConfirmOpen] = useState(false);

  useEffect(() => {
    if (student) {
      setIsHidden(student.isHidden || false);
      setGrade(student.grade || '');
      setLevel(student.level || '0');
      setReadingMarathon(student.readingMarathon || '');
      setSubProgram(student.subProgram || '');
      setAttendanceDays(
        student.attendanceDays
          ? student.attendanceDays.split(',').map(s => s.trim()).filter(Boolean)
          : []
      );
      setHomeworkMissed(student.homeworkMissed || 0);
      setBooksCompleted(student.booksCompleted || 0);
      setLastResultDate(student.lastResultDate || '');
      setNoHomework(student.noHomework || false);
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

      // 2. Local/Optimistic UI state update
      setLastResultDate(todayLocalDate);
      if (setData) {
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            students: prev.students.map(s => {
              if (s.name === student.name) {
                return { ...s, lastResultDate: todayLocalDate };
              }
              return s;
            })
          };
        });
      }

      // 3. Fetch tasks
      const tasks = await taskApi.get();

      // 4. Find matching task: category === '결과물' && name === student.name && status === '예정'
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

      // 5. Update student's lastResultDate in sheet database
      await studentApi.update(student.name, {
        lastResultDate: todayLocalDate
      });

      // 6. Show success toast notification
      toast.success(MESSAGES.students.resultDistributionSuccess(student.name));

      // 7. Call onRefresh callback if present
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
    const nextLevel = String((parseInt(level) || 0) + 1);
    try {
      // Local/Optimistic update
      setLevel(nextLevel);
      setBooksCompleted(0);
      if (setData) {
        setData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            students: prev.students.map(s => {
              if (s.name === student.name) {
                return { ...s, level: nextLevel, booksCompleted: 0 };
              }
              return s;
            })
          };
        });
      }

      await studentApi.levelUp(student.name);
      toast.success(MESSAGES.students.levelUpSuccess(student.name));
      setIsLevelUpConfirmOpen(false);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      toast.error(MESSAGES.general.actionError(error.message));
    } finally {
      setIsLevelingUp(false);
    }
  };

  const handleSave = () => {
    onSave({
      isHidden,
      grade,
      level,
      readingMarathon,
      subProgram,
      attendanceDays,
      homeworkMissed,
      booksCompleted,
      lastResultDate,
      noHomework
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] border-none shadow-2xl p-6 bg-white">
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-solid border-zinc-100 pb-3 text-left">
            <h3 className="text-[19px] font-bold text-zinc-800">{student?.name} 학생 정보 수정</h3>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1 rounded-lg transition-colors select-none mr-4" title={TITLES.students.hideStudent}>
              <input
                type="checkbox"
                checked={isHidden}
                onChange={(e) => setIsHidden(e.target.checked)}
                className="w-3.5 h-3.5 text-primary focus:ring-primary border-neutral-300 rounded cursor-pointer"
              />
              숨김
            </label>
          </div>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <PopupSelect
                  options={GRADE_OPTIONS}
                  selectedValue={grade}
                  onChange={setGrade}
                  placeholder="학년 선택"
                />
              </div>

              <div className="space-y-1">
                <PopupSelect
                  options={LEVEL_OPTIONS}
                  selectedValue={level}
                  onChange={setLevel}
                  placeholder="레벨 선택"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="grid grid-cols-7 gap-1 pt-1">
                {MARATHON_OPTIONS.map((opt) => {
                  const isSelected = readingMarathon
                    .split(/[,/]/)
                    .map((s) => s.trim())
                    .includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        let list = readingMarathon
                          ? readingMarathon.split(/[,/]/).map((s) => s.trim()).filter(Boolean)
                          : [];
                        if (list.includes(opt)) {
                          list = list.filter((item) => item !== opt);
                        } else {
                          list.push(opt);
                        }
                        list.sort((a, b) => {
                          const idxA = MARATHON_OPTIONS.indexOf(a);
                          const idxB = MARATHON_OPTIONS.indexOf(b);
                          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                          if (idxA !== -1) return -1;
                          if (idxB !== -1) return 1;
                          return a.localeCompare(b);
                        });
                        setReadingMarathon(list.join(', '));
                      }}
                      className={`h-9 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-primary border-primary text-white shadow-sm font-bold'
                          : 'border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
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
               <div className="flex items-center gap-2 flex-1">
                 <div className="flex-1">
                   <Input
                     type="number"
                     min="0"
                     placeholder={noHomework ? "숙제 없음" : "숙제 미수행 없음"}
                     value={homeworkMissed === 0 ? '' : homeworkMissed}
                     onChange={(e) => {
                       const val = e.target.value;
                       setHomeworkMissed(val === '' ? 0 : Number(val));
                     }}
                     className="rounded-xl h-10 border-neutral-200 text-sm placeholder:text-neutral-400 w-full disabled:opacity-100 disabled:bg-transparent"
                     disabled={noHomework}
                   />
                 </div>

                 <div className="w-10 h-10 shrink-0 flex items-center justify-center border border-neutral-200 rounded-xl bg-white" title={TITLES.students.noHomework}>
                   <label className="w-full h-full flex items-center justify-center cursor-pointer">
                     <input
                       type="checkbox"
                       checked={noHomework}
                       onChange={(e) => setNoHomework(e.target.checked)}
                       className="w-[18px] h-[18px] text-primary focus:ring-primary border-neutral-300 rounded cursor-pointer"
                     />
                   </label>
                 </div>

                 <div className="flex-1">
                   <Input
                     type="number"
                     min="0"
                     placeholder="완독 권수"
                     value={booksCompleted}
                     onChange={(e) => setBooksCompleted(Number(e.target.value) || 0)}
                     className="rounded-xl h-10 border-neutral-200 text-sm w-full"
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
                 title={TITLES.students.levelUp}
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
                  title={TITLES.students.distributeResult}
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
  level?: string;
  readingMarathon?: string;
  books: any[];
  existingBookIds: string[];
  onSelect: (book: any) => void;
  onRefreshBooks?: () => Promise<void>;
}

export function AddCurriculumDialog({ 
  open, 
  onOpenChange, 
  studentName, 
  level,
  readingMarathon,
  books, 
  existingBookIds, 
  onSelect, 
  onRefreshBooks 
}: AddCurriculumDialogProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const formatDisplayLevel = (lvl: any) => {
    const l = String(lvl ?? '').trim();
    if (!l || l === '0' || l === '0.0' || l === 'null' || l === 'undefined' || l === '기초') return '기초';
    if (l === '11' || l === '구연동화') return '구연동화';
    const digits = l.replace(/[^0-9.]/g, '');
    if (digits) {
      return `Lv.${digits}`;
    }
    return l;
  };

  const displayLevel = level !== undefined && level !== null && String(level).trim() !== '' ? formatDisplayLevel(level) : '';
  const marathon = readingMarathon ? readingMarathon.trim() : '';
  const badgeText = [displayLevel, marathon].filter(Boolean).join(' ');

  const [filterPreset, setFilterPreset] = useState<{ level?: string; readingMarathon?: string; timestamp: number } | null>(null);

  const handleBadgeDoubleClick = () => {
    setFilterPreset({
      level,
      readingMarathon,
      timestamp: Date.now()
    });
    toast.success(MESSAGES.students.filterAutoSelected);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      if (onRefreshBooks) {
        await onRefreshBooks();
      } else {
        await bookApi.get(true);
      }
      toast.success(MESSAGES.students.bookSyncSuccess);
    } catch (error) {
      console.error('Failed to sync books:', error);
      toast.error(MESSAGES.students.bookSyncError);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl bg-white p-6">
        <DialogHeader className="flex flex-row items-center justify-between pr-6">
          <div className="flex items-center gap-2 mt-2 ml-1 flex-wrap">
            <DialogTitle className="text-[21px] font-bold leading-tight">{studentName} 학생 도서 추가</DialogTitle>
            {badgeText && (
              <span
                onDoubleClick={handleBadgeDoubleClick}
                title={TITLES.students.filterAutoSelect}
                className="text-[16px] font-normal text-neutral-500 bg-neutral-50 hover:bg-neutral-100 hover:text-neutral-700 border border-neutral-200/80 hover:border-neutral-300 rounded-xl px-2.5 py-0.5 inline-flex items-center whitespace-nowrap cursor-pointer transition-all select-none"
              >
                {badgeText}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            title={TITLES.students.syncBooks}
            aria-label="구글 시트 도서목록 동기화"
            className="p-2 rounded-xl border border-neutral-200 hover:border-neutral-300 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-all disabled:opacity-50 mt-1 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-primary' : ''}`} />
          </button>
        </DialogHeader>
        <div className="pt-2">
          <BookSearch 
            books={books} 
            existingBookIds={existingBookIds}
            filterPreset={filterPreset}
            onSelect={(selectedBook) => {
              onSelect(selectedBook);
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
