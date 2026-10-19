/**
 * Migración 0010 — identificadores UUID en todas las tablas de entidad.
 *
 * Convierte las claves primarias y foráneas de autoincrementales a UUID sin
 * perder datos:
 *  1. añade `id_uuid` a cada tabla con `id` numérico y lo rellena;
 *  2. añade `<fk>_uuid` a cada columna foránea (y a `utente_crea`/`utente_modifica`)
 *     y lo rellena cruzando con la tabla padre;
 *  3. elimina las claves foráneas, las claves primarias y las columnas antiguas;
 *  4. renombra las columnas UUID a sus nombres definitivos y recrea claves.
 *
 * Es idempotente: si ya no quedan tablas con `id` numérico, no hace nada.
 * Las tablas de unión no tienen `id`, pero sus columnas de clave compuesta
 * también se convierten.
 */

const UUID = 'CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
const TABLA_CONTROL = 'migraciones_aplicadas';

async function consultar(conexion, sql, valores = []) {
  const [filas] = await conexion.query(sql, valores);
  return filas;
}

async function tablasBase(conexion) {
  const filas = await consultar(
    conexion,
    "SELECT TABLE_NAME tabla FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME<>? ORDER BY TABLE_NAME",
    [TABLA_CONTROL]
  );
  return filas.map((fila) => fila.tabla);
}

async function columnas(conexion, tabla) {
  return consultar(
    conexion,
    'SELECT COLUMN_NAME columna, DATA_TYPE tipo, IS_NULLABLE nulo, EXTRA extra FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION',
    [tabla]
  );
}

async function clavesPrimarias(conexion) {
  const filas = await consultar(
    conexion,
    "SELECT TABLE_NAME tabla, COLUMN_NAME columna FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND CONSTRAINT_NAME='PRIMARY' ORDER BY TABLE_NAME, ORDINAL_POSITION"
  );
  const porTabla = new Map();
  for (const fila of filas) {
    if (!porTabla.has(fila.tabla)) porTabla.set(fila.tabla, []);
    porTabla.get(fila.tabla).push(fila.columna);
  }
  return porTabla;
}

async function clavesForaneas(conexion) {
  const filas = await consultar(
    conexion,
    `SELECT k.CONSTRAINT_NAME nombre, k.TABLE_NAME tabla, k.COLUMN_NAME columna,
            k.REFERENCED_TABLE_NAME padre, k.REFERENCED_COLUMN_NAME columna_padre,
            k.ORDINAL_POSITION posicion, r.UPDATE_RULE regla_update, r.DELETE_RULE regla_delete
       FROM information_schema.KEY_COLUMN_USAGE k
       JOIN information_schema.REFERENTIAL_CONSTRAINTS r
         ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA
        AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME
        AND r.TABLE_NAME=k.TABLE_NAME
      WHERE k.TABLE_SCHEMA=DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION`
  );
  const porNombre = new Map();
  for (const fila of filas) {
    const clave = `${fila.tabla}::${fila.nombre}`;
    if (!porNombre.has(clave)) {
      porNombre.set(clave, {
        nombre: fila.nombre,
        tabla: fila.tabla,
        padre: fila.padre,
        columnas: [],
        columnasPadre: [],
        reglaUpdate: fila.regla_update,
        reglaDelete: fila.regla_delete
      });
    }
    const claveForanea = porNombre.get(clave);
    claveForanea.columnas.push(fila.columna);
    claveForanea.columnasPadre.push(fila.columna_padre);
  }
  return [...porNombre.values()];
}

async function existeColumna(conexion, tabla, columna) {
  const filas = await consultar(
    conexion,
    'SELECT COUNT(*) total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',
    [tabla, columna]
  );
  return Number(filas[0].total) > 0;
}

function comillas(valor) {
  return `\`${String(valor).replace(/`/g, '``')}\``;
}

