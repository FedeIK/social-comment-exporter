class InstagramAdapter extends BaseExtractor {
  constructor() {
    super('Instagram');
  }

  isSupportedPage() {
    return window.location.hostname.includes('instagram.com');
  }

  findCommentNodes() {
    // Buscar etiquetas ul/li que estructuran la sección de comentarios en Instagram
    const commentItems = Array.from(document.querySelectorAll('ul div[role="button"]..'), node => node);
    const articles = Array.from(document.querySelectorAll('ul > div, ul > li'));
    return articles.filter(el => el.querySelector('time') && el.querySelector('a[href^="/"]'));
  }

  extractCommentData(node) {
    try {
      const timeElem = node.querySelector('time');
      if (!timeElem) return null;

      const fecha = timeElem.getAttribute('datetime') || timeElem.innerText;

      // Autor
      const authorElem = node.querySelector('a[href^="/"]');
      const perfil = authorElem ? authorElem.innerText.trim() : null;
      const link_perfil = authorElem ? authorElem.href : null;

      // El texto suele estar en un span contenedor junto al perfil
      const textSpan = node.querySelector('span[dir="auto"]') || node.querySelector('span._aacl');
      const comentario = textSpan ? textSpan.innerText.trim() : '';

      if (!comentario || comentario === perfil) return null;

      // Likes
      const likesBtn = node.querySelector('a[href*="/liked_by/"], button span');
      let likes = null;
      if (likesBtn) {
        const val = likesBtn.innerText;
        if (/\d+/.test(val)) likes = parseInt(val.replace(/\D/g, ''), 10);
      }

      return this.normalizeComment({
        id: null,
        fecha,
        comentario,
        link_comentario: null,
        perfil,
        link_perfil,
        likes,
        comentarios: null
      });
    } catch (e) {
      return null;
    }
  }

  findLoadMoreControls() {
    // Botones de "Ver respuestas" y de "Ver más comentarios"
    const svgs = Array.from(document.querySelectorAll('svg[aria-label*="Cargar"], svg[aria-label*="Plus"], button'));
    return svgs.filter(el => {
      const parentBtn = el.closest('button') || el;
      const txt = (parentBtn.innerText || '').toLowerCase();
      return txt.includes('ver respuestas') || 
             txt.includes('view replies') || 
             txt.includes('ver más comentarios') ||
             txt.includes('ocultar respuestas') === false && txt.includes('respuestas');
    });
  }
}