import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardData, Student } from '../../types';
import { toast } from 'sonner';
import { User, ArrowUpCircle, Search, Trash2, Plus, LogOut, UserCog, Pencil, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { formatLevel, getWeeksSince, isResultDelayed } from '@/lib/utils';
import { attendanceApi, studentApi } from '@/src/services/api';

interface StudentListProps {
  data: DashboardData | null;
  onRefresh: () => void;
  onSelectStudent: (name: string) => void;
}

export default function StudentList({ data, onRefresh, onSelectStudent }: StudentListProps) {
  const [search, setSearch] = useState('');
  const [dismissalTime, setDismissalTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [addedMinutes, setAddedMinutes] = useState(0);

  const getCurrentTimeHHMM = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const addMinutesToTime = (timeHHMM: string, mins: number): string => {
    if (!timeHHMM) return '';
    const [hStr, mStr] = timeHHMM.split(':');
    let h = parseInt(hStr, 10);
    let m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return timeHHMM;

    m += mins;
    h += Math.floor(m / 60);
    m = m % 60;
    if (m < 0) {
      m += 60;
      h -= 1;
    }
    h = (h + 24) % 24;

    const newH = String(h).padStart(2, '0');
    const newM = String(m).padStart(2, '0');
    return `${newH}:${newM}`;
  };

  const handleAddMinutes = (min: number) => {
    setAddedMinutes(prev => {
      const next = prev + min;
      setDismissalTime(addMinutesToTime(arrivalTime, next));
      return next;
    });
  };

  const handleArrivalTimeChange = (newVal: string) => {
    setArrivalTime(newVal);
    setDismissalTime(addMinutesToTime(newVal, addedMinutes));
  };

  // States for new features
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkDismissOpen, setIsBulkDismissOpen] = useState(false);

  // Add Student form states
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [newLevel, setNewLevel] = useState('0');
  const [newSubProgram, setNewSubProgram] = useState('');
  const [newAttendanceDays, setNewAttendanceDays] = useState<string[]>([]);
  const [newBooksCompleted, setNewBooksCompleted] = useState<number>(0);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkDismissing, setIsBulkDismissing] = useState(false);

  // Edit Student form states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editGrade, setEditGrade] = useState('');
  const [editLevel, setEditLevel] = useState('0');
  const [editSubProgram, setEditSubProgram] = useState('');
  const [editAttendanceDays, setEditAttendanceDays] = useState<string[]>([]);
  const [editHomeworkMissed, setEditHomeworkMissed] = useState<number>(0);
  const [editBooksCompleted, setEditBooksCompleted] = useState<number>(0);
  const [editLastResultDate, setEditLastResultDate] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setEditGrade(student.grade);
    setEditLevel(student.level || '0');
    setEditSubProgram(student.subProgram || '');
    setEditAttendanceDays(
      student.attendanceDays
        ? student.attendanceDays.split(',').map(s => s.trim()).filter(Boolean)
        : []
    );
    setEditHomeworkMissed(student.homeworkMissed || 0);
    setEditBooksCompleted(student.booksCompleted || 0);
    setEditLastResultDate(student.lastResultDate || '');
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    try {
      setIsSavingEdit(true);
      await studentApi.update(editingStudent.name, {
        grade: editGrade,
        level: editLevel,
        subProgram: editSubProgram.trim() || '-',
        attendanceDays: editAttendanceDays.join(', '),
        homeworkMissed: Number(editHomeworkMissed) || 0,
        booksCompleted: Number(editBooksCompleted) || 0,
        lastResultDate: editLastResultDate
      });
      toast.success(`${editingStudent.name} 학생의 정보가 수정되었습니다.`);
      setIsEditOpen(false);
      setEditingStudent(null);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (!data) return null;

  const attendingStudentsCount = data.students.filter(s => s.isAttending).length;

  const filteredStudents = data.students
    .filter(s => {
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

  const handleAttendance = async (name: string, isAttending: boolean, time: string) => {
    try {
      await attendanceApi.update({ name, isAttending, dismissalTime: time });
      toast.success(isAttending ? `${name} 학생 등원 처리되었습니다.` : `${name} 학생 하원 처리되었습니다.`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleLevelUp = async (name: string) => {
    try {
      await studentApi.levelUp(name);
      toast.success(`${name} 학생이 레벨업되었습니다!`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleBulkDismiss = async () => {
    try {
      setIsBulkDismissing(true);
      await attendanceApi.bulkDismiss();
      toast.success('모든 등원 중인 학생이 일괄 하원 처리되었습니다.');
      setIsBulkDismissOpen(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsBulkDismissing(false);
    }
  };

  const handleAddStudent = async () => {
    const trimmedName = newName.trim();
    const trimmedGrade = newGrade.trim();
    if (!trimmedName) {
      toast.error('학생 이름을 입력해 주세요.');
      return;
    }
    if (!trimmedGrade) {
      toast.error('학년을 입력해 주세요.');
      return;
    }

    try {
      setIsAdding(true);
      await studentApi.add({
        name: trimmedName,
        grade: trimmedGrade,
        level: newLevel,
        subProgram: newSubProgram.trim() || '-',
        attendanceDays: newAttendanceDays.join(', '),
        booksCompleted: Number(newBooksCompleted) || 0
      });
      toast.success(`${trimmedName} 학생이 성공적으로 등록되었습니다.`);
      
      // Reset form fields
      setNewName('');
      setNewGrade('');
      setNewLevel('0');
      setNewSubProgram('');
      setNewAttendanceDays([]);
      setNewBooksCompleted(0);
      setIsAddOpen(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteStudent = async (name: string) => {
    try {
      await studentApi.delete(name);
      toast.success(`${name} 학생 정보와 커리큘럼 데이터가 안전하게 완전히 삭제되었습니다.`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-md pt-3 pb-2 -mx-4 px-4 -mt-3 border-b border-border/10 mb-2">
        <div className="flex flex-col gap-2.5">
          {/* 검색바 및 버튼 그룹 (동일 높이, 버튼 그룹 오른쪽 정렬) */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="이름, 학년, 레벨, 요일"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-xl border-neutral-200 text-sm"
              />
            </div>

            {/* 버튼 묶음 (오른쪽 정렬) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* 일괄 하원 버튼 */}
              <Dialog open={isBulkDismissOpen} onOpenChange={setIsBulkDismissOpen}>
                <DialogTrigger render={
                  <Button 
                    variant="outline"
                    disabled={attendingStudentsCount === 0}
                    title="일괄 하원"
                    className="rounded-xl w-10 h-10 p-0 flex items-center justify-center border-red-100 bg-red-50 text-red-600 hover:bg-red-100/80 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-sm"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                } />
                <DialogContent className="sm:max-w-[360px] rounded-[2.5rem] border-none shadow-2xl p-6">
                  <div className="text-center space-y-5">
                    <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                      <LogOut className="w-6 h-6" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-extrabold text-foreground">학생 일괄 하원</h3>
                      <p className="text-sm text-muted-foreground font-semibold leading-relaxed">
                        현재 등원 중인 <strong className="text-red-500">{attendingStudentsCount}</strong>명의 학생을<br />
                        모두 일괄 하원 처리 하시겠습니까?
                      </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <DialogClose render={
                        <Button variant="secondary" className="flex-1 h-11 rounded-xl font-semibold">
                          취소
                        </Button>
                      } />
                      <Button 
                        onClick={handleBulkDismiss}
                        disabled={isBulkDismissing}
                        className="flex-1 h-11 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold shadow-lg shadow-red-200"
                      >
                        {isBulkDismissing ? '처리 중...' : '확인'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* 추가 버튼 */}
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger render={
                  <Button 
                    variant="outline"
                    title="학생 추가"
                    className="rounded-xl w-10 h-10 p-0 flex items-center justify-center border-neutral-200 hover:bg-neutral-50 shadow-sm"
                  >
                    <Plus className="w-4 h-4 text-neutral-600" />
                  </Button>
                } />
                <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] border-none shadow-2xl p-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-xl font-extrabold text-foreground tracking-tight">새로운 학생 추가</h3>
                      <p className="text-xs text-muted-foreground font-medium">등원 및 커리큘럼 관리를 위한 신규 학생을 등록합니다.</p>
                    </div>
                    
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-600">이름 *</label>
                        <Input
                          placeholder="이름 입력 (예: 김철수)"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="rounded-xl h-10 border-neutral-200"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-neutral-600">학년 *</label>
                          <select
                            value={newGrade}
                            onChange={(e) => setNewGrade(e.target.value)}
                            className="w-full bg-white border border-neutral-200 rounded-xl px-3 h-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                          >
                            <option value="" disabled hidden>선택</option>
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
                          <label className="text-xs font-bold text-neutral-600">레벨 *</label>
                          <select 
                            value={newLevel} 
                            onChange={(e) => setNewLevel(e.target.value)}
                            className="w-full bg-white border border-neutral-200 rounded-xl px-3 h-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                          >
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
                        <label className="text-xs font-bold text-neutral-600">서브프로그램</label>
                        <Input
                          placeholder="서브프로그램 입력 (예: 독서지도)"
                          value={newSubProgram}
                          onChange={(e) => setNewSubProgram(e.target.value)}
                          className="rounded-xl h-10 border-neutral-200"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-600">등원 요일</label>
                        <div className="grid grid-cols-6 gap-1.5 pt-1">
                          {['월', '화', '수', '목', '금', '토'].map((day) => {
                            const isSelected = newAttendanceDays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setNewAttendanceDays(newAttendanceDays.filter(d => d !== day));
                                  } else {
                                    setNewAttendanceDays([...newAttendanceDays, day]);
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
                        <label className="text-xs font-bold text-neutral-600">완독 권수</label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="완독 권수 입력 (기본: 0)"
                          value={newBooksCompleted || ''}
                          onChange={(e) => setNewBooksCompleted(Number(e.target.value))}
                          className="rounded-xl h-10 border-neutral-200"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <DialogClose render={
                        <Button variant="secondary" className="flex-1 h-11 rounded-xl font-bold">
                          취소
                        </Button>
                      } />
                      <Button 
                        onClick={handleAddStudent} 
                        disabled={isAdding}
                        className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/95 text-white font-extrabold shadow-md shadow-primary/15"
                      >
                        {isAdding ? '등록 중...' : '학생 추가'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

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
                  <Dialog>
                    <DialogTrigger render={
                      <Button 
                        variant="outline" 
                        size="icon"
                        title="삭제"
                        className="rounded-2xl w-11 h-11 border-red-100 bg-red-50 text-red-600 hover:bg-red-100/80 transition-all flex items-center justify-center shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    } />
                    <DialogContent className="sm:max-w-[365px] rounded-[2.5rem] border-none shadow-2xl p-6 text-center space-y-5">
                      <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                        <Trash2 className="w-6 h-6" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-lg font-extrabold text-foreground">{student.name} 학생 삭제</h3>
                        <p className="text-sm text-neutral-500 font-medium leading-relaxed">
                          정말로 이 학생을 삭제하시겠습니다?<br />
                          <span className="text-destructive font-semibold">학생 정보와 모든 커리큘럼 기록이 영구 삭제됩니다.</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <DialogClose render={
                          <Button variant="secondary" className="flex-1 h-11 rounded-xl font-semibold">
                            취소
                          </Button>
                        } />
                        <DialogClose render={
                          <Button 
                            className="flex-1 h-11 rounded-xl bg-destructive hover:bg-destructive/90 text-white font-extrabold shadow-md shadow-destructive/15"
                            onClick={() => handleDeleteStudent(student.name)}
                          >
                            삭제
                          </Button>
                        } />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <>
                  {student.isAttending ? (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="rounded-2xl h-11 px-6 text-[13px] font-semibold shadow-lg shadow-destructive/20"
                      onClick={() => handleAttendance(student.name, false, '')}
                    >
                      하원
                    </Button>
                  ) : (
                    <Dialog onOpenChange={(open) => {
                      if (open) {
                        const nowHHMM = getCurrentTimeHHMM();
                        setArrivalTime(nowHHMM);
                        setDismissalTime(nowHHMM);
                        setAddedMinutes(0);
                      }
                    }}>
                      <DialogTrigger render={
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-2xl h-11 px-6 text-[13px] font-semibold bg-[#f0f7ff] text-primary border-[#dbeafe] shadow-sm hover:bg-[#e0efff] transition-all"
                        >
                          등원
                        </Button>
                      } />
                      <DialogContent className="max-w-[calc(100%-1.5rem)] sm:max-w-[400px] rounded-[2.5rem] sm:rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden">
                        <div className="w-full p-5 min-h-0 min-[370px]:p-6 sm:p-10 flex flex-col items-center text-center space-y-5 sm:space-y-7">
                          <div className="space-y-2">
                            <h3 className="text-xl min-[370px]:text-[22px] font-extrabold text-foreground tracking-tight">{student.name} 학생 등원</h3>
                          </div>
                          
                          <div className="w-full space-y-4 min-[370px]:space-y-5 px-1 text-left">
                            {/* Horizontal parallel section */}
                            <div className="flex items-center justify-center gap-3 min-[370px]:gap-4 w-full">
                              {/* Left Column: Arrival Time Input directly */}
                              <div className="flex flex-col items-center">
                                <Input 
                                  type="time" 
                                  value={arrivalTime}
                                  onChange={(e) => handleArrivalTimeChange(e.target.value)}
                                  className="w-[110px] min-[370px]:w-[125px] rounded-2xl h-[60px] min-[370px]:h-[68px] border-border/40 bg-secondary/10 focus:ring-4 focus:ring-primary/10 focus:bg-white text-center font-bold text-base min-[370px]:text-lg tracking-wide transition-all"
                                />
                              </div>

                              {/* Right Column: Minute Addition Buttons & Counter, 3 columns x 2 rows */}
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
                                    className="text-[9px] min-[370px]:text-[10px] text-destructive hover:underline font-extrabold cursor-pointer mt-0.5"
                                  >
                                    +{addedMinutes}분 초기화
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Final Calculated Dismissal Time Input */}
                            <div className="flex items-center justify-center gap-2 min-[370px]:gap-3 border-t border-solid border-neutral-200 pt-4">
                              <label className="text-[13px] min-[370px]:text-[14px] font-medium text-[#427fe1] leading-tight text-center w-[70px] min-[370px]:w-[84px] shrink-0">
                                하원 예정
                              </label>
                              <Input 
                                type="time" 
                                value={dismissalTime}
                                onChange={(e) => setDismissalTime(e.target.value)}
                                className="w-full max-w-[190px] min-[370px]:max-w-[216px] rounded-2xl h-10 min-[370px]:h-11 border-primary/20 bg-primary/5 focus:ring-4 focus:ring-primary/10 focus:bg-white text-center font-black text-base min-[370px]:text-lg tracking-wider text-primary transition-all"
                              />
                            </div>
                          </div>

                          <div className="flex gap-3 w-full">
                            <DialogClose render={
                              <Button 
                                variant="secondary" 
                                className="flex-1 h-12 rounded-2xl font-bold"
                              >
                                취소
                              </Button>
                            } />
                            <DialogClose render={
                              <Button 
                                className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20"
                                onClick={() => handleAttendance(student.name, true, dismissalTime)}
                              >
                                등원
                              </Button>
                            } />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                  
                  <Dialog>
                    <DialogTrigger render={
                      <Button 
                        variant="ghost" 
                        size="icon"
                        title="레벨업 (커리큘럼 초기화)"
                        className="rounded-xl w-11 h-11 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                      >
                        <ArrowUpCircle className="w-6 h-6" />
                      </Button>
                    } />
                    <DialogContent className="sm:max-w-[360px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                      <div className="p-8 text-center space-y-6">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                          <ArrowUpCircle className="w-8 h-8 text-primary" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-extrabold text-foreground">{student.name} 학생 레벨업</h3>
                          <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                            {student.name} 학생을 레벨업 하시겠습니까?<br />
                            <span className="text-destructive">레벨업 시 모든 커리큘럼 데이터가 삭제됩니다.</span>
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
                          <DialogClose render={
                            <Button 
                              className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-extrabold shadow-lg shadow-primary/20"
                              onClick={() => handleLevelUp(student.name)}
                            >
                              확인
                            </Button>
                          } />
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Student Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) setEditingStudent(null);
      }}>
        <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] border-none shadow-2xl p-6">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                <UserCog className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-foreground">{editingStudent?.name} 학생 정보 수정</h3>
                <p className="text-xs text-muted-foreground font-semibold">학생의 정보를 수정합니다.</p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">학년 *</label>
                  <select
                    value={editGrade}
                    onChange={(e) => setEditGrade(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 h-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="" disabled hidden>선택</option>
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
                  <label className="text-xs font-bold text-neutral-600">레벨 *</label>
                  <select 
                    value={editLevel} 
                    onChange={(e) => setEditLevel(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 h-10 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
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
                <label className="text-xs font-bold text-neutral-600">서브프로그램</label>
                <Input
                  placeholder="예: 독해력, 어휘력"
                  value={editSubProgram}
                  onChange={(e) => setEditSubProgram(e.target.value)}
                  className="rounded-xl h-10 border-neutral-200 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">등원 요일</label>
                <div className="grid grid-cols-6 gap-1.5 pt-1">
                  {['월', '화', '수', '목', '금', '토'].map((day) => {
                    const isSelected = editAttendanceDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setEditAttendanceDays(editAttendanceDays.filter(d => d !== day));
                          } else {
                            setEditAttendanceDays([...editAttendanceDays, day]);
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">숙제 미수행</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="미수행 횟수"
                    value={editHomeworkMissed}
                    onChange={(e) => setEditHomeworkMissed(Number(e.target.value) || 0)}
                    className="rounded-xl h-10 border-neutral-200 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-600">완독권수</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="완독권수"
                    value={editBooksCompleted}
                    onChange={(e) => setEditBooksCompleted(Number(e.target.value) || 0)}
                    className="rounded-xl h-10 border-neutral-200 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-600">결과물 마지막 날짜</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="date"
                    value={editLastResultDate}
                    onChange={(e) => setEditLastResultDate(e.target.value)}
                    className="rounded-xl h-10 border-neutral-200 text-sm flex-1 cursor-pointer"
                  />
                  <div className="w-24 shrink-0 text-center text-sm font-semibold text-neutral-700 bg-neutral-50 border border-neutral-200 h-10 flex items-center justify-center rounded-xl px-2">
                    {editLastResultDate ? (
                      typeof getWeeksSince(editLastResultDate) === 'number' ? (
                        `${getWeeksSince(editLastResultDate)}주 전`
                      ) : (
                        '-'
                      )
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <DialogClose render={
                <Button variant="secondary" className="flex-1 h-11 rounded-xl font-semibold">
                  취소
                </Button>
              } />
              <Button 
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/95 text-white font-extrabold shadow-lg"
              >
                {isSavingEdit ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

