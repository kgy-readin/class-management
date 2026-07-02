import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Task, Student, getTagColor, getShortHash } from '../../types';
import { toast } from 'sonner';
import { MESSAGES } from '@/src/constants/messages';
import { 
  Plus, 
  ChevronDown, 
  ChevronRight,
  ChevronLeft,
  Filter,
  UsersRound,
  Calendar,
  X
} from 'lucide-react';
import { format, isSameDay, isThisWeek, startOfDay, addMonths, addDays, startOfWeek, differenceInCalendarDays, getDay, subMonths, startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval, isSameMonth, getWeek } from 'date-fns';
import { ko } from 'date-fns/locale';
import { taskApi } from '@/src/services/api';
import { motion, AnimatePresence } from 'motion/react';
import NotesPanel from './NotesPanel';
import StudentCombobox from '../common/StudentCombobox';
import { ReserveTaskDialog } from './TaskPopups';
import { isKoreanHoliday } from '../logs/holidayUtils';

import TaskRow from './TaskRow';
import FamilyTaskRow from './FamilyTaskRow';
import InlineAddForm from './InlineAddForm';
import MobileFilterBar from './MobileFilterBar';
import { 
  parseTaskDate, 
  isTaskOverdue, 
  isTaskDateBeforeToday, 
  isTodayTask, 
  getFamilyTaskDateClass
} from './dateUtils';
import { 
  getCategoryBadgeClass, 
  getStatusBadgeClass, 
  getFamilyClassBadgeClass 
} from './badgeUtils';

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

  // Computed values for custom mini calendar
  const taskMonthStart = startOfMonth(currentMonth);
  const taskMonthEnd = endOfMonth(taskMonthStart);
  const taskStartDate = startOfWeek(taskMonthStart, { weekStartsOn: 1 }); // Start on Monday
  const taskEndDate = endOfWeek(taskMonthEnd, { weekStartsOn: 1 });
  const taskDaysInRange = eachDayOfInterval({ start: taskStartDate, end: taskEndDate });

  const taskWeeks: Date[][] = [];
  for (let i = 0; i < taskDaysInRange.length; i += 7) {
    taskWeeks.push(taskDaysInRange.slice(i, i + 7));
  }

  useEffect(() => {
    const pathname = location.pathname;
    if (pathname.includes('/tasks/filter')) {
      setIsFilterExpanded(true);
    } else {
      setIsFilterExpanded(false);
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
      setTaskSearchQuery('');
      setSelectedStudent(null);
      setSelectedWeek(null);
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
      setTaskSearchQuery('');
      setSelectedStudent(null);
      setSelectedDate(undefined);
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
      setTaskSearchQuery('');
      setSelectedDate(undefined);
      setSelectedWeek(null);
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
      defaultDate = '';
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
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        
        {/* Left Side: Calendar & Notes Panel */}
        <div className="w-full lg:w-[354px] shrink-0 flex flex-col md:flex-row lg:flex-col gap-6 md:items-stretch lg:self-start">
          
          {/* Filtering Section Wrapper */}
          <div className="hidden md:flex w-full max-w-[354px] lg:w-[354px] flex-col gap-4 overflow-visible md:flex-none" style={{ paddingTop: '0px', paddingBottom: '8px', marginBottom: '-12px' }}>
            {/* Header / Selector Card */}
            <Card className="rounded-[2rem] border-none ring-0 shadow-sm bg-white overflow-visible w-full" style={{ height: '64px', overflow: 'visible' }}>
              <CardContent className="p-3.5 flex items-center justify-between gap-3 h-full overflow-visible">
                {!isFilterExpanded ? (
                  <div className="flex items-center justify-center w-full relative">
                    <button
                      type="button"
                      onClick={() => setIsFilterExpanded(true)}
                      className="absolute left-0 w-9 h-9 flex items-center justify-center rounded-full bg-zinc-50 hover:bg-zinc-100 text-zinc-500 transition-colors cursor-pointer shrink-0 scale-[0.8] origin-center z-10"
                      title="필터링 섹션 펼치기"
                    >
                      <Filter className="w-4 h-4" />
                    </button>
                    <span className="text-[16px] font-semibold text-zinc-800 select-none truncate text-center px-10">
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
                            setSelectedDate(undefined);
                            setSelectedWeek(null);
                            setSelectedStudent(null);
                            if (activeTab !== '필터') {
                              navigate('/tasks/filter');
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
                  <Card className="rounded-[2rem] border-none ring-0 shadow-sm bg-white overflow-hidden w-full max-w-[350px] lg:w-[350px] h-fit flex flex-col mx-auto">
                    <CardContent className="p-5" style={{ paddingTop: '12px', paddingBottom: '12px' }}>
                      
                      {/* Calendar Header */}
                      <div className="relative flex items-center justify-center h-10 mb-4 w-full">
                        <div className="flex items-center gap-[4px]">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-full w-8 h-8 hover:bg-zinc-100 cursor-pointer"
                            onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                          >
                            <ChevronLeft className="w-4 h-4 text-zinc-650" />
                          </Button>
                          <span className="text-[15.5px] font-semibold text-zinc-800 select-none text-center min-w-[90px]">
                            {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-full w-8 h-8 hover:bg-zinc-100 cursor-pointer"
                            onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                          >
                            <ChevronRight className="w-4 h-4 text-zinc-650" />
                          </Button>
                        </div>
                      </div>

                      {/* Week headers */}
                      <div className="flex gap-1 text-center mb-2 font-normal items-center w-full">
                        <div className="w-[28px] shrink-0 text-[11px] font-semibold text-zinc-400 select-none text-center">W</div>
                        <div className="flex-1 grid grid-cols-7 text-center">
                          {['월', '화', '수', '목', '금', '토', '일'].map((dayName, index) => (
                            <div 
                              key={dayName} 
                              className={`text-[13px] font-medium py-1 select-none ${
                                index === 6 ? 'text-red-500' : 'text-zinc-650'
                              }`}
                            >
                              {dayName}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Weeks/Days Grid */}
                      <div className="flex flex-col gap-1">
                        {taskWeeks.map((weekDays, weekIdx) => {
                          const monday = weekDays[0];
                          const weekNum = getWeek(monday, { weekStartsOn: 1 });
                          
                          const isWeekSelected = selectedWeek && selectedWeek.dates.some(d => {
                            return isSameDay(d, monday);
                          });

                          return (
                            <div key={weekIdx} className="flex gap-1 items-center w-full">
                              
                              {/* Week Selector Button */}
                              <div className="w-[28px] shrink-0 flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleWeekNumberClick(weekNum, weekDays, e);
                                  }}
                                  className={`w-6 h-6 flex items-center justify-center text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
                                    isWeekSelected 
                                      ? 'bg-primary/10 text-primary font-bold' 
                                      : 'text-zinc-400 hover:text-primary hover:bg-zinc-100'
                                  }`}
                                >
                                  {weekNum}
                                </button>
                              </div>

                              {/* 7 Days of the Week */}
                              <div className={`flex-1 grid grid-cols-7 items-center ${isWeekSelected ? 'bg-blue-50/80 rounded-full py-[1px]' : ''}`}>
                                {weekDays.map((day) => {
                                  const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                                  const isCurrentMonth = isSameMonth(day, currentMonth);
                                  const isTodayDate = isSameDay(day, new Date());
                                  const isSunday = day.getDay() === 0;

                                  let circleClass = "w-8 h-8 rounded-full flex items-center justify-center transition-all relative mx-auto ";
                                  let textClass = "text-[13.5px] select-none ";

                                  if (isSelected) {
                                    circleClass += "bg-primary text-white font-bold shadow-sm shadow-primary/25";
                                  } else if (isWeekSelected) {
                                    circleClass += "text-blue-600 font-semibold hover:bg-blue-100/70";
                                  } else {
                                    circleClass += isCurrentMonth ? "hover:bg-zinc-100" : "";
                                    if (isCurrentMonth) {
                                      textClass += (isSunday || isKoreanHoliday(day)) ? "text-red-500" : "text-zinc-850";
                                    } else {
                                      textClass += "text-zinc-350";
                                    }
                                  }

                                  return (
                                    <div
                                      key={day.toISOString()}
                                      onClick={() => {
                                        if (isSelected) {
                                          handleDateSelect(undefined);
                                        } else {
                                          handleDateSelect(day);
                                        }
                                      }}
                                      className={`py-0.5 flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all select-none relative ${
                                        isCurrentMonth ? "" : "opacity-40"
                                      }`}
                                    >
                                      <div className={circleClass}>
                                        <span className={textClass}>
                                          {format(day, 'd')}
                                        </span>
                                        {isTodayDate && (
                                          <span className={`absolute bottom-[2px] left-0 right-0 h-[2.5px] rounded-full mx-auto w-2.5 ${isSelected ? 'bg-white' : 'bg-primary'}`} />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                            </div>
                          );
                        })}
                      </div>

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
                        onChange={handleStudentSelect}
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

          <MobileFilterBar
            taskSearchQuery={taskSearchQuery}
            setTaskSearchQuery={setTaskSearchQuery}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedStudent={selectedStudent}
            setSelectedStudent={setSelectedStudent}
            selectedWeek={selectedWeek}
            setSelectedWeek={setSelectedWeek}
            activeTab={activeTab}
            students={students}
          />
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


                  </div>
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
                                todoGroup.map(task => (
                                  <TaskRow
                                    key={task.sheetRowIndex}
                                    task={task}
                                    editingRowIndex={editingRowIndex}
                                    submitting={submitting}
                                    editForm={editForm}
                                    setEditForm={setEditForm}
                                    students={students}
                                    handleStartEdit={handleStartEdit}
                                    handleSaveEdit={handleSaveEdit}
                                    handleDeleteTask={handleDeleteTask}
                                    handleQuickComplete={handleQuickComplete}
                                    setReservingTask={setReservingTask}
                                    setEditingRowIndex={setEditingRowIndex}
                                  />
                                ))
                              )}

                              {inlineAddGroup === 'todo' ? (
                                <InlineAddForm
                                  group="todo"
                                  newForm={newForm}
                                  setNewForm={setNewForm}
                                  students={students}
                                  submitting={submitting}
                                  handleCreateTask={handleCreateTask}
                                  setInlineAddGroup={setInlineAddGroup}
                                />
                              ) : (
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
                                inProgressGroup.map(task => (
                                  <TaskRow
                                    key={task.sheetRowIndex}
                                    task={task}
                                    editingRowIndex={editingRowIndex}
                                    submitting={submitting}
                                    editForm={editForm}
                                    setEditForm={setEditForm}
                                    students={students}
                                    handleStartEdit={handleStartEdit}
                                    handleSaveEdit={handleSaveEdit}
                                    handleDeleteTask={handleDeleteTask}
                                    handleQuickComplete={handleQuickComplete}
                                    setReservingTask={setReservingTask}
                                    setEditingRowIndex={setEditingRowIndex}
                                  />
                                ))
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
                                completedGroup.map(task => (
                                  <TaskRow
                                    key={task.sheetRowIndex}
                                    task={task}
                                    editingRowIndex={editingRowIndex}
                                    submitting={submitting}
                                    editForm={editForm}
                                    setEditForm={setEditForm}
                                    students={students}
                                    handleStartEdit={handleStartEdit}
                                    handleSaveEdit={handleSaveEdit}
                                    handleDeleteTask={handleDeleteTask}
                                    handleQuickComplete={handleQuickComplete}
                                    setReservingTask={setReservingTask}
                                    setEditingRowIndex={setEditingRowIndex}
                                  />
                                ))
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
                        nextWeekTasks.map(task => (
                          <TaskRow
                            key={task.sheetRowIndex}
                            task={task}
                            editingRowIndex={editingRowIndex}
                            submitting={submitting}
                            editForm={editForm}
                            setEditForm={setEditForm}
                            students={students}
                            handleStartEdit={handleStartEdit}
                            handleSaveEdit={handleSaveEdit}
                            handleDeleteTask={handleDeleteTask}
                            handleQuickComplete={handleQuickComplete}
                            setReservingTask={setReservingTask}
                            setEditingRowIndex={setEditingRowIndex}
                          />
                        ))
                      )}

                      {inlineAddGroup === 'nextWeek' ? (
                        <InlineAddForm
                          group="nextWeek"
                          newForm={newForm}
                          setNewForm={setNewForm}
                          students={students}
                          submitting={submitting}
                          handleCreateTask={handleCreateTask}
                          setInlineAddGroup={setInlineAddGroup}
                        />
                      ) : (
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
                        familyTasks.map(task => (
                          <FamilyTaskRow
                            key={task.sheetRowIndex}
                            task={task}
                            editingRowIndex={editingRowIndex}
                            submitting={submitting}
                            editForm={editForm}
                            setEditForm={setEditForm}
                            students={students}
                            handleStartEdit={handleStartEdit}
                            handleSaveEdit={handleSaveEdit}
                            handleDeleteTask={handleDeleteTask}
                            handleQuickComplete={handleQuickComplete}
                            setReservingTask={setReservingTask}
                            setEditingRowIndex={setEditingRowIndex}
                          />
                        ))
                      )}

                      {inlineAddGroup === 'familyView' ? (
                        <InlineAddForm
                          group="familyView"
                          newForm={newForm}
                          setNewForm={setNewForm}
                          students={students}
                          submitting={submitting}
                          handleCreateTask={handleCreateTask}
                          setInlineAddGroup={setInlineAddGroup}
                        />
                      ) : (
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
                          {filterTasks.map(task => (
                            <TaskRow
                              key={task.sheetRowIndex}
                              task={task}
                              editingRowIndex={editingRowIndex}
                              submitting={submitting}
                              editForm={editForm}
                              setEditForm={setEditForm}
                              students={students}
                              handleStartEdit={handleStartEdit}
                              handleSaveEdit={handleSaveEdit}
                              handleDeleteTask={handleDeleteTask}
                              handleQuickComplete={handleQuickComplete}
                              setReservingTask={setReservingTask}
                              setEditingRowIndex={setEditingRowIndex}
                            />
                          ))}
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
}
