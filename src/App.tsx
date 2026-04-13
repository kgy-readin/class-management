import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import WritingStatusView from './components/WritingStatusView';
import StudentDetail from './components/StudentDetail';
import { DashboardData } from './types';
import { BookOpen, Users, FileText, Settings, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<{ isConfigured: boolean; gasUrl?: string } | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const configRes = await fetch('/api/config');
      const configData = await configRes.json();
      setConfig(configData);

      if (configData.isConfigured) {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error('Failed to fetch data');
        const result = await response.json();
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
      <Tabs defaultValue="dashboard" className="w-full" onValueChange={() => setSelectedStudent(null)}>
        {/* Semi-transparent blurred top bar with navigation */}
        <header className="sticky top-0 z-50 w-full bg-white/60 backdrop-blur-xl border-b border-border/20">
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
              <TabsList className="bg-[#F7F9FF] p-1 rounded-full border-none shadow-none h-10">
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
                <h2 className="font-bold">구글 시트 설정이 필요합니다</h2>
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
            <StudentList data={data} onRefresh={fetchData} />
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
