(() => {
  const POLL_MS = 8000;
  let pushTimer = null;
  let pullTimer = null;
  let lastSyncedAt = null;

  function isBabyfairPage() {
    return /\/babyfair\.html(?:$|[?#])/.test(location.pathname + location.search);
  }

  function currentCode() {
    return localStorage.getItem('bomi-prep-sync-code-v1') || '';
  }

  function groupId() {
    const code = currentCode().trim().toUpperCase().replace(/\s+/g, '-');
    return code ? code.split('-').slice(0, 3).join('-') : '';
  }

  function formatTime(date) {
    if (!date) return '아직 확인 전';
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  }

  function syncStateEl() {
    return document.getElementById('syncState');
  }

  function paintState(message, online = false) {
    const el = syncStateEl();
    if (!el) return;
    const gid = groupId();
    const suffix = gid ? ` · 그룹 ${gid}` : '';
    const time = lastSyncedAt ? ` · 마지막 ${formatTime(lastSyncedAt)}` : '';
    el.textContent = `${message}${suffix}${time}`;
    el.classList.toggle('online', online);
  }

  async function pullNow(showWorking = false) {
    if (!currentCode() || !navigator.onLine || typeof syncPull !== 'function') {
      paintState(currentCode() ? '오프라인 저장 중' : '동기화 코드 없음', false);
      return;
    }
    if (showWorking) paintState('다른 기기 변경 확인 중…', false);
    try {
      await syncPull();
      lastSyncedAt = new Date();
      paintState('연결됨 · 다른 기기와 동기화됨', true);
    } catch (error) {
      paintState('동기화 확인 실패 · 잠시 후 재시도', false);
    }
  }

  function scheduleFastPush() {
    if (!currentCode() || typeof syncPush !== 'function') return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      try {
        await syncPush();
        lastSyncedAt = new Date();
        paintState('연결됨 · 변경사항 전송 완료', true);
      } catch (error) {
        paintState('변경사항은 이 기기에 저장됨 · 전송 재시도 예정', false);
      }
    }, 250);
  }

  function addSyncButton() {
    const panel = document.querySelector('.syncPanel');
    if (!panel || panel.querySelector('[data-bf-sync-now]')) return;
    const link = panel.querySelector('.syncLink');
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.bfSyncNow = '1';
    button.textContent = '지금 동기화';
    button.style.cssText = 'flex:0 0 auto;border:0;border-radius:13px;padding:9px 11px;background:linear-gradient(135deg,#e4faf5,#fff0f5);color:#6f5963;font-size:11px;font-weight:950;cursor:pointer;';
    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        if (typeof syncPush === 'function') await syncPush();
        await pullNow(true);
      } finally {
        button.disabled = false;
      }
    });
    if (link) panel.insertBefore(button, link); else panel.appendChild(button);
  }

  function installChangeForwarding() {
    document.addEventListener('change', event => {
      if (event.target.matches('.checklist input[type="checkbox"]')) scheduleFastPush();
    }, true);

    document.addEventListener('input', event => {
      if (!event.target.matches('#kintexNote,#magokNote')) return;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(scheduleFastPush, 650);
    }, true);
  }

  function startPolling() {
    clearInterval(pullTimer);
    pullTimer = setInterval(() => {
      if (document.visibilityState === 'visible') pullNow(false);
    }, POLL_MS);
  }

  function boot() {
    if (!isBabyfairPage()) return;
    addSyncButton();
    installChangeForwarding();
    paintState(currentCode() ? '연결됨 · 동기화 상태 확인 중' : '동기화 코드 없음', Boolean(currentCode()));
    pullNow(false);
    startPolling();
    window.addEventListener('focus', () => pullNow(false));
    window.addEventListener('pageshow', () => pullNow(false));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') pullNow(false);
      else scheduleFastPush();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
