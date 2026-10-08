# ESPECIFICAÇÃO TÉCNICA DE ARQUITETURA E CONVERGÊNCIA NORMATIVA
## ISO/IEC 27001:2022 & DIRETIVA NIS 2 (UE 2022/2555)

---

**Aplicação:** RIDIS — Sistema de Gestão de Discos USB, Matrizes e Relatórios de Preservação Digital  
**Autor e Titular:** José Miguel Magalhães  
**Organização Licenciada:** DGLAB — Direção-Geral do Livro, dos Arquivos e das Bibliotecas  
**Âmbito de Utilização:** Exclusivo para Ambiente Interno / Intranet DGLAB  
**Diretório Base da Aplicação:** `/opt/app_usb/`  
**Porta de Operação:** Exclusivamente **Porta 3005** (Servidor Autónomo HTTP sem Proxy / sem Nginx)  
**Classificação do Documento:** RESTRITO / MÓDULO ADMINISTRAÇÃO BD  
**Versão:** 3.0.0 (Especificação Estrutural e Arquitetura)  
**Data:** Outubro de 2026  

---

## 0. Enquadramento e Resumo de Arquitetura

O RIDIS é uma solução **autónoma e auto-suficiente** concebida para operação estrita na rede interna (LAN/intranet) da DGLAB e dos Arquivos Distritais.

### 0.1 Premissas Arquiteturais Fundamentais
1. **Diretório Homologado:** `/opt/app_usb/` — localização padrão no sistema Linux onde a aplicação, a base de dados e os relatórios residem.
2. **Operação Exclusiva na Porta 3005:** A aplicação opera estritamente na porta TCP **3005**, sem suporte secundário à porta 3000 para evitar ambiguidades operacionais.
3. **Servidor Autónomo (Sem Proxy / Sem Nginx):** O backend Node.js / Express integra nativamente o servidor HTTP e o serviço de ficheiros estáticos da SPA React, respondendo diretamente na porta 3005 aos navegadores da intranet da DGLAB. Não é necessário qualquer servidor web externo (Nginx, Apache) nem proxy reverso.
4. **Nota sobre Instalação:** As instruções de instalação passo a passo do sistema operativo e do clone do repositório são fornecidas num documento externo dedicado. Este documento foca-se na especificação técnica de arquitetura, pacotes requeridos, base de dados, estrutura de ficheiros e segurança.

---

## 1. Pacotes e Módulos de Software Requeridos

A infraestrutura do servidor requer os seguintes pacotes e módulos de suporte instalados no sistema operativo:

* **Sistema Operativo Homologado:** Ubuntu Server 24.04 LTS ou Debian 12 (Bookworm) / RHEL 9 (64-bit).
* **Runtime de Aplicação:** **Node.js v22 LTS** (com gestor de pacotes `npm`), necessário pelo suporte ao motor nativo `node:sqlite`.
* **Ferramenta de Controlo de Versões:** `git` (utilizado para obtenção e atualização do código fonte do projeto).
* **Motor e Utilitários de Base de Dados:** `sqlite3` e biblioteca de desenvolvimento `libsqlite3-dev`.
* **Utilitários do Sistema e Segurança:** `build-essential`, `ca-certificates`, `curl`, `ufw` (firewall perimétrica interna), `fail2ban`, `logrotate`, `rsyslog`, `gzip`.
* **Módulos da Aplicação (npm):**
  * `express` (v4.21+) — Servidor HTTP autónomo e roteamento da API REST;
  * `multer` (v2.4+) — Processamento de uploads de relatórios de ficheiros volumosos (até 50MB);
  * `react` / `react-dom` (v19) — Interface gráfica de utilizador SPA reativa;
  * `vite` & `@tailwindcss/vite` — Servidor e empacotador de ativos frontend;
  * `pdfkit` — Motor de geração vetorial de relatórios técnicos e documentos de conformidade;
  * `tsx` / `typescript` — Compilador e executor de TypeScript em runtime de alta performance.

---

## 2. Base de Dados: Especificação e Script DDL de Criação

