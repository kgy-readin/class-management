/**
 * Centralized notification and alert messages template file.
 * Edit user-facing alert, success, and error message templates here.
 */

export const MESSAGES = {
  // General UI Messages
  general: {
    homeNavigation: '홈 화면으로 이동했습니다.',
    loadError: (msg: string) => `데이터를 불러오는데 실패했습니다: ${msg}`,
    copySuccess: '클립보드에 복사되었습니다!',
    copyFailure: '복사에 실패했습니다.',
  },

  // 1. Student Cards & Dashboard Messages
  dashboard: {
    subprogramUpdated: '서브프로그램이 업데이트되었습니다.',
    writingTrackerAdded: '글쓰기 현황에 추가되었습니다.',
    dismissalSuccess: (name: string) => `${name} 학생이 하원하였습니다.`,
    homeworkDone: '숙제 완료 처리되었습니다.',
    homeworkNotSubmitted: '숙제 미제출 건이 기록되었습니다.',
    progressUpdated: '진도가 업데이트되었습니다.',
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
  },

  // 4. Task Manager (업무/숙제 관리) Messages
  tasks: {
    enterName: '학생명을 입력해 주세요.',
    enterBook: '도서명을 입력해 주세요.',
    enterTodo: '할 일 내용을 입력해 주세요.',
    addSuccess: '신규 업무가 등록되었습니다.',
    loadError: (msg: string) => `업무 데이터를 불러오는데 실패했습니다: ${msg}`,
    editSuccess: '업무가 성공적으로 수정되었습니다.',
    deleteSuccess: '업무가 삭제되었습니다.',
    completeSuccess: '완료 처리되었습니다.',
    reservationSuccess: (name: string, fClass: string) => `${name} 학생 ${fClass} 가정통신문 업무가 예약되었습니다.`,
  },

  // 5. Notes / Memo (메모) Messages
  notes: {
    loadError: (msg: string) => `메모 데이터를 불러오는데 실패했습니다: ${msg}`,
    saveSuccess: '메모가 성공적으로 저장되었습니다.',
    saveError: (msg: string) => `네트워크 저장 중 오류가 발생했습니다: ${msg}. 작성한 메모는 브라우저 내에 보존됩니다.`,
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

  // 7. Comment Bank (알림장 문구) Page
  comments: {
    loadError: (msg: string) => `알림장 문구를 불러오는데 실패했습니다: ${msg}`,
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

  // 9. Parent Newsletters (가정통신문) Page
  newsletters: {
    loadError: (msg: string) => `가정통신문을 불러오는데 실패했습니다: ${msg}`,
    saveSuccess: '수정사항이 저장되었습니다.',
    saveError: (msg: string) => `로컬에 저장되었으나 서버 전송에 실패했습니다: ${msg}`,
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
};
