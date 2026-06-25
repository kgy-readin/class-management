import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Trash2 } from 'lucide-react';

// ----------------------------------------------------
// 1. 회의록 추가 팝업 (모달)
// ----------------------------------------------------
interface AddMeetingDialogProps {
  open: boolean;
  onClose: () => void;
  addForm: {
    date: string;
    category: string;
    title: string;
    content: string;
  };
  setAddForm: React.Dispatch<React.SetStateAction<{
    date: string;
    category: string;
    title: string;
    content: string;
  }>>;
  onConfirm: (e: React.FormEvent) => Promise<void>;
  isSubmitting: boolean;
  categories: readonly string[];
  getCategoryStyle: (cat: string) => string;
}

export function AddMeetingDialog({
  open,
  onClose,
  addForm,
  setAddForm,
  onConfirm,
  isSubmitting,
  categories,
  getCategoryStyle
}: AddMeetingDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="relative bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl p-7 flex flex-col border border-zinc-100 animate-in zoom-in-95 duration-200">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg cursor-pointer text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <X className="w-4 h-4" />
        </Button>
        <div className="text-left border-b border-solid border-zinc-100 pb-3">
          <h3 className="text-[19px] font-black text-zinc-800">
            회의록 작성
          </h3>
        </div>

        <form onSubmit={onConfirm} className="space-y-6 mt-6">
          <div className="space-y-5">
            {/* Date Row */}
            <div className="space-y-1.5">
              <div className="relative">
                <input
                  type="date"
                  required
                  value={addForm.date}
                  onChange={(e) => setAddForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl bg-zinc-50 text-[14px] font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            {/* Category Button Selection */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-3 gap-2">
                {categories.map(cat => {
                  const isSelected = addForm.category === cat;
                  const tagStyle = getCategoryStyle(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setAddForm(prev => ({ ...prev, category: cat }))}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all text-center cursor-pointer ${tagStyle} ${
                        isSelected 
                          ? 'scale-[1.02] ring-2 ring-zinc-400/35 opacity-100 shadow-sm'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <input
                type="text"
                required
                placeholder="회의 제목을 입력해 주세요."
                value={addForm.title}
                onChange={(e) => setAddForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl bg-zinc-50 text-[14px] font-normal focus:ring-1 focus:ring-primary focus:border-primary focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <textarea
                rows={6}
                placeholder="회의 내용을 작성해 주세요."
                value={addForm.content}
                onChange={(e) => setAddForm(prev => ({ ...prev, content: e.target.value }))}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl bg-zinc-50 text-[14px] font-normal leading-relaxed focus:ring-1 focus:ring-primary focus:border-primary focus:bg-white outline-none transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-zinc-100/80 hover:bg-zinc-200/80 text-zinc-500 font-bold border-none cursor-pointer"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-11 rounded-xl bg-blue-100/70 hover:bg-blue-200/70 text-primary font-extrabold shadow-lg shadow-blue-500/15 border border-solid border-white cursor-pointer"
            >
              {isSubmitting ? '등록 중...' : '등록'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// 2. 회의록 삭제 팝업 (모달)
// ----------------------------------------------------
interface DeleteMeetingDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  onConfirm: () => Promise<void>;
}

export function DeleteMeetingDialog({
  open,
  onClose,
  title,
  onConfirm
}: DeleteMeetingDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-[360px] shadow-2xl overflow-hidden border border-zinc-100 animate-in zoom-in-95 duration-200">
        <div className="p-8 text-center space-y-6">
          <div className="w-[54px] h-[54px] bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-[27px] h-[27px] text-red-500" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-extrabold text-foreground">회의록 삭제</h3>
            <p className="text-sm text-zinc-600 font-normal leading-relaxed">
              <span className="text-red-500 font-bold">'{title}'</span> 회의록을 <br />
              <span className="font-semibold text-zinc-750">영구 삭제하시겠습니까?</span>
            </p>
          </div>

          <div className="flex gap-3">
            <Button 
              type="button"
              className="flex-1 h-12 rounded-2xl bg-zinc-100/80 hover:bg-zinc-200/80 text-zinc-500 font-bold border-none cursor-pointer"
              onClick={onClose}
            >
              취소
            </Button>
            <Button 
              type="button"
              variant="destructive"
              className="flex-1 h-12 rounded-2xl font-extrabold shadow-lg shadow-red-500/15 cursor-pointer"
              onClick={onConfirm}
            >
              삭제
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
