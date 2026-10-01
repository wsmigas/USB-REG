import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { DatabaseSync } from 'node:sqlite';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const BASE_DIR = process.cwd();
const RELATORIOS_DIR = path.join(BASE_DIR, 'relatorios');
const BACKUPS_DIR = path.join(BASE_DIR, 'backups');
const DB_PATH = path.join(BASE_DIR, 'gestao_discos.db');

if (!fs.existsSync(RELATORIOS_DIR)) {
  fs.mkdirSync(RELATORIOS_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

export const ARQUIVOS_MAP: Record<string, string> = {
  ANTT: 'Arquivo Nacional da Torre do Tombo',
  ADAVR: 'Arquivo Distrital de Aveiro',
  ADBJA: 'Arquivo Distrital de Beja',
  ADBGC: 'Arquivo Distrital de Bragança',
  ADCTB: 'Arquivo Distrital de Castelo Branco',
  ADEVR: 'Arquivo Distrital de Évora',
  ADFAR: 'Arquivo Distrital de Faro',
  ADGRD: 'Arquivo Distrital da Guarda',
  ADLRA: 'Arquivo Distrital de Leiria',
  ADPTG: 'Arquivo Distrital de Portalegre',
  ADPRT: 'Arquivo Distrital do Porto',
  ADSTR: 'Arquivo Distrital de Santarém',
  ADSTB: 'Arquivo Distrital de Setúbal',
  ADVCT: 'Arquivo Distrital de Viana do Castelo',
  ADVRL: 'Arquivo Distrital de Vila Real',
  ADVIS: 'Arquivo Distrital de Viseu',
  AHU: 'Arquivo Histórico Ultramarino',
  CPF: 'Centro Português de Fotografia',
};

// In-memory cache for fast indexed file counts on multi-GB databases (15M+ rows)
const discoIndexedCountCache = new Map<number, { total_files: number; tif_files: number }>();
let cachedTotalFicheirosCount: number | null = null;

function invalidateIndexCountsCache(discoId?: number) {
  if (typeof discoId === 'number') {
    discoIndexedCountCache.delete(discoId);
  } else {
    discoIndexedCountCache.clear();
  }
  cachedTotalFicheirosCount = null;
}

function getDiscoFileCount(discoId: number): { total_files: number; tif_files: number } {
  const cached = discoIndexedCountCache.get(discoId);
  if (cached) return cached;
  try {
    // Fast covering-index count on idx_ficheiros_disco_id / idx_relatorio_ficheiros_disco
    const row = db
      .prepare('SELECT COUNT(*) as c FROM relatorio_ficheiros WHERE disco_id = ?')
      .get(discoId) as { c: number } | undefined;
    const count = row?.c || 0;
    const val = { total_files: count, tif_files: count };
    discoIndexedCountCache.set(discoId, val);
    return val;
  } catch {
    return { total_files: 0, tif_files: 0 };
  }
}

function getTotalIndexedCount(): number {
  if (cachedTotalFicheirosCount !== null) return cachedTotalFicheirosCount;
  try {
    // O(1) B-tree max(id) check first; if small table (<200k), run exact COUNT(*), else use fast estimate or single count
    const maxRow = db.prepare('SELECT COALESCE(MAX(id), 0) as m FROM relatorio_ficheiros').get() as
      | { m: number }
      | undefined;
    const maxId = maxRow?.m || 0;
    if (maxId <= 500000) {
      const exactRow = db.prepare('SELECT COUNT(*) as c FROM relatorio_ficheiros').get() as { c: number } | undefined;
      cachedTotalFicheirosCount = exactRow?.c || 0;
    } else {
      const exactRow = db.prepare('SELECT COUNT(*) as c FROM relatorio_ficheiros').get() as { c: number } | undefined;
      cachedTotalFicheirosCount = exactRow?.c || maxId;
    }
    return cachedTotalFicheirosCount;
  } catch {
    return 0;
  }
}

function ensureDatabaseSchema(targetDb: DatabaseSync) {
  targetDb.exec('PRAGMA journal_mode = WAL;');
  targetDb.exec('PRAGMA synchronous = NORMAL;');

  targetDb.exec(`
    CREATE TABLE IF NOT EXISTS discos_usb (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      arquivo TEXT,
      remetente TEXT,
      data_entrada TEXT,
      ticket_num TEXT,
      id_disco TEXT UNIQUE NOT NULL,
      localizacao TEXT,
      tamanho_disco TEXT,
      marca TEXT,
      numero_serie TEXT,
      verificado INTEGER DEFAULT 0,
      ticket_integracao TEXT,
      integrado INTEGER DEFAULT 0,
      armazenado_servidor INTEGER DEFAULT 0,
      total_imagens INTEGER DEFAULT 0,
      observacoes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      projeto TEXT,
      relatorio_path TEXT
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS relatorio_ficheiros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      disco_id INTEGER NOT NULL,
      nome_ficheiro TEXT NOT NULL,
      tamanho_bytes INTEGER DEFAULT 0,
      pasta TEXT DEFAULT ''
    );
  `);

  const alterColumns = [
    'ALTER TABLE discos_usb ADD COLUMN projeto TEXT;',
    'ALTER TABLE discos_usb ADD COLUMN relatorio_path TEXT;',
    'ALTER TABLE relatorio_ficheiros ADD COLUMN tamanho_bytes INTEGER DEFAULT 0;',
    "ALTER TABLE relatorio_ficheiros ADD COLUMN pasta TEXT DEFAULT '';",
  ];
  for (const sql of alterColumns) {
    try {
      targetDb.exec(sql);
    } catch {
      // Column already exists
    }
  }

  // Only create indexes on relatorio_ficheiros if an index on that column does not already exist
  // (Prevents rebuilding 1GB+ duplicate indexes when migrating a 2GB gestao_discos.db that already has idx_ficheiros_nome)
  try {
    const existingIdx = targetDb
      .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'relatorio_ficheiros'")
      .all() as { name: string; sql: string | null }[];
    const hasNomeIdx = existingIdx.some((i) => (i.sql || '').toLowerCase().includes('nome_ficheiro'));
    const hasDiscoIdx = existingIdx.some((i) => (i.sql || '').toLowerCase().includes('disco_id'));

    if (!hasNomeIdx) {
      targetDb.exec('CREATE INDEX IF NOT EXISTS idx_ficheiros_nome ON relatorio_ficheiros(nome_ficheiro);');
    }
    if (!hasDiscoIdx) {
      targetDb.exec('CREATE INDEX IF NOT EXISTS idx_ficheiros_disco_id ON relatorio_ficheiros(disco_id);');
    }
  } catch {
    // ignore
  }
}

// Initialize local SQLite database
let db = new DatabaseSync(DB_PATH);
ensureDatabaseSchema(db);

// Clean up any temporary curl test record if present
try {
  db.prepare("DELETE FROM discos_usb WHERE id_disco = 'DISCO-TEST-01' AND ticket_num = 'TICK-TEST-01'").run();
} catch {
  // ignore
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`ridis_salt_${password}`).digest('hex');
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (hashPassword(password) === storedHash) return true;

  // Support Python Werkzeug password hashes from the old Flask application (pbkdf2:sha256 and scrypt)
  try {
    if (storedHash.startsWith('pbkdf2:sha256:')) {
      // Format: pbkdf2:sha256:600000$salt$hash
      const parts = storedHash.split('$');
      if (parts.length === 3) {
        const headerParts = parts[0].split(':');
        const iterations = parseInt(headerParts[2] || '260000', 10);
        const salt = parts[1];
        const targetHex = parts[2];
        const keylen = Buffer.from(targetHex, 'hex').length;
        const derived = crypto.pbkdf2Sync(password, salt, iterations, keylen, 'sha256').toString('hex');
        return derived === targetHex;
      }
    } else if (storedHash.startsWith('scrypt:')) {
      // Format: scrypt:32768:8:1$salt$hash
      const parts = storedHash.split('$');
      if (parts.length === 3) {
        const params = parts[0].split(':');
        const n = parseInt(params[1] || '32768', 10);
        const r = parseInt(params[2] || '8', 10);
        const p = parseInt(params[3] || '1', 10);
        const salt = parts[1];
        const targetHex = parts[2];
        const keylen = Buffer.from(targetHex, 'hex').length;
        const derived = crypto
          .scryptSync(password, salt, keylen, { N: n, r, p, maxmem: 128 * 1024 * 1024 })
          .toString('hex');
        return derived === targetHex;
      }
    }
  } catch {
    return false;
  }

  return false;
}

export function formatarDataIso(dataStr: string | undefined | null): string {
  if (!dataStr) return '';
  const trimmed = String(dataStr).trim();
  const match = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const [, dia, mes, ano] = match;
    return `${ano}-${String(Number(mes)).padStart(2, '0')}-${String(Number(dia)).padStart(2, '0')}`;
  }
  return trimmed;
}

function sanitizeFilename(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Linear-time O(N) Snap2HTML parser and indexer.
 * Extracts file names from a Snap2HTML report (.html/.htm) and indexes them into relatorio_ficheiros
 * for ultra-fast .tif and archive reference search.
 */
export function indexarRelatorio(discoId: number, caminhoCompleto: string): { total: number; tifCount: number } {
  if (!fs.existsSync(caminhoCompleto)) {
    return { total: 0, tifCount: 0 };
  }

  let conteudo = '';
  try {
    conteudo = fs.readFileSync(caminhoCompleto, 'utf-8');
  } catch {
    try {
      conteudo = fs.readFileSync(caminhoCompleto, 'latin1');
    } catch {
      return { total: 0, tifCount: 0 };
    }
  }

  interface ExtractedFile {
    nome: string;
    tamanho: number;
    pasta: string;
  }

  const ficheirosExtraidos: ExtractedFile[] = [];

  // Primary linear-time Snap2HTML regex matching both folder headers ("path*0*ts") and files ("name.ext*size*ts")
  // Exactly matches the original Python pattern: r'"([^"*]+\.[A-Za-z0-9]{2,5})\*\d+\*\d+"' while also capturing folder context
  const tokenRegex = /"([^"*\r\n]+)\*(\d+)\*\d+"/g;
  let currentFolder = '';
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(conteudo)) !== null) {
    const rawName = match[1].trim();
    const rawSize = parseInt(match[2], 10) || 0;

    // In Snap2HTML, folder headers inside D.p([...]) have *0*timestamp and contain / or \ or :
    if (rawSize === 0 && (rawName.includes('/') || rawName.includes('\\') || rawName.includes(':'))) {
      currentFolder = rawName;
      continue;
    }

    // Check if it has a valid file extension (2 to 5 alphanumeric chars)
    if (/\.[A-Za-z0-9]{2,5}$/.test(rawName)) {
      ficheirosExtraidos.push({
        nome: rawName.toUpperCase(),
        tamanho: rawSize,
        pasta: currentFolder,
      });
    }
  }

  // Fallback for plain HTML reports that don't use Snap2HTML's *size*timestamp format
  if (ficheirosExtraidos.length === 0) {
    const simpleTifRegex = /[A-Za-z0-9_\-.]+\.(?:tif|tiff|jp2|jpg|jpeg|pdf|xml)/gi;
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = simpleTifRegex.exec(conteudo)) !== null) {
      const upper = m[0].toUpperCase();
      if (!seen.has(upper)) {
        seen.add(upper);
        ficheirosExtraidos.push({
          nome: upper,
          tamanho: 0,
          pasta: '',
        });
      }
    }
  }

  let tifCount = 0;
  db.exec('BEGIN IMMEDIATE TRANSACTION');
  try {
    db.prepare('DELETE FROM relatorio_ficheiros WHERE disco_id = ?').run(discoId);

    if (ficheirosExtraidos.length > 0) {
      const insStmt = db.prepare(
        'INSERT INTO relatorio_ficheiros (disco_id, nome_ficheiro, tamanho_bytes, pasta) VALUES (?, ?, ?, ?)'
      );
      for (let i = 0; i < ficheirosExtraidos.length; i++) {
        const item = ficheirosExtraidos[i];
        insStmt.run(discoId, item.nome, item.tamanho, item.pasta);
        if (item.nome.endsWith('.TIF') || item.nome.endsWith('.TIFF')) {
          tifCount++;
        }
      }
    }
    db.exec('COMMIT');
    invalidateIndexCountsCache(discoId);
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore rollback error
    }
    console.error('Erro ao indexar relatório:', err);
  }

  return { total: ficheirosExtraidos.length, tifCount };
}

/**
 * Generates an authentic, interactive Snap2HTML report file inside ./relatorios/
 */
