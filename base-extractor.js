class BaseExtractor {
  constructor(platformName) {
    this.platformName = platformName;
  }

  isSupportedPage() {
    return false;
  }

  getPostUrl() {
    return window.location.href;
  }

  getPostContext() {
    return null;
  }

  findCommentNodes() {
    return [];
  }

  extractCommentData(node) {
    return null;
  }

  findLoadMoreControls() {
    return [];
  }

  // Normalización estandarizada de cada comentario
  normalizeComment(data) {
    return {
      id: data.id || null,
      plataforma: this.platformName,
      fecha: data.fecha || null,
      comentario: data.comentario || '',
      link_comentario: data.link_comentario || null,
      perfil: data.perfil || null,
      link_perfil: data.link_perfil || null,
      tematica: null,
      sentimiento: null,
      likes: data.likes !== undefined ? data.likes : null,
      comentarios: data.comentarios !== undefined ? data.comentarios : null,
      contexto: data.contexto || null,
      publicacion_url: this.getPostUrl()
    };
  }
}