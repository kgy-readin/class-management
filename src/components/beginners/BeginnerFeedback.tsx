import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MESSAGES } from '@/src/constants/messages';
import { 
  FileText, 
  Search, 
  RefreshCw,
  Check,
  Pencil,
  Save,
  X,
  Copy,
  User,
  Pilcrow,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { beginnerFeedbackApi } from '@/src/services/api';
import MarkdownRenderer, { stripMarkdown } from '../common/MarkdownRenderer';
import { getShortHash } from '../../types';

interface BeginnerItem {
  bookTitle: string;
  difficulty: string;
  content: string;
}

const MERGED_DIFFICULTY_ORDER = ['최상-상', '중상', '중', '중하', '하-최하'];

function getGroupedDifficulty(rawDiff: string): string {
  const norm = (rawDiff || '').trim();
  if (norm === '최상' || norm === '상') {
    return '최상-상';
  }
  if (norm === '하' || norm === '최하') {
    return '하-최하';
  }
  if (!norm) {
    return '미분류';
  }
  return norm;
}

export default function BeginnerFeedback() {
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState<BeginnerItem[]>(() => {
    const cached = localStorage.getItem('webapp_beginner_feedback_backup');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed) ? parsed.map((item: any) => ({
          bookTitle: String(item.bookTitle || '').trim(),
          difficulty: String(item.difficulty || '').trim(),
          content: String(item.content || '').trim()
        })) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookTitle, setSelectedBookTitle] = useState<string | null>(null);
  const [copiedBookTitle, setCopiedBookTitle] = useState<string | null>(null);

  // Replacement State
  const [nameInput, setNameInput] = useState('');
  const [replacementName, setReplacementName] = useState('');

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  const selectedItem = items.find(item => item.bookTitle === selectedBookTitle);

  // Sync selection from URL path with high reliability
  useEffect(() => {
    const pathname = location.pathname;
    if (!pathname.startsWith('/beginners')) return;

    const parts = pathname.split('/').filter(Boolean); // ["beginners", "hash"]
    if (parts[1]) {
      const matched = items.find(item => getShortHash(item.bookTitle) === parts[1]);
      if (matched) {
        if (selectedBookTitle !== matched.bookTitle) {
          setSelectedBookTitle(matched.bookTitle);
        }
        // Auto-expand folder of selected item
        const diffKey = getGroupedDifficulty(matched.difficulty);
        setExpandedFolders(prev => {
          if (!prev[diffKey]) {
            return { ...prev, [diffKey]: true };
          }
          return prev;
        });
        return;
      }
    } else {
      setSelectedBookTitle(null);
    }
  }, [location.pathname, items]);

  // Update editText whenever selected item changes
  useEffect(() => {
    if (selectedItem) {
      setEditText(selectedItem.content || '');
    }
    setIsEditing(false);
  }, [selectedBookTitle]);

  const fetchBeginnerFeedback = async (isBackground = false) => {
    const hasCache = items.length > 0;
    try {
      if (!isBackground && !hasCache) {
        setLoading(true);
      }
      const data = await beginnerFeedbackApi.get();
      if (data && data.length > 0) {
        setItems(data);
        localStorage.setItem('webapp_beginner_feedback_backup', JSON.stringify(data));
      }
    } catch (error: any) {
      console.error('Failed to load beginner feedback:', error);
      if (!hasCache) {
        toast.error(MESSAGES.beginners.loadError(error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeginnerFeedback(true); // background sync on mount
  }, []);

  const handleApplyReplacement = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setReplacementName(nameInput.trim());
    if (nameInput.trim()) {
      toast.success(MESSAGES.beginners.replacementSuccess(nameInput.trim()));
    } else {
      toast.info(MESSAGES.beginners.replacementReset);
    }
  };

  const handleCopy = async (bookTitle: string, rawText: string) => {
    try {
      // Substitute first, then strip markdown
      const substituted = replacementName 
        ? rawText.replaceAll('●●', replacementName) 
        : rawText;
      const cleanText = stripMarkdown(substituted);

      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cleanText);
        setCopiedBookTitle(bookTitle);
        toast.success(MESSAGES.general.copySuccess);
        setTimeout(() => setCopiedBookTitle(null), 2000);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = cleanText;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedBookTitle(bookTitle);
        toast.success(MESSAGES.general.copySuccess);
        setTimeout(() => setCopiedBookTitle(null), 2000);
      }
    } catch (err) {
      toast.error(MESSAGES.general.copyFailure);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedBookTitle) return;

    // Optimistically update local state first
    const updatedItems = items.map(item => {
      if (item.bookTitle === selectedBookTitle) {
        return { ...item, content: editText };
      }
      return item;
    });
    setItems(updatedItems);
    localStorage.setItem('webapp_beginner_feedback_backup', JSON.stringify(updatedItems));
    setIsEditing(false);

    try {
      setSavingItem(true);
      await beginnerFeedbackApi.update(selectedBookTitle, {
        bookTitle: selectedBookTitle,
        difficulty: selectedItem?.difficulty || '',
        content: editText
      });
      toast.success(MESSAGES.beginners.saveSuccess);
    } catch (error: any) {
      console.error('beginnerFeedbackApi.update Failed:', error);
      toast.error(MESSAGES.beginners.saveError(error.message), {
        duration: 6000
      });
    } finally {
      setSavingItem(false);
    }
  };

  // Filter items based on book title only
  const filteredItems = items.filter(item => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return item.bookTitle.toLowerCase().includes(query);
  });

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (difficulty: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [difficulty]: !prev[difficulty]
    }));
  };

  const groupedByDifficulty = React.useMemo(() => {
    const groups: Record<string, BeginnerItem[]> = {};
    
    filteredItems.forEach(item => {
      const groupKey = getGroupedDifficulty(item.difficulty);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
    });

    const otherKeys = Object.keys(groups).filter(key => !MERGED_DIFFICULTY_ORDER.includes(key) && key !== '미분류');
    const finalKeys = [
      ...MERGED_DIFFICULTY_ORDER.filter(key => groups[key] && groups[key].length > 0),
      ...otherKeys,
      ...(groups['미분류'] && groups['미분류'].length > 0 ? ['미분류'] : [])
    ];

    return finalKeys.map(key => ({
      difficulty: key,
      items: groups[key]
    }));
  }, [filteredItems]);

  // Apply replacement for rendering
  const getRenderText = (rawText: string) => {
    if (!replacementName) return rawText;
    return rawText.replaceAll('●●', replacementName);
  };

  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col gap-1 select-none md:select-text">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[500px]">
        {/* Left Side: Directory Sidebar */}
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border-none flex flex-col gap-4 h-[650px] max-lg:h-auto max-lg:min-h-[350px]">
          
          {/* Name Input Box (텍스트 대치) */}
          <div className="bg-zinc-50 border border-solid border-zinc-200 p-3 rounded-2xl flex items-center gap-2.5">
            <User className="w-5 h-5 text-zinc-500 shrink-0 ml-1" />
            <form onSubmit={handleApplyReplacement} className="flex-1 flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="텍스트 대치할 학생 이름을 입력..."
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-[13px] md:text-[14px] rounded-xl bg-white hover:border-zinc-300 transition-all font-medium"
                />
                {nameInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setNameInput('');
                      setReplacementName('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button
                type="submit"
                size="sm"
                className="bg-zinc-50 hover:bg-zinc-100 border border-solid border-zinc-200/60 hover:border-zinc-300 text-zinc-500 hover:text-zinc-700 font-medium px-4 h-[38px] rounded-xl shadow-sm text-[13px] cursor-pointer shrink-0 transition-all"
              >
                대치
              </Button>
            </form>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400" />
            <input
              type="text"
              placeholder="도서명 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[13px] md:text-[15px] rounded-xl bg-zinc-50 hover:border-zinc-300 focus:bg-white transition-all"
            />
          </div>

          {/* Book Lists */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1 max-lg:max-h-[250px]">
            {groupedByDifficulty.length === 0 ? (
              <div className="py-20 text-center text-[13px] md:text-[15px] text-neutral-400 flex flex-col items-center justify-center gap-2">
                <FileText className="w-9 h-9 text-neutral-300" />
                <span>검색 결과가 없거나 기초첨삭 데이터가 존재하지 않습니다.</span>
              </div>
            ) : (
              groupedByDifficulty.map(({ difficulty, items: folderItems }) => {
                const isExpanded = searchQuery.trim() !== '' ? true : !!expandedFolders[difficulty];
                return (
                  <div key={difficulty} className="space-y-1">
                    {/* Folder Header */}
                    <div 
                      onClick={() => toggleFolder(difficulty)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f6f7f9] cursor-pointer transition-colors text-neutral-700"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isExpanded ? (
                          <FolderOpen className="w-4.5 h-4.5 text-primary shrink-0" />
                        ) : (
                          <Folder className="w-4.5 h-4.5 text-zinc-500 shrink-0" />
                        )}
                        <span className="font-semibold text-[13px] md:text-[15px] truncate text-zinc-800">
                          {difficulty}
                        </span>
                        <span className="text-[11px] md:text-[13px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full font-mono shrink-0">
                          {folderItems.length}
                        </span>
                      </div>
                      <div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>
                    </div>

                    {/* Folder Items */}
                    {isExpanded && (
                      <div className="pl-4 border-l border-neutral-100 ml-4.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        {folderItems.map((item) => {
                          const isSelected = selectedBookTitle === item.bookTitle;
                          return (
                            <div
                              key={item.bookTitle}
                              onClick={() => navigate(`/beginners/${getShortHash(item.bookTitle)}`)}
                              className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all text-[13px] md:text-[15px] ${
                                isSelected 
                                  ? 'bg-zinc-50 text-primary font-semibold' 
                                  : 'text-zinc-800 hover:bg-zinc-50 hover:text-zinc-800'
                              }`}
                            >
                              <Pilcrow className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary' : 'text-zinc-500'}`} />
                              <span className="truncate flex-1" title={item.bookTitle}>{item.bookTitle}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Tab Document Content Display */}
        <div className="flex flex-col bg-white rounded-[2rem] p-6 shadow-sm border-none lg:h-[650px] h-auto min-h-0 w-full">
          {selectedItem ? (
            <div className="flex-1 flex flex-col min-h-0 h-full">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-4 select-none shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Pilcrow className="w-4.5 h-4.5 text-primary shrink-0 ml-1" />
                  <h2 className="text-[14px] md:text-[16px] lg:text-[18px] font-semibold text-gray-800 truncate" title={selectedItem.bookTitle}>
                    {selectedItem.bookTitle}
                  </h2>
                </div>
                
                {/* Action Buttons: Copy, Edit, Sync */}
                <div className="flex items-center gap-1 shrink-0">
                  {isEditing ? (
                    <>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={handleSaveEdit}
                        disabled={savingItem}
                        className="rounded-full w-8 h-8 hover:bg-blue-50 text-blue-600 hover:text-blue-700 cursor-pointer animate-in fade-in duration-200"
                        title="시트에 저장"
                      >
                        <Save className="w-4.5 h-4.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setIsEditing(false);
                          setEditText(selectedItem.content || '');
                        }}
                        disabled={savingItem}
                        className="rounded-full w-8 h-8 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 cursor-pointer animate-in fade-in duration-200"
                        title="취소"
                      >
                        <X className="w-4.5 h-4.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Substituted Copy to Clipboard */}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopy(selectedItem.bookTitle, selectedItem.content)}
                        disabled={!selectedItem.content}
                        className={`rounded-full w-8 h-8 cursor-pointer transition-all ${
                          copiedBookTitle === selectedItem.bookTitle 
                          ? 'bg-teal-500 hover:bg-teal-600 text-white animate-in zoom-in-75 duration-150' 
                          : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800'
                        }`}
                        title="복사하기 (●● 대치 적용)"
                      >
                        {copiedBookTitle === selectedItem.bookTitle ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
  
                      {/* Edit Content */}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsEditing(true)}
                        className="rounded-full w-8 h-8 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 cursor-pointer"
                        title="내용 수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
  
                      {/* Sync */}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => fetchBeginnerFeedback(false)}
                        disabled={loading}
                        className="rounded-full w-8 h-8 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 cursor-pointer"
                        title="기초첨삭 구글시트 동기화"
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
  
              {/* Text Area Content Display with replacements */}
              <div className="flex-1 min-h-0 flex flex-col">
                {isEditing ? (
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    disabled={savingItem}
                    className="w-full flex-1 min-h-[500px] lg:min-h-0 h-full p-5 border border-primary/20 bg-[#fafaff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary rounded-md leading-[1.8] text-neutral-700 text-[14px] md:text-[18px] font-sans resize-none"
                    placeholder="내용을 수정해 주세요..."
                  />
                ) : selectedItem.content ? (
                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-neutral-50/45 border border-neutral-100 rounded-md p-5 leading-[1.8] text-zinc-650 text-[14px] md:text-[18px] font-sans selection:bg-primary/10">
                    <div className="select-text selection:bg-primary/20">
                      <MarkdownRenderer text={getRenderText(selectedItem.content)} />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 border border-neutral-100 rounded-md p-5 bg-neutral-50/45 flex flex-col items-center justify-center text-center text-[14px] md:text-[18px] text-neutral-400 select-none">
                    <FileText className="w-9 h-9 text-neutral-300 mb-2" />
                    <span>본문 문구내용이 비어있습니다.</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 py-40 text-center flex flex-col items-center justify-center gap-2 select-none">
              <Pilcrow className="w-11 h-11 text-neutral-300" />
              <span className="text-[16px] font-medium text-[#64666e]">조회할 기초첨삭 도서를 선택해 주세요.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
