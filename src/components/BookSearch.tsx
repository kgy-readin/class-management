import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Book } from '../types';
import { Search, Hash } from 'lucide-react';

interface BookSearchProps {
  books: Book[];
  onSelect: (title: string) => void;
}

export default function BookSearch({ books, onSelect }: BookSearchProps) {
  const [search, setSearch] = useState('');

  const filteredBooks = useMemo(() => {
    if (!search.trim()) return [];
    
    const normalizedSearch = search.replace(/\s/g, '').toLowerCase();
    
    return books.filter(book => {
      const normalizedTitle = book.title.replace(/\s/g, '').toLowerCase();
      return normalizedTitle.includes(normalizedSearch);
    }).slice(0, 20); // Limit to 20 results for performance
  }, [search, books]);

  return (
    <div className="space-y-4 py-4">
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

      <ScrollArea className="h-[300px] rounded-xl border border-neutral-100 bg-neutral-50/50">
        <div className="p-2 space-y-1">
          {filteredBooks.length > 0 ? (
            filteredBooks.map((book) => (
              <button
                key={book.id}
                onClick={() => onSelect(book.title)}
                className="w-full text-left p-3 rounded-lg hover:bg-white hover:shadow-sm transition-all group border border-transparent hover:border-neutral-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-neutral-900 group-hover:text-neutral-900 transition-colors">
                    {book.title}
                  </p>
                  <Badge variant="outline" className="text-[10px] bg-white">
                    Lv.{book.level}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  {book.difficulty && (
                    <span className="text-[10px] text-neutral-500 flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5" />{book.difficulty}
                    </span>
                  )}
                  {book.category && (
                    <span className="text-[10px] text-neutral-500 flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5" />{book.category}
                    </span>
                  )}
                  {book.therapy && (
                    <span className="text-[10px] text-neutral-500 flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5" />{book.therapy}
                    </span>
                  )}
                  {book.audio && (
                    <span className="text-[10px] text-neutral-500 flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5" />{book.audio}
                    </span>
                  )}
                  {book.type && (
                    <span className="text-[10px] text-neutral-500 flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5" />{book.type}
                    </span>
                  )}
                </div>
              </button>
            ))
          ) : search.trim() ? (
            <div className="py-10 text-center text-neutral-400">
              <p className="text-sm">검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="py-10 text-center text-neutral-400">
              <p className="text-sm">도서명을 입력하여 검색하세요.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
