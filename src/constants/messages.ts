/**
 * Centralized notification, alert, and tooltip/hover title messages template file.
 * Edit user-facing alert, success, error, and button hover title strings here.
 */

export const MESSAGES = {
  // General UI Messages
  general: {
    homeNavigation: '홈 화면으로 이동했습니다.',
    loadError: (msg: string) => `데이터를 불러오는데 실패했습니다: ${msg}`,
    copySuccess: '클립보드에 복사되었습니다!',
    copyFailure: '복사에 실패했습니다.',
    actionError: (msg: string) => msg || '오류가 발생했습니다.',
  },

  // Auth / Login Messages
  auth: {
    loginSuccess: '성공적으로 로그인되었습니다.',
    wrongPassword: '비밀번호가 일치하지 않습니다.',
  },

  // 1. Student Cards & Dashboard Messages
  dashboard: {
    subprogramUpdated: '서브프로그램이 업데이트되었습니다.',
    writingTrackerAdded: '글쓰기 현황에 추가되었습니다.',
    dismissalSuccess: (name: string) => `${name} 학생이 하원하였습니다.`,
    homeworkDone: '숙제 완료 처리되었습니다.',
    homeworkNotSubmitted: '숙제 미제출 건이 기록되었습니다.',
    progressUpdated: '진도가 업데이트되었습니다.',
    attendanceSaveError: (msg: string) => `출결 저장 실패: ${msg}`,
    subprogramSaveError: (msg: string) => `세부프로그램 저장 실패: ${msg}`,
    writingAddError: (msg: string) => `글쓰기 추가 실패: ${msg}`,
    dismissalSaveError: (msg: string) => `하원 처리 실패: ${msg}`,
    homeworkSaveError: (msg: string) => `숙제 상태 저장 실패: ${msg}`,
    progressSaveError: (msg: string) => `진도 저장 실패: ${msg}`,
  },

  // 2. Student Log (학생 기록부) Page
  studentLog: {
    loadError: (msg: string) => `로그를 불러오는데 실패했습니다: ${msg}`,
    selectStudent: '학생을 선택해 주세요.',
    selectCategory: '카테고리를 선택해 주세요.',
    enterContent: '내용을 입력해 주세요.',
    addSuccess: '기록이 추가되었습니다.',
    deleteSuccess: '기록이 삭제되었습니다.',
    editSuccess: '기록이 수정되었습니다.',
  },

  // 3. Writing Tracker (글쓰기 현황) Messages
  writing: {
    selectStudent: '학생을 선택해 주세요.',
    enterBook: '도서명을 입력해 주세요.',
    addSuccess: '글쓰기 현황이 추가되었습니다.',
    deleteSuccess: '기록이 삭제되었습니다.',
    clearMonthlySuccess: '글쓰기 현황 데이터가 리셋 되었습니다.',
    updateSuccess: '정보가 업데이트되었습니다.',
    writingAddErrorRevert: (msg: string) => `글쓰기 추가 실패: ${msg}. 이전 상태로 되돌립니다.`,
    deleteErrorRestore: (msg: string) => `삭제 실패: ${msg}. 복구합니다.`,
    updateErrorRevert: (msg: string) => `수정 실패: ${msg}. 되돌립니다.`,
    enterDateRange: '시작일과 종료일을 입력해 주세요.',
    invalidDateRange: '시작일은 종료일보다 이전이어야 합니다.',
    dateRangeDeleted: (start: string, end: string) => `${start} ~ ${end} 기간의 데이터가 삭제되었습니다.`,
  },

  // 4. Task Manager (업무/숙제 관리) Messages
  tasks: {
    enterName: '학생명을 입력해 주세요.',
    enterBook: '도서명을 입력해 주세요.',
    enterTodo: '할 일 내용을 입력해 주세요.',
    addSuccess: '업무가 등록되었습니다.',
    loadError: (msg: string) => `업무 데이터를 불러오는데 실패했습니다: ${msg}`,
    editSuccess: '업무가 수정되었습니다.',
    deleteSuccess: '업무가 삭제되었습니다.',
    completeSuccess: '완료 처리되었습니다.',
    reservationSuccess: (name: string) => `${name} 학생의 다음 가정통신문이 예약되었습니다.`,
  },

  // 5. Notes / Memo (메모) Messages
  notes: {
    loadError: (msg: string) => `메모 데이터를 불러오는데 실패했습니다: ${msg}`,
    saveSuccess: '메모가 저장되었습니다.',
    saveError: (msg: string) => `네트워크 저장 중 오류가 발생했습니다: ${msg}. 작성한 메모는 브라우저 내에 보존됩니다.`,
    saveFailed: (msg: string) => `메모 저장 실패: ${msg}`,
    cancelInfo: '편집이 취소되었습니다.',
  },

  // 6. Meeting Note (회의록) Page
  meeting: {
    loadError: (msg: string) => `회의록을 불러오는데 실패했습니다: ${msg}`,
    titleRequired: '제목을 입력해 주세요.',
    saveSuccess: '수정사항이 저장되었습니다.',
    saveError: (msg: string) => `로컬에 저장되었으나 서버 전송에 실패했습니다: ${msg}`,
    registerSuccess: '회의록이 등록되었습니다.',
    registerError: (msg: string) => `회의록 등록 실패: ${msg}`,
    deleteSuccess: '회의록이 삭제되었습니다.',
    deleteError: (msg: string) => `회의록 삭제 실패: ${msg}`,
  },

  // 7. Notice Form (알림장 양식) Page
  noticeform: {
    loadError: (msg: string) => `알림장 양식을 불러오는데 실패했습니다: ${msg}`,
    saveSuccess: '수정사항이 저장되었습니다.',
    saveError: (msg: string) => `로컬에 저장되었으나 서버 전송에 실패했습니다: ${msg}`,
  },

  // 8. Beginner Feedback (기초첨삭) Page
  beginners: {
    loadError: (msg: string) => `기초도서 첨삭 문구를 불러오는데 실패했습니다: ${msg}`,
    replacementSuccess: (name: string) => `'●●'이 '${name}'(으)로 대치되었습니다!`,
    replacementReset: '텍스트 대치가 해제되었습니다.',
    saveSuccess: '수정사항이 저장되었습니다.',
    saveError: (msg: string) => `로컬에 저장되었으나 서버 전송에 실패했습니다: ${msg}`,
  },

  // 9. Family Letters (가정통신문) Page
  familyLetters: {
    loadError: (msg: string) => `가정통신문을 불러오는데 실패했습니다: ${msg}`,
    saveSuccess: '수정사항이 저장되었습니다.',
    saveError: (msg: string) => `로컬에 저장되었으나 서버 전송에 실패했습니다: ${msg}`,
  },

  // 9.5. Student Management (학생 관리 및 정보 수정) Messages
  students: {
    updateSuccess: (name: string) => `${name} 학생 커리큘럼이 업데이트되었습니다.`,
    writingAdded: '글쓰기 현황에 추가되었습니다.',
    curriculumAdded: (isWriting: boolean) => isWriting ? '글쓰기가 추가되었습니다.' : '도서가 추가되었습니다.',
    itemDeleted: '항목이 삭제되었습니다.',
    editSuccess: (name: string) => `${name} 학생의 정보가 수정되었습니다.`,
    resultDistributionSuccess: (name: string) => `${name} 학생 결과물 배부 완료 처리 되었습니다.`,
    processingError: (msg: string) => `오류가 발생했습니다: ${msg}`,
    enterName: '학생 이름을 입력해 주세요.',
    enterGrade: '학년을 입력해 주세요.',
    enterLevel: '레벨을 선택해 주세요.',
    registerSuccess: (name: string) => `${name} 학생이 성공적으로 등록되었습니다.`,
    deleteSuccess: (name: string) => `${name} 학생 정보와 커리큘럼 데이터가 안전하게 완전히 삭제되었습니다.`,
    attendanceSuccess: (name: string, isAttending: boolean) => isAttending ? `${name} 학생 등원 처리되었습니다.` : `${name} 학생 하원 처리되었습니다.`,
    dismissalSuccess: (name: string) => `${name} 학생 하원 처리되었습니다.`,
    levelUpSuccess: (name: string) => `${name} 학생이 레벨업되었습니다!`,
    bulkDismissalSuccess: '등원 중 학생이 모두 일괄 하원 처리되었습니다.',
    memoSaveSuccess: (name: string) => `${name} 학생의 메모를 저장했습니다.`,
    memoSaveError: (msg: string) => `메모 저장에 실패했습니다: ${msg}`,
    attendanceSaveError: (msg: string) => `출결 저장 실패: ${msg}`,
    dismissalSaveError: (msg: string) => `하원 처리 실패: ${msg}`,
    filterAutoSelected: '도서 필터가 자동 선택되었습니다.',
    bookSyncSuccess: '도서 목록이 구글 시트와 동기화되었습니다.',
    bookSyncError: '도서 목록 동기화에 실패했습니다.',
  },

  // 10. Service / API Messages
  api: {
    sheetIdNotSet: 'VITE_GOOGLE_SHEETS_ID가 설정되지 않았습니다. 환경 변수를 확인해 주세요.',
    sheetIdNotSetInternal: 'VITE_GOOGLE_SHEETS_ID is not set',
    sheetPermissionError: '구글 시트 접근 권한이 없습니다. 시트의 공유 설정을 확인해 주세요.',
    invalidResponseFormat: 'Invalid response format from Google Sheets',
    googleSheetsError: (msg: string) => `Google Sheets Error: ${msg}`,
    directReadError: (statusText: string) => `Direct Read Error: ${statusText}`,
    gasUrlRequiredForUpdate: '데이터를 수정하려면 GAS 웹 앱 URL 설정이 필요합니다.',
    gasUrlRequiredForDelete: '데이터를 삭제하려면 GAS 웹 앱 URL 설정이 필요합니다.',
    gasUpdateError: (statusText: string) => `GAS Update Error: ${statusText}`,
    gasDeleteError: (statusText: string) => `GAS Delete Error: ${statusText}`,
    gasDeleteRowError: (statusText: string) => `GAS Delete Row Error: ${statusText}`,
    gasHtmlResponseError: 'GAS Web App이 JSON이 아닌 HTML을 반환했습니다. GAS 배포 설정과 환경 변수 내 URL을 확인해 주세요.',
    gasConnectionError: 'GAS 서버에 연결할 수 없습니다. GAS 배포 설정과 환경 변수 내 URL을 확인해 주세요.',
    gasHtmlGenericError: 'GAS Web App이 JSON이 아닌 HTML을 반환했습니다. GAS 배포 설정과 환경 변수 내 URL을 확인해 주세요.',
    studentNotFound: '학생 시트를 찾을 수 없습니다.',
    curriculumNotFound: '커리큘럼 시트를 찾을 수 없습니다.',
    bookNotFound: '도서목록 시트를 찾을 수 없습니다.',
    itemNotFoundToDelete: '삭제할 항목을 찾을 수 없습니다.',
    itemNotFoundToEdit: '수정할 항목을 찾을 수 없습니다.',
    studentNameExists: '이미 등록된 학생 이름입니다.',
    gasGetMemoError: (statusText: string) => `GAS GetMemo Error: ${statusText}`,
    gasSaveMemoError: (statusText: string) => `GAS SaveMemo Error: ${statusText}`,
    gasGetTabsError: (statusText: string) => `GAS GetTabs Error: ${statusText}`,
    gasSaveTabError: (statusText: string) => `GAS SaveTab Error: ${statusText}`,
    memoUrlRequiredForRead: '메모 데이터를 불러오려면 GAS 웹 앱 URL 설정이 필요합니다.',
    memoUrlRequiredForSave: '메모 데이터를 저장하려면 GAS 웹 앱 URL 설정이 필요합니다.',
    gasResponseHtmlCheck: 'GAS Web App이 JSON이 아닌 HTML을 반환했습니다. GAS 배포 설정과 환경 변수 내 URL을 확인해 주세요.',
  },

  // 11. Button / Element Hover Titles (Tooltips)
  tooltips: {
    common: {
      save: '저장',
      cancel: '취소',
      edit: '수정',
      editAction: '수정',
      delete: '삭제',
      deleteAction: '삭제',
      add: '추가',
      copy: '복사',
      refresh: '새로고침',
      close: '닫기',
    },
    auth: {
      togglePassword: (show: boolean) => show ? '비밀번호 숨기기' : '비밀번호 보기',
    },
    topbar: {
      menu: 'Menu',
      memo: '메모',
      refresh: '새로고침',
      cancelEdit: '편집 취소',
      completeEdit: '편집 완료',
      memoEdit: '메모 수정',
      quickLink: '바로가기 링크 열기',
      assistantMode: '보조모드',
      classMode: '수업모드',
      taskMode: '업무모드',
    },
    dashboard: {
      writing: 'Writing',
      students: 'Students',
      viewLog: (name: string) => `${name} 교무기록 보기`,
      vehicle: '차량',
      changeDismissalTime: '하원 예정시간 변경',
      passAndSave: '통과',
      save: '저장',
      doubleClickEditStatus: '더블클릭하여 수정',
    },
    students: {
      dayFilter: '요일 필터',
      toggleHidden: (show: boolean) => show ? '일반 학생 목록 보기' : '숨긴 학생 목록 보기',
      bulkDismissal: '일괄 하원',
      addStudent: '학생 추가',
      toggleManage: (isDeleteMode: boolean) => isDeleteMode ? '관리 종료' : '학생 관리',
      studentDetail: (name: string, isDeleteMode: boolean) => isDeleteMode ? '삭제 모드에서는 상세 정보를 열 수 없습니다' : `${name} 학생 상세 정보`,
      editStudent: '수정',
      deleteStudent: '삭제',
      hideStudent: '학생 숨기기',
      noHomework: '숙제 없음',
      levelUp: '레벨업',
      distributeResult: '결과물 배부 완료',
      filterAutoSelect: '더블클릭하여 필터 적용',
      syncBooks: '동기화',
      editOrder: '더블클릭하여 수정',
      editBookTitle: '더블클릭하여 수정',
      editStatus: '더블클릭하여 수정',
      addWritingStatus: '글쓰기 기록',
      studentMemo: (name: string) => `${name} 학생 메모`,
      editMemo: '메모 수정',
    },
    tasks: {
      expandFilter: '펼치기',
      collapseFilter: '접기',
      addTodo: '업무 추가',
      addUpcomingTask: '업무 추가',
      addNextWeekTask: '업무 추가',
      addFamilyLetter: '업무 추가',
      filterSettings: '필터 설정',
      filterReset: '필터 초기화',
      reserveFamilyLetter: '가정통신문 예약',
      completeTodayAndSave: '완료 후 저장',
      save: '저장',
      deleteTask: '삭제',
      cancel: '취소',
      editTask: '수정하기',
      markdownHelp: '마크다운 도움말',
      cancelEdit: '편집 취소',
      completeEdit: '편집 완료',
      fullMemoEdit: '메모 전체 편집',
    },
    writing: {
      viewMonthAll: (monthStr: string) => `${monthStr} 전체 보기`,
      deleteWritingData: '삭제',
      addWritingRecord: '추가',
      pickDateCalendar: '날짜 선택',
      editDate: '더블클릭하여 수정',
      editGeneric: '더블클릭하여 수정',
      editBookTitle: '더블클릭하여 수정',
      editStatus: '더블클릭하여 수정',
      save: '저장',
      cancel: '취소',
      delete: '삭제',
    },
    logs: {
      viewMonthly: '먼슬리 상세',
      viewStudent: '학생뷰',
      viewCalendar: '먼슬리뷰',
      addNewLog: '새 기록 등록',
      add: '추가',
      save: '저장',
      cancel: '취소',
      edit: '수정',
      delete: '삭제',
    },
    meeting: {
      addMeeting: '회의록 작성',
      saveToSheet: '저장',
      cancel: '취소',
      copy: '복사',
      editContent: '수정',
      deleteMeeting: '삭제',
      syncSheet: '동기화',
    },
    notice: {
      save: '저장',
      cancel: '취소',
      copy: '복사하기',
      edit: '수정하기',
      syncDocs: '동기화',
    },
    beginners: {
      saveToSheet: '저장',
      cancel: '취소',
      copyReplaced: '복사',
      editContent: '수정',
      syncSheet: '동기화',
    },
    familyLetters: {
      save: '저장',
      cancel: '취소',
      copy: '복사',
      edit: '수정',
      syncDocs: '동기화',
    },
  },
};

export const TITLES = MESSAGES.tooltips;
export const TOOLTIPS = MESSAGES.tooltips;
