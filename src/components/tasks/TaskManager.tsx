import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Task, Student, getTagColor } from '../../types';
import { toast } from 'sonner';
import { MESSAGES } from '@/src/constants/messages';
import { 
  Trash2, 
  Pencil, 
  Check, 
  X, 
  Plus, 
  ChevronDown, 
  ChevronRight,
  GripVertical,
  Filter
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, isThisWeek, startOfDay, addMonths, addDays, differenceInCalendarDays, startOfWeek, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { taskApi } from '@/src/services/api';
import { motion, AnimatePresence } from 'motion/react';
import NotesPanel from './NotesPanel';
import StudentCombobox from '../common/StudentCombobox';

import 'react-day-picker/dist/style.css';

interface TaskManagerProps {
  students: Student[];
  onRefreshGlobal?: () => void;
}

export default function TaskManager({ students = [], onRefreshGlobal }: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Expand/collapse state for basic view groups (Notion-style)
  const [expandedGroups, setExpandedGroups] = useState({
    todo: true,       // 예정
    inProgress: true, // 진행, 대기, 보류
    completed: false  // 완료, 취소
  });

  // Editing state
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Omit<Task, 'sheetRowIndex'>>({
    date: '',
    name: '',
    category: '기타',
    familyClass: '',
    todo: '',
    status: '예정',
    memo: ''
  });

  // Adding state directly inline
  const [reservingTask, setReservingTask] = useState<Task | null>(null);
  const [inlineAddGroup, setInlineAddGroup] = useState<'todo' | 'inProgress' | 'completed' | 'familyView' | null>(null);
  const [newForm, setNewForm] = useState<Omit<Task, 'sheetRowIndex'>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    name: '',
    category: '알림장',
    familyClass: '',
    todo: '',
    status: '예정',
    memo: ''
  });

  const [showFilters, setShowFilters] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const taskResult = await taskApi.get();
      setTasks(taskResult);
    } catch (error: any) {
      toast.error(MESSAGES.tasks.loadError(error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Helper to parse date strings
  const parseTaskDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    try {
      const cleaned = dateStr.replace(/\//g, '-').trim();
      const parsed = new Date(cleaned);
      if (!isNaN(parsed.getTime())) return parsed;
      return null;
    } catch {
      return null;
    }
  };

  // Safe checks for overdue task
  const isTaskOverdue = (taskDateStr: string, status: string): boolean => {
    if (!taskDateStr) return false;
    if (status === '완료' || status === '취소') return false;
    const d = parseTaskDate(taskDateStr);
    if (!d) return false;
    const today = startOfDay(new Date());
    return startOfDay(d) < today;
  };

  // Strict check if task is before today (strictly, before today for Family View styling)
  const isTaskDateBeforeToday = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const d = parseTaskDate(dateStr);
    if (!d) return false;
    const today = startOfDay(new Date());
    return startOfDay(d) < today;
  };

  // Family View date text color styling based on overdue days:
  // 1~30 days overdue -> blue text, 31+ days overdue -> red text, else normal text color
  const getFamilyTaskDateClass = (dateStr: string): string => {
    if (!dateStr) return 'text-zinc-600';
    const d = parseTaskDate(dateStr);
    if (!d) return 'text-zinc-600';
    const today = startOfDay(new Date());
    const taskDate = startOfDay(d);
    
    if (taskDate < today) {
       const diffTime = today.getTime() - taskDate.getTime();
       const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
       if (diffDays >= 1 && diffDays <= 30) {
         return 'text-blue-600/90 font-medium';
       } else if (diffDays >= 31) {
         return 'text-red-600/90 font-medium';
       }
    }
    return 'text-zinc-600';
  };

  // Check if dates match selected filter date
  const isDateMatchingFilter = (taskDateStr: string): boolean => {
    if (!selectedDate) return true;
    const d = parseTaskDate(taskDateStr);
    if (!d) return false;
    return isSameDay(d, selectedDate);
  };

  // Interaction handlers for Mutual Exclusion filtering (중복 필터링 금지)
  const handleDateSelect = (d: Date | undefined) => {
    setSelectedDate(d);
    setSelectedStudent(null); // Clear student filter
  };

  const handleStudentSelect = (studentName: string | null) => {
    setSelectedStudent(studentName);
    setSelectedDate(undefined); // Clear date filter
  };

  // Ranks for sorting
  const categoryRank: Record<string, number> = {
    '긴급': 1,
    '중요': 2,
    '가통': 3,
    '알림장': 4,
    '결과물': 5,
    '보고': 6,
    '반복': 7,
    '기타': 8
  };

  const statusRank: Record<string, number> = {
    '예정': 1,
    '진행': 2,
    '대기': 3,
    '보류': 4,
    '완료': 5,
    '취소': 6
  };

  const familyClassRank: Record<string, number> = {
    '첫날': 1,
    '한달': 2,
    '정기': 3,
    '중등': 4
  };

  // Base logic to filter and sort Basic View
  const getFilteredBasicTasks = () => {
    const today = new Date();

    if (selectedDate || selectedStudent) {
      return tasks.filter(task => {
        let matches = true;
        if (selectedDate) {
          matches = matches && isDateMatchingFilter(task.date);
        }
        if (selectedStudent) {
          matches = matches && task.name === selectedStudent;
        }
        return matches;
      }).sort((a, b) => {
        if (a.date && b.date) {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
        }
        const rankCatA = categoryRank[a.category] || 9;
        const rankCatB = categoryRank[b.category] || 9;
        if (rankCatA !== rankCatB) return rankCatA - rankCatB;
        return (statusRank[a.status] || 7) - (statusRank[b.status] || 7);
      });
    }

    // Default View: Apply 7 rules
    return tasks.filter(task => {
      const d = parseTaskDate(task.date);
      const isThisW = d ? isThisWeek(d, { weekStartsOn: 1 }) : false;
      const category = task.category || '';
      const familyClass = task.familyClass || '';
      const status = task.status || '예정';
      const isCompleted = status === '완료' || status === '취소';
      const isOverdue = d ? startOfDay(d) < startOfDay(today) : false;

      const rule1 = isThisW && category !== '가통';
      const rule2 = isThisW && category === '가통' && isCompleted;
      const rule3 = (familyClass === '정기' || familyClass === '중등') && (status === '진행' || status === '대기' || status === '보류');
      const rule4 = isThisW && (familyClass === '첫날' || familyClass === '한달');
      const rule5 = !isCompleted && (category === '중요' || category === '긴급');
      const rule6 = isOverdue && !isCompleted && category !== '가통';
      const rule7 = !task.date || task.date.trim() === '';

      return rule1 || rule2 || rule3 || rule4 || rule5 || rule6 || rule7;
    }).sort((a, b) => {
      const statusA = a.status || '예정';
      const statusB = b.status || '예정';
      const compA = statusA === '완료' || statusA === '취소';
      const compB = statusB === '완료' || statusB === '취소';

      if (compA && !compB) return 1;
      if (!compA && compB) return -1;

      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      if (a.date && b.date) {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
      }

      const rankCatA = categoryRank[a.category] || 9;
      const rankCatB = categoryRank[b.category] || 9;
      if (rankCatA !== rankCatB) return rankCatA - rankCatB;

      const rankStatusA = statusRank[a.status] || 7;
      const rankStatusB = statusRank[b.status] || 7;
      return rankStatusA - rankStatusB;
    });
  };

  // Base logic to filter and sort Family Letters View
  const getFilteredFamilyTasks = () => {
    const today = new Date();

    if (selectedDate || selectedStudent) {
      return tasks.filter(task => {
        if (task.category !== '가통') return false;
        let matches = true;
        if (selectedDate) {
          matches = matches && isDateMatchingFilter(task.date);
        }
        if (selectedStudent) {
          matches = matches && task.name === selectedStudent;
        }
        return matches;
      }).sort((a, b) => {
        const rankFamA = familyClassRank[a.familyClass] || 5;
        const rankFamB = familyClassRank[b.familyClass] || 5;
        if (rankFamA !== rankFamB) return rankFamA - rankFamB;

        if (a.date && !b.date) return -1;
        if (!a.date && b.date) return 1;
        return (a.date || '').localeCompare(b.date || '');
      });
    }

    // Default View: Apply 2 rules but showing up to 7 days after today and independent of filters
    return tasks.filter(task => {
      const d = parseTaskDate(task.date);
      const isThisW = d ? isThisWeek(d, { weekStartsOn: 1 }) : false;
      const category = task.category || '';
      const status = task.status || '예정';
      
      if (category !== '가통') return false;

      const rule1 = d && (startOfDay(d) <= addDays(startOfDay(today), 7)) && (status === '예정' || status === '보류');
      const rule2 = isThisW && (status === '예정' || status === '보류');

      return rule1 || rule2;
    }).sort((a, b) => {
      const rankFamA = familyClassRank[a.familyClass] || 5;
      const rankFamB = familyClassRank[b.familyClass] || 5;
      if (rankFamA !== rankFamB) return rankFamA - rankFamB;

      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return (a.date || '').localeCompare(b.date || '');
    });
  };

  // Handles starting inline edit
  const handleStartEdit = (task: Task) => {
    setEditingRowIndex(task.sheetRowIndex || null);
    setEditForm({
      date: task.date,
      name: task.name,
      category: task.category,
      familyClass: task.familyClass,
      todo: task.todo,
      status: task.status,
      memo: task.memo
    });
  };

  // Inline submit edit
  const handleSaveEdit = async (sheetRowIndex: number) => {
    if (!editForm.todo.trim()) {
      toast.error(MESSAGES.tasks.enterTodo);
      return;
    }
    try {
      setSubmitting(true);
      await taskApi.update(sheetRowIndex, editForm);
      toast.success(MESSAGES.tasks.editSuccess);
      setEditingRowIndex(null);
      await fetchTasks();
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Inline Delete
  const handleDeleteTask = async (sheetRowIndex: number) => {
    if (!confirm('이 업무를 삭제하시겠습니까?')) return;
    try {
      setSubmitting(true);
      await taskApi.remove(sheetRowIndex);
      toast.success(MESSAGES.tasks.deleteSuccess);
      if (editingRowIndex === sheetRowIndex) setEditingRowIndex(null);
      await fetchTasks();
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick complete helper
  const handleQuickComplete = async (sheetRowIndex: number) => {
    try {
      setSubmitting(true);
      const updatedForm = {
        ...editForm,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: '완료'
      };
      await taskApi.update(sheetRowIndex, updatedForm);
      toast.success(MESSAGES.tasks.completeSuccess);
      setEditingRowIndex(null);
      await fetchTasks();
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Executes family letter booking reservation (Rule 7)
  const handleExecuteReserve = async (type: '한달' | '정기') => {
    if (!reservingTask) return;
    const studentName = reservingTask.name || '';
    if (!studentName.trim()) {
      toast.error(MESSAGES.tasks.enterName);
      return;
    }

    try {
      setSubmitting(true);
      const today = new Date();
      let targetDate: Date;
      let todoText = '';
      let fClass = '';

      if (type === '한달') {
        targetDate = addMonths(today, 1);
        todoText = `${studentName} 학생 한달 가정통신문`;
        fClass = '한달';
      } else {
        targetDate = addMonths(today, 5);
        todoText = `${studentName} 학생 가정통신문`;
        fClass = '정기';
      }

      const reservedForm = {
        date: format(targetDate, 'yyyy-MM-dd'),
        name: studentName,
        category: '가통',
        familyClass: fClass,
        todo: todoText,
        status: '예정',
        memo: ''
      };

      await taskApi.add(reservedForm);
      toast.success(MESSAGES.tasks.reservationSuccess(studentName, fClass));
      setReservingTask(null);
      setEditingRowIndex(null);
      await fetchTasks();
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggles inline adding row inside groups
  const handleOpenInlineAdd = (group: 'todo' | 'inProgress' | 'completed' | 'familyView') => {
    setInlineAddGroup(group);
    
    let defaultStatus = '예정';
    let defaultCategory = '알림장';
    let defaultFamilyClass = '';
    
    if (group === 'inProgress') {
      defaultStatus = '진행';
    } else if (group === 'completed') {
      defaultStatus = '완료';
    } else if (group === 'familyView') {
      defaultCategory = '가통';
      defaultFamilyClass = '정기';
    }

    setNewForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      name: (group === 'familyView') ? '' : (selectedStudent || ''),
      category: defaultCategory,
      familyClass: defaultFamilyClass,
      todo: '',
      status: defaultStatus,
      memo: ''
    });
  };

  // Inline submit new task
  const handleCreateTask = async () => {
    if (!newForm.todo.trim()) {
      toast.error(MESSAGES.tasks.enterTodo);
      return;
    }

    try {
      setSubmitting(true);
      await taskApi.add(newForm);
      toast.success(MESSAGES.tasks.addSuccess);
      setInlineAddGroup(null);
      await fetchTasks();
      if (onRefreshGlobal) onRefreshGlobal();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Color mappings
  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case '긴급':
      case '중요':
        return getTagColor('빨간색');
      case '가통':
        return getTagColor('갈색');
      case '알림장':
      case '결과물':
        return getTagColor('파란색');
      case '보고':
        return getTagColor('초록색');
      case '반복':
      case '기타':
      default:
        return getTagColor('기본');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case '진행':
        return getTagColor('초록색');
      case '보류':
        return getTagColor('노란색');
      case '대기':
        return getTagColor('보라색');
      case '완료':
        return getTagColor('파란색');
      case '취소':
        return getTagColor('빨간색');
      case '예정':
      default:
        return getTagColor('기본');
    }
  };

  const getFamilyClassBadgeClass = (familyClass: string) => {
    switch (familyClass) {
      case '첫날':
        return getTagColor('초록색');
      case '한달':
        return getTagColor('파란색');
      case '중등':
        return getTagColor('주황색');
      case '정기':
      default:
        return getTagColor('회색');
    }
  };

  const basicTasks = getFilteredBasicTasks();
  const familyTasks = getFilteredFamilyTasks();

  const todoGroup = basicTasks.filter(t => t.status === '예정');
  const inProgressGroup = basicTasks.filter(t => t.status === '진행' || t.status === '대기' || t.status === '보류');
  const completedGroup = basicTasks.filter(t => t.status === '완료' || t.status === '취소');

  const toggleGroup = (group: 'todo' | 'inProgress' | 'completed') => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const formatTaskDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const d = parseTaskDate(dateStr);
    if (!d) return dateStr;
    return format(d, 'M월 d일', { locale: ko });
  };

  const formatRelativeTaskDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = parseTaskDate(dateStr);
    if (!d) return dateStr;

    const today = new Date();
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const targetZero = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const diffDays = differenceInCalendarDays(targetZero, todayZero);

    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '내일';
    if (diffDays === -1) return '어제';
    if (diffDays === 2) return '모레';
    if (diffDays === -2) return '그저께';

    if (Math.abs(diffDays) <= 7) {
      const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
      const dayOfWeek = weekdays[getDay(targetZero)];

      const todayWeekStart = startOfWeek(todayZero, { weekStartsOn: 0 });
      const targetWeekStart = startOfWeek(targetZero, { weekStartsOn: 0 });
      const diffWeeks = Math.round(differenceInCalendarDays(targetWeekStart, todayWeekStart) / 7);

      if (diffWeeks === 0) {
        return `이번주 ${dayOfWeek}`;
      } else if (diffWeeks === 1) {
        return `다음주 ${dayOfWeek}`;
      } else if (diffWeeks === -1) {
        return `지난주 ${dayOfWeek}`;
      }
    }

    return format(d, 'M월 d일', { locale: ko });
  };

  return (
    <div className="-mt-1">
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        
        {/* Left Side: Notes Panel */}
        <div className="w-full lg:col-span-1">
          <NotesPanel />
        </div>

        {/* Right Area - Wider and clean */}
        <div className="w-full lg:col-span-2 flex flex-col gap-4">

          <div className="flex flex-col gap-6">
            
            {/* 업무 (Main List Block) */}
            <div className="w-full space-y-4">
              <div className="bg-white rounded-[2rem] p-5 shadow-sm border-none">
                <div className="flex items-center justify-between pb-2 border-b border-border/40 gap-2">
                  <h2 className="font-semibold text-base text-zinc-600">업무</h2>
                  <div className="flex items-center gap-2">
                    {showFilters && (
                      <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-1 duration-150">
                        {/* Student Select dropdown */}
                        <StudentCombobox
                          students={students}
                          value={selectedStudent || ''}
                          onChange={(val) => setSelectedStudent(val || null)}
                          placeholder="학생 필터"
                          className="!w-24 font-sans"
                          inputClassName="bg-neutral-50/50 text-neutral-600 text-[11px] font-medium !h-7 !rounded-lg border-neutral-200"
                        />

                        {/* Date Select input */}
                        <input 
                          type="date"
                          value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              setSelectedDate(new Date(e.target.value));
                            } else {
                              setSelectedDate(undefined);
                            }
                          }}
                          className="h-7 px-1.5 text-[11px] font-sans border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary rounded-lg bg-neutral-50/50 cursor-pointer text-zinc-600 font-medium shrink-0"
                        />

                        {/* Reset Button */}
                        {(selectedDate || selectedStudent) && (
                          <button 
                            onClick={() => {
                              setSelectedDate(undefined);
                              setSelectedStudent(null);
                            }}
                            className="h-7 px-2 text-[10.5px] border border-neutral-200 hover:border-blue-400 text-neutral-500 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg font-bold flex items-center gap-0.5 bg-white transition-all shadow-none shrink-0"
                            title="필터 초기화"
                          >
                            <X className="w-3 h-3 text-neutral-400" />
                            <span>초기화</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Filter Toggle Button */}
                    <div className="relative">
                      <button
                        onClick={() => setShowFilters(prev => !prev)}
                        className={`h-7 w-7 flex items-center justify-center rounded-full transition-all cursor-pointer ${
                          showFilters 
                            ? 'bg-zinc-700 text-white shadow-sm hover:bg-zinc-800' 
                            : (selectedDate || selectedStudent)
                              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                              : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                        }`}
                        title={showFilters ? '필터 닫기' : '필터 열기'}
                      >
                        <Filter className="w-3.5 h-3.5" />
                      </button>
                      {!showFilters && (selectedDate || selectedStudent) && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

              {/* Collapsible groups */}
              <div className="mt-4 space-y-4">
                
                {/* 1. TODO GROUP */}
                <div className="space-y-1.5">
                  <button 
                    onClick={() => toggleGroup('todo')}
                    className="flex items-center gap-1.5 text-[14px] font-semibold text-zinc-700/70 hover:text-zinc-700 transition-colors"
                  >
                    {expandedGroups.todo ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span className="flex items-center">
                      <span>예정</span>
                      <span className="inline-flex items-center justify-center text-[12.5px] text-zinc-400 font-medium ml-3">
                        {todoGroup.length}
                      </span>
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {expandedGroups.todo && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-1.5 pl-0"
                      >
                        {todoGroup.length === 0 ? (
                          <div className="py-6 text-center text-xs text-zinc-400 bg-zinc-50/50 rounded-xl border border-solid border-zinc-100">
                            등록되었거나 해당되는 예정된 일이 없습니다.
                          </div>
                        ) : (
                          todoGroup.map(task => renderTaskRow(task))
                        )}

                        {inlineAddGroup === 'todo' ? renderInlineAddForm('todo') : (
                          <button 
                            onClick={() => handleOpenInlineAdd('todo')}
                            className="w-full py-1.5 flex items-center justify-center rounded-lg border border-solid border-zinc-200/40 hover:border-zinc-300/80 hover:bg-zinc-50 text-zinc-400 hover:text-zinc-700 transition-all bg-white"
                            title="예정 업무 추가"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 2. IN PROGRESS GROUP */}
                <div className="space-y-1.5">
                  <button 
                    onClick={() => toggleGroup('inProgress')}
                    className="flex items-center gap-1.5 text-[14px] font-semibold text-emerald-700/70 hover:text-emerald-700 transition-colors"
                  >
                    {expandedGroups.inProgress ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span className="flex items-center">
                      <span>진행</span>
                      <span className="inline-flex items-center justify-center text-[12.5px] text-zinc-400 font-medium ml-3">
                        {inProgressGroup.length}
                      </span>
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {expandedGroups.inProgress && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-1.5 pl-0"
                      >
                        {inProgressGroup.length === 0 ? (
                          <div className="py-6 text-center text-xs text-zinc-400 bg-zinc-50/50 rounded-xl border border-solid border-zinc-100">
                            진행 중인 업무가 없습니다.
                          </div>
                        ) : (
                          inProgressGroup.map(task => renderTaskRow(task))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 3. COMPLETED GROUP */}
                <div className="space-y-1.5">
                  <button 
                    onClick={() => toggleGroup('completed')}
                    className="flex items-center gap-1.5 text-[14px] font-semibold text-blue-700/70 hover:text-blue-700 transition-colors"
                  >
                    {expandedGroups.completed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span className="flex items-center">
                      <span>완료</span>
                      <span className="inline-flex items-center justify-center text-[12.5px] text-zinc-400 font-medium ml-3">
                        {completedGroup.length}
                      </span>
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {expandedGroups.completed && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-1.5 pl-0"
                      >
                        {completedGroup.length === 0 ? (
                          <div className="py-6 text-center text-xs text-zinc-400 bg-zinc-50/50 rounded-xl border border-solid border-zinc-100">
                            완료되었거나 취소된 업무가 없습니다.
                          </div>
                        ) : (
                          completedGroup.map(task => renderTaskRow(task))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </div>
          </div>

            {/* 가정통신문 */}
            <div className="w-full space-y-4">
              <div className="bg-white rounded-[2rem] p-5 shadow-sm border-none">
                <div className="flex items-center justify-between pb-3 border-b border-border/40">
                  <h2 className="font-semibold text-base text-zinc-650">가정통신문</h2>
                </div>

                <div className="mt-4 space-y-2">
                  {familyTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-400 bg-zinc-50/50 rounded-xl border border-solid border-zinc-100 px-4">
                      해당되는 가정통신문 업무가 없습니다.
                    </div>
                  ) : (
                    familyTasks.map(task => renderFamilyTaskRow(task))
                  )}

                  {inlineAddGroup === 'familyView' ? renderInlineAddForm('familyView') : (
                    <button 
                      onClick={() => handleOpenInlineAdd('familyView')}
                      className="w-full py-1.5 flex items-center justify-center rounded-lg border border-solid border-zinc-200/40 hover:border-zinc-300/80 hover:bg-zinc-50 text-zinc-400 hover:text-zinc-700 transition-all bg-white mt-2"
                      title="가정통신문 추가"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>

    </div>

      <AnimatePresence>
        {reservingTask && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl border border-zinc-100 flex flex-col gap-4 mx-4 animate-in zoom-in-95 duration-200">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-zinc-805 text-zinc-800">가정통신문 예약</h4>
                <p className="text-xs text-zinc-550 leading-relaxed">
                  <strong>{reservingTask.name}</strong> 학생의 가정통신문을 예약하시겠습니까?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  onClick={() => handleExecuteReserve('한달')}
                  className="h-10 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                >
                  한달 (1개월 뒤)
                </Button>
                <Button
                  onClick={() => handleExecuteReserve('정기')}
                  className="h-10 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors"
                >
                  정기 (5개월 뒤)
                </Button>
              </div>
              <Button
                variant="ghost"
                onClick={() => setReservingTask(null)}
                className="h-9 text-xs text-zinc-405 text-zinc-400 hover:text-zinc-500 hover:bg-zinc-55 hover:bg-zinc-50 rounded-xl"
              >
                취소
              </Button>
            </div>
          </div>
        )}
      </AnimatePresence>


    </div>
  );

  // RENDERS REGULAR LIST ROW
  function renderTaskRow(task: Task) {
    const isEditing = editingRowIndex === task.sheetRowIndex;
    const isOverdue = isTaskOverdue(task.date, task.status);

    if (isEditing) {
      return (
        <div 
          key={task.sheetRowIndex} 
          className="pl-2 pr-2.5 py-2.5 bg-zinc-50 hover:bg-zinc-100/70 border-b border-zinc-200/50 flex flex-col gap-2 rounded-lg transition-colors font-sans"
        >
          {/* Row 1: Looks identical to static viewer row */}
          <div className="flex-1 flex flex-wrap items-center gap-1.5">
            {/* Category selection - styled like the dynamic category badge */}
            <select
              value={editForm.category}
              onChange={(e) => {
                const cat = e.target.value;
                setEditForm(prev => ({
                  ...prev,
                  category: cat,
                  familyClass: cat === '가통' ? prev.familyClass || '정기' : ''
                }));
              }}
              className={`h-7 px-1.5 rounded text-[13px] font-normal border-0 bg-transparent cursor-pointer focus:ring-1 focus:ring-primary ${getCategoryBadgeClass(editForm.category)}`}
            >
              <option value="기타">기타</option>
              <option value="긴급">긴급</option>
              <option value="중요">중요</option>
              <option value="가통">가통</option>
              <option value="알림장">알림장</option>
              <option value="결과물">결과물</option>
              <option value="보고">보고</option>
              <option value="반복">반복</option>
            </select>

            {/* Todo field - seamless input */}
            <input
              type="text"
              placeholder="할 일 수정"
              value={editForm.todo}
              onChange={(e) => setEditForm(prev => ({ ...prev, todo: e.target.value }))}
              className="h-7 flex-1 min-w-[150px] px-1 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary text-[13px] text-zinc-800 font-normal rounded font-sans"
            />

            {/* Date Picker Input - seamless input */}
            <input
              type="date"
              value={editForm.date}
              onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
              className={`h-7 w-[120px] bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary text-[13px] rounded font-normal text-right pr-1 ${isOverdue ? 'text-red-600/90 font-medium' : 'text-zinc-650'}`}
            />

            {/* Status Choice - styled like the dynamic status badge */}
            <select
              value={editForm.status}
              onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
              className={`h-7 px-1.5 rounded text-[13px] font-normal border-0 bg-transparent cursor-pointer focus:ring-1 focus:ring-primary ${getStatusBadgeClass(editForm.status)}`}
            >
              <option value="예정">예정</option>
              <option value="진행">진행</option>
              <option value="대기">대기</option>
              <option value="보류">보류</option>
              <option value="완료">완료</option>
              <option value="취소">취소</option>
            </select>
          </div>

          {/* Memo Input directly under category-todo line but above the dotted line */}
          <div className="w-full">
            <input
              type="text"
              placeholder="메모 입력"
              value={editForm.memo}
              onChange={(e) => setEditForm(prev => ({ ...prev, memo: e.target.value }))}
              className="h-7 w-full px-2 border border-zinc-250 focus:border-primary focus:outline-none bg-white text-xs text-zinc-500 rounded font-sans"
            />
          </div>

          {/* Row 2: Secondary info (Left) and Buttons (Right) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1.5 border-t border-dotted border-zinc-200 mt-0.5">
            {/* Left aligned: Undisplayed details without prefix text labels */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-sans animate-none">
              <StudentCombobox
                students={students}
                value={editForm.name || ''}
                onChange={(val) => setEditForm(prev => ({ ...prev, name: val }))}
                placeholder="학생명 입력"
                className="!w-28 font-sans"
                inputClassName="bg-white text-zinc-850 text-xs !h-6 !rounded"
              />

              {editForm.category === '가통' && (
                <select
                  value={editForm.familyClass}
                  onChange={(e) => setEditForm(prev => ({ ...prev, familyClass: e.target.value }))}
                  className={`h-6 px-1.5 border border-zinc-200 rounded text-[13px] font-normal cursor-pointer font-sans ${getFamilyClassBadgeClass(editForm.familyClass)}`}
                >
                  <option value="정기">정기</option>
                  <option value="첫날">첫날</option>
                  <option value="한달">한달</option>
                  <option value="중등">중등</option>
                </select>
              )}
            </div>

            {/* Right aligned: Control buttons */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 pr-1">
              {/* 예약 Button (Left of 완료) */}
              <Button
                size="sm"
                variant="outline"
                disabled={submitting}
                onClick={() => {
                  const studentName = editForm.name || task.name || '';
                  if (!studentName.trim()) {
                    toast.error(MESSAGES.tasks.enterName);
                    return;
                  }
                  setReservingTask({ ...task, name: studentName });
                }}
                className="h-7 text-xs bg-zinc-100/70 hover:bg-zinc-200 text-zinc-700 border border-zinc-400 font-semibold px-2 rounded-lg transition-colors"
                title="가정통신문 예약하기"
              >
                예약
              </Button>

              {/* 완료 button shortcut in flat blue */}
              <Button
                size="sm"
                variant="outline"
                disabled={submitting}
                onClick={() => handleQuickComplete(task.sheetRowIndex!)}
                className="h-7 text-xs bg-zinc-100/70 hover:bg-zinc-200 text-zinc-700 border border-zinc-400 font-semibold px-2 rounded-lg transition-colors"
                title="오늘 완료 처리 후 바로 저장"
              >
                완료
              </Button>

              <div className="flex items-center gap-0.5 pl-1.5 border-l border-zinc-200">
                {/* Save (Check) */}
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={submitting}
                  onClick={() => handleSaveEdit(task.sheetRowIndex!)}
                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                  title="저장"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>

                {/* Delete Task */}
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={submitting}
                  onClick={() => handleDeleteTask(task.sheetRowIndex!)}
                  className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                  title="이 업무 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>

                {/* Cancel Edit */}
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={submitting}
                  onClick={() => setEditingRowIndex(null)}
                  className="h-7 w-7 text-zinc-400 hover:text-zinc-550 hover:bg-zinc-50 rounded-lg"
                  title="취소"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div 
        key={task.sheetRowIndex} 
        className="group relative pl-0.5 pr-0.5 py-1.5 bg-white hover:bg-zinc-50/70 border-b border-zinc-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px] transition-colors rounded-lg font-normal"
      >
        {/* Mobile View Container */}
        <div className="w-full sm:hidden flex items-start gap-1.5">
          {/* Badge on left */}
          <div className="shrink-0 pt-0.5">
            <span className={`px-1.5 py-0.5 rounded text-[13px] font-normal tracking-tight ${getCategoryBadgeClass(task.category)}`}>
              {task.category || '기타'}
            </span>
          </div>

          {/* Right Column: Title + Metadata + Edit Button */}
          <div className="flex-1 flex flex-col gap-1 min-w-0 pr-1">
            <div className="flex items-start justify-between gap-1.5">
              <span className="font-medium text-zinc-750 text-[14.5px] break-all">
                {task.todo}
              </span>
              <div className="shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={submitting}
                  onClick={() => handleStartEdit(task)}
                  className="h-6 w-6 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg flex items-center justify-center cursor-pointer"
                  title="수정하기"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Metadata perfectly aligned with task.todo first letter */}
            <div className="flex flex-wrap items-center gap-2 select-none text-[12px] mt-0.5">
              {task.memo && task.memo.trim() !== '' && (
                <span className="font-normal text-zinc-500 max-w-[200px] truncate" title={task.memo}>
                  {task.memo}
                </span>
              )}
              {task.date && (
                <span className={`font-normal ${isOverdue ? 'text-red-600/90 font-medium' : 'text-zinc-600'}`}>
                  {formatRelativeTaskDate(task.date)}
                </span>
              )}
              <span className={`rounded-lg font-normal text-[13px] px-1.5 py-0.5 ${getStatusBadgeClass(task.status)}`}>
                {task.status || '예정'}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop View Container */}
        <div className="hidden sm:flex w-full items-center justify-between gap-2">
          <div className="flex-1 flex items-center gap-1.5 min-w-0">
            <span className={`px-1.5 py-0.5 rounded text-[13px] font-normal tracking-tight ${getCategoryBadgeClass(task.category)} mr-1 shrink-0`}>
              {task.category || '기타'}
            </span>
            <span className="font-medium text-zinc-750 text-[14.5px] break-all truncate">
              {task.todo}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 select-none">
            {task.memo && task.memo.trim() !== '' && (
              <span className="text-[13px] font-normal text-zinc-500 max-w-[200px] truncate" title={task.memo}>
                {task.memo}
              </span>
            )}
            {task.date && (
              <span className={`text-[13px] font-normal ${isOverdue ? 'text-red-600/90 font-medium' : 'text-zinc-600'}`}>
                {formatRelativeTaskDate(task.date)}
              </span>
            )}
            <span className={`rounded-lg font-normal text-[13px] px-2 py-0.5 ${getStatusBadgeClass(task.status)}`}>
              {task.status || '예정'}
            </span>

            <div className="flex items-center opacity-30 group-hover:opacity-100 transition-opacity pl-1">
              <Button
                size="icon"
                variant="ghost"
                disabled={submitting}
                onClick={() => handleStartEdit(task)}
                className="h-[15px] w-[15px] min-h-0 min-w-0 p-0 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded flex items-center justify-center cursor-pointer"
                title="수정하기"
              >
                <Pencil className="w-2.5 h-2.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENDERS FAMILY COOPERATION ROW (Single Horizontal Line matching renderTaskRow)
  function renderFamilyTaskRow(task: Task) {
    const isEditing = editingRowIndex === task.sheetRowIndex;
    const isOverdue = isTaskDateBeforeToday(task.date);

    if (isEditing) {
      return (
        <div 
          key={task.sheetRowIndex} 
          className="px-2.5 py-2.5 bg-zinc-50 hover:bg-zinc-100/70 border-b border-zinc-200/50 flex flex-col gap-2 rounded-lg transition-colors"
        >
          {/* Row 1: Looks identical to static viewer row (No student name, contains familyClass badge, todo, memo, date, status) */}
          <div className="flex-1 flex flex-wrap items-center gap-1.5">
            {/* familyClass select classification - styled like dynamic familyClass badge */}
            <select
               value={editForm.familyClass}
               onChange={(e) => setEditForm(prev => ({ ...prev, familyClass: e.target.value }))}
               className={`h-7 px-1.5 rounded text-[13px] font-normal border-0 bg-transparent cursor-pointer focus:ring-1 focus:ring-primary ${getFamilyClassBadgeClass(editForm.familyClass)}`}
            >
              <option value="정기">정기</option>
              <option value="첫날">첫날</option>
              <option value="한달">한달</option>
              <option value="중등">중등</option>
            </select>

            {/* Todo field - seamless input */}
            <input
              type="text"
              placeholder="할 일 수정"
              value={editForm.todo}
              onChange={(e) => setEditForm(prev => ({ ...prev, todo: e.target.value }))}
              className="h-7 flex-1 min-w-[150px] px-1 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary text-[13px] text-zinc-800 font-normal rounded"
            />

            {/* Date Picker Input - seamless input */}
            <input
              type="date"
              value={editForm.date}
              onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
              className={`h-7 w-[120px] bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary text-[13px] rounded font-normal text-right pr-1 ${getFamilyTaskDateClass(editForm.date)}`}
            />

            {/* Status Choice - styled like the dynamic status badge */}
            <select
              value={editForm.status}
              onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
              className={`h-7 px-1.5 rounded text-[13px] font-normal border-0 bg-transparent cursor-pointer focus:ring-1 focus:ring-primary ${getStatusBadgeClass(editForm.status)}`}
            >
              <option value="예정">예정</option>
              <option value="진행">진행</option>
              <option value="대기">대기</option>
              <option value="보류">보류</option>
              <option value="완료">완료</option>
              <option value="취소">취소</option>
            </select>
          </div>

          {/* Row 2: Secondary info (Left) and Buttons (Right) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1.5 border-t border-dotted border-zinc-200 mt-0.5">
            {/* Left aligned: Student Name input (hidden in the static read-only view) with category select mapping */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-sans">
              <StudentCombobox
                students={students}
                value={editForm.name || ''}
                onChange={(val) => setEditForm(prev => ({ ...prev, name: val }))}
                placeholder="학생명 입력"
                className="!w-28 font-sans"
                inputClassName="bg-white text-zinc-850 text-xs !h-6 !rounded"
              />

              {/* Editable Category Class mapping hidden inside family View */}
              <select
                value={editForm.category}
                onChange={(e) => {
                  const cat = e.target.value;
                  setEditForm(prev => ({
                    ...prev,
                    category: cat,
                    familyClass: cat === '가통' ? prev.familyClass || '정기' : ''
                  }));
                }}
                className={`h-6 px-1.5 border border-zinc-200 rounded text-[13px] font-normal cursor-pointer font-sans ${getCategoryBadgeClass(editForm.category)}`}
              >
                <option value="가통">가통</option>
                <option value="기타">기타</option>
                <option value="긴급">긴급</option>
                <option value="중요">중요</option>
                <option value="알림장">알림장</option>
                <option value="결과물">결과물</option>
                <option value="보고">보고</option>
                <option value="반복">반복</option>
              </select>
            </div>

            {/* Right aligned: Control buttons */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 pr-1">
              {/* 예약 Button (Left of 완료) */}
              <Button
                size="sm"
                variant="outline"
                disabled={submitting}
                onClick={() => {
                  const studentName = editForm.name || task.name || '';
                  if (!studentName.trim()) {
                    toast.error(MESSAGES.tasks.enterName);
                    return;
                  }
                  setReservingTask({ ...task, name: studentName });
                }}
                className="h-7 text-xs bg-zinc-100/70 hover:bg-zinc-200 text-zinc-700 border border-zinc-400 font-semibold px-2 rounded-lg transition-colors"
                title="가정통신문 예약하기"
              >
                예약
              </Button>

              {/* 완료 button shortcut styled in flat blue */}
              <Button
                size="sm"
                variant="outline"
                disabled={submitting}
                onClick={() => handleQuickComplete(task.sheetRowIndex!)}
                className="h-7 text-xs bg-zinc-100/70 hover:bg-zinc-200 text-zinc-700 border border-zinc-400 font-semibold px-2 rounded-lg transition-colors"
                title="오늘 완료 처리 후 바로 저장"
              >
                완료
              </Button>

              <div className="flex items-center gap-0.5 pl-1.5 border-l border-zinc-200">
                {/* Save (Check) */}
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={submitting}
                  onClick={() => handleSaveEdit(task.sheetRowIndex!)}
                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                  title="저장"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>

                {/* Delete Task */}
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={submitting}
                  onClick={() => handleDeleteTask(task.sheetRowIndex!)}
                  className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                  title="이 업무 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>

                {/* Cancel Edit */}
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={submitting}
                  onClick={() => setEditingRowIndex(null)}
                  className="h-7 w-7 text-zinc-400 hover:text-zinc-550 hover:bg-zinc-50 rounded-lg"
                  title="취소"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div 
        key={task.sheetRowIndex} 
        className="group relative pl-0.5 pr-0.5 py-1.5 bg-white hover:bg-zinc-50/75 border-b border-zinc-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px] transition-colors rounded-lg font-normal"
      >
        {/* Mobile View Container */}
        <div className="w-full sm:hidden flex items-start gap-1.5">
          {/* Badge on left */}
          {task.familyClass && (
            <div className="shrink-0 pt-0.5">
              <span className={`px-1.5 py-0.5 rounded text-[13px] font-normal tracking-tight ${getFamilyClassBadgeClass(task.familyClass)}`}>
                {task.familyClass}
              </span>
            </div>
          )}

          {/* Right Column: Title + Metadata + Edit Button */}
          <div className="flex-1 flex flex-col gap-1 min-w-0 pr-1">
            <div className="flex items-start justify-between gap-1.5">
              <span className="font-medium text-zinc-750 text-[14.5px] break-all">
                {task.todo}
              </span>
              <div className="shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={submitting}
                  onClick={() => handleStartEdit(task)}
                  className="h-6 w-6 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg flex items-center justify-center cursor-pointer"
                  title="수정하기"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Metadata perfectly aligned with task.todo first letter */}
            <div className="flex flex-wrap items-center gap-2 select-none text-[12px] mt-0.5">
              {task.date && (
                <span className={`font-normal ${getFamilyTaskDateClass(task.date)}`}>
                  {formatTaskDateDisplay(task.date)}
                </span>
              )}
              <span className={`rounded-lg font-normal text-[13px] px-1.5 py-0.5 ${getStatusBadgeClass(task.status)}`}>
                {task.status || '예정'}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop View Container */}
        <div className="hidden sm:flex w-full items-center justify-between gap-2">
          <div className="flex-1 flex items-center gap-1.5 min-w-0">
            {task.familyClass && (
              <span className={`px-1.5 py-0.5 rounded text-[13px] font-normal tracking-tight ${getFamilyClassBadgeClass(task.familyClass)} mr-1.5 shrink-0`}>
                {task.familyClass}
              </span>
            )}
            <span className="font-medium text-zinc-750 text-[14.5px] break-all truncate">
              {task.todo}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 select-none">
            {task.date && (
              <span className={`text-[13px] font-normal ${getFamilyTaskDateClass(task.date)}`}>
                {formatTaskDateDisplay(task.date)}
              </span>
            )}
            <span className={`rounded-lg font-normal text-[13px] px-2 py-0.5 ${getStatusBadgeClass(task.status)}`}>
              {task.status || '예정'}
            </span>

            <div className="flex items-center opacity-30 group-hover:opacity-100 transition-opacity pl-1">
              <Button
                size="icon"
                variant="ghost"
                disabled={submitting}
                onClick={() => handleStartEdit(task)}
                className="h-[15px] w-[15px] min-h-0 min-w-0 p-0 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded flex items-center justify-center cursor-pointer"
                title="수정하기"
              >
                <Pencil className="w-2.5 h-2.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // INLINE ADDITION FORM - Allows full entry including student name and details on creation
  function renderInlineAddForm(group: 'todo' | 'inProgress' | 'completed' | 'familyView') {
    return (
      <div className="p-3 bg-zinc-50 rounded-xl border border-solid border-zinc-200 flex flex-col gap-2 text-[13px] animate-in slide-in-from-top-1 fade-in duration-200">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          
          {/* Category Selection */}
          <div className={newForm.category === '가통' ? 'sm:col-span-3' : 'sm:col-span-4'}>
            <select
              value={newForm.category}
              onChange={(e) => {
                const cat = e.target.value;
                setNewForm(prev => ({
                  ...prev,
                  category: cat,
                  familyClass: cat === '가통' ? prev.familyClass || '정기' : ''
                }));
              }}
              className="w-full h-8 px-2 border border-zinc-200 rounded-lg bg-white text-[13px] font-normal text-zinc-750 focus:outline-none"
            >
              <option value="기타">기타</option>
              <option value="긴급">긴급</option>
              <option value="중요">중요</option>
              <option value="가통">가통</option>
              <option value="알림장">알림장</option>
              <option value="결과물">결과물</option>
              <option value="보고">보고</option>
              <option value="반복">반복</option>
            </select>
          </div>

          {/* FamilyClass selection picker if category === '가통' */}
          {newForm.category === '가통' && (
            <div className="sm:col-span-3">
              <select
                value={newForm.familyClass}
                onChange={(e) => setNewForm(prev => ({ ...prev, familyClass: e.target.value }))}
                className="w-full h-8 px-2 border border-zinc-200 rounded-lg bg-white text-[13px] text-yellow-800 font-normal focus:outline-none"
              >
                <option value="정기">정기</option>
                <option value="첫날">첫날</option>
                <option value="한달">한달</option>
                <option value="중등">중등</option>
              </select>
            </div>
          )}

          {/* Student Name */}
          <div className={newForm.category === '가통' ? 'sm:col-span-3' : 'sm:col-span-4'}>
            <StudentCombobox
              students={students}
              value={newForm.name || ''}
              onChange={(val) => setNewForm(prev => ({ ...prev, name: val }))}
              placeholder="학생명 (선택)"
              inputClassName="bg-white text-zinc-850 text-[13px] font-normal border border-zinc-200 !h-8 !rounded-lg"
            />
          </div>

          {/* Date Picker */}
          <div className={newForm.category === '가통' ? 'sm:col-span-3' : 'sm:col-span-4'}>
            <input
              type="date"
              value={newForm.date}
              onChange={(e) => setNewForm(prev => ({ ...prev, date: e.target.value }))}
              className="w-full h-8 px-2 border border-zinc-200 rounded-lg bg-white text-[13px] font-medium text-zinc-650 focus:outline-none"
            />
          </div>

          {/* Next Row: Todo and Memo */}
          <div className="sm:col-span-8">
            <input
              type="text"
              placeholder="무엇을 해야 하나요?"
              value={newForm.todo}
              onChange={(e) => setNewForm(prev => ({ ...prev, todo: e.target.value }))}
              className="w-full h-8 px-2 border border-zinc-200 rounded-lg bg-white text-[13px] font-medium text-zinc-800 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4">
            <input
              type="text"
              placeholder="메모 (옵션)"
              value={newForm.memo}
              onChange={(e) => setNewForm(prev => ({ ...prev, memo: e.target.value }))}
              className="w-full h-8 px-2 border border-zinc-200 rounded-lg bg-white text-[13px] text-zinc-500 focus:outline-none"
            />
          </div>

        </div>

        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            disabled={submitting}
            onClick={handleCreateTask}
            className="h-7 rounded-lg px-3 text-xs bg-primary text-white hover:bg-primary/95 font-semibold animate-none"
          >
            {submitting ? '저장...' : '확인'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={submitting}
            onClick={() => setNewForm(prev => ({ ...prev, todo: '', memo: '' })) || setInlineAddGroup(null)}
            className="h-7 rounded-lg px-3 text-xs hover:bg-zinc-100 font-semibold text-zinc-500"
          >
            취소
          </Button>
        </div>
      </div>
    );
  }
}
