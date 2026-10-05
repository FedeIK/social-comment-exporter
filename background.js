// Abrir el Side Panel al hacer clic en el ícono de la extensión
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listener de mensajes para mantener viva la comunicación tolerante a desconexiones
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ status: 'PONG' });
  }
  return true;
});