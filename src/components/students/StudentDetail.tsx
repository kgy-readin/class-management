import { DashboardData } from '../../types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus, Save, PlusCircle, FilePlus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import BookSearch from './BookSearch';
import { toast } from 'sonner';
import { useState } from 'react';
import { curriculumApi, writingStatusApi } from '@/src/services/api';

interface StudentDetailProps {
  studentName: string;
  data: DashboardData | null;
  onBack: () => void;
  onRefresh: () => void;
}

export default function StudentDetail({ studentName, data, onBack, onRefresh }: StudentDetailProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ status: string; index: number; bookTitle: string } | null>(null);
  const [addingWriting, setAddingWriting] = useState<string | null>(null);
  const [writingConfirmItem, setWritingConfirmItem] = useState<any | null>(null);
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!data) return null;

  const curriculum = data.curriculums
    .filter(c => c.studentName === studentName)
    .sort((a, b) => a.index - b.index);

  const handleUpdate = async (bookId: string) => {
    if (!editValues) return;
    try {
      await curriculumApi.update({ 
        studentName, 
        bookId, 
        status: editValues.status,
        index: editValues.index,
        bookTitle: editValues.bookTitle,
        originalIndex: editingIndex!
      });
      toast.success('정보가 업데이트되었습니다.');
      setEditingIndex(null);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleAddToWritingStatus = async (item: any) => {
    setAddingWriting(item.bookId);
    try {
      await writingStatusApi.update({ 
        name: studentName, 
        bookTitle: item.bookTitle,
        progress: '진행' 
      });
      toast.success('글쓰기 현황에 추가되었습니다.');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setAddingWriting(null);
      setWritingConfirmItem(null);
    }
  };

  const handleAddCurriculum = async (bookTitle?: string, isWriting: boolean = false) => {
    try {
      await curriculumApi.add({ studentName, bookTitle, isWriting });
      toast.success(isWriting ? '글쓰기가 추가되었습니다.' : '도서가 추가되었습니다.');
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteCurriculum = async (item: any) => {
    setIsDeleting(true);
    try {
      await curriculumApi.remove({ 
        studentName, 
        bookId: item.bookId, 
        index: item.index 
      });
      toast.success('항목이 삭제되었습니다.');
      setDeletingItem(null);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button variant="ghost" onClick={onBack} className="w-fit gap-2 rounded-xl">
          <ChevronLeft className="w-4 h-4" />
          뒤로 가기
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 items-start sm:items-center">
          <h2 className="text-[21px] font-extrabold px-3 sm:px-0 text-left">{studentName} 학생 도서 목록</h2>
          <div className="flex items-center justify-start gap-1 sm:gap-2 px-3 sm:px-0">
            <Dialog>
              <DialogTrigger render={
                <Button className="rounded-xl gap-2 scale-[0.85] origin-left sm:scale-100 h-9 sm:h-10">
                  <Plus className="w-[15px] h-[15px] sm:w-4 sm:h-4" />
                  도서
                </Button>
              } />
              <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-[21px] font-extrabold mt-3 ml-3">{studentName} 학생 도서 추가</DialogTitle>
                </DialogHeader>
                <div className="pt-4">
                  <BookSearch 
                    books={data.books} 
                    existingBookTitles={curriculum.map(c => c.bookTitle)}
                    onSelect={(bookTitle) => handleAddCurriculum(bookTitle)} 
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline"
              className="rounded-xl gap-2 border-[#f3e8ff] bg-[#faf5ff] text-purple-600 hover:bg-[#f3e8ff] scale-[0.85] origin-left sm:scale-100 h-9 sm:h-10"
              onClick={() => handleAddCurriculum(undefined, true)}
            >
              <Plus className="w-[15px] h-[15px] sm:w-4 sm:h-4" />
              글쓰기
            </Button>
          </div>
        </div>
      </div>

      <Card className="rounded-[2.5rem] shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-white border-b border-border/50 text-xs sm:text-sm">
              <TableRow className="hover:bg-transparent border-border/30">
                <TableHead className="w-[60px] text-center font-semibold uppercase tracking-widest px-1">순서</TableHead>
                <TableHead className="font-semibold uppercase tracking-widest px-2">도서명</TableHead>
                <TableHead className="w-[100px] lg:w-[130px] text-center font-semibold uppercase tracking-widest px-1">정보</TableHead>
                <TableHead className="w-[80px] lg:w-[110px] text-center font-semibold uppercase tracking-widest px-1">학원번호</TableHead>
                <TableHead className="w-[90px] lg:w-[120px] text-center font-semibold uppercase tracking-widest px-1">상태</TableHead>
                <TableHead className="w-[110px] lg:w-[150px] text-center font-semibold uppercase tracking-widest px-1">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {curriculum.map((item) => (
                <TableRow key={item.index} className="border-border/20 hover:bg-secondary/10 transition-colors">
                  <TableCell className="text-center px-1">
                    {editingIndex === item.index ? (
                      <input 
                        type="number"
                        className="w-10 bg-white border border-border/50 rounded-lg px-1 py-1 text-xs font-normal text-center focus:ring-2 ring-primary/20 outline-none"
                        value={editValues?.index}
                        onChange={(e) => setEditValues(prev => prev ? { ...prev, index: parseInt(e.target.value) || 0 } : null)}
                      />
                    ) : (
                      <span className="font-normal text-muted-foreground text-xs sm:text-sm">{item.index}</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2">
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
                  <TableCell className="text-center px-1">
                    <span className="font-normal text-muted-foreground text-xs sm:text-sm block truncate" title={item.info}>
                      {item.info}
                    </span>
                  </TableCell>
                  <TableCell className="text-center px-1">
                    <span className="font-normal text-muted-foreground text-xs sm:text-sm block truncate">
                      {item.bookId}
                    </span>
                  </TableCell>
                  <TableCell className="text-center px-1">
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
                        item.status === '통과' ? 'bg-green-100 text-green-700' :
                        item.status === '진행' ? 'bg-primary text-white' :
                        item.status === '불통' ? 'bg-destructive/10 text-destructive' :
                        'bg-secondary text-muted-foreground'
                      }`}>
                        {item.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-left px-1">
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
                      <div className="flex items-center justify-start gap-0 sm:gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs font-bold hover:text-primary h-8 px-1 sm:px-2"
                          onClick={() => {
                            setEditingIndex(item.index);
                            setEditValues({ 
                              status: item.status,
                              index: item.index,
                              bookTitle: item.bookTitle
                            });
                          }}
                        >
                          수정
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
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