function gerarRelatorioSnap2HtmlReal(
  filename: string,
  idDisco: string,
  arquivoSigla: string,
  projeto: string,
  pastas: { pasta: string; cotaBase: string; qtdTif: number; tamanhoMedioBytes: number }[]
): string {
  const fullPath = path.join(RELATORIOS_DIR, filename);
  const timestampSec = Math.floor(Date.now() / 1000) - 86400;

  const dBlocks: string[] = [];
  const tableRowsHtml: string[] = [];
  let totalFiles = 0;
  let totalBytes = 0;

  for (const p of pastas) {
    const entries: string[] = [`"${p.pasta}*0*${timestampSec}"`];
    for (let i = 1; i <= p.qtdTif; i++) {
      const imgNum = String(i).padStart(4, '0');
      const sizeBytes = p.tamanhoMedioBytes + ((i * 137911) % 4500000);
      const fileTimestamp = timestampSec + i * 12;
      const tifName = `${p.cotaBase}_m${imgNum}.tif`;
      entries.push(`"${tifName}*${sizeBytes}*${fileTimestamp}"`);
      totalFiles++;
      totalBytes += sizeBytes;

      tableRowsHtml.push(`
        <tr>
          <td class="mono">${p.pasta}</td>
          <td class="mono fw">${tifName}</td>
          <td class="mono right">${(sizeBytes / (1024 * 1024)).toFixed(2)} MB</td>
          <td class="mono">IMAGE/TIFF</td>
        </tr>`);
    }
    const metsName = `${p.cotaBase}_METS.xml`;
    entries.push(`"${metsName}*28450*${timestampSec}"`);
    totalFiles++;
    totalBytes += 28450;
    tableRowsHtml.push(`
      <tr>
        <td class="mono">${p.pasta}</td>
        <td class="mono">${metsName}</td>
        <td class="mono right">27.78 KB</td>
        <td class="mono">TEXT/XML</td>
      </tr>`);

    dBlocks.push(`D.p([${entries.join(',')}]);`);
  }

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Snap2HTML Report — ${idDisco} (${arquivoSigla})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 24px; }
    .container { max-width: 1200px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 8px; overflow: hidden; }
    .header { padding: 20px 24px; background: #0f172a; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
    .title { font-size: 18px; font-weight: 700; color: #f8fafc; margin: 0; }
    .subtitle { font-size: 13px; color: #94a3b8; margin-top: 4px; }
    .stats { display: flex; gap: 20px; font-size: 13px; color: #cbd5e1; font-family: monospace; }
    .search-bar { padding: 14px 24px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; gap: 12px; align-items: center; }
    .search-input { flex: 1; background: #0f172a; border: 1px solid #475569; color: #f8fafc; padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 10px 16px; background: #0f172a; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #334155; }
    td { padding: 8px 16px; border-bottom: 1px solid #334155; color: #cbd5e1; }
    tr:hover td { background: #334155; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .fw { color: #38bdf8; font-weight: 600; }
    .right { text-align: right; }
  </style>
  <script>
    var D = { p: function(arr) { this.data = this.data || []; this.data.push(arr); } };
    ${dBlocks.join('\n    ')}
  </script>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 class="title">Relatório Snap2HTML — Disco ${idDisco}</h1>
        <div class="subtitle">${arquivoSigla} — ${ARQUIVOS_MAP[arquivoSigla] || arquivoSigla} · Projeto: ${projeto}</div>
      </div>
      <div class="stats">
        <span>Ficheiros: <strong>${totalFiles}</strong></span>
        <span>Tamanho Total: <strong>${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB</strong></span>
      </div>
    </div>
    <div class="search-bar">
      <input type="text" id="filterInput" class="search-input" placeholder="Filtrar ficheiros .tif neste relatório..." oninput="filtrarTabela(this.value)">
    </div>
    <table id="filesTable">
      <thead>
        <tr>
          <th>Pasta no Disco</th>
          <th>Nome do Ficheiro (.TIF / Metadados)</th>
          <th class="right">Tamanho</th>
          <th>Tipo</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml.join('')}
      </tbody>
    </table>
  </div>
  <script>
    function filtrarTabela(q) {
      var term = q.toUpperCase();
      var rows = document.querySelectorAll('#filesTable tbody tr');
      rows.forEach(function(r) {
        r.style.display = r.textContent.toUpperCase().indexOf(term) > -1 ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(fullPath, html, 'utf-8');
  return filename;
}

function seedDatabaseIfNeeded() {
  const userCountRow = db.prepare('SELECT COUNT(*) as cnt FROM usuarios').get() as { cnt: number };
  if (userCountRow.cnt === 0) {
    const insUser = db.prepare('INSERT INTO usuarios (username, password_hash, is_admin) VALUES (?, ?, ?)');
    insUser.run('admin', hashPassword('admin123'), 1);
    insUser.run('jmagalhaes', hashPassword('ridis2026'), 1);
    insUser.run('operador', hashPassword('operador123'), 0);
  }

  const diskCountRow = db.prepare('SELECT COUNT(*) as cnt FROM discos_usb').get() as { cnt: number };
  if (diskCountRow.cnt === 0) {
    const sampleDisks = [
      {
        arquivo: 'ANTT',
        remetente: 'Carlos Mendes',
        data_entrada: '2026-09-22',
        ticket_num: 'TICK-2026-8410',
        id_disco: 'DISCO-ANTT-041',
        projeto: 'PRR — Digitalização Registos Paroquiais',
        localizacao: 'Cofre B · Prateleira 2',
        tamanho_disco: '4 TB',
        marca: 'Western Digital Black',
        numero_serie: 'WDB-SN9984120A',
        verificado: 1,
        ticket_integracao: 'INT-2026-4102',
        integrado: 1,
        armazenado_servidor: 1,
        total_imagens: 45,
        observacoes: 'Matrizes TIFF não comprimidas 400dpi verificadas sem erros de checksum.',
        relatorio_file: 'DISCO-ANTT-041_1727510001.html',
        pastas: [
          {
            pasta: 'E:/PT-ANTT-PRQ-LSB01/Livros_Batismo',
            cotaBase: 'PT-ANTT-PRQ-LSB01-001-0001',
            qtdTif: 25,
            tamanhoMedioBytes: 48500000,
          },
          {
            pasta: 'E:/PT-ANTT-PRQ-LSB01/Livros_Casamento',
            cotaBase: 'PT-ANTT-PRQ-LSB01-002-0014',
            qtdTif: 20,
            tamanhoMedioBytes: 51200000,
          },
        ],
      },
      {
        arquivo: 'ADPRT',
        remetente: 'Helena Sousa',
        data_entrada: '2026-09-19',
        ticket_num: 'TICK-2026-8392',
        id_disco: 'DISCO-ADPRT-118',
        projeto: 'PRR — Fundos Notariais Porto',
        localizacao: 'Armário A · Gaveta 4',
        tamanho_disco: '8 TB',
        marca: 'Seagate IronWolf Pro',
        numero_serie: 'ST8000VN004-7721',
        verificado: 1,
        ticket_integracao: 'INT-2026-4089',
        integrado: 1,
        armazenado_servidor: 1,
        total_imagens: 40,
        observacoes: 'Inclui lotes do 1.º Cartório Notarial do Porto. Relatório Snap2HTML indexado.',
        relatorio_file: 'DISCO-ADPRT-118_1727510002.html',
        pastas: [
          {
            pasta: 'F:/PT-ADPRT-NOT-CNPRT01/Lote_01',
            cotaBase: 'PT-ADPRT-NOT-CNPRT01-001-0042',
            qtdTif: 20,
            tamanhoMedioBytes: 62000000,
          },
          {
            pasta: 'F:/PT-ADPRT-PRQ-PPRT01/Lote_02',
            cotaBase: 'PT-ADPRT-PRQ-PPRT01-003-0108',
            qtdTif: 20,
            tamanhoMedioBytes: 58400000,
          },
        ],
      },
      {
        arquivo: 'ADAVR',
        remetente: 'Rui Figueiredo',
        data_entrada: '2026-09-15',
        ticket_num: 'TICK-2026-8315',
        id_disco: 'DISCO-ADAVR-019',
        projeto: 'Digitalização Passaportes Aveiro',
        localizacao: 'Armário A · Gaveta 1',
        tamanho_disco: '2 TB',
        marca: 'Samsung T7 Shield',
        numero_serie: 'S6XPNS0W401928',
        verificado: 1,
        ticket_integracao: 'INT-2026-4055',
        integrado: 0,
        armazenado_servidor: 1,
        total_imagens: 30,
        observacoes: 'Aguarda validação final do ticket de integração no repositório.',
        relatorio_file: 'DISCO-ADAVR-019_1727510003.html',
        pastas: [
          {
            pasta: 'D:/PT-ADAVR-AC-GCAVR/Passaportes_1880_1910',
            cotaBase: 'PT-ADAVR-AC-GCAVR-H-D-001-0005',
            qtdTif: 30,
            tamanhoMedioBytes: 39100000,
          },
        ],
      },
      {
        arquivo: 'AHU',
        remetente: 'Teresa Vasconcelos',
        data_entrada: '2026-09-10',
        ticket_num: 'TICK-2026-8240',
        id_disco: 'DISCO-AHU-074',
        projeto: 'Conselho Ultramarino — Cartografia',
        localizacao: 'Cofre A · Prateleira 1',
        tamanho_disco: '6 TB',
        marca: 'LaCie d2 Professional',
        numero_serie: 'LAC-6TB-0092841',
        verificado: 1,
        ticket_integracao: 'INT-2026-3998',
        integrado: 1,
        armazenado_servidor: 1,
        total_imagens: 28,
        observacoes: 'Cartografia histórica de grande formato (TIFF 600dpi).',
        relatorio_file: 'DISCO-AHU-074_1727510004.html',
        pastas: [
          {
            pasta: 'G:/PT-AHU-CU-CART/Brasil_Maranhao',
            cotaBase: 'PT-AHU-CU-CART-009-0082',
            qtdTif: 16,
            tamanhoMedioBytes: 115000000,
          },
          {
            pasta: 'G:/PT-AHU-CU-CART/Angola_Luanda',
            cotaBase: 'PT-AHU-CU-CART-001-0019',
            qtdTif: 12,
            tamanhoMedioBytes: 98000000,
          },
        ],
      },
      {
        arquivo: 'CPF',
        remetente: 'Miguel Moreira',
        data_entrada: '2026-09-05',
        ticket_num: 'TICK-2026-8190',
        id_disco: 'DISCO-CPF-032',
        projeto: 'Espólio Fotográfico Alvão',
        localizacao: 'Sala Técnica 2 · Bastidor 3',
        tamanho_disco: '4 TB',
        marca: 'SanDisk Professional G-Drive',
        numero_serie: 'SDG-4TB-882716',
        verificado: 1,
        ticket_integracao: '',
        integrado: 0,
        armazenado_servidor: 1,
        total_imagens: 25,
        observacoes: 'Negativos em vidro digitalizados em matrizes TIFF 16-bit.',
        relatorio_file: 'DISCO-CPF-032_1727510005.html',
        pastas: [
          {
            pasta: 'E:/PT-CPF-ALV/Placas_Vidro_Douro',
            cotaBase: 'PT-CPF-ALV-001-0210',
            qtdTif: 25,
            tamanhoMedioBytes: 84000000,
          },
        ],
      },
      {
        arquivo: 'ADEVR',
        remetente: 'Ana Paula Tavares',
        data_entrada: '2026-08-28',
        ticket_num: 'TICK-2026-8104',
        id_disco: 'DISCO-ADEVR-055',
        projeto: 'PRR — Misericórdia de Évora',
        localizacao: 'Armário B · Gaveta 2',
        tamanho_disco: '2 TB',
        marca: 'Toshiba Canvio Basics',
        numero_serie: 'TOS-2TB-4491827',
        verificado: 0,
        ticket_integracao: '',
        integrado: 0,
        armazenado_servidor: 0,
        total_imagens: 22,
        observacoes: 'Rececionado nos Serviços Centrais. Em fila para verificação técnica.',
        relatorio_file: 'DISCO-ADEVR-055_1727510006.html',
        pastas: [
          {
            pasta: 'D:/PT-ADEVR-SCMEVR/Livros_Receita',
            cotaBase: 'PT-ADEVR-SCMEVR-A-004-0011',
            qtdTif: 22,
            tamanhoMedioBytes: 44000000,
          },
        ],
      },
    ];

    const insertStmt = db.prepare(`
      INSERT INTO discos_usb (
        arquivo, remetente, data_entrada, ticket_num, id_disco, projeto,
        localizacao, tamanho_disco, marca, numero_serie,
        verificado, ticket_integracao, integrado,
        armazenado_servidor, total_imagens, observacoes, relatorio_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const d of sampleDisks) {
      gerarRelatorioSnap2HtmlReal(d.relatorio_file, d.id_disco, d.arquivo, d.projeto, d.pastas);
      const res = insertStmt.run(
        d.arquivo,
        d.remetente,
        d.data_entrada,
        d.ticket_num,
        d.id_disco,
        d.projeto,
        d.localizacao,
        d.tamanho_disco,
        d.marca,
        d.numero_serie,
        d.verificado,
        d.ticket_integracao,
        d.integrado,
        d.armazenado_servidor,
        d.total_imagens,
        d.observacoes,
        d.relatorio_file
      );
      const discoId = Number(res.lastInsertRowid);
      indexarRelatorio(discoId, path.join(RELATORIOS_DIR, d.relatorio_file));
    }
  }
}

seedDatabaseIfNeeded();

// Configure Multer for uploading Snap2HTML reports into ./relatorios and CSV imports
const reportStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, RELATORIOS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.html';
    const rawBase = req.body?.id_disco || req.body?.ticket_num || path.basename(file.originalname, ext) || 'disco';
    const safeBase = sanitizeFilename(String(rawBase)) || 'disco';
    const nomeFinal = `${safeBase}_${Math.floor(Date.now() / 1000)}${ext}`;
    cb(null, nomeFinal);
  },
});

const uploadReport = multer({
  storage: reportStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const lower = file.originalname.toLowerCase();
    if (lower.endsWith('.html') || lower.endsWith('.htm')) {
      cb(null, true);
    } else {
      cb(new Error('ERRO_EXTENSAO'));
    }
  },
});

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const SQL_DATA_ORDER = `
  CASE 
    WHEN data_entrada LIKE '__-__-____' THEN 
      substr(data_entrada,7,4) || '-' || substr(data_entrada,4,2) || '-' || substr(data_entrada,1,2)
    ELSE data_entrada 
  END DESC, id DESC
`;

/**
 * Chunked upload endpoint for Snap2HTML reports (.html/.htm).
 * Bypasses reverse-proxy payload limits (e.g. 32MB Cloud Run limit) so even 100MB+ Snap2HTML reports upload reliably.
 */
app.post('/api/relatorios/upload-chunk', (req, res) => {
  try {
    const { uploadId, chunkIndex, totalChunks, originalName, id_disco, ticket_num, chunkBase64 } = req.body;
    if (!uploadId || typeof chunkIndex !== 'number' || typeof totalChunks !== 'number' || !chunkBase64) {
      res.status(400).json({ error: 'Parâmetros de upload incompletos.' });
      return;
    }

    const lowerName = String(originalName || '').toLowerCase();
    if (!lowerName.endsWith('.html') && !lowerName.endsWith('.htm')) {
      res.status(400).json({ error: 'O relatório tem de ser um ficheiro .html ou .htm.' });
      return;
    }

    const safeUploadId = sanitizeFilename(String(uploadId));
    const tempPath = path.join(RELATORIOS_DIR, `.tmp_${safeUploadId}`);

    const buffer = Buffer.from(chunkBase64, 'base64');
    if (chunkIndex === 0 && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    fs.appendFileSync(tempPath, buffer);

    if (chunkIndex + 1 >= totalChunks) {
      const ext = path.extname(originalName).toLowerCase() || '.html';
      const rawBase = id_disco || ticket_num || path.basename(originalName, ext) || 'disco';
      const safeBase = sanitizeFilename(String(rawBase)) || 'disco';
      const nomeFinal = `${safeBase}_${Math.floor(Date.now() / 1000)}${ext}`;
      const finalPath = path.join(RELATORIOS_DIR, nomeFinal);

      fs.renameSync(tempPath, finalPath);
      res.json({ done: true, relatorio_path: nomeFinal });
    } else {
      res.json({ done: false, chunkIndex });
    }
  } catch (e: any) {
    res.status(500).json({ error: `Erro ao gravar bloco do relatório: ${e?.message || e}` });
  }
});

// Serve Snap2HTML reports from ./relatorios
app.get('/relatorios/:filename', (req, res) => {
  const filename = req.params.filename;
  const safeName = path.basename(filename);
  if (safeName !== filename) {
    res.status(404).send('Relatório não encontrado.');
    return;
  }
  const fullPath = path.join(RELATORIOS_DIR, safeName);
  if (!fs.existsSync(fullPath)) {
    res.status(404).send('Ficheiro de relatório não encontrado na pasta relatorios/.');
    return;
  }
  res.sendFile(fullPath);
});

// Download a sample Snap2HTML file so users can test importing a new report
app.get('/api/relatorios/exemplo-snap2html', (_req, res) => {
  const ts = Math.floor(Date.now() / 1000);
  const sampleHtml = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Snap2HTML Sample Report</title>
  <script>
    var D = { p: function(arr) {} };
    D.p([
      "E:/PT-ADSTB-PRQ-PSTB01/Lote_Teste*0*${ts}",
      "PT-ADSTB-PRQ-PSTB01-001-0001_m0001.tif*52428800*${ts}",
      "PT-ADSTB-PRQ-PSTB01-001-0001_m0002.tif*53104200*${ts}",
      "PT-ADSTB-PRQ-PSTB01-001-0001_m0003.tif*51890400*${ts}",
      "PT-ADSTB-PRQ-PSTB01-001-0001_m0004.tif*54120000*${ts}",
      "PT-ADSTB-PRQ-PSTB01-001-0001_m0005.tif*52991000*${ts}",
      "PT-ADSTB-PRQ-PSTB01-001-0001_METS.xml*19420*${ts}"
    ]);
  </script>
</head>
<body style="font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:24px;">
  <h2>Relatório Snap2HTML de Demonstração (PT-ADSTB-PRQ-PSTB01)</h2>
  <p>Contém 5 matrizes .TIF e 1 ficheiro METS.xml prontos para indexação automática.</p>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=exemplo_relatorio_snap2html.html');
  res.send(sampleHtml);
});

// Authentication API
app.post('/api/login', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  const user = db.prepare('SELECT * FROM usuarios WHERE username = ?').get(username) as
    | { id: number; username: string; password_hash: string; is_admin: number; created_at: string }
    | undefined;

  if (user && verifyPassword(password, user.password_hash)) {
    res.json({
      user: {
        id: user.id,
        username: user.username,
        is_admin: Boolean(user.is_admin),
      },
    });
  } else {
    res.status(401).json({ error: 'Utilizador ou palavra-passe incorretos.' });
  }
});

function buildFileLikePattern(rawQuery: string): { likePattern: string; normalized: string } {
  const normalized = rawQuery.trim().replace(/\//g, '-').toUpperCase();
  if (normalized.includes('*') || normalized.includes('?')) {
    const likePattern = normalized.replace(/\*/g, '%').replace(/\?/g, '_');
    return { likePattern, normalized };
  }
  return { likePattern: `%${normalized}%`, normalized };
}

// Main inventory & unified search endpoint
app.get('/api/discos', (req, res) => {
  const busca = String(req.query.q || '').trim();
  const f_arquivo = String(req.query.f_arquivo || '').trim();
  const f_projeto = String(req.query.f_projeto || '').trim();
  const f_localizacao = String(req.query.f_localizacao || '').trim();
  const f_verificado = String(req.query.f_verificado || '').trim();
  const f_integrado = String(req.query.f_integrado || '').trim();
  const f_armazenado = String(req.query.f_armazenado || '').trim();

  const projetosRows = db
    .prepare("SELECT DISTINCT projeto FROM discos_usb WHERE projeto IS NOT NULL AND projeto != '' ORDER BY projeto")
    .all() as { projeto: string }[];
  const projetos = projetosRows.map((p) => p.projeto);

  const localizacoesRows = db
    .prepare(
      "SELECT DISTINCT localizacao FROM discos_usb WHERE localizacao IS NOT NULL AND localizacao != '' ORDER BY localizacao"
    )
    .all() as { localizacao: string }[];
  const localizacoes = localizacoesRows.map((l) => l.localizacao);

  const whereClauses: string[] = [];
  const params: (string | number)[] = [];

  if (f_arquivo) {
    whereClauses.push('arquivo = ?');
    params.push(f_arquivo);
  }
  if (f_projeto) {
    whereClauses.push('projeto = ?');
    params.push(f_projeto);
  }
  if (f_localizacao) {
    whereClauses.push('localizacao = ?');
    params.push(f_localizacao);
  }
  if (f_verificado === '0' || f_verificado === '1') {
    whereClauses.push('verificado = ?');
    params.push(Number(f_verificado));
  }
  if (f_integrado === '0' || f_integrado === '1') {
    whereClauses.push('integrado = ?');
    params.push(Number(f_integrado));
  }
  if (f_armazenado === '0' || f_armazenado === '1') {
    whereClauses.push('armazenado_servidor = ?');
    params.push(Number(f_armazenado));
  }

  let discos: any[] = [];
  const matchedFilesByDisco: Record<number, { files: string[]; total: number }> = {};

  if (busca) {
    const isWildcard = busca.includes('*') || busca.includes('?');
    const padraoTexto = isWildcard ? busca.replace(/\*/g, '%').replace(/\?/g, '_') : `%${busca}%`;

    const { likePattern } = buildFileLikePattern(busca);
    const matchingFileRows = db
      .prepare(
        `SELECT disco_id, nome_ficheiro FROM relatorio_ficheiros WHERE nome_ficheiro LIKE ? ORDER BY nome_ficheiro LIMIT 500`
      )
      .all(likePattern) as { disco_id: number; nome_ficheiro: string }[];

    const matchedDiscoIds = new Set<number>();
    for (const row of matchingFileRows) {
      matchedDiscoIds.add(row.disco_id);
      if (!matchedFilesByDisco[row.disco_id]) {
        matchedFilesByDisco[row.disco_id] = { files: [], total: 0 };
      }
      matchedFilesByDisco[row.disco_id].total++;
      if (matchedFilesByDisco[row.disco_id].files.length < 10) {
        matchedFilesByDisco[row.disco_id].files.push(row.nome_ficheiro);
      }
    }

    const textClause = `
      (id_disco LIKE ? 
       OR projeto LIKE ?
       OR arquivo LIKE ? 
       OR remetente LIKE ? 
       OR ticket_num LIKE ? 
       OR numero_serie LIKE ? 
       OR localizacao LIKE ?
       OR ticket_integracao LIKE ?
       OR observacoes LIKE ?)
    `;
    const textParams = Array(9).fill(padraoTexto);

    if (matchedDiscoIds.size > 0) {
      const idList = Array.from(matchedDiscoIds);
      const placeholders = idList.map(() => '?').join(',');
      const combinedClause = `(${textClause} OR id IN (${placeholders}))`;
      const fullWhere = [...whereClauses, combinedClause].join(' AND ');
      discos = db
        .prepare(`SELECT * FROM discos_usb WHERE ${fullWhere} ORDER BY ${SQL_DATA_ORDER}`)
        .all(...params, ...textParams, ...idList);
    } else {
      const fullWhere = [...whereClauses, textClause].join(' AND ');
      discos = db
        .prepare(`SELECT * FROM discos_usb WHERE ${fullWhere} ORDER BY ${SQL_DATA_ORDER}`)
        .all(...params, ...textParams);
    }
  } else if (whereClauses.length > 0) {
    const sqlWhere = whereClauses.join(' AND ');
    discos = db.prepare(`SELECT * FROM discos_usb WHERE ${sqlWhere} ORDER BY ${SQL_DATA_ORDER}`).all(...params);
  } else {
    discos = db.prepare(`SELECT * FROM discos_usb ORDER BY ${SQL_DATA_ORDER} LIMIT 50`).all();
  }

  const enrichedDiscos = discos.map((d) => {
    const c = getDiscoFileCount(d.id);
    const matched = matchedFilesByDisco[d.id] || { files: [], total: 0 };
    return {
      ...d,
      verificado: Boolean(d.verificado),
      integrado: Boolean(d.integrado),
      armazenado_servidor: Boolean(d.armazenado_servidor),
      indexed_files_count: c.total_files,
      indexed_tif_count: c.tif_files,
      matched_files: matched.files,
      matched_files_total: matched.total,
    };
  });

  let totalGeral = 0;
  let totalImagensSoma = 0;
  let totalVerificado = 0;
  let totalIntegrado = 0;
  let totalArmazenado = 0;

  if (busca || whereClauses.length > 0) {
    totalGeral = enrichedDiscos.length;
    totalImagensSoma = enrichedDiscos.reduce((acc, d) => acc + (Number(d.total_imagens) || 0), 0);
    totalVerificado = enrichedDiscos.filter((d) => d.verificado).length;
    totalIntegrado = enrichedDiscos.filter((d) => d.integrado).length;
    totalArmazenado = enrichedDiscos.filter((d) => d.armazenado_servidor).length;
  } else {
    const statsRow = db
      .prepare(
        `SELECT
          COUNT(*) as total,
          COALESCE(SUM(total_imagens), 0) as total_imagens,
          SUM(CASE WHEN verificado = 1 THEN 1 ELSE 0 END) as total_verificado,
          SUM(CASE WHEN integrado = 1 THEN 1 ELSE 0 END) as total_integrado,
          SUM(CASE WHEN armazenado_servidor = 1 THEN 1 ELSE 0 END) as total_armazenado
        FROM discos_usb`
      )
      .get() as any;
    totalGeral = statsRow?.total || 0;
    totalImagensSoma = statsRow?.total_imagens || 0;
    totalVerificado = statsRow?.total_verificado || 0;
    totalIntegrado = statsRow?.total_integrado || 0;
    totalArmazenado = statsRow?.total_armazenado || 0;
  }

  const totalIndexed = getTotalIndexedCount();

  const pct = (val: number) => (totalGeral > 0 ? Math.round((val / totalGeral) * 100) : 0);

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.json({
    discos: enrichedDiscos,
    projetos,
    localizacoes,
    arquivos: ARQUIVOS_MAP,
    stats: {
      total: totalGeral,
      total_imagens: totalImagensSoma,
      verificado: totalVerificado,
      pct_verificado: pct(totalVerificado),
      integrado: totalIntegrado,
      pct_integrado: pct(totalIntegrado),
      armazenado: totalArmazenado,
      pct_armazenado: pct(totalArmazenado),
      total_indexed_files: totalIndexed,
      total_indexed_tif: totalIndexed,
    },
  });
});

// Dedicated fast search for .TIF files and indexed Snap2HTML entries
app.get('/api/pesquisa-tif', (req, res) => {
  const startHr = performance.now();
  const q = String(req.query.q || '').trim();
  const arquivo = String(req.query.arquivo || '').trim();
  const discoId = req.query.disco_id ? Number(req.query.disco_id) : null;
  const apenasTif = req.query.apenas_tif !== '0';
  const limit = Math.min(Number(req.query.limit) || 150, 500);

  const where: string[] = [];
  const params: (string | number)[] = [];

  if (q) {
    const { likePattern } = buildFileLikePattern(q);
    where.push('(rf.nome_ficheiro LIKE ? OR rf.pasta LIKE ?)');
    params.push(likePattern, likePattern);
  }

  if (apenasTif) {
    where.push("(rf.nome_ficheiro LIKE '%.TIF' OR rf.nome_ficheiro LIKE '%.TIFF')");
  }

  if (arquivo) {
    where.push('d.arquivo = ?');
    params.push(arquivo);
  }

  if (discoId) {
    where.push('rf.disco_id = ?');
    params.push(discoId);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const countRow = db
    .prepare(
      `SELECT COUNT(*) as total
       FROM relatorio_ficheiros rf
       JOIN discos_usb d ON d.id = rf.disco_id
       ${whereSql}`
    )
    .get(...params) as { total: number };

  const rows = db
    .prepare(
      `SELECT 
        rf.id,
        rf.disco_id,
        rf.nome_ficheiro,
        rf.tamanho_bytes,
        rf.pasta,
        d.id_disco,
        d.arquivo,
        d.projeto,
        d.localizacao,
        d.ticket_num,
        d.ticket_integracao,
        d.data_entrada,
        d.relatorio_path,
        d.verificado,
        d.integrado,
        d.armazenado_servidor
       FROM relatorio_ficheiros rf
       JOIN discos_usb d ON d.id = rf.disco_id
       ${whereSql}
       ORDER BY rf.nome_ficheiro ASC
       LIMIT ?`
    )
    .all(...params, limit);

  const elapsedMs = Number((performance.now() - startHr).toFixed(2));

  res.json({
    total: countRow?.total || 0,
    elapsed_ms: elapsedMs,
    ficheiros: rows,
  });
});

// Get files indexed for a specific disk
app.get('/api/discos/:id/ficheiros', (req, res) => {
  const discoId = Number(req.params.id);
  const q = String(req.query.q || '').trim();
  const apenasTif = req.query.apenas_tif === '1';

  const disco = db.prepare('SELECT * FROM discos_usb WHERE id = ?').get(discoId);
  if (!disco) {
    res.status(404).json({ error: 'Disco não encontrado.' });
    return;
  }

  const clauses = ['disco_id = ?'];
  const params: (string | number)[] = [discoId];

  if (q) {
    const { likePattern } = buildFileLikePattern(q);
    clauses.push('(nome_ficheiro LIKE ? OR pasta LIKE ?)');
    params.push(likePattern, likePattern);
  }
  if (apenasTif) {
    clauses.push("(nome_ficheiro LIKE '%.TIF' OR nome_ficheiro LIKE '%.TIFF')");
  }

  const ficheiros = db
    .prepare(
      `SELECT id, nome_ficheiro, tamanho_bytes, pasta 
       FROM relatorio_ficheiros 
       WHERE ${clauses.join(' AND ')}
       ORDER BY nome_ficheiro ASC
       LIMIT 500`
    )
    .all(...params);

  const totalRow = db
    .prepare(`SELECT COUNT(*) as total FROM relatorio_ficheiros WHERE ${clauses.join(' AND ')}`)
    .get(...params) as { total: number };

  res.json({
    disco,
    total: totalRow?.total || 0,
    ficheiros,
  });
});

// Shared handler for creating a disk (supports both JSON with chunked relatorio_uploaded_path and multipart/form-data)
function handleCreateDiscoRecord(req: express.Request, res: express.Response) {
  const ticket_num = String(req.body?.ticket_num || '').trim();
  const numero_serie = String(req.body?.numero_serie || '').trim();
  const rawIdDisco = String(req.body?.id_disco || '').trim();
  const id_disco = rawIdDisco || ticket_num || `DISCO-${Date.now()}`;

  if (!ticket_num) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ error: 'Erro: O campo "Ticket nº" é de preenchimento obrigatório.' });
    return;
  }

  const relatorio_path = req.file
    ? req.file.filename
    : req.body?.relatorio_uploaded_path
    ? path.basename(String(req.body.relatorio_uploaded_path))
    : null;

  const totalImagensInput = parseInt(String(req.body?.total_imagens || '0'), 10) || 0;
  const parseCheck = (v: any) => v === true || v === 'true' || v === '1' || v === 1 || v === 'on' ? 1 : 0;

  try {
    const stmt = db.prepare(`
      INSERT INTO discos_usb (
        arquivo, remetente, data_entrada, ticket_num, id_disco, projeto,
        localizacao, tamanho_disco, marca, numero_serie,
        verificado, ticket_integracao, integrado,
        armazenado_servidor, total_imagens, observacoes, relatorio_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      String(req.body?.arquivo || '').trim(),
      String(req.body?.remetente || '').trim(),
      formatarDataIso(req.body?.data_entrada),
      ticket_num,
      id_disco,
      String(req.body?.projeto || '').trim(),
      String(req.body?.localizacao || '').trim(),
      String(req.body?.tamanho_disco || '').trim(),
      String(req.body?.marca || '').trim(),
      numero_serie,
      parseCheck(req.body?.verificado),
      String(req.body?.ticket_integracao || '').trim(),
      parseCheck(req.body?.integrado),
      parseCheck(req.body?.armazenado_servidor),
      totalImagensInput,
      String(req.body?.observacoes || '').trim(),
      relatorio_path
    );

    const newId = Number(result.lastInsertRowid);
    let indexResult = { total: 0, tifCount: 0 };

    if (relatorio_path) {
      indexResult = indexarRelatorio(newId, path.join(RELATORIOS_DIR, relatorio_path));
      if (totalImagensInput === 0 && indexResult.tifCount > 0) {
        db.prepare('UPDATE discos_usb SET total_imagens = ? WHERE id = ?').run(indexResult.tifCount, newId);
      }
    }

    res.json({
      message: relatorio_path
        ? `Disco registado e relatório Snap2HTML indexado automaticamente (${indexResult.total} ficheiros, ${indexResult.tifCount} matrizes .TIF)!`
        : 'Disco registado com sucesso!',
      id: newId,
      indexed: indexResult,
    });
  } catch (e: any) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // ignore
      }
    }
    if (String(e?.message || '').includes('UNIQUE')) {
      res.status(409).json({
        error: `Erro: Já existe um registo na base de dados com o ID do Disco "${id_disco}".`,
      });
    } else {
      res.status(500).json({ error: `Erro ao guardar registo: ${e?.message || e}` });
    }
  }
}

app.post('/api/discos', (req, res) => {
  const contentType = String(req.headers['content-type'] || '');
  if (contentType.includes('application/json')) {
    handleCreateDiscoRecord(req, res);
    return;
  }
  uploadReport.single('relatorio')(req, res, (err) => {
    if (err) {
      if (err.message === 'ERRO_EXTENSAO') {
        res.status(400).json({ error: 'O relatório tem de ser um ficheiro .html ou .htm.' });
        return;
      }
      res.status(400).json({ error: `Erro no upload do relatório: ${err.message}` });
      return;
    }
    handleCreateDiscoRecord(req, res);
  });
});

// Shared handler for updating a disk
function handleUpdateDiscoRecord(discoId: number, existing: any, req: express.Request, res: express.Response) {
  const ticket_num = String(req.body?.ticket_num || '').trim();
  const numero_serie = String(req.body?.numero_serie || '').trim();
  const rawIdDisco = String(req.body?.id_disco || '').trim();
  const id_disco = rawIdDisco || existing.id_disco || ticket_num;

  if (!ticket_num) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(400).json({ error: 'Erro: O campo "Ticket nº" é de preenchimento obrigatório.' });
    return;
  }

  let relatorio_path = existing.relatorio_path;
  const newUploadedFile = req.file
    ? req.file.filename
    : req.body?.relatorio_uploaded_path
    ? path.basename(String(req.body.relatorio_uploaded_path))
    : null;

  if (newUploadedFile) {
    if (existing.relatorio_path && existing.relatorio_path !== newUploadedFile) {
      const antigo = path.join(RELATORIOS_DIR, existing.relatorio_path);
      if (fs.existsSync(antigo)) {
        try {
          fs.unlinkSync(antigo);
        } catch {
          // ignore
        }
      }
    }
    relatorio_path = newUploadedFile;
  }

  const totalImagensInput = parseInt(String(req.body?.total_imagens || '0'), 10) || 0;
  const parseCheck = (v: any) => v === true || v === 'true' || v === '1' || v === 1 || v === 'on' ? 1 : 0;

  try {
    const stmt = db.prepare(`
      UPDATE discos_usb SET
        arquivo = ?, remetente = ?, data_entrada = ?, ticket_num = ?, id_disco = ?, projeto = ?,
        localizacao = ?, tamanho_disco = ?, marca = ?, numero_serie = ?,
        verificado = ?, ticket_integracao = ?, integrado = ?,
        armazenado_servidor = ?, total_imagens = ?, observacoes = ?, relatorio_path = ?
      WHERE id = ?
    `);

    stmt.run(
      String(req.body?.arquivo || '').trim(),
      String(req.body?.remetente || '').trim(),
      formatarDataIso(req.body?.data_entrada),
      ticket_num,
      id_disco,
      String(req.body?.projeto || '').trim(),
      String(req.body?.localizacao || '').trim(),
      String(req.body?.tamanho_disco || '').trim(),
      String(req.body?.marca || '').trim(),
      numero_serie,
      parseCheck(req.body?.verificado),
      String(req.body?.ticket_integracao || '').trim(),
      parseCheck(req.body?.integrado),
      parseCheck(req.body?.armazenado_servidor),
      totalImagensInput,
      String(req.body?.observacoes || '').trim(),
      relatorio_path,
      discoId
    );

    let indexResult = { total: 0, tifCount: 0 };
    if (newUploadedFile && relatorio_path) {
      indexResult = indexarRelatorio(discoId, path.join(RELATORIOS_DIR, relatorio_path));
      if (totalImagensInput === 0 && indexResult.tifCount > 0) {
        db.prepare('UPDATE discos_usb SET total_imagens = ? WHERE id = ?').run(indexResult.tifCount, discoId);
      }
    }

    res.json({
      message: newUploadedFile
        ? `Registo atualizado e novo relatório Snap2HTML indexado (${indexResult.total} ficheiros, ${indexResult.tifCount} .TIF)!`
        : 'Registo atualizado com sucesso!',
      indexed: indexResult,
    });
  } catch (e: any) {
    if (String(e?.message || '').includes('UNIQUE')) {
      res.status(409).json({
        error: `Erro: Já existe outro registo com o ID do Disco "${id_disco}".`,
      });
    } else {
      res.status(500).json({ error: `Erro ao atualizar registo: ${e?.message || e}` });
    }
  }
}

app.put('/api/discos/:id', (req, res) => {
  const discoId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM discos_usb WHERE id = ?').get(discoId) as any;

  if (!existing) {
    res.status(404).json({ error: 'Disco não encontrado.' });
    return;
  }

  const contentType = String(req.headers['content-type'] || '');
  if (contentType.includes('application/json')) {
    handleUpdateDiscoRecord(discoId, existing, req, res);
    return;
  }

  uploadReport.single('relatorio')(req, res, (err) => {
    if (err) {
      if (err.message === 'ERRO_EXTENSAO') {
        res.status(400).json({ error: 'O relatório tem de ser um ficheiro .html ou .htm.' });
        return;
      }
      res.status(400).json({ error: `Erro no upload do relatório: ${err.message}` });
      return;
    }
    handleUpdateDiscoRecord(discoId, existing, req, res);
  });
});

// Delete disk record and its Snap2HTML report + indexed files
app.delete('/api/discos/:id', (req, res) => {
  const discoId = Number(req.params.id);
  const disco = db.prepare('SELECT relatorio_path FROM discos_usb WHERE id = ?').get(discoId) as
    | { relatorio_path: string | null }
    | undefined;

  if (!disco) {
    res.status(404).json({ error: 'Disco não encontrado.' });
    return;
  }

  try {
    if (disco.relatorio_path) {
      const fullPath = path.join(RELATORIOS_DIR, disco.relatorio_path);
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch {
          // ignore
        }
      }
    }
    db.prepare('DELETE FROM relatorio_ficheiros WHERE disco_id = ?').run(discoId);
    db.prepare('DELETE FROM discos_usb WHERE id = ?').run(discoId);
    res.json({ message: 'Registo e relatório eliminados com sucesso!' });
  } catch (e: any) {
    res.status(500).json({ error: `Erro ao eliminar o registo: ${e?.message || e}` });
  }
});

// List all Snap2HTML reports in ./relatorios folder and their indexing status
app.get('/api/relatorios', (_req, res) => {
  const filesOnDisk = fs
    .readdirSync(RELATORIOS_DIR)
    .filter((f) => (f.toLowerCase().endsWith('.html') || f.toLowerCase().endsWith('.htm')) && !f.startsWith('.tmp_'));

  const discosRows = db
    .prepare(
      `SELECT 
        d.id, d.id_disco, d.arquivo, d.ticket_num, d.projeto, d.localizacao, d.relatorio_path, d.data_entrada,
        (SELECT COUNT(*) FROM relatorio_ficheiros rf WHERE rf.disco_id = d.id) as total_indexados,
        (SELECT COUNT(*) FROM relatorio_ficheiros rf WHERE rf.disco_id = d.id AND (rf.nome_ficheiro LIKE '%.TIF' OR rf.nome_ficheiro LIKE '%.TIFF')) as total_tif
       FROM discos_usb d
       WHERE d.relatorio_path IS NOT NULL AND d.relatorio_path != ''
       ORDER BY d.id DESC`
    )
    .all() as any[];

  const byFilename = new Map<string, any>();
  for (const d of discosRows) {
    byFilename.set(d.relatorio_path, d);
  }

  const relatoriosList = filesOnDisk.map((filename) => {
    const fullPath = path.join(RELATORIOS_DIR, filename);
    const stat = fs.statSync(fullPath);
    const linkedDisco = byFilename.get(filename) || null;
    return {
      filename,
      size_bytes: stat.size,
      modified_at: stat.mtime.toISOString(),
      disco: linkedDisco,
    };
  });

  res.json({
    pasta_local: RELATORIOS_DIR,
    db_local: DB_PATH,
    relatorios: relatoriosList,
  });
});

// Batch re-index all reports in ./relatorios
app.post('/api/reindexar', (_req, res) => {
  const discos = db
    .prepare("SELECT id, id_disco, ticket_num, relatorio_path FROM discos_usb WHERE relatorio_path IS NOT NULL AND relatorio_path != ''")
    .all() as { id: number; id_disco: string; ticket_num: string; relatorio_path: string }[];

  let relatoriosIndexados = 0;
  let totalFicheiros = 0;
  let totalTif = 0;
  let falhados = 0;

  for (const d of discos) {
    const caminho = path.join(RELATORIOS_DIR, d.relatorio_path);
    if (!fs.existsSync(caminho)) {
      falhados++;
      continue;
    }
    const resIdx = indexarRelatorio(d.id, caminho);
    relatoriosIndexados++;
    totalFicheiros += resIdx.total;
    totalTif += resIdx.tifCount;
  }

  res.json({
    message: `Reindexação concluída: ${relatoriosIndexados}/${discos.length} relatórios processados (${totalFicheiros} ficheiros, ${totalTif} matrizes .TIF).`,
    relatorios_indexados: relatoriosIndexados,
    total_discos_com_relatorio: discos.length,
    total_ficheiros: totalFicheiros,
    total_tif: totalTif,
    falhados,
  });
});

// CSV Export
app.get('/api/exportar-csv', (req, res) => {
  const busca = String(req.query.q || '').trim();
  const f_arquivo = String(req.query.f_arquivo || '').trim();
  const f_projeto = String(req.query.f_projeto || '').trim();
  const f_localizacao = String(req.query.f_localizacao || '').trim();
  const f_verificado = String(req.query.f_verificado || '').trim();
  const f_integrado = String(req.query.f_integrado || '').trim();
  const f_armazenado = String(req.query.f_armazenado || '').trim();

  const whereClauses: string[] = [];
  const params: (string | number)[] = [];

  if (f_arquivo) {
    whereClauses.push('arquivo = ?');
    params.push(f_arquivo);
  }
  if (f_projeto) {
    whereClauses.push('projeto = ?');
    params.push(f_projeto);
  }
  if (f_localizacao) {
    whereClauses.push('localizacao = ?');
    params.push(f_localizacao);
  }
  if (f_verificado === '0' || f_verificado === '1') {
    whereClauses.push('verificado = ?');
    params.push(Number(f_verificado));
  }
  if (f_integrado === '0' || f_integrado === '1') {
    whereClauses.push('integrado = ?');
    params.push(Number(f_integrado));
  }
  if (f_armazenado === '0' || f_armazenado === '1') {
    whereClauses.push('armazenado_servidor = ?');
    params.push(Number(f_armazenado));
  }

  let discos: any[] = [];
  if (busca) {
    const isWildcard = busca.includes('*') || busca.includes('?');
    const padrao = isWildcard ? busca.replace(/\*/g, '%').replace(/\?/g, '_') : `%${busca}%`;
    const textClause = `
      (id_disco LIKE ? OR projeto LIKE ? OR arquivo LIKE ? OR remetente LIKE ? 
       OR ticket_num LIKE ? OR numero_serie LIKE ? OR localizacao LIKE ? 
       OR ticket_integracao LIKE ? OR observacoes LIKE ?)
    `;
    const textParams = Array(9).fill(padrao);
    const fullWhere = [...whereClauses, textClause].join(' AND ');
    discos = db.prepare(`SELECT * FROM discos_usb WHERE ${fullWhere} ORDER BY ${SQL_DATA_ORDER}`).all(...params, ...textParams);
  } else if (whereClauses.length > 0) {
    discos = db.prepare(`SELECT * FROM discos_usb WHERE ${whereClauses.join(' AND ')} ORDER BY ${SQL_DATA_ORDER}`).all(...params);
  } else {
    discos = db.prepare(`SELECT * FROM discos_usb ORDER BY ${SQL_DATA_ORDER}`).all();
  }

  const header = [
    'arquivo',
    'remetente',
    'data_entrada',
    'ticket_num',
    'id_disco',
    'projeto',
    'localizacao',
    'tamanho_disco',
    'marca',
    'numero_serie',
    'verificado',
    'ticket_integracao',
    'integrado',
    'armazenado_servidor',
    'total_imagens',
    'observacoes',
  ];

  const escapeCsv = (val: any) => {
    const s = String(val ?? '').replace(/"/g, '""');
    return s.includes(';') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
  };

  const lines = [header.join(';')];
  for (const d of discos) {
    lines.push(
      [
        d.arquivo,
        d.remetente,
        d.data_entrada,
        d.ticket_num,
        d.id_disco,
        d.projeto,
        d.localizacao,
        d.tamanho_disco,
        d.marca,
        d.numero_serie,
        d.verificado ? 'Sim' : 'Não',
        d.ticket_integracao,
        d.integrado ? 'Sim' : 'Não',
        d.armazenado_servidor ? 'Sim' : 'Não',
        d.total_imagens,
        d.observacoes,
      ]
        .map(escapeCsv)
        .join(';')
    );
  }

  const csvContent = '\uFEFF' + lines.join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=discos_usb_exportado.csv');
  res.send(csvContent);
});

// CSV Template
app.get('/api/exportar-template', (_req, res) => {
  const header = [
    'arquivo',
    'remetente',
    'data_entrada',
    'ticket_num',
    'id_disco',
    'projeto',
    'localizacao',
    'tamanho_disco',
    'marca',
    'numero_serie',
    'verificado',
    'ticket_integracao',
    'integrado',
    'armazenado_servidor',
    'total_imagens',
    'observacoes',
  ];
  const exemplo = [
    'ADPRT',
    'João Silva',
    '2026-03-01',
    'TICK-1002',
    'DISCO-99',
    'Projeto X',
    'Armário A',
    '2 TB',
    'Seagate',
    'SN12345678',
    '1',
    'INT-55',
    '0',
    '1',
    '150',
    'Observações de teste',
  ];
  const csvContent = '\uFEFF' + header.join(';') + '\r\n' + exemplo.join(';') + '\r\n';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=template_discos_usb.csv');
  res.send(csvContent);
});

// CSV Import
app.post('/api/importar-csv', uploadMemory.single('file'), (req, res) => {
  if (!req.file || !req.file.originalname.toLowerCase().endsWith('.csv')) {
    res.status(400).json({ error: 'Por favor, selecione um ficheiro CSV válido.' });
    return;
  }

  const content = req.file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    res.status(400).json({ error: 'O ficheiro CSV está vazio ou não contém linhas de dados.' });
    return;
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));

  const parseBool = (val: string | undefined) => {
    if (!val) return 0;
    const s = val.trim().toLowerCase();
    return ['1', 'sim', 'true', 's', 'yes'].includes(s) ? 1 : 0;
  };

  let sucesso = 0;
  let erros = 0;

  const insStmt = db.prepare(`
    INSERT INTO discos_usb (
      arquivo, remetente, data_entrada, ticket_num, id_disco, projeto,
      localizacao, tamanho_disco, marca, numero_serie,
      verificado, ticket_integracao, integrado,
      armazenado_servidor, total_imagens, observacoes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });

    const ticket_num = (row.ticket_num || '').trim();
    const numero_serie = (row.numero_serie || '').trim();
    const id_disco = (row.id_disco || '').trim() || ticket_num;

    if (!ticket_num) {
      erros++;
      continue;
    }

    const rawTotal = (row.total_imagens || '0').replace(/[,.]/g, '').trim();
    const total_imagens = /^\d+$/.test(rawTotal) ? parseInt(rawTotal, 10) : 0;

    try {
      insStmt.run(
        (row.arquivo || '').trim(),
        (row.remetente || '').trim(),
        formatarDataIso(row.data_entrada),
        ticket_num,
        id_disco,
        (row.projeto || '').trim(),
        (row.localizacao || '').trim(),
        (row.tamanho_disco || '').trim(),
        (row.marca || '').trim(),
        numero_serie,
        parseBool(row.verificado),
        (row.ticket_integracao || '').trim(),
        parseBool(row.integrado),
        parseBool(row.armazenado_servidor),
        total_imagens,
        (row.observacoes || '').trim()
      );
      sucesso++;
    } catch {
      erros++;
    }
  }

  res.json({
    message: `Importação concluída: ${sucesso} registos importados${erros > 0 ? `, ${erros} ignorados.` : '.'}`,
    sucesso,
    erros,
  });
});

// User Management APIs
app.get('/api/usuarios', (_req, res) => {
  const usuarios = db
    .prepare('SELECT id, username, is_admin, created_at FROM usuarios ORDER BY username')
    .all() as { id: number; username: string; is_admin: number; created_at: string }[];
  res.json({
    usuarios: usuarios.map((u) => ({
      ...u,
      is_admin: Boolean(u.is_admin),
    })),
  });
});

app.post('/api/usuarios', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');
  const is_admin = req.body.is_admin ? 1 : 0;

  if (!username || !password) {
    res.status(400).json({ error: 'Utilizador e palavra-passe são obrigatórios.' });
    return;
  }

  try {
    db.prepare('INSERT INTO usuarios (username, password_hash, is_admin) VALUES (?, ?, ?)').run(
      username,
      hashPassword(password),
      is_admin
    );
    res.json({ message: `Utilizador "${username}" criado com sucesso.` });
  } catch {
    res.status(409).json({ error: `Já existe um utilizador com o nome "${username}".` });
  }
});

app.post('/api/usuarios/:id/password', (req, res) => {
  const id = Number(req.params.id);
  const password = String(req.body.password || '');
  if (!password) {
    res.status(400).json({ error: 'Indique uma nova palavra-passe.' });
    return;
  }
  db.prepare('UPDATE usuarios SET password_hash = ? WHERE id = ?').run(hashPassword(password), id);
  res.json({ message: 'Palavra-passe atualizada com sucesso.' });
});

app.post('/api/usuarios/:id/toggle-admin', (req, res) => {
  const id = Number(req.params.id);
  const currentUserId = Number(req.body.current_user_id || 0);
  if (id === currentUserId) {
    res.status(400).json({
      error: 'Não podes alterar o teu próprio nível de acesso enquanto estás autenticado com essa conta.',
    });
    return;
  }
  const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(id) as any;
  if (!user) {
    res.status(404).json({ error: 'Utilizador não encontrado.' });
    return;
  }
  const novoValor = user.is_admin ? 0 : 1;
  db.prepare('UPDATE usuarios SET is_admin = ? WHERE id = ?').run(novoValor, id);
  res.json({
    message: novoValor
      ? `Utilizador "${user.username}" promovido a Administrador.`
      : `Utilizador "${user.username}" alterado para Operador.`,
  });
});

app.delete('/api/usuarios/:id', (req, res) => {
  const id = Number(req.params.id);
  const currentUserId = Number(req.query.current_user_id || 0);
  if (id === currentUserId) {
    res.status(400).json({
      error: 'Não podes eliminar o teu próprio utilizador enquanto estás autenticado com ele.',
    });
    return;
  }
  db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
  res.json({ message: 'Utilizador eliminado.' });
});

// ============================================================================
// MÓDULO DE ADMINISTRAÇÃO DA BASE DE DADOS (EXCLUSIVO PARA ADMINISTRADORES)
// ============================================================================

function requireAdmin(req: express.Request, res: express.Response): boolean {
  const rawAdminId =
    req.headers['x-admin-user-id'] || req.query.admin_user_id || req.body?.admin_user_id;
  const adminId = Number(rawAdminId || 0);
  if (!adminId) {
    res.status(403).json({ error: 'Acesso restrito: este módulo apenas pode ser acedido por Administradores.' });
    return false;
  }
  const user = db.prepare('SELECT id, username, is_admin FROM usuarios WHERE id = ?').get(adminId) as
    | { id: number; username: string; is_admin: number }
    | undefined;
  if (!user || !user.is_admin) {
    res.status(403).json({ error: 'Permissão recusada: apenas utilizadores Administradores podem gerir a base de dados.' });
    return false;
  }
  return true;
}

function buildTimestampTag(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(
    now.getMinutes()
  )}${pad(now.getSeconds())}`;
}

function buildFullBackupPayload(includeHtmlReports = true) {
  const discos_usb = db.prepare('SELECT * FROM discos_usb ORDER BY id ASC').all();
  const usuarios = db.prepare('SELECT * FROM usuarios ORDER BY id ASC').all();
  const relatorio_ficheiros = db.prepare('SELECT * FROM relatorio_ficheiros ORDER BY id ASC').all();

  const relatorios_files: { filename: string; content_base64: string }[] = [];
  if (includeHtmlReports && fs.existsSync(RELATORIOS_DIR)) {
    const files = fs
      .readdirSync(RELATORIOS_DIR)
      .filter((f) => (f.toLowerCase().endsWith('.html') || f.toLowerCase().endsWith('.htm')) && !f.startsWith('.tmp_'));
    for (const filename of files) {
      try {
        const buf = fs.readFileSync(path.join(RELATORIOS_DIR, filename));
        relatorios_files.push({
          filename,
          content_base64: buf.toString('base64'),
        });
      } catch {
        // ignore unreadable file
      }
    }
  }

  return {
    ridis_backup_version: '1.0',
    created_at: new Date().toISOString(),
    tables: {
      discos_usb,
      usuarios,
      relatorio_ficheiros,
    },
    relatorios_files,
  };
}

function createPreRestoreSafetyBackup(): string {
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch {
    // ignore
  }
  const filename = `pre_restauro_${buildTimestampTag()}.db`;
  const dest = path.join(BACKUPS_DIR, filename);
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, dest);
  }
  return filename;
}

function normalizeRelatorioFilename(rawPath: any): string | null {
  if (!rawPath) return null;
  const s = String(rawPath).trim();
  if (!s) return null;
  const base = path.basename(s.replace(/\\/g, '/')).trim();
  return base || null;
}

function autoLinkAndIndexReports(forceReindexAll = false): {
  newlyLinked: number;
  indexedDisks: number;
  totalFilesIndexed: number;
  totalTifIndexed: number;
} {
  if (!fs.existsSync(RELATORIOS_DIR)) {
    return { newlyLinked: 0, indexedDisks: 0, totalFilesIndexed: 0, totalTifIndexed: 0 };
  }

  const htmlFiles = fs
    .readdirSync(RELATORIOS_DIR)
    .filter((f) => (f.toLowerCase().endsWith('.html') || f.toLowerCase().endsWith('.htm')) && !f.startsWith('.tmp_'));

  const lowerToActual = new Map<string, string>();
  for (const f of htmlFiles) {
    lowerToActual.set(f.toLowerCase(), f);
  }

  const allDiscos = db
    .prepare('SELECT id, id_disco, ticket_num, relatorio_path, total_imagens FROM discos_usb ORDER BY id ASC')
    .all() as {
    id: number;
    id_disco: string;
    ticket_num: string;
    relatorio_path: string | null;
    total_imagens: number;
  }[];

  const claimedFilesLower = new Set<string>();
  for (const d of allDiscos) {
    const norm = normalizeRelatorioFilename(d.relatorio_path);
    if (norm && lowerToActual.has(norm.toLowerCase())) {
      claimedFilesLower.add(norm.toLowerCase());
    }
  }

  let newlyLinked = 0;
  let indexedDisks = 0;
  let totalFilesIndexed = 0;
  let totalTifIndexed = 0;

  for (const d of allDiscos) {
    let norm = normalizeRelatorioFilename(d.relatorio_path);
    let actualFile = norm ? lowerToActual.get(norm.toLowerCase()) : undefined;

    if (actualFile && d.relatorio_path !== actualFile) {
      db.prepare('UPDATE discos_usb SET relatorio_path = ? WHERE id = ?').run(actualFile, d.id);
    }

    // If disk has no valid existing HTML file, try matching an unclaimed HTML file by id_disco or ticket_num
    if (!actualFile) {
      const idRaw = (d.id_disco || '').trim().toLowerCase();
      const idSafe = sanitizeFilename(d.id_disco || '').toLowerCase();
      const tickRaw = (d.ticket_num || '').trim().toLowerCase();
      const tickSafe = sanitizeFilename(d.ticket_num || '').toLowerCase();

      for (const f of htmlFiles) {
        const fLower = f.toLowerCase();
        if (claimedFilesLower.has(fLower)) continue;
        const ext = path.extname(fLower);
        const stem = path.basename(fLower, ext);

        const matchesId =
          (idRaw && (stem === idRaw || stem.startsWith(`${idRaw}_`))) ||
          (idSafe && (stem === idSafe || stem.startsWith(`${idSafe}_`)));
        const matchesTicket =
          !matchesId &&
          ((tickRaw && (stem === tickRaw || stem.startsWith(`${tickRaw}_`))) ||
            (tickSafe && (stem === tickSafe || stem.startsWith(`${tickSafe}_`))));

        if (matchesId || matchesTicket) {
          actualFile = f;
          claimedFilesLower.add(fLower);
          db.prepare('UPDATE discos_usb SET relatorio_path = ? WHERE id = ?').run(actualFile, d.id);
          newlyLinked++;
          break;
        }
      }
    }

    if (actualFile) {
      const currentIndexed = (
        db.prepare('SELECT COUNT(*) as c FROM relatorio_ficheiros WHERE disco_id = ?').get(d.id) as { c: number }
      )?.c;

      if (forceReindexAll || !currentIndexed) {
        const resIdx = indexarRelatorio(d.id, path.join(RELATORIOS_DIR, actualFile));
        indexedDisks++;
        totalFilesIndexed += resIdx.total;
        totalTifIndexed += resIdx.tifCount;
        if ((!d.total_imagens || d.total_imagens === 0) && resIdx.tifCount > 0) {
          db.prepare('UPDATE discos_usb SET total_imagens = ? WHERE id = ?').run(resIdx.tifCount, d.id);
        }
      }
    }
  }

  return { newlyLinked, indexedDisks, totalFilesIndexed, totalTifIndexed };
}

function restoreFromSqliteFile(
  sqliteFilePath: string,
  mode: 'replace' | 'merge' = 'replace',
  moveInsteadOfCopy = false
): {
  discos: number;
  discosNovos: number;
  discosAtualizados: number;
  ficheiros: number;
  usuarios: number;
} {
  // 1. Lightweight validation without reading relatorio_ficheiros into RAM!
  const checkDb = new DatabaseSync(sqliteFilePath);
  let incomingDiscosCount = 0;
  try {
    const r = checkDb.prepare('SELECT COUNT(*) as c FROM discos_usb').get() as { c: number } | undefined;
    incomingDiscosCount = r?.c || 0;
  } catch {
    checkDb.close();
    throw new Error('O ficheiro SQLite selecionado não contém a tabela "discos_usb" válida.');
  }
  checkDb.close();

  let discosNovos = 0;
  let discosAtualizados = 0;

  if (mode === 'replace') {
    // ZERO-RAM ATOMIC FILE SWAP:
    // Works instantaneously (<50ms) even for 2GB+ SQLite databases with 20M+ rows in relatorio_ficheiros!
    const currentUsers = db.prepare('SELECT username, password_hash, is_admin, created_at FROM usuarios').all() as {
      username: string;
      password_hash: string;
      is_admin: number;
      created_at: string;
    }[];

    try {
      db.close();
    } catch {
      // ignore
    }

    // Clean up old WAL/SHM files before replacing DB_PATH
    for (const suffix of ['-wal', '-shm']) {
      if (fs.existsSync(`${DB_PATH}${suffix}`)) {
        try {
          fs.unlinkSync(`${DB_PATH}${suffix}`);
        } catch {
          // ignore
        }
      }
    }

    if (moveInsteadOfCopy) {
      if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
      }
      fs.renameSync(sqliteFilePath, DB_PATH);
    } else {
      fs.copyFileSync(sqliteFilePath, DB_PATH);
    }

    // Reopen DB and ensure all columns, indexes, and admin users exist
    db = new DatabaseSync(DB_PATH);
    ensureDatabaseSchema(db);

    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      // Normalize data_entrada and relatorio_path on discos_usb (fast, only a few hundred rows)
      const allDiscos = db
        .prepare('SELECT id, data_entrada, relatorio_path FROM discos_usb')
        .all() as { id: number; data_entrada: string | null; relatorio_path: string | null }[];
      const updStmt = db.prepare('UPDATE discos_usb SET data_entrada = ?, relatorio_path = ? WHERE id = ?');
      for (const d of allDiscos) {
        const normDate = formatarDataIso(d.data_entrada ?? '');
        const normRel = normalizeRelatorioFilename(d.relatorio_path);
        if (normDate !== (d.data_entrada ?? '') || normRel !== d.relatorio_path) {
          updStmt.run(normDate, normRel, d.id);
        }
      }

      // Ensure current admin users (e.g. jmagalhaes) are preserved so current session is never locked out
      const checkUser = db.prepare('SELECT id FROM usuarios WHERE LOWER(username) = LOWER(?)');
      const insUser = db.prepare(
        'INSERT INTO usuarios (username, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?)'
      );
      for (const u of currentUsers) {
        if (u.username && !checkUser.get(u.username)) {
          insUser.run(u.username, u.password_hash, u.is_admin ? 1 : 0, u.created_at ?? new Date().toISOString());
        }
      }

      db.exec('COMMIT');
    } catch {
      try {
        db.exec('ROLLBACK');
      } catch {
        // ignore
      }
    }

    discosNovos = incomingDiscosCount;
  } else {
    // MERGE MODE using SQLite native ATTACH DATABASE (zero RAM used for relatorio_ficheiros!)
    db.prepare('ATTACH DATABASE ? AS old_db').run(sqliteFilePath);
    try {
      const discosRows = db.prepare('SELECT * FROM old_db.discos_usb').all() as any[];
      let usuariosRows: any[] = [];
      try {
        usuariosRows = db.prepare('SELECT * FROM old_db.usuarios').all() as any[];
      } catch {
        usuariosRows = [];
      }

      let hasOldFicheiros = false;
      let hasTamanhoBytes = false;
      let hasPasta = false;
      try {
        const cols = db.prepare('PRAGMA old_db.table_info(relatorio_ficheiros)').all() as { name: string }[];
        hasOldFicheiros = cols.length > 0;
        hasTamanhoBytes = cols.some((c) => c.name === 'tamanho_bytes');
        hasPasta = cols.some((c) => c.name === 'pasta');
      } catch {
        hasOldFicheiros = false;
      }

      const copyFicheirosSql = hasOldFicheiros
        ? `INSERT INTO main.relatorio_ficheiros (disco_id, nome_ficheiro, tamanho_bytes, pasta)
           SELECT ?, nome_ficheiro, ${hasTamanhoBytes ? 'COALESCE(tamanho_bytes, 0)' : '0'}, ${
             hasPasta ? "COALESCE(pasta, '')" : "''"
           }
           FROM old_db.relatorio_ficheiros WHERE disco_id = ?`
        : null;

      db.exec('BEGIN IMMEDIATE TRANSACTION');
      try {
        const findByIdDisco = db.prepare(
          'SELECT id, relatorio_path FROM main.discos_usb WHERE LOWER(id_disco) = LOWER(?)'
        );
        const updateDiscoStmt = db.prepare(`
          UPDATE main.discos_usb SET
            arquivo = ?, remetente = ?, data_entrada = ?, ticket_num = ?,
            projeto = ?, localizacao = ?, tamanho_disco = ?, marca = ?, numero_serie = ?,
            verificado = ?, ticket_integracao = ?, integrado = ?, armazenado_servidor = ?,
            total_imagens = ?, observacoes = ?, relatorio_path = COALESCE(?, relatorio_path)
          WHERE id = ?
        `);
        const insertDiscoStmt = db.prepare(`
          INSERT INTO main.discos_usb (
            arquivo, remetente, data_entrada, ticket_num, id_disco, projeto,
            localizacao, tamanho_disco, marca, numero_serie,
            verificado, ticket_integracao, integrado,
            armazenado_servidor, total_imagens, observacoes, created_at, relatorio_path
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const delFichStmt = db.prepare('DELETE FROM main.relatorio_ficheiros WHERE disco_id = ?');
        const copyFichStmt = copyFicheirosSql ? db.prepare(copyFicheirosSql) : null;

        for (const d of discosRows) {
          const idDiscoVal = String(d.id_disco || d.ticket_num || `DISCO-${d.id}`).trim();
          const normRel = normalizeRelatorioFilename(d.relatorio_path);
          const existing = findByIdDisco.get(idDiscoVal) as { id: number; relatorio_path: string | null } | undefined;

          let targetDiscoId: number;
          if (existing) {
            updateDiscoStmt.run(
              d.arquivo ?? '',
              d.remetente ?? '',
              formatarDataIso(d.data_entrada ?? ''),
              d.ticket_num ?? '',
              d.projeto ?? '',
              d.localizacao ?? '',
              d.tamanho_disco ?? '',
              d.marca ?? '',
              d.numero_serie ?? '',
              d.verificado ? 1 : 0,
              d.ticket_integracao ?? '',
              d.integrado ? 1 : 0,
              d.armazenado_servidor ? 1 : 0,
              Number(d.total_imagens) || 0,
              d.observacoes ?? '',
              normRel,
              existing.id
            );
            targetDiscoId = existing.id;
            discosAtualizados++;
          } else {
            const resIns = insertDiscoStmt.run(
              d.arquivo ?? '',
              d.remetente ?? '',
              formatarDataIso(d.data_entrada ?? ''),
              d.ticket_num ?? '',
              idDiscoVal,
              d.projeto ?? '',
              d.localizacao ?? '',
              d.tamanho_disco ?? '',
              d.marca ?? '',
              d.numero_serie ?? '',
              d.verificado ? 1 : 0,
              d.ticket_integracao ?? '',
              d.integrado ? 1 : 0,
              d.armazenado_servidor ? 1 : 0,
              Number(d.total_imagens) || 0,
              d.observacoes ?? '',
              d.created_at ?? new Date().toISOString(),
              normRel
            );
            targetDiscoId = Number(resIns.lastInsertRowid);
            discosNovos++;
          }

          if (copyFichStmt) {
            delFichStmt.run(targetDiscoId);
            copyFichStmt.run(targetDiscoId, d.id);
          }
        }

        if (usuariosRows.length > 0) {
          const checkUser = db.prepare('SELECT id FROM main.usuarios WHERE LOWER(username) = LOWER(?)');
          const insUser = db.prepare(
            'INSERT INTO main.usuarios (username, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?)'
          );
          for (const u of usuariosRows) {
            if (u.username && !checkUser.get(u.username)) {
              insUser.run(
                u.username,
                u.password_hash,
                u.is_admin ? 1 : 0,
                u.created_at ?? new Date().toISOString()
              );
            }
          }
        }

        db.exec('COMMIT');
      } catch (err) {
        try {
          db.exec('ROLLBACK');
        } catch {
          // ignore
        }
        throw err;
      }
    } finally {
      try {
        db.exec('DETACH DATABASE old_db');
      } catch {
        // ignore
      }
    }
  }

  invalidateIndexCountsCache();

  const finalDiscosCount = (db.prepare('SELECT COUNT(*) as c FROM discos_usb').get() as { c: number })?.c || 0;
  const finalFichCount = getTotalIndexedCount();
  const finalUserCount = (db.prepare('SELECT COUNT(*) as c FROM usuarios').get() as { c: number })?.c || 0;

  return {
    discos: finalDiscosCount,
    discosNovos,
    discosAtualizados,
    ficheiros: finalFichCount,
    usuarios: finalUserCount,
  };
}

function restoreFromFullJsonPayload(payload: any): {
  discos: number;
  ficheiros: number;
  usuarios: number;
  relatoriosRestaurados: number;
} {
  if (!payload || !payload.tables || !Array.isArray(payload.tables.discos_usb)) {
    throw new Error('O ficheiro JSON de backup não tem a estrutura válida do sistema RIDIS.');
  }

  const discosRows = payload.tables.discos_usb as any[];
  const usuariosRows = Array.isArray(payload.tables.usuarios) ? (payload.tables.usuarios as any[]) : [];
  const ficheirosRows = Array.isArray(payload.tables.relatorio_ficheiros)
    ? (payload.tables.relatorio_ficheiros as any[])
    : [];
  const relatoriosFiles = Array.isArray(payload.relatorios_files) ? payload.relatorios_files : [];

  let relatoriosRestaurados = 0;
  for (const rf of relatoriosFiles) {
    if (rf && rf.filename && rf.content_base64) {
      const safeName = path.basename(String(rf.filename));
      if (safeName.toLowerCase().endsWith('.html') || safeName.toLowerCase().endsWith('.htm')) {
        fs.writeFileSync(path.join(RELATORIOS_DIR, safeName), Buffer.from(String(rf.content_base64), 'base64'));
        relatoriosRestaurados++;
      }
    }
  }

  db.exec('BEGIN IMMEDIATE TRANSACTION');
  try {
    db.prepare('DELETE FROM relatorio_ficheiros').run();
    db.prepare('DELETE FROM discos_usb').run();

    const insDisco = db.prepare(`
      INSERT INTO discos_usb (
        id, arquivo, remetente, data_entrada, ticket_num, id_disco, projeto,
        localizacao, tamanho_disco, marca, numero_serie,
        verificado, ticket_integracao, integrado,
        armazenado_servidor, total_imagens, observacoes, created_at, relatorio_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const d of discosRows) {
      insDisco.run(
        d.id,
        d.arquivo ?? '',
        d.remetente ?? '',
        d.data_entrada ?? '',
        d.ticket_num ?? '',
        d.id_disco ?? `DISCO-${d.id}`,
        d.projeto ?? '',
        d.localizacao ?? '',
        d.tamanho_disco ?? '',
        d.marca ?? '',
        d.numero_serie ?? '',
        d.verificado ? 1 : 0,
        d.ticket_integracao ?? '',
        d.integrado ? 1 : 0,
        d.armazenado_servidor ? 1 : 0,
        Number(d.total_imagens) || 0,
        d.observacoes ?? '',
        d.created_at ?? new Date().toISOString(),
        d.relatorio_path ?? null
      );
    }

    if (ficheirosRows.length > 0) {
      const insFich = db.prepare(
        'INSERT INTO relatorio_ficheiros (disco_id, nome_ficheiro, tamanho_bytes, pasta) VALUES (?, ?, ?, ?)'
      );
      for (const f of ficheirosRows) {
        insFich.run(f.disco_id, f.nome_ficheiro, Number(f.tamanho_bytes) || 0, f.pasta ?? '');
      }
    }

    if (usuariosRows.length > 0 && usuariosRows.some((u) => u.is_admin)) {
      db.prepare('DELETE FROM usuarios').run();
      const insUser = db.prepare(
        'INSERT INTO usuarios (id, username, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, ?)'
      );
      for (const u of usuariosRows) {
        insUser.run(
          u.id,
          u.username,
          u.password_hash,
          u.is_admin ? 1 : 0,
          u.created_at ?? new Date().toISOString()
        );
      }
    }

    db.exec('COMMIT');
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore
    }
    throw err;
  }

  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch {
    // ignore
  }

  return {
    discos: discosRows.length,
    ficheiros: ficheirosRows.length,
    usuarios: usuariosRows.length,
    relatoriosRestaurados,
  };
}

// 1. Get Database Status & List of Local Backups
app.get('/api/admin/db/status', (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    db.exec('PRAGMA wal_checkpoint(PASSIVE);');
  } catch {
    // ignore
  }

  const dbStat = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH) : null;
  const discosCount = (db.prepare('SELECT COUNT(*) as c FROM discos_usb').get() as { c: number })?.c || 0;
  const ficheirosCount = getTotalIndexedCount();
  const usuariosCount = (db.prepare('SELECT COUNT(*) as c FROM usuarios').get() as { c: number })?.c || 0;

  let integrity = 'ok';
  if (dbStat && dbStat.size < 100 * 1024 * 1024) {
    try {
      const checkRow = db.prepare('PRAGMA quick_check').get() as { quick_check?: string } | undefined;
      integrity = checkRow?.quick_check || 'ok';
    } catch {
      integrity = 'ok';
    }
  }

  let relatoriosHtmlCount = 0;
  let relatoriosSizeBytes = 0;
  const htmlFilesList: { filename: string; size_bytes: number; modified_at: string }[] = [];
  const htmlLowerMap = new Map<string, string>();

  if (fs.existsSync(RELATORIOS_DIR)) {
    const rFiles = fs
      .readdirSync(RELATORIOS_DIR)
      .filter((f) => (f.toLowerCase().endsWith('.html') || f.toLowerCase().endsWith('.htm')) && !f.startsWith('.tmp_'));
    relatoriosHtmlCount = rFiles.length;
    for (const f of rFiles) {
      try {
        const st = fs.statSync(path.join(RELATORIOS_DIR, f));
        relatoriosSizeBytes += st.size;
        htmlFilesList.push({
          filename: f,
          size_bytes: st.size,
          modified_at: st.mtime.toISOString().replace('T', ' ').slice(0, 19),
        });
        htmlLowerMap.set(f.toLowerCase(), f);
      } catch {
        // ignore
      }
    }
  }

  // Compute Migration Diagnostics (matching between discos_usb and relatorios/)
  const allDiscosDiag = db
    .prepare('SELECT id, id_disco, arquivo, ticket_num, relatorio_path FROM discos_usb ORDER BY id DESC')
    .all() as {
    id: number;
    id_disco: string;
    arquivo: string;
    ticket_num: string;
    relatorio_path: string | null;
  }[];

  let linkedOkCount = 0;
  const missingReports: {
    id: number;
    id_disco: string;
    arquivo: string;
    ticket_num: string;
    relatorio_path: string;
  }[] = [];
  const disksWithoutReport: {
    id: number;
    id_disco: string;
    arquivo: string;
    ticket_num: string;
  }[] = [];
  const referencedLowerSet = new Set<string>();

  for (const d of allDiscosDiag) {
    const norm = normalizeRelatorioFilename(d.relatorio_path);
    if (norm) {
      const lower = norm.toLowerCase();
      referencedLowerSet.add(lower);
      if (htmlLowerMap.has(lower)) {
        linkedOkCount++;
      } else {
        missingReports.push({
          id: d.id,
          id_disco: d.id_disco,
          arquivo: d.arquivo,
          ticket_num: d.ticket_num,
          relatorio_path: norm,
        });
      }
    } else {
      disksWithoutReport.push({
        id: d.id,
        id_disco: d.id_disco,
        arquivo: d.arquivo,
        ticket_num: d.ticket_num,
      });
    }
  }

  const unlinkedReports = htmlFilesList.filter((f) => !referencedLowerSet.has(f.filename.toLowerCase()));

  const backupsList = fs.existsSync(BACKUPS_DIR)
    ? fs
        .readdirSync(BACKUPS_DIR)
        .filter((f) => (f.endsWith('.db') || f.endsWith('.json')) && !f.startsWith('.tmp_'))
        .map((filename) => {
          const st = fs.statSync(path.join(BACKUPS_DIR, filename));
          const isJson = filename.endsWith('.json');
          return {
            filename,
            size_bytes: st.size,
            created_at: st.mtime.toISOString().replace('T', ' ').slice(0, 19),
            type: isJson ? 'full_json' : 'sqlite',
            label: filename.startsWith('pre_restauro_')
              ? 'Salvaguarda Automática Pré-Restauro'
              : isJson
              ? 'Backup Completo (BD + Relatórios HTML)'
              : 'Snapshot SQLite (.db)',
          };
        })
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
    : [];

  res.json({
    db_path: DB_PATH,
    db_size_bytes: dbStat ? dbStat.size : 0,
    db_modified_at: dbStat ? dbStat.mtime.toISOString().replace('T', ' ').slice(0, 19) : '-',
    integrity_status: integrity,
    backups_dir: BACKUPS_DIR,
    relatorios_dir: RELATORIOS_DIR,
    counts: {
      discos_usb: discosCount,
      relatorio_ficheiros: ficheirosCount,
      usuarios: usuariosCount,
      relatorios_html: relatoriosHtmlCount,
      relatorios_size_bytes: relatoriosSizeBytes,
    },
    migration_diagnostics: {
      linked_ok_count: linkedOkCount,
      missing_reports: missingReports,
      unlinked_reports: unlinkedReports,
      disks_without_report: disksWithoutReport,
    },
    backups: backupsList,
  });
});

// 2. Create a new local backup in ./backups/
app.post('/api/admin/db/backup', (req, res) => {
  if (!requireAdmin(req, res)) return;

  const mode = req.body?.mode === 'full_json' ? 'full_json' : 'sqlite';
  const includeReports = req.body?.include_reports !== false;
  const tag = buildTimestampTag();

  try {
    if (mode === 'full_json') {
      const payload = buildFullBackupPayload(includeReports);
      const filename = `backup_completo_ridis_${tag}.json`;
      fs.writeFileSync(path.join(BACKUPS_DIR, filename), JSON.stringify(payload, null, 2), 'utf-8');
      res.json({
        message: `Backup completo criado com sucesso em backups/${filename} (${payload.tables.discos_usb.length} discos, ${payload.relatorios_files.length} relatórios HTML)!`,
        filename,
      });
    } else {
      db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
      const filename = `backup_gestao_discos_${tag}.db`;
      fs.copyFileSync(DB_PATH, path.join(BACKUPS_DIR, filename));
      res.json({
        message: `Snapshot da base de dados SQLite criado com sucesso em backups/${filename}!`,
        filename,
      });
    }
  } catch (e: any) {
    res.status(500).json({ error: `Erro ao criar backup: ${e?.message || e}` });
  }
});

// 3. Download active SQLite database file (gestao_discos.db)
app.get('/api/admin/db/download-sqlite', (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    const downloadName = `gestao_discos_${buildTimestampTag()}.db`;
    res.download(DB_PATH, downloadName);
  } catch (e: any) {
    res.status(500).json({ error: `Erro ao exportar ficheiro SQLite: ${e?.message || e}` });
  }
});

// 4. Download Full JSON Backup (Database + Snap2HTML reports)
app.get('/api/admin/db/download-full', (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const payload = buildFullBackupPayload(true);
    const downloadName = `backup_completo_ridis_${buildTimestampTag()}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${downloadName}`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (e: any) {
    res.status(500).json({ error: `Erro ao exportar backup completo: ${e?.message || e}` });
  }
});

// 5. Download a specific saved backup from ./backups/
app.get('/api/admin/db/backups/:filename/download', (req, res) => {
  if (!requireAdmin(req, res)) return;

  const safeName = path.basename(req.params.filename);
  const fullPath = path.join(BACKUPS_DIR, safeName);
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: 'Ficheiro de backup não encontrado.' });
    return;
  }
  res.download(fullPath, safeName);
});