### 2.1 Especificação da Base de Dados
* **Motor:** **SQLite 3** com modo transacional **WAL (Write-Ahead Logging)** e `PRAGMA synchronous = NORMAL;`.
* **Localização Exata:** `/opt/app_usb/gestao_discos.db`
* **Vantagens de Segurança (ISO 27001 A.8.20 / NIS 2):** Não abre portas de rede no servidor, garantindo isolamento total face à rede externa e prevenindo ataques remotos de injeção direta.

### 2.2 Script SQL de Criação e Inicialização (`/opt/app_usb/deploy/schema_criacao_bd.sql`)

```sql
-- Ativação de Modos de Segurança, Integridade e Concorrência
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA temp_store = MEMORY;

-- 1. Tabela de Discos USB (Inventário Físico/Lógico de Preservação)
CREATE TABLE IF NOT EXISTS discos_usb (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  arquivo TEXT NOT NULL,                         -- ANTT, ADAVR, ADBJA, etc.
  remetente TEXT,                                -- Entidade remetente
  data_entrada TEXT,                             -- Data ISO YYYY-MM-DD
  ticket_num TEXT,                               -- Número de ticket
  id_disco TEXT UNIQUE NOT NULL,                 -- Identificador unívoco do disco
  localizacao TEXT,                              -- Armário / cofre físico
  tamanho_disco TEXT, marca TEXT, numero_serie TEXT,
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

-- 2. Tabela de Utilizadores e Controlo de Acesso (RBAC - ISO 27001 A.5.15)
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,                   -- SHA-256 com salt ou scrypt
  is_admin INTEGER DEFAULT 0,
  role TEXT DEFAULT 'operador',                  -- 'admin', 'operador', 'consulta'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Ficheiros e Matrizes Digitais por Disco
CREATE TABLE IF NOT EXISTS relatorio_ficheiros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  disco_id INTEGER NOT NULL,
  nome_ficheiro TEXT NOT NULL,
  tamanho_bytes INTEGER DEFAULT 0,
  pasta TEXT DEFAULT '',
  FOREIGN KEY (disco_id) REFERENCES discos_usb(id) ON DELETE CASCADE
);

-- 4. Índices Otimizados para Alto Rendimento
CREATE INDEX IF NOT EXISTS idx_discos_id_disco ON discos_usb(id_disco);
CREATE INDEX IF NOT EXISTS idx_discos_arquivo ON discos_usb(arquivo);
CREATE INDEX IF NOT EXISTS idx_discos_projeto ON discos_usb(projeto);
CREATE INDEX IF NOT EXISTS idx_ficheiros_disco_id ON relatorio_ficheiros(disco_id);
CREATE INDEX IF NOT EXISTS idx_ficheiros_nome ON relatorio_ficheiros(nome_ficheiro);
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);

-- 5. Conta Inicial de Administrador (Obrigatório alterar no primeiro login - ISO 27001 A.8.2)
INSERT OR IGNORE INTO usuarios (username, password_hash, is_admin, role)
VALUES ('admin', '90b1e42cba273a0a38bdfdf3eef250785ff21db2636a0d4db0db08c7c9ec9ff3', 1, 'admin');

PRAGMA integrity_check;
```

---

## 3. Servidor Web: Operação Exclusiva na Porta 3005 (Sem Proxy)

A aplicação atua como **servidor web HTTP autónomo**:
* **Porta Exclusiva:** Escuta apenas na porta TCP **3005** (`http://<ip-do-servidor>:3005/`).
* **Sem Porta 3000:** Qualquer menção ou escuta na porta 3000 foi removida, garantindo consistência na rede da DGLAB.
* **Sem Necessidade de Nginx / Apache:**
  1. O motor Express fornece diretamente os ficheiros estáticos e páginas da interface SPA;
  2. Fornece os endpoints REST de API para inventário, pesquisa e administração;
  3. Gere o upload de relatórios com limite ajustado para 50MB;
  4. Reduz a superfície de ataque, elimina serviços desnecessários e simplifica a manutenção interna.

---

