-- ==============================================================================
-- RIDIS — Sistema de Gestão de Discos USB, Matrizes e Relatórios de Preservação
-- SCRIPT DE CRIAÇÃO E INICIALIZAÇÃO DA BASE DE DADOS (SQLite 3)
-- Conformidade: ISO/IEC 27001:2022 (A.8.24, A.8.26) & Diretiva NIS 2 (Art. 21.º)
-- Autor: José Miguel Magalhães | Organização: DGLAB
-- ==============================================================================

-- 1. Ativação de Modos de Segurança, Performance e Integridade Relacional
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA temp_store = MEMORY;
PRAGMA cache_size = -64000; -- 64MB de cache na memória

-- 2. Tabela de Discos USB (Inventário Físico e Lógico de Suportes de Preservação)
CREATE TABLE IF NOT EXISTS discos_usb (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  arquivo TEXT NOT NULL,                         -- Código do Arquivo (ANTT, ADAVR, ADBJA, etc.)
  remetente TEXT,                                -- Entidade ou técnico remetente
  data_entrada TEXT,                             -- Data de entrada (formato ISO YYYY-MM-DD)
  ticket_num TEXT,                               -- Número do ticket de receção
  id_disco TEXT UNIQUE NOT NULL,                 -- Identificador único do disco/suporte
  localizacao TEXT,                              -- Armário, prateleira ou cofre físico
  tamanho_disco TEXT,                            -- Capacidade (ex: 2TB, 4TB, 500GB)
  marca TEXT,                                    -- Fabricante / Modelo do suporte
  numero_serie TEXT,                             -- Número de série de fábrica do dispositivo
  verificado INTEGER DEFAULT 0,                  -- 0=Não verificado, 1=Verificado
  ticket_integracao TEXT,                        -- Ticket de integração no Repositório Digital
  integrado INTEGER DEFAULT 0,                   -- 0=Não integrado, 1=Integrado
  armazenado_servidor INTEGER DEFAULT 0,         -- 0=Não armazenado, 1=Armazenado em servidor
  total_imagens INTEGER DEFAULT 0,               -- Contagem auditada de matrizes/imagens TIF
  observacoes TEXT,                              -- Notas técnicas e de custódia
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,-- Registo temporal de inserção
  projeto TEXT,                                  -- Projeto de digitalização associado
  relatorio_path TEXT                            -- Caminho do relatório de validação original
);

-- 3. Tabela de Controlo de Acesso e Utilizadores (RBAC - Role Based Access Control)
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,                 -- Nome de utilizador único
  password_hash TEXT NOT NULL,                   -- Hash criptográfico seguro (SHA256 c/ salt ou scrypt)
  is_admin INTEGER DEFAULT 0,                    -- Flag legada de administração (0 ou 1)
  role TEXT DEFAULT 'operador',                  -- Perfis RBAC: 'admin', 'operador', 'consulta'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- Data de criação da conta
);

-- 4. Tabela de Ficheiros e Matrizes Digitais Indexadas por Disco
CREATE TABLE IF NOT EXISTS relatorio_ficheiros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  disco_id INTEGER NOT NULL,                     -- Chave estrangeira para discos_usb(id)
  nome_ficheiro TEXT NOT NULL,                   -- Código de referência ou nome da matriz
  tamanho_bytes INTEGER DEFAULT 0,               -- Tamanho exato em bytes
  pasta TEXT DEFAULT '',                         -- Caminho da subpasta ou estrutura no disco
  FOREIGN KEY (disco_id) REFERENCES discos_usb(id) ON DELETE CASCADE
);

-- 5. Criação de Índices Otimizados para Alta Performance e Consultas Rápidas
CREATE INDEX IF NOT EXISTS idx_discos_id_disco ON discos_usb(id_disco);
CREATE INDEX IF NOT EXISTS idx_discos_arquivo ON discos_usb(arquivo);
CREATE INDEX IF NOT EXISTS idx_discos_projeto ON discos_usb(projeto);
CREATE INDEX IF NOT EXISTS idx_ficheiros_disco_id ON relatorio_ficheiros(disco_id);
CREATE INDEX IF NOT EXISTS idx_ficheiros_nome ON relatorio_ficheiros(nome_ficheiro);
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);

-- 6. Trigger para Integridade Temporal e Prevenção de Inconsistências
CREATE TRIGGER IF NOT EXISTS trg_valida_disco_insert
BEFORE INSERT ON discos_usb
BEGIN
  SELECT CASE
    WHEN NEW.id_disco IS NULL OR TRIM(NEW.id_disco) = ''
    THEN RAISE(ABORT, 'O identificador id_disco não pode ser vazio.')
  END;
END;

-- 7. Inserção do Utilizador Administrador Inicial de Segurança
-- Nota: Palavra-passe predefinida 'admin' gerada com salt SHA-256 ('ridis_salt_admin')
-- Em conformidade com ISO 27001 A.8.2, a palavra-passe deve ser alterada no primeiro acesso.
INSERT OR IGNORE INTO usuarios (username, password_hash, is_admin, role)
VALUES (
  'admin',
  '90b1e42cba273a0a38bdfdf3eef250785ff21db2636a0d4db0db08c7c9ec9ff3',
  1,
  'admin'
);

-- 8. Verificação de Integridade Físico-Lógica da Base de Dados
PRAGMA integrity_check;
