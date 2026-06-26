const DUE_DATE = new Date("2027-01-06T00:00:00+09:00");
const PREGNANCY_DAYS = 280;

const weeklyGrowth = [
  { week: 8, size: "라즈베리 정도", msg: "작은 심장이 힘차게 뛰기 시작하는 시기입니다." },
  { week: 9, size: "체리 정도", msg: "손과 발의 형태가 조금씩 뚜렷해지는 시기입니다." },
  { week: 10, size: "딸기 정도", msg: "주요 기관의 기본 구조가 빠르게 자리 잡습니다." },
  { week: 11, size: "무화과 정도", msg: "아직 느끼기는 어렵지만 움직임이 더 활발해지는 시기입니다." },
  { week: 12, size: "라임 정도", msg: "손가락과 발가락이 더 또렷해지고 얼굴 윤곽도 정리됩니다." },
  { week: 13, size: "레몬 정도", msg: "몸의 비율이 조금씩 균형을 잡아갑니다." },
  { week: 14, size: "복숭아 정도", msg: "얼굴 근육과 작은 움직임이 더 다양해집니다." }
];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function diffDays(from, to) {
  return Math.floor((startOfDay(to) - startOfDay(from)) / (1000 * 60 * 60 * 24));
}

function updatePregnancyInfo() {
  const today = new Date();
  const baseDate = new Date(DUE_DATE);
  baseDate.setDate(baseDate.getDate() - PREGNANCY_DAYS);

  const elapsed = Math.max(0, diffDays(baseDate, today));
  const week = Math.floor(elapsed / 7);
  const day = elapsed % 7;
  const dDay = Math.max(0, diffDays(today, DUE_DATE));

  document.getElementById("gestationText").textContent = `${week}주 ${day}일`;
  document.getElementById("dDayText").textContent = `D-${dDay}`;

  const growth = weeklyGrowth.find(item => item.week === week) || weeklyGrowth[weeklyGrowth.length - 1];
  document.getElementById("babySize").textContent = growth.size;
  document.getElementById("babyMessage").textContent = growth.msg;
}

updatePregnancyInfo();
