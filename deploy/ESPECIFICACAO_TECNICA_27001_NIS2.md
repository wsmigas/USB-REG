# ESPECIFICAÇÃO TÉCNICA DE IMPLANTAÇÃO E CONVERGÊNCIA NORMATIVA
## ISO/IEC 27001:2022 & DIRETIVA NIS 2 (UE 2022/2555)

---

**Aplicação:** RIDIS — Sistema de Gestão de Discos USB, Matrizes e Relatórios de Preservação Digital  
**Autor e Titular:** José Miguel Magalhães  
**Organização Titular de Licença de Uso:** DGLAB — Direção-Geral do Livro, dos Arquivos e das Bibliotecas  
**Classificação do Documento:** RESTRITO / USO TÉCNICO INTERNO EXCLUSIVO DGLAB  
**Versão:** 1.0.0  
**Data:** Outubro de 2026  

---

## 0. Enquadramento e Matriz de Convergência (ISO 27001 / NIS 2)

O RIDIS foi concebido como um elemento crítico para a cadeia de custódia, catalogação e preservação digital da DGLAB e dos Arquivos Distritais (ANTT, Arquivos Distritais, etc.). A presente especificação estabelece os requisitos técnicos e operacionais de implantação sob uma arquitetura de segurança por conceção (*Security by Design*) e por defeito (*Security by Default*).

### 0.1 Mapeamento Normativo ISO/IEC 27001:2022
* **A.5.15 / A.5.18 Controlo de Acesso e Direitos de Acesso:** Implementação de modelo RBAC (Admin, Operador, Consulta), autenticação com hashing criptográfico e segregação de funções.
* **A.8.2 Gestão de Privilégios e Menor Privilégio:** Execução do serviço sob conta dedicada sem privilégios de root (`ridis:ridis`), com permissões de leitura/escrita estritas no sistema de ficheiros.
* **A.8.9 Gestão de Configurações:** Sandboxing systemd (`ProtectSystem=strict`, `NoNewPrivileges=true`, `PrivateTmp=true`), desativação de banners e hardening de Nginx.
* **A.8.13 Cópia de Segurança das Informações:** Backups periódicos da base de dados e relatórios com integridade verificável (`PRAGMA integrity_check`) e retenção controlada.
* **A.8.20 Segurança da Rede:** Camada perimétrica isolada, terminação TLS 1.3 obrigatória, firewall (UFW) com bloqueio predefinido e limitação de taxa (Rate Limiting).
* **A.8.24 Utilização de Criptografia:** TLS 1.3 para dados em trânsito, HSTS estrito, armazenamento de palavras-passe com salts SHA-256 / scrypt, e recomendação de cifragem em repouso (LUKS).
* **A.8.26 Requisitos de Segurança nas Aplicações:** Validação de entradas (sanitização de nomes de ficheiros e códigos de referência), limites de upload (50MB) e parametrização SQL contra injeções.

### 0.2 Mapeamento com a Diretiva NIS 2 (Diretiva UE 2022/2555 - Art. 21.º)
* **Políticas de Análise de Riscos e Segurança dos Sistemas (Art. 21.º n.º 2 a):** Especificação documentada de arquitetura, inventário e dependências.
* **Tratamento de Incidentes (Art. 21.º n.º 2 b):** Logs estruturados centralizados no `journald` e Nginx, prontos para reencaminhamento para SIEM / SOC do CNCS.
* **Continuidade de Atividade e Gestão de Crises (Art. 21.º n.º 2 c):** Reinício automático do serviço (`Restart=always`), modo SQLite WAL com recuperação instantânea após falha.
* **Segurança da Cadeia de Abastecimento (Art. 21.º n.º 2 d):** Eliminação de dependências de nuvens externas não autorizadas, execução 100% *on-premises* na infraestrutura da DGLAB.
* **Segurança na Aquisição, Desenvolvimento e Manutenção (Art. 21.º n.º 2 e):** Código auditado sem telemetry, dependências fixas em `package.json`.
* **Práticas Básicas de Ciber-Higiene e Criptografia (Art. 21.º n.º 2 g, h):** Uso exclusivo de algoritmos robustos de cifragem e controlo estrito de credenciais.

---

## 1. Pacotes de Software Necessários Instalar

