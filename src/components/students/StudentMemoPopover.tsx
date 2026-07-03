import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquareMore, MessageSquareText, Pencil, Check, X, Loader2, Save } from 'lucide-react';
import { Student } from '../../types';
import { studentApi } from '../../services/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface StudentMemoPopoverProps {
  student: Student;
  onRefresh?: () => void;
  iconOnly?: boolean;
  onlyIfNotEmpty?: boolean;
  iconColorClass?: string;
  className?: string;
  buttonClassName?: string;
  iconSizeClass?: string;
}

export default function StudentMemoPopover({
  student,
  onRefresh,
  iconOnly = false,
  onlyIfNotEmpty = false,
  iconColorClass,
  className = '',
  buttonClassName,
  iconSizeClass,
}: StudentMemoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [memoText, setMemoText] = useState(student.studentMemo || '');
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const hasMemo = !!(student.studentMemo && student.studentMemo.trim());

  // If we only show when there is a memo, and there is none, return null
  if (onlyIfNotEmpty && !hasMemo) {
    return null;
  }

  // Update internal memo state if student prop changes
  useEffect(() => {
    setMemoText(student.studentMemo || '');
  }, [student.studentMemo]);

  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverWidth = 240; // Always assume 240px (w-60) width to prevent flickering on mode change
      const minMargin = 16;
      const screenWidth = window.innerWidth;
      
      // Default: align right edge of popover with right edge of button
      let left = rect.right - popoverWidth + window.scrollX;
      const maxLeft = screenWidth - popoverWidth - minMargin + window.scrollX;
      const minLeft = minMargin + window.scrollX;
      
      if (left > maxLeft) left = maxLeft;
      if (left < minLeft) left = minLeft;
      
      setCoords({
        top: rect.bottom + window.scrollY + 8,
        left: left,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      const timer = setTimeout(updateCoords, 0);
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('scroll', updateCoords, true);
      };
    }
  }, [isOpen]);

  // Click outside to close handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInsideButton = containerRef.current && containerRef.current.contains(target);
      const clickedInsidePopover = popoverRef.current && popoverRef.current.contains(target);
      
      if (!clickedInsideButton && !clickedInsidePopover) {
        setIsOpen(false);
        setIsEditing(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
    setIsEditing(false);
    setMemoText(student.studentMemo || '');
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    try {
      await studentApi.update(student.name, { studentMemo: memoText });
      toast.success(`${student.name} 학생의 메모를 저장했습니다.`);
      setIsOpen(false);
      setIsEditing(false);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      toast.error('메모 저장에 실패했습니다: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMemoText(student.studentMemo || '');
    setIsEditing(false);
  };

  // Determine button/icon style
  // Active "등원" color is text-primary
  // Gray is text-muted-foreground or text-neutral-400
  const buttonStyle = buttonClassName || (iconOnly
    ? `${iconColorClass || (hasMemo ? 'text-primary' : 'text-neutral-400')} hover:scale-105 transition-transform cursor-pointer`
    : hasMemo
    ? 'rounded-xl w-11 h-11 text-primary hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center'
    : 'rounded-xl w-11 h-11 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all cursor-pointer flex items-center justify-center');

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      {iconOnly ? (
        <button
          ref={buttonRef}
          type="button"
          onClick={handleToggle}
          className={buttonStyle}
          title={`${student.name} 학생 메모`}
        >
          {hasMemo ? (
            <MessageSquareText className={iconSizeClass || "w-5 h-5"} />
          ) : (
            <MessageSquareMore className={iconSizeClass || "w-5 h-5"} />
          )}
        </button>
      ) : (
        <Button
          ref={buttonRef as any}
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleToggle}
          className={buttonStyle}
          title={`${student.name} 학생 메모`}
        >
          {hasMemo ? (
            <MessageSquareText className={iconSizeClass || "w-5 h-5 stroke-[2.2]"} />
          ) : (
            <MessageSquareMore className={iconSizeClass || "w-5 h-5"} />
          )}
        </Button>
      )}

      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={popoverRef}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
              }}
              className="z-[9999] bg-white rounded-lg shadow-xl border border-neutral-100 p-4 text-left cursor-default select-none w-60 max-w-[calc(100vw-2rem)]"
              onClick={(e) => e.stopPropagation()}
            >
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[13px] font-bold text-neutral-700">
                      {student.name} 메모
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer p-1 rounded-md hover:bg-neutral-50 flex items-center justify-center"
                        title="취소"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="text-neutral-400 hover:text-primary transition-colors cursor-pointer p-1 rounded-md hover:bg-neutral-50 flex items-center justify-center"
                        title="저장"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={memoText}
                    onChange={(e) => setMemoText(e.target.value)}
                    className="w-full h-24 p-3 bg-neutral-50 border border-neutral-200 rounded-sm text-[13px] text-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 resize-none"
                    placeholder="학생에 대한 특이사항이나 메모를 입력하세요."
                    autoFocus
                  />
                </div>
              ) : (
                <div className="relative pr-6">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                    className="absolute -top-1 -right-1 text-neutral-400 hover:text-primary transition-colors cursor-pointer p-1 rounded-md hover:bg-neutral-50"
                    title="메모 수정"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <div className="text-[13px] text-neutral-600 leading-relaxed whitespace-pre-wrap">
                    {hasMemo ? (
                      student.studentMemo
                    ) : (
                      <span className="text-neutral-400 italic">메모가 비어 있습니다.</span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
