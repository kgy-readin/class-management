import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import Dashboard from './components/dashboard/Dashboard';
import StudentList from './components/students/StudentList';
import WritingStatusView from './components/writing/WritingStatusView';
import StudentDetail from './components/students/StudentDetail';
import { DashboardData } from './types/index';
import { BookOpen, Users, FileText, Settings, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dataApi } from '@/src/services/api';

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<{ isConfigured: boolean; gasUrl?: string } | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

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
        setActiveTab(val);
        if (val !== 'dashboard') {
          setSelectedStudent(null);
        }
      }} className="w-full">
        {/* Semi-transparent blurred top bar with navigation */}
        <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-border/20">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
            <div className="flex items-center gap-2 translate-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 p-0 hover:bg-transparent" 
                onClick={fetchData}
              >
                <Heart className="w-6 h-6 text-black fill-black" />
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Pill-style tabs moved to header */}
              <TabsList className="bg-[#f6f7f9] p-1 rounded-full border-none shadow-none h-10">
                <TabsTrigger value="dashboard" className="rounded-full px-3 h-full data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                  <BookOpen className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="students" className="rounded-full px-3 h-full data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                  <Users className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="writing" className="rounded-full px-3 h-full data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                  <FileText className="w-4 h-4" />
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {!config?.isConfigured && (
            <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-[2rem] text-amber-800">
              <div className="flex items-center gap-3 mb-2">
                <Settings className="w-5 h-5" />
                <h2 className="font-semibold">구글 시트 설정이 필요합니다</h2>
              </div>
              <p className="text-sm">
                애플리케이션을 사용하려면 GAS 웹 앱 URL 설정이 필요합니다.
              </p>
            </div>
          )}

          <TabsContent value="dashboard" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500 mt-0">
            {selectedStudent ? (
              <StudentDetail 
                studentName={selectedStudent} 
                data={data} 
                onBack={() => setSelectedStudent(null)} 
                onRefresh={fetchData} 
              />
            ) : (
              <Dashboard data={data} onRefresh={fetchData} onSelectStudent={setSelectedStudent} />
            )}
          </TabsContent>
          
          <TabsContent value="students" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500 mt-0">
            <StudentList data={data} onRefresh={fetchData} onSelectStudent={(name) => {
              setSelectedStudent(name);
              setActiveTab('dashboard');
            }} />
          </TabsContent>
          
          <TabsContent value="writing" className="focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500 mt-0">
            <WritingStatusView />
          </TabsContent>
        </div>
      </Tabs>

      <Toaster position="top-center" />
    </div>
  );
}