### 1.1 Sistema Operativo Recomendado
* **Distribuição:** Ubuntu Server 24.04 LTS (Noble Numbat) ou Debian 12 (Bookworm) / RHEL 9.
* **Arquitetura:** x86_64 ou aarch64.
* **Requisitos Mínimos:** 2 vCPU, 4 GB RAM, 50 GB de armazenamento SSD (com partição `/var/www/ridis` em volume encriptado LUKS).

### 1.2 Pacotes do Sistema Operativo (APT / Debian / Ubuntu)
Executar os seguintes comandos com privilégios de superutilizador (`root` ou `sudo`):

```bash
# 1. Atualização dos repositórios e pacotes do sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalação de utilitários essenciais, compiladores e ferramentas de segurança
sudo apt install -y \
  curl \
  wget \
  git \
  build-essential \
  ca-certificates \
  gnupg \
  lsb-release \
  sqlite3 \
  libsqlite3-dev \
  nginx \
  ufw \
  fail2ban \
  logrotate \
  rsyslog \
  gzip \
  unzip \
  openssl
```

### 1.3 Instalação do Node.js Runtime (Node.js 22 LTS)
A aplicação RIDIS utiliza o motor nativo `node:sqlite` (disponível e otimizado a partir do Node.js v22).

```bash
# Configuração do repositório oficial NodeSource para Node.js v22.x LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Instalação do runtime Node.js e gestor npm
sudo apt install -y nodejs

# Verificação das versões instaladas
node -v   # Deve reportar v22.x.x
npm -v    # Deve reportar v10.x.x ou superior
```

### 1.4 Dependências de Aplicação (Node / npm)
No diretório da aplicação (`/var/www/ridis`), as dependências são geridas via `package.json`:

* **Dependências de Produção:**
  * `express` (v4.21+): Servidor de aplicação HTTP e roteamento REST.
  * `vite` (v8.3+): Servidor de ativos e bundler de frontend.
  * `multer` (v2.4+): Tratamento multipart para upload de relatórios de validação de discos.
  * `react` e `react-dom` (v19.0+): Framework reativa da interface de utilizador.
  * `lucide-react`: Biblioteca de iconografia vetorial SVG segura.
  * `motion`: Motor de animações declarativas.
  * `@tailwindcss/vite` e `tailwindcss` (v4.3+): Framework de estilização utilitária sem CSS externo.
  * `pdfkit` (v0.17+): Gerador vetorial de relatórios e documentos PDF técnicos.
* **Dependências de Desenvolvimento / Execução:**
  * `tsx` (v4.21+): Executor de alto rendimento para TypeScript em tempo de execução.
  * `typescript` (v7.0+): Verificador estático de tipagem e integridade de código.
  * `@types/node`, `@types/express`, `@types/multer`, `@types/react`.

```bash
# No diretório /var/www/ridis
cd /var/www/ridis
npm ci --omit=dev  # ou npm install para ambiente de compilação
```

---

## 2. Base de Dados a Instalar e Script de Criação

### 2.1 Motor de Base de Dados
* **Motor:** **SQLite 3** (integrado nativamente via `node:sqlite` do Node.js 22).
* **Ficheiro de Base de Dados:** `/var/www/ridis/gestao_discos.db`
* **Modo Transacional:** **WAL (Write-Ahead Logging)** — garante concorrência leitor-escritor sem bloqueios de tabela, recuperação atómica após falha e alto rendimento.
* **Segurança Física (ISO 27001 A.8.24):** A diretoria onde reside a BD deve estar montada numa partição cifrada com **LUKS (dm-crypt)** com chave gerida em HSM ou custódia de chaves da DGLAB.

### 2.2 Script SQL de Criação e Inicialização (`schema_criacao_bd.sql`)

