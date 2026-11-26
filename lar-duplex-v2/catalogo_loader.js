
/*
 * UNIVERSO ZERO — CARREGADOR DO INVENTÁRIO MESTRE
 * Versão 1.0.0
 */

(function (global) {
  'use strict';

  const CATALOG_URL =
    'https://guilabriolag.github.io/Zyro/universo-zero-catalogo-v1/inventario_mestre.json';

  const EXPECTED_VERSION = '1.0';
  const EXPECTED_TOTAL = 199;

  const GROUP_CODES = [
    'MOB', 'ELP', 'ILU', 'ARQ', 'OBJ', 'TEC', 'FIT'
  ];

  function validateCatalog(data) {
    const errors = [];

    if (!data || typeof data !== 'object') {
      throw new Error('JSON inválido.');
    }

    if (data.projeto !== 'UNIVERSO ZERO') {
      errors.push('Projeto incompatível.');
    }

    if (String(data.versao) !== EXPECTED_VERSION) {
      errors.push('Versão incompatível.');
    }

    if (!Array.isArray(data.ambientes)) {
      errors.push('Lista de ambientes inválida.');
    }

    if (!Array.isArray(data.compatibilidades)) {
      errors.push('Lista de compatibilidades inválida.');
    }

    if (!data.grupos || typeof data.grupos !== 'object') {
      errors.push('Grupos não encontrados.');
    }

    if (errors.length) {
      throw new Error(errors.join(' '));
    }

    const items = [];
    const seen = new Set();

    for (const code of GROUP_CODES) {
      const list = data.grupos[code];

      if (!Array.isArray(list)) {
        errors.push('Grupo inválido: ' + code);
        continue;
      }

      for (const item of list) {
        if (!item || !item.id || !item.nome || item.grupo !== code) {
          errors.push('Registro inválido em ' + code);
          continue;
        }

        if (seen.has(item.id)) {
          errors.push('ID duplicado: ' + item.id);
        }

        seen.add(item.id);
        items.push(item);
      }
    }

    if (items.length !== EXPECTED_TOTAL) {
      errors.push(
        'Total esperado: ' + EXPECTED_TOTAL +
        '. Encontrado: ' + items.length
      );
    }

    if (errors.length) {
      throw new Error(errors.join('\n'));
    }

    return items;
  }

  async function loadCatalog() {
    const response = await fetch(CATALOG_URL, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Erro HTTP: ' + response.status);
    }

    const data = await response.json();
    const items = validateCatalog(data);

    const byId = Object.create(null);
    const byGroup = Object.create(null);

    for (const code of GROUP_CODES) {
      byGroup[code] = data.grupos[code];
    }

    for (const item of items) {
      byId[item.id] = item;
    }

    return Object.freeze({
      projeto: data.projeto,
      versao: data.versao,
      total: items.length,
      ambientes: data.ambientes,
      compatibilidades: data.compatibilidades,
      grupos: data.grupos,
      itens: items,
      porId: byId,
      porGrupo: byGroup,

      obter: id => byId[id] || null,

      listarGrupo: code => byGroup[code] || [],

      listarAmbiente: ambienteId =>
        items.filter(item =>
          Array.isArray(item.ambientes) &&
          item.ambientes.includes(ambienteId)
        )
    });
  }

  global.UZCatalogReady = loadCatalog()
    .then(catalog => {
      global.UZCatalog = catalog;

      console.info(
        '[UNIVERSO ZERO] Catálogo V' +
        catalog.versao +
        ' carregado: ' +
        catalog.total +
        ' itens.'
      );

      global.dispatchEvent(
        new CustomEvent('uz-catalog-ready', {
          detail: {
            total: catalog.total,
            versao: catalog.versao
          }
        })
      );

      return catalog;
    })
    .catch(error => {
      global.UZCatalogError = error;

      console.error(
        '[UNIVERSO ZERO] Erro ao carregar catálogo:',
        error
      );

      global.dispatchEvent(
        new CustomEvent('uz-catalog-error', {
          detail: {
            message: error.message
          }
        })
      );

      throw error;
    });

})(window);
