import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Book } from '../../types';
import { Search, Hash, ChevronDown } from 'lucide-react';
import { formatLevel } from '@/lib/utils';

interface BookSearchProps {
  books: Book[];
  existingBookIds: string[];
  onSelect: (title: string) => void;
}

interface MultiSelectPopoverProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
}

function MultiSelectPopover({ label, options, selectedValues, onChange, placeholder }: MultiSelectPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getButtonText = () => {
    if (selectedValues.length === 0) return placeholder;

    if (label === '난이도') {
      const diffOrder = ['최상', '상', '중상', '중', '중하', '하', '최하'];
      const indices = selectedValues
        .map(val => diffOrder.indexOf(val))
        .filter(idx => idx !== -1)
        .sort((a, b) => a - b);

      if (indices.length === 0) return placeholder;

      const groups: number[][] = [];
      let currentGroup: number[] = [indices[0]];

      for (let i = 1; i < indices.length; i++) {
        if (indices[i] === indices[i - 1] + 1) {
          currentGroup.push(indices[i]);
        } else {
          groups.push(currentGroup);
          currentGroup = [indices[i]];
        }
      }
      groups.push(currentGroup);

      const formattedGroups = groups.map(group => {
        if (group.length === 1) {
          return diffOrder[group[0]];
        } else {
          return `${diffOrder[group[0]]}~${diffOrder[group[group.length - 1]]}`;
        }
      });

      return formattedGroups.join(', ');
    }

    // For categories/therapies etc, show all sorted by options order
    const sortedSelected = options.filter(opt => selectedValues.includes(opt));
    return sortedSelected.join(', ');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold focus:ring-1 ring-neutral-900 outline-none flex items-center justify-between text-left cursor-pointer w-full text-neutral-700 hover:border-neutral-300 transition-colors"
      >
        <span className="truncate">{getButtonText()}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform shrink-0 ml-1 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-neutral-200 shadow-xl rounded-2xl p-1.5 max-h-[220px] overflow-y-auto">
          {options.map((option) => {
            const isChecked = selectedValues.includes(option);
            return (
              <label
                key={option}
                className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-neutral-50 rounded-xl cursor-pointer transition-colors text-[13px] text-zinc-700 font-medium select-none"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {
                    if (isChecked) {
                      onChange(selectedValues.filter((v) => v !== option));
                    } else {
                      onChange([...selectedValues, option]);
                    }
                  }}
                  className="w-4 h-4 rounded border-neutral-300 text-primary focus:ring-primary cursor-pointer shrink-0"
                />
                <span className="truncate">{option}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BookSearch({ books, existingBookIds, onSelect }: BookSearchProps) {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [difficultyFilters, setDifficultyFilters] = useState<string[]>([]);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [therapyFilters, setTherapyFilters] = useState<string[]>([]);
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

    if (difficultyFilters.length > 0) {
      result = result.filter(book => book.difficulty && difficultyFilters.includes(book.difficulty));
    }

    if (categoryFilters.length > 0) {
      result = result.filter(book => book.category && categoryFilters.includes(book.category));
    }

    if (therapyFilters.length > 0) {
      result = result.filter(book => book.therapy && therapyFilters.includes(book.therapy));
    }

    if (requiredOnly) {
      result = result.filter(book => book.type && book.type.includes('필독'));
    }

    if (careerOnly) {
      result = result.filter(book => book.career && book.career.trim() !== '');
    } else {
      result = result.filter(book => !book.career || book.career.trim() === '');
    }

    return result.slice(0, 50); // Limit to 50 results for utility while scrolled
  }, [search, books, levelFilter, difficultyFilters, categoryFilters, therapyFilters, requiredOnly, careerOnly]);

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
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold focus:ring-1 ring-neutral-900 outline-none"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              <option value="all">모든 레벨</option>
              {levels.map(l => (
                <option key={l} value={l}>{formatLevel(l)}</option>
              ))}
            </select>
            
            <MultiSelectPopover
              label="난이도"
              options={difficulties}
              selectedValues={difficultyFilters}
              onChange={setDifficultyFilters}
              placeholder="모든 난이도"
            />

            <MultiSelectPopover
              label="영역"
              options={categories}
              selectedValues={categoryFilters}
              onChange={setCategoryFilters}
              placeholder="모든 영역"
            />

            <MultiSelectPopover
              label="테라피"
              options={therapies}
              selectedValues={therapyFilters}
              onChange={setTherapyFilters}
              placeholder="모든 테라피"
            />
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
            filteredBooks.map((book, idx) => {
              const isExisting = existingBookIds.includes(book.id);
              return (
                <button
                  key={`${book.id}-${book.title}-${idx}`}
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
        ) : (search.trim() || levelFilter !== 'all' || difficultyFilters.length > 0 || categoryFilters.length > 0 || therapyFilters.length > 0) ? (
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