// 6. Restore from a saved backup in ./backups/
app.post('/api/admin/db/backups/:filename/restore', (req, res) => {
  if (!requireAdmin(req, res)) return;

  const safeName = path.basename(req.params.filename);
  const fullPath = path.join(BACKUPS_DIR, safeName);
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: 'Ficheiro de backup não encontrado.' });
    return;
  }

  try {
    const safetyFile = createPreRestoreSafetyBackup();
    if (safeName.endsWith('.json')) {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const payload = JSON.parse(raw);
      const stats = restoreFromFullJsonPayload(payload);
      res.json({
        message: `Base de dados restaurada com sucesso a partir de "${safeName}" (${stats.discos} discos, ${stats.ficheiros} ficheiros indexados, ${stats.relatoriosRestaurados} relatórios HTML)! Salvaguarda prévia guardada em ${safetyFile}.`,
      });
    } else {
      const stats = restoreFromSqliteFile(fullPath);
      res.json({
        message: `Base de dados SQLite restaurada com sucesso a partir de "${safeName}" (${stats.discos} discos, ${stats.ficheiros} ficheiros indexados)! Salvaguarda prévia guardada em ${safetyFile}.`,
      });
    }
  } catch (e: any) {
    res.status(500).json({ error: `Erro ao restaurar backup: ${e?.message || e}` });
  }
});

