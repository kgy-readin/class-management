import { Card } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { DashboardData } from '../../types';
import StudentCard from './StudentCard';

interface DashboardProps {
  data: DashboardData | null;
  onRefresh: () => void;
  onSelectStudent: (name: string) => void;
}

export default function Dashboard({ data, onRefresh, onSelectStudent }: DashboardProps) {
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
      <div className="w-full bg-white border border-border/30 rounded-[1.5rem] py-4 px-6 flex items-center justify-center shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-[18px] font-medium text-foreground/80 tracking-tight">
            {dateString}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {attendingStudents.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 text-muted-foreground bg-white rounded-[2.5rem] border border-dashed border-border/50 shadow-sm">
            <div className="w-20 h-20 bg-secondary rounded-[2rem] flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-primary/40" />
            </div>
            <p className="text-xl font-extrabold text-foreground mb-2">현재 등원 중인 학생이 없습니다.</p>
            <p className="text-sm font-medium opacity-60">학생 관리 탭에서 등원 체크를 해주세요.</p>
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
