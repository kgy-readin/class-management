import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface Student {
  name: string;
  [key: string]: any;
}

interface StudentComboboxProps {
  students: Student[] | string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function StudentCombobox({
  students,
  value,
  onChange,
  placeholder = '학생 선택 또는 직접 입력',
  className = '',
  inputClassName = '',
  size = 'md'
}: StudentComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync state with parent value
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Convert students prop to array of strings
  const studentNames = Array.isArray(students)
    ? students.map(s => (typeof s === 'string' ? s : s.name))
    : [];

  // Filter students based on modern autocomplete match
  const filteredStudents = studentNames.filter(name =>
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If search term is finished but not empty, bubble it as custom typed text
        if (searchTerm !== value) {
          onChange(searchTerm);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchTerm, value, onChange]);

  const handleSelect = (name: string) => {
    onChange(name);
    setSearchTerm(name);
    setIsOpen(false);
  };

  const handleInputChange = (val: string) => {
    setSearchTerm(val);
    if (!isOpen) setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onChange(searchTerm);
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
  };

  const sizeClasses = {
    sm: 'h-8 text-xs px-2 rounded-lg',
    md: 'h-10 text-sm px-3 rounded-xl',
    lg: 'h-11 text-base px-4 rounded-2xl'
  };

  const inputHeight = size === 'sm' ? 'h-8' : size === 'lg' ? 'h-11' : 'h-10';

  return (
    <div ref={containerRef} className={`relative inline-block w-full text-left font-sans ${className}`}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          onClick={() => setIsOpen(true)}
          className={`w-full bg-white border border-neutral-200 text-zinc-850 font-medium focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 hover:border-neutral-300 transition-all pr-12 ${sizeClasses[size]} ${inputClassName}`}
        />
        
        {/* Actions inside input area */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-zinc-400 hover:text-zinc-650 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-zinc-400 hover:text-zinc-650 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[9999] mt-1 w-full rounded-xl bg-white border border-neutral-100 shadow-xl overflow-hidden animate-in fade-in duration-100 slide-in-from-top-1">
          <ul className="max-h-48 overflow-y-auto divide-y divide-solid divide-neutral-50/50">
            {filteredStudents.length === 0 ? (
              <li className="px-4 py-2.5 text-xs font-semibold text-zinc-450 italic text-center bg-white select-none">
                일치하는 학생이 없습니다
              </li>
            ) : (
              filteredStudents.map((name) => (
                <li
                  key={name}
                  onClick={() => handleSelect(name)}
                  className={`px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-50 cursor-pointer font-medium select-none transition-colors ${
                    value === name ? 'bg-primary/5 text-primary font-bold' : ''
                  }`}
                >
                  {name}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