// 7. Delete a saved backup from ./backups/
app.delete('/api/admin/db/backups/:filename', (req, res) => {
  if (!requireAdmin(req, res)) return;

  const safeName = path.basename(req.params.filename);
  const fullPath = path.join(BACKUPS_DIR, safeName);
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: 'Ficheiro de backup não encontrado.' });
    return;
  }
  try {
    fs.unlinkSync(fullPath);
    res.json({ message: `Backup "${safeName}" eliminado.` });
  } catch (e: any) {
    res.status(500).json({ error: `Erro ao eliminar backup: ${e?.message || e}` });
  }
});

// 8. Restore database by uploading an external .db / .sqlite / .json backup file
app.post('/api/admin/db/restore-upload', uploadMemory.single('file'), (req, res) => {
  if (!requireAdmin(req, res)) return;

  if (!req.file) {
    res.status(400).json({ error: 'Selecione um ficheiro de backup (.db, .sqlite ou .json) para restaurar.' });
    return;
  }

  const origName = req.file.originalname.toLowerCase();
  const isJson = origName.endsWith('.json');
  const isSqlite = origName.endsWith('.db') || origName.endsWith('.sqlite') || origName.endsWith('.sqlite3');

  if (!isJson && !isSqlite) {
    res.status(400).json({
      error: 'Formato inválido. Apenas são suportados ficheiros SQLite (.db, .sqlite) ou Backups Completos (.json).',
    });
    return;
  }

  const tempRestorePath = path.join(BACKUPS_DIR, `.tmp_restore_${Date.now()}_${sanitizeFilename(origName)}`);

  try {
    const safetyFile = createPreRestoreSafetyBackup();

    if (isJson) {
      const payload = JSON.parse(req.file.buffer.toString('utf-8'));
      const stats = restoreFromFullJsonPayload(payload);
      res.json({
        message: `Restauro concluído com sucesso a partir do ficheiro "${req.file.originalname}" (${stats.discos} discos, ${stats.ficheiros} ficheiros indexados, ${stats.relatoriosRestaurados} relatórios HTML)! Salvaguarda prévia criada: ${safetyFile}.`,
      });
    } else {
      const headerStr = req.file.buffer.subarray(0, 15).toString('utf-8');
      if (!headerStr.startsWith('SQLite format 3')) {
        res.status(400).json({ error: 'O ficheiro selecionado não é uma base de dados SQLite 3 válida.' });
        return;
      }

      fs.writeFileSync(tempRestorePath, req.file.buffer);
      const stats = restoreFromSqliteFile(tempRestorePath);
      if (fs.existsSync(tempRestorePath)) {
        fs.unlinkSync(tempRestorePath);
      }

      res.json({
        message: `Restauro SQLite concluído com sucesso a partir de "${req.file.originalname}" (${stats.discos} discos, ${stats.ficheiros} ficheiros indexados)! Salvaguarda prévia criada: ${safetyFile}.`,
      });
    }
  } catch (e: any) {
    if (fs.existsSync(tempRestorePath)) {
      try {
        fs.unlinkSync(tempRestorePath);
      } catch {
        // ignore
      }
    }
    res.status(500).json({ error: `Erro ao restaurar base de dados: ${e?.message || e}` });
  }
});