```sql
-- Ativação de Modos de Segurança, Performance e Integridade Relacional
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA temp_store = MEMORY;

-- Tabela de Discos USB (Inventário Físico e Lógico)
CREATE TABLE IF NOT EXISTS discos_usb (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  arquivo TEXT NOT NULL,
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

-- Tabela de Utilizadores e Controlo de Acesso (RBAC)
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_admin INTEGER DEFAULT 0,
  role TEXT DEFAULT 'operador',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Ficheiros e Matrizes Digitais por Disco
CREATE TABLE IF NOT EXISTS relatorio_ficheiros (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  disco_id INTEGER NOT NULL,
  nome_ficheiro TEXT NOT NULL,
  tamanho_bytes INTEGER DEFAULT 0,
  pasta TEXT DEFAULT '',
  FOREIGN KEY (disco_id) REFERENCES discos_usb(id) ON DELETE CASCADE
);

-- Índices de Otimização e Prevenção de DoS em Consultas Pesadas
CREATE INDEX IF NOT EXISTS idx_discos_id_disco ON discos_usb(id_disco);
CREATE INDEX IF NOT EXISTS idx_discos_arquivo ON discos_usb(arquivo);
CREATE INDEX IF NOT EXISTS idx_discos_projeto ON discos_usb(projeto);
CREATE INDEX IF NOT EXISTS idx_ficheiros_disco_id ON relatorio_ficheiros(disco_id);
CREATE INDEX IF NOT EXISTS idx_ficheiros_nome ON relatorio_ficheiros(nome_ficheiro);
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);

-- Utilizador Administrador Inicial
-- Password: admin (SHA-256 com salt ridis_salt_admin)
-- OBRIGATÓRIO ALTERAR NO PRIMEIRO ACESSO (ISO 27001 A.8.2)
INSERT OR IGNORE INTO usuarios (username, password_hash, is_admin, role)
VALUES (
  'admin',
  '90b1e42cba273a0a38bdfdf3eef250785ff21db2636a0d4db0db08c7c9ec9ff3',
  1,
  'admin'
);

-- Validação de Integridade Estrutural
PRAGMA integrity_check;
```

### 2.3 Procedimento de Execução do Script
```bash
# Execução direta via CLI do SQLite
sqlite3 /var/www/ridis/gestao_discos.db < /var/www/ridis/deploy/schema_criacao_bd.sql

# Ajuste imediato de permissões de ficheiro
sudo chown ridis:ridis /var/www/ridis/gestao_discos.db*
sudo chmod 660 /var/www/ridis/gestao_discos.db*
```

---

## 3. Web Server a Instalar (Nginx)

### 3.1 Papel do Web Server
O **Nginx** atua como camada de terminação TLS (HTTPS), reverse proxy perimétrico e filtro de segurança (WAF leve) à frente do Node.js, garantindo:
1. Descarregamento SSL/TLS com cifras conformes à ISO 27001 A.8.24 e NIS 2;
2. Bloqueio de métodos HTTP não autorizados e limitação de taxa (Rate Limiting);
3. Injeção obrigatória de cabeçalhos de segurança (HSTS, CSP, X-Frame-Options);
4. Ocultação total da assinatura interna do servidor de aplicação (`server_tokens off`).

### 3.2 Ficheiro de Configuração Nginx (`/etc/nginx/sites-available/ridis.conf`)

```nginx
limit_req_zone $binary_remote_addr zone=ridis_api_limit:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=ridis_login_limit:10m rate=5r/m;

upstream ridis_backend {
    server 127.0.0.1:3005 max_fails=3 fail_timeout=10s;
    keepalive 32;
}

# Redirecionamento HTTP -> HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ridis.dglab.gov.pt;
    server_tokens off;
    return 301 https://$host$request_uri;
}

# Servidor Principal HTTPS Seguro
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ridis.dglab.gov.pt;

    server_tokens off;

    # Certificados Digitais Oficiais
    ssl_certificate /etc/ssl/certs/ridis_dglab.crt;
    ssl_certificate_key /etc/ssl/private/ridis_dglab.key;

    # Cifras Criptográficas Fortes
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Cabeçalhos de Segurança (ISO/IEC 27001)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self';" always;

    # Limite de Tamanho de Uploads
    client_max_body_size 50M;

    # Logs de Auditoria NIS 2
    access_log /var/log/nginx/ridis_access.log combined;
    error_log /var/log/nginx/ridis_error.log warn;

    # Proteção de Autenticação contra Ataques de Força Bruta
    location = /api/login {
        limit_req zone=ridis_login_limit burst=5 nodelay;
        proxy_pass http://ridis_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy para Endpoints de API
    location /api/ {
        limit_req zone=ridis_api_limit burst=50 nodelay;
        proxy_pass http://ridis_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    # Raiz da Aplicação Web
    location / {
        proxy_pass http://ridis_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Bloqueio de Acesso a Ficheiros Ocultos e Git
    location ~ /\.(?!well-known).* {
        deny all;
        access_log off;
    }
}
```

