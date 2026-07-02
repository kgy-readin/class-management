import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import StudentCombobox from '../common/StudentCombobox';

// ----------------------------------------------------
// 1. 교무기록 추가 팝업
// ----------------------------------------------------
interface AddLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: any[];
  addForm: {
    date: string;
    name: string;
    category: string;
    content: string;
  };
  setAddForm: React.Dispatch<React.SetStateAction<{
    date: string;
    name: string;
    category: string;
    content: string;
  }>>;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
  categories: string[];
  getCategoryTagStyle: (category: string) => string;
}

export function AddLogDialog({
  open,
  onOpenChange,
  students,
  addForm,
  setAddForm,
  onConfirm,
  isSubmitting,
  categories,
  getCategoryTagStyle
}: AddLogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] border-none shadow-2xl p-7 bg-white overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="space-y-6">
          {/* Popover Title */}
          <div className="text-left border-b border-solid border-zinc-100 pb-3">
            <h3 className="text-[19px] font-bold text-zinc-800">교무기록 추가</h3>
          </div>

          <div className="space-y-5">
            {/* Row: Date & Student side-by-side (병렬 배치) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <input
                  type="date"
                  className="w-full min-w-0 bg-zinc-50 border border-solid border-zinc-100 rounded-xl px-3 py-2.5 text-[14px] font-medium focus:ring-1 focus:ring-primary/20 hover:border-zinc-300 focus:bg-white outline-none transition-all cursor-pointer"
                  value={addForm.date}
                  onChange={e => setAddForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="min-w-0">
                <StudentCombobox
                  students={students}
                  value={addForm.name}
                  onChange={(val) => setAddForm(prev => ({ ...prev, name: val }))}
                  placeholder="학생명"
                  inputClassName="bg-zinc-50 border-solid border-zinc-100"
                />
              </div>
            </div>

            {/* Category selector in 3x3 Button Grid (3열 3행 배치) */}
            <div>
              <div className="grid grid-cols-3 gap-2">
                {categories.map(cat => {
                  const isSelected = addForm.category === cat;
                  const tagStyle = getCategoryTagStyle(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setAddForm(prev => ({ ...prev, category: cat }))}
                      className={`py-2 rounded-xl text-xs font-semibold transition-all text-center cursor-pointer ${tagStyle} ${
                        isSelected 
                          ? 'scale-102 ring-2 ring-zinc-400/35 opacity-100'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detail Content textarea */}
            <div>
              <textarea
                rows={4}
                placeholder="기록할 내용을 작성해 주세요."
                className="w-full bg-zinc-50 border border-solid border-zinc-100 rounded-lg px-4 py-3 text-[14px] font-normal leading-relaxed focus:ring-1 focus:ring-primary/20 hover:border-zinc-300 focus:bg-white outline-none transition-all resize-none"
                value={addForm.content}
                onChange={e => setAddForm(prev => ({ ...prev, content: e.target.value }))}
              />
            </div>
          </div>

          {/* Save and Cancel buttons */}
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
              className="flex-1 h-11 rounded-xl bg-blue-100/70 hover:bg-blue-200/70 text-primary font-bold shadow-lg shadow-blue-500/15 border border-solid border-white cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------
// 2. 교무기록 삭제 확인 팝업
// ----------------------------------------------------
interface DeleteLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deletingItem: {
    name: string;
    category: string;
  } | null;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
}

export function DeleteLogDialog({
  open,
  onOpenChange,
  deletingItem,
  onConfirm,
  isSubmitting
}: DeleteLogDialogProps) {
  if (!deletingItem) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white animate-in fade-in zoom-in-95 duration-250">
        <div className="p-8 text-center space-y-6">
          <div className="w-[54px] h-[54px] bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-[27px] h-[27px] text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">교무기록 삭제</h3>
            <p className="text-sm text-zinc-600 font-normal leading-relaxed">
              <span className="text-destructive font-bold">'{deletingItem.name}'</span> 학생의 <br />
              <span className="font-semibold text-zinc-750">'{deletingItem.category}'</span> 기록을 삭제하시겠습니까?
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
