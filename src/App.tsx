import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { MESSAGES } from './constants/messages';
import Dashboard from './components/dashboard/Dashboard';
import StudentList from './components/students/StudentList';
import WritingTracker from './components/writing/WritingTracker';
import StudentDetail from './components/students/StudentDetail';
import { DashboardData, Student, getShortHash } from './types/index';
import { Settings } from 'lucide-react';
import TaskManager from './components/tasks/TaskManager';
import StudentLog from './components/logs/StudentLog';
import NoticeForm from './components/noticeform/noticeForm';
import FamilyLetters from './components/familyletters/familyLetters';
import BeginnerFeedback from './components/beginners/BeginnerFeedback';
import MeetingNote from './components/meeting/MeetingNote';
import { dataApi } from '@/src/services/api';
import TopBar from './components/layout/TopBar';
import LoginGate from './components/common/LoginGate';

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

const pathToTab: Record<string, string> = {
  '/': 'dashboard',
  '/students': 'students',
  '/writing': 'writing',
  '/tasks': 'tasks',
  '/logs': 'logs',
  '/meeting': 'meeting',
  '/noticeform': 'noticeForm',
  '/beginners': 'beginners',
  '/familyletters': 'familyLetters',
};

const getStudentPath = (name: string, _studentsList?: Student[]): string => {
  return `/students/${getShortHash(name)}`;
};

