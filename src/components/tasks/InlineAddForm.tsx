import React from 'react';
import { Button } from '@/components/ui/button';
import { Task, Student } from '../../types';
import StudentCombobox from '../common/StudentCombobox';
import { Calendar, ChevronDown } from 'lucide-react';

interface InlineAddFormProps {
  group: 'todo' | 'inProgress' | 'completed' | 'familyView' | 'nextWeek';
  newForm: Omit<Task, 'sheetRowIndex'>;
  setNewForm: React.Dispatch<React.SetStateAction<Omit<Task, 'sheetRowIndex'>>>;
  students: Student[];
  submitting: boolean;
  handleCreateTask: () => Promise<void>;
  setInlineAddGroup: (group: 'todo' | 'inProgress' | 'completed' | 'familyView' | 'nextWeek' | null) => void;
}

export default function InlineAddForm({
  group,
  newForm,
  setNewForm,
  students,
  submitting,
  handleCreateTask,
  setInlineAddGroup,
}: InlineAddFormProps) {
  return (
    <div className="p-3 bg-zinc-50 rounded-xl border border-solid border-zinc-200 flex flex-col gap-2 text-[13px] animate-in slide-in-from-top-1 fade-in duration-200">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        
        {/* Category Selection */}
        <div className={(newForm.category === '가통' ? 'sm:col-span-3' : 'sm:col-span-4') + " relative"}>
          <select
            value={newForm.category}
            onChange={(e) => {
              const cat = e.target.value;
              setNewForm(prev => ({
                ...prev,
                category: cat,
                familyClass: cat === '가통' ? prev.familyClass || '정기' : ''
              }));
            }}
            className="w-full h-8 px-2 pr-8 border border-zinc-200 rounded-lg bg-white text-[13px] font-normal text-zinc-750 focus:outline-none appearance-none cursor-pointer"
          >
            <option value="기타">기타</option>
            <option value="긴급">긴급</option>
            <option value="중요">중요</option>
            <option value="가통">가통</option>
            <option value="알림장">알림장</option>
            <option value="결과물">결과물</option>
            <option value="보고">보고</option>
            <option value="반복">반복</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* FamilyClass selection picker if category === '가통' */}
        {newForm.category === '가통' && (
          <div className="sm:col-span-3 relative">
            <select
              value={newForm.familyClass}
              onChange={(e) => setNewForm(prev => ({ ...prev, familyClass: e.target.value }))}
              className="w-full h-8 px-2 pr-8 border border-zinc-200 rounded-lg bg-white text-[13px] text-yellow-800 font-normal focus:outline-none appearance-none cursor-pointer"
            >
              <option value="정기">정기</option>
              <option value="첫날">첫날</option>
              <option value="한달">한달</option>
              <option value="중등">중등</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* Student Name */}
        <div className={newForm.category === '가통' ? 'sm:col-span-3' : 'sm:col-span-4'}>
          <StudentCombobox
            students={students}
            value={newForm.name || ''}
            onChange={(val) => setNewForm(prev => ({ ...prev, name: val }))}
            placeholder="학생명 (선택)"
            inputClassName="bg-white text-zinc-850 text-[13px] font-normal border border-zinc-200 !h-8 !rounded-lg"
          />
        </div>

        {/* Date Picker */}
        <div className={(newForm.category === '가통' ? 'sm:col-span-3' : 'sm:col-span-4') + " relative h-8 transition-all"}>
          <input
            type="date"
            value={newForm.date}
            onChange={(e) => setNewForm(prev => ({ ...prev, date: e.target.value }))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />
          <div className="absolute inset-0 flex items-center justify-between px-2.5 rounded-lg border border-solid border-zinc-200 bg-white text-zinc-750 pointer-events-none z-10 text-[13px] font-medium h-8">
            <span className={newForm.date ? 'text-zinc-650' : 'text-zinc-400'}>
              {newForm.date ? newForm.date : '마감일'}
            </span>
            <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
          </div>
        </div>

        {/* Next Row: Todo and Memo */}
        <div className="sm:col-span-8">
          <input
            type="text"
            placeholder="무엇을 해야 하나요?"
            value={newForm.todo}
            onChange={(e) => setNewForm(prev => ({ ...prev, todo: e.target.value }))}
            className="w-full h-8 px-2 border border-zinc-200 rounded-lg bg-white text-[13px] font-medium text-zinc-800 focus:outline-none font-sans"
          />
        </div>

        <div className="sm:col-span-4">
          <input
            type="text"
            placeholder="메모 (옵션)"
            value={newForm.memo}
            onChange={(e) => setNewForm(prev => ({ ...prev, memo: e.target.value }))}
            className="w-full h-8 px-2 border border-zinc-200 rounded-lg bg-white text-[13px] text-zinc-500 focus:outline-none font-sans"
          />
        </div>

      </div>

      <div className="flex items-center justify-end gap-1.5">
        <Button
          size="sm"
          disabled={submitting}
          onClick={handleCreateTask}
          className="h-7 rounded-lg px-3 text-xs bg-primary text-white hover:bg-primary/95 font-semibold animate-none cursor-pointer"
        >
          {submitting ? '저장...' : '확인'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={submitting}
          onClick={() => {
            setNewForm(prev => ({ ...prev, todo: '', memo: '' }));
            setInlineAddGroup(null);
          }}
          className="h-7 rounded-lg px-3 text-xs hover:bg-zinc-100 font-semibold text-zinc-500 cursor-pointer"
        >
          취소
        </Button>
      </div>
    </div>
  );
}
