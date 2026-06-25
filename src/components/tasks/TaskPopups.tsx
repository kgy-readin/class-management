import React from 'react';
import { Button } from '@/components/ui/button';
import { X, ScrollText } from 'lucide-react';

interface ReserveTaskDialogProps {
  open: boolean;
  onClose: () => void;
  reservingTask: {
    name: string;
  } | null;
  onExecuteReserve: (type: '한달' | '정기') => Promise<void>;
}

export function ReserveTaskDialog({
  open,
  onClose,
  reservingTask,
  onExecuteReserve
}: ReserveTaskDialogProps) {
  if (!open || !reservingTask) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden w-full max-w-[360px] mx-4 animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600 p-1.5 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-8 text-center space-y-6">
          <div className="w-[51px] h-[51px] bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
            <ScrollText className="w-[25px] h-[25px] text-indigo-600" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-extrabold text-foreground">가정통신문 예약</h3>
            <p className="text-sm text-zinc-600 font-normal leading-relaxed">
              <span className="font-bold text-zinc-800">'{reservingTask.name}'</span> 학생의 <br />
              가정통신문을 예약하시겠습니까?
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => onExecuteReserve('한달')}
              className="h-12 text-xs md:text-sm font-extrabold bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-600/15 transition-colors cursor-pointer"
            >
              한달 (1개월 뒤)
            </Button>
            <Button
              onClick={() => onExecuteReserve('정기')}
              className="h-12 text-xs md:text-sm font-extrabold bg-violet-500 hover:bg-violet-600 text-white rounded-2xl shadow-lg shadow-violet-500/15 border-none transition-colors cursor-pointer"
            >
              정기 (5개월 뒤)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
