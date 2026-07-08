import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MESSAGES } from '@/src/constants/messages';
import { 
  MessagesSquare,
  Search, 
  RefreshCw,
  Check,
  Pencil,
  Save,
  X,
  Copy,
  Plus,
  Trash2,
  Calendar,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  FileText
} from 'lucide-react';
import { meetingNoteApi } from '@/src/services/api';
import { MeetingNote as MeetingNoteType, getTagColor } from '@/src/types';
import MarkdownRenderer, { stripMarkdown } from '../common/MarkdownRenderer';
import { AddMeetingDialog, DeleteMeetingDialog } from './MeetingPopups';

const CATEGORIES = ['회의', '보고', '기타'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  '회의': '초록색',
  '보고': '보라색',
  '기타': '회색'
};

const getCategoryStyle = (category: string): string => {
  const colorName = CATEGORY_COLORS[category] || '기본';
  return getTagColor(colorName);
};

const getFolderName = (item: MeetingNoteType): string => {
  const category = (item.category || '회의').trim();
  if (category === '회의') {
    if (!item.date) return '미분류 회의';
    const dateParts = item.date.split('-');
    if (dateParts.length >= 2) {
      const year = dateParts[0];
      const month = parseInt(dateParts[1], 10);
      if (!isNaN(month)) {
        let quarter = '';
        if (month >= 1 && month <= 3) quarter = '1분기';
        else if (month >= 4 && month <= 6) quarter = '2분기';
        else if (month >= 7 && month <= 9) quarter = '3분기';
        else if (month >= 10 && month <= 12) quarter = '4분기';
        
        if (quarter) {
          return `${year}년 ${quarter} 회의록`;
        }
      }
    }
    return '미분류 회의';
  }
  return category;
};

const getMeetingId = (item: MeetingNoteType, allItems: MeetingNoteType[]): string => {
  if (!item.date) return 'no-date';
  const itemsOnSameDate = allItems.filter(x => x.date === item.date);
  if (itemsOnSameDate.length <= 1) {
    return item.date;
  }
  const sortedOnSameDate = [...itemsOnSameDate].sort((a, b) => (a.sheetRowIndex || 0) - (b.sheetRowIndex || 0));
  const orderIndex = sortedOnSameDate.findIndex(x => x.sheetRowIndex === item.sheetRowIndex);
  return `${item.date}-${orderIndex + 1}`;
};

const findMeetingByMeetingId = (id: string, allItems: MeetingNoteType[]): MeetingNoteType | undefined => {
  if (!id) return undefined;
  
  const dashIndex = id.lastIndexOf('-');
  let datePart = id;
  let suffixIndex = 1;
  // standard date length format yyyy-mm-dd is 10
  if (dashIndex !== -1 && dashIndex === 10) {
    datePart = id.slice(0, 10);
    suffixIndex = parseInt(id.slice(11), 10) || 1;
  }
  
  const itemsOnSameDate = allItems.filter(x => x.date === datePart);
  if (itemsOnSameDate.length === 0) return undefined;
  if (itemsOnSameDate.length === 1 && id === datePart) {
    return itemsOnSameDate[0];
  }
  const sortedOnSameDate = [...itemsOnSameDate].sort((a, b) => (a.sheetRowIndex || 0) - (b.sheetRowIndex || 0));
  return sortedOnSameDate[suffixIndex - 1] || sortedOnSameDate[0];
};

