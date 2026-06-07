/**
 * Checks if a given date is a Korean legal holiday.
 * This is hardcoded/statically precalculated and should be updated yearly if needed.
 */
export const isKoreanHoliday = (date: Date): boolean => {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // 2026 Korean legal holidays (including substitution holidays)
  if (month === 1 && day === 1) return true; // 새해 첫날
  if (month === 2 && (day === 16 || day === 17 || day === 18)) return true; // 설날 연휴
  if (month === 3 && (day === 1 || day === 2)) return true; // 삼일절, 대체공휴일
  if (month === 5 && (day === 1 || day === 5 || day === 24 || day === 25)) return true; // 근로자의 날, 어린이날, 부처님오신날, 대체공휴일
  if (month === 6 && (day === 3 || day === 6)) return true; // 지방선거, 현충일
  if (month === 7 && day === 17) return true; // 제헌절
  if (month === 8 && (day === 15 || day === 17)) return true; // 광복절, 대체공휴일
  if (month === 9 && (day === 24 || day === 25 || day === 26)) return true; // 추석 연휴
  if (month === 10 && (day === 3 || day === 5 || day === 9)) return true; // 개천절, 대체공휴일, 한글날
  if (month === 12 && day === 25) return true; // 성탄절
  
  return false;
};
