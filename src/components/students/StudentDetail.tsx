import { DashboardData, getTagColor } from '../../types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus, Save, PlusCircle, FilePlus, Trash2, Pencil, BookOpen, UserCog } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import BookSearch from './BookSearch';
import { toast } from 'sonner';
import { MESSAGES } from '@/src/constants/messages';
import StudentMemoPopover from './StudentMemoPopover';
import {
  AddCurriculumDialog,
  StudentEditInfoDialog,
  MobileEditCurriculumDialog
} from './StudentPopups';
import React, { useState, useEffect, useOptimistic, useTransition } from 'react';
import { curriculumApi, writingStatusApi, studentApi } from '@/src/services/api';
import { getWeeksSince } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface StudentDetailProps {
  studentName: string;
  data: DashboardData | null;
  setData?: React.Dispatch<React.SetStateAction<DashboardData | null>>;
  onBack: () => void;
  onRefresh: () => void;
}

export default function StudentDetail({ studentName, data, setData, onBack, onRefresh }: StudentDetailProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ status: string; index: number; bookTitle: string } | null>(null);
  const [addingWriting, setAddingWriting] = useState<string | null>(null);
  const [writingConfirmItem, setWritingConfirmItem] = useState<any | null>(null);
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Mobile curriculum edit states
  const [mobileEditItem, setMobileEditItem] = useState<any | null>(null);

  // Student info edit states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Add Book Dialog state
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);

  useEffect(() => {
    // Scroll window to bottom when entering the student details (desktop only)
    const isMobile = window.innerWidth < 768;
    const timer = setTimeout(() => {
      if (isMobile) {
        window.scrollTo({
          top: 0,
          behavior: 'instant'
        });
      } else {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [studentName]);

  if (!data) return null;

  const curriculum = data.curriculums
    .filter(c => c.studentName === studentName)
    .sort((a, b) => a.index - b.index);

  const [optimisticCurriculum, setOptimisticCurriculum] = useOptimistic(
    curriculum,
    (state, action: 
      | { type: 'add'; payload: any }
      | { type: 'update'; payload: any }
      | { type: 'delete'; payload: any }
    ) => {
      switch (action.type) {
        case 'add':
          return [...state, action.payload].sort((a, b) => a.index - b.index);
        case 'update':
          return state
            .map(item => {
              if (item.bookId === action.payload.bookId && item.index === action.payload.originalIndex) {
                return {
                  ...item,
                  status: action.payload.status,
                  index: action.payload.index,
                  bookTitle: action.payload.bookTitle,
                };
              }
              return item;
            })
            .sort((a, b) => a.index - b.index);
        case 'delete':
          return state.filter(item => !(item.bookId === action.payload.bookId && item.index === action.payload.index));
        default:
          return state;
      }
    }
  );

  const handleUpdate = async (bookId: string) => {
    if (!editValues) return;
    const originalIndex = editingIndex!;
    const { status, index, bookTitle } = editValues;

    startTransition(async () => {
      setOptimisticCurriculum({ 
        type: 'update', 
        payload: { bookId, originalIndex, status, index, bookTitle } 
      });
      setEditingIndex(null);
      try {
        await curriculumApi.update({ 
          studentName, 
          bookId, 
          status,
          index,
          bookTitle,
          originalIndex
        });
        toast.success(MESSAGES.students.updateSuccess(studentName));
        
        if (setData) {
          setData(prev => {
            if (!prev) return prev;
            
            let updatedStudents = prev.students;
            const previousItem = prev.curriculums.find(c => c.studentName === studentName && c.bookId === bookId && c.index === originalIndex);
            
            if (previousItem && previousItem.status !== status) {
              const isBook = bookId && bookId.trim() !== '' && bookId.trim() !== '-';
              if (isBook) {
                updatedStudents = prev.students.map(s => {
                  if (s.name === studentName) {
                    let diff = 0;
                    if (status === '통과' && previousItem.status !== '통과') diff = 1;
                    else if (previousItem.status === '통과' && status !== '통과') diff = -1;
                    
                    return {
                      ...s,
                      booksCompleted: Math.max(0, s.booksCompleted + diff)
                    };
                  }
                  return s;
                });
              }
            }

            const updatedCurriculums = prev.curriculums.map(c => {
              if (c.studentName === studentName && c.bookId === bookId && c.index === originalIndex) {
                return {
                  ...c,
                  status: status as any,
                  index,
                  bookTitle
                };
              }
              return c;
            }).sort((a, b) => a.index - b.index);

            return {
              ...prev,
              students: updatedStudents,
              curriculums: updatedCurriculums
            };
          });
        }
      } catch (error: any) {
        toast.error(error.message);
      }
    });
  };

  const handleAddToWritingStatus = async (item: any) => {
    setAddingWriting(item.bookId);
    try {
      await writingStatusApi.update({ 
        name: studentName, 
        bookTitle: item.bookTitle,
        progress: '완료' 
      });
      toast.success(MESSAGES.students.writingAdded);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setAddingWriting(null);
      setWritingConfirmItem(null);
    }
  };

  const handleAddCurriculum = async (bookTitle?: string, isWriting: boolean = false) => {
    const nextIndex = (optimisticCurriculum.length > 0 ? Math.max(...optimisticCurriculum.map(c => c.index)) : 0) + 1;
    let bookId = '';
    let bookLevel = '';
    let info = '';

    if (!isWriting && bookTitle && data?.books) {
      const book = data.books.find(b => b.title === bookTitle);
      if (book) {
        bookId = book.id;
        bookLevel = book.level;
        info = `${book.therapy} / ${book.difficulty}`;
      }
    }

    const tempItem = {
      studentName,
      index: nextIndex,
      bookTitle: isWriting ? '글쓰기' : (bookTitle || ''),
      bookLevel,
      info,
      bookId,
      status: '예정' as const,
    };

    startTransition(async () => {
      setOptimisticCurriculum({ type: 'add', payload: tempItem });
      try {
        const response = await curriculumApi.add({ studentName, bookTitle, isWriting });
        toast.success(MESSAGES.students.curriculumAdded(isWriting));
        
        if (setData) {
          setData(prev => {
            if (!prev) return prev;
            const actualItem = {
              ...tempItem,
              index: response.index || nextIndex
            };
            return {
              ...prev,
              curriculums: [...prev.curriculums, actualItem].sort((a, b) => a.index - b.index)
            };
          });
        }
      } catch (error: any) {
        toast.error(error.message);
      }
    });
  };

  const handleDeleteCurriculum = async (item: any) => {
    setIsDeleting(true);
    startTransition(async () => {
      setOptimisticCurriculum({ type: 'delete', payload: item });
      setDeletingItem(null);
      try {
        await curriculumApi.remove({ 
          studentName, 
          bookId: item.bookId, 
          index: item.index 
        });
        toast.success(MESSAGES.students.itemDeleted);
        
        if (setData) {
          setData(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              curriculums: prev.curriculums.filter(c => !(c.studentName === studentName && c.bookId === item.bookId && c.index === item.index))
            };
          });
        }
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setIsDeleting(false);
      }
    });
  };

  const handleMobileUpdate = async (
    bookId: string,
    originalIndex: number,
    updateData: { index: number; status: string; bookTitle: string }
  ) => {
    const { index, status, bookTitle } = updateData;

    startTransition(async () => {
      setOptimisticCurriculum({ 
        type: 'update', 
        payload: { bookId, originalIndex, status, index, bookTitle } 
      });
      setMobileEditItem(null);
      try {
        await curriculumApi.update({ 
          studentName, 
          bookId, 
          status,
          index,
          bookTitle,
          originalIndex
        });
        toast.success(MESSAGES.students.updateSuccess(studentName));
        
        if (setData) {
          setData(prev => {
            if (!prev) return prev;
            
            let updatedStudents = prev.students;
            const previousItem = prev.curriculums.find(c => c.studentName === studentName && c.bookId === bookId && c.index === originalIndex);
            
            if (previousItem && previousItem.status !== status) {
              const isBook = bookId && bookId.trim() !== '' && bookId.trim() !== '-';
              if (isBook) {
                updatedStudents = prev.students.map(s => {
                  if (s.name === studentName) {
                    let diff = 0;
                    if (status === '통과' && previousItem.status !== '통과') diff = 1;
                    else if (previousItem.status === '통과' && status !== '통과') diff = -1;
                    
                    return {
                      ...s,
                      booksCompleted: Math.max(0, s.booksCompleted + diff)
                    };
                  }
                  return s;
                });
              }
            }

            const updatedCurriculums = prev.curriculums.map(c => {
              if (c.studentName === studentName && c.bookId === bookId && c.index === originalIndex) {
                return {
                  ...c,
                  status: status as any,
                  index,
                  bookTitle
                };
              }
              return c;
            }).sort((a, b) => a.index - b.index);

            return {
              ...prev,
              students: updatedStudents,
              curriculums: updatedCurriculums
            };
          });
        }
      } catch (error: any) {
        toast.error(error.message);
      }
    });
  };

  const handleMobileDelete = async () => {
    if (!mobileEditItem) return;
    const itemToDelete = mobileEditItem;
    setMobileEditItem(null);
    await handleDeleteCurriculum(itemToDelete);
  };

  const handleMobileAddToWriting = async () => {
    if (!mobileEditItem) return;
    const itemToAdd = mobileEditItem;
    setMobileEditItem(null);
    await handleAddToWritingStatus(itemToAdd);
  };

  const student = data.students.find(s => s.name === studentName);

  const getDisplayGrade = (grade: string) => {
    if (!grade) return '';
    const trimmed = grade.trim();
    if (trimmed === '유7') return '유치부';
    return trimmed;
  };

  const formatDisplayLevel = (level: any) => {
    const l = String(level).trim();
    if (!l || l === '0' || l === '0.0' || l === 'null' || l === 'undefined' || l === '기초') return '기초';
    if (l === '11' || l === '구연동화') return '구연동화';
    const digits = l.replace(/[^0-9.]/g, '');
    if (digits) {
      return `Lv.${digits}`;
    }
    return l;
  };

  const displayGrade = student ? getDisplayGrade(student.grade) : '';
  const displayLevel = student ? formatDisplayLevel(student.level) : '';
  const attendance = student?.attendanceDays ? student.attendanceDays.replace(/[\s,]/g, '') : '';
  const subProg = student?.subProgram ? student.subProgram.trim() : '';
  const completedCount = `${student?.booksCompleted || 0}권`;

  const handleOpenEdit = () => {
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
    noHomework?: boolean;
  }) => {
    if (!student) return;
    try {
      setIsSavingEdit(true);
      await studentApi.update(student.name, {
        grade: formData.grade,
        level: formData.level,
        subProgram: formData.subProgram.trim() || '-',
        attendanceDays: formData.attendanceDays.join(', '),
        homeworkMissed: Number(formData.homeworkMissed) || 0,
        booksCompleted: Number(formData.booksCompleted) || 0,
        lastResultDate: formData.lastResultDate,
        noHomework: formData.noHomework
      });
      toast.success(MESSAGES.students.editSuccess(student.name));
      setIsEditOpen(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-md pt-3 pb-2 -mx-4 px-4 -mt-3 border-b border-border/10 mb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
          
          {/* Left: Back Button, Candidate Name & Info Badge */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <Button variant="ghost" onClick={onBack} size="icon" className="w-[36px] h-[36px] flex items-center justify-center rounded-xl shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 min-w-0 flex-wrap pb-[2px]">
              <span className="text-[19px] md:text-[21px] font-extrabold text-foreground whitespace-nowrap">
                {studentName}  학생
              </span>

              {/* Mobile/Tablet text in a rounded box */}
              <span className="xl:hidden text-[13px] font-normal text-neutral-500 truncate bg-neutral-50 border border-neutral-200/80 rounded-xl px-2.5 py-0.5 inline-block">
                {[displayGrade, displayLevel, completedCount, attendance].filter(Boolean).join(' · ')}
              </span>
              {/* Desktop text in a rounded box */}
              <span className="hidden xl:inline-block text-[15px] font-normal text-neutral-500 truncate bg-neutral-50 border border-neutral-200/80 rounded-xl px-3 py-1">
                {[displayGrade, displayLevel, completedCount, attendance, subProg].filter(Boolean).join(' · ')}
              </span>

              {student && (
                <StudentMemoPopover 
                  student={student} 
                  onRefresh={onRefresh} 
                  iconOnly={true}
                  iconSizeClass="w-4 h-4"
                  className="flex items-center justify-center shrink-0" 
                  buttonClassName="text-neutral-500 hover:text-neutral-700 transition-colors cursor-pointer flex items-center justify-center p-1 hover:bg-neutral-50 rounded-lg"
                />
              )}
            </div>
          </div>

          {/* Right: Responsive buttons (automatically left-aligned on mobile portrait, right-aligned on tablet/desktop) */}
          <div className="flex items-center justify-start sm:justify-end gap-1.5 sm:gap-2 shrink-0 self-start sm:self-auto w-full sm:w-auto mt-0.5 sm:mt-0 pl-10 sm:pl-0">
            <Button 
              variant="outline"
              onClick={() => setIsAddBookOpen(true)}
              className="rounded-xl gap-1 lg:gap-2 bg-[#f0f7ff] text-primary border-[#dbeafe] shadow-sm hover:bg-[#e0efff] transition-all font-semibold h-8 text-[12px] px-2.5 lg:h-10 lg:text-sm lg:px-4 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              도서
            </Button>

            <Button 
              variant="outline"
              className="rounded-xl gap-1 lg:gap-2 border-[#f3e8ff] bg-[#faf5ff] text-purple-600 hover:bg-[#f3e8ff] shadow-sm transition-all font-semibold h-8 text-[12px] px-2.5 lg:h-10 lg:text-sm lg:px-4"
              onClick={() => handleAddCurriculum(undefined, true)}
            >
              <Plus className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              글쓰기
            </Button>

            <Button 
              variant="outline"
              size="icon"
              className="rounded-xl border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800 shadow-sm transition-all h-8 w-8 lg:h-10 lg:w-10 flex items-center justify-center p-0 shrink-0"
              onClick={handleOpenEdit}
            >
              <UserCog className="w-4 h-4 lg:w-5 lg:h-5" />
            </Button>
          </div>
        </div>
      </div>

       <Card className="rounded-[2.5rem] shadow-sm overflow-hidden bg-white mt-2">
        <CardContent className="p-0">
          <Table>
             <TableHeader className="bg-white border-b border-border/50 text-[11px] sm:text-[13px]">
              <TableRow className="hover:bg-transparent border-border/30">
                <TableHead className="h-[38px] pb-[6px] w-[68px] text-center font-semibold uppercase tracking-widest pl-2 pr-1">순서</TableHead>
                <TableHead className="h-[38px] pb-[6px] font-semibold uppercase tracking-widest px-3">도서명</TableHead>
                <TableHead className="h-[38px] pb-[6px] w-[100px] lg:w-[130px] text-center font-semibold uppercase tracking-widest px-1">정보</TableHead>
                <TableHead className="h-[38px] pb-[6px] w-[80px] lg:w-[114px] text-center font-semibold uppercase tracking-widest px-1">학원번호</TableHead>
                <TableHead className="h-[38px] pb-[6px] w-[94px] lg:w-[124px] text-center font-semibold uppercase tracking-widest px-1">상태</TableHead>
                <TableHead className="h-[38px] pb-[6px] w-[98px] lg:w-[130px] text-center font-semibold uppercase tracking-widest pl-1 pr-1">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {optimisticCurriculum.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground animate-in fade-in-50 duration-300">
                      <BookOpen className="w-10 h-10 opacity-20" />
                      <div className="space-y-1">
                        <p className="text-[18px] font-medium text-zinc-600">등록된 커리큘럼이 없습니다.</p>
                        <p className="text-xs sm:text-sm font-medium text-zinc-400">상단 버튼을 클릭하여 추가해 주세요.</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                optimisticCurriculum.map((item, idx) => {
                  const isLast = idx === optimisticCurriculum.length - 1;
                  return (
                    <TableRow key={`${item.index}-${item.bookTitle}-${idx}`} className="border-border/20 hover:bg-secondary/10 transition-colors">
                    <TableCell className={`text-center pl-2 pr-1 ${isLast ? 'pb-1' : ''}`}>
                    {editingIndex === item.index ? (
                      <input 
                        type="number"
                        className="w-10 bg-white border border-border/50 rounded-lg px-1 py-1 text-xs font-normal text-center focus:ring-2 ring-primary/20 outline-none"
                        value={editValues?.index}
                        onChange={(e) => setEditValues(prev => prev ? { ...prev, index: parseInt(e.target.value) || 0 } : null)}
                      />
                    ) : (
                      <span className="font-normal text-zinc-600 text-xs sm:text-sm">{item.index}</span>
                    )}
                  </TableCell>
                  <TableCell className={`px-3 ${isLast ? 'pb-1' : ''}`}>
                    {editingIndex === item.index ? (
                      <input 
                        className="w-full bg-white border border-border/50 rounded-lg px-2 py-1 text-xs font-normal focus:ring-2 ring-primary/20 outline-none"
                        value={editValues?.bookTitle}
                        onChange={(e) => setEditValues(prev => prev ? { ...prev, bookTitle: e.target.value } : null)}
                      />
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground text-xs sm:text-sm">{item.bookTitle}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className={`text-center px-1 ${isLast ? 'pb-1' : ''}`}>
                    <span className="font-normal text-zinc-600 text-xs sm:text-sm block truncate" title={item.info}>
                      {item.info}
                    </span>
                  </TableCell>
                  <TableCell className={`text-center px-1 ${isLast ? 'pb-1' : ''}`}>
                    <span className="font-normal text-zinc-600 text-xs sm:text-sm block truncate">
                      {item.bookId}
                    </span>
                  </TableCell>
                  <TableCell className={`text-center px-1 ${isLast ? 'pb-1' : ''}`}>
                    {editingIndex === item.index ? (
                      <select 
                        className="w-full bg-white border border-border/50 rounded-lg px-1 py-1 text-xs font-normal focus:ring-2 ring-primary/20 outline-none"
                        value={editValues?.status}
                        onChange={(e) => setEditValues(prev => prev ? { ...prev, status: e.target.value } : null)}
                      >
                        {['예정', '진행', '통과', '불통'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <Badge className={`rounded-lg font-normal text-xs sm:text-sm px-1.5 lg:px-2 ${
                        item.status === '통과' ? getTagColor('파란색') :
                        item.status === '진행' ? getTagColor('노란색') :
                        item.status === '불통' ? getTagColor('빨간색') :
                        getTagColor('기본')
                      }`}>
                        {item.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className={`text-left pl-1 pr-1 ${isLast ? 'pb-1' : ''}`}>
                    {editingIndex === item.index ? (
                      <div className="flex items-center justify-start gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={() => handleUpdate(item.bookId)}
                        >
                          <Save className="w-[15px] h-[15px] sm:w-4 sm:h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-muted-foreground hover:bg-secondary"
                          onClick={() => setEditingIndex(null)}
                        >
                          <Plus className="w-[15px] h-[15px] sm:w-4 sm:h-4 rotate-45" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-start gap-0">
                        {/* Desktop actions (shown on medium and larger screens) */}
                        <div className="hidden md:flex items-center justify-start gap-0">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="수정"
                            className="h-8 w-8 rounded-xl text-neutral-400 hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => {
                              setEditingIndex(item.index);
                              setEditValues({ 
                                status: item.status,
                                index: item.index,
                                bookTitle: item.bookTitle
                              });
                            }}
                          >
                            <Pencil className="w-[15px] h-[15px] sm:w-4 sm:h-4" />
                          </Button>
                          {item.bookTitle !== '글쓰기' && (
                            <Dialog open={writingConfirmItem?.bookId === item.bookId} onOpenChange={(open) => !open && setWritingConfirmItem(null)}>
                              <DialogTrigger render={
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={`h-8 w-8 rounded-xl text-primary/40 hover:text-primary hover:bg-primary/10 ${addingWriting === item.bookId ? 'animate-pulse' : ''}`}
                                  onClick={() => setWritingConfirmItem(item)}
                                  disabled={addingWriting === item.bookId}
                                  title="글쓰기 현황 추가"
                                >
                                  <PlusCircle className="w-[15px] h-[15px] sm:w-4 sm:h-4" />
                                </Button>
                              } />
                              <DialogContent className="sm:max-w-[360px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                                <div className="p-8 text-center space-y-6">
                                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                    <FilePlus className="w-8 h-8 text-primary" />
                                  </div>
                                  <div className="space-y-2">
                                    <h3 className="text-lg font-extrabold text-foreground">글쓰기 추가</h3>
                                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                                      <span className="text-primary font-bold">'{item.bookTitle}'</span> 도서로<br />
                                      글쓰기 현황을 추가하시겠습니까?
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
                                    <Button 
                                      className="flex-1 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-white font-extrabold shadow-lg shadow-primary/20"
                                      onClick={() => handleAddToWritingStatus(item)}
                                    >
                                      추가
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          
                          <Dialog open={deletingItem?.bookId === item.bookId && deletingItem?.index === item.index} onOpenChange={(open) => !open && setDeletingItem(null)}>
                            <DialogTrigger render={
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-xl text-destructive/40 hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeletingItem(item)}
                                title="삭제"
                              >
                                <Trash2 className="w-[15px] h-[15px] sm:w-4 sm:h-4" />
                              </Button>
                            } />
                            <DialogContent className="sm:max-w-[360px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                              <div className="p-8 text-center space-y-6">
                                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                                  <Trash2 className="w-8 h-8 text-destructive" />
                                </div>
                                <div className="space-y-2">
                                  <h3 className="text-lg font-extrabold text-foreground">항목 삭제</h3>
                                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                                    <span className="text-destructive font-bold">'{item.bookTitle}'</span> 항목을<br />
                                    목록에서 삭제하시겠습니까?
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
                                  <Button 
                                    variant="destructive"
                                    className="flex-1 h-12 rounded-2xl font-extrabold shadow-lg shadow-destructive/20"
                                    onClick={() => handleDeleteCurriculum(item)}
                                    disabled={isDeleting}
                                  >
                                    {isDeleting ? '삭제 중...' : '삭제'}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>

                        {/* Mobile actions (shown only on mobile/tablet portrait under md breakpoint) */}
                        <div className="flex md:hidden items-center justify-start">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="수정"
                            className="h-8 w-8 rounded-xl text-neutral-400 hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => {
                              setMobileEditItem(item);
                            }}
                          >
                            <Pencil className="w-[15px] h-[15px]" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- Unified Popups --- */}
      <AddCurriculumDialog 
        open={isAddBookOpen}
        onOpenChange={setIsAddBookOpen}
        studentName={studentName}
        books={data.books}
        existingBookIds={optimisticCurriculum.map(c => c.bookId)}
        onSelect={(bookTitle) => handleAddCurriculum(bookTitle)}
      />

      {isEditOpen && student && (
        <StudentEditInfoDialog 
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          student={student}
          onSave={handleSaveEdit}
          isSaving={isSavingEdit}
          onRefresh={onRefresh}
        />
      )}

      {mobileEditItem && (
        <MobileEditCurriculumDialog 
          open={!!mobileEditItem}
          onOpenChange={(open) => !open && setMobileEditItem(null)}
          item={mobileEditItem}
          onSave={handleMobileUpdate}
          isSaving={isPending}
          statusOptions={['예정', '진행', '통과', '불통']}
          extraActions={
            <div className="flex flex-col gap-2 pt-2">
              {mobileEditItem?.bookTitle !== '글쓰기' && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 rounded-xl text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 font-bold text-xs gap-1.5 cursor-pointer"
                  onClick={handleMobileAddToWriting}
                  disabled={addingWriting === mobileEditItem?.bookId}
                >
                  <PlusCircle className="w-4 h-4" />
                  글쓰기 기록 추가
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 rounded-xl text-destructive border-destructive/20 bg-destructive/5 hover:bg-destructive/10 font-bold text-xs gap-1.5 cursor-pointer"
                onClick={handleMobileDelete}
                disabled={isDeleting}
              >
                <Trash2 className="w-4 h-4" />
                커리큘럼 삭제
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}
