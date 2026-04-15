import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Book } from '../../types';
import { Search, Hash } from 'lucide-react';
import { formatLevel } from '@/lib/utils';

interface BookSearchProps {
  books: Book[];
  existingBookTitles: string[];
  onSelect: (title: string) => void;
}

export default function BookSearch({ books, existingBookTitles, onSelect }: BookSearchProps) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [therapyFilter, setTherapyFilter] = useState('all');
  const [requiredOnly, setRequiredOnly] = useState(false);
  const [careerOnly, setCareerOnly] = useState(false);

  const levels = useMemo(() => {
    const uniqueLevels = Array.from(new Set(books.map(b => String(b.level)))).filter(l => l !== 'undefined' && l !== 'null');
    return uniqueLevels.sort((a, b) => Number(a) - Number(b));
  }, [books]);

  const difficulties = useMemo(() => {
    const uniqueDiffs = Array.from(new Set(books.map(b => b.difficulty))).filter(Boolean);
    const order = ['최상', '상', '중상', '중', '중하', '하', '최하'];
    return uniqueDiffs.sort((a, b) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [books]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(books.map(b => b.category))).filter(Boolean);
    const order = ['문학', '인문', '사회', '과학', '예술'];
    return unique.sort((a, b) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [books]);

  const therapies = useMemo(() => {
    const unique = Array.from(new Set(books.map(b => b.therapy))).filter(Boolean);
    const order = ['어휘', '사실', '추론', '비판'];
    return unique.sort((a, b) => {
      const indexA = order.indexOf(a);
      const indexB = order.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [books]);

  const filteredBooks = useMemo(() => {
    let result = books;
    
    if (search.trim()) {
      const normalizedSearch = search.replace(/\s/g, '').toLowerCase();
      result = result.filter(book => {
        const normalizedTitle = book.title.replace(/\s/g, '').toLowerCase();
        return normalizedTitle.includes(normalizedSearch);
      });
    }

    if (levelFilter !== 'all') {
      result = result.filter(book => String(book.level) === levelFilter);
    }

    if (difficultyFilter !== 'all') {
      result = result.filter(book => book.difficulty === difficultyFilter);
    }

    if (categoryFilter !== 'all') {
      result = result.filter(book => book.category === categoryFilter);
    }

    if (therapyFilter !== 'all') {
      result = result.filter(book => book.therapy === therapyFilter);
    }

    if (requiredOnly) {
      result = result.filter(book => book.type && book.type.includes('필독'));
    }

    if (careerOnly) {
      result = result.filter(book => book.career && book.career.trim() !== '');
    }

    return result.slice(0, 20); // Limit to 20 results for performance
  }, [search, books, levelFilter, difficultyFilter, categoryFilter, therapyFilter, requiredOnly, careerOnly]);

  return (
    <div className="space-y-4 py-4 -mt-[28px]">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="도서명을 입력하세요 (공백 무관)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 rounded-xl border-neutral-200 focus:ring-neutral-900"
            autoFocus
          />
        </div>
        
        <div className="flex gap-4 items-start">
          <div className="grid grid-cols-2 gap-2 flex-1">
            <select 
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium focus:ring-1 ring-neutral-900 outline-none"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              <option value="all">모든 레벨</option>
              {levels.map(l => (
                <option key={l} value={l}>{formatLevel(l)}</option>
              ))}
            </select>
            
            <select 
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium focus:ring-1 ring-neutral-900 outline-none"
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
            >
              <option value="all">모든 난이도</option>
              {difficulties.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select 
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium focus:ring-1 ring-neutral-900 outline-none"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">모든 영역</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select 
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium focus:ring-1 ring-neutral-900 outline-none"
              value={therapyFilter}
              onChange={(e) => setTherapyFilter(e.target.value)}
            >
              <option value="all">모든 테라피</option>
              {therapies.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 pr-2">
            <label className="flex items-center gap-2 cursor-pointer group h-10 shrink-0">
              <input 
                type="checkbox" 
                checked={requiredOnly} 
                onChange={(e) => setRequiredOnly(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-primary focus:ring-primary cursor-pointer"
              />
              <span className="text-xs font-semibold text-neutral-600 group-hover:text-neutral-900 transition-colors">필독</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group h-10 shrink-0">
              <input 
                type="checkbox" 
                checked={careerOnly} 
                onChange={(e) => setCareerOnly(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-primary focus:ring-primary cursor-pointer"
              />
              <span className="text-xs font-semibold text-neutral-600 group-hover:text-neutral-900 transition-colors">진로</span>
            </label>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[300px] rounded-xl border border-neutral-100 bg-neutral-50/50">
        <div className="p-2 space-y-1">
          {filteredBooks.length > 0 ? (
            filteredBooks.map((book) => {
              const isExisting = existingBookTitles.includes(book.title);
              return (
                <button
                  key={book.id}
                  onClick={() => onSelect(book.title)}
                  className={`w-full text-left p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all group border border-transparent hover:border-neutral-200 ${
                    isExisting ? 'bg-primary/5 opacity-80' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className={`font-bold text-[13px] group-hover:text-neutral-900 transition-colors ${
                      isExisting ? 'text-primary' : 'text-neutral-900'
                    }`}>
                      {book.title}
                      <span className="ml-2 text-[11px] font-normal text-neutral-400">#{book.id}</span>
                    </p>
                    <Badge variant="outline" className={`text-[10px] h-5 px-1.5 bg-white ${
                      isExisting ? 'border-primary/30 text-primary' : ''
                    }`}>
                      {formatLevel(book.level)}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                  {book.difficulty && (
                    <span className="text-[11px] text-neutral-500 flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5" />{book.difficulty}
                    </span>
                  )}
                  {book.category && (
                    <span className="text-[11px] text-neutral-500 flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5" />{book.category}
                    </span>
                  )}
                  {book.therapy && (
                    <span className="text-[11px] text-neutral-500 flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5" />{book.therapy}
                    </span>
                  )}
                  {book.audio && (
                    <span className="text-[11px] text-neutral-500 flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5" />{book.audio}
                    </span>
                  )}
                  {book.type && (
                    <span className="text-[11px] text-neutral-500 flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5" />{book.type}
                    </span>
                  )}
                  {book.career && (
                    <span className="text-[11px] text-neutral-500 flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5" />{book.career}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        ) : (search.trim() || levelFilter !== 'all' || difficultyFilter !== 'all' || categoryFilter !== 'all' || therapyFilter !== 'all') ? (
            <div className="py-10 text-center text-neutral-400">
              <p className="text-sm">검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="py-10 text-center text-neutral-400">
              <p className="text-sm">도서명 입력 또는 필터를 선택하세요.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
