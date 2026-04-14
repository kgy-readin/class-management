import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardData } from '../../types';
import { toast } from 'sonner';
import { User, ArrowUpCircle, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { formatLevel } from '@/lib/utils';
import { attendanceApi, studentApi } from '@/src/services/api';

interface StudentListProps {
  data: DashboardData | null;
  onRefresh: () => void;
  onSelectStudent: (name: string) => void;
}

export default function StudentList({ data, onRefresh, onSelectStudent }: StudentListProps) {
  const [search, setSearch] = useState('');
  const [dismissalTime, setDismissalTime] = useState('');

  if (!data) return null;

  const filteredStudents = data.students
    .filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.grade.toLowerCase().includes(search.toLowerCase())
    )
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredStudents.map(student => (
          <div 
            key={student.name} 
            className={`flex items-center justify-between p-4 rounded-[1.5rem] border transition-all bg-white hover:shadow-md ${
              student.isAttending 
                ? 'border-primary/30 shadow-sm' 
                : 'border-border/50'
            }`}
          >
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all p-0 ${
                  student.isAttending 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90' 
                    : 'bg-background text-muted-foreground border border-border/50 hover:bg-secondary'
                }`}
                onClick={() => onSelectStudent(student.name)}
                title={`${student.name} 학생 상세 정보`}
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
              </div>
            </div>

            <div className="flex items-center gap-3 ml-4 shrink-0">
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
                <Dialog>
                  <DialogTrigger render={
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="rounded-2xl h-11 px-6 text-[13px] font-semibold bg-[#f0f7ff] text-primary border-[#dbeafe] shadow-sm hover:bg-[#e0efff] transition-all"
                    >
                      등원
                    </Button>
                  } />
                  <DialogContent className="sm:max-w-[360px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="p-8 text-center space-y-6">
                      <div className="space-y-2">
                        <h3 className="text-lg font-extrabold text-foreground">{student.name} 학생 등원</h3>
                        <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                          하원 예정 시간을 입력해 주세요.
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <Input 
                          type="time" 
                          onChange={(e) => setDismissalTime(e.target.value)}
                          className="rounded-2xl h-12 border-border/50 bg-secondary/50 focus:ring-primary focus:bg-white transition-all text-center font-bold"
                        />
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
