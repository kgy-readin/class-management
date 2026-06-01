import { Card } from '@/components/ui/card';
import { UsersRound } from 'lucide-react';
import { DashboardData } from '../../types';
import StudentCard from './StudentCard';

interface DashboardProps {
  data: DashboardData | null;
  onRefresh: () => void;
  onSelectStudent: (name: string) => void;
  onNavigateToStudents?: () => void;
}

export default function Dashboard({ data, onRefresh, onSelectStudent, onNavigateToStudents }: DashboardProps) {
  if (!data) return null;

  const attendingStudents = data.students
    .filter(s => s.isAttending)
    .sort((a, b) => {
      const timeA = a.dismissalTime || '미설정';
      const timeB = b.dismissalTime || '미설정';
      
      if (timeA === '미설정' && timeB === '미설정') return 0;
      if (timeA === '미설정') return 1;
      if (timeB === '미설정') return -1;
      
      // Compare HH:mm strings directly
      return timeA.localeCompare(timeB);
    });

  const getProgressList = (studentName: string) => {
    return data.curriculums
      .filter(c => c.studentName === studentName)
      .sort((a, b) => a.index - b.index)
      .filter(item => item.status !== '통과')
      .slice(0, 3);
  };

  const today = new Date();
  const dateString = today.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  return (
    <div className="space-y-6">
      <div className="sticky top-[64px] z-30 py-2 -mt-2 bg-background/90 backdrop-blur-md">
        <div className="relative w-full bg-white border border-zinc-200/60 rounded-[1.25rem] py-3 px-5 flex items-center justify-center shadow-sm">
          <span className="text-[15px] md:text-[17px] font-medium text-neutral-700 tracking-tight text-center">
            {dateString}
          </span>

          <button
            onClick={onNavigateToStudents}
            className="absolute right-4 md:right-5 flex items-center justify-center w-8.5 h-8.5 rounded-full border border-neutral-200/60 bg-zinc-50 hover:bg-neutral-100 hover:border-neutral-300 transition-all text-neutral-500 hover:text-neutral-700 cursor-pointer"
            title="Students"
          >
            <UsersRound className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {attendingStudents.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-muted-foreground bg-white rounded-[2.5rem] border border-dashed border-border/50 shadow-sm">
            <div className="w-20 h-20 bg-blue-50 rounded-[2rem] flex items-center justify-center mb-6">
              <UsersRound className="w-10 h-10 text-blue-500" />
            </div>
            <p className="text-lg font-medium text-zinc-600 mb-2">현재 등원 중인 학생이 없습니다.</p>
            <p className="text-sm font-medium text-zinc-400">학생 관리 탭에서 등원 체크를 해주세요.</p>
          </div>
        ) : (
          attendingStudents.map(student => (
            <StudentCard 
              key={student.name}
              student={student}
              progressList={getProgressList(student.name)}
              onRefresh={onRefresh}
              onSelectStudent={onSelectStudent}
            />
          ))
        )}
      </div>
    </div>
  );
}