export default function MeetingNote() {
  const navigate = useNavigate();
  const location = useLocation();

  const [items, setItems] = useState<MeetingNoteType[]>(() => {
    const cached = localStorage.getItem('webapp_meeting_notes_backup');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [copiedRowIndex, setCopiedRowIndex] = useState<number | null>(null);

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState('회의');
  const [editContent, setEditContent] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  // Adding State
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '회의',
    title: '',
    content: ''
  });
  const [addingNote, setAddingNote] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sorting: Date Descending, then Row Index Descending
  const sortedItems = [...items].sort((a, b) => {
    const dateA = new Date(a.date).getTime() || 0;
    const dateB = new Date(b.date).getTime() || 0;
    if (dateB !== dateA) {
      return dateB - dateA;
    }
    return (b.sheetRowIndex || 0) - (a.sheetRowIndex || 0);
  });

  const selectedItem = selectedRowIndex !== null ? sortedItems.find(item => item.sheetRowIndex === selectedRowIndex) : undefined;

  // New folding logic state & group logic
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  // Filter items based on title or body content
  const filteredItems = sortedItems.filter(item => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return item.title.toLowerCase().includes(query) || 
           item.content.toLowerCase().includes(query) ||
           item.date.includes(query) ||
           (item.category || '회의').toLowerCase().includes(query);
  });

  const groupedFolders = React.useMemo(() => {
    const foldersMap: Record<string, MeetingNoteType[]> = {};
    
    filteredItems.forEach(item => {
      const folderName = getFolderName(item);
      if (!foldersMap[folderName]) {
        foldersMap[folderName] = [];
      }
      foldersMap[folderName].push(item);
    });

    const folderGroups = Object.keys(foldersMap).map(folderName => {
      const folderItems = foldersMap[folderName];
      // Sort items inside this folder: Date Descending, then sheetRowIndex Descending
      const sortedFolderItems = [...folderItems].sort((a, b) => {
        const dateA = new Date(a.date).getTime() || 0;
        const dateB = new Date(b.date).getTime() || 0;
        if (dateB !== dateA) return dateB - dateA;
        return (b.sheetRowIndex || 0) - (a.sheetRowIndex || 0);
      });

      // Get max date in this folder (or 0 if none)
      const maxDate = sortedFolderItems.length > 0 
        ? new Date(sortedFolderItems[0].date).getTime() || 0 
        : 0;

      return {
        folderName,
        items: sortedFolderItems,
        maxDate
      };
    });

    // Sort folders by maxDate descending
    return folderGroups.sort((a, b) => b.maxDate - a.maxDate);
  }, [filteredItems]);

  // Update edit form whenever selected item changes
  useEffect(() => {
    if (selectedItem) {
      setEditTitle(selectedItem.title || '');
      setEditDate(selectedItem.date || '');
      setEditCategory(selectedItem.category || '회의');
      setEditContent(selectedItem.content || '');
    }
    setIsEditing(false);
  }, [selectedRowIndex, selectedItem]);

  const fetchMeetingNotes = async (isBackground = false) => {
    const hasCache = items.length > 0;
    try {
      if (!isBackground && !hasCache) {
        setLoading(true);
      }
      const data = await meetingNoteApi.get();
      if (data) {
        setItems(data);
        localStorage.setItem('webapp_meeting_notes_backup', JSON.stringify(data));
      }
    } catch (error: any) {
      console.error('Failed to load meeting notes:', error);
      if (!hasCache) {
        toast.error(MESSAGES.meeting.loadError(error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetingNotes(true); // background sync on mount
  }, []);

  // Sync selection from URL with full robustness
  useEffect(() => {
    const pathname = location.pathname;
    if (!pathname.startsWith('/meeting')) return;

    const parts = pathname.split('/').filter(Boolean); // ["meeting", "id"]
    if (parts[1]) {
      const matched = findMeetingByMeetingId(parts[1], sortedItems);
      if (matched) {
        if (selectedRowIndex !== matched.sheetRowIndex) {
          setSelectedRowIndex(matched.sheetRowIndex || null);
        }
        // Auto-expand folder of selected item
        const fName = getFolderName(matched);
        setExpandedFolders(prev => {
          if (!prev[fName]) {
            return { ...prev, [fName]: true };
          }
          return prev;
        });
        return;
      }
    } else {
      setSelectedRowIndex(null);
    }
  }, [location.pathname, items]);

  const handleCopy = async (rowIndex: number, text: string) => {
    try {
      const cleanText = stripMarkdown(text);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cleanText);
        setCopiedRowIndex(rowIndex);
        toast.success(MESSAGES.general.copySuccess);
        setTimeout(() => setCopiedRowIndex(null), 2000);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = cleanText;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedRowIndex(rowIndex);
        toast.success(MESSAGES.general.copySuccess);
        setTimeout(() => setCopiedRowIndex(null), 2000);
      }
    } catch (err) {
      toast.error(MESSAGES.general.copyFailure);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedRowIndex || !selectedItem) return;
    if (!editTitle.trim()) {
      toast.error(MESSAGES.meeting.titleRequired);
      return;
    }

    // Optimistically update local state first
    const updatedItems = items.map(item => {
      if (item.sheetRowIndex === selectedRowIndex) {
        return { ...item, title: editTitle, date: editDate, category: editCategory, content: editContent };
      }
      return item;
    });
    setItems(updatedItems);
    localStorage.setItem('webapp_meeting_notes_backup', JSON.stringify(updatedItems));
    setIsEditing(false);

    try {
      setSavingItem(true);
      await meetingNoteApi.update(selectedRowIndex, {
        sheetRowIndex: selectedRowIndex,
        title: editTitle,
        category: editCategory,
        date: editDate,
        content: editContent
      });
      toast.success(MESSAGES.meeting.saveSuccess);
    } catch (error: any) {
      console.error('meetingNoteApi.update Failed:', error);
      toast.error(MESSAGES.meeting.saveError(error.message));
    } finally {
      setSavingItem(false);
    }
  };

  const handleCreateNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!addForm.title.trim()) {
      toast.error(MESSAGES.meeting.titleRequired);
      return;
    }

    try {
      setAddingNote(true);
      const res = await meetingNoteApi.add({
        date: addForm.date,
        category: addForm.category,
        title: addForm.title,
        content: addForm.content
      });

      if (res.success) {
        const newNoteWithIndex: MeetingNoteType = {
          sheetRowIndex: res.sheetRowIndex,
          date: addForm.date,
          category: addForm.category,
          title: addForm.title,
          content: addForm.content
        };

        const updated = [newNoteWithIndex, ...items];
        setItems(updated);
        localStorage.setItem('webapp_meeting_notes_backup', JSON.stringify(updated));
        
        setShowAddDialog(false);
        setAddForm({
          date: new Date().toISOString().split('T')[0],
          category: '회의',
          title: '',
          content: ''
        });
        toast.success(MESSAGES.meeting.registerSuccess);

        // route to the new item
        navigate(`/meeting/${getMeetingId(newNoteWithIndex, updated)}`);
      }
    } catch (err: any) {
      toast.error(MESSAGES.meeting.registerError(err.message));
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!selectedRowIndex) return;
    
    // Close confirmation modal
    setShowDeleteConfirm(false);

    // Optimistically update
    const updated = items.filter(item => item.sheetRowIndex !== selectedRowIndex);
    setItems(updated);
    localStorage.setItem('webapp_meeting_notes_backup', JSON.stringify(updated));

    if (updated.length > 0) {
      // Find the first sorting note remaining
      const nextSortItem = [...updated].sort((a, b) => {
        const dateA = new Date(a.date).getTime() || 0;
        const dateB = new Date(b.date).getTime() || 0;
        if (dateB !== dateA) return dateB - dateA;
        return (b.sheetRowIndex || 0) - (a.sheetRowIndex || 0);
      })[0];
      navigate(`/meeting/${getMeetingId(nextSortItem, updated)}`);
    } else {
      navigate('/meeting');
      setSelectedRowIndex(null);
    }

    try {
      await meetingNoteApi.remove(selectedRowIndex);
      toast.success(MESSAGES.meeting.deleteSuccess);
    } catch (err: any) {
      toast.error(MESSAGES.meeting.deleteError(err.message));
    }
  };

  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col gap-1 select-none md:select-text">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[500px]">
        {/* Left Side: Directory Sidebar */}
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border-none flex flex-col gap-4 h-[650px] max-lg:h-auto max-lg:min-h-[350px]">
          
          {/* Search Bar & Add Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400" />
              <input
                type="text"
                placeholder="회의 제목, 내용 또는 날짜 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[13px] md:text-[15px] rounded-xl bg-zinc-50 hover:border-zinc-300 focus:bg-white transition-all"
              />
            </div>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => setShowAddDialog(true)}
              className="h-11 w-11 shrink-0 rounded-full text-zinc-700 border border-solid border-zinc-100 bg-white/50 hover:bg-white/80 shadow-sm transition-all flex items-center justify-center cursor-pointer"
              title="회의록 추가"
            >
              <Plus className="w-5 h-5 text-zinc-500" />
            </Button>
          </div>

                  {/* Meeting Lists */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1.5 max-lg:max-h-[250px]">
            {filteredItems.length === 0 ? (
              <div className="py-20 text-center text-[13px] md:text-[15px] text-neutral-400 flex flex-col items-center justify-center gap-2">
                <MessagesSquare className="w-9 h-9 text-neutral-300" />
                <span>검색 결과가 없거나 회의록이 존재하지 않습니다.</span>
              </div>
            ) : (
              groupedFolders.map(({ folderName, items: folderItems }) => {
                const isExpanded = !!expandedFolders[folderName];
                return (
                  <div key={folderName} className="space-y-1 animate-in fade-in duration-200">
                    {/* Folder Header */}
                    <div 
                      onClick={() => toggleFolder(folderName)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f6f7f9] cursor-pointer transition-all text-neutral-700 select-none hover:text-zinc-900"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isExpanded ? (
                          <FolderOpen className="w-4.5 h-4.5 text-primary shrink-0" />
                        ) : (
                          <Folder className="w-4.5 h-4.5 text-zinc-500 shrink-0" />
                        )}
                        <span className="font-semibold text-[13px] md:text-[15px] truncate text-zinc-800 max-w-[140px] md:max-w-none">
                          {folderName}
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
                      <div className="pl-3 border-l border-neutral-100 ml-3.5 space-y-0.5">
                        {folderItems.map((item) => {
                          const isSelected = selectedRowIndex === item.sheetRowIndex;
                          
                          return (
                            <div
                              key={item.sheetRowIndex}
                              onClick={() => navigate(`/meeting/${getMeetingId(item, sortedItems)}`)}
                              className={`flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all text-[13px] md:text-[15px] min-w-0 ${
                                isSelected 
                                  ? 'bg-zinc-50 text-primary font-semibold' 
                                  : 'text-zinc-800 hover:bg-[#f6f7f9] hover:text-zinc-900'
                              }`}
                            >
                              <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary' : 'text-zinc-500'}`} />
                              <span className="truncate flex-1" title={item.title}>{item.title}</span>
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
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-4 select-none shrink-0">
                <div className="flex-1 min-w-0 pr-4">
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-[14px] md:text-[16px] lg:text-[18px] font-semibold text-gray-800 px-2 py-1 border border-neutral-200 rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                        placeholder="회의 제목을 입력하세요..."
                      />
                      <div className="flex items-center gap-3 text-zinc-400 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="px-2 py-0.5 border border-neutral-200 rounded text-zinc-650 outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Folder className="w-4 h-4 text-zinc-400 shrink-0" />
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="px-2 py-0.5 border border-neutral-200 rounded bg-white text-zinc-650 outline-none font-medium cursor-pointer text-[11px]"
                          >
                            <option value="회의">회의</option>
                            <option value="보고">보고</option>
                            <option value="기타">기타</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      <FileText className="w-4.5 h-4.5 text-primary shrink-0 ml-1" />
                      <h2 className="text-[14px] md:text-[18px] font-semibold text-gray-800 truncate" title={selectedItem.title}>
                        {selectedItem.title}
                      </h2>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons: Copy, Edit, Delete, Sync */}
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
                          setEditTitle(selectedItem.title || '');
                          setEditDate(selectedItem.date || '');
                          setEditContent(selectedItem.content || '');
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
                      {/* Copy to Clipboard */}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopy(selectedItem.sheetRowIndex || 0, selectedItem.content)}
                        disabled={!selectedItem.content}
                        className={`rounded-full w-8 h-8 cursor-pointer transition-all ${
                          copiedRowIndex === selectedItem.sheetRowIndex 
                          ? 'bg-teal-500 hover:bg-teal-600 text-white animate-in zoom-in-75 duration-150' 
                          : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800'
                        }`}
                        title="복사하기"
                      >
                        {copiedRowIndex === selectedItem.sheetRowIndex ? (
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

                      {/* Delete Note */}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="rounded-full w-8 h-8 hover:bg-red-50 text-neutral-500 hover:text-red-600 cursor-pointer animate-in fade-in duration-205"
                        title="회의록 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
  
                      {/* Sync */}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => fetchMeetingNotes(false)}
                        disabled={loading}
                        className="rounded-full w-8 h-8 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 cursor-pointer"
                        title="구글시트 동기화"
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
  
              {/* Text Area Content Display */}
              <div className="flex-1 min-h-0 flex flex-col">
                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    disabled={savingItem}
                    className="w-full flex-1 min-h-[300px] lg:min-h-0 h-full p-5 border border-primary/20 bg-[#fafaff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary rounded-md leading-[1.8] text-neutral-700 text-[14px] md:text-[16px] font-sans resize-none"
                    placeholder="회의록 내용을 작성해 보세요..."
                  />
                ) : selectedItem.content ? (
                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-neutral-50/45 border border-neutral-100 rounded-md p-5 leading-[1.8] text-zinc-650 text-[14px] md:text-[16px] font-sans selection:bg-primary/10">
                    <div className="select-text selection:bg-primary/20">
                      <MarkdownRenderer text={selectedItem.content} isMeeting={true} />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 border border-neutral-100 rounded-md p-5 bg-neutral-50/45 flex flex-col items-center justify-center text-center text-[14px] md:text-[16px] text-neutral-400 select-none">
                    <FileText className="w-9 h-9 text-neutral-300 mb-2" />
                    <span>내용이 비어있습니다.</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 py-40 text-center flex flex-col items-center justify-center gap-2 select-none">
              <MessagesSquare className="w-11 h-11 text-neutral-300" />
              <span className="text-[16px] font-medium text-[#64666e]">조회할 회의록을 선택해 주세요.</span>
            </div>
          )}
        </div>
      </div>

      {/* Add New Meeting Note Dialog modal */}
      <AddMeetingDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        addForm={addForm}
        setAddForm={setAddForm}
        onConfirm={handleCreateNote}
        isSubmitting={addingNote}
        categories={CATEGORIES}
        getCategoryStyle={getCategoryStyle}
      />

      {/* Delete Confirmation Dialog modal */}
      <DeleteMeetingDialog
        open={showDeleteConfirm && !!selectedItem}
        onClose={() => setShowDeleteConfirm(false)}
        title={selectedItem?.title || ''}
        onConfirm={handleDeleteNote}
      />
    </div>
  );
}