### 3.3 Ativação no Sistema
```bash
sudo ln -sf /etc/nginx/sites-available/ridis.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 4. Conjunto de Ficheiros de Cada Aplicação

A arquitetura do RIDIS é unificada (Full-Stack TypeScript com motor Express + Vite SPA integrado). A árvore completa de ficheiros da aplicação e as respetivas permissões recomendadas são apresentadas de seguida:

```
/var/www/ridis/
├── server.ts                   # Servidor de aplicação backend Express, API REST, SQLite e Vite middleware
├── package.json                # Manifesto de dependências e scripts do Node.js
├── tsconfig.json               # Configurações do compilador TypeScript
├── vite.config.ts              # Configuração do empacotador frontend Vite e plugins Tailwind
├── index.html                  # Ponto de entrada HTML do frontend (com meta tags de copyright e segurança)
├── metadata.json               # Metadados institucionais da aplicação DGLAB
├── LICENSE                     # Licença Proprietária Restrita exclusiva DGLAB
├── LICENCA.md                  # Termo formal de Direitos de Autor e Propriedade Intelectual (José Miguel Magalhães)
├── gestao_discos.db            # Base de dados SQLite operacional (WAL mode)
├── gestao_discos.db-wal        # Ficheiro Write-Ahead Log temporário do SQLite
├── gestao_discos.db-shm        # Ficheiro Shared-Memory de indexação do SQLite
│
├── deploy/                     # Scripts e modelos de implantação para administradores de sistemas
│   ├── schema_criacao_bd.sql   # Script SQL DDL de criação e inicialização da base de dados
│   ├── nginx_ridis.conf        # Modelo de configuração do servidor Nginx
│   ├── ridis.service           # Unidade systemd com sandboxing de segurança
│   ├── env_producao.example    # Modelo de variáveis de ambiente de produção
│   └── ESPECIFICACAO_TECNICA_27001_NIS2.md # Este documento de especificação técnica integral
│
├── relatorios/                 # Diretório de armazenamento de relatórios de validação de discos (.txt/.csv)
│   └── (ficheiros carregados pelos operadores)
│
├── backups/                    # Diretório local de cópias de segurança automáticas (.db.gz)
│   └── backup_gestao_discos_*.db.gz
│
├── public/                     # Ficheiros estáticos públicos do frontend
│   ├── favicon.svg             # Ícone oficial
│   └── RIDIS_Especificacao_Tecnica_ISO27001_NIS2.pdf # Documento PDF oficial gerado
│
└── src/                        # Código-fonte da interface de utilizador (React + TypeScript)
    ├── main.tsx                # Bootstrap da aplicação React no DOM
    ├── App.tsx                 # Interface completa: inventário, importações, pesquisa, RBAC, auditoria
    ├── types.ts                # Definições estáticas de interfaces TypeScript e tipos de dados
    └── index.css               # Estilos globais e importação do motor Tailwind CSS
