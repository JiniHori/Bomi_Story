const DUE_DATE = new Date('2027-01-06T00:00:00+09:00');
const PREGNANCY_DAYS = 280;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const sizeByWeek = [
  { min: 0, icon: '🌱', size: '소중한 시작 단계', msg: '오늘의 기록이 봄이의 첫 이야기입니다.' },
  { min: 8, icon: '🫐', size: '블루베리 정도', msg: '작은 심장이 힘차게 뛰기 시작하는 시기입니다.' },
  { min: 9, icon: '🍒', size: '체리 정도', msg: '조금씩 사람의 형태가 또렷해지는 단계입니다.' },
  { min: 10, icon: '🍓', size: '딸기 정도', msg: '손가락과 발가락의 구분이 더 분명해집니다.' },
  { min: 11, icon: '🍋', size: '작은 라임 정도', msg: '움직임이 점점 활발해지는 시기입니다.' },
  { min: 12, icon: '🍑', size: '자두 정도', msg: '엄마와 아빠의 기록이 더 특별해지는 시기입니다.' },
  { min: 13, icon: '🍐', size: '레몬 정도', msg: '이제 안정기에 가까워지며 성장 속도가 빨라집니다.' },
  { min: 16, icon: '🥑', size: '아보카도 정도', msg: '표정과 움직임이 더 다양해지는 시기입니다.' },
  { min: 20, icon: '🍌', size: '바나나 정도', msg: '정밀초음파로 많은 정보를 확인하는 시기입니다.' },
  { min: 24, icon: '🌽', size: '옥수수 정도', msg: '청각과 감각 발달이 더 활발해집니다.' },
  { min: 28, icon: '🍆', size: '가지 정도', msg: '출산 준비를 조금씩 구체화할 시기입니다.' },
  { min: 32, icon: '🥬', size: '배추 정도', msg: '체중 증가와 태동 기록이 중요해집니다.' },
  { min: 36, icon: '🍉', size: '수박에 가까워지는 단계', msg: '만남이 가까워지고 있습니다.' }
];

function getKoreaToday() {
  const now = new Date();
  const korea = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  korea.setHours(0, 0, 0, 0);
  return korea;
}

function updatePregnancyInfo() {
  const today = getKoreaToday();
  const conceptionBase = new Date(DUE_DATE);
  conceptionBase.setDate(conceptionBase.getDate() - PREGNANCY_DAYS);
  conceptionBase.setHours(0, 0, 0, 0);

  const elapsedDays = Math.max(0, Math.floor((today - conceptionBase) / MS_PER_DAY));
  const week = Math.floor(elapsedDays / 7);
  const day = elapsedDays % 7;
  const dday = Math.ceil((DUE_DATE - today) / MS_PER_DAY);

  document.getElementById('weekValue').textContent = week;
  document.getElementById('dayValue').textContent = day;
  document.getElementById('ddayValue').textContent = dday >= 0 ? `D-${dday}` : `D+${Math.abs(dday)}`;
  document.getElementById('todayLabel').textContent = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')} 기준`;

  const info = sizeByWeek.reduce((acc, item) => week >= item.min ? item : acc, sizeByWeek[0]);
  document.getElementById('sizeIcon').textContent = info.icon;
  document.getElementById('babySize').textContent = info.size;
  document.getElementById('babyMessage').textContent = info.msg;
}

function loadLetters() {
  document.getElementById('momNote').value = localStorage.getItem('bomi_v4_mom_note') || '';
  document.getElementById('dadNote').value = localStorage.getItem('bomi_v4_dad_note') || '';
}

function saveLetters() {
  localStorage.setItem('bomi_v4_mom_note', document.getElementById('momNote').value);
  localStorage.setItem('bomi_v4_dad_note', document.getElementById('dadNote').value);
  document.getElementById('letterStatus').textContent = '이 기기에 임시저장되었습니다. 가족 공용 저장은 V5에서 D1로 연결합니다.';
}

function openPanel(id) {
  const panel = document.getElementById(id);
  panel.classList.add('show');
  panel.setAttribute('aria-hidden', 'false');
}

function closePanel(id) {
  const panel = document.getElementById(id);
  panel.classList.remove('show');
  panel.setAttribute('aria-hidden', 'true');
}

updatePregnancyInfo();
loadLetters();
