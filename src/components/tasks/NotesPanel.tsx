import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Note } from '../../types';
import { toast } from 'sonner';
import { 
  Trash2, 
  Pencil, 
  Check, 
  Plus
} from 'lucide-react';
import { noteApi } from '@/src/services/api';

export default function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  
  // Edit mode toggle
  const [isAllNotesEditable, setIsAllNotesEditable] = useState(false);
  const [selectedNoteRowIndex, setSelectedNoteRowIndex] = useState<number | null>(null);

  // Edit / Add note forms
  const [editingNoteSheetRowIndex, setEditingNoteSheetRowIndex] = useState<number | null>(null);
  const [noteEditForm, setNoteEditForm] = useState({ parent: '', memo: '' });
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteAddForm, setNoteAddForm] = useState({ parent: '', memo: '' });
  const [addingChildOfParentRowIndex, setAddingChildOfParentRowIndex] = useState<number | null>(null);
  const [childNoteAddForm, setChildNoteAddForm] = useState({ parent: '', memo: '' });

  const fetchNotes = async () => {
    try {
      setNotesLoading(true);
      const result = await noteApi.get();
      setNotes(result);
    } catch (error: any) {
      toast.error('메모 데이터를 불러오는데 실패했습니다: ' + error.message);
    } finally {
      setNotesLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleAddNote = async () => {
    if (!noteAddForm.memo.trim()) {
      toast.error('메모 내용을 입력해 주세요.');
      return;
    }
    try {
      setNotesLoading(true);
      await noteApi.add({ parent: '', memo: noteAddForm.memo.trim() });
      toast.success('메모가 성공적으로 추가되었습니다.');
      setIsAddingNote(false);
      setNoteAddForm({ parent: '', memo: '' });
      await fetchNotes();
    } catch (e: any) {
      toast.error('메모를 추가하는 도중 에러가 발생했습니다: ' + e.message);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleAddChildNote = async () => {
    if (!childNoteAddForm.memo.trim()) {
      toast.error('하위 메모 내용을 입력해 주세요.');
      return;
    }
    try {
      setNotesLoading(true);
      await noteApi.add({ parent: childNoteAddForm.parent, memo: childNoteAddForm.memo.trim() });
      toast.success('하위 메모가 성공적으로 추가되었습니다.');
      setAddingChildOfParentRowIndex(null);
      setChildNoteAddForm({ parent: '', memo: '' });
      setSelectedNoteRowIndex(null);
      await fetchNotes();
    } catch (e: any) {
      toast.error('하위 메모를 추가하는 도중 에러가 발생했습니다: ' + e.message);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleUpdateNote = async (sheetRowIndex: number, originalNote: Note) => {
    const trimmedMemo = noteEditForm.memo.trim();
    if (!trimmedMemo) {
      toast.error('메모 내용을 입력해 주세요.');
      return;
    }
    try {
      setNotesLoading(true);
      const oldMemo = originalNote.memo;
      const isParent = !originalNote.parent;

      if (isParent && oldMemo && oldMemo !== trimmedMemo) {
        const updatedNotes = notes.map(n => {
          if (n.sheetRowIndex === sheetRowIndex) {
            return { parent: '', memo: trimmedMemo };
          }
          if (n.parent === oldMemo) {
            return { parent: trimmedMemo, memo: n.memo };
          }
          return { parent: n.parent || '', memo: n.memo || '' };
        });
        await noteApi.saveAll(updatedNotes);
      } else {
        await noteApi.update(sheetRowIndex, { parent: originalNote.parent || '', memo: trimmedMemo });
      }

      toast.success('메모가 성공적으로 수정되었습니다.');
      setEditingNoteSheetRowIndex(null);
      setSelectedNoteRowIndex(null);
      await fetchNotes();
    } catch (e: any) {
      toast.error('메모를 수정하는 도중 에러가 발생했습니다: ' + e.message);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleDeleteNote = async (sheetRowIndex: number) => {
    try {
      setNotesLoading(true);
      await noteApi.remove(sheetRowIndex);
      toast.success('메모가 삭제되었습니다.');
      setEditingNoteSheetRowIndex(null);
      setSelectedNoteRowIndex(null);
      await fetchNotes();
    } catch (e: any) {
      toast.error('메모를 삭제하는 도중 에러가 발생했습니다: ' + e.message);
    } finally {
      setNotesLoading(false);
    }
  };

  const parentNotes = notes.filter(n => !n.parent || n.parent.trim() === '');
  const childNotes = notes.filter(n => n.parent && n.parent.trim() !== '');
  const orphanNotes = childNotes.filter(cn => !parentNotes.some(pn => pn.memo === cn.parent));

  return (
    <div className="w-full lg:w-[296px] shrink-0 flex flex-col gap-4">
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-border/40 flex-1 flex flex-col">
        <div className="flex items-center justify-between pb-2 border-b border-border/40 mb-3 select-none">
          <h3 className="text-base font-semibold text-[#505358]">노트</h3>
          <div className="flex items-center gap-1.5 animate-in fade-in duration-100">
            {notesLoading && (
              <span className="text-[10px] text-neutral-400 animate-pulse font-sans mr-0.5">저장 중...</span>
            )}
            
            {isAllNotesEditable && selectedNoteRowIndex !== null && (
              <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-1 duration-150 mr-1.5">
                {(() => {
                  const selNote = notes.find(n => n.sheetRowIndex === selectedNoteRowIndex);
                  const isParent = selNote ? (!selNote.parent || selNote.parent.trim() === '') : false;
                  if (!isParent) return null;
                  return (
                    <button
                      onClick={() => {
                        setAddingChildOfParentRowIndex(selectedNoteRowIndex);
                        setChildNoteAddForm({ parent: selNote!.memo, memo: '' });
                      }}
                      className="h-7 px-2.5 text-[11px] font-semibold bg-neutral-100 hover:bg-neutral-200 text-[#505358] rounded-full flex items-center gap-0.5 transition-colors cursor-pointer"
                      title="하위 항목 추가"
                    >
                      <Plus className="w-3.5 h-3.5 text-neutral-500" />
                      <span>추가</span>
                    </button>
                  );
                })()}
                
                <button
                  onClick={() => {
                    const selNote = notes.find(n => n.sheetRowIndex === selectedNoteRowIndex);
                    if (selNote) {
                      setEditingNoteSheetRowIndex(selectedNoteRowIndex);
                      setNoteEditForm({ parent: selNote.parent || '', memo: selNote.memo || '' });
                    }
                  }}
                  className="h-7 px-2.5 text-[11px] font-semibold bg-neutral-100 hover:bg-neutral-200 text-[#505358] rounded-full flex items-center gap-0.5 transition-colors cursor-pointer"
                  title="메모 수정"
                >
                  <Pencil className="w-3 h-3 text-neutral-500" />
                  <span>수정</span>
                </button>

                <button
                  onClick={async () => {
                    if (window.confirm("선택한 메모를 삭제하시겠습니까?")) {
                      await handleDeleteNote(selectedNoteRowIndex);
                    }
                  }}
                  className="h-7 px-2.5 text-[11px] font-semibold bg-red-50 hover:bg-red-100 text-red-600 rounded-full flex items-center gap-0.5 transition-colors cursor-pointer"
                  title="메모 삭제"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>삭제</span>
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setIsAllNotesEditable(prev => {
                  const next = !prev;
                  if (!next) {
                    setSelectedNoteRowIndex(null);
                    setEditingNoteSheetRowIndex(null);
                    setAddingChildOfParentRowIndex(null);
                  }
                  return next;
                });
              }}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
                isAllNotesEditable 
                  ? 'bg-neutral-700 text-white hover:bg-neutral-800' 
                  : 'bg-neutral-100 text-[#505358] hover:bg-neutral-200'
              }`}
              title={isAllNotesEditable ? '관리 완료' : '메모 관리 및 편집'}
            >
              {isAllNotesEditable ? <Check className="w-4 h-4" /> : <Pencil className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 max-h-[250px] lg:max-h-none overflow-y-auto custom-scrollbar pr-1 bg-white">
          {notes.length === 0 && !isAddingNote ? (
            <div className="py-12 text-center text-xs text-neutral-400 bg-neutral-50/50 rounded-xl border border-dashed border-border/30">
              등록된 메모가 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Parent and Nested Child notes */}
              {parentNotes.map((parentNote, idx) => {
                const isParentEditing = editingNoteSheetRowIndex === parentNote.sheetRowIndex;
                const parentChildren = childNotes.filter(c => c.parent === parentNote.memo);
                const isAddingChild = addingChildOfParentRowIndex === parentNote.sheetRowIndex;

                return (
                  <div key={parentNote.sheetRowIndex || `p-${idx}`} className="space-y-1">
                    {/* Parent Note */}
                    {isParentEditing ? (
                      <div className="p-2.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2 animate-in fade-in duration-150">
                        <textarea
                          value={noteEditForm.memo}
                          onChange={(e) => setNoteEditForm(prev => ({ ...prev, memo: e.target.value }))}
                          placeholder="메모 내용을 입력하세요."
                          className="w-full min-h-[50px] p-2 bg-white border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs rounded-lg resize-none font-sans"
                        />
                        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-neutral-100">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('정말 이 메모를 삭제하시겠습니까?')) {
                                handleDeleteNote(parentNote.sheetRowIndex!);
                              }
                            }}
                            className="h-6.5 text-[10.5px] text-red-500 hover:text-red-600 hover:bg-neutral-100/50 px-2 rounded-md"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            삭제
                          </Button>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingNoteSheetRowIndex(null);
                                setSelectedNoteRowIndex(null);
                              }}
                              className="h-6.5 text-[10.5px] text-neutral-500 hover:bg-neutral-100 px-2 rounded-md"
                            >
                              취소
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateNote(parentNote.sheetRowIndex!, parentNote)}
                              className="h-6.5 text-[10.5px] font-semibold bg-primary text-white hover:bg-primary/95 px-2.5 rounded-md"
                            >
                              저장
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="group relative flex items-start py-0.5 bg-white transition-colors pl-0.5">
                        {isAllNotesEditable ? (
                          <input 
                            type="checkbox"
                            checked={selectedNoteRowIndex === parentNote.sheetRowIndex}
                            onChange={(e) => {
                              setSelectedNoteRowIndex(e.target.checked ? parentNote.sheetRowIndex! : null);
                            }}
                            className="mt-[3px] mr-3 h-[15px] w-[15px] rounded border-neutral-300 text-primary focus:ring-primary cursor-pointer shrink-0 transition-all accent-primary font-sans"
                          />
                        ) : (
                          /* Bullet alignment and spacing identical */
                          <div className="h-5 w-4 flex items-center justify-center shrink-0 mr-3 select-none">
                            <span className="text-[16px] text-neutral-800 font-bold leading-none select-none">
                              •
                            </span>
                          </div>
                        )}
                        <div className="flex-1 overflow-hidden min-w-0 pr-0">
                          <p className="text-[14px] leading-relaxed break-all whitespace-pre-line font-sans text-neutral-700 font-semibold">
                            {parentNote.memo}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Children Notes */}
                    {parentChildren.length > 0 && (
                      <div className="space-y-1">
                        {parentChildren.map((childNote, cIdx) => {
                          const isChildEditing = editingNoteSheetRowIndex === childNote.sheetRowIndex;

                          if (isChildEditing) {
                            return (
                              <div key={childNote.sheetRowIndex || `c-${cIdx}`} className="ml-4 pl-0.5 p-2 rounded-xl border border-primary/20 bg-primary/5 space-y-2 animate-in fade-in duration-150">
                                <textarea
                                  value={noteEditForm.memo}
                                  onChange={(e) => setNoteEditForm(prev => ({ ...prev, memo: e.target.value }))}
                                  placeholder="메모 내용을 입력하세요."
                                  className="w-full min-h-[50px] p-2 bg-white border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs rounded-lg resize-none font-sans"
                                />
                                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-neutral-100">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      if (confirm('정말 이 메모를 삭제하시겠습니까?')) {
                                        handleDeleteNote(childNote.sheetRowIndex!);
                                      }
                                    }}
                                    className="h-6.5 text-[10.5px] text-red-500 hover:text-red-600 hover:bg-neutral-100/50 px-2 rounded-md"
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    삭제
                                  </Button>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingNoteSheetRowIndex(null);
                                        setSelectedNoteRowIndex(null);
                                      }}
                                      className="h-6.5 text-[10.5px] text-neutral-500 hover:bg-neutral-100 px-2 rounded-md"
                                    >
                                      취소
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateNote(childNote.sheetRowIndex!, childNote)}
                                      className="h-6.5 text-[10.5px] font-semibold bg-primary text-white hover:bg-primary/95 px-2.5 rounded-md"
                                    >
                                      저장
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={childNote.sheetRowIndex || `c-${cIdx}`}
                              className="group relative flex items-start py-0.5 bg-white transition-colors ml-4 pl-0.5"
                            >
                              {isAllNotesEditable ? (
                                <input 
                                  type="checkbox"
                                  checked={selectedNoteRowIndex === childNote.sheetRowIndex}
                                  onChange={(e) => {
                                    setSelectedNoteRowIndex(e.target.checked ? childNote.sheetRowIndex! : null);
                                  }}
                                  className="mt-[3px] mr-3 h-[15px] w-[15px] rounded border-neutral-300 text-primary focus:ring-primary cursor-pointer shrink-0 transition-all accent-primary font-sans"
                                />
                              ) : (
                                /* Bullet alignment and spacing identical */
                                <div className="h-5 w-4 flex items-center justify-center shrink-0 mr-3 select-none">
                                  <span className="text-[12px] text-neutral-500 font-bold leading-none select-none">
                                    ◦
                                  </span>
                                </div>
                              )}
                              <div className="flex-1 overflow-hidden min-w-0 pr-0">
                                <p className="text-[14px] leading-relaxed break-all whitespace-pre-line font-sans text-neutral-600 font-normal">
                                  {childNote.memo}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Inline Adding Child Form */}
                    {isAddingChild && (
                      <div className="ml-4 pl-0.5 p-2 rounded-xl border border-primary/20 bg-primary/5 space-y-2 animate-in slide-in-from-top-2 duration-155">
                        <textarea
                          value={childNoteAddForm.memo}
                          onChange={(e) => setChildNoteAddForm(prev => ({ ...prev, memo: e.target.value }))}
                          placeholder="하위 메모 내용을 입력하세요."
                          className="w-full min-h-[45px] p-2 bg-white border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs rounded-lg resize-none font-sans"
                        />
                        <div className="flex justify-end gap-1 pt-1 border-t border-neutral-100">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAddingChildOfParentRowIndex(null);
                              setSelectedNoteRowIndex(null);
                            }}
                            className="h-6 text-[10.5px] text-neutral-500 hover:bg-neutral-100 px-2 rounded-md"
                          >
                            취소
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleAddChildNote}
                            className="h-6 text-[10.5px] font-semibold bg-primary text-white hover:bg-primary/95 px-2.5 rounded-md"
                          >
                            추가
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Orphan Child Notes */}
              {orphanNotes.length > 0 && (
                <div className="mt-4 pt-2 border-t border-dashed border-neutral-100 space-y-1">
                  <div className="text-[11px] text-neutral-400 font-medium font-sans pl-1.5 mb-1">설정되지 않은 하위 메모</div>
                  {orphanNotes.map((orphanNote, oIdx) => {
                    const isOrphanEditing = editingNoteSheetRowIndex === orphanNote.sheetRowIndex;

                    if (isOrphanEditing) {
                      return (
                        <div key={orphanNote.sheetRowIndex || `o-${oIdx}`} className="p-2.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2 animate-in fade-in duration-150">
                          <textarea
                            value={noteEditForm.memo}
                            onChange={(e) => setNoteEditForm(prev => ({ ...prev, memo: e.target.value }))}
                            placeholder="메모 내용을 입력하세요."
                            className="w-full min-h-[50px] p-2 bg-white border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs rounded-lg resize-none font-sans"
                          />
                          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-neutral-100">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm('정말 이 메모를 삭제하시겠습니까?')) {
                                  handleDeleteNote(orphanNote.sheetRowIndex!);
                                }
                              }}
                              className="h-6.5 text-[10.5px] text-red-500 hover:text-red-600 hover:bg-neutral-100/50 px-2 rounded-md"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              삭제
                            </Button>
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingNoteSheetRowIndex(null);
                                  setSelectedNoteRowIndex(null);
                                }}
                                className="h-6.5 text-[10.5px] text-neutral-500 hover:bg-neutral-100 px-2 rounded-md"
                              >
                                취소
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateNote(orphanNote.sheetRowIndex!, orphanNote)}
                                className="h-6.5 text-[10.5px] font-semibold bg-primary text-white hover:bg-primary/95 px-2.5 rounded-md"
                              >
                                저장
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={orphanNote.sheetRowIndex || `o-${oIdx}`}
                        className="group relative flex items-start py-0.5 bg-white transition-colors pl-0.5"
                      >
                        {isAllNotesEditable ? (
                          <input 
                            type="checkbox"
                            checked={selectedNoteRowIndex === orphanNote.sheetRowIndex}
                            onChange={(e) => {
                              setSelectedNoteRowIndex(e.target.checked ? orphanNote.sheetRowIndex! : null);
                            }}
                            className="mt-[3px] mr-3 h-[15px] w-[15px] rounded border-neutral-300 text-primary focus:ring-primary cursor-pointer shrink-0 transition-all accent-primary font-sans"
                          />
                        ) : (
                          /* Bullet alignment and spacing identical */
                          <div className="h-5 w-4 flex items-center justify-center shrink-0 mr-3 select-none">
                            <span className="text-[12px] text-neutral-500 font-bold leading-none select-none">
                              ◦
                            </span>
                          </div>
                        )}
                        <div className="flex-1 overflow-hidden min-w-0 pr-0">
                          <p className="text-[14px] leading-relaxed break-all whitespace-pre-line font-sans text-neutral-600 font-normal">
                            {orphanNote.memo}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Bottom Adding Parent Form */}
          {isAddingNote && (
            <div className="p-2.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2 animate-in slide-in-from-bottom-2 duration-200 mt-2">
              <textarea
                value={noteAddForm.memo}
                onChange={(e) => setNoteAddForm(prev => ({ ...prev, memo: e.target.value }))}
                placeholder="새 메모 내용을 입력하세요."
                className="w-full min-h-[50px] p-2 bg-white border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-xs rounded-lg resize-none font-sans"
              />
              <div className="flex justify-end gap-1.5 pt-1 border-t border-neutral-100">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsAddingNote(false)}
                  className="h-6.5 text-[10.5px] text-neutral-500 hover:bg-neutral-100 px-2.5 rounded-md"
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  className="h-6.5 text-[10.5px] font-semibold bg-primary text-white hover:bg-primary/95 px-3 rounded-md"
                >
                  추가
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Add Memo Trigger */}
        {!isAddingNote && isAllNotesEditable && (
          <button
            onClick={() => {
              setIsAddingNote(true);
              setNoteAddForm({ parent: '', memo: '' });
            }}
            className="w-full py-1.5 flex items-center justify-center rounded-lg border border-dashed border-border/50 hover:bg-neutral-50 text-neutral-400 hover:text-neutral-700 transition-all bg-white mt-3 shrink-0"
            title="메모 추가"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
