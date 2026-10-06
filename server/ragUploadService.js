/**
 * ============================================================================
 * RAG UPLOAD SERVICE — procesado de UN archivo de módulo para la KB modular
 * ============================================================================
 * Compartido por la subida individual y la SUBIDA MASIVA (bulk) del admin.
 * Recibe las dependencias por parámetro para poder testear con DB stub.
 * Lanza errores con .status/.payload para respuestas HTTP limpias.
 */

export function processModuleUploadFile(deps, filename, htmlContent, moduleTypeHint) {
  const { db, analyzeModule, generateModuleIdFromFilename, generateStyleName, KNOWN_MODULE_TYPES } = deps;

  const analysis = analyzeModule(htmlContent, moduleTypeHint);

  // VALIDACIÓN DE FALLBACK: body hint > moduleMetadata.tipo > data-gemini-id > 'general'
  if (!analysis.module_type) {
    analysis.module_type = moduleTypeHint || 'general';
  }
  if (analysis.module_type && analysis.module_type !== 'general' && !KNOWN_MODULE_TYPES.includes(analysis.module_type)) {
    console.warn(`[RAG-UPLOAD] module_type "${analysis.module_type}" no está en KNOWN_MODULE_TYPES, fallback a 'general'`);
    analysis.module_type = moduleTypeHint || 'general';
  }
  if (!analysis.module_id) {
    analysis.module_id = generateModuleIdFromFilename(filename);
  }
  if (!analysis.style_name) {
    analysis.style_name = generateStyleName(analysis.metadata, filename);
  }
  if (analysis.html_size === undefined || analysis.html_size === null) {
    analysis.html_size = Buffer.byteLength(htmlContent, 'utf8');
  }
  analysis.tags = analysis.tags || '[]';
  analysis.descripcion_larga = analysis.descripcion_larga || JSON.stringify('');
  analysis.theme_tags = analysis.theme_tags || '[]';
  analysis.color_palette = analysis.color_palette || '{}';
  analysis.css_variables = analysis.css_variables || '{}';
  analysis.memory_sources = analysis.memory_sources || '{}';
  analysis.description = analysis.description || '';

  // Validación: sólo errores fatales (no warnings)
  if (!analysis.is_valid) {
    const err = new Error('Módulo no válido');
    err.status = 400;
    err.payload = { error: 'Módulo no válido', validation: { errors: analysis.errors, warnings: analysis.warnings } };
    throw err;
  }

  const stmt = db.prepare(`
    INSERT INTO knowledge_base_modules (
      module_id, module_type, style_name, description,
      tags, descripcion_larga, theme_tags, color_palette,
      css_variables, has_memory_attributes, memory_sources,
      html_content, category, is_active, filename, html_size
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const tryInsert = (idCandidate) => {
    return stmt.run(
      idCandidate,
      analysis.module_type,
      analysis.style_name,
      analysis.description,
      analysis.tags,
      analysis.descripcion_larga,
      analysis.theme_tags,
      analysis.color_palette,
      analysis.css_variables,
      analysis.has_memory_attributes ? 1 : 0,
      analysis.memory_sources,
      htmlContent,
      'general',
      filename,
      analysis.html_size
    );
  };

  let result;
  let finalModuleId = analysis.module_id;
  let renamedFrom = null;

  try {
    result = tryInsert(analysis.module_id);
  } catch (dbError) {
    if (dbError.message && dbError.message.includes('NOT NULL')) {
      const fieldMap = ['module_id', 'module_type', 'style_name', 'description', 'tags', 'descripcion_larga', 'theme_tags', 'color_palette', 'css_variables', 'has_memory_attributes', 'memory_sources', 'html_content', 'category', 'filename', 'html_size'];
      const missingField = fieldMap.find(f => dbError.message.includes(f));
      const err = new Error('Campo requerido faltante en el módulo');
      err.status = 400;
      err.payload = { error: 'Campo requerido faltante en el módulo', field: missingField || 'desconocido', detail: dbError.message };
      throw err;
    }
    if (dbError.message && dbError.message.includes('UNIQUE')) {
      // Reintentar con sufijo incremental en module_id hasta encontrar uno libre
      const baseId = analysis.module_id;
      const MAX_ATTEMPTS = 50;
      const checkStmt = db.prepare('SELECT 1 FROM knowledge_base_modules WHERE module_id = ?');
      let attempt = 2;
      while (attempt <= MAX_ATTEMPTS) {
        const candidate = `${baseId}-${attempt}`;
        if (checkStmt.get(candidate)) { attempt++; continue; }
        try {
          result = tryInsert(candidate);
          finalModuleId = candidate;
          renamedFrom = baseId;
          break;
        } catch (e) {
          if (e.message && e.message.includes('UNIQUE')) { attempt++; continue; }
          throw e;
        }
      }
      if (!result) {
        const err = new Error(`No se pudo insertar el módulo: el module_id "${baseId}" y sus ${MAX_ATTEMPTS} variantes ya existen.`);
        err.status = 400;
        err.payload = { error: err.message, duplicate: true };
        throw err;
      }
    } else {
      throw dbError;
    }
  }

  return {
    success: true,
    id: result.lastInsertRowid,
    module_id: finalModuleId,
    renamed_from: renamedFrom,
    module_type: analysis.module_type,
    html_content: htmlContent,
    analysis: {
      metadata: analysis.metadata,
      errors: analysis.errors,
      warnings: analysis.warnings
    }
  };
}
