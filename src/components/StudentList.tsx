import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardData, Student } from '../types';
import { toast } from 'sonner';
import { User, GraduationCap, BookOpen, CheckCircle2, XCircle, ArrowUpCircle, Clock, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

interface StudentListProps {
  data: DashboardData | null;
  onRefresh: () => void;
}

export default function StudentList({ data, onRefresh }: StudentListProps) {
  const [search, setSearch] = useState('');
  const [dismissalTime, setDismissalTime] = useState('');

  if (!data) return null;

  const filteredStudents = data.students
    .filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.grade.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by attendance status (true first)
      if (a.isAttending !== b.isAttending) {
        return a.isAttending ? -1 : 1;
      }
      // Secondary sort by name
      return a.name.localeCompare(b.name);
    });

  const handleAttendance = async (name: string, isAttending: boolean, time: string) => {
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, isAttending, dismissalTime: time }),
      });
      if (!response.ok) throw new Error('Attendance update failed');
      toast.success(isAttending ? `${name} 학생 등원 처리되었습니다.` : `${name} 학생 하원 처리되었습니다.`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleLevelUp = async (name: string) => {
    if (!confirm(`${name} 학생의 레벨업을 진행하시겠습니까?\n커리큘럼이 초기화되고 레벨이 1 상승합니다.`)) return;
    
    try {
      const response = await fetch('/api/level-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error('Level up failed');
      toast.success(`${name} 학생이 레벨업되었습니다!`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="학생 이름 또는 학년 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl border-neutral-200"
          />
        </div>
        <div className="flex gap-2 text-sm text-neutral-500">
          <span>전체: <strong>{data.students.length}</strong>명</span>
          <span>•</span>
          <span>등원 중: <strong className="text-neutral-900">{data.students.filter(s => s.isAttending).length}</strong>명</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredStudents.map(student => (
          <div 
            key={student.name} 
            className={`flex items-center justify-between p-4 rounded-[1.5rem] border transition-all bg-white hover:shadow-md ${
              student.isAttending 
                ? 'border-primary/20 shadow-sm ring-1 ring-primary/5' 
                : 'border-border/50'
            }`}
          >
            {/* Left: Student Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                student.isAttending 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'bg-background text-muted-foreground border border-border/50'
              }`}>
                <User className="w-6 h-6" />
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-foreground truncate">{student.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{student.grade}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-xs font-bold text-primary">
                    {(() => {
                      const l = String(student.level);
                      if (l === '0' || l === '0.0' || !l || l === 'null' || l === 'undefined') return '기초';
                      return `Lv.${l}`;
                    })()}
                  </span>
                </div>
              </div>

              {/* Stats: Books & Homework */}
              <div className="hidden sm:flex items-center gap-6 px-6 border-l border-border/50 ml-2 shrink-0">
                <div className="text-center">
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">완독</span>
                  <span className="text-base font-black text-foreground">{student.booksCompleted}</span>
                </div>
                <div className="text-center">
                  <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">미제출</span>
                  <span className={`text-base font-black ${student.homeworkMissed > 0 ? 'text-destructive' : 'text-foreground'}`}>
                    {student.homeworkMissed}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3 ml-4 shrink-0">
              {student.isAttending ? (
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="rounded-2xl h-11 px-6 text-xs font-black shadow-lg shadow-destructive/20"
                  onClick={() => handleAttendance(student.name, false, '')}
                >
                  하원
                </Button>
              ) : (
                <Dialog>
                  <DialogTrigger render={
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-2xl h-11 px-6 text-xs font-black bg-[#f0f7ff] text-primary border-[#dbeafe] shadow-sm hover:bg-[#e0efff] transition-all"
                    >
                      등원
                    </Button>
                  } />
                  <DialogContent className="sm:max-w-[400px] rounded-[2rem] border-none shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-black">{student.name} 학생 등원</DialogTitle>
                    </DialogHeader>
                    <div className="py-6 space-y-4">
                      <div className="space-y-3">
                        <label className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          하원 예정 시간
                        </label>
                        <Input 
                          type="time" 
                          onChange={(e) => setDismissalTime(e.target.value)}
                          className="rounded-2xl h-12 border-border/50 bg-secondary/50 focus:ring-primary focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        className="w-full rounded-2xl h-12 bg-primary hover:bg-primary/90 text-white font-black text-sm shadow-lg shadow-primary/20"
                        onClick={() => handleAttendance(student.name, true, dismissalTime)}
                      >
                        등원
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              
              <Button 
                variant="ghost" 
                size="icon"
                title="레벨업 (커리큘럼 초기화)"
                className="rounded-xl w-11 h-11 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                onClick={() => handleLevelUp(student.name)}
              >
                <ArrowUpCircle className="w-6 h-6" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
