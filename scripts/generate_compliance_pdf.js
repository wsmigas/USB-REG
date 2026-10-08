/**
 * RIDIS — Gerador de Documento Técnico PDF
 * Convergência ISO/IEC 27001:2022 & Diretiva NIS 2 (UE 2022/2555)
 * Atualizado: Instalação em /opt/app_usb/ | Sem Nginx/Sem Proxy | Clone GitHub
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
        Subject: 'Guia Técnico de Implantação em /opt/app_usb/ via GitHub (Servidor Autónomo Sem Proxy)',
        Keywords: 'ISO 27001, NIS 2, DGLAB, RIDIS, SQLite, Express, systemd, /opt/app_usb/',
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
      doc.fontSize(8).fillColor(ACCENT_COLOR).text('RIDIS — ESPECIFICAÇÃO TÉCNICA (/opt/app_usb/)', 45, 25, { align: 'right' });
      doc.moveTo(45, 36).lineTo(550, 36).strokeColor(BORDER_COLOR).lineWidth(0.8).stroke();
      doc.restore();
    }

    function drawSectionTitle(number, title) {
      doc.moveDown(0.7);
      const y = doc.y;
      doc.rect(45, y, 4, 18).fill(ACCENT_COLOR);
      doc.fontSize(12).font('Helvetica-Bold').fillColor(PRIMARY_COLOR).text(`${number}. ${title}`, 55, y + 2);
      doc.moveDown(0.5);
    }

    function drawSubTitle(title) {
      doc.moveDown(0.4);
      doc.fontSize(10).font('Helvetica-Bold').fillColor(SECONDARY_COLOR).text(title, 45);
      doc.moveDown(0.3);
    }

    function drawParagraph(text) {
      doc.fontSize(8.5).font('Helvetica').fillColor(TEXT_COLOR).text(text, 45, undefined, {
        align: 'justify',
        lineGap: 2.2,
      });
      doc.moveDown(0.3);
    }

    function drawCodeBox(codeSnippet) {
      const startY = doc.y;
      const width = 505;
      doc.fontSize(7.5).font('Courier');
      const textHeight = doc.heightOfString(codeSnippet, { width: width - 16 });

      if (startY + textHeight + 16 > 765) {
        doc.addPage();
        drawHeader();
      }

      const boxY = doc.y;
      doc.roundedRect(45, boxY, width, textHeight + 12, 4).fillAndStroke(CODE_BG, BORDER_COLOR);
      doc.fillColor('#0f172a').text(codeSnippet, 53, boxY + 6, {
        width: width - 16,
        lineGap: 1.5,
      });
      doc.y = boxY + textHeight + 16;
    }

    // =========================================================================
    // PÁGINA 1: CAPA & PREMISSAS ARQUITETURAIS (/opt/app_usb/ - SEM PROXY)
    // =========================================================================
    drawHeader();
    doc.y = 52;

    doc.roundedRect(45, doc.y, 505, 26, 4).fillAndStroke('#eff6ff', '#bfdbfe');
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1e40af')
      .text('DOCUMENTO RESTRITO — MÓDULO ADMINISTRAÇÃO BD (USO INTERNO DGLAB)', 45, doc.y - 18, { align: 'center' });

    doc.moveDown(1.4);
    doc.fontSize(18).font('Helvetica-Bold').fillColor(PRIMARY_COLOR)
      .text('ESPECIFICAÇÃO TÉCNICA DE IMPLANTAÇÃO', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(ACCENT_COLOR)
      .text('Convergência ISO/IEC 27001:2022 & Diretiva NIS 2 (UE 2022/2555)', { align: 'center' });

    doc.moveDown(0.4);
    doc.fontSize(9.5).font('Helvetica-Oblique').fillColor(MUTED_COLOR)
      .text('Servidor Autónomo HTTP na Intranet DGLAB · Diretório /opt/app_usb/ · Instalação via GitHub', { align: 'center' });

    doc.moveDown(0.6);
    // Caixa de Metadados
    const metaY = doc.y;
    doc.roundedRect(45, metaY, 505, 68, 4).fillAndStroke('#f8fafc', BORDER_COLOR);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(PRIMARY_COLOR);
    doc.text('Diretório de Instalação:', 55, metaY + 8);
    doc.text('Arquitetura de Rede:', 55, metaY + 22);
    doc.text('Origem do Código:', 55, metaY + 36);
    doc.text('Autor / Responsável:', 55, metaY + 50);

    doc.font('Helvetica').fillColor(TEXT_COLOR);
    doc.text('/opt/app_usb/ (Diretório homologado no servidor)', 185, metaY + 8);
    doc.text('Servidor Autónomo Node.js/Express na porta 3005 (Sem Proxy / Sem Nginx)', 185, metaY + 22);
    doc.text('Repositório GitHub (Clone direto após instalação de módulos pré-requisito)', 185, metaY + 36);
    doc.text('José Miguel Magalhães · DGLAB / Serviços Centrais (Versão 2.0.0 - Outubro 2026)', 185, metaY + 50);

    doc.y = metaY + 78;

    drawSectionTitle('0', 'Premissas de Implantação e Convergência Normativa');
    drawParagraph(
      'A aplicação RIDIS destina-se a operação estrita dentro da infraestrutura interna da DGLAB (LAN/intranet). Por decisão arquitetural de simplificação e segurança por conceção (Security by Design), a aplicação opera como um servidor autónomo auto-suficiente: não requer proxy reverso nem Nginx, pois o próprio runtime Express/Node.js serve diretamente a interface web e a API, com limites de upload ajustados a 50MB e suporte de persistência SQLite WAL local.'
    );

    // Tabela resumida de conformidade
    const tableY = doc.y + 4;
    doc.rect(45, tableY, 505, 17).fill(PRIMARY_COLOR);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('Requisito Técnico', 52, tableY + 5);
    doc.text('Convergência ISO 27001 / NIS 2', 170, tableY + 5);
    doc.text('Implementação Técnica no RIDIS', 330, tableY + 5);

    const rows = [
      ['Diretório Homologado', 'ISO A.8.9 (Configuração do SO)', 'Instalação estruturada em /opt/app_usb/ sob utilizador ridis:ridis.'],
      ['Sem Proxy / Sem Nginx', 'ISO A.8.20 (Redução de Superfície)', 'Servidor HTTP nativo na porta 3005 direto para a LAN interna da DGLAB.'],
      ['Clone via GitHub', 'NIS 2 Art. 21(2)(d) (Cadeia de Fornecimento)', 'Clonagem controlada com dependências fixas em package.json e npm install.'],
      ['Base de Dados Local', 'ISO A.8.24 / NIS 2 Art. 21(2)(c)', 'SQLite 3 WAL em /opt/app_usb/gestao_discos.db (sem portas expostas).'],
      ['Isolamento de Processo', 'ISO A.8.2 / A.8.9 (Menor Privilégio)', 'Unidade systemd com sandboxing rigoroso e execução sem privilégios root.'],
    ];

    let currentY = tableY + 17;
    rows.forEach((r, idx) => {
      const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(45, currentY, 505, 18).fillAndStroke(bg, BORDER_COLOR);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(PRIMARY_COLOR).text(r[0], 52, currentY + 4);
      doc.font('Helvetica-Oblique').fillColor(SECONDARY_COLOR).text(r[1], 170, currentY + 4);
      doc.font('Helvetica').fillColor(TEXT_COLOR).text(r[2], 330, currentY + 4, { width: 215 });
      currentY += 18;
    });

    doc.y = currentY + 8;
    drawParagraph(
      'Este documento está restrito ao módulo de Administração de BD da aplicação, contendo os comandos e configurações exatas para o administrador de sistemas da DGLAB.'
    );

    // =========================================================================
    // PÁGINA 2: MÓDULOS NECESSÁRIOS INSTALAR ANTES DO CLONE GITHUB
    // =========================================================================
    doc.addPage();
    drawHeader();
    doc.y = 48;

    drawSectionTitle('1', 'Módulos Necessários Instalar Antes de Fazer o Clone');
    drawParagraph(
      'A instalação da aplicação é efetuada por clonagem do repositório a partir do GitHub. Por conseguinte, antes de executar o comando git clone, é necessário preparar o sistema operativo Linux instalando os seguintes pacotes e módulos pré-requisito:'
    );

    drawSubTitle('1.1 Sistema Operativo Recomendado');
    drawParagraph(
      '• Distribuição Homologada: Ubuntu Server 24.04 LTS ou Debian 12 (Bookworm) / RHEL 9.\n' +
      '• Recursos Mínimos: 2 vCPUs, 4 GB de memória RAM e 50 GB de armazenamento.\n' +
      '• Criar o utilizador de serviço dedicado "ridis" (sem shell interativo): sudo useradd -r -s /usr/sbin/nologin -d /opt/app_usb ridis'
    );

    drawSubTitle('1.2 Comandos de Instalação de Módulos do Sistema (APT)');
    drawParagraph(
      'Instalar a ferramenta Git (para clonagem), utilitários de compilação, motor SQLite e ferramentas de segurança:'
    );
    drawCodeBox(
      '# 1. Atualizar repositórios do sistema\n' +
      'sudo apt update && sudo apt upgrade -y\n\n' +
      '# 2. Instalar módulos essenciais do SO (pré-requisitos antes do clone)\n' +
      'sudo apt install -y git curl wget ca-certificates gnupg build-essential \\\n' +
      '  sqlite3 libsqlite3-dev ufw fail2ban logrotate rsyslog gzip openssl'
    );

    drawSubTitle('1.3 Instalação do Runtime Node.js 22 LTS (Nativo com node:sqlite)');
    drawParagraph(
      'A aplicação utiliza o motor integrado de base de dados node:sqlite, o que requer obrigatoriamente a versão Node.js v22 LTS:'
    );
    drawCodeBox(
      '# Configurar repositório NodeSource para Node.js v22.x LTS e instalar\n' +
      'curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -\n' +
      'sudo apt install -y nodejs\n\n' +
      '# Validar ferramentas instaladas antes do clone\n' +
      'git --version   # Confirma presença do Git\n' +
      'node -v         # Deve reportar v22.x.x\n' +
      'npm -v          # Deve reportar v10.x.x ou superior'
    );

    drawSubTitle('1.4 Procedimento de Clonagem para /opt/app_usb/ e Instalação npm');
    drawParagraph(
      'Após a instalação dos módulos acima, o clone é executado diretamente para a diretoria /opt/app_usb/:'
    );
    drawCodeBox(
      '# 1. Clonar o repositório GitHub para a pasta homologada /opt/app_usb/\n' +
      'sudo git clone https://github.com/dglab/ridis.git /opt/app_usb\n\n' +
      '# 2. Entrar na pasta e instalar as dependências declaradas em package.json\n' +
      'cd /opt/app_usb\n' +
      'sudo npm install\n\n' +
      '# 3. Criar pastas operacionais e configurar variáveis de ambiente\n' +
      'sudo mkdir -p /opt/app_usb/relatorios /opt/app_usb/backups\n' +
      'sudo cp /opt/app_usb/deploy/env_producao.example /opt/app_usb/.env\n' +
      'sudo chown -R ridis:ridis /opt/app_usb'
    );

    // =========================================================================
    // PÁGINA 3: BASE DE DADOS A INSTALAR E SCRIPT DDL
    // =========================================================================
    doc.addPage();
    drawHeader();
    doc.y = 48;

    drawSectionTitle('2', 'Base de Dados a Instalar e Script de Criação');
    drawParagraph(
      'A base de dados adotada é o SQLite 3 local, residindo exclusivamente em /opt/app_usb/gestao_discos.db. A utilização de SQLite WAL elimina portas de rede abertas no servidor, prevenindo injeções e ataques perimétricos no âmbito da ISO/IEC 27001 A.8.20.'
    );

    drawSubTitle('2.1 Diretrizes da Base de Dados');
    drawParagraph(
      '• Localização: /opt/app_usb/gestao_discos.db (permissões chmod 660 para ridis:ridis).\n' +
      '• Modo Transacional: PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;\n' +
      '• Backups e Integridade: Cópias periódicas com validação PRAGMA integrity_check.'
    );

    drawSubTitle('2.2 Script SQL de Criação (/opt/app_usb/deploy/schema_criacao_bd.sql)');
    drawCodeBox(
      '-- Ativação de Modos de Segurança, Integridade e Concorrência\n' +
      'PRAGMA journal_mode = WAL;\n' +
      'PRAGMA synchronous = NORMAL;\n' +
      'PRAGMA foreign_keys = ON;\n' +
      'PRAGMA temp_store = MEMORY;\n\n' +
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
      '-- Tabela de Utilizadores e Controlo de Acesso (RBAC)\n' +
      'CREATE TABLE IF NOT EXISTS usuarios (\n' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
      '  username TEXT UNIQUE NOT NULL,\n' +
      '  password_hash TEXT NOT NULL,            -- SHA-256 com salt ou scrypt\n' +
      '  is_admin INTEGER DEFAULT 0,\n' +
      '  role TEXT DEFAULT \'operador\',\n' +
      '  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n' +
      ');\n\n' +
      '-- Tabela de Ficheiros e Matrizes Digitais por Disco\n' +
      'CREATE TABLE IF NOT EXISTS relatorio_ficheiros (\n' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
      '  disco_id INTEGER NOT NULL,\n' +
      '  nome_ficheiro TEXT NOT NULL,\n' +
      '  tamanho_bytes INTEGER DEFAULT 0,\n' +
      '  pasta TEXT DEFAULT \'\',\n' +
      '  FOREIGN KEY (disco_id) REFERENCES discos_usb(id) ON DELETE CASCADE\n' +
      ');\n\n' +
      '-- Índices Otimizados para Alto Rendimento\n' +
      'CREATE INDEX IF NOT EXISTS idx_discos_id_disco ON discos_usb(id_disco);\n' +
      'CREATE INDEX IF NOT EXISTS idx_discos_arquivo ON discos_usb(arquivo);\n' +
      'CREATE INDEX IF NOT EXISTS idx_ficheiros_disco_id ON relatorio_ficheiros(disco_id);\n' +
      'CREATE INDEX IF NOT EXISTS idx_ficheiros_nome ON relatorio_ficheiros(nome_ficheiro);\n\n' +
      '-- Administrador Inicial (Obrigatório alterar no primeiro login)\n' +
      'INSERT OR IGNORE INTO usuarios (username, password_hash, is_admin, role)\n' +
      'VALUES (\'admin\', \'90b1e42cba273a0a38bdfdf3eef250785ff21db2636a0d4db0db08c7c9ec9ff3\', 1, \'admin\');\n' +
      'PRAGMA integrity_check;'
    );

    drawSubTitle('2.3 Criação da Base de Dados');
    drawCodeBox(
      'sqlite3 /opt/app_usb/gestao_discos.db < /opt/app_usb/deploy/schema_criacao_bd.sql\n' +
      'sudo chown ridis:ridis /opt/app_usb/gestao_discos.db* && sudo chmod 660 /opt/app_usb/gestao_discos.db*'
    );

    // =========================================================================
    // PÁGINA 4: ARQUITETURA AUTÓNOMA (SEM PROXY / SEM NGINX)
    // =========================================================================
    doc.addPage();
    drawHeader();
    doc.y = 48;

    drawSectionTitle('3', 'Servidor Web: Arquitetura Autónoma (Sem Nginx / Sem Proxy)');
    drawParagraph(
      'A aplicação RIDIS é integralmente auto-suficiente e não necessita de qualquer servidor web externo como Nginx ou Apache, nem de qualquer proxy reverso, por operar em ambiente interno (intranet DGLAB):'
    );

    drawSubTitle('3.1 Por Que Não É Necessário Nginx?');
    drawParagraph(
      '1. Servidor HTTP Embutido: O backend desenvolvido em Express escuta diretamente na porta configurada (padrão 3005 com suporte simultâneo à porta 3000) e atende diretamente os pedidos dos postos de trabalho da DGLAB.\n' +
      '2. Ficheiros Estáticos Embutidos: O servidor Express monta e serve nativamente a interface SPA React (HTML, CSS Tailwind, scripts JavaScript e ícones) sem necessidade de web server intermediário.\n' +
      '3. Gestão de Uploads Volumosos: O middleware multer lida diretamente com os relatórios .txt e .csv (Snap2HTML) com limite configurado de 50MB no ficheiro server.ts.\n' +
      '4. Menor Complexidade Operacional: Menos um serviço para manter, atualizar, auditar e configurar no sistema operativo, eliminando pontos de falha e facilitando backups e atualizações via git pull.'
    );

    drawSubTitle('3.2 Diagrama de Conexão na Intranet');
    drawCodeBox(
      'Postos de Trabalho DGLAB (Navegador Web)\n' +
      '          │\n' +
      '          │  HTTP Direto (Ex: http://10.x.x.x:3005)\n' +
      '          ▼\n' +
      '┌───────────────────────────────────────────────────────────────┐\n' +
      '│ Servidor Linux (/opt/app_usb/)                                │\n' +
      '│                                                               │\n' +
      '│   Node.js / Express (Porta 3005)                              │\n' +
      '│   ├── Interface Web React (SPA)                               │\n' +
      '│   ├── API REST e Autenticação (RBAC)                          │\n' +
      '│   └── persistência em /opt/app_usb/gestao_discos.db (WAL)     │\n' +
      '└───────────────────────────────────────────────────────────────┘'
    );

    drawSubTitle('3.3 Configuração de Portas no .env (/opt/app_usb/.env)');
    drawCodeBox(
      '# Porta primária da aplicação interna\n' +
      'APP_PORT=3005\n\n' +
      '# Caminhos no sistema de ficheiros\n' +
      'DB_PATH=/opt/app_usb/gestao_discos.db\n' +
      'RELATORIOS_DIR=/opt/app_usb/relatorios\n' +
      'BACKUPS_DIR=/opt/app_usb/backups'
    );

    // =========================================================================
    // PÁGINA 5: CONJUNTO DE FICHEIROS EM /opt/app_usb/ E PERMISSÕES
    // =========================================================================
    doc.addPage();
    drawHeader();
    doc.y = 48;

    drawSectionTitle('4', 'Conjunto de Ficheiros em /opt/app_usb/ e Permissões POSIX');
    drawParagraph(
      'Estrutura hierárquica completa instalada sob /opt/app_usb/ em cumprimento do Princípio do Menor Privilégio (ISO/IEC 27001 A.8.2 e A.8.9):'
    );

    const fileList = [
      ['/opt/app_usb/server.ts', 'Servidor backend Express, API REST e SQLite nativo', '640 (ridis:ridis)'],
      ['/opt/app_usb/gestao_discos.db*', 'Base de dados SQLite (ficheiros .db, .db-wal e .db-shm)', '660 (ridis:ridis)'],
      ['/opt/app_usb/.env', 'Variáveis de ambiente locais (portas, caminhos)', '600 (ridis:ridis)'],
      ['/opt/app_usb/package.json', 'Manifesto de dependências do Node.js', '640 (ridis:ridis)'],
      ['/opt/app_usb/relatorios/', 'Pasta de armazenamento de relatórios importados', '770 (ridis:ridis)'],
      ['/opt/app_usb/backups/', 'Pasta de cópias de segurança comprimidas (.db.gz)', '750 (ridis:ridis)'],
      ['/opt/app_usb/deploy/', 'Scripts de inicialização de BD, systemd e documentação', '750 (ridis:ridis)'],
      ['/opt/app_usb/src/', 'Código-fonte da interface de utilizador React TypeScript', '750 (ridis:ridis)'],
      ['/opt/app_usb/LICENSE / LICENCA.md', 'Termos legais de Direitos de Autor exclusivos DGLAB', '644 (ridis:ridis)'],
    ];

    let fY = doc.y + 4;
    doc.rect(45, fY, 505, 16).fill(PRIMARY_COLOR);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('Ficheiro / Diretório', 52, fY + 4);
    doc.text('Função Operacional', 235, fY + 4);
    doc.text('Permissão POSIX', 440, fY + 4);

    let curFY = fY + 16;
    fileList.forEach(([fpath, desc, perm], idx) => {
      const bg = idx % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(45, curFY, 505, 20).fillAndStroke(bg, BORDER_COLOR);
      doc.fontSize(7.5).font('Courier-Bold').fillColor(ACCENT_COLOR).text(fpath, 52, curFY + 5, { width: 175 });
      doc.font('Helvetica').fillColor(TEXT_COLOR).text(desc, 235, curFY + 5, { width: 195 });
      doc.font('Courier-Bold').fillColor(SUCCESS_COLOR).text(perm, 440, curFY + 5);
      curFY += 20;
    });

    doc.y = curFY + 12;
    drawSubTitle('4.1 Aplicação de Permissões no Servidor');
    drawCodeBox(
      'sudo chown -R ridis:ridis /opt/app_usb\n' +
      'sudo find /opt/app_usb -type d -exec chmod 750 {} +\n' +
      'sudo find /opt/app_usb -type f -exec chmod 640 {} +\n' +
      'sudo chmod 770 /opt/app_usb/relatorios /opt/app_usb/backups\n' +
      'sudo chmod 660 /opt/app_usb/gestao_discos.db*\n' +
      'sudo chmod 600 /opt/app_usb/.env'
    );

    // =========================================================================
    // PÁGINA 6: CONFIGURAÇÕES SYSTEMD, FIREWALL E POLÍTICAS DE BACKUP
    // =========================================================================
    doc.addPage();
    drawHeader();
    doc.y = 48;

    drawSectionTitle('5', 'Configurações a Aplicar: Systemd, Firewall e Backups');
    drawParagraph(
      'Para garantir a persistência, o arranque automático e a conformidade com as exigências de resiliência e continuidade de negócio da Diretiva NIS 2:'
    );

    drawSubTitle('5.1 Unidade de Serviço Systemd (/etc/systemd/system/ridis.service)');
    drawCodeBox(
      '[Unit]\n' +
      'Description=RIDIS — Gestao de Discos USB e Preservacao Digital (DGLAB)\n' +
      'After=network.target network-online.target\n\n' +
      '[Service]\n' +
      'Type=simple\n' +
      'User=ridis\n' +
      'Group=ridis\n' +
      'WorkingDirectory=/opt/app_usb\n' +
      'Environment=NODE_ENV=production\n' +
      'Environment=APP_PORT=3005\n' +
      'EnvironmentFile=-/opt/app_usb/.env\n' +
      'ExecStart=/usr/bin/node /opt/app_usb/node_modules/.bin/tsx /opt/app_usb/server.ts\n\n' +
      '# Resiliência e Continuidade (NIS 2)\n' +
      'Restart=always\n' +
      'RestartSec=5s\n\n' +
      '# Sandboxing de Segurança (ISO 27001 A.8.9)\n' +
      'NoNewPrivileges=true\n' +
      'ProtectSystem=strict\n' +
      'ProtectHome=true\n' +
      'PrivateTmp=true\n' +
      'ProtectKernelTunables=true\n' +
      'ProtectKernelModules=true\n' +
      'ReadWritePaths=/opt/app_usb/gestao_discos.db /opt/app_usb/gestao_discos.db-wal /opt/app_usb/gestao_discos.db-shm /opt/app_usb/relatorios /opt/app_usb/backups\n\n' +
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

    drawSubTitle('5.3 Firewall UFW (Ambiente Interno)');
    drawCodeBox(
      'sudo ufw default deny incoming && sudo ufw default allow outgoing\n' +
      'sudo ufw allow from 10.0.0.0/8 to any port 22 proto tcp comment \'SSH Admin DGLAB\'\n' +
      'sudo ufw allow from 10.0.0.0/8 to any port 3005 proto tcp comment \'RIDIS HTTP Intranet\'\n' +
      'sudo ufw enable'
    );

    drawSubTitle('5.4 Rotina de Backups Automáticos (NIS 2 / ISO 27001 A.8.13)');
    drawParagraph(
      'Cronjob diário em /etc/cron.d/ridis-backup com compressão e verificação atómica:'
    );
    drawCodeBox(
      '0 2 * * * ridis /usr/bin/sqlite3 /opt/app_usb/gestao_discos.db ".backup \'/opt/app_usb/backups/backup_auto_$(date +\\%Y\\%m\\%d_\\%H\\%M\\%S).db\'" && gzip /opt/app_usb/backups/backup_auto_*.db && find /opt/app_usb/backups -name "*.db.gz" -mtime +90 -delete'
    );

    // Encerramento
    doc.moveDown(0.5);
    const signY = doc.y;
    doc.roundedRect(45, signY, 505, 45, 4).fillAndStroke('#f8fafc', BORDER_COLOR);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(PRIMARY_COLOR)
      .text('CONFORMIDADE TÉCNICA E USO RESTRITO — ADMINISTRAÇÃO BD (DGLAB)', 55, signY + 7);
    doc.fontSize(7.5).font('Helvetica').fillColor(TEXT_COLOR)
      .text('Documento homologado para implantação em /opt/app_usb/ sem proxy reverso. Os artefactos e scripts encontram-se disponíveis no módulo Administração BD da aplicação.', 55, signY + 18, { width: 485 });
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(ACCENT_COLOR)
      .text('Autor: José Miguel Magalhães · DGLAB / Serviços Centrais (2026)', 55, signY + 31);

    // Numeração de Páginas
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.save();
      doc.moveTo(45, 800).lineTo(550, 800).strokeColor(BORDER_COLOR).lineWidth(0.5).stroke();
      doc.fontSize(7.5).font('Helvetica').fillColor(MUTED_COLOR)
        .text('RIDIS · DGLAB · Especificação Técnica (/opt/app_usb/) · ISO 27001 & NIS 2', 45, 806);
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(PRIMARY_COLOR)
        .text(`Página ${i + 1} de ${range.count}`, 45, 806, { align: 'right' });
      doc.restore();
    }

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

// Execução direta CLI
if (process.argv[1]?.endsWith('generate_compliance_pdf.js') || process.argv[1]?.endsWith('generate_compliance_pdf.ts')) {
  const destPublic = path.join(process.cwd(), 'public', 'RIDIS_Especificacao_Tecnica_ISO27001_NIS2.pdf');
  const destRoot = path.join(process.cwd(), 'RIDIS_Especificacao_Tecnica_ISO27001_NIS2.pdf');

  if (!fs.existsSync(path.dirname(destPublic))) {
    fs.mkdirSync(path.dirname(destPublic), { recursive: true });
  }

  generateCompliancePDF(destPublic)
    .then(() => {
      fs.copyFileSync(destPublic, destRoot);
      console.log('PDF atualizado com sucesso em:');
      console.log(' - ' + destPublic);
      console.log(' - ' + destRoot);
    })
    .catch((err) => {
      console.error('Erro ao gerar PDF:', err);
      process.exit(1);
    });
}
