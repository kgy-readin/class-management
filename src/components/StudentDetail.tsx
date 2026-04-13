import { Curriculum, DashboardData } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Plus, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import BookSearch from './BookSearch';
import { toast } from 'sonner';
import { useState } from 'react';

interface StudentDetailProps {
  studentName: string;
  data: DashboardData | null;
  onBack: () => void;
  onRefresh: () => void;
}

export default function StudentDetail({ studentName, data, onBack, onRefresh }: StudentDetailProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{ status: string } | null>(null);

  if (!data) return null;

  const student = data.students.find(s => s.name === studentName);
  const curriculum = data.curriculums
    .filter(c => c.studentName === studentName)
    .sort((a, b) => a.index - b.index);

  const handleStatusUpdate = async (bookId: string, status: string) => {
    try {
      const response = await fetch('/api/curriculum/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentName, bookId, status }),
      });
      if (!response.ok) throw new Error('Status update failed');
      toast.success('진도가 업데이트되었습니다.');
      setEditingIndex(null);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2 rounded-xl">
          <ChevronLeft className="w-4 h-4" />
          뒤로 가기
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-black mr-2">{studentName} 학생 도서목록</h2>
          <Dialog>
            <DialogTrigger render={
              <Button className="rounded-xl gap-2 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4" />
                도서 추가
              </Button>
            } />
            <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">{studentName} 학생 도서 추가</DialogTitle>
              </DialogHeader>
              <div className="pt-4">
                <BookSearch 
                  books={data.books} 
                  onSelect={(bookTitle) => {
                    fetch('/api/curriculum/add', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ studentName, bookTitle, isWriting: false }),
                    }).then(() => {
                      toast.success('도서가 추가되었습니다.');
                      onRefresh();
                    });
                  }} 
                />
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline"
            className="rounded-xl gap-2 border-primary/20 text-primary hover:bg-primary/5"
            onClick={async () => {
              try {
                const response = await fetch('/api/curriculum/add', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ studentName, isWriting: true }),
                });
                if (!response.ok) throw new Error('Failed to add writing');
                toast.success('글쓰기가 추가되었습니다.');
                onRefresh();
              } catch (error: any) {
                toast.error(error.message);
              }
            }}
          >
            <Plus className="w-4 h-4" />
            글쓰기 추가
          </Button>
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-border/50 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-secondary/30">
              <TableRow className="hover:bg-transparent border-border/30">
                <TableHead className="w-[80px] text-center font-black text-xs uppercase tracking-widest">순서</TableHead>
                <TableHead className="font-black text-xs uppercase tracking-widest">도서명</TableHead>
                <TableHead className="w-[100px] text-center font-black text-xs uppercase tracking-widest">학원번호</TableHead>
                <TableHead className="w-[120px] text-center font-black text-xs uppercase tracking-widest">상태</TableHead>
                <TableHead className="w-[100px] text-center font-black text-xs uppercase tracking-widest">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {curriculum.map((item) => (
                <TableRow key={item.index} className="border-border/20 hover:bg-secondary/10 transition-colors">
                  <TableCell className="text-center font-normal text-muted-foreground text-sm">{item.index}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-normal text-foreground text-sm">{item.bookTitle}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-normal text-muted-foreground text-sm">
                      {item.bookId}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {editingIndex === item.index ? (
                      <select 
                        className="bg-white border border-border/50 rounded-lg px-2 py-1 text-xs font-normal focus:ring-2 ring-primary/20 outline-none -translate-x-[2px]"
                        value={editValues?.status}
                        onChange={(e) => setEditValues(prev => prev ? { ...prev, status: e.target.value } : null)}
                      >
                        {['예정', '진행', '통과', '불통'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <Badge className={`rounded-lg font-normal text-sm ${
                        item.status === '통과' ? 'bg-green-100 text-green-700' :
                        item.status === '진행' ? 'bg-primary text-white' :
                        item.status === '불통' ? 'bg-destructive/10 text-destructive' :
                        'bg-secondary text-muted-foreground'
                      }`}>
                        {item.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {editingIndex === item.index ? (
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={() => handleStatusUpdate(item.bookId, editValues!.status)}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-muted-foreground hover:bg-secondary"
                          onClick={() => setEditingIndex(null)}
                        >
                          <Plus className="w-4 h-4 rotate-45" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs font-bold hover:text-primary"
                        onClick={() => {
                          setEditingIndex(item.index);
                          setEditValues({ status: item.status });
                        }}
                      >
                        수정
                      </Button>
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
