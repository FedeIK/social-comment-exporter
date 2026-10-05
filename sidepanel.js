let currentData = [];

const statusText = document.getElementById('status-text');
const countText = document.getElementById('count-text');
const btnStart = document.getElementById('btn-start');
const btnStop = document.getElementById('btn-stop');
const btnExport = document.getElementById('btn-export');
const formatSelect = document.getElementById('format-select');

// Iniciar Extracción
// Iniciar Extracción con inyección de respaldo
btnStart.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  // Función para enviar mensaje al content script
  const sendMessageToTab = () => {
    chrome.tabs.sendMessage(tab.id, { action: 'START' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        statusText.innerText = 'Navegá a FB, IG o Twitter';
        return;
      }

      if (response.status === 'STARTED') {
        statusText.innerText = `Extrayendo de ${response.platform}...`;
        statusText.className = 'status-value status-active';
        btnStart.disabled = true;
        btnStop.disabled = false;
      }
    });
  };

  // Intentar inyectar los scripts si no se ejecutaron previamente en la vista actual
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        "extractors/base-extractor.js",
        "extractors/facebook-adapter.js",
        "extractors/instagram-adapter.js",
        "extractors/twitter-adapter.js",
        "content.js"
      ]
    });
  } catch (e) {
    // Si ya estaban inyectados, continuar normalmente
  }

  sendMessageToTab();
});

// Detener Extracción
btnStop.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  chrome.tabs.sendMessage(tab.id, { action: 'STOP' }, (response) => {
    statusText.innerText = 'Detenido';
    statusText.className = 'status-value status-stopped';
    btnStart.disabled = false;
    btnStop.disabled = true;
  });
});

// Escuchar actualizaciones dinámicas del Content Script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'DATA_UPDATE') {
    currentData = message.data;
    countText.innerText = message.count;
    if (message.count > 0) {
      btnExport.disabled = false;
    }
  } else if (message.type === 'FINISHED') {
    statusText.innerText = 'Extracción finalizada';
    statusText.className = 'status-value status-stopped';
    btnStart.disabled = false;
    btnStop.disabled = true;
  }
});

// Exportar
btnExport.addEventListener('click', () => {
  if (!currentData || currentData.length === 0) return;
  const format = formatSelect.value;

  if (format === 'csv') {
    ExportModule.toCSV(currentData);
  } else if (format === 'xlsx') {
    ExportModule.toXLSX(currentData);
  }
});