import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  RefreshCw,
  Archive,
  Check,
  Pencil,
  Save,
  X,
  Copy,
  AtSign,
  Leaf,
  CalendarFold
} from 'lucide-react';
import { noteApi, RPN_DOCS_ID } from '@/src/services/api';
import { DocTab } from './noticetemplateTypes';
import { stripMarkdown } from './noticetemplateUtils';
import NoticeTemplateRenderer from './NoticeTemplateRenderer';

// Leaf SVG Icon (Teal-500)
const LeafIcon = ({ className }: { className?: string }) => (
  <Leaf className={className} />
);

// Number 1 SVG Icon (Blue-500)
const OneIcon = ({ className }: { className?: string }) => (
  <CalendarFold className={className} />
);

// Letter/Envelope SVG Icon (Violet-400)
const LetterIcon = ({ className }: { className?: string }) => (
  <AtSign className={className} />
);

// Helper to determine the category based on the tab title
const getCategoryType = (title: string): 'leaf' | 'one' | 'letter' | 'default' => {
  const trimmed = title.trim();
  if (trimmed.startsWith('[첫날]') || trimmed.startsWith('[첫주]')) {
    return 'leaf';
  }
  if (trimmed.startsWith('[한달]')) {
    return 'one';
  }
  if (/^\d/.test(trimmed)) {
    return 'letter';
  }
  return 'default';
};

// Decides and returns the beautiful custom SVG icon based on custom prefixes and formats
const getCustomTabIcon = (title: string, className = "w-4 h-4 shrink-0", isSelected = false, baseColorClass?: string) => {
  const category = getCategoryType(title);
  if (category === 'leaf') {
    return <LeafIcon className={`${className} ${isSelected ? 'text-emerald-600' : 'text-emerald-600/70'}`} />;
  }
  if (category === 'one') {
    return <OneIcon className={`${className} ${isSelected ? 'text-blue-600' : 'text-blue-600/70'}`} />;
  }
  if (category === 'letter') {
    return <LetterIcon className={`${className} ${isSelected ? 'text-violet-600' : 'text-violet-600/70'}`} />;
  }
  return <FileText className={`${className} ${isSelected ? (baseColorClass || 'text-blue-600') : 'text-neutral-400'}`} />;
};

