import { getTagColor } from '../../types';

export const getCategoryBadgeClass = (category: string) => {
  switch (category) {
    case '긴급':
    case '중요':
      return getTagColor('빨간색');
    case '가통':
      return getTagColor('갈색');
    case '알림장':
    case '결과물':
      return getTagColor('파란색');
    case '보고':
      return getTagColor('초록색');
    case '반복':
    case '기타':
    default:
      return getTagColor('기본');
  }
};

export const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case '진행':
      return getTagColor('초록색');
    case '보류':
      return getTagColor('노란색');
    case '대기':
      return getTagColor('보라색');
    case '완료':
      return getTagColor('파란색');
    case '취소':
      return getTagColor('빨간색');
    case '예정':
    default:
      return getTagColor('기본');
  }
};

export const getFamilyClassBadgeClass = (familyClass: string) => {
  switch (familyClass) {
    case '첫날':
      return getTagColor('초록색');
    case '한달':
      return getTagColor('파란색');
    case '중등':
      return getTagColor('주황색');
    case '정기':
    default:
      return getTagColor('기본');
  }
};
