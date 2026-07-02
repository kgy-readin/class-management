import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MESSAGES } from '@/src/constants/messages';
import { 
  Pencil, 
  Check, 
  X,
  FileText,
  HelpCircle
} from 'lucide-react';
import { noteApi } from '@/src/services/api';
import MarkdownRenderer from '@/src/components/common/MarkdownRenderer';
import MarkdownGuidePopup from './MarkdownGuidePopup';

export default function NotesPanel() {
  // Immediate Load from cache
  const [rawText, setRawText] = useState<string>(() => {
    return localStorage.getItem('webapp_note_data_backup') || '';
  });
  const [lastSavedText, setLastSavedText] = useState<string>(() => {
    return localStorage.getItem('webapp_note_data_backup') || '';
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const fetchNotes = async (isBackground = false) => {
    const hasCache = !!rawText;
    
    try {
      if (!isBackground && !hasCache) {
        setLoading(true);
      }
      
      const text = await noteApi.getRawText();
      const normalizedRemote = text || '';
      const cachedText = localStorage.getItem('webapp_note_data_backup') || '';
      
      // Only update react state if there is an actual diff on remote
      if (normalizedRemote !== cachedText || !hasCache) {
        setRawText(normalizedRemote);
        setLastSavedText(normalizedRemote);
        localStorage.setItem('webapp_note_data_backup', normalizedRemote);
      }
    } catch (error: any) {
      console.warn('Background memo sync failed (Using local fallback):', error.message || error);
      if (!hasCache) {
        toast.error(MESSAGES.notes.loadError(error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Synchronize silently in the background on mount
    fetchNotes(true);
  }, []);

  const handleSaveAll = async () => {
    // Safety check: cache locally first before sending to prevent any data loss!
    localStorage.setItem('webapp_note_data_backup', rawText);
    
    try {
      setLoading(true);
      await noteApi.saveRawText(rawText);
      setLastSavedText(rawText);
      setIsEditing(false);
      toast.success(MESSAGES.notes.saveSuccess);
    } catch (e: any) {
      toast.error(MESSAGES.notes.saveError(e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setRawText(lastSavedText);
    setIsEditing(false);
    toast.info(MESSAGES.notes.cancelInfo);
  };

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border-none flex-1 flex flex-col min-h-[245px] lg:min-h-0 md:max-lg:min-h-0 md:max-lg:max-h-none md:max-lg:h-full max-md:h-auto max-md:min-h-0 max-md:max-h-none">
        
        {/* Header section with Notes title and edit/help buttons */}
        <div className="flex items-center justify-between pb-2 border-b border-border/40 mb-3 select-none">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-650">메모</h3>
            {loading && (
              <span className="text-[10px] text-zinc-400 animate-pulse font-sans">불러오는 중...</span>
            )}
          </div>
          
          {isEditing ? (
            <div className="flex items-center gap-1.5 relative -top-[1.5px]">
              <button
                onClick={() => setIsHelpOpen(true)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors cursor-pointer"
                title="마크다운 도움말"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors cursor-pointer"
                title="편집 취소"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleSaveAll}
                disabled={loading}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-800 text-white hover:bg-zinc-900 transition-colors cursor-pointer"
                title="편집 완료"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 relative -top-[1.5px]">
              <button
                onClick={() => setIsHelpOpen(true)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors cursor-pointer"
                title="마크다운 도움말"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors cursor-pointer"
                title="메모 전체 편집"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
 
        {/* Content Area */}
        {isEditing ? (
          /* Full Textarea Editing View */
          <div className="flex-1 flex flex-col gap-3 h-full min-h-[290px] lg:min-h-0">
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="여기에 생각이나 업무 관련 메모를 자유롭게 적어 보세요."
              className="flex-1 w-full min-h-[240px] lg:min-h-[400px] p-3 border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[14.5px] rounded-xl resize-none font-sans leading-relaxed text-zinc-700 bg-zinc-50/50 focus:bg-white transition-all custom-scrollbar"
              disabled={loading}
              autoFocus
            />
          </div>
        ) : (
          /* Normal Render View */
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1" style={{ paddingBottom: '4px' }}>
              {!rawText || !rawText.trim() ? (
                <div className="py-16 text-center text-xs text-zinc-400 bg-zinc-50/50 rounded-2xl border border-solid border-zinc-100 flex flex-col items-center justify-center gap-2 select-none">
                  <FileText className="w-8 h-8 text-zinc-300" />
                  <span>등록된 메모가 없습니다.</span>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-1 text-[11px] text-zinc-500 hover:text-zinc-900 hover:underline cursor-pointer"
                  >
                    메모 작성 시작하기
                  </button>
                </div>
              ) : (
                <div className="space-y-2 font-normal pb-0 animate-in fade-in duration-200 text-zinc-700 leading-relaxed" style={{ paddingBottom: '0px' }}>
                  <MarkdownRenderer text={rawText} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <MarkdownGuidePopup open={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
