import React from 'react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import StudentCombobox from '../common/StudentCombobox';

// ----------------------------------------------------
// 1. 글쓰기 현황 기록 추가 팝업
// ----------------------------------------------------
interface AddWritingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: any[];
  addForm: {
    date: string;
    name: string;
    bookTitle: string;
  };
  setAddForm: React.Dispatch<React.SetStateAction<{
    date: string;
    name: string;
    bookTitle: string;
  }>>;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
}

export function AddWritingDialog({
  open,
  onOpenChange,
  students,
  addForm,
  setAddForm,
  onConfirm,
  isSubmitting
}: AddWritingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-[2.5rem] border-none shadow-2xl p-6 bg-white overflow-visible animate-in fade-in zoom-in duration-300">
        <div className="space-y-6">
          <div className="text-left border-b border-solid border-zinc-100 pb-3">
            <h3 className="text-[19px] font-bold text-zinc-800">글쓰기 기록 추가</h3>
          </div>

          <div className="space-y-4">
            {/* Date and Student side by side */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <input
                  type="date"
                  className="w-full bg-zinc-50 border border-neutral-200/80 rounded-xl px-3 py-2.5 text-[14px] font-normal leading-normal focus:ring-1 ring-primary/20 hover:border-neutral-300 focus:bg-white outline-none transition-all cursor-pointer h-10"
                  value={addForm.date}
                  onChange={(e) => setAddForm(prev => ({ ...prev, date: e.target.value }))}
                  onClick={(e) => {
                    try { e.currentTarget.showPicker(); } catch {}
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <StudentCombobox
                  students={students}
                  value={addForm.name}
                  onChange={(val) => setAddForm(prev => ({ ...prev, name: val }))}
                  placeholder="학생 선택 또는 직접 입력"
                  inputClassName="bg-zinc-50 border-neutral-200/80 text-[14px]"
                />
              </div>
            </div>

            {/* Book Title */}
            <div className="space-y-1.5">
              <input
                type="text"
                placeholder="도서명을 입력하세요"
                className="w-full bg-zinc-50 border border-neutral-200/80 rounded-xl px-4 py-2.5 text-[14px] font-normal leading-normal focus:ring-1 ring-primary/20 hover:border-neutral-300 focus:bg-white outline-none transition-all"
                value={addForm.bookTitle}
                onChange={e => setAddForm(prev => ({ ...prev, bookTitle: e.target.value }))}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <DialogClose render={
              <Button 
                type="button" 
                className="flex-1 h-11 rounded-xl bg-zinc-100/80 hover:bg-zinc-200/80 text-zinc-600 font-bold border-none cursor-pointer"
              >
                취소
              </Button>
            } />
            <Button 
              type="button" 
              onClick={onConfirm} 
              disabled={isSubmitting}
              className="flex-1 h-11 rounded-xl bg-blue-100/70 hover:bg-blue-200/70 text-primary font-bold shadow-lg shadow-blue-500/15 border border-solid border-white cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 active:outline-none disabled:opacity-50 disabled:shadow-none disabled:border-none"
            >
              {isSubmitting ? '저장 중...' : '추가'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------
// 2. 글쓰기 현황 삭제 확인 팝업
// ----------------------------------------------------
interface DeleteWritingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deletingItem: {
    name: string;
    bookTitle: string;
  } | null;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
}

export function DeleteWritingDialog({
  open,
  onOpenChange,
  deletingItem,
  onConfirm,
  isSubmitting
}: DeleteWritingDialogProps) {
  if (!deletingItem) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-250">
        <div className="p-8 text-center space-y-6">
          <div className="w-[54px] h-[54px] bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-[27px] h-[27px] text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">글쓰기 기록 삭제</h3>
            <p className="text-sm text-zinc-600 font-normal leading-relaxed">
              <span className="text-destructive font-bold">'{deletingItem.name}'</span> 학생의 <br />
              <span className="font-semibold">'{deletingItem.bookTitle}'</span> 글쓰기 기록을 삭제하시겠습니까?
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              type="button"
              className="flex-1 h-12 rounded-2xl bg-zinc-100/80 hover:bg-zinc-200/80 text-zinc-500 font-bold border-none cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button 
              type="button"
              variant="destructive"
              className="flex-1 h-12 rounded-2xl font-bold shadow-lg shadow-destructive/20 cursor-pointer"
              onClick={onConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? '삭제 중...' : '삭제'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------
// 3. 글쓰기 현황 초기화 팝업
// ----------------------------------------------------
interface ClearWritingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clearType: 'period' | 'all';
  setClearType: (type: 'period' | 'all') => void;
  clearStartDate: string;
  setClearStartDate: (date: string) => void;
  clearEndDate: string;
  setClearEndDate: (date: string) => void;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
}

export function ClearWritingDialog({
  open,
  onOpenChange,
  clearType,
  setClearType,
  clearStartDate,
  setClearStartDate,
  clearEndDate,
  setClearEndDate,
  onConfirm,
  isSubmitting
}: ClearWritingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-250">
        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-[54px] h-[54px] bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-[27px] h-[27px] text-destructive" />
            </div>
            <h3 className="text-lg font-bold text-foreground">글쓰기 데이터 삭제</h3>
            <p className="text-sm text-zinc-600 font-normal leading-relaxed">데이터를 정리할 방식을 선택하세요.</p>
          </div>

          {/* Clear Type Selection Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-xl">
            <button
              type="button"
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                clearType === 'period'
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
              onClick={() => setClearType('period')}
            >
              특정 기간 삭제
            </button>
            <button
              type="button"
              className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                clearType === 'all'
                  ? 'bg-white text-destructive shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
              onClick={() => setClearType('all')}
            >
              전체 리셋
            </button>
          </div>

          {/* Date range inputs if 'period' is selected */}
          {clearType === 'period' ? (
            <div className="space-y-3.5 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100">
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-zinc-500 block">시작일</label>
                <input
                  type="date"
                  className="w-full bg-white border border-neutral-200/80 rounded-xl px-3 py-2.5 text-[14px] font-normal focus:ring-1 ring-primary/20 outline-none transition-all cursor-pointer"
                  value={clearStartDate}
                  onChange={(e) => setClearStartDate(e.target.value)}
                  onClick={(e) => {
                    try { e.currentTarget.showPicker(); } catch {}
                  }}
                />
              </div>
              <div className="space-y-1.5 text-left">
                <label className="text-xs font-bold text-zinc-500 block">종료일</label>
                <input
                  type="date"
                  className="w-full bg-white border border-neutral-200/80 rounded-xl px-3 py-2.5 text-[14px] font-normal focus:ring-1 ring-primary/20 outline-none transition-all cursor-pointer"
                  value={clearEndDate}
                  onChange={(e) => setClearEndDate(e.target.value)}
                  onClick={(e) => {
                    try { e.currentTarget.showPicker(); } catch {}
                  }}
                />
              </div>
              <p className="text-[11px] font-semibold text-destructive text-center leading-relaxed">
                ※ 선택한 해당 기간 내 유효한 기록들이 일괄 삭제됩니다.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-destructive/10 rounded-2xl border border-destructive/20 text-center">
              <p className="text-xs text-destructive font-semibold leading-relaxed">
                경고: 글쓰기현황 시트 내 모든 데이터가 소멸됩니다.<br />
                이 작업은 취소할 수 없습니다.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              className="flex-1 h-12 rounded-2xl bg-zinc-100/80 hover:bg-zinc-200/80 text-zinc-500 font-bold border-none cursor-pointer text-sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1 h-12 rounded-2xl font-bold shadow-lg shadow-destructive/20 cursor-pointer text-sm"
              onClick={onConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? '삭제 중...' : '삭제'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