export default function ParentNewsletters() {
  const [allTabs, setAllTabs] = useState<DocTab[]>(() => {
    const cached = localStorage.getItem('webapp_family_letter_tabs_backup');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [savingTab, setSavingTab] = useState(false);

  // Extract folder tabs (for family letter, all tabs are folders from the start)
  const folders = allTabs;

  // Find the currently selected sub-tab
  const findSelectedTab = (tabs: DocTab[], id: string | null): DocTab | null => {
    if (!id) return null;
    for (const tab of tabs) {
      if (tab.id === id) return tab;
      if (tab.childTabs && tab.childTabs.length > 0) {
        const found = findSelectedTab(tab.childTabs, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedTab = findSelectedTab(allTabs, selectedTabId);

  // Update editText whenever selected tab changes
  useEffect(() => {
    if (selectedTab) {
      setEditText(selectedTab.text || '');
    }
    setIsEditing(false);
  }, [selectedTabId]);

  const fetchTabsData = async (isBackground = false) => {
    const hasCache = allTabs.length > 0;
    try {
      if (!isBackground && !hasCache) {
        setLoading(true);
      }
      const data = await noteApi.getTabsData(RPN_DOCS_ID);
      if (data && data.length > 0) {
        setAllTabs(data);
        localStorage.setItem('webapp_family_letter_tabs_backup', JSON.stringify(data));
      }
    } catch (error: any) {
      console.error('Failed to load family letter tabs data:', error);
      if (!hasCache) {
        toast.error('가정통신문 데이터를 불러오는데 실패했습니다: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabsData(true); // background sync on mount
  }, []);

  // Initialize expanded state for folders on mount/data load
  useEffect(() => {
    if (folders.length > 0 && Object.keys(expandedFolders).length === 0) {
      const initial: Record<string, boolean> = {};
      folders.forEach((f) => {
        initial[f.id] = false; // start all folders collapsed initially
      });
      setExpandedFolders(initial);
    }
  }, [allTabs]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      const cleanText = stripMarkdown(text);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cleanText);
        setCopiedId(id);
        toast.success('클립보드에 복사되었습니다!');
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = cleanText;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopiedId(id);
        toast.success('클립보드에 복사되었습니다!');
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      toast.error('복사에 실패했습니다.');
    }
  };

  const updateTabInTree = (tabs: DocTab[], targetId: string, newText: string): DocTab[] => {
    return tabs.map(tab => {
      if (tab.id === targetId) {
        return { ...tab, text: newText };
      }
      if (tab.childTabs && tab.childTabs.length > 0) {
        return { ...tab, childTabs: updateTabInTree(tab.childTabs, targetId, newText) };
      }
      return tab;
    });
  };

  const handleSaveEdit = async () => {
    if (!selectedTabId) return;
    
    // Optimistically update local state first so user does not lose input
    const updatedTabs = updateTabInTree(allTabs, selectedTabId, editText);
    setAllTabs(updatedTabs);
    localStorage.setItem('webapp_family_letter_tabs_backup', JSON.stringify(updatedTabs));
    setIsEditing(false);

    try {
      setSavingTab(true);
      await noteApi.saveTabSpecification(selectedTabId, editText, RPN_DOCS_ID);
      toast.success('수정사항이 저장되었습니다.');
    } catch (error: any) {
      console.error('GAS saveTabSpecification Failed:', error);
      toast.error('로컬에 저장되었으나 서버(GAS) 전송에 실패했습니다: ' + error.message, {
        duration: 6000
      });
    } finally {
      setSavingTab(false);
    }
  };

  // Filter folders/childTabs based on search query
  const filteredFolders = folders.map(folder => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return folder;

    // Filter child tabs that contain query in title or in their text body
    const filteredChildren = folder.childTabs.filter(child => 
      child.title.toLowerCase().includes(query) || 
      child.text.toLowerCase().includes(query)
    );

    // If folder title matches or any children matched
    if (folder.title.toLowerCase().includes(query) || filteredChildren.length > 0) {
      return {
        ...folder,
        childTabs: filteredChildren
      };
    }
    return null;
  }).filter(Boolean) as DocTab[];

  return (
    <div className="w-full h-full max-w-7xl mx-auto flex flex-col gap-1 select-none md:select-text">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[500px]">
        {/* Left Side: Directory Sidebar (widescreen search list) */}
        <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-neutral-200/60 flex flex-col gap-4 h-[650px] max-lg:h-[300px] max-lg:min-h-[300px] max-lg:max-h-[300px]">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400" />
            <input
              type="text"
              placeholder="폴더, 탭 이름 또는 내용 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[13px] md:text-[15px] rounded-xl bg-[#fbfbfc] hover:border-neutral-300 focus:bg-white transition-all"
            />
          </div>

          {/* Directory Tree */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1">
            {filteredFolders.length === 0 ? (
              <div className="py-20 text-center text-[13px] md:text-[15px] text-neutral-400 flex flex-col items-center justify-center gap-2">
                <FileText className="w-9 h-9 text-neutral-300" />
                <span>검색 결과가 없거나 불러온 데이터가 없습니다.</span>
              </div>
            ) : (
              filteredFolders.map((folder) => {
                const isExpanded = searchQuery.trim() !== '' ? true : !!expandedFolders[folder.id];
                const hasChildren = folder.childTabs && folder.childTabs.length > 0;
                
                return (
                  <div key={folder.id} className="space-y-1">
                     {/* Folder Row */}
                    <div 
                      onClick={() => toggleFolder(folder.id)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#f6f7f9] cursor-pointer transition-colors text-neutral-700"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isExpanded ? (
                          <FolderOpen className="w-4.5 h-4.5 text-primary shrink-0" />
                        ) : (
                          <Folder className="w-4.5 h-4.5 text-neutral-400 shrink-0" />
                        )}
                        <span className="font-semibold text-[13px] md:text-[15px] truncate text-zinc-600">
                          {folder.title}
                        </span>
                        {hasChildren && (
                          <span className="text-[11px] md:text-[13px] bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full font-mono shrink-0">
                            {folder.childTabs.length}
                          </span>
                        )}
                      </div>
                      {hasChildren && (
                        <div>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-neutral-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-neutral-400" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Child Tabs List */}
                    {isExpanded && hasChildren && (
                      <div className="pl-4 border-l border-neutral-100 ml-4.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        {folder.childTabs.map((child) => {
                          const isSelected = selectedTabId === child.id;
                          const category = getCategoryType(child.title);
                          
                          let activeClass = 'bg-zinc-100/80 text-blue-700/80 font-semibold';
                          if (category === 'leaf') {
                            activeClass = 'bg-zinc-100/80 text-emerald-800/80 font-semibold';
                          } else if (category === 'one') {
                            activeClass = 'bg-zinc-100/80 text-blue-700/80 font-semibold';
                          } else if (category === 'letter') {
                            activeClass = 'bg-zinc-100/80 text-violet-700/80 font-semibold';
                          }

                          return (
                            <div
                              key={child.id}
                              onClick={() => setSelectedTabId(child.id)}
                              className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all text-[13px] md:text-[15px] ${
                                isSelected 
                                  ? activeClass 
                                  : 'text-neutral-500 hover:bg-[#fcfcfe] hover:text-neutral-800'
                              }`}
                            >
                              {getCustomTabIcon(child.title, "w-4 h-4 shrink-0", isSelected)}
                              <span className="truncate">{child.title}</span>
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

        {/* Right Side: Document Content Display */}
        <div className="flex flex-col bg-white rounded-[2rem] p-6 shadow-sm border border-neutral-200/60 lg:h-[650px] h-auto min-h-0 w-full">
          {selectedTab ? (
            <div className="flex-1 flex flex-col min-h-0 h-full">
              {/* Note Header */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-4 select-none shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  {getCustomTabIcon(selectedTab.title, "w-4.5 h-4.5 shrink-0", true)}
                  <h2 className="text-[14px] md:text-[18px] font-semibold text-gray-800 truncate">{selectedTab.title}</h2>
                </div>
                
                {/* Action Buttons: Copy, Edit, Sync */}
                <div className="flex items-center gap-1 shrink-0">
                  {isEditing ? (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleSaveEdit}
                        disabled={savingTab}
                        className="rounded-full w-8 h-8 hover:bg-[#e6fdfa] text-emerald-600 hover:text-emerald-700 cursor-pointer"
                        title="저장"
                      >
                        <Save className="w-4.5 h-4.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setIsEditing(false);
                          setEditText(selectedTab.text || '');
                        }}
                        disabled={savingTab}
                        className="rounded-full w-8 h-8 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 cursor-pointer"
                        title="취소"
                      >
                        <X className="w-4.5 h-4.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Copy */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopy(selectedTab.id, selectedTab.text)}
                        disabled={!selectedTab.text}
                        className={`rounded-full w-8 h-8 cursor-pointer transition-all ${
                          copiedId === selectedTab.id 
                          ? 'bg-teal-500 hover:bg-teal-600 text-white' 
                          : 'hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800'
                        }`}
                        title="복사하기"
                      >
                        {copiedId === selectedTab.id ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
 
                      {/* Edit (Pencil) */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setIsEditing(true)}
                        className="rounded-full w-8 h-8 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 cursor-pointer"
                        title="수정하기"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
 
                      {/* Sync */}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => fetchTabsData(false)}
                        disabled={loading}
                        className="rounded-full w-8 h-8 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 cursor-pointer"
                        title="가정통신문 구글 독스 동기화"
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
 
              {/* Text Area Content Formatted */}
              <div className="flex-1 min-h-0 flex flex-col">
                {isEditing ? (
                  <textarea
                     value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    disabled={savingTab}
                    className="w-full flex-1 min-h-[300px] lg:min-h-0 h-full p-5 border border-primary/20 bg-[#fafaff] focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary rounded-2xl leading-[1.8] text-neutral-700 text-[14px] md:text-[18px] font-sans resize-none"
                    placeholder="내용을 수정해 주세요..."
                  />
                ) : selectedTab.text ? (
                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-neutral-50/45 border border-neutral-100 rounded-2xl p-5 leading-[1.8] text-zinc-600 text-[14px] md:text-[18px] font-sans selection:bg-primary/10">
                    <div className="select-text selection:bg-primary/20">
                      <NoticeTemplateRenderer text={selectedTab.text} />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 border border-neutral-100 rounded-2xl p-5 bg-neutral-50/45 flex flex-col items-center justify-center text-center text-[14px] md:text-[18px] text-neutral-400 select-none">
                    <FileText className="w-9 h-9 text-neutral-300 mb-2" />
                    <span>본문 내용이 비어있습니다.</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 py-40 text-center flex flex-col items-center justify-center gap-2 select-none">
              <Archive className="w-11 h-11 text-neutral-300 animate-pulse" strokeWidth={2.4} />
              <span className="text-[16px] font-medium text-[#64666e]">조회할 가정통신문을 선택해 주세요.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
