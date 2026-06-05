import { useState, useEffect } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import Dashboard from './components/dashboard/Dashboard';
import StudentList from './components/students/StudentList';
import WritingTracker from './components/writing/WritingTracker';
import StudentDetail from './components/students/StudentDetail';
import { DashboardData } from './types/index';
import { BookOpen, UsersRound, BookText, PenTool, Settings, BriefcaseBusiness, MessageCircleWarning, Archive, Menu, LayoutDashboard, SquareCheckBig, Sparkles, ScrollText, MessagesSquare } from 'lucide-react';
import TaskManager from './components/tasks/TaskManager';
import StudentLog from './components/studentlog/StudentLog';
import CommentBank from './components/commentbank/CommentBank';
import ParentNewsletters from './components/newsletters/ParentNewsletters';
import BeginnerFeedback from './components/beginners/BeginnerFeedback';
import MeetingNote from './components/meeting/MeetingNote';
import { Button } from '@/components/ui/button';
import { dataApi } from '@/src/services/api';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<{ isConfigured: boolean; gasUrl?: string } | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  
  const [studentEntrySource, setStudentEntrySource] = useState<'dashboard' | 'students'>('dashboard');

  // App work mode: 'class' (수업모드) or 'work' (업무모드)
  const [appMode, setAppMode] = useState<'class' | 'work'>(() => {
    const cached = localStorage.getItem('webapp_app_mode') as 'class' | 'work';
    return cached || 'class';
  });

  // Active tab selection
  const [activeTab, setActiveTab] = useState(() => {
    const mode = (localStorage.getItem('webapp_app_mode') as 'class' | 'work') || 'class';
    if (mode === 'work') {
      return localStorage.getItem('webapp_work_tab') || 'tasks';
    } else {
      return localStorage.getItem('webapp_class_tab') || 'dashboard';
    }
  });

  // Helper to define mode categories
  const getModeByTab = (tab: string): 'class' | 'work' => {
    if (['tasks', 'logs', 'meeting', 'comments', 'beginners', 'familyLetter'].includes(tab)) {
      return 'work';
    }
    return 'class';
  };

  // Function to coordinate state variables when active tab shifts
  const selectTab = (tab: string) => {
    const mode = getModeByTab(tab);
    setAppMode(mode);
    localStorage.setItem('webapp_app_mode', mode);
    
    setActiveTab(tab);
    localStorage.setItem('webapp_active_tab', tab);
    
    if (mode === 'class') {
      localStorage.setItem('webapp_class_tab', tab);
    } else {
      localStorage.setItem('webapp_work_tab', tab);
    }
  };

  // Floating speech bubble menu open state
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleModeChange = (mode: 'class' | 'work') => {
    if (appMode === mode) {
      if (mode === 'class') {
        selectTab('dashboard');
      } else {
        selectTab('tasks');
      }
      setSelectedStudent(null);
      return;
    }
    setAppMode(mode);
    localStorage.setItem('webapp_app_mode', mode);
    const targetTab = mode === 'class'
      ? (localStorage.getItem('webapp_class_tab') || 'dashboard')
      : (localStorage.getItem('webapp_work_tab') || 'tasks');
    setActiveTab(targetTab);
    localStorage.setItem('webapp_active_tab', targetTab);
    setSelectedStudent(null);
  };

  const fetchData = async () => {
    try {
      const configData = dataApi.getConfig();
      setConfig(configData);

      if (configData.isConfigured) {
        const result = await dataApi.fetchData();
        setData(result);
      }
    } catch (error: any) {
      toast.error('데이터를 불러오는데 실패했습니다: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHomeClick = async () => {
    await fetchData();
    setSelectedStudent(null);
    if (appMode === 'work') {
      selectTab('tasks');
    } else {
      selectTab('dashboard');
    }
    toast.success('홈 화면으로 이동했습니다.');
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="text-muted-foreground font-medium">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10">
      <Tabs value={activeTab} onValueChange={(val) => {
        selectTab(val);
        if (val !== 'dashboard') {
          setSelectedStudent(null);
        }
      }} className="w-full">
        
        {/* Top Header */}
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
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute left-0 top-11.5 z-[100] w-48 bg-white border border-zinc-200/75 rounded-2xl shadow-xl p-2 flex flex-col gap-0.5 mt-2"
                    >
                      <div className="relative z-10 flex flex-col">
                        {[
                          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                          { id: 'students', label: 'Students', icon: UsersRound },
                          { id: 'writing', label: 'Writing', icon: PenTool },
                          { id: 'tasks', label: 'Tasks', icon: SquareCheckBig },
                          { id: 'logs', label: 'Logs', icon: Archive },
                          { id: 'meeting', label: 'Meeting', icon: MessagesSquare },
                          { id: 'comments', label: 'Comments', icon: MessageCircleWarning },
                          { id: 'beginners', label: 'Beginners', icon: Sparkles },
                          { id: 'familyLetter', label: 'Newsletters', icon: ScrollText },
                        ].map((item) => {
                          const Icon = item.icon;
                          const isSelected = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                selectTab(item.id);
                                setSelectedStudent(null);
                                setIsMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] md:text-[14px] font-medium transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-blue-50/80 text-primary font-semibold text-left'
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
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
              <button 
                onClick={() => window.location.reload()}
                className="text-[16px] font-medium text-zinc-800 hover:text-zinc-500 select-none transition-colors cursor-pointer tracking-tight"
                title="새로고침"
              >
                {activeTab === 'dashboard' ? 'Dashboard' :
                 activeTab === 'students' ? 'Students' :
                 activeTab === 'writing' ? 'Writing' :
                 activeTab === 'tasks' ? 'Tasks' :
                 activeTab === 'logs' ? 'Logs' :
                 activeTab === 'meeting' ? 'Meeting' :
                 activeTab === 'comments' ? 'Comments' :
                 activeTab === 'beginners' ? 'Beginners' :
                 activeTab === 'familyLetter' ? 'Newsletters' : 'Dashboard'}
              </button>
            </div>

            {/* Right side: Mode toggles aligned to the right */}
            <div className="flex items-center gap-3">
              {/* Toggle controls - icon only */}
              <div className="bg-zinc-100/85 p-0.5 rounded-full flex items-center border border-zinc-200/30 gap-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => handleModeChange('class')}
                  className={`rounded-full w-12 h-8 flex items-center justify-center transition-all cursor-pointer ${
                    appMode === 'class' 
                      ? 'bg-white text-primary shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/20'
                  }`}
                  title="수업모드"
                >
                  <BookOpen className="w-4.5 h-4.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('work')}
                  className={`rounded-full w-12 h-8 flex items-center justify-center transition-all cursor-pointer ${
                    appMode === 'work' 
                      ? 'bg-white text-primary shadow-sm' 
                      : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200/20'
                  }`}
                  title="업무모드"
                >
                  <BriefcaseBusiness className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Views content */}
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {!config?.isConfigured && (
            <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-[2rem] text-yellow-800 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3 mb-2">
                <Settings className="w-5 h-5" />
                <h2 className="font-semibold">구글 시트 설정이 필요합니다</h2>
              </div>
              <p className="text-sm">
                애플리케이션을 사용하려면 GAS 웹 앱 URL 설정이 필요합니다.
              </p>
            </div>
          )}

          <TabsContent value="dashboard" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-550 mt-0">
            {selectedStudent ? (
              <StudentDetail 
                studentName={selectedStudent} 
                data={data} 
                setData={setData}
                onBack={() => {
                  setSelectedStudent(null);
                  if (studentEntrySource === 'students') {
                    selectTab('students');
                  } else if (appMode === 'work') {
                    selectTab('tasks');
                  } else {
                    selectTab('dashboard');
                  }
                }} 
                onRefresh={fetchData} 
              />
            ) : (
              <Dashboard 
                data={data} 
                onRefresh={fetchData} 
                onSelectStudent={(name) => {
                  setSelectedStudent(name);
                  setStudentEntrySource('dashboard');
                }}
                onNavigateToStudents={() => selectTab('students')}
              />
            )}
          </TabsContent>
          
          <TabsContent value="students" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-550 mt-0">
            <StudentList data={data} onRefresh={fetchData} onSelectStudent={(name) => {
              setSelectedStudent(name);
              setStudentEntrySource('students');
              selectTab('dashboard');
            }} />
          </TabsContent>
          
          <TabsContent value="writing" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-550 mt-0">
            <WritingTracker students={data?.students || []} />
          </TabsContent>
          
          <TabsContent value="tasks" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-550 mt-0">
            <TaskManager students={data?.students || []} onRefreshGlobal={fetchData} />
          </TabsContent>

          <TabsContent value="logs" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-550 mt-0">
             <StudentLog students={data?.students || []} />
          </TabsContent>

          <TabsContent value="meeting" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-550 mt-0">
            <MeetingNote />
          </TabsContent>
          
          <TabsContent value="comments" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-550 mt-0">
            <CommentBank />
          </TabsContent>

          <TabsContent value="beginners" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-550 mt-0">
            <BeginnerFeedback />
          </TabsContent>

          <TabsContent value="familyLetter" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-550 mt-0">
            <ParentNewsletters />
          </TabsContent>
        </div>
      </Tabs>

      <Toaster position="top-center" />
    </div>
  );
}
