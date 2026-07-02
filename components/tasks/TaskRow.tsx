import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X, Save, Trash2 } from 'lucide-react';
import { Task, Student } from '../../types';
import StudentCombobox from '../common/StudentCombobox';
import { isTaskOverdue, isTodayTask, formatRelativeTaskDate } from './dateUtils';
import { getCategoryBadgeClass, getStatusBadgeClass, getFamilyClassBadgeClass } from './badgeUtils';
import { MESSAGES } from '@/src/constants/messages';
import { toast } from 'sonner';

interface TaskRowProps {
  task: Task;
  editingRowIndex: number | null;
  submitting: boolean;
  editForm: Omit<Task, 'sheetRowIndex'>;
  setEditForm: React.Dispatch<React.SetStateAction<Omit<Task, 'sheetRowIndex'>>>;
  students: Student[];
  handleStartEdit: (task: Task) => void;
  handleSaveEdit: (sheetRowIndex: number) => Promise<void>;
  handleDeleteTask: (sheetRowIndex: number) => Promise<void>;
  handleQuickComplete: (sheetRowIndex: number) => Promise<void>;
  setReservingTask: (task: Task) => void;
  setEditingRowIndex: (val: number | null) => void;
}

export default function TaskRow({
  task,
  editingRowIndex,
  submitting,
  editForm,
  setEditForm,
  students,
  handleStartEdit,
  handleSaveEdit,
  handleDeleteTask,
  handleQuickComplete,
  setReservingTask,
  setEditingRowIndex,
}: TaskRowProps) {
  const isEditing = editingRowIndex === task.sheetRowIndex;
  const isOverdue = isTaskOverdue(task.date, task.status);

  if (isEditing) {
    return (
      <div 
        key={task.sheetRowIndex} 
        className="pl-2 pr-2.5 py-2.5 bg-zinc-50 hover:bg-zinc-100/70 border-b border-zinc-200/50 flex flex-col gap-2 rounded-lg transition-colors font-sans"
      >
        {/* Row 1: Looks identical to static viewer row */}
        <div className="flex-1 flex flex-wrap items-center gap-1.5">
          {/* Category selection - styled like the dynamic category badge */}
          <select
            value={editForm.category}
            onChange={(e) => {
              const cat = e.target.value;
              setEditForm(prev => ({
                ...prev,
                category: cat,
                familyClass: cat === '가통' ? prev.familyClass || '정기' : ''
              }));
            }}
            className={`h-7 px-1.5 rounded text-[13px] font-normal border-0 bg-transparent cursor-pointer focus:ring-1 focus:ring-primary ${getCategoryBadgeClass(editForm.category)}`}
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

          {/* Todo field - seamless input */}
          <input
            type="text"
            placeholder="할 일 수정"
            value={editForm.todo}
            onChange={(e) => setEditForm(prev => ({ ...prev, todo: e.target.value }))}
            className="h-7 flex-1 min-w-[150px] px-1 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary text-[13px] text-zinc-800 font-normal rounded font-sans"
          />

          {/* Date Picker Input - seamless input */}
          <input
            type="date"
            value={editForm.date}
            onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
            className={`h-7 w-[120px] bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary text-[13px] rounded font-normal text-right pr-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-zinc-650'}`}
          />

          {/* Status Choice - styled like the dynamic status badge */}
          <select
            value={editForm.status}
            onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
            className={`h-7 px-1.5 rounded text-[13px] font-normal border-0 bg-transparent cursor-pointer focus:ring-1 focus:ring-primary ${getStatusBadgeClass(editForm.status)}`}
          >
            <option value="예정">예정</option>
            <option value="진행">진행</option>
            <option value="대기">대기</option>
            <option value="보류">보류</option>
            <option value="완료">완료</option>
            <option value="취소">취소</option>
          </select>
        </div>

        {/* Memo Input directly under category-todo line but above the dotted line */}
        <div className="w-full">
          <input
            type="text"
            placeholder="메모 입력"
            value={editForm.memo}
            onChange={(e) => setEditForm(prev => ({ ...prev, memo: e.target.value }))}
            className="h-7 w-full px-2 border border-zinc-250 focus:border-primary focus:outline-none bg-white text-xs text-zinc-500 rounded font-sans"
          />
        </div>

        {/* Row 2: Secondary info (Left) and Buttons (Right) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1.5 border-t border-dotted border-zinc-200 mt-0.5">
          {/* Left aligned: Undisplayed details without prefix text labels */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-sans animate-none">
            <StudentCombobox
              students={students}
              value={editForm.name || ''}
              onChange={(val) => setEditForm(prev => ({ ...prev, name: val }))}
              placeholder="학생명 입력"
              className="!w-28 font-sans"
              inputClassName="bg-white text-zinc-850 text-xs !h-6 !rounded"
            />

            {editForm.category === '가통' && (
              <select
                value={editForm.familyClass}
                onChange={(e) => setEditForm(prev => ({ ...prev, familyClass: e.target.value }))}
                className={`h-6 px-1.5 border border-zinc-200 rounded text-[13px] font-normal cursor-pointer font-sans ${getFamilyClassBadgeClass(editForm.familyClass)}`}
              >
                <option value="정기">정기</option>
                <option value="첫날">첫날</option>
                <option value="한달">한달</option>
                <option value="중등">중등</option>
              </select>
            )}
          </div>

          {/* Right aligned: Control buttons */}
          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 pr-1">
            {/* 예약 Button (Left of 완료) */}
            <Button
              size="sm"
              variant="outline"
              disabled={submitting}
              onClick={() => {
                const studentName = editForm.name || task.name || '';
                if (!studentName.trim()) {
                  toast.error(MESSAGES.tasks.enterName);
                  return;
                }
                setReservingTask({ ...task, name: studentName });
              }}
              className="h-7 text-xs bg-zinc-100/70 hover:bg-zinc-200 text-zinc-700 border border-zinc-400 font-semibold px-2 rounded-lg transition-colors cursor-pointer"
              title="가정통신문 예약하기"
            >
              예약
            </Button>

            {/* 완료 button shortcut in flat blue */}
            <Button
              size="sm"
              variant="outline"
              disabled={submitting}
              onClick={() => handleQuickComplete(task.sheetRowIndex!)}
              className="h-7 text-xs bg-zinc-100/70 hover:bg-zinc-200 text-zinc-700 border border-zinc-400 font-semibold px-2 rounded-lg transition-colors cursor-pointer"
              title="오늘 완료 처리 후 바로 저장"
            >
              완료
            </Button>

            <div className="flex items-center gap-0.5 pl-1.5 border-l border-zinc-200">
              {/* Save (Check) */}
              <Button
                size="icon"
                variant="ghost"
                disabled={submitting}
                onClick={() => handleSaveEdit(task.sheetRowIndex!)}
                className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                title="저장"
              >
                <Save className="w-3.5 h-3.5" />
              </Button>

              {/* Delete Task */}
              <Button
                size="icon"
                variant="ghost"
                disabled={submitting}
                onClick={() => handleDeleteTask(task.sheetRowIndex!)}
                className="h-7 w-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                title="이 업무 삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>

              {/* Cancel Edit */}
              <Button
                size="icon"
                variant="ghost"
                disabled={submitting}
                onClick={() => setEditingRowIndex(null)}
                className="h-7 w-7 text-zinc-400 hover:text-zinc-550 hover:bg-zinc-50 rounded-lg cursor-pointer"
                title="취소"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      key={task.sheetRowIndex} 
      className="group relative pl-0.5 pr-0.5 py-1.5 bg-white hover:bg-zinc-50/70 border-b border-zinc-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px] transition-colors rounded-lg font-normal"
    >
      {/* Mobile View Container */}
      <div className="w-full sm:hidden flex items-start gap-1.5">
        {/* Badge on left */}
        <div className="shrink-0 pt-0.5">
          <span className={`px-1.5 py-0.5 rounded text-[13px] font-normal tracking-tight ${getCategoryBadgeClass(task.category)}`}>
            {task.category || '기타'}
          </span>
        </div>

        {/* Right Column: Title + Metadata + Edit Button */}
        <div className="flex-1 flex flex-col gap-1 min-w-0 pr-1">
          <div className="flex items-start justify-between gap-1.5">
            <span className="font-medium text-zinc-750 text-[14.5px] break-all">
              {task.todo}
            </span>
            <div className="shrink-0">
              <Button
                size="icon"
                variant="ghost"
                disabled={submitting}
                onClick={() => handleStartEdit(task)}
                className="h-6 w-6 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg flex items-center justify-center cursor-pointer"
                title="수정하기"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Metadata perfectly aligned with task.todo first letter */}
          <div className="flex flex-wrap items-center gap-2 select-none text-[12px] mt-0.5">
            {task.memo && task.memo.trim() !== '' && (
              <span className="font-normal text-zinc-500 max-w-[200px] truncate" title={task.memo}>
                {task.memo}
              </span>
            )}
            {task.date && (
              <span className={`font-normal ${isOverdue ? 'text-red-600 font-medium' : isTodayTask(task.date) ? 'text-blue-600 font-medium' : 'text-zinc-750'}`}>
                {formatRelativeTaskDate(task.date)}
              </span>
            )}
            <span className={`rounded-lg font-normal text-[13px] px-1.5 py-0.5 ${getStatusBadgeClass(task.status)}`}>
              {task.status || '예정'}
            </span>
          </div>
        </div>
      </div>

      {/* Desktop View Container */}
      <div className="hidden sm:flex w-full items-center justify-between gap-2">
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <span className={`px-1.5 py-0.5 rounded text-[13px] font-normal tracking-tight ${getCategoryBadgeClass(task.category)} mr-1 shrink-0`}>
            {task.category || '기타'}
          </span>
          <span className="font-medium text-zinc-750 text-[14.5px] break-all truncate">
            {task.todo}
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 select-none">
          {task.memo && task.memo.trim() !== '' && (
            <span className="text-[13px] font-normal text-zinc-500 max-w-[200px] truncate" title={task.memo}>
              {task.memo}
            </span>
          )}
          {task.date && (
            <span className={`text-[13px] font-normal ${isOverdue ? 'text-red-600 font-medium' : isTodayTask(task.date) ? 'text-blue-600 font-medium' : 'text-zinc-750'}`}>
              {formatRelativeTaskDate(task.date)}
            </span>
          )}
          <span className={`rounded-lg font-normal text-[13px] px-2 py-0.5 ${getStatusBadgeClass(task.status)}`}>
            {task.status || '예정'}
          </span>

          <div className="flex items-center opacity-30 group-hover:opacity-100 transition-opacity pl-1">
            <Button
              size="icon"
              variant="ghost"
              disabled={submitting}
              onClick={() => handleStartEdit(task)}
              className="h-[15px] w-[15px] min-h-0 min-w-0 p-0 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded flex items-center justify-center cursor-pointer"
              title="수정하기"
            >
              <Pencil className="w-2.5 h-2.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
