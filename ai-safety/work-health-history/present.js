/* Keep this document and its fullscreen container alive while the iframe navigates. */
(() => {
  const channel = 'work-health-history';
  const frame = document.getElementById('slide');
  const presentation = document.getElementById('presentation');
  const status = document.getElementById('fullscreen-status');
  const targetOrigin = location.protocol === 'file:' ? '*' : location.origin;
  const slidePattern = /^s(?:0[1-9]|[1-4]\d|5[0-5]|08a|25a)\.html$/;

  function slideQuery(params) {
    const query = new URLSearchParams();
    const step = params.get('step');
    if (step === 'last' || /^\d+$/.test(step || '')) query.set('step', step);
    if (params.get('auto') === '1') query.set('auto', '1');
    return query;
  }

  function syncFullscreen() {
    frame.contentWindow.postMessage({
      channel,
      type: 'fullscreen-state',
      active: document.fullscreenElement === presentation,
    }, targetOrigin);
    frame.contentWindow.focus();
  }

  // Called synchronously from the slide's click/key handler on hosted pages,
  // preserving the browser's user activation for the fullscreen request.
  window.togglePresentationFullscreen = async () => {
    status.hidden = true;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await presentation.requestFullscreen();
    } catch {
      status.textContent = '전체화면을 열 수 없습니다. 브라우저의 전체화면 기능을 사용해 주세요.';
      status.hidden = false;
    }
  };

  addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || data.channel !== channel) return;
    if (data.type === 'fullscreen-toggle') {
      window.togglePresentationFullscreen();
    } else if (data.type === 'ready' && slidePattern.test(data.slide)) {
      const query = slideQuery(new URLSearchParams(data.search));
      query.set('slide', data.slide);
      const url = new URL(location.href);
      url.search = query.toString();
      // Some browsers restrict history updates for local file:// presentations.
      try { history.replaceState(null, '', url); } catch {}
      document.title = data.title;
      frame.title = data.title;
      syncFullscreen();
    }
  });

  document.addEventListener('fullscreenchange', syncFullscreen);
  frame.addEventListener('load', syncFullscreen);
  const params = new URLSearchParams(location.search);
  const slide = slidePattern.test(params.get('slide')) ? params.get('slide') : 's01.html';
  const query = slideQuery(params).toString();
  frame.src = slide + (query ? '?' + query : '');
})();
