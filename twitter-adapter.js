class TwitterAdapter extends BaseExtractor {
  constructor() {
    super('Twitter');
  }

  isSupportedPage() {
    const host = window.location.hostname;
    return host.includes('twitter.com') || host.includes('x.com');
  }

  findCommentNodes() {
    return Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
  }

  extractCommentData(node) {
    try {
      // Texto del Tweet
      const textElem = node.querySelector('div[data-testid="tweetText"]');
      const comentario = textElem ? textElem.innerText.trim() : '';

      // Autor
      const userElem = node.querySelector('div[data-testid="User-Name"]');
      let perfil = null;
      let link_perfil = null;

      if (userElem) {
        const nameLink = userElem.querySelector('a');
        if (nameLink) {
          perfil = nameLink.innerText.split('\n')[0];
          link_perfil = nameLink.href;
        }
      }

      // Fecha y Link del Comentario/Tweet
      const timeElem = node.querySelector('time');
      const fecha = timeElem ? timeElem.getAttribute('datetime') : null;
      const tweetLinkElem = timeElem ? timeElem.closest('a') : null;
      const link_comentario = tweetLinkElem ? tweetLinkElem.href : null;

      let id = null;
      if (link_comentario) {
        const parts = link_comentario.split('/status/');
        if (parts.length > 1) id = parts[1].split('?')[0];
      }

      // Reacciones (Likes, Retweets, Respuestas)
      const likeBtn = node.querySelector('div[data-testid="like"]');
      let likes = null;
      if (likeBtn) {
        const val = likeBtn.innerText.trim();
        if (val) likes = parseInt(val, 10) || null;
      }

      const replyBtn = node.querySelector('div[data-testid="reply"]');
      let comentarios = null;
      if (replyBtn) {
        const val = replyBtn.innerText.trim();
        if (val) comentarios = parseInt(val, 10) || null;
      }

      if (!comentario && !id) return null;

      return this.normalizeComment({
        id,
        fecha,
        comentario,
        link_comentario,
        perfil,
        link_perfil,
        likes,
        comentarios
      });
    } catch (e) {
      return null;
    }
  }

  findLoadMoreControls() {
    // En Twitter/X los hilos de respuestas se abren con "Mostrar respuestas" o "Show replies"
    const buttons = Array.from(document.querySelectorAll('div[role="button"], span'));
    return buttons.filter(btn => {
      const txt = (btn.innerText || '').toLowerCase();
      return txt.includes('mostrar respuestas') || 
             txt.includes('show replies') || 
             txt.includes('mostrar más respuestas') ||
             txt.includes('probables spam');
    });
  }
}