import { Card, CardContent } from '@/components/ui/card';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

interface StudentLogChartsProps {
  pieData: Array<{ name: string; value: number }>;
  trendData: Array<{ name: string; '기록 수': number }>;
  CAT_HEX_COLORS: Record<string, string>;
}

export default function StudentLogCharts({ pieData, trendData, CAT_HEX_COLORS }: StudentLogChartsProps) {
  return (
    <div className="hidden lg:block space-y-4">
      {/* Category Pie Chart Card */}
      <Card className="rounded-[2rem] border-none ring-0 shadow-sm bg-white overflow-hidden" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
        <div className="px-5 py-4 border-b border-solid border-zinc-100 flex items-center gap-2" style={{ paddingTop: '12px', paddingBottom: '12px' }}>
          <span className="text-[15px] font-semibold uppercase text-zinc-800 tracking-wider">유형별 기록</span>
        </div>
        <CardContent className="p-4 flex flex-col items-center justify-center h-[230px]" style={{ paddingTop: '8px' }}>
          {pieData.length === 0 ? (
            <div className="text-zinc-500 text-[14px] text-center py-10 font-medium">기록 데이터가 없습니다.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={80}
                  paddingAngle={0}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={CAT_HEX_COLORS[entry.name] || '#a1a1aa'} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    fontSize: 12, 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)' 
                  }} 
                  itemStyle={{ color: '#3f3f46', fontWeight: 500 }}
                  labelStyle={{ color: '#3f3f46', fontWeight: 600 }}
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ color: '#3f3f46', fontWeight: 500, fontSize: '12px' }} className="select-none">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Line trend card */}
      <Card className="rounded-[2rem] border-none ring-0 shadow-sm bg-white overflow-hidden" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
        <div className="px-5 py-4 border-b border-solid border-zinc-100 flex items-center gap-2" style={{ paddingTop: '12px', paddingBottom: '12px' }}>
          <span className="text-[15px] font-semibold uppercase text-zinc-800 tracking-wider">월별 기록</span>
        </div>
        <CardContent className="p-4 flex flex-col items-center justify-center h-[230px]" style={{ paddingTop: '8px' }}>
          {trendData.length === 0 ? (
            <div className="text-zinc-500 text-[14px] text-center py-10 font-medium">기록 데이터가 없습니다.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 15, right: 15, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 11, fontWeight: 500, fill: '#3f3f46' }} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  allowDecimals={false}
                  tick={{ fontSize: 11, fontWeight: 500, fill: '#3f3f46' }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    fontSize: 11, 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06)' 
                  }} 
                  itemStyle={{ color: '#3f3f46', fontWeight: 500 }}
                  labelStyle={{ color: '#3f3f46', fontWeight: 600 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="기록 수" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }} 
                  dot={{ r: 5, strokeWidth: 2, stroke: '#ffffff', fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
