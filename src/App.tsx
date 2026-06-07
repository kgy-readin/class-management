import { useState, useEffect } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { MESSAGES } from './constants/messages';
import Dashboard from './components/dashboard/Dashboard';
import StudentList from './components/students/StudentList';
import WritingTracker from './components/writing/WritingTracker';
import StudentDetail from './components/students/StudentDetail';
import { DashboardData } from './types/index';
import { Settings } from 'lucide-react';
import TaskManager from './components/tasks/TaskManager';
import StudentLog from './components/logs/StudentLog';
import CommentBank from './components/comments/CommentBank';
import ParentNewsletters from './components/newsletters/ParentNewsletters';
import BeginnerFeedback from './components/beginners/BeginnerFeedback';
import MeetingNote from './components/meeting/MeetingNote';
import { dataApi } from '@/src/services/api';
import TopBar from './components/layout/TopBar';

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<{ isConfigured: boolean; gasUrl?: string } | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  
  const [studentEntrySource, setStudentEntrySource] = useState<'dashboard' | 'students'>('dashboard');

  // App work mode: 'sub' (보조모드), 'class' (수업모드) or 'work' (업무모드)
  const [appMode, setAppMode] = useState<'sub' | 'class' | 'work'>(() => {
    const cached = localStorage.getItem('webapp_app_mode') as 'sub' | 'class' | 'work';
    return cached || 'class';
  });

  // Active tab selection
  const [activeTab, setActiveTab] = useState(() => {
    const mode = (localStorage.getItem('webapp_app_mode') as 'sub' | 'class' | 'work') || 'class';
    if (mode === 'work') {
      return localStorage.getItem('webapp_work_tab') || 'tasks';
    } else if (mode === 'sub') {
      return localStorage.getItem('webapp_sub_tab') || 'logs';
    } else {
      return localStorage.getItem('webapp_class_tab') || 'dashboard';
    }
  });

  // Helper to define mode categories
  const getModeByTab = (tab: string): 'sub' | 'class' | 'work' => {
    if (['writing', 'logs'].includes(tab)) {
      return 'sub';
    }
    if (['tasks', 'meeting', 'comments', 'beginners', 'familyLetter'].includes(tab)) {
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
    } else if (mode === 'sub') {
      localStorage.setItem('webapp_sub_tab', tab);
    } else {
      localStorage.setItem('webapp_work_tab', tab);
    }
  };

  const handleModeChange = (mode: 'sub' | 'class' | 'work') => {
    if (appMode === mode) {
      if (mode === 'class') {
        selectTab('dashboard');
      } else if (mode === 'sub') {
        selectTab('logs');
      } else {
        selectTab('tasks');
      }
      setSelectedStudent(null);
      return;
    }
    setAppMode(mode);
    localStorage.setItem('webapp_app_mode', mode);
    let targetTab = 'dashboard';
    if (mode === 'class') {
      targetTab = localStorage.getItem('webapp_class_tab') || 'dashboard';
    } else if (mode === 'sub') {
      targetTab = localStorage.getItem('webapp_sub_tab') || 'logs';
    } else {
      targetTab = localStorage.getItem('webapp_work_tab') || 'tasks';
    }
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
      toast.error(MESSAGES.general.loadError(error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleHomeClick = async () => {
    await fetchData();
    setSelectedStudent(null);
    if (appMode === 'work') {
      selectTab('tasks');
    } else if (appMode === 'sub') {
      selectTab('logs');
    } else {
      selectTab('dashboard');
    }
    toast.success(MESSAGES.general.homeNavigation);
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
        <TopBar
          activeTab={activeTab}
          appMode={appMode}
          onSelectTab={selectTab}
          onModeChange={handleModeChange}
          onSetSelectedStudent={setSelectedStudent}
        />

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
                  } else if (appMode === 'sub') {
                    selectTab('logs');
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
