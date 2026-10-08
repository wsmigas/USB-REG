# ESPECIFICAÇÃO TÉCNICA DE IMPLANTAÇÃO E CONVERGÊNCIA NORMATIVA
## ISO/IEC 27001:2022 & DIRETIVA NIS 2 (UE 2022/2555)

---

**Aplicação:** RIDIS — Sistema de Gestão de Discos USB, Matrizes e Relatórios de Preservação Digital  
**Autor e Titular:** José Miguel Magalhães  
**Organização Licenciada:** DGLAB — Direção-Geral do Livro, dos Arquivos e das Bibliotecas  
**Âmbito de Utilização:** Exclusivo para Ambiente Interno / Intranet DGLAB  
**Diretório Base de Instalação:** `/opt/app_usb/`  
**Arquitetura de Rede:** Servidor Autónomo HTTP (Sem Proxy / Sem Nginx)  
**Origem do Código:** Repositório Oficial GitHub  
**Classificação:** RESTRITO / MÓDULO ADMINISTRAÇÃO BD  
**Versão:** 2.0.0 (Revisão Técnica DGLAB)  
**Data:** Outubro de 2026  

---

## 0. Enquadramento e Resumo de Arquitetura

O sistema RIDIS foi concebido como uma solução **autónoma e auto-contida** para execução restrita no perímetro interno (intranet/LAN) da DGLAB e dos Arquivos Distritais.

### 0.1 Premissas Fundamentais da Infraestrutura
1. **Pasta de Instalação:** `/opt/app_usb/` — diretoria padronizada no sistema operativo para aplicações autónomas.
2. **Sem Nginx / Sem Proxy:** A própria aplicação em Node.js / Express integra o seu servidor web HTTP nativo e o motor Vite, servindo diretamente as páginas, a API REST, tratando uploads volumosos (até 50MB) e gerindo sessões sem necessidade de Nginx, Apache ou qualquer proxy reverso.
3. **Instalação via GitHub:** A entrega e implantação são efetuadas por clonagem direta do repositório Git, bastando instalar previamente os módulos base do sistema operativo.
4. **Base de Dados Embutida:** SQLite 3 em modo WAL, armazenada localmente em `/opt/app_usb/gestao_discos.db`, garantindo alta performance e zero exposição de portas de base de dados na rede.
5. **Convergência Normativa:** Alinhada com os controlos da ISO/IEC 27001:2022 (A.5.15, A.8.2, A.8.9, A.8.13, A.8.24, A.8.26) e exigências de resiliência e continuidade da Diretiva NIS 2 (Artigo 21.º).

---

## 1. Módulos e Pacotes de Software Necessários Instalar Antes de Fazer o Clone

Antes de efetuar o clone do repositório a partir do GitHub, devem ser instalados no servidor Linux os seguintes pacotes essenciais do sistema:

### 1.1 Sistema Operativo Recomendado
* **Distribuição:** Ubuntu Server 24.04 LTS ou Debian 12 (Bookworm) / RHEL 9.
* **Requisitos Mínimos:** 2 vCPU, 4 GB de memória RAM, 50 GB de armazenamento (preferencialmente em partição com cifragem de disco LUKS).

### 1.2 Pacotes do Sistema Operativo (Instalar Pré-Clone)
Executar como `root` ou com `sudo`:

```bash
# 1. Atualização dos índices de repositórios do sistema
sudo apt update && sudo apt upgrade -y

# 2. Módulos fundamentais pré-requisito (Git, utilitários, compilador e ferramentas de segurança)
sudo apt install -y \
  git \
  curl \
  wget \
  ca-certificates \
  gnupg \
  build-essential \
  sqlite3 \
  libsqlite3-dev \
  ufw \
  fail2ban \
  logrotate \
  rsyslog \
  gzip
```

### 1.3 Instalação do Runtime Node.js (Versão 22 LTS)
A aplicação necessita do **Node.js v22 LTS** devido ao suporte nativo ao motor `node:sqlite`:

```bash
# Configuração do repositório oficial NodeSource para Node.js v22.x LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Instalação do runtime Node.js e do gestor de pacotes npm
sudo apt install -y nodejs

# Verificação das versões instaladas
git --version    # Deve confirmar a presença do Git
node -v          # Deve reportar v22.x.x
npm -v           # Deve reportar v10.x.x ou superior
```

---

## 2. Processo de Instalação por Clone do GitHub e Dependências

Com os módulos pré-requisito instalados, o processo de implantação na pasta `/opt/app_usb/` decorre da seguinte forma:

