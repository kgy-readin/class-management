import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, User, CalendarCheck } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { StudentLogEntry } from '../../types';
import { renderBoldBrackets } from '../common/TextHelpers';

interface StudentLogCalendarProps {
  currentMonth: Date;
  setCurrentMonth: (date: Date | ((prev: Date) => Date)) => void;
  setViewMode: (mode: 'monthly' | 'student' | 'monthly-detail') => void;
  setCurrentPage: (page: number) => void;
  logs: StudentLogEntry[];
  handleCellClick: (day: Date) => void;
  getCategoryTagStyle: (category: string) => string;
  isKoreanHoliday: (date: Date) => boolean;
}

export default function StudentLogCalendar({
  currentMonth,
  setCurrentMonth,
  setViewMode,
  setCurrentPage,
  logs,
  handleCellClick,
  getCategoryTagStyle,
  isKoreanHoliday,
}: StudentLogCalendarProps) {
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const daysInRange = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <Card className="rounded-[2.5rem] border-none ring-0 shadow-sm overflow-hidden bg-white">
      <CardContent className="p-8" style={{ paddingTop: '8px' }}>
        
        {/* Header with calendar controls */}
        <div className="relative flex items-center justify-center" style={{ height: '40px', marginBottom: '16px' }}>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full w-9 h-9 border-none bg-transparent hover:bg-zinc-100 shadow-none text-zinc-650"
              onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </Button>
            <span className="text-[19px] font-semibold text-zinc-800 tracking-tight select-none px-2 min-w-[120px] text-center">
              {format(currentMonth, 'yyyy년 M월', { locale: ko })}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full w-9 h-9 border-none bg-transparent hover:bg-zinc-100 shadow-none text-zinc-650"
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
            >
              <ChevronRight className="w-4.5 h-4.5" />
            </Button>
          </div>

          <div className="absolute right-0 flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="h-10 w-10 rounded-full text-foreground border border-solid border-zinc-100 bg-white/50 hover:bg-white/80 shadow-sm transition-all"
              onClick={() => {
                setViewMode('monthly-detail');
              }}
              title="월별상세로 보기"
            >
              <CalendarCheck className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-10 w-10 rounded-full text-foreground border border-solid border-zinc-100 bg-white/50 hover:bg-white/80 shadow-sm transition-all"
              onClick={() => {
                setViewMode('student');
                setCurrentPage(1);
              }}
              title="학생뷰로 보기"
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {['월', '화', '수', '목', '금', '토', '일'].map((dayName, index) => (
            <div 
              key={dayName} 
              className={`text-[14.5px] font-normal py-1.5 select-none ${
                index === 6 ? 'text-red-500' : 'text-zinc-800'
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Monthly Grid with white background */}
        <div className="bg-white p-4.5 rounded-[2rem]">
          <div className="grid grid-cols-7 gap-2">
            {daysInRange.map((day) => {
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayLogs = logs.filter(log => String(log.date).split('T')[0] === dateStr);
              const isSunday = day.getDay() === 0;
              
              // Show up to 4 tags directly (2 columns x 2 rows)
              const maxVisibleTags = 4;
              const visibleLogs = dayLogs.length > maxVisibleTags ? dayLogs.slice(dayLogs.length - maxVisibleTags) : dayLogs;
              const extraLogsCount = dayLogs.length > maxVisibleTags ? dayLogs.length - maxVisibleTags : 0;

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => handleCellClick(day)}
                  className={`min-h-[120px] p-3.5 rounded-[13px] shadow-[0_6px_22px_rgba(0,0,0,0.035),0_2px_6px_rgba(0,0,0,0.015)] gap-1.5 flex flex-col justify-between cursor-pointer transition-all hover:bg-zinc-50/50 hover:shadow-[0_16px_32px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 hover:z-10 select-none relative ${
                    isCurrentMonth ? 'bg-white' : 'bg-white/40 opacity-40'
                  }`}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between w-full">
                    <div className="relative flex flex-col items-start justify-center p-0.5 -ml-1">
                      <span className={`relative text-[14px] font-medium leading-none ${
                        (isSunday || isKoreanHoliday(day)) ? 'text-red-500' : 'text-zinc-800'
                      }`}>
                        {format(day, 'd')}
                        {isSameDay(day, new Date()) && (
                          <span className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-3 h-[2.5px] bg-zinc-800 rounded-full" />
                        )}
                      </span>
                    </div>
                    
                    {extraLogsCount > 0 && (
                      <span className="text-[10px] font-extrabold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-full">
                        +{extraLogsCount}
                      </span>
                    )}
                  </div>

                {/* Tags matching logs under the day */}
                <div className="flex-1 mt-3 grid grid-cols-1 lg:grid-cols-2 grid-rows-2 gap-x-[3px] gap-y-[1px] content-end items-end" style={{ minHeight: '44px', width: '100%' }}>
                  {visibleLogs.map((log, lIdx) => {
                    const tagStyle = getCategoryTagStyle(log.category);
                    const colClass = lIdx % 2 === 0 ? 'lg:col-start-1 col-start-1' : 'lg:col-start-2 col-start-1';
                    const rowClass = lIdx < 2 
                      ? (lIdx === 0 ? 'row-start-2 lg:row-start-2' : 'row-start-1 lg:row-start-2') 
                      : 'lg:row-start-1';
                    
                    return (
                      <div 
                        key={`${log.name}-${lIdx}`} 
                        className={`relative group ${lIdx >= 2 ? 'hidden lg:block' : ''} ${colClass} ${rowClass} w-full`}
                      >
                        <div 
                          className={`rounded-lg font-normal py-0.5 truncate text-center block ${tagStyle} w-full`}
                          style={{ fontSize: '11.5px', minWidth: '0' }}
                        >
                          {log.name}
                        </div>

                        {/* Custom Hover Popup */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 bg-white border border-solid border-zinc-100 p-3.5 rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:pointer-events-none w-[300px] pointer-events-none transition-all duration-200">
                          <div className="whitespace-normal text-left">
                            <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                              <span className="text-[13px] font-medium text-zinc-800 leading-normal">{log.name}</span>
                              <span className="text-[10px] font-medium text-zinc-500 bg-zinc-50 border border-solid border-zinc-200/60 px-1.5 py-0.5 rounded-full leading-normal select-none">
                                {log.category}
                              </span>
                            </div>
                            <div className="text-[12px] text-zinc-700 font-normal leading-normal select-none">
                              {renderBoldBrackets(log.content)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
