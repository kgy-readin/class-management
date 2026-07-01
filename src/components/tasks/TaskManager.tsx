import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Task, Student, getTagColor, getShortHash } from '../../types';
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
  Filter,
  ScrollText,
  Save,
  UsersRound,
  Calendar
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format, isSameDay, isThisWeek, startOfDay, addMonths, addDays, differenceInCalendarDays, startOfWeek, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { taskApi } from '@/src/services/api';
import { motion, AnimatePresence } from 'motion/react';
import NotesPanel from './NotesPanel';
import StudentCombobox from '../common/StudentCombobox';
import { ReserveTaskDialog } from './TaskPopups';

import 'react-day-picker/dist/style.css';

interface TaskManagerProps {
  students: Student[];
  onRefreshGlobal?: () => void;
}

export default function TaskManager({ students = [], onRefreshGlobal }: TaskManagerProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedWeek, setSelectedWeek] = useState<{ weekNumber: number; dates: Date[] } | null>(null);
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
  const [activeTab, setActiveTab] = useState<'업무' | '다음주' | '가정통신문' | '필터'>('업무');
  const [inlineAddGroup, setInlineAddGroup] = useState<'todo' | 'inProgress' | 'completed' | 'familyView' | 'nextWeek' | null>(null);
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
  const [dateFocusedDesktop, setDateFocusedDesktop] = useState(false);
  const [dateFocusedMobile, setDateFocusedMobile] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [taskSearchQuery, setTaskSearchQuery] = useState('');

  useEffect(() => {
    const pathname = location.pathname;
    if (pathname.includes('/tasks/filter')) {
      setIsFilterExpanded(true);
    }
  }, [location.pathname]);

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

  // Sync state from URL for Sub-tabs and filter state
  useEffect(() => {
    const pathname = location.pathname;
    if (!pathname.startsWith('/tasks')) return;

    const parts = pathname.split('/').filter(Boolean); // ["tasks", ...]
    const view = parts[1]; // "work", "next", "newsletter", "filter"

    if (view === 'next') {
      setActiveTab('다음주');
      setSelectedDate(undefined);
      setSelectedWeek(null);
      setSelectedStudent(null);
      setShowFilters(false);
      setTaskSearchQuery('');
    } else if (view === 'newsletter') {
      setActiveTab('가정통신문');
      setSelectedDate(undefined);
      setSelectedWeek(null);
      setSelectedStudent(null);
      setShowFilters(false);
      setTaskSearchQuery('');
    } else if (view === 'filter') {
      setActiveTab('필터');
      setShowFilters(true);
      const filterType = parts[2]; // "date", "week", or "students"
      const filterVal = parts[3];

      if (filterType === 'date' && filterVal) {
        try {
          const parsed = new Date(filterVal);
          if (!isNaN(parsed.getTime())) {
            setSelectedDate(parsed);
            setSelectedWeek(null);
            setSelectedStudent(null);
            setTaskSearchQuery('');
            return;
          }
        } catch {}
      } else if (filterType === 'week' && filterVal) {
        try {
          const mondayDate = parseTaskDate(filterVal);
          if (mondayDate && !isNaN(mondayDate.getTime())) {
            const dates: Date[] = [];
            for (let i = 0; i < 7; i++) {
              dates.push(addDays(mondayDate, i));
            }
            setSelectedWeek({ weekNumber: 0, dates });
            setSelectedDate(undefined);
            setSelectedStudent(null);
            setTaskSearchQuery('');
            return;
          }
        } catch {}
      } else if (filterType === 'students' && filterVal) {
        const found = students.find(s => getShortHash(s.name) === filterVal);
        if (found) {
          setSelectedStudent(found.name);
          setSelectedDate(undefined);
          setSelectedWeek(null);
          setTaskSearchQuery('');
          return;
        } else {
          const uniqueNames = Array.from(new Set(tasks.map(t => t.name).filter(Boolean)));
          const foundInTasks = uniqueNames.find(n => getShortHash(n) === filterVal);
          if (foundInTasks) {
            setSelectedStudent(foundInTasks);
            setSelectedDate(undefined);
            setSelectedWeek(null);
            setTaskSearchQuery('');
            return;
          }
        }
      }
      if (!taskSearchQuery.trim()) {
        navigate('/tasks/work', { replace: true });
        return;
      }
      setSelectedDate(undefined);
      setSelectedWeek(null);
      setSelectedStudent(null);
    } else {
      // Default /tasks or /tasks/work
      setActiveTab('업무');
      setSelectedDate(undefined);
      setSelectedWeek(null);
      setSelectedStudent(null);
      setShowFilters(false);
      setTaskSearchQuery('');
    }
  }, [location.pathname, students, tasks]);

  // Helper to parse date strings
  const parseTaskDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    try {
      const cleaned = dateStr.replace(/\//g, '-').trim();
      const parts = cleaned.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const parsed = new Date(year, month, day);
        if (!isNaN(parsed.getTime())) return parsed;
      }
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

  // Helper check if task date is today
  const isTodayTask = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const d = parseTaskDate(dateStr);
    if (!d) return false;
    return isSameDay(d, new Date());
  };

  // Family View date text color styling based on overdue days:
  // 1~30 days overdue -> blue text, 31+ days overdue -> red text, else normal text color
  const getFamilyTaskDateClass = (dateStr: string): string => {
    if (!dateStr) return 'text-zinc-750';
    const d = parseTaskDate(dateStr);
    if (!d) return 'text-zinc-750';
    const today = startOfDay(new Date());
    const taskDate = startOfDay(d);
    
    if (taskDate < today) {
       const diffTime = today.getTime() - taskDate.getTime();
       const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
       if (diffDays >= 1 && diffDays <= 30) {
         return 'text-blue-600 font-medium';
       } else if (diffDays >= 31) {
         return 'text-red-600 font-medium';
       }
    }
    return 'text-zinc-750';
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
    if (d) {
      if (selectedDate && isSameDay(d, selectedDate)) {
        navigate('/tasks/filter');
      } else {
        navigate(`/tasks/filter/date/${format(d, 'yyyy-MM-dd')}`);
      }
    } else {
      navigate('/tasks/filter');
    }
  };

  const handleWeekNumberClick = (weekNumber: number, dates: Date[], e: React.MouseEvent) => {
    if (dates && dates.length > 0) {
      const monday = startOfWeek(dates[0], { weekStartsOn: 1 });
      const mondayStr = format(monday, 'yyyy-MM-dd');
      
      const isAlreadySelected = selectedWeek && isSameDay(selectedWeek.dates[0], monday);
      if (isAlreadySelected) {
        navigate('/tasks/filter');
      } else {
        navigate(`/tasks/filter/week/${mondayStr}`);
      }
    }
  };

  const handleStudentSelect = (studentName: string | null) => {
    if (studentName) {
      navigate(`/tasks/filter/students/${getShortHash(studentName)}`);
    } else {
      navigate('/tasks/filter');
    }
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

    // "업무 -> 날짜 비어있는 할일 미표시로 변경"
    const validDateTasks = tasks.filter(task => task.date && task.date.trim() !== '');

    // Default View: Apply 7 rules (rule 7 removed because empty-date is handled above)
    return validDateTasks.filter(task => {
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
      // rule7 is removed
      const rule8 = isOverdue && !isCompleted && category === '가통' && (familyClass === '첫날' || familyClass === '한달');

      return rule1 || rule2 || rule3 || rule4 || rule5 || rule6 || rule8;
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

  // 새로 만드는 '다음주' 뷰어용 필터링 및 정렬
  // 날짜 비어있는 할일 포함, '이번주/업무'에서 보여주지 않는 할일 중 '다음주'의 할일 포함.
  const getFilteredNextWeekTasks = () => {
    const today = new Date();
    // Monday of next week to Sunday of next week
    const nextWeekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
    const nextWeekEnd = addDays(nextWeekStart, 6);

    const candidates = tasks.filter(task => {
      const isEmpty = !task.date || task.date.trim() === '';
      if (isEmpty) return true;

      const d = parseTaskDate(task.date);
      const isNextW = d ? (startOfDay(d) >= startOfDay(nextWeekStart) && startOfDay(d) <= startOfDay(nextWeekEnd)) : false;
      return isNextW;
    });

    // "업무에서 보여주고 있는 일정은 보여주지 않기"
    const basicTasksList = getFilteredBasicTasks();
    const basicTaskIds = new Set(basicTasksList.map(t => t.sheetRowIndex));
    const filtered = candidates.filter(task => !basicTaskIds.has(task.sheetRowIndex));

    // Sort: Same rank policies
    return filtered.sort((a, b) => {
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

  // New Dedicated '필터' View Selector - Only displays matching items or starts empty if no filters are selected
  const getFilteredFilterTasks = () => {
    if (!selectedDate && !selectedStudent && !selectedWeek && !taskSearchQuery.trim()) {
      return [];
    }

    const filtered = tasks.filter(task => {
      let matches = true;
      if (selectedDate) {
        matches = matches && isDateMatchingFilter(task.date);
      } else if (selectedWeek) {
        const d = parseTaskDate(task.date);
        if (!d) {
          matches = false;
        } else {
          const taskDateStr = format(d, 'yyyy-MM-dd');
          matches = matches && selectedWeek.dates.some(wd => format(wd, 'yyyy-MM-dd') === taskDateStr);
        }
      }
      if (selectedStudent) {
        matches = matches && task.name === selectedStudent;
      }
      return matches;
    });

    // Sort matching basic view sorted hierarchy
    return filtered.sort((a, b) => {
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
  const handleOpenInlineAdd = (group: 'todo' | 'inProgress' | 'completed' | 'familyView' | 'nextWeek') => {
    setInlineAddGroup(group);
    
    let defaultStatus = '예정';
    let defaultCategory = '알림장';
    let defaultFamilyClass = '';
    let defaultDate = format(new Date(), 'yyyy-MM-dd');
    
    if (group === 'inProgress') {
      defaultStatus = '진행';
    } else if (group === 'completed') {
      defaultStatus = '완료';
    } else if (group === 'familyView') {
      defaultCategory = '가통';
      defaultFamilyClass = '정기';
    } else if (group === 'nextWeek') {
      // Find next week's Monday
      const today = new Date();
      const nextWeekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
      defaultDate = format(nextWeekStart, 'yyyy-MM-dd');
    }

    setNewForm({
      date: defaultDate,
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

  const applySearchFilter = (taskList: Task[]) => {
    if (!taskSearchQuery.trim()) return taskList;
    const q = taskSearchQuery.toLowerCase();
    return taskList.filter(t => (t.todo || '').toLowerCase().includes(q));
  };

  const basicTasks = getFilteredBasicTasks();
  const familyTasks = getFilteredFamilyTasks();
  const nextWeekTasks = getFilteredNextWeekTasks();
  const filterTasks = applySearchFilter(getFilteredFilterTasks());

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
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Side: Calendar & Notes Panel */}
        <div className="w-full lg:w-[354px] shrink-0 flex flex-col md:flex-row lg:flex-col gap-6 md:items-stretch lg:self-start">
          
          {/* Filtering Section Wrapper */}
          <div className="hidden md:flex w-full max-w-[354px] lg:w-[354px] flex-col gap-4 overflow-visible md:flex-none" style={{ paddingTop: '12px', paddingBottom: '8px', marginBottom: '-12px' }}>
            {/* Header / Selector Card */}
            <Card className="rounded-[2rem] border-none ring-0 shadow-sm bg-white overflow-visible w-full" style={{ height: '64px', overflow: 'visible' }}>
              <CardContent className="p-3.5 flex items-center justify-between gap-3 h-full overflow-visible">
                {!isFilterExpanded ? (
                  <div className="flex items-center gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => setIsFilterExpanded(true)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-50 hover:bg-zinc-100 text-zinc-500 transition-colors cursor-pointer shrink-0 scale-[0.8] origin-center"
                      title="필터링 섹션 펼치기"
                    >
                      <Filter className="w-4 h-4" />
                    </button>
                    <span className="text-[16px] font-semibold text-zinc-800 select-none truncate">
                      {format(selectedDate || new Date(), 'yyyy년 M월 d일 eeee', { locale: ko })}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 w-full overflow-visible">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFilterExpanded(false);
                        setTaskSearchQuery('');
                        navigate('/tasks/work');
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-50 text-[#2563eb] hover:bg-blue-100 transition-colors cursor-pointer shrink-0 scale-[0.8] origin-center"
                      title="필터링 섹션 접기"
                    >
                      <Filter className="w-4 h-4" />
                    </button>
                    <div className="flex-1 relative mx-[2px]">
                      <input
                        type="text"
                        value={taskSearchQuery}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTaskSearchQuery(val);
                          if (val.trim() !== '') {
                            if (activeTab !== '필터') {
                              navigate('/tasks/filter');
                            }
                          } else {
                            if (!selectedDate && !selectedWeek && !selectedStudent) {
                              navigate('/tasks/work');
                            }
                          }
                        }}
                        placeholder="작업명 검색"
                        className="w-full h-9 px-3 rounded-xl border border-solid border-zinc-100 bg-zinc-50 text-[13px] text-zinc-850 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                      {taskSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setTaskSearchQuery('');
                            if (!selectedDate && !selectedWeek && !selectedStudent) {
                              navigate('/tasks/work');
                            }
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-650"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mini Calendar Card (Shown when expanded) */}
            <AnimatePresence initial={false}>
              {isFilterExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  animate={{ 
                    opacity: 1, 
                    height: 'auto',
                    transitionEnd: { overflow: 'visible' }
                  }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.2 }}
                  className="w-full pt-0 overflow-visible flex flex-col items-center gap-3"
                  style={{ marginTop: '-4px', paddingBottom: '8px', marginBottom: '-8px' }}
                >
                  <Card 
                    className="rounded-[2rem] border-none ring-0 shadow-sm bg-[#FFFFFF] overflow-hidden w-full max-w-[350px] lg:w-[350px] h-fit flex flex-col mx-auto"
                    style={{ paddingTop: '12px', paddingBottom: '8px' }}
                  >
                    <CardContent className="flex flex-col items-center justify-center min-h-0 w-full pt-1 pb-1 px-4">
                      <style>{`
                        .rdp {
                          --rdp-accent-color: #2563eb;
                          --rdp-background-color: #eff6ff;
                          margin-top: -8px;
                          margin-bottom: -16px;
                          font-size: 13px;
                          width: 100%;
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                          padding-bottom: 4px;
                        }
                        .rdp-months { width: 100%; display: flex; justify-content: center; }
                        .rdp-month { width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                        .rdp-caption { display: flex !important; justify-content: space-between !important; align-items: center !important; width: 100% !important; max-width: 280px !important; margin: 0 auto !important; margin-bottom: 4px !important; padding: 0 !important; }
                        .rdp-caption_label { font-weight: 600 !important; font-size: 16px !important; transform: none !important; padding: 0 !important; margin-left: 8px !important; }
                        .rdp-nav { display: flex !important; gap: 8px !important; transform: scale(0.85) !important; transform-origin: right center !important; margin: 0 !important; padding: 0 !important; }
                        .rdp-nav button, .rdp-nav_button, .rdp-nav .rdp-button { 
                          color: #a1a1aa !important; 
                          width: 20px !important; 
                          height: 20px !important; 
                          min-width: 20px !important; 
                          min-height: 20px !important; 
                          padding: 0 !important; 
                          display: flex !important; 
                          align-items: center !important; 
                          justify-content: center !important; 
                        }
                        .rdp-nav button:hover, .rdp-nav_button:hover, .rdp-nav .rdp-button:hover { color: #71717a !important; background-color: #f4f4f5 !important; }
                        .rdp-nav button:last-child, .rdp-nav_button_next { margin-right: 16px !important; }
                        .rdp-nav svg, .rdp-nav_icon, .rdp-nav path { color: inherit !important; fill: currentColor !important; }
                        .rdp-nav svg[fill="none"] path, .rdp-nav_icon[fill="none"] path { fill: none !important; stroke: currentColor !important; }
                        .rdp-day_selected:not([disabled]), .rdp-day_selected:focus:not([disabled]), .rdp-day_selected:hover:not([disabled]) { background-color: #2563eb !important; color: white !important; border-radius: 9999px !important; }
                        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: #eff6ff; border-radius: 9999px !important; }
                        
                        .rdp-weekday {
                          font-size: 12px !important;
                          font-weight: 600 !important;
                          color: #a1a1aa !important;
                          padding: 8px 0px !important;
                          text-align: center !important;
                          vertical-align: middle !important;
                          line-height: 1.2 !important;
                        }
                        
                        .rdp-week_number_header {
                          font-size: 11px !important;
                          font-weight: 600 !important;
                          color: #a1a1aa !important;
                          padding: 8px 0px !important;
                          text-align: center !important;
                          vertical-align: middle !important;
                          line-height: 1.2 !important;
                        }

                        .rdp-table { width: 100% !important; border-collapse: collapse !important; max-width: 280px !important; margin: 0 auto !important; }
                        .rdp-cell { padding: 0px; vertical-align: middle; text-align: center; }
                        .rdp-button { width: 31px; height: 31px; display: flex; align-items: center; justify-content: center; position: relative; margin: 0 auto; font-size: 12px; }

                        /* Outside days styling - soft light gray */
                        .rdp-outside {
                          color: #d1d5db !important;
                          opacity: 0.6;
                        }

                        /* Continuous highlighting for the selected week bar */
                        td.rdp-day_selected-week { background: linear-gradient(to bottom, transparent 5%, #eff6ff 5%, #eff6ff 95%, transparent 95%) !important; }
                        td.rdp-day_selected-week_dummy { display: none; }
                        
                        /* Round the Monday edge of the bar */
                        td.rdp-day_selected-week:first-of-type {
                          border-top-left-radius: 9999px !important;
                          border-bottom-left-radius: 9999px !important;
                        }
                        
                        /* Round the Sunday edge of the bar */
                        td.rdp-day_selected-week:last-of-type {
                          border-top-right-radius: 9999px !important;
                          border-bottom-right-radius: 9999px !important;
                        }

                        /* Clear backgrounds and styles for buttons in the selected week bar */
                        td.rdp-day_selected-week .rdp-day_button:not(.rdp-selected),
                        td.rdp-day_selected-week .rdp-button:not(.rdp-selected) {
                          background-color: transparent !important;
                          border-radius: 0px !important;
                          color: #2563eb !important;
                          font-weight: 600 !important;
                        }
                      `}</style>
                      <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        showWeekNumber={true}
                        showOutsideDays={true}
                        month={currentMonth}
                        onMonthChange={setCurrentMonth}
                        locale={ko}
                        weekStartsOn={1}
                        className="mx-auto"
                        modifiers={{
                          selectedWeek: (date) => {
                            if (!selectedWeek) return false;
                            const dateStr = format(date, 'yyyy-MM-dd');
                            return selectedWeek.dates.some(wd => format(wd, 'yyyy-MM-dd') === dateStr);
                          }
                        }}
                        modifiersClassNames={{
                          selectedWeek: 'rdp-day_selected-week',
                        }}
                        components={{
                          WeekNumberHeader: (props) => {
                            const { className, ...rest } = props;
                            return (
                              <th 
                                {...rest} 
                                className={`rdp-week_number_header font-semibold text-zinc-400 text-[11px] select-none text-center ${className || ''}`}
                              >
                                W
                              </th>
                            );
                          },
                          WeekNumber: (props) => {
                            const { week, ...thProps } = props;
                            const isWeekSelected = selectedWeek && selectedWeek.dates.some(d => {
                              const dStr = format(d, 'yyyy-MM-dd');
                              return week.days.some((wd: any) => format(wd.date, 'yyyy-MM-dd') === dStr);
                            });

                            const handleClick = (e: React.MouseEvent) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const dates = week.days.map((d: any) => d.date);
                              handleWeekNumberClick(week.weekNumber, dates, e);
                            };

                            return (
                              <th 
                                {...thProps}
                                className={`${thProps.className || ''} select-none`}
                                style={{ padding: '0px', verticalAlign: 'middle', textAlign: 'center' }}
                              >
                                <button
                                  type="button"
                                  onClick={handleClick}
                                  className={`w-7 h-7 flex items-center justify-center mx-auto text-[11px] font-medium rounded-full transition-all cursor-pointer ${
                                    isWeekSelected 
                                      ? 'bg-transparent text-[#2563eb] font-semibold' 
                                      : 'text-zinc-500 hover:text-[#2563eb] hover:bg-[#eff6ff]'
                                  }`}
                                >
                                  {thProps.children}
                                </button>
                              </th>
                            );
                          }
                        }}
                      />
                    </CardContent>
                  </Card>

                  {/* Separated Student Selection Block (학생 선택 블럭) */}
                  <Card className="rounded-[2rem] border-none ring-0 shadow-sm bg-white overflow-hidden w-full max-w-[350px] lg:w-[350px] h-fit flex flex-col mx-auto py-0">
                    <CardContent 
                      className="px-4 py-0 flex items-center justify-between gap-3 w-full"
                      style={{ marginLeft: '0px', marginTop: '16px', marginBottom: '16px' }}
                    >
                      <span className="text-[16px] ml-2 font-semibold text-zinc-700 select-none shrink-0">학생 선택</span>
                      <StudentCombobox
                        students={students}
                        value={selectedStudent || ''}
                        onChange={(val) => {
                          if (val) {
                            navigate(`/tasks/filter/students/${getShortHash(val)}`);
                          } else {
                            navigate('/tasks/filter');
                          }
                        }}
                        placeholder="전체 학생"
                        className="!w-[150px] shrink-0"
                        inputClassName="bg-zinc-50 border-solid border-zinc-100 text-[13.5px] font-semibold h-10 rounded-xl !ml-[-80px] !w-[228px]"
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-full md:flex-1 lg:w-full h-auto flex flex-col">
            <NotesPanel />
          </div>
        </div>

        {/* Right Area - Wider and clean */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          <div className="flex flex-col gap-6">
            
            {/* Consolidated Task block */}
            <div className="w-full">
              <div className="bg-white rounded-[2rem] p-5 shadow-sm border-none">
                
                {/* Header Section with Tab Toggle Switch */}
                <div className="flex flex-col gap-2 pb-3 border-b border-border/40">
                  <div className="flex items-center justify-between gap-2 w-full">
                    {/* Tab Switcher (Horizontal Text Toggle Design) - Displays only the 3 core views */}
                    <div className="flex bg-neutral-100 p-0.5 rounded-xl shrink-0 w-fit overflow-x-auto no-scrollbar relative">
                      {(['업무', '다음주', '가정통신문'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => {
                            if (tab === '업무') {
                              navigate('/tasks/work');
                            } else if (tab === '다음주') {
                              navigate('/tasks/next');
                            } else if (tab === '가정통신문') {
                              navigate('/tasks/newsletter');
                            }
                            setInlineAddGroup(null); // Close any active inline add form when switching tabs
                          }}
                          className="flex-1 sm:flex-initial px-4 py-1.5 text-[13px] font-medium rounded-lg text-center transition-all cursor-pointer whitespace-nowrap relative"
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          {activeTab === tab && (
                            <motion.span
                              layoutId="activeTaskTab"
                              className="absolute inset-0 bg-white rounded-lg shadow-sm"
                              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                          )}
                          <span className={`relative z-10 ${
                            activeTab === tab ? 'text-zinc-800' : 'text-zinc-550 hover:text-zinc-800'
                          }`}>
                            {tab}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Mobile-only Filter Toggle Button */}
                    <div className="flex md:hidden items-center gap-1.5 shrink-0">
                      <div className="relative shrink-0">
                        <button
                          onClick={() => {
                            setShowFilters(!showFilters);
                          }}
                          className={`h-8 w-8 flex items-center justify-center rounded-full transition-all cursor-pointer scale-[0.8] origin-center ${
                            showFilters
                              ? 'bg-zinc-700 text-white shadow-sm hover:bg-zinc-800' 
                              : (selectedDate || selectedStudent || selectedWeek)
                                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
                          }`}
                          title="필터 열기"
                        >
                          <Filter className="w-4 h-4" />
                        </button>
                        {(selectedDate || selectedStudent || selectedWeek) && (
                          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mobile-only Dropdown Filters (Due Date + Student Select) */}
                  {showFilters && (
                    <div className="flex md:hidden flex-row gap-2 p-2.5 bg-zinc-50/50 rounded-2xl border border-solid border-zinc-100 mt-2 animate-in fade-in slide-in-from-top-1 duration-150 items-center justify-between w-full overflow-hidden">
                      {/* Due date picker with fixed width & custom placeholder text */}
                      <div className="relative w-[115px] landscape:w-[230px] shrink-0 h-[34px] transition-all">
                        <input
                          type="date"
                          value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              navigate(`/tasks/filter/date/${val}`);
                            } else {
                              navigate('/tasks/filter');
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-2.5 rounded-xl border border-solid border-zinc-200 bg-white text-zinc-700 pointer-events-none z-10 text-[11.5px] font-semibold h-full">
                          <span className={selectedDate ? 'text-zinc-700' : 'text-zinc-400'}>
                            {selectedDate ? format(selectedDate, 'M월 d일', { locale: ko }) : '마감일 선택'}
                          </span>
                          <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        </div>
                      </div>

                      {/* Student selection dropdown taking the remaining horizontal space */}
                      <div className="flex-1 min-w-0 h-[34px]">
                        <StudentCombobox
                          students={students}
                          value={selectedStudent || ''}
                          onChange={(val) => {
                            if (val) {
                              navigate(`/tasks/filter/students/${getShortHash(val)}`);
                            } else {
                              navigate('/tasks/filter');
                            }
                          }}
                          placeholder="학생 선택"
                          className="w-full h-full"
                          inputClassName="bg-white border-solid border-zinc-200 text-[12px] font-semibold h-[34px] rounded-xl w-full"
                        />
                      </div>

                      {/* Filter Reset Button */}
                      {(selectedDate || selectedStudent || selectedWeek) && (
                        <button 
                          onClick={() => {
                            navigate('/tasks/work');
                            setShowFilters(false);
                          }}
                          className="h-[34px] w-[34px] border border-solid border-zinc-200 hover:border-blue-400 text-zinc-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl font-bold flex items-center justify-center bg-white transition-all shadow-none shrink-0"
                          title="필터 초기화"
                        >
                          <X className="w-3.5 h-3.5 text-zinc-400" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Tab content area */}
                <div className="mt-4">
                  
                  {activeTab === '업무' && (
                    <div className="space-y-4">
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
                              initial={{ height: 0, opacity: 0, overflow: "hidden" }}
                              animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
                              exit={{ height: 0, opacity: 0, overflow: "hidden" }}
                              transition={{ duration: 0.2 }}
                              className="space-y-1.5 pl-0"
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
                              initial={{ height: 0, opacity: 0, overflow: "hidden" }}
                              animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
                              exit={{ height: 0, opacity: 0, overflow: "hidden" }}
                              transition={{ duration: 0.2 }}
                              className="space-y-1.5 pl-0"
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
                              initial={{ height: 0, opacity: 0, overflow: "hidden" }}
                              animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" } }}
                              exit={{ height: 0, opacity: 0, overflow: "hidden" }}
                              transition={{ duration: 0.2 }}
                              className="space-y-1.5 pl-0"
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
                  )}

                  {activeTab === '다음주' && (
                    <div className="space-y-2">
                      {nextWeekTasks.length === 0 ? (
                        <div className="py-8 text-center text-xs text-zinc-400 bg-zinc-50/50 rounded-xl border border-solid border-zinc-100 px-4">
                          등록되었거나 해당되는 다음주 할일이 없습니다.
                        </div>
                      ) : (
                        nextWeekTasks.map(task => renderTaskRow(task))
                      )}

                      {inlineAddGroup === 'nextWeek' ? renderInlineAddForm('nextWeek') : (
                        <button 
                          onClick={() => handleOpenInlineAdd('nextWeek')}
                          className="w-full py-1.5 flex items-center justify-center rounded-lg border border-solid border-zinc-200/40 hover:border-zinc-300/80 hover:bg-zinc-50 text-zinc-400 hover:text-zinc-700 transition-all bg-white mt-2"
                          title="다음주 업무 추가"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {activeTab === '가정통신문' && (
                    <div className="space-y-2">
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
                  )}

                  {activeTab === '필터' && (
                    <div className="space-y-4">
                      {!selectedStudent && !selectedDate && !selectedWeek && !taskSearchQuery.trim() ? (
                        <div className="py-12 text-center text-zinc-400 bg-neutral-50/20 rounded-2xl border border-solid border-zinc-100 flex flex-col items-center justify-center gap-2 px-4 select-none">
                          <Filter className="w-10 h-10 text-zinc-300" />
                          <div className="text-[16px] font-medium text-zinc-500">필터를 선택해 주세요.</div>
                        </div>
                      ) : filterTasks.length === 0 ? (
                        <div className="py-8 text-center text-xs text-zinc-400 bg-zinc-50/50 rounded-xl border border-solid border-zinc-100 px-4">
                          필터 결과에 해당하는 할 일이 없습니다.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {filterTasks.map(task => renderTaskRow(task))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            </div>

          </div>

        </div>

    </div>

      <AnimatePresence>
        <ReserveTaskDialog
          open={!!reservingTask}
          onClose={() => setReservingTask(null)}
          reservingTask={reservingTask}
          onExecuteReserve={handleExecuteReserve}
        />
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
              className={`h-7 w-[120px] bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary text-[13px] rounded font-normal text-right pr-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-zinc-650'}`}
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
                  className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                  title="저장"
                >
                  <Save className="w-3.5 h-3.5" />
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
                <span className={`font-normal ${isOverdue ? 'text-red-600 font-medium' : isTodayTask(task.date) ? 'text-blue-600 font-medium' : 'text-zinc-750'}`}>
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
              <span className={`text-[13px] font-normal ${isOverdue ? 'text-red-600 font-medium' : isTodayTask(task.date) ? 'text-blue-600 font-medium' : 'text-zinc-750'}`}>
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
                  className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                  title="저장"
                >
                  <Save className="w-3.5 h-3.5" />
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
  function renderInlineAddForm(group: 'todo' | 'inProgress' | 'completed' | 'familyView' | 'nextWeek') {
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
            onClick={() => {
              setNewForm(prev => ({ ...prev, todo: '', memo: '' }));
              setInlineAddGroup(null);
            }}
            className="h-7 rounded-lg px-3 text-xs hover:bg-zinc-100 font-semibold text-zinc-500"
          >
            취소
          </Button>
        </div>
      </div>
    );
  }
}
