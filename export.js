const ExportModule = {
  // Orden estricto de columnas
  headers: [
    'ID',
    'Plataforma',
    'Fecha',
    'Comentario',
    'Link de Comentario',
    'Perfil',
    'Link de Perfil',
    'Tematica',
    'Sentimiento',
    'Likes',
    'Comentarios',
    'Contexto',
    'URL Publicacion'
  ],

  // Sanitizador CSV
  sanitizeCsvField(val) {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    str = str.replace(/\r/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ');
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  },

  toCSV(data) {
    const rows = [];
    rows.push(this.headers.map(h => this.sanitizeCsvField(h)).join(','));

    data.forEach(item => {
      const row = [
        this.sanitizeCsvField(item.id),
        this.sanitizeCsvField(item.plataforma),
        this.sanitizeCsvField(item.fecha),
        this.sanitizeCsvField(item.comentario),
        this.sanitizeCsvField(item.link_comentario),
        this.sanitizeCsvField(item.perfil),
        this.sanitizeCsvField(item.link_perfil),
        this.sanitizeCsvField(item.tematica),
        this.sanitizeCsvField(item.sentimiento),
        this.sanitizeCsvField(item.likes),
        this.sanitizeCsvField(item.comentarios),
        this.sanitizeCsvField(item.contexto),
        this.sanitizeCsvField(item.publicacion_url)
      ];
      rows.push(row.join(','));
    });

    const csvContent = '\uFEFF' + rows.join('\n'); // BOM UTF-8 para compatibilidad con Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadBlob(blob, `comentarios_exportados_${Date.now()}.csv`);
  },

  toXLSX(data) {
    if (typeof XLSX === 'undefined') {
      alert('Error: La librería XLSX no está disponible.');
      return;
    }

    const formattedData = data.map(item => ({
      'ID': item.id,
      'Plataforma': item.plataforma,
      'Fecha': item.fecha,
      'Comentario': item.comentario,
      'Link de Comentario': item.link_comentario,
      'Perfil': item.perfil,
      'Link de Perfil': item.link_perfil,
      'Tematica': item.tematica,
      'Sentimiento': item.sentimiento,
      'Likes': item.likes,
      'Comentarios': item.comentarios,
      'Contexto': item.contexto,
      'URL Publicacion': item.publicacion_url
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData, { header: this.headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Comentarios');

    XLSX.writeFile(workbook, `comentarios_exportados_${Date.now()}.xlsx`);
  },

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};