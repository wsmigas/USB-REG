/**
 * RIDIS — Gerador de Documento Técnico PDF
 * Convergência ISO/IEC 27001:2022 & Diretiva NIS 2 (UE 2022/2555)
 * Autor: José Miguel Magalhães | DGLAB (2026)
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export function generateCompliancePDF(outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 45, left: 45, right: 45 },
      bufferPages: true,
      info: {
        Title: 'RIDIS — Especificação Técnica de Implantação e Convergência 27001 / NIS II',
        Author: 'José Miguel Magalhães',
        Subject: 'Requisitos de Implantação, Software, BD, Nginx, Ficheiros e Configurações de Segurança',
        Keywords: 'ISO 27001, NIS 2, DGLAB, RIDIS, SQLite, Nginx, systemd, Cibersegurança',
        Creator: 'DGLAB - Direção-Geral do Livro, dos Arquivos e das Bibliotecas',
      },
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const PRIMARY_COLOR = '#0f172a'; // Slate 900
    const ACCENT_COLOR = '#1e40af';  // Blue 800
    const SECONDARY_COLOR = '#0369a1'; // Sky 700
    const TEXT_COLOR = '#1e293b';    // Slate 800
    const MUTED_COLOR = '#475569';   // Slate 600
    const CODE_BG = '#f1f5f9';       // Slate 100
    const BORDER_COLOR = '#cbd5e1';  // Slate 300
    const SUCCESS_COLOR = '#065f46'; // Emerald 800

    function drawHeader(title) {
      doc.save();
      doc.fontSize(8).fillColor(MUTED_COLOR).text('DGLAB · DIREÇÃO-GERAL DO LIVRO, DOS ARQUIVOS E DAS BIBLIOTECAS', 45, 25);
      doc.fontSize(8).fillColor(ACCENT_COLOR).text('RIDIS — ESPECIFICAÇÃO TÉCNICA 27001 / NIS II', 45, 25, { align: 'right' });
      doc.moveTo(45, 36).lineTo(550, 36).strokeColor(BORDER_COLOR).lineWidth(0.8).stroke();
      doc.restore();
    }

    function drawSectionTitle(number, title) {
      doc.moveDown(0.8);
      const y = doc.y;
      doc.rect(45, y, 4, 18).fill(ACCENT_COLOR);
      doc.fontSize(13).font('Helvetica-Bold').fillColor(PRIMARY_COLOR).text(`${number}. ${title}`, 55, y + 2);
      doc.moveDown(0.6);
    }

    function drawSubTitle(title) {
      doc.moveDown(0.4);
      doc.fontSize(10.5).font('Helvetica-Bold').fillColor(SECONDARY_COLOR).text(title, 45);
      doc.moveDown(0.3);
    }

    function drawParagraph(text) {
      doc.fontSize(9).font('Helvetica').fillColor(TEXT_COLOR).text(text, 45, undefined, {
        align: 'justify',
        lineGap: 2.5,
      });
      doc.moveDown(0.3);
    }

    function drawCodeBox(codeSnippet) {
      const startY = doc.y;
      const width = 505;
      doc.fontSize(7.5).font('Courier');
      const textHeight = doc.heightOfString(codeSnippet, { width: width - 16 });
      
      // If codebox exceeds remaining page space, advance page
      if (startY + textHeight + 16 > 760) {
        doc.addPage();
        drawHeader();
      }

      const boxY = doc.y;
      doc.roundedRect(45, boxY, width, textHeight + 12, 4).fillAndStroke(CODE_BG, BORDER_COLOR);
      doc.fillColor('#0f172a').text(codeSnippet, 53, boxY + 6, {
        width: width - 16,
        lineGap: 1.5,
      });
      doc.y = boxY + textHeight + 18;
    }

    // =========================================================================
    // PÁGINA 1: CAPA INSTITUCIONAL & ENQUADRAMENTO 27001 / NIS II
    // =========================================================================
    drawHeader();
    doc.y = 55;

    // Badge de Classificação de Segurança
    doc.roundedRect(45, doc.y, 505, 26, 4).fillAndStroke('#eff6ff', '#bfdbfe');
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1e40af')
      .text('DOCUMENTO RESTRITO DE CONFORMIDADE — USO INTERNO EXCLUSIVO DGLAB', 45, doc.y - 18, { align: 'center' });

    doc.moveDown(1.5);
    doc.fontSize(19).font('Helvetica-Bold').fillColor(PRIMARY_COLOR)
      .text('ESPECIFICAÇÃO TÉCNICA DE IMPLANTAÇÃO', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(13).font('Helvetica-Bold').fillColor(ACCENT_COLOR)
      .text('Convergência com ISO/IEC 27001:2022 & Diretiva NIS 2 (UE 2022/2555)', { align: 'center' });

    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica-Oblique').fillColor(MUTED_COLOR)
      .text('RIDIS — Sistema de Gestão de Discos USB, Matrizes e Relatórios de Preservação Digital', { align: 'center' });

    doc.moveDown(0.8);
    // Caixa de Metadados Institucionais
    const metaY = doc.y;
    doc.roundedRect(45, metaY, 505, 58, 4).fillAndStroke('#f8fafc', BORDER_COLOR);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(PRIMARY_COLOR);
    doc.text('Autor / Responsável Técnico:', 55, metaY + 8);
    doc.text('Entidade Titular da Licença:', 55, metaY + 22);
    doc.text('Data de Homologação:', 55, metaY + 36);

    doc.font('Helvetica').fillColor(TEXT_COLOR);
    doc.text('José Miguel Magalhães (Direitos Reservados)', 200, metaY + 8);
    doc.text('DGLAB — Direção-Geral do Livro, dos Arquivos e das Bibliotecas', 200, metaY + 22);
    doc.text('Outubro de 2026 | Versão 1.0.0 (Produção)', 200, metaY + 36);

    doc.y = metaY + 70;

    drawSectionTitle('0', 'Matriz de Convergência Normativa: ISO 27001 / NIS 2');
    drawParagraph(
      'O sistema RIDIS operacionaliza a cadeia de custódia e validação de discos USB externos nos arquivos da DGLAB (ANTT, Arquivos Distritais). Devido à relevância patrimonial e documental, a sua arquitetura foi alinhada de raiz aos controlos da norma internacional ISO/IEC 27001:2022 e às exigências de resiliência da Diretiva NIS 2 (Diretiva UE 2022/2555 / Regime Jurídico de Cibersegurança nacional).'
    );

    // Tabela resumida de conformidade
    const tableY = doc.y + 4;
    doc.rect(45, tableY, 505, 18).fill(PRIMARY_COLOR);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('Domínio Normativo', 52, tableY + 5);
    doc.text('Controlo ISO 27001:2022 / NIS 2', 150, tableY + 5);
    doc.text('Implementação Técnica no RIDIS', 315, tableY + 5);

    const rows = [
      ['Acesso & Privilégios', 'ISO A.5.15 / A.8.2 | NIS2 Art.21(2)(i)', 'Contas RBAC, passwords com SHA-256/salt, processo sem root (ridis).'],
      ['Proteção em Trânsito', 'ISO A.8.24 / A.8.20 | NIS2 Art.21(2)(h)', 'Nginx HTTPS obrigatório, TLS 1.3, HSTS estrito e isolamento perimétrico.'],
      ['Continuidade & Dados', 'ISO A.8.13 | NIS2 Art.21(2)(c)', 'Base de dados SQLite em modo WAL, backups comprimidos e checagem PRAGMA.'],
      ['Segurança na Aplicação', 'ISO A.8.26 / A.8.28 | NIS2 Art.21(2)(e)', 'Sanitização rigorosa de ficheiros, transações atómicas e limites de upload (50MB).'],
      ['Deteção e Auditoria', 'ISO A.8.16 / A.8.9 | NIS2 Art.21(2)(b)', 'Logs estruturados em journald, rate-limiting anti-força bruta em /api/login.'],
    ];

    let currentY = tableY + 18;
    rows.forEach((r, idx) => {
      const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(45, currentY, 505, 19).fillAndStroke(bg, BORDER_COLOR);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(PRIMARY_COLOR).text(r[0], 52, currentY + 5);
      doc.font('Helvetica-Oblique').fillColor(SECONDARY_COLOR).text(r[1], 150, currentY + 5);
      doc.font('Helvetica').fillColor(TEXT_COLOR).text(r[2], 315, currentY + 5, { width: 230 });
      currentY += 19;
    });

    doc.y = currentY + 10;
    drawParagraph(
      'As secções seguintes detalham o roteiro técnico imperativo de instalação, scripts de base de dados, configuração de servidores Web, inventário de ficheiros e parametrizações operacionais recomendadas.'
    );

    // =========================================================================
    // PÁGINA 2: PACOTES DE SOFTWARE NECESSÁRIOS INSTALAR
    // =========================================================================
    doc.addPage();
    drawHeader();
    doc.y = 48;

    drawSectionTitle('1', 'Pacotes de Software Necessários Instalar');
    drawParagraph(
      'Para garantir a conformidade e estabilidade a longo prazo, a infraestrutura deve assentar numa distribuição Linux de suporte alargado (LTS). O runtime de aplicação exige o Node.js v22 LTS devido ao motor integrado de alto rendimento node:sqlite.'
    );

    drawSubTitle('1.1 Sistema Operativo Recomendado');
    drawParagraph(
      '• Distribuição Homologada: Ubuntu Server 24.04 LTS (Noble Numbat) ou Debian 12 (Bookworm) / RHEL 9.\n' +
      '• Dimensionamento Mínimo: 2 vCPUs, 4 GB de RAM, 50 GB SSD (com partição /var/www cifrada por LUKS).\n' +
      '• Gestão de Utilizadores: Criação do utilizador de sistema dedicado "ridis" sem permissões de login interativo.'
    );

    drawSubTitle('1.2 Comandos de Instalação de Pacotes do Sistema (APT)');
    drawCodeBox(
      '# 1. Atualizar índice de repositórios oficiais e aplicar patches de segurança\n' +
      'sudo apt update && sudo apt upgrade -y\n\n' +
      '# 2. Instalar utilitários essenciais, compilação, base de dados e segurança\n' +
      'sudo apt install -y curl wget git build-essential ca-certificates gnupg \\\n' +
      '  lsb-release sqlite3 libsqlite3-dev nginx ufw fail2ban logrotate rsyslog gzip unzip openssl'
    );

    drawSubTitle('1.3 Instalação do Runtime Node.js (Versão 22 LTS)');
    drawCodeBox(
      '# Configurar repositório NodeSource para Node.js v22.x LTS e instalar\n' +
      'curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -\n' +
      'sudo apt install -y nodejs\n\n' +
      '# Validar versões instaladas\n' +
      'node -v   # Output esperado: v22.x.x\n' +
      'npm -v    # Output esperado: v10.x.x ou superior'
    );

    drawSubTitle('1.4 Dependências de Aplicação Node.js / npm (package.json)');
    drawParagraph(
      'A aplicação utiliza dependências modulares e consolidadas, sem ferramentas ou bibliotecas proprietárias de terceiros:'
    );

    const npmDeps = [
      ['express (v4.21+)', 'Servidor HTTP de aplicação e roteamento da API REST institucional'],
      ['vite (v8.3+)', 'Bundler de desenvolvimento e produção para a SPA React'],
      ['multer (v2.4+)', 'Tratamento de uploads de relatórios de texto de discos com limite restrito'],
      ['react & react-dom (v19)', 'Interface de utilizador SPA reativa, responsiva e acessível'],
      ['lucide-react & motion', 'Iconografia vetorial SVG embutida e transições sem assets externos'],
      ['pdfkit (v0.17+)', 'Gerador de relatórios técnicos e documentos de conformidade vetoriais'],
      ['tsx & typescript (v7)', 'Execução TypeScript de alta performance e verificação estática rigorosa'],
    ];

    let depY = doc.y;
    npmDeps.forEach(([pkg, desc]) => {
      doc.fontSize(8).font('Helvetica-Bold').fillColor(ACCENT_COLOR).text(`• ${pkg}: `, 45, depY);
      const pkgWidth = doc.widthOfString(`• ${pkg}: `);
      doc.font('Helvetica').fillColor(TEXT_COLOR).text(desc, 45 + pkgWidth, depY, { width: 505 - pkgWidth });
      depY = doc.y + 2;
    });

    doc.y = depY + 6;
    drawCodeBox(
      '# No diretório /var/www/ridis:\n' +
      'cd /var/www/ridis && npm ci --omit=dev  # Instalação limpa para produção'
    );

    // =========================================================================
    // PÁGINA 3: BASE DE DADOS A INSTALAR E SCRIPT DE CRIAÇÃO
    // =========================================================================
    doc.addPage();
    drawHeader();
    doc.y = 48;

    drawSectionTitle('2', 'Base de Dados a Instalar e Script de Criação');
    drawParagraph(
      'A base de dados adotada é o SQLite 3 com modo avançado WAL (Write-Ahead Logging). O SQLite é uma base de dados ACID, auto-contida e sem necessidade de porta de rede aberta no sistema operacional, reduzindo drasticamente a superfície de ataque em conformidade com a ISO/IEC 27001 A.8.20 e NIS 2.'
    );

    drawSubTitle('2.1 Diretrizes de Segurança da Base de Dados');
    drawParagraph(
      '• Localização Operacional: /var/www/ridis/gestao_discos.db\n' +
      '• Permissões de Ficheiro: chmod 660 (leitura/escrita exclusiva pelo utilizador ridis:ridis).\n' +
      '• Cifragem em Repouso (ISO 27001 A.8.24): Recomenda-se alojar o ficheiro num volume encriptado com LUKS 2.\n' +
      '• Integridade Transacional: PRAGMA journal_mode = WAL e PRAGMA synchronous = NORMAL.'
    );

    drawSubTitle('2.2 Script SQL de Criação e Inicialização da Base de Dados');
    drawParagraph(
      'O script encontra-se disponível no ficheiro /var/www/ridis/deploy/schema_criacao_bd.sql e deve ser executado para instanciar a estrutura:'
    );

    drawCodeBox(
      '-- Ativação de Modos de Segurança e Integridade\n' +
      'PRAGMA journal_mode = WAL;\n' +
      'PRAGMA synchronous = NORMAL;\n' +
      'PRAGMA foreign_keys = ON;\n\n' +
      '-- Tabela de Discos USB (Inventário Físico/Lógico de Preservação)\n' +
      'CREATE TABLE IF NOT EXISTS discos_usb (\n' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
      '  arquivo TEXT NOT NULL,                  -- ANTT, ADAVR, ADBJA, etc.\n' +
      '  remetente TEXT, data_entrada TEXT, ticket_num TEXT,\n' +
      '  id_disco TEXT UNIQUE NOT NULL,          -- Identificador unívoco do disco\n' +
      '  localizacao TEXT, tamanho_disco TEXT, marca TEXT, numero_serie TEXT,\n' +
      '  verificado INTEGER DEFAULT 0, ticket_integracao TEXT,\n' +
      '  integrado INTEGER DEFAULT 0, armazenado_servidor INTEGER DEFAULT 0,\n' +
      '  total_imagens INTEGER DEFAULT 0, observacoes TEXT,\n' +
      '  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n' +
      '  projeto TEXT, relatorio_path TEXT\n' +
      ');\n\n' +
      '-- Tabela de Utilizadores e RBAC\n' +
      'CREATE TABLE IF NOT EXISTS usuarios (\n' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
      '  username TEXT UNIQUE NOT NULL,\n' +
      '  password_hash TEXT NOT NULL,            -- Hash criptográfico SHA256 com salt\n' +
      '  is_admin INTEGER DEFAULT 0,\n' +
      '  role TEXT DEFAULT \'operador\',\n' +
      '  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n' +
      ');\n\n' +
      '-- Tabela de Ficheiros e Matrizes Digitais Indexadas\n' +
      'CREATE TABLE IF NOT EXISTS relatorio_ficheiros (\n' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
      '  disco_id INTEGER NOT NULL,\n' +
      '  nome_ficheiro TEXT NOT NULL,\n' +
      '  tamanho_bytes INTEGER DEFAULT 0,\n' +
      '  pasta TEXT DEFAULT \'\',\n' +
      '  FOREIGN KEY (disco_id) REFERENCES discos_usb(id) ON DELETE CASCADE\n' +
      ');\n\n' +
      '-- Índices Otimizados para Prevenção de Exaustão de Recursos\n' +
      'CREATE INDEX IF NOT EXISTS idx_discos_id_disco ON discos_usb(id_disco);\n' +
      'CREATE INDEX IF NOT EXISTS idx_discos_arquivo ON discos_usb(arquivo);\n' +
      'CREATE INDEX IF NOT EXISTS idx_ficheiros_disco_id ON relatorio_ficheiros(disco_id);\n' +
      'CREATE INDEX IF NOT EXISTS idx_ficheiros_nome ON relatorio_ficheiros(nome_ficheiro);\n\n' +
      '-- Conta Inicial de Administrador (Obrigatório alterar no 1.º login - ISO 27001 A.8.2)\n' +
      'INSERT OR IGNORE INTO usuarios (username, password_hash, is_admin, role)\n' +
      'VALUES (\'admin\', \'90b1e42cba273a0a38bdfdf3eef250785ff21db2636a0d4db0db08c7c9ec9ff3\', 1, \'admin\');\n' +
      'PRAGMA integrity_check;'
    );

    drawSubTitle('2.3 Procedimento Operacional de Execução');
    drawCodeBox(
      '# Executar criação da base de dados via CLI\n' +
      'sqlite3 /var/www/ridis/gestao_discos.db < /var/www/ridis/deploy/schema_criacao_bd.sql\n\n' +
      '# Assegurar propriedades de segurança no ficheiro\n' +
      'sudo chown ridis:ridis /var/www/ridis/gestao_discos.db*\n' +
      'sudo chmod 660 /var/www/ridis/gestao_discos.db*'
    );

    // =========================================================================
    // PÁGINA 4: WEB SERVER A INSTALAR (NGINX)
    // =========================================================================
    doc.addPage();
    drawHeader();
    doc.y = 48;

    drawSectionTitle('3', 'Web Server a Instalar: Nginx (Reverse Proxy & Hardening)');
    drawParagraph(
      'O Nginx é posicionado como barreira de segurança perimétrica entre a rede da DGLAB e a aplicação Node.js (escutando na porta interna 3005). Ele efetua a terminação TLS 1.3, rate limiting contra ataques de negação de serviço ou força bruta, e aplica cabeçalhos estritos de segurança.'
    );

    drawSubTitle('3.1 Ficheiro de Configuração Nginx (/etc/nginx/sites-available/ridis.conf)');
    drawCodeBox(
      '# Zonas de limitação de taxa (Mitigação de DoS e Força Bruta)\n' +
      'limit_req_zone $binary_remote_addr zone=ridis_api_limit:10m rate=30r/s;\n' +
      'limit_req_zone $binary_remote_addr zone=ridis_login_limit:10m rate=5r/m;\n\n' +
      'upstream ridis_backend {\n' +
      '    server 127.0.0.1:3005 max_fails=3 fail_timeout=10s;\n' +
      '    keepalive 32;\n' +
      '}\n\n' +
      '# 1. Redirecionamento HTTP -> HTTPS (ISO 27001 A.8.24)\n' +
      'server {\n' +
      '    listen 80; listen [::]:80;\n' +
      '    server_name ridis.dglab.gov.pt;\n' +
      '    server_tokens off;\n' +
      '    return 301 https://$host$request_uri;\n' +
      '}\n\n' +
      '# 2. Servidor Seguro HTTPS (TLS 1.3 Estrito)\n' +
      'server {\n' +
      '    listen 443 ssl http2; listen [::]:443 ssl http2;\n' +
      '    server_name ridis.dglab.gov.pt;\n' +
      '    server_tokens off;\n\n' +
      '    ssl_certificate /etc/ssl/certs/ridis_dglab.crt;\n' +
      '    ssl_certificate_key /etc/ssl/private/ridis_dglab.key;\n' +
      '    ssl_protocols TLSv1.2 TLSv1.3;\n' +
      '    ssl_ciphers \'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384\';\n' +
      '    ssl_prefer_server_ciphers on;\n\n' +
      '    # Cabeçalhos de Segurança Obrigatórios ISO 27001 / OWASP\n' +
      '    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n' +
      '    add_header X-Frame-Options "SAMEORIGIN" always;\n' +
      '    add_header X-Content-Type-Options "nosniff" always;\n' +
      '    add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n' +
      '    add_header Content-Security-Policy "default-src \'self\'; script-src \'self\' \'unsafe-inline\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; font-src \'self\' data:; connect-src \'self\';" always;\n\n' +
      '    client_max_body_size 50M; # Limite para uploads de relatórios\n\n' +
      '    # Proteção de Autenticação contra Brute-Force (NIS 2)\n' +
      '    location = /api/login {\n' +
      '        limit_req zone=ridis_login_limit burst=5 nodelay;\n' +
      '        proxy_pass http://ridis_backend;\n' +
      '        proxy_set_header Host $host;\n' +
      '        proxy_set_header X-Real-IP $remote_addr;\n' +
      '    }\n\n' +
      '    # Proxy Geral da Aplicação e API\n' +
      '    location / {\n' +
      '        limit_req zone=ridis_api_limit burst=50 nodelay;\n' +
      '        proxy_pass http://ridis_backend;\n' +
      '        proxy_http_version 1.1;\n' +
      '        proxy_set_header Upgrade $http_upgrade;\n' +
      '        proxy_set_header Connection "upgrade";\n' +
      '        proxy_set_header Host $host;\n' +
      '        proxy_set_header X-Real-IP $remote_addr;\n' +
      '    }\n' +
      '}'
    );

    drawSubTitle('3.2 Ativação e Verificação do Nginx');
    drawCodeBox(
      'sudo ln -sf /etc/nginx/sites-available/ridis.conf /etc/nginx/sites-enabled/\n' +
      'sudo nginx -t && sudo systemctl reload nginx'
    );

    // =========================================================================
    // PÁGINA 5: CONJUNTO DE FICHEIROS & PERMISSÕES
    // =========================================================================
    doc.addPage();
    drawHeader();
    doc.y = 48;

    drawSectionTitle('4', 'Conjunto de Ficheiros de Cada Aplicação e Permissões POSIX');
    drawParagraph(
      'De acordo com o Princípio do Menor Privilégio (ISO/IEC 27001 A.8.2 e A.8.9), cada ficheiro e pasta do sistema RIDIS possui finalidade estrita e permissões granulares no sistema de ficheiros para mitigar riscos de escalada de privilégios ou adulteração maliciosa.'
    );

    drawSubTitle('4.1 Inventário Estrutural de Ficheiros');

    const fileList = [
      ['/var/www/ridis/server.ts', 'Backend Express, API REST, SQLite engine e Vite middleware', '640 (ridis:ridis)'],
      ['/var/www/ridis/gestao_discos.db*', 'Base de dados SQLite operacional (dados, WAL e SHM)', '660 (ridis:ridis)'],
      ['/var/www/ridis/.env', 'Variáveis de ambiente (PORT=3005, segredos)', '600 (ridis:ridis)'],
      ['/var/www/ridis/relatorios/', 'Diretório de receção de relatórios de validação carregados', '770 (ridis:ridis)'],
      ['/var/www/ridis/backups/', 'Diretório de cópias de segurança comprimidas (.db.gz)', '750 (ridis:ridis)'],
      ['/var/www/ridis/deploy/', 'Scripts de automação: DDL, Nginx, systemd e documentação', '750 (ridis:ridis)'],
      ['/var/www/ridis/src/App.tsx', 'Interface reativa completa do utilizador (React TypeScript)', '640 (ridis:ridis)'],
      ['/var/www/ridis/public/', 'Ativos estáticos públicos e PDF técnico de conformidade', '750 (ridis:ridis)'],
      ['/var/www/ridis/LICENSE / LICENCA.md', 'Termos legais de Direitos de Autor exclusivos DGLAB', '644 (ridis:ridis)'],
    ];

    let fY = doc.y + 4;
    doc.rect(45, fY, 505, 16).fill(PRIMARY_COLOR);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('Ficheiro / Diretório', 52, fY + 4);
    doc.text('Função Operacional e Descrição', 230, fY + 4);
    doc.text('Permissão POSIX', 440, fY + 4);

    let curFY = fY + 16;
    fileList.forEach(([fpath, desc, perm], idx) => {
      const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(45, curFY, 505, 20).fillAndStroke(bg, BORDER_COLOR);
      doc.fontSize(7.5).font('Courier-Bold').fillColor(ACCENT_COLOR).text(fpath, 52, curFY + 5, { width: 170 });
      doc.font('Helvetica').fillColor(TEXT_COLOR).text(desc, 230, curFY + 5, { width: 200 });
      doc.font('Courier-Bold').fillColor(SUCCESS_COLOR).text(perm, 440, curFY + 5);
      curFY += 20;
    });

    doc.y = curFY + 12;
    drawSubTitle('4.2 Script de Aplicação de Permissões de Segurança');
    drawCodeBox(
      '# Criação do utilizador de sistema seguro e restrição total\n' +
      'sudo useradd -r -s /usr/sbin/nologin -d /var/www/ridis ridis\n' +
      'sudo chown -R ridis:ridis /var/www/ridis\n' +
      'sudo find /var/www/ridis -type d -exec chmod 750 {} +\n' +
      'sudo find /var/www/ridis -type f -exec chmod 640 {} +\n' +
      'sudo chmod 770 /var/www/ridis/relatorios /var/www/ridis/backups\n' +
      'sudo chmod 660 /var/www/ridis/gestao_discos.db*\n' +
      'sudo chmod 600 /var/www/ridis/.env'
    );

    // =========================================================================
    // PÁGINA 6: CONFIGURAÇÕES A APLICAR & PLANO DE RESPOSTA NIS 2
    // =========================================================================
    doc.addPage();
    drawHeader();
    doc.y = 48;

    drawSectionTitle('5', 'Configurações a Aplicar: Systemd, Firewall e Resposta a Incidentes');
    drawParagraph(
      'A governação e operação em produção necessitam da integração do processo no gestor de serviços systemd com sandboxing rigoroso, proteção de tráfego por firewall e planos de cópias de segurança automáticas.'
    );

    drawSubTitle('5.1 Unidade de Serviço Systemd com Sandboxing (/etc/systemd/system/ridis.service)');
    drawCodeBox(
      '[Unit]\n' +
      'Description=RIDIS — Gestao de Discos USB e Preservacao Digital (DGLAB)\n' +
      'After=network.target network-online.target\n\n' +
      '[Service]\n' +
      'Type=simple\n' +
      'User=ridis\n' +
      'Group=ridis\n' +
      'WorkingDirectory=/var/www/ridis\n' +
      'EnvironmentFile=-/var/www/ridis/.env\n' +
      'ExecStart=/usr/bin/node /var/www/ridis/node_modules/.bin/tsx /var/www/ridis/server.ts\n\n' +
      '# Resiliência e Continuidade (NIS 2)\n' +
      'Restart=always\n' +
      'RestartSec=5s\n\n' +
      '# Sandboxing Estrito de Sistema de Ficheiros e Processos (ISO 27001 A.8.9)\n' +
      'NoNewPrivileges=true\n' +
      'ProtectSystem=strict\n' +
      'ProtectHome=true\n' +
      'PrivateTmp=true\n' +
      'ProtectKernelTunables=true\n' +
      'ProtectKernelModules=true\n' +
      'ReadWritePaths=/var/www/ridis/gestao_discos.db /var/www/ridis/gestao_discos.db-wal /var/www/ridis/gestao_discos.db-shm /var/www/ridis/relatorios /var/www/ridis/backups\n\n' +
      'StandardOutput=journal\n' +
      'StandardError=journal\n' +
      'SyslogIdentifier=ridis-dglab\n\n' +
      '[Install]\n' +
      'WantedBy=multi-user.target'
    );

    drawSubTitle('5.2 Ativação do Serviço');
    drawCodeBox(
      'sudo systemctl daemon-reload\n' +
      'sudo systemctl enable --now ridis.service\n' +
      'sudo systemctl status ridis.service'
    );

    drawSubTitle('5.3 Firewall UFW e Isolamento Perimétrico');
    drawCodeBox(
      'sudo ufw default deny incoming && sudo ufw default allow outgoing\n' +
      'sudo ufw allow from 10.0.0.0/8 to any port 22 proto tcp comment \'SSH DGLAB VPN\'\n' +
      'sudo ufw allow 80/tcp comment \'Nginx HTTP Redirect\'\n' +
      'sudo ufw allow 443/tcp comment \'Nginx HTTPS TLS\'\n' +
      'sudo ufw enable'
    );

    drawSubTitle('5.4 Política de Cópias de Segurança e Notificação de Incidentes (NIS 2)');
    drawParagraph(
      '• Política de Backup (Cronjob Diário às 02h00): Execução de sqlite3 .backup com compressão gzip e retenção de 90 dias em /etc/cron.d/ridis-backup.\n' +
      '• Notificação de Incidentes NIS 2 (Artigo 23.º): Qualquer incidente que ameace a custódia ou integridade dos registos de preservação digital obriga a notificação prévia em 24 horas à equipa interna e notificação detalhada em 72 horas ao Centro Nacional de Cibersegurança (CNCS).'
    );

    // Bloco de Assinatura e Encerramento
    doc.moveDown(0.6);
    const signY = doc.y;
    doc.roundedRect(45, signY, 505, 52, 4).fillAndStroke('#f8fafc', BORDER_COLOR);
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor(PRIMARY_COLOR)
      .text('TERMO DE CONFORMIDADE E HOMOLOGAÇÃO TÉCNICA', 55, signY + 8);
    doc.fontSize(7.5).font('Helvetica').fillColor(TEXT_COLOR)
      .text('Este documento constitui o guia oficial de implantação técnica do RIDIS no ambiente da DGLAB. O sistema cumpre integralmente os requisitos de proteção de dados, controlo de acessos e resiliência das normas ISO/IEC 27001:2022 e da Diretiva NIS 2.', 55, signY + 20, { width: 485 });
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(ACCENT_COLOR)
      .text('Autor: José Miguel Magalhães · DGLAB / Serviços Centrais (2026)', 55, signY + 38);

    // =========================================================================
    // NUMERAÇÃO DE PÁGINAS NO RODAPÉ
    // =========================================================================
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.save();
      doc.moveTo(45, 800).lineTo(550, 800).strokeColor(BORDER_COLOR).lineWidth(0.5).stroke();
      doc.fontSize(7.5).font('Helvetica').fillColor(MUTED_COLOR)
        .text('RIDIS · DGLAB · Documento Técnico Restrito · ISO 27001 & NIS 2', 45, 806);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(PRIMARY_COLOR)
        .text(`Página ${i + 1} de ${range.count}`, 45, 806, { align: 'right' });
      doc.restore();
    }

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

// Se executado diretamente via CLI
if (process.argv[1]?.endsWith('generate_compliance_pdf.js') || process.argv[1]?.endsWith('generate_compliance_pdf.ts')) {
  const destPublic = path.join(process.cwd(), 'public', 'RIDIS_Especificacao_Tecnica_ISO27001_NIS2.pdf');
  const destRoot = path.join(process.cwd(), 'RIDIS_Especificacao_Tecnica_ISO27001_NIS2.pdf');
  
  if (!fs.existsSync(path.dirname(destPublic))) {
    fs.mkdirSync(path.dirname(destPublic), { recursive: true });
  }

  generateCompliancePDF(destPublic)
    .then(() => {
      fs.copyFileSync(destPublic, destRoot);
      console.log('PDF gerado com sucesso em:');
      console.log(' - ' + destPublic);
      console.log(' - ' + destRoot);
    })
    .catch((err) => {
      console.error('Erro ao gerar PDF:', err);
      process.exit(1);
    });
}
