import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Pencil, 
  Check, 
  X,
  FileText
} from 'lucide-react';
import { noteApi } from '@/src/services/api';

interface MarkdownLine {
  text: string;
  level: number;
}

export default function NotesPanel() {
  // Parsing function
  const parseMarkdownToLines = (text: string): MarkdownLine[] => {
    if (!text) return [];
    const rawLines = text.split(/\r?\n/);
    const parsed: MarkdownLine[] = [];
    
    for (const line of rawLines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue; // Skip truly empty lines
      
      // Count leading '>' symbols (can have spaces around them)
      let count = 0;
      let index = 0;
      while (index < line.length) {
        const char = line[index];
        if (char === '>') {
          count++;
          index++;
        } else if (char === ' ' || char === '\t') {
          index++;
        } else {
          break;
        }
      }
      
      if (count > 0) {
        const restText = line.substring(index).trim();
        parsed.push({ text: restText, level: count });
      } else {
        parsed.push({ text: trimmedLine, level: 0 });
      }
    }
    return parsed;
  };

  // Immediate Load from cache
  const [rawText, setRawText] = useState<string>(() => {
    return localStorage.getItem('webapp_note_data_backup') || '';
  });
  const [lastSavedText, setLastSavedText] = useState<string>(() => {
    return localStorage.getItem('webapp_note_data_backup') || '';
  });
  const [notes, setNotes] = useState<MarkdownLine[]>(() => {
    const cached = localStorage.getItem('webapp_note_data_backup');
    return cached ? parseMarkdownToLines(cached) : [];
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchNotes = async (isBackground = false) => {
    const hasCache = !!rawText;
    
    try {
      if (!isBackground && !hasCache) {
        setLoading(true);
      } else if (isBackground) {
        // Run quietly
      }
      
      const text = await noteApi.getRawText();
      const normalizedRemote = text || '';
      const cachedText = localStorage.getItem('webapp_note_data_backup') || '';
      
      // Only update react state if there is an actual diff on remote
      if (normalizedRemote !== cachedText || !hasCache) {
        setRawText(normalizedRemote);
        setLastSavedText(normalizedRemote);
        setNotes(parseMarkdownToLines(normalizedRemote));
        localStorage.setItem('webapp_note_data_backup', normalizedRemote);
      }
    } catch (error: any) {
      console.warn('Background memo sync failed (Using local fallback):', error.message || error);
      // Fallback is already initialized in state, so we don't spam errors unless cache is empty
      if (!hasCache) {
        toast.error('메모 데이터를 불러오는데 실패했습니다: ' + error.message);
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
      setNotes(parseMarkdownToLines(rawText));
      setIsEditing(false);
      toast.success('메모가 성공적으로 저장되었습니다 (구글 드라이브 백업 완료).');
    } catch (e: any) {
      toast.error(
        `네트워크 저장 중 오류가 발생했습니다: ${e.message}. 작성한 메모는 브라우저 내에 안전하게 보존되었습니다 (취소하지 않는다면 세션 유지 가능).`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setRawText(lastSavedText);
    setIsEditing(false);
    toast.info('편집이 취소되고 마지막 저장된 상태로 되돌렸습니다.');
  };

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-border/40 flex-1 flex flex-col min-h-[245px] lg:min-h-0 max-lg:h-[300px] max-lg:min-h-[300px] max-lg:max-h-[300px]">
        
        {/* Header section with Notes title and edit button */}
        <div className="flex items-center justify-between pb-2 border-b border-border/40 mb-3 select-none">
          <div className="flex items-center gap-1.5">
            <h3 className="text-base font-semibold text-zinc-650">메모</h3>
            {loading && (
              <span className="text-[10px] text-zinc-400 animate-pulse font-sans">불러오는 중...</span>
            )}
          </div>
          
          {isEditing ? (
            <div className="flex items-center gap-1.5">
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
            <button
               onClick={() => setIsEditing(true)}
               className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors cursor-pointer"
               title="메모 전체 편집"
             >
               <Pencil className="w-3.5 h-3.5" />
             </button>
           )}
         </div>
 
         {/* Content Area */}
         {isEditing ? (
           /* Full Textarea Editing View */
           <div className="flex-1 flex flex-col gap-3 h-full min-h-[170px] lg:min-h-0">
             
             <textarea
               value={rawText}
               onChange={(e) => setRawText(e.target.value)}
               placeholder="여기에 생각이나 업무 관련 메모를 자유롭게 적어 보세요."
              className="flex-1 w-full min-h-[120px] lg:min-h-[200px] p-3 border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[14.5px] rounded-xl resize-none font-sans leading-relaxed text-zinc-700 bg-zinc-50/50 focus:bg-white transition-all custom-scrollbar"
              disabled={loading}
              autoFocus
            />
          </div>
        ) : (
          /* Normal List View */
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            <div className="flex-1 space-y-2.5 max-h-[210px] lg:max-h-none overflow-y-auto custom-scrollbar pr-1">
              {notes.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-400 bg-zinc-50/50 rounded-2xl border border-solid border-zinc-100 flex flex-col items-center justify-center gap-2 select-none">
                  <FileText className="w-8 h-8 text-zinc-300" />
                  <span>등록된 메모가 없습니다.</span>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-1 text-[11px] text-zinc-500 hover:text-zinc-900 hover:underline"
                  >
                    메모 작성 시작하기
                  </button>
                </div>
              ) : (
                <div className="space-y-2 font-normal pb-4 animate-in fade-in duration-200">
                  {notes.map((line, idx) => {
                    // Indentation level padding
                    let indentClass = "pl-0.5";
                    if (line.level === 1) indentClass = "pl-5";
                    if (line.level >= 2) indentClass = "pl-10";

                    // Text styling depending on level
                    const isParent = line.level === 0;
                    const textClass = isParent 
                      ? "text-[14.5px] leading-relaxed break-all whitespace-pre-line text-zinc-700 font-semibold"
                      : line.level === 1
                        ? "text-[14.5px] leading-relaxed break-all whitespace-pre-line text-zinc-600 font-normal"
                        : "text-[14.5px] leading-relaxed break-all whitespace-pre-line text-zinc-500 font-normal";

                    // Bullet icons / symbols
                    let bulletElement = (
                      <span className="text-[16px] text-zinc-805 text-zinc-800 font-bold leading-none select-none">
                        •
                      </span>
                    );
                    if (line.level === 1) {
                      bulletElement = (
                        <span className="text-[12px] text-zinc-500 font-bold leading-none select-none">
                          ◦
                        </span>
                      );
                    } else if (line.level >= 2) {
                      bulletElement = (
                        <span className="text-[8px] text-zinc-400 font-normal leading-none select-none">
                          ▪
                        </span>
                      );
                    }

                    return (
                      <div
                        key={idx}
                        className={`group relative flex items-start py-0.5 bg-white transition-colors ${indentClass}`}
                      >
                        <div className="h-5 w-4 flex items-center justify-center shrink-0 mr-3 select-none">
                          {bulletElement}
                        </div>
                        <div className="flex-1 overflow-hidden min-w-0 pr-0">
                          <p className={textClass}>
                            {line.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