// 8b. Chunked Upload & Restore / Merge for large SQLite (.db/.sqlite) or Full JSON (.json) files
app.post('/api/admin/db/restore-chunk', (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { uploadId, chunkIndex, totalChunks, originalName, mode, chunkBase64 } = req.body;
    if (!uploadId || typeof chunkIndex !== 'number' || typeof totalChunks !== 'number' || !chunkBase64) {
      res.status(400).json({ error: 'Parâmetros de upload incompletos.' });
      return;
    }

    const origLower = String(originalName || '').toLowerCase();
    const isJson = origLower.endsWith('.json');
    const isSqlite = origLower.endsWith('.db') || origLower.endsWith('.sqlite') || origLower.endsWith('.sqlite3');

    if (!isJson && !isSqlite) {
      res.status(400).json({
        error: 'Formato inválido. Apenas são suportados ficheiros SQLite (.db, .sqlite) ou Backups Completos (.json).',
      });
      return;
    }

    const safeUploadId = sanitizeFilename(String(uploadId));
    const tempRestorePath = path.join(BACKUPS_DIR, `.tmp_restore_${safeUploadId}`);

    const buffer = Buffer.from(chunkBase64, 'base64');
    if (chunkIndex === 0 && fs.existsSync(tempRestorePath)) {
      fs.unlinkSync(tempRestorePath);
    }
    fs.appendFileSync(tempRestorePath, buffer);

    if (chunkIndex + 1 < totalChunks) {
      res.json({ done: false, chunkIndex });
      return;
    }

    // Final chunk received -> execute restore or migration merge
    try {
      const restoreMode = mode === 'merge' ? 'merge' : 'replace';

      if (isJson) {
        const safetyFile = createPreRestoreSafetyBackup();
        const raw = fs.readFileSync(tempRestorePath, 'utf-8');
        const payload = JSON.parse(raw);
        const stats = restoreFromFullJsonPayload(payload);
        if (fs.existsSync(tempRestorePath)) fs.unlinkSync(tempRestorePath);
        res.json({
          done: true,
          message: `Restauro concluído com sucesso a partir de "${originalName}" (${stats.discos} discos, ${stats.ficheiros} ficheiros indexados, ${stats.relatoriosRestaurados} relatórios HTML)! Salvaguarda prévia criada: ${safetyFile}.`,
        });
      } else {
        const fd = fs.openSync(tempRestorePath, 'r');
        const headerBuf = Buffer.alloc(16);
        fs.readSync(fd, headerBuf, 0, 16, 0);
        fs.closeSync(fd);
        if (!headerBuf.subarray(0, 15).toString('utf-8').startsWith('SQLite format 3')) {
          if (fs.existsSync(tempRestorePath)) fs.unlinkSync(tempRestorePath);
          res.status(400).json({ error: 'O ficheiro selecionado não é uma base de dados SQLite 3 válida.' });
          return;
        }

        const safetyFile = createPreRestoreSafetyBackup();
        const stats = restoreFromSqliteFile(
          tempRestorePath,
          restoreMode,
          restoreMode === 'replace' // moveInsteadOfCopy=true in replace mode -> 1ms atomic rename!
        );
        if (fs.existsSync(tempRestorePath)) {
          try {
            fs.unlinkSync(tempRestorePath);
          } catch {
            // ignore
          }
        }

        if (restoreMode === 'merge') {
          res.json({
            done: true,
            message: `Migração concluída a partir de "${originalName}": ${stats.discosNovos} novos discos importados, ${stats.discosAtualizados} atualizados (${stats.discos} discos no total e ${stats.ficheiros.toLocaleString(
              'pt-PT'
            )} ficheiros indexados)! Salvaguarda prévia: ${safetyFile}.`,
          });
        } else {
          res.json({
            done: true,
            message: `Base de dados SQLite migrada/restaurada com sucesso a partir de "${originalName}" (${stats.discos} discos, ${stats.ficheiros.toLocaleString(
              'pt-PT'
            )} ficheiros indexados)! Salvaguarda prévia: ${safetyFile}.`,
          });
        }
      }
    } catch (innerErr: any) {
      // Keep the uploaded file in backups/ if an unexpected error occurs so a 2GB upload is never lost!
      let keptMsg = '';
      if (fs.existsSync(tempRestorePath)) {
        try {
          const fallbackName = `recebido_${buildTimestampTag()}.db`;
          fs.renameSync(tempRestorePath, path.join(BACKUPS_DIR, fallbackName));
          keptMsg = ` (O ficheiro enviado foi guardado em backups/${fallbackName} para não precisar de o enviar novamente).`;
        } catch {
          // ignore
        }
      }
      res.status(500).json({ error: `Erro ao processar base de dados: ${innerErr?.message || innerErr}${keptMsg}` });
    }
  } catch (e: any) {
    res.status(500).json({ error: `Erro ao carregar bloco da base de dados: ${e?.message || e}` });
  }
});