## 4. Estrutura Completa de Diretórios e Ficheiros em `/opt/app_usb/`

Abaixo apresenta-se a árvore estrutural da aplicação, identificando cada ficheiro, a sua localização exata e função:

```
/opt/app_usb/
│
├── server.ts
│   └── Localização: /opt/app_usb/server.ts
│   └── Função: Servidor backend autónomo Express, API REST, motor SQLite nativo e Vite middleware na porta 3005.
│   └── Permissão: 640 (ridis:ridis)
│
├── gestao_discos.db (e ficheiros auxiliares .db-wal e .db-shm)
│   └── Localização: /opt/app_usb/gestao_discos.db
│   └── Função: Base de dados relacional SQLite operacional contendo os discos, ficheiros indexados e contas RBAC.
│   └── Permissão: 660 (ridis:ridis)
│
├── .env
│   └── Localização: /opt/app_usb/.env
│   └── Função: Ficheiro de configuração local com variáveis de ambiente (APP_PORT=3005, caminhos de dados).
│   └── Permissão: 600 (ridis:ridis)
│
├── package.json & tsconfig.json
│   └── Localização: /opt/app_usb/package.json | /opt/app_usb/tsconfig.json
│   └── Função: Manifesto de dependências do Node.js e configurações do compilador TypeScript.
│   └── Permissão: 640 (ridis:ridis)
│
├── vite.config.ts & index.html
│   └── Localização: /opt/app_usb/vite.config.ts | /opt/app_usb/index.html
│   └── Função: Ponto de entrada HTML da SPA e configuração de empacotamento com porta 3005.
│   └── Permissão: 640 (ridis:ridis)
│
├── LICENSE & LICENCA.md
│   └── Localização: /opt/app_usb/LICENSE | /opt/app_usb/LICENCA.md
│   └── Função: Termos de Direitos de Autor e Licenciamento Proprietário exclusivo para a DGLAB (José Miguel Magalhães).
│   └── Permissão: 644 (ridis:ridis)
│
├── relatorios/  ★★ PASTA CENTRAL DE RELATÓRIOS DE VALIDAÇÃO ★★
│   └── Localização: /opt/app_usb/relatorios/
│   └── Função: Diretório central obrigatório onde mais tarde os ficheiros de relatório dos discos USB
│       (formatos Snap2HTML .html, relatórios .txt e listagens .csv) terão que ser copiados/alojados
│       pelos técnicos e operadores para que a aplicação possa proceder à sua leitura, análise,
│       extração de matrizes TIF e associação automática aos respetivos discos inventariados.
│   └── Permissão: 770 (ridis:ridis) — permitindo escrita por operadores autorizados e leitura total pelo RIDIS.
│
├── backups/
│   └── Localização: /opt/app_usb/backups/
│   └── Função: Diretório reservado para armazenamento das cópias de segurança automáticas (.db.gz).
│   └── Permissão: 750 (ridis:ridis)
│
├── deploy/
│   └── Localização: /opt/app_usb/deploy/
│   └── Conteúdo:
│       ├── schema_criacao_bd.sql    # Script SQL executável de criação da base de dados SQLite
│       ├── ridis.service            # Ficheiro de unidade systemd homologado para /opt/app_usb/
│       ├── env_producao.example     # Modelo de variáveis de ambiente de produção
│       └── ESPECIFICACAO_TECNICA_27001_NIS2.md # Este documento de especificação técnica
│   └── Permissão: 750 (ridis:ridis)
│
├── public/
│   └── Localização: /opt/app_usb/public/
│   └── Conteúdo: Ativos estáticos públicos e PDF oficial de especificação técnica.
│   └── Permissão: 750 (ridis:ridis)
│
└── src/
    └── Localização: /opt/app_usb/src/
    └── Conteúdo:
        ├── App.tsx       # Componente principal React: inventário, importações e módulo Administração BD
        ├── types.ts      # Definições de tipos e interfaces TypeScript (DiscoUsb, Usuario, etc.)
        ├── main.tsx      # Bootstrap da aplicação no DOM do navegador
        └── index.css     # Estilos globais e integração Tailwind CSS
    └── Permissão: 750 (ridis:ridis)
```

