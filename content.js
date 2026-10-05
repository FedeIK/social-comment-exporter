let currentAdapter = null;
let isExtracting = false;
const extractedCommentsMap = new Map();
let mutationObserver = null;
let periodicInterval = null;
let autoClickInterval = null;

let lastCount = 0;
let unchangedChecks = 0;

function initAdapter() {
  if (new FacebookAdapter().isSupportedPage()) {
    currentAdapter = new FacebookAdapter();
  } else if (new InstagramAdapter().isSupportedPage()) {
    currentAdapter = new InstagramAdapter();
  } else if (new TwitterAdapter().isSupportedPage()) {
    currentAdapter = new TwitterAdapter();
  }
}

initAdapter();

function processNode(node) {
  if (!currentAdapter || !node || node.nodeType !== Node.ELEMENT_NODE) return;

  const commentData = currentAdapter.extractCommentData(node);
  if (commentData && commentData.comentario) {
    const uniqueKey = commentData.id || 
                      commentData.link_comentario || 
                      `${commentData.plataforma}|${commentData.perfil}|${commentData.comentario.substring(0, 30)}|${commentData.fecha}`;

    if (!extractedCommentsMap.has(uniqueKey)) {
      extractedCommentsMap.set(uniqueKey, commentData);
      notifyUpdate();
    }
  }
}

function notifyUpdate() {
  chrome.runtime.sendMessage({
    type: 'DATA_UPDATE',
    count: extractedCommentsMap.size,
    data: Array.from(extractedCommentsMap.values())
  }).catch(() => {});
}

function startHybridScanner() {
  isExtracting = true;
  lastCount = 0;
  unchangedChecks = 0;

  mutationObserver = new MutationObserver((mutations) => {
    if (!isExtracting) return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          processNode(node);
          if (currentAdapter) {
            const children = currentAdapter.findCommentNodes();
            children.forEach(child => processNode(child));
          }
        }
      }
    }
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });

  periodicInterval = setInterval(() => {
    if (!isExtracting) return;
    if (currentAdapter) {
      const nodes = currentAdapter.findCommentNodes();
      nodes.forEach(node => processNode(node));
    }
  }, 250);

  autoClickInterval = setInterval(() => {
    if (!isExtracting || !currentAdapter) return;

    // Hacer clic en "Ver más comentarios" y "Ver respuestas"
    const controls = currentAdapter.findLoadMoreControls();
    controls.forEach(ctrl => {
      try {
        ctrl.click();
      } catch (e) {}
    });

    // Scroll focalizado en el panel donde están los comentarios
    const photoScroll = document.querySelector('div[aria-label*="Comentarios"] div[style*="overflow-y: auto"], div[style*="overflow-y: auto"]');
    if (photoScroll) {
      photoScroll.scrollBy(0, 400);
    } else {
      window.scrollBy(0, 250);
    }

    // Detector de finalización automática (damos 10 ciclos / ~15 segundos de margen)
    const currentCount = extractedCommentsMap.size;
    if (currentCount === lastCount && currentCount > 0) {
      unchangedChecks++;
      if (unchangedChecks >= 10 && controls.length === 0) {
        stopExtraction();
        chrome.runtime.sendMessage({
          type: 'FINISHED',
          count: currentCount
        }).catch(() => {});
      }
    } else {
      lastCount = currentCount;
      unchangedChecks = 0;
    }
  }, 1500);
}

function stopExtraction() {
  isExtracting = false;
  if (mutationObserver) mutationObserver.disconnect();
  if (periodicInterval) clearInterval(periodicInterval);
  if (autoClickInterval) clearInterval(autoClickInterval);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'START') {
    initAdapter();
    if (!currentAdapter) {
      sendResponse({ status: 'ERROR', message: 'Plataforma no soportada' });
      return true;
    }
    startHybridScanner();
    sendResponse({ status: 'STARTED', platform: currentAdapter.platformName });
  } else if (message.action === 'STOP') {
    stopExtraction();
    sendResponse({ status: 'STOPPED', count: extractedCommentsMap.size });
  } else if (message.action === 'GET_DATA') {
    sendResponse({
      count: extractedCommentsMap.size,
      data: Array.from(extractedCommentsMap.values())
    });
  }
  return true;
});