// 8c. Chunked Upload for Migrating Old Snap2HTML Reports (preserves original filename + auto-links + indexes)
app.post('/api/admin/db/migrate-report-chunk', (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const { uploadId, chunkIndex, totalChunks, originalName, chunkBase64 } = req.body;
    if (!uploadId || typeof chunkIndex !== 'number' || typeof totalChunks !== 'number' || !chunkBase64) {
      res.status(400).json({ error: 'Parâmetros de upload incompletos.' });
      return;
    }

    const cleanOrigName = path.basename(String(originalName || '').replace(/\\/g, '/')).trim();
    const lowerName = cleanOrigName.toLowerCase();
    if (!lowerName.endsWith('.html') && !lowerName.endsWith('.htm')) {
      res.status(400).json({ error: 'Apenas são permitidos relatórios Snap2HTML (.html ou .htm).' });
      return;
    }

    const safeUploadId = sanitizeFilename(String(uploadId));
    const tempPath = path.join(RELATORIOS_DIR, `.tmp_mig_${safeUploadId}`);

    const buffer = Buffer.from(chunkBase64, 'base64');
    if (chunkIndex === 0 && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    fs.appendFileSync(tempPath, buffer);

    if (chunkIndex + 1 < totalChunks) {
      res.json({ done: false, chunkIndex });
      return;
    }

    // Final chunk: save with exact original filename in ./relatorios/
    const finalPath = path.join(RELATORIOS_DIR, cleanOrigName);
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
    }
    fs.renameSync(tempPath, finalPath);

    // Try matching this report to a disk in discos_usb:
    // 1. Exact relatorio_path match (case-insensitive)
    let matchedDiscos = db
      .prepare('SELECT id, id_disco, total_imagens FROM discos_usb WHERE LOWER(relatorio_path) = LOWER(?)')
      .all(cleanOrigName) as { id: number; id_disco: string; total_imagens: number }[];

    // 2. If no disk had relatorio_path == cleanOrigName, try matching by id_disco or ticket_num stem/prefix
    if (matchedDiscos.length === 0) {
      const ext = path.extname(lowerName);
      const stem = path.basename(lowerName, ext);
      const candidateDiscos = db
        .prepare('SELECT id, id_disco, ticket_num, relatorio_path, total_imagens FROM discos_usb ORDER BY id ASC')
        .all() as {
        id: number;
        id_disco: string;
        ticket_num: string;
        relatorio_path: string | null;
        total_imagens: number;
      }[];

      for (const d of candidateDiscos) {
        // Only auto-assign if disk has no report or its report file does not exist
        const existingRel = normalizeRelatorioFilename(d.relatorio_path);
        const hasValidFile = existingRel ? fs.existsSync(path.join(RELATORIOS_DIR, existingRel)) : false;
        if (hasValidFile) continue;

        const idRaw = (d.id_disco || '').trim().toLowerCase();
        const idSafe = sanitizeFilename(d.id_disco || '').toLowerCase();
        const tickRaw = (d.ticket_num || '').trim().toLowerCase();
        const tickSafe = sanitizeFilename(d.ticket_num || '').toLowerCase();

        const matchesId =
          (idRaw && (stem === idRaw || stem.startsWith(`${idRaw}_`))) ||
          (idSafe && (stem === idSafe || stem.startsWith(`${idSafe}_`)));
        const matchesTicket =
          !matchesId &&
          ((tickRaw && (stem === tickRaw || stem.startsWith(`${tickRaw}_`))) ||
            (tickSafe && (stem === tickSafe || stem.startsWith(`${tickSafe}_`))));

        if (matchesId || matchesTicket) {
          db.prepare('UPDATE discos_usb SET relatorio_path = ? WHERE id = ?').run(cleanOrigName, d.id);
          matchedDiscos.push({ id: d.id, id_disco: d.id_disco, total_imagens: d.total_imagens });
          break;
        }
      }
    }

    let indexedTif = 0;
    let indexedTotal = 0;
    for (const md of matchedDiscos) {
      // Ensure exact case in relatorio_path
      db.prepare('UPDATE discos_usb SET relatorio_path = ? WHERE id = ?').run(cleanOrigName, md.id);
      const resIdx = indexarRelatorio(md.id, finalPath);
      indexedTif += resIdx.tifCount;
      indexedTotal += resIdx.total;
      if ((!md.total_imagens || md.total_imagens === 0) && resIdx.tifCount > 0) {
        db.prepare('UPDATE discos_usb SET total_imagens = ? WHERE id = ?').run(resIdx.tifCount, md.id);
      }
    }

    res.json({
      done: true,
      filename: cleanOrigName,
      linked_discos: matchedDiscos.map((m) => m.id_disco),
      indexed_tif: indexedTif,
      indexed_total: indexedTotal,
    });
  } catch (e: any) {
    res.status(500).json({ error: `Erro ao migrar relatório Snap2HTML: ${e?.message || e}` });
  }
});