---

## 5. Destaque Operacional: A Pasta `/opt/app_usb/relatorios/`

A pasta **`/opt/app_usb/relatorios/`** desempenha um papel crítico na cadeia de custódia e preservação digital:

1. **Destino Obrigatório dos Relatórios Externos:** É nesta pasta que os técnicos de digitalização e administradores de arquivo devem copiar (via cópia direta de ficheiros, SCP, SFTP ou partilha de rede) os relatórios gerados por ferramentas como Snap2HTML (`.html`), ficheiros de texto (`.txt`) ou ficheiros de dados (`.csv`).
2. **Associação Automática aos Discos:** Quando um relatório se encontra em `/opt/app_usb/relatorios/`, a aplicação RIDIS permite:
   * Detetar automaticamente os ficheiros presentes na pasta;
   * Efetuar o parsing rápido de árvores de diretórios com até 15 milhões de ficheiros;
   * Extrair os Códigos de Referência dos documentos (ex: `PT-TT-JC-A-005-0023`);
   * Ligar com 1 clique o relatório ao registo correspondente na tabela `discos_usb`.
3. **Recomendações de Permissões:**
   * Diretório: `chmod 770 /opt/app_usb/relatorios`
   * Utilizador/Grupo: `ridis:ridis`
   * Se for partilhada via rede interna (ex: Samba), os utilizadores do grupo `ridis` devem ter permissões de escrita para permitir a cópia direta dos relatórios.

---

## 6. Configurações a Aplicar: Systemd e Segurança Interna

### 6.1 Unidade de Serviço Systemd (`/etc/systemd/system/ridis.service`)
Configuração que garante arranque automático no boot e isolamento estrito de processos (Princípio do Menor Privilégio - ISO 27001 A.8.9):

```ini
[Unit]
Description=RIDIS — Sistema de Gestao de Discos USB e Preservacao Digital (DGLAB)
After=network.target network-online.target

[Service]
Type=simple
User=ridis
Group=ridis
WorkingDirectory=/opt/app_usb
Environment=NODE_ENV=production
Environment=APP_PORT=3005
EnvironmentFile=-/opt/app_usb/.env
ExecStart=/usr/bin/node /opt/app_usb/node_modules/.bin/tsx /opt/app_usb/server.ts

Restart=always
RestartSec=5s

# Sandboxing ISO/IEC 27001 A.8.9
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ProtectKernelTunables=true
ProtectKernelModules=true
ReadWritePaths=/opt/app_usb/gestao_discos.db /opt/app_usb/gestao_discos.db-wal /opt/app_usb/gestao_discos.db-shm /opt/app_usb/relatorios /opt/app_usb/backups

StandardOutput=journal
StandardError=journal
SyslogIdentifier=ridis-dglab

[Install]
WantedBy=multi-user.target
```

### 6.2 Firewall Perimétrica Interna (UFW)
Apenas as portas autorizadas na LAN interna da DGLAB:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 10.0.0.0/8 to any port 22 proto tcp comment 'SSH Admin DGLAB'
sudo ufw allow from 10.0.0.0/8 to any port 3005 proto tcp comment 'RIDIS HTTP Porta 3005'
sudo ufw enable
```

### 6.3 Rotina de Backup da Base de Dados (NIS 2 / ISO 27001 A.8.13)
Cronjob em `/etc/cron.d/ridis-backup`:
```cron
0 2 * * * ridis /usr/bin/sqlite3 /opt/app_usb/gestao_discos.db ".backup '/opt/app_usb/backups/backup_auto_$(date +\%Y\%m\%d_\%H\%M\%S).db'" && gzip /opt/app_usb/backups/backup_auto_*.db && find /opt/app_usb/backups -name "*.db.gz" -mtime +90 -delete
```

---

**Classificação:** Acesso Restrito — Módulo Administração BD (DGLAB).  
*Documento aprovado exclusivamente para o ambiente interno da DGLAB.*
