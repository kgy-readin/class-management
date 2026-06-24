import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  UsersRound, 
  PenTool, 
  Archive, 
  Menu, 
  LayoutDashboard, 
  SquareCheckBig, 
  Sparkles, 
  ScrollText, 
  MessagesSquare, 
  BriefcaseBusiness,
  Star,
  MessageCircleWarning,
  Link
} from 'lucide-react';


const tabToPath: Record<string, string> = {
  dashboard: '/',
  students: '/students',
  writing: '/writing',
  tasks: '/tasks',
  logs: '/logs',
  meeting: '/meeting',
  comments: '/comments',
  beginners: '/beginners',
  familyLetter: '/newsletters',
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
      if (tab === 'familyLetter') {
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
      case 'comments': return 'Comments';
      case 'beginners': return 'Beginners';
      case 'familyLetter': return 'Newsletters';
      default: return 'Dashboard';
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: UsersRound },
    { id: 'writing', label: 'Writing', icon: PenTool },
    { id: 'logs', label: 'Logs', icon: Archive },
    { id: 'tasks', label: 'Tasks', icon: SquareCheckBig },
    { id: 'meeting', label: 'Meeting', icon: MessagesSquare },
    { id: 'comments', label: 'Comments', icon: MessageCircleWarning },
    { id: 'beginners', label: 'Beginners', icon: Sparkles },
    { id: 'familyLetter', label: 'Newsletters', icon: ScrollText },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/75 backdrop-blur-xl border-b border-zinc-200/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl relative">
        
        {/* Left side: Menu / Hammer button and floating menu */}
        <div className="flex items-center gap-2 relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="h-9 w-9 p-0 text-zinc-650 hover:text-zinc-900 hover:bg-zinc-100 rounded-full cursor-pointer transition-colors"
            title="Menu"
          >
            <Menu className="w-5.5 h-5.5" />
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
                  className="absolute left-0 top-11.5 z-[100] w-48 bg-white border border-zinc-200/75 rounded-2xl shadow-xl p-2 flex flex-col gap-0.5 mt-2 origin-top-left"
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
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] md:text-[14px] font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-zinc-50 text-primary font-semibold text-left'
                              : 'text-zinc-650 hover:bg-zinc-50 hover:text-zinc-900 text-left'
                          }`}
                        >
                          <Icon 
                            className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary' : 'text-zinc-400'}`} 
                            strokeWidth={item.id === 'familyLetter' ? 2.4 : undefined} 
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
