import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardData, Student } from '../../types';
import { toast } from 'sonner';
import { MESSAGES } from '@/src/constants/messages';
import { User, ArrowUpCircle, Search, Trash2, Plus, LogOut, UserCog, Pencil, ListFilter } from 'lucide-react';
import { formatLevel, getWeeksSince, isResultDelayed } from '@/lib/utils';
import { attendanceApi, studentApi } from '@/src/services/api';
import StudentMemoPopover from './StudentMemoPopover';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BulkDismissDialog, 
  AddStudentDialog, 
  DeleteStudentDialog, 
  AttendanceDialog, 
  StudentEditInfoDialog,
  LevelUpDialog
} from './StudentPopups';

interface StudentListProps {
  data: DashboardData | null;
  onRefresh: () => void;
  onSelectStudent: (name: string) => void;
  setData?: React.Dispatch<React.SetStateAction<DashboardData | null>>;
}

export default function StudentList({ data, onRefresh, onSelectStudent, setData }: StudentListProps) {
  const [search, setSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showDayFilter, setShowDayFilter] = useState(false);

  // States for features
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkDismissOpen, setIsBulkDismissOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkDismissing, setIsBulkDismissing] = useState(false);

  // Single-instance dialog states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [attendanceStudent, setAttendanceStudent] = useState<Student | null>(null);
  const [levelUpStudent, setLevelUpStudent] = useState<Student | null>(null);

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (formData: {
    grade: string;
    level: string;
    subProgram: string;
    attendanceDays: string[];
    homeworkMissed: number;
    booksCompleted: number;
    lastResultDate: string;
  }) => {
    if (!editingStudent) return;
    try {
      setIsSavingEdit(true);
      await studentApi.update(editingStudent.name, {
        grade: formData.grade,
        level: formData.level,
        subProgram: formData.subProgram.trim() || '-',
        attendanceDays: formData.attendanceDays.join(', '),
        homeworkMissed: Number(formData.homeworkMissed) || 0,
        booksCompleted: Number(formData.booksCompleted) || 0,
        lastResultDate: formData.lastResultDate
      });
      toast.success(MESSAGES.students.editSuccess(editingStudent.name));
      setIsEditOpen(false);
      setEditingStudent(null);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleAddStudentSubmit = async (formData: {
    name: string;
    grade: string;
    level: string;
    subProgram: string;
    attendanceDays: string[];
    booksCompleted: number;
  }) => {
    const trimmedName = formData.name.trim();
    const trimmedGrade = formData.grade.trim();
    if (!trimmedName) {
      toast.error(MESSAGES.students.enterName);
      return;
    }
    if (!trimmedGrade) {
      toast.error(MESSAGES.students.enterGrade);
      return;
    }
    if (!formData.level) {
      toast.error(MESSAGES.students.enterLevel);
      return;
    }

    try {
      setIsAdding(true);
      await studentApi.add({
        name: trimmedName,
        grade: trimmedGrade,
        level: formData.level,
        subProgram: formData.subProgram.trim() || '-',
        attendanceDays: formData.attendanceDays.join(', '),
        booksCompleted: formData.booksCompleted || 0
      });
      toast.success(MESSAGES.students.registerSuccess(trimmedName));
      setIsAddOpen(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStudent) return;
    try {
      setIsDeleting(true);
      await studentApi.delete(deletingStudent.name);
      toast.success(MESSAGES.students.deleteSuccess(deletingStudent.name));
      setDeletingStudent(null);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAttendanceConfirm = async (isAttending: boolean, dismissalTime: string) => {
    if (!attendanceStudent) return;
    const targetName = attendanceStudent.name;

    // 1. Optimistic update
    if (setData) {
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          students: prev.students.map(s => {
            if (s.name === targetName) {
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

    try {
      setAttendanceStudent(null);
      await attendanceApi.update({ name: targetName, isAttending, dismissalTime });
      toast.success(MESSAGES.students.attendanceSuccess(targetName, isAttending));
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
      onRefresh(); // rollback/resync on error
    }
  };

  const handleSimpleDismiss = async (name: string) => {
    // 1. Optimistic update
    if (setData) {
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          students: prev.students.map(s => {
            if (s.name === name) {
              return {
                ...s,
                isAttending: false,
                dismissalTime: ''
              };
            }
            return s;
          })
        };
      });
    }

    try {
      await attendanceApi.update({ name, isAttending: false, dismissalTime: '' });
      toast.success(MESSAGES.students.dismissalSuccess(name));
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
      onRefresh(); // rollback/resync on error
    }
  };

  const handleLevelUpConfirm = async () => {
    if (!levelUpStudent) return;
    try {
      await studentApi.levelUp(levelUpStudent.name);
      toast.success(MESSAGES.students.levelUpSuccess(levelUpStudent.name));
      setLevelUpStudent(null);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleBulkDismissConfirm = async () => {
    try {
      setIsBulkDismissing(true);
      await attendanceApi.bulkDismiss();
      toast.success(MESSAGES.students.bulkDismissalSuccess);
      setIsBulkDismissOpen(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsBulkDismissing(false);
    }
  };

  if (!data) return null;

  const attendingStudentsCount = data.students.filter(s => s.isAttending).length;

  const filteredStudents = data.students
    .filter(s => {
      if (selectedDay) {
        const matchesDay = (s.attendanceDays || '').includes(selectedDay);
        const isCurrentlyAttending = !!s.isAttending;
        if (!matchesDay && !isCurrentlyAttending) {
          return false;
        }
      }

      const searchLower = search.trim().toLowerCase();
      if (!searchLower) return true;

      // Check if search match is purely for a day of week
      const daysOfWeek = ['월', '화', '수', '목', '금', '토', '일'];
      const targetDay = searchLower.replace('요일', '');
      const isSearchDay = daysOfWeek.includes(targetDay);

      if (isSearchDay) {
        return (s.attendanceDays || '').includes(targetDay);
      }

      const nameLower = s.name.toLowerCase();
      const gradeLower = s.grade.toLowerCase();
      const formattedLvl = formatLevel(s.level).toLowerCase();
      
      const levelNumStr = String(s.level);
      const isLevelZero = levelNumStr === '0' || levelNumStr === '0.0' || levelNumStr === '' || levelNumStr === 'null' || levelNumStr === 'undefined';
      
      const levelStrings: string[] = [formattedLvl];
      if (isLevelZero) {
        levelStrings.push('기초');
        levelStrings.push('0레벨');
      } else {
        levelStrings.push(`${levelNumStr}레벨`);
        levelStrings.push(`lv.${levelNumStr}`);
        levelStrings.push(`lv${levelNumStr}`);
      }

      const matchesLevel = levelStrings.some(lvlStr => lvlStr.toLowerCase().includes(searchLower));

      return (
        nameLower.includes(searchLower) ||
        gradeLower.includes(searchLower) ||
        matchesLevel
      );
    })
    .sort((a, b) => {
      if (a.isAttending !== b.isAttending) return a.isAttending ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-md pt-3 pb-2 -mx-4 px-4 -mt-3 border-b border-border/10 mb-2">
        <div className="flex flex-col gap-2.5">
          {/* 검색바 및 버튼 그룹 (동일 높이, 버튼 그룹 오른쪽 정렬) */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="이름, 학년, 레벨, 요일"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10 rounded-xl border-neutral-200 text-sm"
                />
              </div>

              {/* 데스크탑 전용 요일 필터 토글 버튼 */}
              <Button 
                type="button"
                variant="ghost"
                onClick={() => setShowDayFilter(!showDayFilter)}
                title="요일 필터"
                className={`hidden md:flex rounded-xl w-10 h-10 p-0 items-center justify-center transition-all shrink-0 border-none shadow-none ${
                  showDayFilter 
                    ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                    : 'bg-transparent hover:bg-neutral-50'
                }`}
              >
                <ListFilter className="w-4 h-4 text-neutral-600" />
              </Button>

              {/* 가로로 열리는 요일 필터 슬라이더 */}
              <AnimatePresence initial={false}>
                {showDayFilter && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className="hidden md:flex items-center overflow-hidden shrink-0"
                  >
                    <div className="flex items-center gap-5 bg-transparent px-4 py-2 h-10 border-none shadow-none">
                      {['월', '화', '수', '목', '금', '토'].map((day) => {
                        const isSelected = selectedDay === day;
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setSelectedDay(isSelected ? null : day)}
                            className={`text-sm font-semibold transition-all relative py-0.5 px-1 cursor-pointer select-none shrink-0 ${
                              isSelected 
                                ? 'text-primary' 
                                : 'text-neutral-500 hover:text-neutral-800'
                            }`}
                          >
                            {day}
                            {isSelected && (
                              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 버튼 묶음 (오른쪽 정렬) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* 일괄 하원 버튼 */}
              <Button 
                variant="outline"
                disabled={attendingStudentsCount === 0}
                onClick={() => setIsBulkDismissOpen(true)}
                title="일괄 하원"
                className="rounded-xl w-10 h-10 p-0 flex items-center justify-center border-red-100 bg-red-50 text-red-600 hover:bg-red-100/80 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm"
              >
                <LogOut className="w-4 h-4" />
              </Button>

              {/* 추가 버튼 */}
              <Button 
                variant="outline"
                onClick={() => setIsAddOpen(true)}
                title="학생 추가"
                className="rounded-xl w-10 h-10 p-0 flex items-center justify-center border-neutral-200 hover:bg-neutral-50 shadow-sm"
              >
                <Plus className="w-4 h-4 text-neutral-600" />
              </Button>

              {/* 학생 관리 모드 토글 버튼 */}
              <Button 
                variant={isDeleteMode ? "destructive" : "outline"}
                onClick={() => setIsDeleteMode(!isDeleteMode)}
                title={isDeleteMode ? "관리 종료" : "학생 관리"}
                className={`rounded-xl w-10 h-10 p-0 flex items-center justify-center transition-all ${
                  isDeleteMode 
                    ? 'shadow-md shadow-destructive/15 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:text-primary' 
                    : 'border-neutral-200 hover:bg-neutral-50 shadow-sm'
                }`}
              >
                <UserCog className="w-4 h-4 text-neutral-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredStudents.map(student => (
          <div 
            key={student.name} 
            className={`flex items-center justify-between p-4 rounded-[1.5rem] border transition-all bg-white hover:shadow-md ${
              isDeleteMode
                ? 'border-red-200 hover:border-red-400'
                : student.isAttending 
                  ? 'border-primary/30 shadow-sm' 
                  : 'border-border/50'
            }`}
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                disabled={isDeleteMode}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all p-0 ${
                  student.isAttending 
                    ? 'bg-[#f0f7ff] text-primary border border-[#dbeafe] shadow-sm hover:bg-[#e0efff]' 
                    : 'bg-background text-muted-foreground border border-border/50 hover:bg-secondary'
                } ${isDeleteMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !isDeleteMode && onSelectStudent(student.name)}
                title={isDeleteMode ? "삭제 모드에서는 상세 정보를 열 수 없습니다" : `${student.name} 학생 상세 정보`}
              >
                <User className="w-6 h-6" />
              </Button>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg text-foreground truncate">{student.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{student.grade}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-xs font-semibold text-primary">
                    {formatLevel(student.level)}
                  </span>
                </div>
              </div>

              <div className="hidden sm:flex md:hidden lg:flex items-center gap-6 px-6 border-l border-border/50 ml-2 shrink-0">
                <div className="text-center">
                  <span className="block text-[10px] font-normal text-muted-foreground uppercase tracking-wider mb-1">완독</span>
                  <span className="text-base font-extrabold text-foreground">{student.booksCompleted}</span>
                </div>
                <div className="text-center">
                  <span className="block text-[10px] font-normal text-muted-foreground uppercase tracking-wider mb-1">미제출</span>
                  <span className={`text-base font-extrabold ${student.homeworkMissed > 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {student.homeworkMissed}
                  </span>
                </div>
                <div className="text-center hidden xl:block">
                  <span className="block text-[10px] font-normal text-muted-foreground uppercase tracking-wider mb-1">결과물</span>
                  <span className={`text-base font-extrabold ${isResultDelayed(student.level, student.lastResultDate) ? 'text-red-600' : 'text-foreground'}`}>
                    {getWeeksSince(student.lastResultDate)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-4 shrink-0">
              {isDeleteMode ? (
                <div className="flex items-center gap-1.5">
                  {/* 수정 버튼 */}
                  <Button
                    variant="outline"
                    size="icon"
                    title="수정"
                    onClick={() => handleOpenEdit(student)}
                    className="rounded-2xl w-11 h-11 border-neutral-200 bg-white hover:bg-neutral-50 hover:text-primary transition-all text-neutral-600 flex items-center justify-center shadow-sm"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>

                  {/* 삭제 버튼 */}
                  <Button 
                    variant="outline" 
                    size="icon"
                    title="삭제"
                    onClick={() => setDeletingStudent(student)}
                    className="rounded-2xl w-11 h-11 border-red-100 bg-red-50 text-red-600 hover:bg-red-100/80 transition-all flex items-center justify-center shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  {student.isAttending ? (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="rounded-2xl h-11 px-6 text-[13px] font-semibold shadow-lg shadow-destructive/20 cursor-pointer"
                      onClick={() => handleSimpleDismiss(student.name)}
                    >
                      하원
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setAttendanceStudent(student)}
                      className="rounded-2xl h-11 px-6 text-[13px] font-semibold bg-[#f0f7ff] text-primary border-[#dbeafe] shadow-sm hover:bg-[#e0efff] transition-all cursor-pointer"
                    >
                      등원
                    </Button>
                  )}
                  
                  <StudentMemoPopover student={student} onRefresh={onRefresh} />
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* --- RENDER DIALOGS --- */}
      <BulkDismissDialog 
        open={isBulkDismissOpen}
        onOpenChange={setIsBulkDismissOpen}
        onConfirm={handleBulkDismissConfirm}
        isSubmitting={isBulkDismissing}
      />

      <AddStudentDialog 
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onAdd={handleAddStudentSubmit}
        isSubmitting={isAdding}
      />

      {deletingStudent && (
        <DeleteStudentDialog 
          open={!!deletingStudent}
          onOpenChange={(open) => !open && setDeletingStudent(null)}
          studentName={deletingStudent.name}
          onConfirm={handleDeleteConfirm}
          isSubmitting={isDeleting}
        />
      )}

      {attendanceStudent && (
        <AttendanceDialog 
          open={!!attendanceStudent}
          onOpenChange={(open) => !open && setAttendanceStudent(null)}
          studentName={attendanceStudent.name}
          onConfirm={handleAttendanceConfirm}
        />
      )}

      {levelUpStudent && (
        <LevelUpDialog 
          open={!!levelUpStudent}
          onOpenChange={(open) => !open && setLevelUpStudent(null)}
          studentName={levelUpStudent.name}
          currentLevel={levelUpStudent.level}
          onConfirm={handleLevelUpConfirm}
        />
      )}

      {isEditOpen && editingStudent && (
        <StudentEditInfoDialog 
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          student={editingStudent}
          onSave={handleSaveEdit}
          isSaving={isSavingEdit}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