async function asegurarIndices(conexion) {
  const indices = [
    ['scontrini', 'idx_scontrini_cliente', 'INDEX', '(fk_cliente, stato)'],
    ['sesiones_refresco', 'idx_sesiones_refresco_usuario', 'INDEX', '(fk_utente, expira_at, revocado_at)'],
    [
      'calendario_manutenzioni_macchine',
      'uq_calendario_macchina_pezzo',
      'UNIQUE INDEX',
      '(fk_macchina, fk_pezzo)'
    ]
  ];
  for (const [tabla, nombre, tipo, columnas] of indices) {
    const existe = await consultar(
      conexion,
      'SELECT COUNT(*) total FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND INDEX_NAME=?',
      [tabla, nombre]
    );
    if (!Number(existe[0].total)) {
      await conexion.query(`ALTER TABLE ${comillas(tabla)} ADD ${tipo} ${comillas(nombre)} ${columnas}`);
    }
  }
}

export default async function migrar(conexion) {
  const tablas = await tablasBase(conexion);
  const metadatos = new Map();
  for (const tabla of tablas) metadatos.set(tabla, await columnas(conexion, tabla));

  const entidades = tablas.filter((tabla) => {
    const columna = metadatos.get(tabla).find((fila) => fila.columna === 'id');
    return columna && ['bigint', 'int', 'mediumint', 'smallint'].includes(columna.tipo);
  });

  if (!entidades.length) {
    // Una ejecución interrumpida puede haber convertido las columnas pero no
    // haber llegado a recrear los índices: se reparan sin volver a convertir.
    await asegurarIndices(conexion);
    console.log('UUID: no hay identificadores numéricos que convertir; índices verificados.');
    return;
  }

  const foraneas = await clavesForaneas(conexion);
  const primariasPorTabla = await clavesPrimarias(conexion);
  const conversiones = [];
  const primariasARecrear = [];

  await conexion.query('SET FOREIGN_KEY_CHECKS=0');
  try {
    // 1) Identificador nuevo de cada entidad.
    for (const tabla of entidades) {
      await conexion.query(`ALTER TABLE ${comillas(tabla)} ADD COLUMN id_uuid ${UUID} NULL`);
    }
    for (const tabla of entidades) {
      await conexion.query(`UPDATE ${comillas(tabla)} SET id_uuid=UUID() WHERE id_uuid IS NULL`);
    }

    // 2) Columnas foráneas.
    for (const clave of foraneas) {
      for (const columna of clave.columnas) {
        const definicion = metadatos.get(clave.tabla).find((fila) => fila.columna === columna);
        const nueva = `${columna}_uuid`;
        if (!(await existeColumna(conexion, clave.tabla, nueva))) {
          await conexion.query(`ALTER TABLE ${comillas(clave.tabla)} ADD COLUMN ${comillas(nueva)} ${UUID} NULL`);
        }
        await conexion.query(
          `UPDATE ${comillas(clave.tabla)} c JOIN ${comillas(clave.padre)} p ON c.${comillas(columna)}=p.id SET c.${comillas(nueva)}=p.id_uuid WHERE c.${comillas(columna)} IS NOT NULL`
        );
        conversiones.push({ tabla: clave.tabla, columna, nueva, nulo: definicion?.nulo === 'YES' });
      }
    }

    // 3) Actor de auditoría en cualquier tabla (no siempre lleva FK declarada).
    for (const tabla of tablas) {
      for (const columna of ['utente_crea', 'utente_modifica']) {
        const definicion = metadatos.get(tabla).find((fila) => fila.columna === columna);
        if (!definicion || !['bigint', 'int', 'mediumint', 'smallint'].includes(definicion.tipo)) continue;
        const nueva = `${columna}_uuid`;
        if (!(await existeColumna(conexion, tabla, nueva))) {
          await conexion.query(`ALTER TABLE ${comillas(tabla)} ADD COLUMN ${comillas(nueva)} ${UUID} NULL`);
        }
        await conexion.query(
          `UPDATE ${comillas(tabla)} c JOIN utenti u ON c.${comillas(columna)}=u.id SET c.${comillas(nueva)}=u.id_uuid WHERE c.${comillas(columna)} IS NOT NULL`
        );
        conversiones.push({ tabla, columna, nueva, nulo: definicion.nulo === 'YES' });
      }
    }

    // 4) Quitar claves foráneas, índices que dependan de columnas convertidas,
    //    claves primarias y columnas antiguas.
    for (const clave of foraneas) {
      await conexion.query(
        `ALTER TABLE ${comillas(clave.tabla)} DROP FOREIGN KEY ${comillas(clave.nombre)}`
      );
    }

    const convertidasPorTabla = new Map();
    for (const conversion of conversiones) {
      if (!convertidasPorTabla.has(conversion.tabla)) convertidasPorTabla.set(conversion.tabla, new Set());
      convertidasPorTabla.get(conversion.tabla).add(conversion.columna);
    }
    for (const [tabla, convertidas] of convertidasPorTabla) {
      const filas = await consultar(
        conexion,
        'SELECT INDEX_NAME indice, COLUMN_NAME columna FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY INDEX_NAME, SEQ_IN_INDEX',
        [tabla]
      );
      const indices = new Map();
      for (const fila of filas) {
        if (fila.indice === 'PRIMARY') continue;
        if (!indices.has(fila.indice)) indices.set(fila.indice, []);
        indices.get(fila.indice).push(fila.columna);
      }
      for (const [indice, columnasIndice] of indices) {
        if (columnasIndice.some((columna) => convertidas.has(columna))) {
          await conexion.query(`ALTER TABLE ${comillas(tabla)} DROP INDEX ${comillas(indice)}`);
        }
      }
    }

    for (const [tabla, primarias] of primariasPorTabla) {
      const columnasConvertidas = primarias.filter((columna) => {
        if (columna === 'id' && entidades.includes(tabla)) return true;
        return conversiones.some((conversion) => conversion.tabla === tabla && conversion.columna === columna);
      });
      if (!columnasConvertidas.length) continue;

      const columnaId = metadatos.get(tabla).find((fila) => fila.columna === 'id');
      if (columnaId?.extra?.toLowerCase().includes('auto_increment')) {
        await conexion.query(`ALTER TABLE ${comillas(tabla)} MODIFY id BIGINT UNSIGNED NOT NULL`);
      }
      await conexion.query(`ALTER TABLE ${comillas(tabla)} DROP PRIMARY KEY`);
      primariasARecrear.push({ tabla, columnas: primarias });
    }

    for (const tabla of entidades) {
      await conexion.query(`ALTER TABLE ${comillas(tabla)} DROP COLUMN id`);
      await conexion.query(`ALTER TABLE ${comillas(tabla)} CHANGE id_uuid id ${UUID} NOT NULL`);
    }

    for (const conversion of conversiones) {
      await conexion.query(`ALTER TABLE ${comillas(conversion.tabla)} DROP COLUMN ${comillas(conversion.columna)}`);
      await conexion.query(
        `ALTER TABLE ${comillas(conversion.tabla)} CHANGE ${comillas(conversion.nueva)} ${comillas(conversion.columna)} ${UUID} ${conversion.nulo ? 'NULL' : 'NOT NULL'}`
      );
    }

    // 5) Recrear claves primarias y foráneas.
    for (const primaria of primariasARecrear) {
      await conexion.query(
        `ALTER TABLE ${comillas(primaria.tabla)} ADD PRIMARY KEY (${primaria.columnas.map(comillas).join(',')})`
      );
    }

    for (const clave of foraneas) {
      const reglas = [
        clave.reglaDelete && clave.reglaDelete !== 'RESTRICT' ? `ON DELETE ${clave.reglaDelete}` : '',
        clave.reglaUpdate && clave.reglaUpdate !== 'RESTRICT' ? `ON UPDATE ${clave.reglaUpdate}` : ''
      ]
        .filter(Boolean)
        .join(' ');
      await conexion.query(
        `ALTER TABLE ${comillas(clave.tabla)} ADD CONSTRAINT ${comillas(clave.nombre)} FOREIGN KEY (${clave.columnas
          .map(comillas)
          .join(',')}) REFERENCES ${comillas(clave.padre)} (${clave.columnasPadre.map(comillas).join(',')}) ${reglas}`
      );
    }

    // 6) Índices conocidos que dependían de columnas convertidas.
    await asegurarIndices(conexion);

    console.log(`UUID: convertidas ${entidades.length} tablas de entidad.`);
  } finally {
    await conexion.query('SET FOREIGN_KEY_CHECKS=1');
  }
}
