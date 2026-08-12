import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  UsersRound, 
  Feather,
  Archive, 
  Menu, 
  LayoutDashboard, 
  SquareCheckBig, 
  Sparkles, 
  ScrollText, 
  MessagesSquare, 
  BriefcaseBusiness,
  Star,
  AtSign,
  Link,
  Heart,
  FileText,
  Pencil,
  Loader2,
  X,
  Check
} from 'lucide-react';
import { noteApi } from '@/src/services/api';
import MarkdownRenderer from '@/src/components/common/MarkdownRenderer';


const tabToPath: Record<string, string> = {
  dashboard: '/',
  students: '/students',
  writing: '/writing',
  tasks: '/tasks',
  logs: '/logs',
  meeting: '/meeting',
  noticeForm: '/noticeform',
  beginners: '/beginners',
  familyLetters: '/familyletters',
};

interface TopBarProps {
  activeTab: string;
  appMode: 'sub' | 'class' | 'work';
  onSelectTab: (tab: string) => void;
  onModeChange: (mode: 'sub' | 'class' | 'work') => void;
  onSetSelectedStudent: (student: string | null) => void;
}

export default function TopBar({
  activeTab,
  appMode,
  onSelectTab,
  onModeChange,
  onSetSelectedStudent
}: TopBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [memoText, setMemoText] = useState<string>(() => {
    return localStorage.getItem('webapp_note_data_backup') || '';
  });
  const [loadingMemo, setLoadingMemo] = useState(false);
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [isSavingMemo, setIsSavingMemo] = useState(false);

  const fetchMemo = async () => {
    const cached = localStorage.getItem('webapp_note_data_backup') || '';
    if (cached) setMemoText(cached);
    try {
      if (!cached) setLoadingMemo(true);
      const remote = await noteApi.getRawText();
      const val = remote || '';
      if (val || !cached) {
        setMemoText(val);
        if (val) {
          localStorage.setItem('webapp_note_data_backup', val);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch memo in TopBar popover:', e);
      const fallback = localStorage.getItem('webapp_note_data_backup') || '';
      if (fallback) setMemoText(fallback);
    } finally {
      setLoadingMemo(false);
    }
  };

  const handleSaveMemo = async () => {
    setIsSavingMemo(true);
    try {
      const textToSave = editingText;
      await noteApi.saveRawText(textToSave);
      setMemoText(textToSave);
      localStorage.setItem('webapp_note_data_backup', textToSave);
      setIsEditingMemo(false);
      toast.success('메모가 저장되었습니다.');
    } catch (e: any) {
      console.error('Failed to save memo in popover:', e);
      toast.error(`메모 저장 실패: ${e.message || e}`);
    } finally {
      setIsSavingMemo(false);
    }
  };

  const navigate = useNavigate();
  const location = useLocation();

  const handleTitleClick = () => {
    onSetSelectedStudent(null);
    const basePath = tabToPath[activeTab] || '/';
    navigate(basePath);
  };

  const getRawQuickLink = (tab: string): string => {
    try {
      if (tab === 'tasks') {
        return (
          process.env.QUICK_TASKS_LINK || 
          import.meta.env.VITE_QUICK_TASKS_LINK || 
          import.meta.env.VITE_GOOGLE_SHEETS_ID || 
          ''
        );
      }
      if (tab === 'writing') {
        return (
          process.env.QUICK_WRITING_LINK || 
          import.meta.env.VITE_QUICK_WRITING_LINK || 
          import.meta.env.VITE_GOOGLE_DOCS_ID || 
          ''
        );
      }
      if (tab === 'familyLetters') {
        return (
          process.env.QUICK_NEWSLETTERS_LINK || 
          import.meta.env.VITE_QUICK_NEWSLETTERS_LINK || 
          import.meta.env.VITE_RPN_DOCS_ID || 
          ''
        );
      }
      if (tab === 'meeting') {
        return (
          process.env.QUICK_MEETING_LINK || 
          import.meta.env.VITE_QUICK_MEETING_LINK || 
          import.meta.env.VITE_GOOGLE_DOCS_ID || 
          ''
        );
      }
    } catch (e) {
      console.error(e);
    }
    return '';
  };

  const formatQuickLink = (link: string, tab: string): string => {
    if (!link) return '';
    const trimmed = link.trim();
    if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === '""' || trimmed === "''") {
      return '';
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.includes('.') && !trimmed.startsWith('/') && !trimmed.startsWith('.')) {
      return `https://${trimmed}`;
    }
    if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) {
      if (tab === 'tasks') {
        return `https://docs.google.com/spreadsheets/d/${trimmed}/edit`;
      } else {
        return `https://docs.google.com/document/d/${trimmed}/edit`;
      }
    }
    return trimmed;
  };

  const quickLinkUrl = formatQuickLink(getRawQuickLink(activeTab), activeTab);

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Dashboard';
      case 'students': return 'Students';
      case 'writing': return 'Writing';
      case 'tasks': return 'Tasks';
      case 'logs': return 'Logs';
      case 'meeting': return 'Meeting';
      case 'noticeForm': return 'Notice Form';
      case 'beginners': return 'Beginners';
      case 'familyLetters': return 'Family Letters';
      default: return 'Dashboard';
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: UsersRound },
    { id: 'writing', label: 'Writing', icon: Feather },
    { id: 'logs', label: 'Logs', icon: Archive },
    { id: 'tasks', label: 'Tasks', icon: SquareCheckBig },
    { id: 'meeting', label: 'Meeting', icon: MessagesSquare },
    { id: 'noticeForm', label: 'Notice Form', icon: AtSign },
    { id: 'beginners', label: 'Beginners', icon: Sparkles },
    { id: 'familyLetters', label: 'Family Letters', icon: ScrollText },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/75 backdrop-blur-xl shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl relative">
        
        {/* Left side: Menu / Bookmark buttons and floating menus */}
        <div className="flex items-center gap-2 relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsMenuOpen(!isMenuOpen);
              if (isMemoOpen) setIsMemoOpen(false);
            }}
            className="h-9 w-9 p-0 text-zinc-650 hover:text-zinc-900 hover:bg-zinc-100 rounded-full cursor-pointer transition-colors"
            title="Menu"
          >
            <Menu className="w-5.5 h-5.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const nextState = !isMemoOpen;
              setIsMemoOpen(nextState);
              if (!nextState) setIsEditingMemo(false);
              if (isMenuOpen) setIsMenuOpen(false);
              if (nextState) {
                fetchMemo();
              }
            }}
            className="h-9 w-9 p-0 text-zinc-650 hover:text-zinc-900 hover:bg-zinc-100 rounded-full cursor-pointer transition-colors"
            title="메모"
          >
            <Heart className="w-5 h-5" />
          </Button>

          {/* Left-aligned page title for mobile portrait screens (8px gap is automatically provided by parent's gap-2) */}
          <button 
            onClick={handleTitleClick}
            className="hidden portrait:max-sm:block text-[16px] font-semibold text-zinc-800 hover:text-zinc-500 select-none transition-colors cursor-pointer tracking-tight"
            title="새로고침"
          >
            {getPageTitle(activeTab)}
          </button>

          {/* Floating speech bubble menu (Dropdown/Popover style) */}
          <AnimatePresence>
            {isMenuOpen && (
              <>
                {/* Invisible Backdrop to capture clicks and close menu */}
                <div 
                  className="fixed inset-0 z-[99] bg-transparent cursor-default" 
                  onClick={() => setIsMenuOpen(false)}
                />

                {/* Popover Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.88, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.88, y: -10 }}
                  transition={{ type: 'spring', damping: 18, stiffness: 240 }}
                  className="absolute left-0 top-11.5 z-[100] w-44 bg-white border border-neutral-100 rounded-xl shadow-xl p-2 flex flex-col gap-0.5 mt-2 origin-top-left"
                >
                  <div className="relative z-10 flex flex-col">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      const isSelected = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onSelectTab(item.id);
                            onSetSelectedStudent(null);
                            setIsMenuOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] md:text-[14px] font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-zinc-50 text-primary font-semibold text-left'
                              : 'text-zinc-650 hover:bg-zinc-50 hover:text-zinc-900 text-left'
                          }`}
                        >
                          <Icon 
                            className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary' : 'text-zinc-400'}`} 
                            strokeWidth={item.id === 'familyLetters' ? 2.4 : undefined} 
                          />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Floating Memo Popover */}
          <AnimatePresence>
            {isMemoOpen && (
              <>
                {/* Invisible Backdrop to capture clicks and close memo popover */}
                <div 
                  className="fixed inset-0 z-[99] bg-transparent cursor-default" 
                  onClick={() => {
                    setIsMemoOpen(false);
                    setIsEditingMemo(false);
                  }}
                />

                {/* Popover Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.88, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.88, y: -10 }}
                  transition={{ type: 'spring', damping: 18, stiffness: 240 }}
                  className="absolute left-11 top-11.5 origin-top-left w-88 portrait:max-sm:fixed portrait:max-sm:left-1/2 portrait:max-sm:-translate-x-1/2 portrait:max-sm:top-16 portrait:max-sm:mt-1 portrait:max-sm:origin-top portrait:max-sm:w-84 portrait:max-sm:h-88 portrait:max-sm:max-h-88 max-w-[calc(100vw-2rem)] z-[100] bg-white border border-neutral-100 rounded-xl shadow-xl p-4 mt-2 min-h-40 max-h-[70vh] flex flex-col"
                >
                  <div className="relative z-10 flex flex-col h-full min-h-0">
                    {/* Header - Fixed */}
                    <div className="flex items-center justify-between pb-2 mb-[2px] border-b border-border/40 select-none shrink-0">
                      <span className="text-[15px] font-semibold text-zinc-800 pl-[4px]">
                        메모
                      </span>
                      {isEditingMemo ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isSavingMemo}
                            onClick={() => setIsEditingMemo(false)}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors cursor-pointer"
                            title="편집 취소"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isSavingMemo}
                            onClick={handleSaveMemo}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-800 text-white hover:bg-zinc-900 transition-colors cursor-pointer"
                            title="편집 완료"
                          >
                            {isSavingMemo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingText(memoText);
                            setIsEditingMemo(true);
                          }}
                          className="text-neutral-400 hover:text-zinc-700 transition-colors cursor-pointer p-1 rounded-md hover:bg-neutral-50 flex items-center justify-center"
                          title="메모 수정"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Body - Scrollable */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pr-0.5 pt-[10px] -mb-2">
                      {isEditingMemo ? (
                        <div className="flex flex-col h-full min-h-[160px]">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            placeholder="메모를 입력하세요..."
                            className="w-full h-full min-h-[180px] p-2.5 text-[14px] text-zinc-800 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:bg-white resize-y font-normal custom-scrollbar"
                            autoFocus
                          />
                        </div>
                      ) : loadingMemo && !memoText ? (
                        <div className="py-6 text-center text-xs text-zinc-400 select-none">
                          <span>불러오는 중...</span>
                        </div>
                      ) : !memoText || !memoText.trim() ? (
                        <div className="py-6 text-center text-xs text-zinc-400 flex flex-col items-center justify-center gap-2 select-none">
                          <FileText className="w-6 h-6 text-zinc-300" />
                          <span>등록된 메모가 없습니다.</span>
                        </div>
                      ) : (
                        <div className="space-y-2 font-normal text-zinc-700 leading-relaxed text-[14px]">
                          <MarkdownRenderer text={memoText} />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        
        {/* Center: English page name with reload functionality */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center portrait:max-sm:hidden">
          <button 
            onClick={handleTitleClick}
            className="text-[16px] font-medium text-zinc-800 hover:text-zinc-500 select-none transition-colors cursor-pointer tracking-tight"
            title="새로고침"
          >
            {getPageTitle(activeTab)}
          </button>
        </div>

        {/* Right side: Mode toggles aligned to the right */}
        <div className="flex items-center gap-3">
          {quickLinkUrl && (
            <a
              href={quickLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-zinc-250 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-blue-600 cursor-pointer transition-all shadow-sm shrink-0"
              title="바로가기 링크 열기"
            >
              <Link className="w-4 h-4" />
            </a>
          )}

          {/* Toggle controls - icon only with sliding spring animation indicator (Integer pixel-aligned to prevent blurring) */}
          <div className="relative bg-zinc-100/85 p-0.5 rounded-full flex items-center border border-zinc-200/30 w-[138px] h-8 shadow-inner select-none">
            {/* Sliding backdrop indicator pill (uses standard CSS transitions to avoid GPU text subpixel blurring) */}
            <div
              className="absolute bg-white rounded-full shadow-sm transition-all duration-300 [transition-timing-function:cubic-bezier(0.25,1,0.5,1)]"
              style={{
                top: '2px',
                bottom: '2px',
                width: '44px',
                left: appMode === 'sub' ? '2px' : appMode === 'class' ? '46px' : '90px',
              }}
            />
            
            <button
              type="button"
              onClick={() => onModeChange('sub')}
              className={`relative rounded-full w-11 h-7 flex items-center justify-center transition-colors duration-200 cursor-pointer z-10 ${
                appMode === 'sub' 
                  ? 'text-primary font-semibold' 
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title="보조모드"
            >
              <Star className="w-4.5 h-4.5" />
            </button>
 
            <button
              type="button"
              onClick={() => onModeChange('class')}
              className={`relative rounded-full w-11 h-7 flex items-center justify-center transition-colors duration-200 cursor-pointer z-10 ${
                appMode === 'class' 
                  ? 'text-primary font-semibold' 
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title="수업모드"
            >
              <BookOpen className="w-4.5 h-4.5" />
            </button>
 
            <button
              type="button"
              onClick={() => onModeChange('work')}
              className={`relative rounded-full w-11 h-7 flex items-center justify-center transition-colors duration-200 cursor-pointer z-10 ${
                appMode === 'work' 
                  ? 'text-primary font-semibold' 
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
              title="업무모드"
            >
              <BriefcaseBusiness className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
