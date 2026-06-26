const DUE_DATE = new Date("2027-01-06T00:00:00+09:00");
const PREGNANCY_DAYS = 280;

function getKoreaToday() {
  const now = new Date();
  const korea = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  korea.setHours(0, 0, 0, 0);
  return korea;
}

function daysBetween(start, end) {
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
}

function getBabyInfo(week) {
  const table = [
    { min: 0, size: "아주 작은 씨앗처럼", message: "봄이는 조용히 첫 기록을 시작하고 있습니다." },
    { min: 8, size: "라즈베리 정도", message: "작은 심장이 힘차게 뛰고, 몸의 기본 구조가 빠르게 자리 잡는 시기입니다." },
    { min: 9, size: "체리 정도", message: "손과 발이 더 또렷해지고, 조금씩 사람의 형태가 분명해집니다." },
    { min: 10, size: "딸기 정도", message: "주요 기관이 계속 성숙하고, 움직임도 조금씩 활발해지는 시기입니다." },
    { min: 11, size: "무화과 정도", message: "손가락과 발가락이 더 뚜렷해지고, 얼굴 윤곽도 조금씩 잡혀갑니다." },
    { min: 12, size: "라임 정도", message: "봄이는 약 5~6cm 전후로 자라며, 목투명대와 코뼈 같은 중요한 초기 확인을 받는 시기입니다." },
    { min: 13, size: "레몬 정도", message: "초기 안정기로 접어들며 몸의 비율과 움직임이 더 자연스러워집니다." },
    { min: 14, size: "복숭아 정도", message: "몸이 길어지고 표정 근육과 작은 움직임이 더 다양해집니다." },
    { min: 16, size: "아보카도 정도", message: "양수검사와 중기 확인을 준비하는 시기입니다. 봄이는 점점 더 단단히 자라고 있습니다." },
    { min: 20, size: "바나나 정도", message: "정밀초음파로 구조를 자세히 확인하는 중요한 시기입니다." }
  ];

  return table.reduce((best, item) => week >= item.min ? item : best, table[0]);
}

function updatePregnancyInfo() {
  const today = getKoreaToday();
  const conceptionDate = new Date(DUE_DATE);
  conceptionDate.setDate(conceptionDate.getDate() - PREGNANCY_DAYS);

  const elapsed = Math.max(0, daysBetween(conceptionDate, today));
  const week = Math.floor(elapsed / 7);
  const day = elapsed % 7;
  const dDay = Math.max(0, daysBetween(today, DUE_DATE));
  const info = getBabyInfo(week);

  document.getElementById("gestationText").textContent = `${week}주 ${day}일`;
  document.getElementById("dDayText").textContent = `D-${dDay}`;
  document.getElementById("babySize").textContent = info.size;
  document.getElementById("babyMessage").textContent = info.message;
}

document.addEventListener("DOMContentLoaded", updatePregnancyInfo);
