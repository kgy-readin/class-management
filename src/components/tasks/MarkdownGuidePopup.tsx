import React from 'react';
import { X, HelpCircle } from 'lucide-react';

interface MarkdownGuidePopupProps {
  open: boolean;
  onClose: () => void;
}

export default function MarkdownGuidePopup({ open, onClose }: MarkdownGuidePopupProps) {
  if (!open) return null;

  const syntaxItems = [
    {
      category: '제목',
      items: [
        { syntax: '# 제목 1', preview: 'h1' },
        { syntax: '## 제목 2', preview: 'h2' },
        { syntax: '### 제목 3', preview: 'h3' },
      ],
    },
    {
      category: '목록 기호',
      items: [
        { syntax: '* 항목1', preview: 'bullet1' },
        { syntax: '- 항목2', preview: 'bullet2' },
        { syntax: '+ 항목3', preview: 'bullet3' },
      ],
    },
    {
      category: '텍스트 스타일',
      items: [
        { syntax: '**텍스트**', preview: 'bold' },
        { syntax: '__텍스트__', preview: 'underline' },
        { syntax: '_텍스트_', preview: 'italic' },
      ],
    },
    {
      category: '기타 스타일',
      items: [
        { syntax: '> 콜아웃', preview: 'callout' },
        { 
          syntax: (
            <span>
              ---<span className="text-zinc-400 font-light mx-1">/</span>***
            </span>
          ), 
          desc: '가로 구분선' 
        },
        { 
          syntax: (
            <span>
              ●<span className="text-zinc-400 font-light mx-1">/</span>■
            </span>
          ), 
          desc: '텍스트 파란색 강조' 
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-[2.5rem] border-none shadow-2xl p-6 pb-4 w-full max-w-[calc(100%-2rem)] sm:max-w-[420px] animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Close Button on top-right */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="pb-3 border-b border-solid border-zinc-100 flex items-center gap-2.5 select-none shrink-0">
          <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center">
            <HelpCircle className="w-[18px] h-[18px] text-blue-600" />
          </div>
          <div>
            <h3 className="text-[19px] font-bold text-zinc-800">마크다운 문법 가이드</h3>
          </div>
        </div>

        {/* Content (Scrollable) */}
        <div className="pt-5 overflow-y-auto custom-scrollbar space-y-6 flex-1 text-[13.5px]">
          {syntaxItems.map((sec, secIdx) => (
            <div key={secIdx} className="space-y-2.5">
              <h4 className="font-bold text-zinc-700 text-[15px] flex items-center gap-1.5 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                {sec.category}
              </h4>
              <div className="border border-zinc-100 rounded-none overflow-hidden bg-zinc-50/30">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 text-left text-zinc-500 font-medium text-[12px] border-b border-zinc-100 select-none">
                      <th className="p-2.5 pl-4 font-semibold w-2/5">입력 문법</th>
                      <th className="p-2.5 font-semibold w-3/5">설명 및 예시</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-sans">
                    {sec.items.map((item, itemIdx) => (
                      <tr key={itemIdx} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="p-2.5 pl-4 font-mono text-[12px] text-blue-600 select-all font-semibold break-all w-2/5">
                          {item.syntax}
                        </td>
                        <td className="p-2.5 text-zinc-600 w-3/5">
                          {item.desc ? (
                            <div className="font-normal text-[12.5px]">{item.desc}</div>
                          ) : (
                            <>
                              {item.preview === 'h1' && (
                                <span className="font-bold text-blue-600 text-[14px]">제목 1</span>
                              )}
                              {item.preview === 'h2' && (
                                <span className="font-bold text-blue-600 text-[13px]">제목 2</span>
                              )}
                              {item.preview === 'h3' && (
                                <span className="font-bold text-zinc-600 text-[12px]">제목 3</span>
                              )}
                              {item.preview === 'bullet1' && (
                                <span className="flex items-center gap-1.5 text-zinc-600">
                                  <span className="text-[5px] text-zinc-800 font-bold">●</span> 항목1
                                </span>
                              )}
                              {item.preview === 'bullet2' && (
                                <span className="flex items-center gap-1.5 text-zinc-500">
                                  <span className="text-[6px] text-zinc-500 font-bold font-sans">○</span> 항목2
                                </span>
                              )}
                              {item.preview === 'bullet3' && (
                                <span className="flex items-center gap-1.5 text-zinc-400">
                                  <span className="text-[6px] text-zinc-400 font-normal">■</span> 항목3
                                </span>
                              )}
                              {item.preview === 'bold' && (
                                <span className="font-semibold text-neutral-850">굵게 강조된 텍스트</span>
                              )}
                              {item.preview === 'underline' && (
                                <span className="underline decoration-neutral-400">밑줄이 그어진 텍스트</span>
                              )}
                              {item.preview === 'italic' && (
                                <span className="italic text-blue-500">파란색 기울임 텍스트</span>
                              )}
                              {item.preview === 'callout' && (
                                <div className="bg-zinc-100 text-[11px] text-zinc-600 rounded px-2 py-0.5 border-l-2 border-zinc-400 inline-block">
                                  콜아웃
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {/* 공백 세 줄 정도의 하단 여백 */}
          <div className="h-12" />
        </div>
      </div>
    </div>
  );
}
