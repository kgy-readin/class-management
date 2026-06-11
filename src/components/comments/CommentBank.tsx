import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MESSAGES } from '@/src/constants/messages';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Search, 
  RefreshCw,
  MessageCircleWarning,
  Check,
  Pencil,
  Save,
  X,
  Copy,
  User
} from 'lucide-react';
import { noteApi } from '@/src/services/api';
import MarkdownRenderer, { DocTab, stripMarkdown } from '../common/MarkdownRenderer';

export default function CommentBank() {
  const [allTabs, setAllTabs] = useState<DocTab[]>(() => {
    const cached = localStorage.getItem('webapp_tabs_data_backup');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Replacement State
  const [nameInput, setNameInput] = useState('');
  const [replacementName, setReplacementName] = useState('');

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [savingTab, setSavingTab] = useState(false);

  // Extract folder tabs (excluding the first tab '메모')
  const folders = allTabs.length > 1 ? allTabs.slice(1) : allTabs;

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
      const data = await noteApi.getTabsData();
      if (data && data.length > 0) {
        setAllTabs(data);
        localStorage.setItem('webapp_tabs_data_backup', JSON.stringify(data));
      }
    } catch (error: any) {
      console.error('Failed to load tabs data:', error);
      if (!hasCache) {
        toast.error(MESSAGES.comments.loadError(error.message));
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

  const handleApplyReplacement = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setReplacementName(nameInput.trim());
    if (nameInput.trim()) {
      toast.success(MESSAGES.beginners.replacementSuccess(nameInput.trim()));
    } else {
      toast.info(MESSAGES.beginners.replacementReset);
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      const substituted = replacementName 
        ? text.replaceAll('●●', replacementName) 
        : text;
      const cleanText = stripMarkdown(substituted);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cleanText);
        setCopiedId(id);
        toast.success(MESSAGES.general.copySuccess);
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
        toast.success(MESSAGES.general.copySuccess);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      toast.error(MESSAGES.general.copyFailure);
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
    localStorage.setItem('webapp_tabs_data_backup', JSON.stringify(updatedTabs));
    setIsEditing(false);

    try {
      setSavingTab(true);
      await noteApi.saveTabSpecification(selectedTabId, editText);
      toast.success(MESSAGES.comments.saveSuccess);
    } catch (error: any) {
      console.error('GAS saveTabSpecification Failed:', error);
      toast.error(MESSAGES.comments.saveError(error.message), {
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
              placeholder="폴더, 탭 이름 또는 내용 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-[13px] md:text-[15px] rounded-xl bg-zinc-50 hover:border-zinc-300 focus:bg-white transition-all"
            />
          </div>

          {/* Directory Tree */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1 max-lg:max-h-[250px]">
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
                        <span className="font-semibold text-[13px] md:text-[15px] truncate text-zinc-650">
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
                          return (
                            <div
                              key={child.id}
                              onClick={() => setSelectedTabId(child.id)}
                              className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer transition-all text-[13px] md:text-[15px] ${
                                isSelected 
                                  ? 'bg-zinc-50 text-blue-700/80 font-semibold' 
                                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'
                              }`}
                            >
                              <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-blue-600' : 'text-zinc-400'}`} />
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
        <div className="flex flex-col bg-white rounded-[2rem] p-6 shadow-sm border-none lg:h-[650px] h-auto min-h-0 w-full">
          {selectedTab ? (
            <div className="flex-1 flex flex-col min-h-0 h-full">
              {/* Note Header */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-4 select-none shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4.5 h-4.5 text-blue-600 shrink-0 ml-1" />
                  <h2 className="text-[14px] md:text-[18px] font-semibold text-gray-800 truncate">{selectedTab.title}</h2>
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
                        disabled={savingTab}
                        className="rounded-full w-8 h-8 hover:bg-blue-50 text-blue-600 hover:text-blue-700 cursor-pointer animate-in fade-in duration-200"
                        title="저장"
                      >
                        <Save className="w-4.5 h-4.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setIsEditing(false);
                          setEditText(selectedTab.text || '');
                        }}
                        disabled={savingTab}
                        className="rounded-full w-8 h-8 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 cursor-pointer animate-in fade-in duration-200"
                        title="취소"
                      >
                        <X className="w-4.5 h-4.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Copy */}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopy(selectedTab.id, selectedTab.text)}
                        disabled={!selectedTab.text}
                        className={`rounded-full w-8 h-8 cursor-pointer transition-all ${
                          copiedId === selectedTab.id 
                          ? 'bg-teal-500 hover:bg-teal-600 text-white animate-in zoom-in-75 duration-150' 
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
                        type="button"
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
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => fetchTabsData(false)}
                        disabled={loading}
                        className="rounded-full w-8 h-8 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 cursor-pointer"
                        title="구글 독스 동기화"
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
                  <div className="flex-1 overflow-y-auto custom-scrollbar bg-neutral-50/45 border border-neutral-100 rounded-2xl p-5 leading-[1.8] text-zinc-650 text-[14px] md:text-[18px] font-sans selection:bg-primary/10">
                    <div className="select-text selection:bg-primary/20">
                      <MarkdownRenderer text={replacementName ? selectedTab.text.replaceAll('●●', replacementName) : selectedTab.text} />
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
              <MessageCircleWarning className="w-11 h-11 text-neutral-300" />
              <span className="text-[16px] font-medium text-[#64666e]">조회할 문서를 선택해 주세요.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
