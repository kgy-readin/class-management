import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import StudentLogCharts from './StudentLogCharts';
import StudentCombobox from '../common/StudentCombobox';
import { 
  StudentLogEntry, 
  LOG_CATEGORY_COLORS, 
  getTagColor, 
  Student 
} from '../../types';
import { studentLogApi } from '@/src/services/api';
import { toast } from 'sonner';
import { MESSAGES } from '@/src/constants/messages';
import { 
  CalendarDays, 
  Trash2, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  UsersRound, 
  Pencil,
  Calendar,
  Save,
  X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface StudentLogStudentsProps {
  sortedStudents: Student[];
  selectedStudent: string;
  setSelectedStudent: (name: string) => void;
  logs: StudentLogEntry[];
  fetchLogs: () => Promise<void>;
  isMobile: boolean;
  setViewMode: (mode: 'monthly' | 'student') => void;
  handleOpenAddDialog: (initialDate?: Date) => void;
}

const CATEGORIES = [
  '지도방향', '특이사항', '성장긍정',
  '쓰기부진', '읽기부진', '학업부진',
  '문제행동', '가정소통', '운영방침'
];

const CAT_HEX_COLORS: Record<string, string> = {
  '특이사항': 'rgba(161, 161, 170, 0.7)',   // zinc-400/70
  '지도방향': 'rgba(161, 161, 170, 0.7)',   // zinc-400/70
  '성장긍정': 'rgba(16, 185, 129, 0.9)',    // emerald-500/90
  '쓰기부진': 'rgba(251, 191, 36, 0.9)',    // amber-400/90
  '읽기부진': 'rgba(251, 191, 36, 0.9)',    // same as amber-400/90
  '학업부진': 'rgba(249, 115, 22, 0.9)',     // orange-500/90
  '문제행동': 'rgba(239, 68, 68, 0.9)',     // red-500/90
  '가정소통': 'rgba(59, 130, 246, 0.9)',    // blue-500/90
  '운영방침': 'rgba(139, 92, 246, 0.9)'     // violet-500/90
};

const getCategoryTagStyle = (category: string): string => {
  const colorName = LOG_CATEGORY_COLORS[category] || '기본';
  return getTagColor(colorName);
};

export default function StudentLogStudents({
  sortedStudents,
  selectedStudent,
  setSelectedStudent,
  logs,
  fetchLogs,
  isMobile,
  setViewMode,
  handleOpenAddDialog,
}: StudentLogStudentsProps) {
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Edit Log State
  const [editingLog, setEditingLog] = useState<StudentLogEntry | null>(null);
  const [editForm, setEditForm] = useState<{ date: string; category: string; content: string } | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete Confirm Dialog
  const [deletingItem, setDeletingItem] = useState<StudentLogEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Process data for STUDENT VIEW ---
  const currentStudentLogs = logs.filter(log => log.name === selectedStudent);
  
  // Sort student logs by Date descending for list display
  const studentLogsSorted = [...currentStudentLogs].sort((a, b) => b.date.localeCompare(a.date));
  
  // Total pages
  const totalPages = Math.ceil(studentLogsSorted.length / itemsPerPage) || 1;
  const pageLogs = studentLogsSorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleDeleteLog = async (item: StudentLogEntry) => {
    setIsDeleting(true);
    try {
      await studentLogApi.remove(item);
      toast.success(MESSAGES.studentLog.deleteSuccess);
      setDeletingItem(null);
      fetchLogs();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateLog = async () => {
    if (!editingLog || !editForm) return;
    if (!editForm.content.trim()) {
      toast.error(MESSAGES.studentLog.enterContent);
      return;
    }
    
    setSubmittingEdit(true);
    try {
      await studentLogApi.update(editingLog, {
        date: editForm.date,
        name: editingLog.name,
        category: editForm.category,
        content: editForm.content.trim()
      });
      toast.success(MESSAGES.studentLog.editSuccess);
      setEditingLog(null);
      setEditForm(null);
      fetchLogs();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Recharts: Category counts
  const categoryCounts: Record<string, number> = {};
  currentStudentLogs.forEach(log => {
    categoryCounts[log.category] = (categoryCounts[log.category] || 0) + 1;
  });
  const pieData = Object.keys(categoryCounts).map(cat => ({
    name: cat,
    value: categoryCounts[cat]
  }));

  // Recharts: Trend data only for months with records, sorted chronologically
  const trendData: { name: string; '기록 수': number }[] = [];
  const monthGroups: Record<string, { label: string; count: number }> = {};
  
  currentStudentLogs.forEach(log => {
    try {
      const logDate = parseISO(log.date);
      const key = format(logDate, 'yyyy-MM');
      const label = format(logDate, 'M월');
      if (!monthGroups[key]) {
        monthGroups[key] = { label, count: 0 };
      }
      monthGroups[key].count += 1;
    } catch {
      // Ignore
    }
  });

  const sortedMonthKeys = Object.keys(monthGroups).sort();
  sortedMonthKeys.forEach(key => {
    trendData.push({
      name: monthGroups[key].label,
      '기록 수': monthGroups[key].count
    });
  });

  // Page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      
      {/* Left Column: Selector & Analytics Charts (Hidden totally on Mobile except for top selector) */}
      <div className="w-full lg:w-[26%] xl:w-[28%] shrink-0 flex flex-col gap-4">
        
        {/* Student Selector Card */}
        <Card className="rounded-[2rem] border-none ring-0 shadow-sm bg-white overflow-visible" style={{ height: '80px', paddingTop: '0px', paddingBottom: '0px', overflow: 'visible' }}>
          <CardContent className="p-5 flex items-center justify-between gap-4 overflow-visible" style={{ paddingTop: '10px', paddingBottom: '10px', paddingRight: '20px', paddingLeft: '20px', height: '80px', overflow: 'visible' }}>
            <div className="flex items-center gap-2">
              <UsersRound className="w-5 h-5 text-zinc-500" />
              <label className="text-[15px] font-semibold text-zinc-800 tracking-wider shrink-0 select-none">학생 선택</label>
            </div>
            <StudentCombobox
              students={sortedStudents}
              value={selectedStudent}
              onChange={(val) => {
                setSelectedStudent(val);
                setCurrentPage(1);
              }}
              placeholder="선택"
              className="!w-[180px]"
              inputClassName="bg-zinc-50 border-solid border-zinc-100 text-[14px] font-semibold !h-[44px]"
            />
          </CardContent>
        </Card>

        {/* Charts: Hidden on mobile and tablet portrait, shown on tablet landscape/desktop */}
        <StudentLogCharts 
          pieData={pieData} 
          trendData={trendData} 
          CAT_HEX_COLORS={CAT_HEX_COLORS} 
          selectedStudent={selectedStudent}
        />
      </div>

      {/* Right Column: Recent Records Table */}
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden" style={{ minHeight: '350px', paddingBottom: '12px' }}>
          
          {/* Header with Title and Control Buttons */}
          <div className="px-8 py-3 border-b border-solid border-zinc-100 flex items-center justify-between" style={{ height: '76px', borderColor: '#f4f4f5' }}>
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-[17px] md:text-lg font-semibold text-zinc-800 tracking-tight">
                  최근 기록
                </h2>
              </div>
            </div>

            {/* Buttons (Desktop layout vs Mobile) */}
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-full text-foreground border border-solid border-zinc-100 bg-white/50 hover:bg-white/80 shadow-sm transition-all"
                onClick={() => handleOpenAddDialog()}
                title="추가"
              >
                <Plus className="w-5 h-5" />
              </Button>

              <Button
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-full text-foreground border border-solid border-zinc-100 bg-white/50 hover:bg-white/80 shadow-sm transition-all cursor-pointer"
                onClick={() => setViewMode('monthly')}
                title="먼슬리뷰 보기"
              >
                <Calendar className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Records List/Table */}
          {/* Desktop version: Hidden on mobile */}
          <div className="hidden md:block overflow-x-auto min-h-[350px] m-0 p-0" style={{ paddingTop: '0px', marginLeft: '0px', marginRight: '0px', marginTop: '0px' }}>
            <table className="w-full text-left border-collapse table-fixed m-0 p-0" style={{ marginTop: '0px', paddingTop: '0px' }}>
              <thead className="bg-zinc-50/70">
                <tr className="bg-zinc-50/70 border-b border-solid border-zinc-100">
                  <th className="w-[10%] px-4 py-3 text-[14px] font-semibold text-zinc-650 uppercase tracking-wider text-center align-middle">날짜</th>
                  <th className="w-[13%] px-4 py-3 text-[14px] font-semibold text-zinc-650 uppercase tracking-wider text-center align-middle">태그</th>
                  <th className="w-[62%] px-4 py-3 text-[14px] font-semibold text-zinc-650 uppercase tracking-wider text-center align-middle">내용</th>
                  <th className="w-[15%] px-4 py-3 text-[14px] font-semibold text-zinc-650 uppercase tracking-wider text-center align-middle">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-solid divide-zinc-100 bg-white">
                {!selectedStudent ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-500">
                        <UsersRound className="w-10 h-10 opacity-30 text-zinc-400" />
                        <p className="text-[16px] font-medium text-zinc-500">학생을 선택해 주세요.</p>
                      </div>
                    </td>
                  </tr>
                ) : pageLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center gap-2 text-zinc-500">
                        <CalendarDays className="w-10 h-10 opacity-20" />
                        <p className="text-[16px] font-medium">기록된 내용이 없습니다.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageLogs.map((log, idx) => {
                    const isEditing = editingLog === log;
                    
                    let dateFormatted = '';
                    try {
                      dateFormatted = format(parseISO(log.date), 'MM.dd');
                    } catch {
                      dateFormatted = log.date;
                    }

                    if (isEditing && editForm) {
                      return (
                        <tr key={`${log.name}-${idx}`} className="bg-zinc-50/50 hover:bg-zinc-50 transition-colors">
                          {/* Date Edit */}
                          <td className="px-3 pt-[12px] pb-[12px] whitespace-nowrap text-center align-top overflow-visible">
                            <input
                              type="date"
                              className="w-full h-8 px-1.5 border border-zinc-200 rounded text-[14px] font-normal text-zinc-800 bg-white focus:border-primary focus:outline-none"
                              value={editForm.date}
                              onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                            />
                          </td>

                          {/* Category Edit */}
                          <td className="px-3 pt-[12px] pb-[12px] whitespace-nowrap text-center align-top overflow-visible">
                            <select
                              className="w-full h-8 px-1.5 border border-zinc-200 rounded text-[14px] font-normal text-zinc-800 bg-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/25 cursor-pointer"
                              value={editForm.category}
                              onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                            >
                              {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </td>

                          {/* Content Edit */}
                          <td className="px-3 pt-[12px] pb-[12px] text-left align-top overflow-visible">
                            <textarea
                              rows={2}
                              className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[14px] font-normal leading-relaxed focus:outline-none focus:border-primary resize-y"
                              value={editForm.content}
                              onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                            />
                          </td>

                          {/* Control Actions during Edit */}
                          <td className="px-3 pt-[12px] pb-[12px] whitespace-nowrap text-center align-top overflow-visible">
                            <div className="flex items-center justify-center gap-1.5">
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={submittingEdit}
                                onClick={handleUpdateLog}
                                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                                title="저장"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                disabled={submittingEdit}
                                onClick={() => {
                                  setEditingLog(null);
                                  setEditForm(null);
                                }}
                                className="h-7 w-7 text-zinc-400 hover:text-zinc-550 hover:bg-zinc-50 rounded-lg cursor-pointer"
                                title="취소"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={`${log.name}-${idx}`} className="hover:bg-zinc-50/20 transition-colors group">
                        
                        {/* Date */}
                        <td className="px-4 pt-[12px] pb-[12px] whitespace-nowrap text-center align-top">
                          <span className="text-[14px] font-normal text-zinc-805 leading-5">{dateFormatted}</span>
                        </td>

                        {/* Category */}
                        <td className="px-4 pt-[12px] pb-[12px] whitespace-nowrap text-center align-top">
                          <div className="flex justify-center items-center w-full">
                            <div className={`inline-flex items-center justify-center h-[21px] px-2.5 text-[11.5px] font-semibold rounded-full select-none text-center min-w-[72px] ${getCategoryTagStyle(log.category)}`}>
                              {log.category}
                            </div>
                          </div>
                        </td>

                        {/* Content */}
                        <td className="px-4 pt-[12px] pb-[12px] text-left align-top">
                          <div className="text-[14px] font-normal text-zinc-800 leading-5 whitespace-pre-wrap break-all" title={log.content}>
                            {log.content}
                          </div>
                        </td>

                        {/* Control Actions */}
                        <td className="px-4 pt-[12px] pb-[12px] whitespace-nowrap text-center align-top">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-150/50 rounded-lg cursor-pointer"
                              onClick={() => {
                                setEditingLog(log);
                                setEditForm({
                                  date: log.date.split('T')[0],
                                  category: log.category,
                                  content: log.content
                                });
                              }}
                              title="수정"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-zinc-400 hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                              onClick={() => setDeletingItem(log)}
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile version: Hidden on desktop (Timeline Layout) */}
          <div className="md:hidden divide-y divide-solid divide-zinc-100 bg-white p-5">
            {!selectedStudent ? (
              <div className="py-12 text-center">
                <div className="flex flex-col items-center gap-2 text-zinc-500">
                  <UsersRound className="w-8 h-8 opacity-30 text-zinc-400" />
                  <p className="text-[13px] font-medium text-zinc-500">학생을 선택해 주세요.</p>
                </div>
              </div>
            ) : pageLogs.length === 0 ? (
              <div className="py-12 text-center">
                <div className="flex flex-col items-center gap-2 text-zinc-500">
                  <CalendarDays className="w-8 h-8 opacity-20" />
                  <p className="text-[12px] font-medium text-zinc-500">기록된 내용이 없습니다.</p>
                </div>
              </div>
            ) : (
              pageLogs.map((log, idx) => {
                const isEditing = editingLog === log;
                const badgeStyle = getCategoryTagStyle(log.category);
                
                let dateFormatted = '';
                try {
                  dateFormatted = format(parseISO(log.date), 'M월 d일');
                } catch {
                  dateFormatted = log.date;
                }

                return (
                  <div key={`${log.name}-${idx}`} className="py-4 flex flex-col gap-2 relative last:pb-0 first:pt-0">
                    {/* Card Content container */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isEditing && editForm ? (
                            <input
                              type="date"
                              className="text-[13px] h-7 bg-white border border-zinc-200 rounded px-1.5 py-0.5 outline-none focus:ring-1 ring-primary/20"
                              value={editForm.date}
                              onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                            />
                          ) : (
                            <span className="text-[13px] font-medium text-zinc-800">{dateFormatted}</span>
                          )}
                          
                          {isEditing && editForm ? (
                            <select
                              className="text-[13px] h-7 bg-white border border-zinc-200 rounded px-1.5 py-0.5 outline-none focus:ring-1 ring-primary/20"
                              value={editForm.category}
                              onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                            >
                              {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`inline-flex items-center justify-center h-5 px-2.5 rounded-full text-[11.5px] font-semibold select-none text-center ${badgeStyle}`}>
                              {log.category}
                            </span>
                          )}
                        </div>

                        {/* Actions on Mobile */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isEditing ? (
                            <>
                              <Button 
                                size="icon" 
                                variant="ghost"
                                disabled={submittingEdit}
                                onClick={handleUpdateLog}
                                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                                title="저장"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                disabled={submittingEdit}
                                onClick={() => {
                                  setEditingLog(null);
                                  setEditForm(null);
                                }}
                                className="h-7 w-7 text-zinc-400 hover:text-zinc-550 hover:bg-zinc-50 rounded-lg cursor-pointer"
                                title="취소"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg cursor-pointer"
                                onClick={() => {
                                  setEditingLog(log);
                                  setEditForm({
                                    date: log.date.split('T')[0],
                                    category: log.category,
                                    content: log.content
                                  });
                                }}
                                title="수정"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-zinc-400 hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                                onClick={() => setDeletingItem(log)}
                                title="삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Content text strictly 13px and beautiful, breaking word wrapping nicely */}
                      <div className="text-[13px] font-medium text-zinc-800 leading-relaxed pr-2">
                        {isEditing && editForm ? (
                          <textarea
                            rows={2}
                            className="w-full bg-white border border-zinc-200 rounded px-2 py-1 text-[13px] font-normal leading-relaxed focus:outline-none focus:border-primary resize-y"
                            value={editForm.content}
                            onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap break-all">{log.content}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Beautiful custom-made Pagination bar */}
          {totalPages > 1 && (
            <div className="px-8 py-5 border-t border-zinc-100 bg-white flex items-center justify-center gap-1.5 select-none">
              
              {/* Prev page */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg cursor-pointer text-zinc-500"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {/* Interconnected page numbers */}
              {getPageNumbers().map((pageNum, idx) => {
                const isEllipsis = pageNum === '...';
                const isActive = pageNum === currentPage;
                return isEllipsis ? (
                  <span key={`ell-${idx}`} className="w-8 text-center text-zinc-400 text-xs font-bold leading-8 select-none">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${pageNum}`}
                    type="button"
                    onClick={() => handlePageChange(pageNum as number)}
                    className={`h-8 min-w-[32px] px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary text-white font-extrabold shadow-sm shadow-primary/20'
                        : 'text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {/* Next page */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg cursor-pointer text-zinc-500"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* --- CONFIRM DELETE DIALOG --- */}
      <Dialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <DialogContent className="sm:max-w-[360px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-250">
          <div className="p-8 text-center space-y-6">
            <div className="w-[54px] h-[54px] bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-[27px] h-[27px] text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-foreground">교무기록 삭제</h3>
              <p className="text-sm text-zinc-600 font-normal leading-relaxed">
                <span className="text-destructive font-bold">'{deletingItem?.name}'</span> 학생의 <br />
                <span className="font-semibold text-zinc-750">'{deletingItem?.category}'</span> 기록을 삭제하시겠습니까?
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button 
                type="button"
                className="flex-1 h-12 rounded-2xl bg-zinc-100/80 hover:bg-zinc-200/80 text-zinc-500 font-bold border-none cursor-pointer"
                onClick={() => setDeletingItem(null)}
              >
                취소
              </Button>
              <Button 
                type="button"
                variant="destructive"
                className="flex-1 h-12 rounded-2xl font-extrabold shadow-lg shadow-destructive/20 cursor-pointer"
                onClick={() => deletingItem && handleDeleteLog(deletingItem)}
                disabled={isDeleting}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
    </div>
  );
}