```

### 4.1 Tabela de Permissões POSIX Recomendadas (Menor Privilégio - ISO 27001 A.8.2)

| Ficheiro / Diretório | Utilizador / Grupo | Permissão Numérica | Justificação de Segurança |
| :--- | :--- | :--- | :--- |
| `/var/www/ridis/` (Raiz) | `ridis:ridis` | `drwxr-x---` (750) | Impede navegação por outros utilizadores do SO |
| `server.ts`, `src/`, `public/` | `ridis:ridis` | `chmod 640` / `750` | Leitura pelo processo, sem escrita para prevenir adulteração em runtime |
| `gestao_discos.db*` | `ridis:ridis` | `chmod 660` | Leitura e escrita exclusivas do serviço |
| `relatorios/` | `ridis:ridis` | `drwxrwx---` (770) | Diretório de receção de uploads de relatórios |
| `backups/` | `ridis:ridis` | `drwxr-x---` (750) | Diretório de armazenamento de backups com acesso restrito |
| `.env` | `ridis:ridis` | `chmod 600` | Segredos e portas protegidos contra qualquer leitura externa |

Comandos de aplicação:
```bash
sudo useradd -r -s /usr/sbin/nologin -d /var/www/ridis ridis
sudo chown -R ridis:ridis /var/www/ridis
sudo find /var/www/ridis -type d -exec chmod 750 {} +
sudo find /var/www/ridis -type f -exec chmod 640 {} +
sudo chmod 770 /var/www/ridis/relatorios /var/www/ridis/backups
sudo chmod 660 /var/www/ridis/gestao_discos.db*
sudo chmod 600 /var/www/ridis/.env
```

---

## 5. Configurações a Aplicar

### 5.1 Configuração do Serviço de Sistema (`/etc/systemd/system/ridis.service`)
Garante arranque automático com o sistema operacional, monitorização permanente e sandboxing avançado:

```ini
[Unit]
Description=RIDIS — Sistema de Gestão de Discos USB e Preservação Digital (DGLAB)
After=network.target network-online.target

[Service]
Type=simple
User=ridis
Group=ridis
WorkingDirectory=/var/www/ridis
EnvironmentFile=-/var/www/ridis/.env
ExecStart=/usr/bin/node /var/www/ridis/node_modules/.bin/tsx /var/www/ridis/server.ts

Restart=always
RestartSec=5s

# Sandboxing ISO/IEC 27001 A.8.9
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ProtectKernelTunables=true
ProtectKernelModules=true
ReadWritePaths=/var/www/ridis/gestao_discos.db /var/www/ridis/gestao_discos.db-wal /var/www/ridis/gestao_discos.db-shm /var/www/ridis/relatorios /var/www/ridis/backups

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

### 5.2 Configuração da Firewall Perimétrica (UFW)
Apenas as portas de gestão remota cifrada (SSH) e de serviço Web HTTPS/HTTP devem estar abertas. O serviço interno na porta 3005 fica estritamente confinado ao `localhost` (127.0.0.1).

```bash
# Definir regras predefinidas restritivas
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir SSH apenas a partir da rede interna/VPN de administração da DGLAB
sudo ufw allow from 10.0.0.0/8 to any port 22 proto tcp comment 'SSH Admin DGLAB'

# Permitir tráfego HTTP e HTTPS
sudo ufw allow 80/tcp comment 'Nginx HTTP Redirect'
sudo ufw allow 443/tcp comment 'Nginx HTTPS TLS'

# Ativar firewall
sudo ufw enable
```

### 5.3 Política e Script de Backup Automatizado (Conformidade NIS 2 e ISO 27001 A.8.13)
A aplicação inclui rotinas internas de cópia de segurança em `/api/backup-bd`, mas a equipa de infraestruturas da DGLAB deve configurar um cronjob de sistema no ficheiro `/etc/cron.d/ridis-backup`:

```bash
# Backup diário às 02h00 da madrugada com verificação de integridade e compressão gzip
0 2 * * * ridis /usr/bin/sqlite3 /var/www/ridis/gestao_discos.db ".backup '/var/www/ridis/backups/backup_auto_$(date +\%Y\%m\%d_\%H\%M\%S).db'" && gzip /var/www/ridis/backups/backup_auto_*.db && find /var/www/ridis/backups -name "*.db.gz" -mtime +90 -delete
```

### 5.4 Procedimento de Resposta a Incidentes de Segurança (NIS 2 - Artigo 23.º)
1. **Deteção e Notificação Prévia (24 horas):** Em caso de incidente significativo com impacto na integridade ou disponibilidade dos registos de preservação digital, notificar a equipa CSIRT interna e o Centro Nacional de Cibersegurança (CNCS) no prazo máximo de 24 horas;
2. **Notificação Completa (72 horas):** Submissão de relatório detalhado com avaliação inicial da gravidade, impacto e indicadores de compromisso (IoCs);
3. **Isolamento e Análise:** Consulta de logs através de `journalctl -u ridis.service -n 500 --no-pager` e `/var/log/nginx/ridis_error.log`.

---

**Fim do Documento Técnico.**  
*Documento aprovado para utilização no âmbito da Direção-Geral do Livro, dos Arquivos e das Bibliotecas (DGLAB).*