```bash
# 1. Criação do utilizador de serviço sem privilégios de login (Menor Privilégio - ISO 27001 A.8.2)
sudo useradd -r -s /usr/sbin/nologin -d /opt/app_usb ridis

# 2. Clonagem do repositório a partir do GitHub para a pasta homologada /opt/app_usb/
sudo git clone https://github.com/dglab/ridis.git /opt/app_usb
# (ou a partir do repositório Git interno da DGLAB)

# 3. Entrar no diretório da aplicação e instalar dependências do projeto
cd /opt/app_usb
sudo npm install

# 4. Configuração das variáveis de ambiente (.env)
sudo cp /opt/app_usb/deploy/env_producao.example /opt/app_usb/.env

# 5. Criação das pastas de suporte operacionais
sudo mkdir -p /opt/app_usb/relatorios /opt/app_usb/backups

# 6. Atribuição de permissões seguras
sudo chown -R ridis:ridis /opt/app_usb
sudo chmod 750 /opt/app_usb
sudo chmod 600 /opt/app_usb/.env
```

---

## 3. Base de Dados a Instalar e Script para Criar a BD

### 3.1 Motor de Base de Dados
* **Motor:** **SQLite 3** com modo transacional **WAL (Write-Ahead Logging)** e `PRAGMA synchronous = NORMAL;`.
* **Ficheiro da BD:** `/opt/app_usb/gestao_discos.db`
* **Vantagens de Segurança (ISO 27001 A.8.20 / NIS 2):** Não expõe portas de escuta na rede, não requer daemon adicional, previne ataques remotos de rede e suporta transações concorrentes de leitura e escrita com elevada performance.

### 3.2 Script SQL de Criação (`/opt/app_usb/deploy/schema_criacao_bd.sql`)

```sql
-- Ativação de Modos de Segurança, Integridade e Concorrência
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA temp_store = MEMORY;

-- 1. Tabela de Discos USB (Inventário Físico/Lógico de Suportes de Preservação)
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

-- 2. Tabela de Utilizadores e Controlo de Acesso (RBAC)
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,                   -- Hash SHA-256 com salt ou scrypt
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

-- 4. Índices para Otimização de Consultas e Prevenção de Exaustão de CPU
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

### 3.3 Execução do Script
```bash
# Criação direta da BD a partir do script
sqlite3 /opt/app_usb/gestao_discos.db < /opt/app_usb/deploy/schema_criacao_bd.sql

# Permissões restritas de leitura/escrita para o serviço
sudo chown ridis:ridis /opt/app_usb/gestao_discos.db*
sudo chmod 660 /opt/app_usb/gestao_discos.db*
```

---

## 4. Servidor Web: Arquitetura Autónoma (Sem Nginx / Sem Proxy)

A aplicação RIDIS é **totalmente auto-suficiente**:
* **Servidor HTTP Embutido:** O backend em Express atua diretamente como servidor HTTP de aplicação, escutando nativamente na porta configurada (padrão **3005** ou **3000**).
* **Sem Necessidade de Nginx ou Apache:** A própria aplicação:
  1. Serve os ficheiros estáticos e assets da interface gráfica React compilada com compressão gzip/deflate;
  2. Implementa o roteamento dinâmico da API REST;
  3. Trata uploads de ficheiros volumosos (Snap2HTML / CSV / TXT até 50MB) via `multer` com sanitização estrita de caminhos e nomes de ficheiros;
  4. Opera diretamente dentro do perímetro seguro da intranet da DGLAB, dispensando qualquer camada adicional de reverse proxy.

---

## 5. Conjunto de Ficheiros de Cada Aplicação e Permissões POSIX

A árvore completa de ficheiros instalada em `/opt/app_usb/` e o regime de permissões do sistema de ficheiros (Princípio do Menor Privilégio - ISO 27001 A.8.2):

```
/opt/app_usb/
├── server.ts                   # Servidor de aplicação backend Express, API REST e SQLite
├── package.json                # Manifesto de dependências instaladas via npm
├── tsconfig.json               # Configurações do TypeScript
├── vite.config.ts              # Configuração do Vite e plugins Tailwind
├── index.html                  # Ponto de entrada HTML da SPA
├── .env                        # Variáveis de ambiente (PORT=3005, segredos locais)
├── LICENSE                     # Licença Proprietária Restrita exclusiva DGLAB
├── LICENCA.md                  # Termo formal de Direitos de Autor (José Miguel Magalhães)
├── gestao_discos.db            # Base de dados SQLite operacional (WAL mode)
├── gestao_discos.db-wal        # Ficheiro Write-Ahead Log temporário
├── gestao_discos.db-shm        # Ficheiro Shared Memory de indexação
│
├── deploy/                     # Scripts de implantação e documentação técnica restrita
│   ├── schema_criacao_bd.sql   # Script DDL de criação e inicialização da base de dados
│   ├── ridis.service           # Unidade systemd com sandboxing de segurança
│   ├── env_producao.example    # Modelo de variáveis de ambiente
│   └── ESPECIFICACAO_TECNICA_27001_NIS2.md # Este documento de especificação técnica
│
├── relatorios/                 # Diretório de armazenamento de relatórios de discos carregados
├── backups/                    # Diretório local de cópias de segurança comprimidas (.db.gz)
├── public/                     # Ficheiros estáticos e PDF técnico de conformidade
└── src/                        # Código-fonte da interface de utilizador (React TypeScript)
    ├── App.tsx                 # Interface: inventário, importações, RBAC e módulo Admin BD
    ├── types.ts                # Interfaces e tipos de dados TypeScript
    └── main.tsx                # Bootstrap da aplicação React