const getStudentNameFromParam = (param: string, studentsList: Student[]): string | null => {
  if (!param) return null;
  const decoded = decodeURIComponent(param);
  if (studentsList && studentsList.length > 0) {
    const foundByHash = studentsList.find(s => getShortHash(s.name) === decoded);
    if (foundByHash) return foundByHash.name;
    const foundByName = studentsList.find(s => s.name === decoded);
    if (foundByName) return foundByName.name;
  }
  if (/^\d+$/.test(decoded)) {
    const index = parseInt(decoded, 10) - 1;
    if (studentsList && index >= 0 && index < studentsList.length) {
      return studentsList[index].name;
    }
  }
  return decoded;
};

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<{ isConfigured: boolean; gasUrl?: string } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const savedTimestamp = sessionStorage.getItem('site_login_timestamp');
    if (savedTimestamp) {
      const elapsed = Date.now() - Number(savedTimestamp);
      return elapsed < 5 * 60 * 60 * 1000; // 5 hours in milliseconds
    }
    return false;
  });
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  
  const [studentEntrySource, setStudentEntrySource] = useState<'dashboard' | 'students'>('dashboard');

  // Derive activeTab from current URL pathname
  let activeTab = 'dashboard';
  const path = location.pathname;
  if (path.startsWith('/students')) {
    activeTab = 'students';
  } else if (path.startsWith('/writing')) {
    activeTab = 'writing';
  } else if (path.startsWith('/meeting')) {
    activeTab = 'meeting';
  } else if (path.startsWith('/noticeform')) {
    activeTab = 'noticeForm';
  } else if (path.startsWith('/beginners')) {
    activeTab = 'beginners';
  } else if (path.startsWith('/familyletters')) {
    activeTab = 'familyLetters';
  } else if (path.startsWith('/logs')) {
    activeTab = 'logs';
  } else if (path.startsWith('/tasks')) {
    activeTab = 'tasks';
  } else {
    activeTab = pathToTab[path] || 'dashboard';
  }

  // App work mode: 'sub' (보조모드), 'class' (수업모드) or 'work' (업무모드)
  const [appMode, setAppMode] = useState<'sub' | 'class' | 'work'>(() => {
    const cached = localStorage.getItem('webapp_app_mode') as 'sub' | 'class' | 'work';
    return cached || 'class';
  });

  // Helper to define mode categories
  const getModeByTab = (tab: string): 'sub' | 'class' | 'work' => {
    if (['writing', 'logs', 'noticeForm', 'beginners'].includes(tab)) {
      return 'sub';
    }
    if (['tasks', 'meeting', 'familyLetters'].includes(tab)) {
      return 'work';
    }
    return 'class';
  };

  // Automatically update and persist appMode & tabs whenever activeTab (URL-driven) shifts
  useEffect(() => {
    const computedMode = getModeByTab(activeTab);
    setAppMode(computedMode);
    localStorage.setItem('webapp_app_mode', computedMode);
    localStorage.setItem('webapp_active_tab', activeTab);
    
    if (computedMode === 'class') {
      localStorage.setItem('webapp_class_tab', activeTab);
      localStorage.setItem('webapp_class_path', location.pathname);
    } else if (computedMode === 'sub') {
      localStorage.setItem('webapp_sub_tab', activeTab);
      localStorage.setItem('webapp_sub_path', location.pathname);
    } else {
      localStorage.setItem('webapp_work_tab', activeTab);
      localStorage.setItem('webapp_work_path', location.pathname);
    }
  }, [activeTab, location.pathname]);

  // Restore last selected tab if accessing the root URL ('/')
  useEffect(() => {
    if (location.pathname === '/' || location.pathname === '') {
      const savedActiveTab = localStorage.getItem('webapp_active_tab');
      if (savedActiveTab && savedActiveTab !== 'dashboard') {
        const savedMode = localStorage.getItem('webapp_app_mode') || 'class';
        let savedPath = '';
        if (savedMode === 'class') {
          savedPath = localStorage.getItem('webapp_class_path') || '';
        } else if (savedMode === 'sub') {
          savedPath = localStorage.getItem('webapp_sub_path') || '';
        } else {
          savedPath = localStorage.getItem('webapp_work_path') || '';
        }
        if (savedPath && savedPath !== '/') {
          navigate(savedPath, { replace: true });
        } else {
          const path = tabToPath[savedActiveTab];
          if (path) {
            navigate(path, { replace: true });
          }
        }
      }
    }
  }, [location.pathname, navigate]);

  // Sync selectedStudent state based on location.pathname
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/students/') && path !== '/students') {
      const param = path.substring('/students/'.length);
      if (param) {
        const name = getStudentNameFromParam(param, data?.students || []);
        if (name) {
          if (selectedStudent !== name) {
            setSelectedStudent(name);
          }
        } else {
          const decoded = decodeURIComponent(param);
          if (selectedStudent !== decoded) {
            setSelectedStudent(decoded);
          }
        }
      }
    } else {
      if (path === '/students' || path === '/' || path === '/dashboard') {
        if (selectedStudent !== null) {
          setSelectedStudent(null);
        }
      }
    }
  }, [location.pathname, data?.students]);

  // Navigate to corresponding URL path on tab select
  const selectTab = (tab: string) => {
    const computedPath = tabToPath[tab] || '/';
    navigate(computedPath);
  };

  const handleModeChange = (mode: 'sub' | 'class' | 'work') => {
    if (appMode === mode) {
      if (mode === 'class') {
        navigate('/');
      } else if (mode === 'sub') {
        navigate('/logs');
      } else {
        navigate('/tasks');
      }
      setSelectedStudent(null);
      return;
    }

    let targetPath = '/';
    if (mode === 'class') {
      targetPath = localStorage.getItem('webapp_class_path') || '/';
    } else if (mode === 'sub') {
      targetPath = localStorage.getItem('webapp_sub_path') || '/logs';
    } else {
      targetPath = localStorage.getItem('webapp_work_path') || '/tasks';
    }
    navigate(targetPath);
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

  if (!isLoggedIn) {
    return (
      <>
        <LoginGate onLoginSuccess={() => {
          sessionStorage.setItem('site_login_timestamp', Date.now().toString());
          setIsLoggedIn(true);
        }} />
        <Toaster position="top-center" />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10">
      <Tabs value={activeTab} onValueChange={(val) => {
        selectTab(val);
        if (val !== 'dashboard' && val !== 'students') {
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
                    navigate('/students');
                  } else if (appMode === 'work') {
                    selectTab('tasks');
                  } else if (appMode === 'sub') {
                    selectTab('logs');
                  } else {
                    navigate('/');
                  }
                }} 
                onRefresh={fetchData} 
              />
            ) : (
              <Dashboard 
                data={data} 
                onRefresh={fetchData} 
                onSelectStudent={(name) => {
                  setStudentEntrySource('dashboard');
                  const targetPath = getStudentPath(name, data?.students || []);
                  navigate(targetPath);
                }}
                onNavigateToStudents={() => selectTab('students')}
              />
            )}
          </TabsContent>
          
          <TabsContent value="students" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-550 mt-0">
            {selectedStudent ? (
              <StudentDetail 
                studentName={selectedStudent} 
                data={data} 
                setData={setData}
                onBack={() => {
                  setSelectedStudent(null);
                  if (studentEntrySource === 'students') {
                    navigate('/students');
                  } else if (appMode === 'work') {
                    selectTab('tasks');
                  } else if (appMode === 'sub') {
                    selectTab('logs');
                  } else {
                    navigate('/');
                  }
                }} 
                onRefresh={fetchData} 
              />
            ) : (
              <StudentList 
                data={data} 
                onRefresh={fetchData} 
                onSelectStudent={(name) => {
                  setStudentEntrySource('students');
                  const targetPath = getStudentPath(name, data?.students || []);
                  navigate(targetPath);
                }} 
              />
            )}
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
          
          <TabsContent value="noticeForm" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-550 mt-0">
            <NoticeForm />
          </TabsContent>

          <TabsContent value="beginners" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-550 mt-0">
            <BeginnerFeedback />
          </TabsContent>

          <TabsContent value="familyLetters" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-550 mt-0">
            <FamilyLetters />
          </TabsContent>
        </div>
      </Tabs>

      <Toaster position="top-center" />
    </div>
  );
}
