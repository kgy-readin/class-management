import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ListFilter, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Student, getShortHash } from '../../types';
import StudentCombobox from '../common/StudentCombobox';
import { motion, AnimatePresence } from 'motion/react';

interface MobileFilterBarProps {
  taskSearchQuery: string;
  setTaskSearchQuery: (val: string) => void;
  selectedDate: Date | undefined;
  setSelectedDate: (d: Date | undefined) => void;
  selectedStudent: string | null;
  setSelectedStudent: (s: string | null) => void;
  selectedWeek: { weekNumber: number; dates: Date[] } | null;
  setSelectedWeek: (w: { weekNumber: number; dates: Date[] } | null) => void;
  activeTab: string;
  students: Student[];
}

export default function MobileFilterBar({
  taskSearchQuery,
  setTaskSearchQuery,
  selectedDate,
  setSelectedDate,
  selectedStudent,
  setSelectedStudent,
  selectedWeek,
  setSelectedWeek,
  activeTab,
  students,
}: MobileFilterBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showSearch, setShowSearch] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState(taskSearchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync showSearch state from URL path or active filters
  useEffect(() => {
    if (
      location.pathname.includes('/tasks/filter') ||
      taskSearchQuery.trim() !== '' ||
      selectedDate !== undefined ||
      selectedStudent !== null
    ) {
      setShowSearch(true);
    } else {
      setShowSearch(false);
    }
  }, [location.pathname, taskSearchQuery, selectedDate, selectedStudent]);

  // Sync local search query with parent's taskSearchQuery
  useEffect(() => {
    setLocalSearchQuery(taskSearchQuery);
  }, [taskSearchQuery]);

  const handleToggleSearch = () => {
    if (showSearch) {
      // Toggle off -> clear query, clear date and student filters, and navigate back to /tasks/work
      setLocalSearchQuery('');
      setTaskSearchQuery('');
      setSelectedDate(undefined);
      setSelectedStudent(null);
      setSelectedWeek(null);
      setShowSearch(false);
      navigate('/tasks/work');
    } else {
      // Toggle on -> go to /tasks/filter
      setShowSearch(true);
      navigate('/tasks/filter');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearchQuery(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = localSearchQuery;
      setTaskSearchQuery(val);
      if (val.trim() !== '') {
        // Clear other filters for mutual exclusivity with search as requested previously
        setSelectedDate(undefined);
        setSelectedStudent(null);
        setSelectedWeek(null);
        if (activeTab !== '필터') {
          navigate('/tasks/filter');
        }
      }
    }
  };

  const handleClearSearch = () => {
    setLocalSearchQuery('');
    setTaskSearchQuery('');
  };

  const handleMobileDateChange = (val: string) => {
    if (val) {
      setSelectedStudent(null);
      setSelectedWeek(null);
      navigate(`/tasks/filter/date/${val}`);
    } else {
      setSelectedDate(undefined);
      navigate('/tasks/filter');
    }
  };

  const handleMobileStudentChange = (val: string) => {
    if (val) {
      setSelectedDate(undefined);
      setSelectedWeek(null);
      navigate(`/tasks/filter/students/${getShortHash(val)}`);
    } else {
      setSelectedStudent(null);
      navigate('/tasks/filter');
    }
  };

  const handleClearFilters = () => {
    setLocalSearchQuery('');
    setTaskSearchQuery('');
    setSelectedDate(undefined);
    setSelectedStudent(null);
    setSelectedWeek(null);
    navigate('/tasks/work');
  };

  const displayDate = selectedDate || new Date();
  const formattedDate = format(displayDate, 'yyyy년 M월 d일 eeee', { locale: ko });
  const hasAnyFilter = !!(selectedDate || selectedStudent || selectedWeek || taskSearchQuery.trim());

  return (
    <div className="flex md:hidden w-full h-fit flex-col font-sans select-none px-0">
      <div className="bg-white rounded-[2rem] shadow-sm border border-zinc-100/60 flex flex-col w-full overflow-hidden transition-all duration-300">
        
        {/* Always visible Header Row */}
        <div className="flex items-center justify-center h-14 px-3 w-full shrink-0 relative">
          {/* Filter Toggle Button */}
          <button
            onClick={handleToggleSearch}
            className={`absolute left-3 h-9 w-9 flex items-center justify-center rounded-full transition-all cursor-pointer shrink-0 z-10 ${
              showSearch || hasAnyFilter
                ? 'bg-blue-50 text-[#2563eb]'
                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-500'
            }`}
            title="필터 설정"
          >
            <ListFilter className="w-4 h-4" />
          </button>

          {/* Date display text (Always matches thin bar view) */}
          <div className="flex items-center justify-center text-center px-12 min-w-0">
            <div className="text-[15px] font-semibold text-zinc-700 font-sans tracking-tight truncate">
              {formattedDate}
            </div>
          </div>
        </div>

        {/* Collapsible area: Search input & Horizontally aligned dropdowns inside the SAME block */}
        <AnimatePresence initial={false}>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden w-full flex flex-col"
            >
              {/* Row 1: Search Input */}
              <div className="px-4 pb-2.5">
                <div className="relative w-full">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="할일 검색"
                    value={localSearchQuery}
                    onChange={handleSearchChange}
                    onKeyDown={handleKeyDown}
                    className="w-full h-9 bg-zinc-50/50 border border-zinc-200/60 rounded-xl px-3.5 pr-8 text-[13px] font-semibold text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all font-sans"
                  />
                  {localSearchQuery.trim() !== '' && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Horizontal Dropdowns (마감일 선택 + 학생 선택) */}
              <div className="px-4 pb-4 flex flex-row gap-2 items-center justify-between w-full">
                {/* Due date picker with fixed width & custom placeholder text */}
                <div className="relative w-[125px] shrink-0 h-[34px] transition-all">
                  <input
                    type="date"
                    value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) => handleMobileDateChange(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-2.5 rounded-xl border border-solid border-zinc-200 bg-white text-zinc-700 pointer-events-none z-10 text-[11.5px] font-semibold h-full">
                    <span className={selectedDate ? 'text-zinc-700' : 'text-zinc-400'}>
                      {selectedDate ? format(selectedDate, 'M월 d일', { locale: ko }) : '마감일'}
                    </span>
                    <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  </div>
                </div>

                {/* Student selection dropdown taking the remaining horizontal space */}
                <div className="flex-1 min-w-0 h-[34px]">
                  <StudentCombobox
                    students={students}
                    value={selectedStudent || ''}
                    onChange={handleMobileStudentChange}
                    placeholder="학생명"
                    className="w-full h-full font-sans"
                    inputClassName="bg-white border-solid border-zinc-200 text-[12px] font-semibold h-[34px] rounded-xl w-full"
                  />
                </div>

                {/* Filter Reset Button inside the block */}
                {hasAnyFilter && (
                  <button
                    onClick={handleClearFilters}
                    className="h-[34px] w-[34px] border border-solid border-zinc-200 hover:border-blue-400 text-zinc-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl font-bold flex items-center justify-center bg-white transition-all shadow-none shrink-0 cursor-pointer"
                    title="필터 초기화"
                  >
                    <X className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
