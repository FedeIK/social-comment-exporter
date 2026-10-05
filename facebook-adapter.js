class FacebookAdapter extends BaseExtractor {
  constructor() {
    super('Facebook');
  }

  isSupportedPage() {
    return window.location.hostname.includes('facebook.com');
  }

  getPostUrl() {
    return window.location.href;
  }

  findCommentNodes() {
    const nodes = Array.from(document.querySelectorAll('div[role="article"], div[aria-label*="Comentario"], div[aria-label*="Comment"]'));
    return nodes.filter(node => {
      const hasText = node.querySelector('div[dir="auto"], span[dir="auto"]');
      const hasAuthor = node.querySelector('a[role="link"], a[href*="facebook.com"], a[href*="profile.php"]');
      return hasText && hasAuthor;
    });
  }

  extractCommentData(node) {
    try {
      // Auto-click único en "Ver más" dentro de textos de comentarios largos
      const seeMoreBtns = Array.from(node.querySelectorAll('div[role="button"], span[role="button"]'));
      seeMoreBtns.forEach(btn => {
        if (btn.getAttribute('data-exporter-text-clicked') === 'true') return;
        const txt = (btn.innerText || '').toLowerCase().trim();
        if (txt === 'ver más' || txt === 'see more' || txt === 'ver mais') {
          try {
            btn.setAttribute('data-exporter-text-clicked', 'true');
            btn.click();
          } catch(e) {}
        }
      });

      // 1. AUTOR Y LINK DE PERFIL
      const links = Array.from(node.querySelectorAll('a[role="link"], a[href*="profile.php"], a[href*="facebook.com"]'));
      
      let authorLink = links.find(a => {
        const href = a.getAttribute('href') || '';
        const txt = (a.innerText || '').trim();
        if (!txt) return false;
        if (/^\d+\s*(d|h|min|s|sem)/i.test(txt)) return false;
        if (['responder', 'me gusta', 'compartir', 'ver original', 'ver traducción'].includes(txt.toLowerCase())) return false;
        return href.includes('profile.php') || href.includes('facebook.com/') || href.startsWith('/');
      });

      let perfil = null;
      let link_perfil = null;

      if (authorLink) {
        const nameSpan = authorLink.querySelector('span[dir="auto"]') || authorLink;
        perfil = nameSpan.innerText ? nameSpan.innerText.trim().split('\n')[0] : null;
        let rawHref = authorLink.href || '';
        link_perfil = rawHref.includes('comment_id=') ? rawHref.split('?')[0] : rawHref.split('&')[0];
      }

      // 2. TEXTO DEL COMENTARIO
      const textBlocks = Array.from(node.querySelectorAll('div[dir="auto"]'));
      let commentLines = textBlocks
        .map(b => b.innerText ? b.innerText.trim() : '')
        .filter(txt => {
          if (!txt) return false;
          if (perfil && txt === perfil) return false;
          if (['responder', 'me gusta', 'ver original', 'ver traducción', 'ver más', 'see more', 'ocultar'].includes(txt.toLowerCase())) return false;
          if (/^\d+\s*(d|h|min|s|sem)/i.test(txt)) return false;
          return true;
        });

      commentLines = commentLines.filter((item, index) => commentLines.indexOf(item) === index);

      if (commentLines.length > 0 && commentLines[0] === perfil) {
        commentLines.shift();
      }

      const comentario = commentLines.join(' ').trim();
      if (!comentario) return null;

      // 3. FECHA Y LINK DE COMENTARIO
      let fecha = null;
      const timeElem = node.querySelector('time');
      if (timeElem) {
        fecha = timeElem.getAttribute('datetime') || timeElem.innerText.trim();
      }

      const dateLinkElem = links.find(a => /^\d+\s*(d|h|min|s|sem)/i.test(a.innerText.trim()));
      if (!fecha && dateLinkElem) {
        fecha = dateLinkElem.innerText.trim();
      }

      const commentLinkElem = node.querySelector('a[href*="comment_id="]') || dateLinkElem;
      let link_comentario = commentLinkElem ? commentLinkElem.href : link_perfil;

      // 4. ID LIMPIO
      let id = null;
      if (link_comentario && link_comentario.includes('comment_id=')) {
        const match = link_comentario.match(/comment_id=([^&]+)/);
        if (match) {
          try {
            const decoded = decodeURIComponent(match[1]);
            const numberMatch = decoded.match(/\d+/g);
            id = numberMatch ? numberMatch[numberMatch.length - 1] : decoded;
          } catch(e) {
            id = match[1];
          }
        }
      }

      // 5. LIKES Y RESPUESTAS
      let likes = null;
      const likesElem = node.querySelector('span[aria-label*="reacción"], span[aria-label*="like"], span[aria-label*="Me gusta"], div[aria-label*="reacciones"]');
      if (likesElem) {
        const label = likesElem.getAttribute('aria-label') || likesElem.innerText;
        const match = label.match(/\d+/);
        if (match) likes = parseInt(match[0], 10);
      }

      let comentariosCount = null;
      const repliesElem = Array.from(node.querySelectorAll('div[role="button"], span[role="button"]'))
        .find(el => (el.innerText || '').toLowerCase().includes('respuesta'));
      if (repliesElem) {
        const match = repliesElem.innerText.match(/\d+/);
        if (match) comentariosCount = parseInt(match[0], 10);
      }

      return this.normalizeComment({
        id,
        fecha,
        comentario,
        link_comentario,
        perfil,
        link_perfil,
        likes,
        comentarios: comentariosCount
      });
    } catch (e) {
      return null;
    }
  }

  findLoadMoreControls() {
    const candidates = Array.from(document.querySelectorAll(
      'div[role="button"], span[role="button"], div[aria-label*="respuesta"], div[aria-label*="reply"], div[aria-label*="comentario"]'
    ));

    return candidates.filter(btn => {
      // Ignorar si está dentro de un link de foto o post
      const parentLink = btn.closest('a');
      if (parentLink) {
        const href = parentLink.getAttribute('href') || '';
        if (href.includes('/photo') || href.includes('/posts/') || href.includes('/reel/')) {
          return false;
        }
      }

      const txt = (btn.innerText || btn.getAttribute('aria-label') || '').toLowerCase().trim();

      if (txt.includes('ocultar') || txt.includes('hide') || txt.includes('ver menos')) {
        return false;
      }

      // Permitir clics continuos en "Ver más comentarios" y "Ver respuestas"
      return (
        txt.includes('respuesta') ||
        txt.includes('respuestas') ||
        txt.includes('reply') ||
        txt.includes('replies') ||
        txt.includes('ver más comentarios') ||
        txt.includes('view more comments') ||
        txt.includes('cargar más') ||
        txt.includes('ver anterior')
      );
    });
  }
}