```

### 5.1 Permissões POSIX Recomendadas

| Ficheiro / Diretório | Proprietário | Permissão | Justificação de Segurança (ISO 27001) |
| :--- | :--- | :--- | :--- |
| `/opt/app_usb/` (Raiz) | `ridis:ridis` | `750` | Apenas o utilizador de serviço e grupo acedem à diretoria |
| `server.ts`, `src/`, `deploy/` | `ridis:ridis` | `640` / `750` | Código apenas para leitura pelo processo, prevenindo adulteração |
| `gestao_discos.db*` | `ridis:ridis` | `660` | Leitura e escrita exclusivas do serviço |
| `relatorios/` | `ridis:ridis` | `770` | Receção controlada de uploads de relatórios |
| `backups/` | `ridis:ridis` | `750` | Diretório de salvaguarda de backups protegidos |
| `.env` | `ridis:ridis` | `600` | Segredos de sessão e portas protegidos contra leitura externa |

Comandos de aplicação:
```bash
sudo chown -R ridis:ridis /opt/app_usb
sudo find /opt/app_usb -type d -exec chmod 750 {} +
sudo find /opt/app_usb -type f -exec chmod 640 {} +
sudo chmod 770 /opt/app_usb/relatorios /opt/app_usb/backups
sudo chmod 660 /opt/app_usb/gestao_discos.db*
sudo chmod 600 /opt/app_usb/.env
```

---

## 6. Configurações a Aplicar

### 6.1 Unidade de Serviço Systemd (`/etc/systemd/system/ridis.service`)
Permite arranque automático no boot do servidor, reinício automático em caso de falha (NIS 2) e isolamento rigoroso por sandboxing (ISO 27001 A.8.9):

```ini
[Unit]
Description=RIDIS — Sistema de Gestao de Discos USB e Preservacao Digital (DGLAB)
After=network.target network-online.target

[Service]
Type=simple
User=ridis
Group=ridis
WorkingDirectory=/opt/app_usb
EnvironmentFile=-/opt/app_usb/.env
ExecStart=/usr/bin/node /opt/app_usb/node_modules/.bin/tsx /opt/app_usb/server.ts

Restart=always
RestartSec=5s

# Sandboxing de Segurança ISO/IEC 27001 A.8.9
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

Ativação do serviço:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ridis.service
sudo systemctl status ridis.service
```

### 6.2 Firewall Perimétrica Interna (UFW)
Apenas as portas autorizadas na LAN interna da DGLAB devem responder:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
# Acesso SSH restrito à rede de administração
sudo ufw allow from 10.0.0.0/8 to any port 22 proto tcp comment 'SSH Admin DGLAB'
# Acesso direto à aplicação RIDIS na porta 3005 para a intranet
sudo ufw allow from 10.0.0.0/8 to any port 3005 proto tcp comment 'RIDIS Intranet DGLAB'
sudo ufw enable
```

### 6.3 Política de Backup Automatizado (NIS 2 / ISO 27001 A.8.13)
Cronjob em `/etc/cron.d/ridis-backup`:
```cron
0 2 * * * ridis /usr/bin/sqlite3 /opt/app_usb/gestao_discos.db ".backup '/opt/app_usb/backups/backup_auto_$(date +\%Y\%m\%d_\%H\%M\%S).db'" && gzip /opt/app_usb/backups/backup_auto_*.db && find /opt/app_usb/backups -name "*.db.gz" -mtime +90 -delete
```

---

**Classificação:** Acesso Restrito — Módulo Administração BD (DGLAB).  
*Documento aprovado exclusivamente para o ambiente interno da DGLAB.*