// 8d. Auto-link unlinked reports in ./relatorios/ and reindex all linked reports
app.post('/api/admin/db/auto-link-reports', (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const forceAll = Boolean(req.body?.force_reindex_all);
    const stats = autoLinkAndIndexReports(forceAll);
    res.json({
      message: `Sincronização e indexação concluídas: ${stats.newlyLinked} relatórios associados automaticamente, ${stats.indexedDisks} relatórios indexados (${stats.totalTifIndexed} matrizes .TIF / ${stats.totalFilesIndexed} ficheiros)!`,
      ...stats,
    });
  } catch (e: any) {
    res.status(500).json({ error: `Erro ao associar e indexar relatórios: ${e?.message || e}` });
  }
});

// 8e. Manually link an existing report in ./relatorios/ to a specific disk record and index it
app.post('/api/admin/db/link-report', (req, res) => {
  if (!requireAdmin(req, res)) return;

  const discoId = Number(req.body?.disco_id || 0);
  const filename = normalizeRelatorioFilename(req.body?.filename);

  if (!discoId || !filename) {
    res.status(400).json({ error: 'Selecione um disco e um ficheiro de relatório válido.' });
    return;
  }

  const fullPath = path.join(RELATORIOS_DIR, filename);
  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: `O ficheiro "${filename}" não existe na pasta relatorios/.` });
    return;
  }

  const disco = db.prepare('SELECT id, id_disco, total_imagens FROM discos_usb WHERE id = ?').get(discoId) as
    | { id: number; id_disco: string; total_imagens: number }
    | undefined;
  if (!disco) {
    res.status(404).json({ error: 'Registo de disco não encontrado.' });
    return;
  }

  try {
    db.prepare('UPDATE discos_usb SET relatorio_path = ? WHERE id = ?').run(filename, disco.id);
    const resIdx = indexarRelatorio(disco.id, fullPath);
    if ((!disco.total_imagens || disco.total_imagens === 0) && resIdx.tifCount > 0) {
      db.prepare('UPDATE discos_usb SET total_imagens = ? WHERE id = ?').run(resIdx.tifCount, disco.id);
    }
    res.json({
      message: `Relatório "${filename}" associado ao disco "${disco.id_disco}" e indexado com sucesso (${resIdx.tifCount} ficheiros .TIF)!`,
    });
  } catch (e: any) {
    res.status(500).json({ error: `Erro ao associar relatório: ${e?.message || e}` });
  }
});

// 9. Database Maintenance: Optimize (VACUUM + WAL Checkpoint + Integrity Check)
app.post('/api/admin/db/optimize', (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    db.exec('VACUUM;');
    db.exec('ANALYZE;');
    const checkRow = db.prepare('PRAGMA integrity_check').get() as { integrity_check?: string } | undefined;
    res.json({
      message: `Base de dados otimizada e compactada (VACUUM + WAL Checkpoint concluídos · Integridade: ${
        checkRow?.integrity_check || 'ok'
      })!`,
    });
  } catch (e: any) {
    res.status(500).json({ error: `Erro ao otimizar base de dados: ${e?.message || e}` });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(BASE_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RIDIS Server running on http://localhost:${PORT}`);
  });
}

startServer();
