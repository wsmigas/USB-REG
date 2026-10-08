/**
 * RIDIS — Gerador de Documento Técnico PDF
 * Convergência ISO/IEC 27001:2022 & Diretiva NIS 2 (UE 2022/2555)
 * Versão 3.0: Diretório /opt/app_usb/ | Apenas Porta 3005 | Sem Nginx/Sem Proxy | Sem Instruções de Instalação
 * Foco: Estrutura Completa de Ficheiros, Pasta 'relatorios' e Script DDL da BD
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
        Title: 'RIDIS — Especificação Técnica de Arquitetura e Convergência 27001 / NIS II',
        Author: 'José Miguel Magalhães',
        Subject: 'Estrutura de Ficheiros em /opt/app_usb/, Pasta relatorios e Base de Dados (Porta 3005)',
        Keywords: 'ISO 27001, NIS 2, DGLAB, RIDIS, SQLite, relatorios, /opt/app_usb/, 3005',
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

    function drawHeader() {
      doc.save();
      doc.fontSize(8).fillColor(MUTED_COLOR).text('DGLAB · DIREÇÃO-GERAL DO LIVRO, DOS ARQUIVOS E DAS BIBLIOTECAS', 45, 25);
      doc.fontSize(8).fillColor(ACCENT_COLOR).text('RIDIS — ESPECIFICAÇÃO TÉCNICA (PORTA 3005 · /opt/app_usb/)', 45, 25, { align: 'right' });
      doc.moveTo(45, 36).lineTo(550, 36).strokeColor(BORDER_COLOR).lineWidth(0.8).stroke();
      doc.restore();
    }

    function drawSectionTitle(number, title) {
      doc.moveDown(0.65);
      const y = doc.y;
      doc.rect(45, y, 4, 18).fill(ACCENT_COLOR);
      doc.fontSize(11.5).font('Helvetica-Bold').fillColor(PRIMARY_COLOR).text(`${number}. ${title}`, 55, y + 2);
      doc.moveDown(0.5);
    }

    function drawSubTitle(title) {
      doc.moveDown(0.35);
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor(SECONDARY_COLOR).text(title, 45);
      doc.moveDown(0.25);
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
    // PÁGINA 1: CAPA & PREMISSAS ARQUITETURAIS (PORTA 3005 · /opt/app_usb/)
    // =========================================================================
    drawHeader();
    doc.y = 52;

    doc.roundedRect(45, doc.y, 505, 26, 4).fillAndStroke('#eff6ff', '#bfdbfe');
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1e40af')
      .text('DOCUMENTO RESTRITO — MÓDULO ADMINISTRAÇÃO BD (USO INTERNO DGLAB)', 45, doc.y - 18, { align: 'center' });

    doc.moveDown(1.3);
    doc.fontSize(18).font('Helvetica-Bold').fillColor(PRIMARY_COLOR)
      .text('ESPECIFICAÇÃO TÉCNICA DE ARQUITETURA', { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(12).font('Helvetica-Bold').fillColor(ACCENT_COLOR)
      .text('Convergência com ISO/IEC 27001:2022 & Diretiva NIS 2 (UE 2022/2555)', { align: 'center' });

    doc.moveDown(0.4);
    doc.fontSize(9.5).font('Helvetica-Oblique').fillColor(MUTED_COLOR)
      .text('Servidor Autónomo na Porta 3005 · Diretório /opt/app_usb/ · Pasta relatorios/ Centralizada', { align: 'center' });

    doc.moveDown(0.6);
    // Caixa de Metadados
    const metaY = doc.y;
    doc.roundedRect(45, metaY, 505, 68, 4).fillAndStroke('#f8fafc', BORDER_COLOR);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(PRIMARY_COLOR);
    doc.text('Diretório de Instalação:', 55, metaY + 8);
    doc.text('Porta de Operação:', 55, metaY + 22);
    doc.text('Arquitetura de Rede:', 55, metaY + 36);
    doc.text('Autor / Responsável:', 55, metaY + 50);

    doc.font('Helvetica').fillColor(TEXT_COLOR);
    doc.text('/opt/app_usb/ (Diretório base homologado)', 185, metaY + 8);
    doc.text('Exclusivamente Porta 3005 (Sem suporte à porta 3000)', 185, metaY + 22);
    doc.text('Servidor Autónomo Node.js/Express na Intranet DGLAB (Sem Proxy / Sem Nginx)', 185, metaY + 36);
    doc.text('José Miguel Magalhães · DGLAB / Serviços Centrais (Versão 3.0.0 - Outubro 2026)', 185, metaY + 50);

    doc.y = metaY + 78;

    drawSectionTitle('0', 'Premissas e Âmbito da Especificação');
    drawParagraph(
      'A presente especificação técnica define a arquitetura, modelo de dados, localização física dos ficheiros e parâmetros de segurança da aplicação RIDIS, em convergência estrita com as normas ISO/IEC 27001:2022 e a Diretiva NIS 2 (UE 2022/2555). As instruções de instalação passo a passo do sistema operativo e de ferramentas foram deliberadamente remetidas para um documento externo dedicado, centrando-se este documento na topologia técnica, na base de dados, na estrutura de pastas em /opt/app_usb/ e no papel central da pasta "relatorios/".'
    );

    // Tabela resumida de conformidade
    const tableY = doc.y + 4;
    doc.rect(45, tableY, 505, 17).fill(PRIMARY_COLOR);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('Parâmetro Técnico', 52, tableY + 5);
    doc.text('Convergência ISO 27001 / NIS 2', 170, tableY + 5);
    doc.text('Implementação Técnica no RIDIS', 330, tableY + 5);

    const rows = [
      ['Diretório Homologado', 'ISO A.8.9 (Gestão de Configuração)', 'Instalação unificada e estruturada sob /opt/app_usb/.'],
      ['Porta Única (3005)', 'ISO A.8.20 (Segurança da Rede)', 'Operação exclusiva na porta 3005; eliminação da porta 3000.'],
      ['Servidor Autónomo', 'ISO A.8.20 (Redução de Superfície)', 'Node.js Express atua diretamente na LAN (sem proxy / sem Nginx).'],
      ['Pasta relatorios/', 'ISO A.8.10 / NIS 2 (Integridade)', 'Diretório centralizado para cópia e indexação dos relatórios .html/.csv.'],
      ['Base de Dados Local', 'ISO A.8.24 / NIS 2 Art. 21(2)(c)', 'SQLite 3 WAL em /opt/app_usb/gestao_discos.db (sem portas expostas).'],
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
      'Este documento está restrito ao módulo de Administração de BD da aplicação, contendo os elementos técnicos exatos de operação e custódia documental.'
    );

    // =========================================================================
    // PÁGINA 2: ESPECIFICAÇÃO DE PACOTES & BASE DE DADOS COM SCRIPT DDL
    // =========================================================================
    doc.addPage();
    drawHeader();
    doc.y = 48;

    drawSectionTitle('1', 'Pacotes e Módulos de Software Requeridos');
    drawParagraph(
      'A aplicação assenta numa arquitetura minimalista sem dependências externas de nuvem, requerendo no sistema operativo:'
    );
    drawParagraph(
      '• Sistema Operativo: Ubuntu Server 24.04 LTS ou Debian 12 (Bookworm) / RHEL 9 (x86_64).\n' +
      '• Runtime Node.js: Versão 22 LTS (com gestor npm), obrigatório pelo suporte ao motor nativo node:sqlite.\n' +
      '• Motor de Base de Dados: SQLite 3 e respetivas bibliotecas de sistema (libsqlite3-dev).\n' +
      '• Controlo de Versões & Utilitários: Git, build-essential, curl, ufw, fail2ban, logrotate, gzip.\n' +
      '• Dependências da Aplicação (npm): express (servidor autónomo HTTP), multer (uploads até 50MB), react/react-dom 19, vite, pdfkit, tsx e typescript.'
    );

    drawSectionTitle('2', 'Base de Dados: Especificação e Script DDL de Criação');
    drawParagraph(
      'A base de dados é mantida exclusivamente no ficheiro /opt/app_usb/gestao_discos.db utilizando o motor SQLite 3 em modo WAL (Write-Ahead Logging). O script DDL homologado de criação é o seguinte:'
    );

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
      '-- Tabela de Utilizadores e Controlo de Acesso (RBAC - ISO 27001 A.5.15)\n' +
      'CREATE TABLE IF NOT EXISTS usuarios (\n' +
      '  id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
      '  username TEXT UNIQUE NOT NULL,\n' +
      '  password_hash TEXT NOT NULL,            -- Hash SHA-256 com salt ou scrypt\n' +
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
      '-- Utilizador Administrador Inicial (Alterar obrigatoriamente no 1.º login)\n' +
      'INSERT OR IGNORE INTO usuarios (username, password_hash, is_admin, role)\n' +
      'VALUES (\'admin\', \'90b1e42cba273a0a38bdfdf3eef250785ff21db2636a0d4db0db08c7c9ec9ff3\', 1, \'admin\');\n' +
      'PRAGMA integrity_check;'
    );

    // =========================================================================
    // PÁGINA 3: SERVIDOR AUTÓNOMO (PORTA 3005) & ESTRUTURA DE FICHEIROS
    // =========================================================================
    doc.addPage();
    drawHeader();
    doc.y = 48;

    drawSectionTitle('3', 'Servidor Web: Operação Exclusiva na Porta 3005 (Sem Proxy)');
    drawParagraph(
      'A aplicação RIDIS atua como servidor web autónomo em regime de porta única:\n' +
      '• Porta 3005 Exclusiva: A aplicação foi parametrizada para escutar e responder única e exclusivamente na porta 3005. Foi eliminado todo e qualquer suporte secundário à porta 3000, garantindo clareza e previsibilidade no tráfego da intranet da DGLAB.\n' +
      '• Sem Nginx / Sem Proxy: O servidor Express embutido no Node.js é auto-suficiente: distribui os ficheiros estáticos da SPA React, executa os endpoints REST da API e gere os uploads de ficheiros volumosos (até 50MB) sem necessidade de proxy reverso.'
    );

    drawSectionTitle('4', 'Estrutura Completa de Diretórios e Ficheiros em /opt/app_usb/');
    drawParagraph(
      'Mapeamento rigoroso dos componentes da aplicação, identificando a localização absoluta e o papel funcional de cada ficheiro no servidor:'
    );

    const fileList = [
      ['/opt/app_usb/server.ts', 'Servidor backend Express, API REST, SQLite nativo e Vite middleware na porta 3005', '640 (ridis:ridis)'],
      ['/opt/app_usb/gestao_discos.db*', 'Base de dados SQLite (ficheiros .db, .db-wal e .db-shm)', '660 (ridis:ridis)'],
      ['/opt/app_usb/.env', 'Variáveis de ambiente (APP_PORT=3005, segredos e limites)', '600 (ridis:ridis)'],
      ['/opt/app_usb/package.json', 'Manifesto de dependências do Node.js e scripts de execução', '640 (ridis:ridis)'],
      ['/opt/app_usb/tsconfig.json', 'Configurações de compilação rigorosa do TypeScript', '640 (ridis:ridis)'],
      ['/opt/app_usb/vite.config.ts', 'Configuração do bundler Vite parametrizado para a porta 3005', '640 (ridis:ridis)'],
      ['/opt/app_usb/index.html', 'Ponto de entrada HTML da interface web SPA', '640 (ridis:ridis)'],
      ['/opt/app_usb/LICENSE / LICENCA.md', 'Termos legais de Direitos de Autor e Licença Exclusiva DGLAB', '644 (ridis:ridis)'],
      ['/opt/app_usb/backups/', 'Diretório reservado para cópias de segurança diárias (.db.gz)', '750 (ridis:ridis)'],
      ['/opt/app_usb/deploy/', 'Scripts de suporte: schema_criacao_bd.sql, ridis.service, env_producao.example', '750 (ridis:ridis)'],
      ['/opt/app_usb/src/', 'Código-fonte da SPA React TypeScript (App.tsx, types.ts, main.tsx, index.css)', '750 (ridis:ridis)'],
      ['/opt/app_usb/public/', 'Ativos estáticos públicos e PDF oficial de especificação técnica', '750 (ridis:ridis)'],
    ];

    let fY = doc.y + 2;
    doc.rect(45, fY, 505, 16).fill(PRIMARY_COLOR);
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff');
    doc.text('Ficheiro / Diretório', 52, fY + 4);
    doc.text('Função Operacional e Papel no Sistema', 235, fY + 4);
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

    doc.y = curFY + 8;

    // =========================================================================
    // PÁGINA 4: PASTA RELATÓRIOS (DESTAQUE CENTRAL) & CONFIGURAÇÕES SYSTEMD
    // =========================================================================
    doc.addPage();
    drawHeader();
    doc.y = 48;

    drawSectionTitle('5', 'A Pasta Central «relatorios/»: Procedimento e Custódia');
    drawParagraph(
      'A pasta /opt/app_usb/relatorios/ é um componente vital para o fluxo de trabalho de preservação digital da DGLAB:'
    );

    // Caixa de Destaque para a pasta relatorios
    const rBoxY = doc.y;
    doc.roundedRect(45, rBoxY, 505, 135, 4).fillAndStroke('#f0fdf4', '#86efac');
    doc.fontSize(10).font('Helvetica-Bold').fillColor(SUCCESS_COLOR)
      .text('PASTA DE DESTINO DOS RELATÓRIOS: /opt/app_usb/relatorios/', 55, rBoxY + 8);
    doc.fontSize(8.5).font('Helvetica').fillColor(TEXT_COLOR);
    doc.text(
      '1. Finalidade Operacional: É nesta diretoria que mais tarde os relatórios de validação dos discos USB (ficheiros Snap2HTML em formato .html, relatórios de texto .txt ou listagens .csv gerados pelas ferramentas de digitalização) terão que ser copiados/alojados pelos técnicos.\n\n' +
      '2. Deteção e Indexação Automática: A aplicação RIDIS monitoriza e lê diretamente o conteúdo desta pasta. Sempre que um relatório é aí colocado, o sistema permite associá-lo com 1 clique ao disco correspondente, extraindo automaticamente a contagem de imagens e os Códigos de Referência dos documentos digitais (ex: PT-TT-JC-A-005-0023).\n\n' +
      '3. Requisitos de Permissões: A pasta deve possuir permissão chmod 770 (ou 775) com proprietário ridis:ridis, garantindo que os técnicos possam transferir ficheiros (via SFTP, SCP ou partilha de rede Samba) e que o RIDIS tenha permissão integral de leitura e análise.',
      55,
      rBoxY + 24,
      { width: 485, lineGap: 1.8 }
    );

    doc.y = rBoxY + 145;

    drawSectionTitle('6', 'Configurações do Serviço Systemd e Segurança');
    drawParagraph(
      'Para garantir o funcionamento ininterrupto da aplicação como serviço de sistema na porta 3005 com sandboxing (ISO 27001 A.8.9):'
    );

    drawSubTitle('6.1 Ficheiro de Serviço (/etc/systemd/system/ridis.service)');
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
      'Restart=always\n' +
      'RestartSec=5s\n\n' +
      '# Sandboxing ISO/IEC 27001 A.8.9\n' +
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

    drawSubTitle('6.2 Firewall Interna UFW (Porta 3005)');
    drawCodeBox(
      'sudo ufw default deny incoming && sudo ufw default allow outgoing\n' +
      'sudo ufw allow from 10.0.0.0/8 to any port 22 proto tcp comment \'SSH Admin DGLAB\'\n' +
      'sudo ufw allow from 10.0.0.0/8 to any port 3005 proto tcp comment \'RIDIS HTTP Porta 3005\'\n' +
      'sudo ufw enable'
    );

    // Encerramento
    doc.moveDown(0.4);
    const signY = doc.y;
    doc.roundedRect(45, signY, 505, 45, 4).fillAndStroke('#f8fafc', BORDER_COLOR);
    doc.fontSize(8).font('Helvetica-Bold').fillColor(PRIMARY_COLOR)
      .text('HOMOLOGAÇÃO TÉCNICA — USO RESTRITO ADMINISTRAÇÃO BD (DGLAB)', 55, signY + 7);
    doc.fontSize(7.5).font('Helvetica').fillColor(TEXT_COLOR)
      .text('Documento oficial aprovado para operação na porta 3005 em /opt/app_usb/ com servidor autónomo. Acesso restrito ao módulo de Administração de BD da aplicação.', 55, signY + 18, { width: 485 });
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor(ACCENT_COLOR)
      .text('Autor: José Miguel Magalhães · DGLAB / Serviços Centrais (2026)', 55, signY + 31);

    // Numeração de Páginas
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.save();
      doc.moveTo(45, 800).lineTo(550, 800).strokeColor(BORDER_COLOR).lineWidth(0.5).stroke();
      doc.fontSize(7.5).font('Helvetica').fillColor(MUTED_COLOR)
        .text('RIDIS · DGLAB · Especificação de Arquitetura (Porta 3005) · ISO 27001 & NIS 2', 45, 806);
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
