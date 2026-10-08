/**
 * RIDIS — Gerador de Documento Técnico Word (.docx)
 * Convergência ISO/IEC 27001:2022 & Diretiva NIS 2 (UE 2022/2555)
 * Versão 3.0: Diretório /opt/app_usb/ | Apenas Porta 3005 | Sem Nginx/Sem Proxy | Sem Instruções de Instalação
 * Foco: Estrutura Completa de Ficheiros, Pasta 'relatorios' e Script DDL da BD
 * Autor: José Miguel Magalhães | DGLAB (2026)
 */

import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  BorderStyle,
  WidthType,
  AlignmentType,
  Packer,
  ShadingType,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  convertInchesToTwip,
} from 'docx';
import fs from 'fs';
import path from 'path';

export async function generateComplianceDOCX(outputPath) {
  const PRIMARY_COLOR = '0f172a'; // Slate 900
  const ACCENT_COLOR = '1e40af';  // Blue 800
  const SECONDARY_COLOR = '0369a1'; // Sky 700
  const TEXT_COLOR = '1e293b';    // Slate 800
  const MUTED_COLOR = '475569';   // Slate 600
  const SUCCESS_COLOR = '065f46'; // Emerald 800
  const BORDER_COLOR = 'cbd5e1';  // Slate 300
  const CODE_BG = 'f1f5f9';       // Slate 100

  const cellBorderObj = {
    top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
    right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
  };

  function createSectionHeading(number, title) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 140 },
      children: [
        new TextRun({
          text: `${number}. ${title}`,
          bold: true,
          size: 26, // 13pt
          color: PRIMARY_COLOR,
          font: 'Calibri',
        }),
      ],
    });
  }

  function createSubHeading(title) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 100 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 22, // 11pt
          color: SECONDARY_COLOR,
          font: 'Calibri',
        }),
      ],
    });
  }

  function createBodyParagraph(text, isBold = false) {
    return new Paragraph({
      spacing: { before: 80, after: 100, line: 280 },
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({
          text,
          size: 20, // 10pt
          color: TEXT_COLOR,
          font: 'Calibri',
          bold: isBold,
        }),
      ],
    });
  }

  function createCodeBlock(code) {
    const lines = code.split('\n');
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: CODE_BG },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
                bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
                left: { style: BorderStyle.SINGLE, size: 12, color: ACCENT_COLOR },
                right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
              },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              children: lines.map(
                (line) =>
                  new Paragraph({
                    spacing: { before: 20, after: 20 },
                    children: [
                      new TextRun({
                        text: line || ' ',
                        font: 'Consolas',
                        size: 16, // 8pt
                        color: PRIMARY_COLOR,
                      }),
                    ],
                  })
              ),
            }),
          ],
        }),
      ],
    });
  }

  function createCalloutBox(title, lines, borderColor = '86efac', bgColor = 'f0fdf4', titleColor = SUCCESS_COLOR) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: { type: ShadingType.CLEAR, fill: bgColor },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 6, color: borderColor },
                bottom: { style: BorderStyle.SINGLE, size: 6, color: borderColor },
                left: { style: BorderStyle.SINGLE, size: 16, color: borderColor },
                right: { style: BorderStyle.SINGLE, size: 6, color: borderColor },
              },
              margins: { top: 140, bottom: 140, left: 180, right: 180 },
              children: [
                new Paragraph({
                  spacing: { before: 40, after: 100 },
                  children: [
                    new TextRun({
                      text: title,
                      bold: true,
                      size: 22,
                      color: titleColor,
                      font: 'Calibri',
                    }),
                  ],
                }),
                ...lines.map(
                  (line) =>
                    new Paragraph({
                      spacing: { before: 40, after: 60, line: 260 },
                      alignment: AlignmentType.JUSTIFIED,
                      children: [
                        new TextRun({
                          text: line,
                          size: 19,
                          color: TEXT_COLOR,
                          font: 'Calibri',
                        }),
                      ],
                    })
                ),
              ],
            }),
          ],
        }),
      ],
    });
  }

  const doc = new Document({
    creator: 'José Miguel Magalhães · DGLAB',
    title: 'RIDIS — Especificação Técnica de Arquitetura e Convergência ISO 27001 / NIS 2',
    description: 'Manual Técnico de Arquitetura e Estrutura de Ficheiros (/opt/app_usb/ · Porta 3005 · Pasta relatorios/)',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(0.8),
              left: convertInchesToTwip(0.8),
              right: convertInchesToTwip(0.8),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                spacing: { after: 120 },
                alignment: AlignmentType.BOTH,
                children: [
                  new TextRun({
                    text: 'DGLAB · DIREÇÃO-GERAL DO LIVRO, DOS ARQUIVOS E DAS BIBLIOTECAS',
                    size: 16,
                    color: MUTED_COLOR,
                    font: 'Calibri',
                  }),
                  new TextRun({
                    text: '\tRIDIS — ESPECIFICAÇÃO TÉCNICA (PORTA 3005 · /opt/app_usb/)',
                    size: 16,
                    bold: true,
                    color: ACCENT_COLOR,
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                spacing: { before: 120 },
                alignment: AlignmentType.BOTH,
                children: [
                  new TextRun({
                    text: 'RIDIS · DGLAB · ISO/IEC 27001:2022 & Diretiva NIS 2 (UE 2022/2555) · Restrito Admin BD',
                    size: 16,
                    color: MUTED_COLOR,
                    font: 'Calibri',
                  }),
                  new TextRun({
                    text: '\tPágina ',
                    size: 16,
                    color: MUTED_COLOR,
                    font: 'Calibri',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    bold: true,
                    color: PRIMARY_COLOR,
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Banner de Restrição
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'eff6ff' },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 4, color: 'bfdbfe' },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'bfdbfe' },
                      left: { style: BorderStyle.SINGLE, size: 4, color: 'bfdbfe' },
                      right: { style: BorderStyle.SINGLE, size: 4, color: 'bfdbfe' },
                    },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'DOCUMENTO RESTRITO — MÓDULO ADMINISTRAÇÃO BD (USO INTERNO DGLAB)',
                            bold: true,
                            size: 18,
                            color: ACCENT_COLOR,
                            font: 'Calibri',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 200, after: 60 } }),

          // Título Principal
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 60 },
            children: [
              new TextRun({
                text: 'ESPECIFICAÇÃO TÉCNICA DE ARQUITETURA E CONVERGÊNCIA NORMATIVA',
                bold: true,
                size: 34, // 17pt
                color: PRIMARY_COLOR,
                font: 'Calibri',
              }),
            ],
          }),

          // Subtítulo
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 40, after: 120 },
            children: [
              new TextRun({
                text: 'Convergência com ISO/IEC 27001:2022 & Diretiva NIS 2 (UE 2022/2555)',
                bold: true,
                size: 24, // 12pt
                color: ACCENT_COLOR,
                font: 'Calibri',
              }),
            ],
          }),

          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 200 },
            children: [
              new TextRun({
                text: 'Servidor Autónomo na Porta 3005 · Diretório /opt/app_usb/ · Pasta relatorios/ Centralizada',
                italics: true,
                size: 20, // 10pt
                color: MUTED_COLOR,
                font: 'Calibri',
              }),
            ],
          }),

          // Tabela de Metadados do Documento
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 28, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'f8fafc' },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Aplicação:', bold: true, size: 18, color: PRIMARY_COLOR, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    width: { size: 72, type: WidthType.PERCENTAGE },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'RIDIS — Sistema de Gestão de Discos USB, Matrizes e Relatórios de Preservação Digital', size: 18, color: TEXT_COLOR, font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 28, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'f8fafc' },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Autor e Titular:', bold: true, size: 18, color: PRIMARY_COLOR, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    width: { size: 72, type: WidthType.PERCENTAGE },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'José Miguel Magalhães · DGLAB / Serviços Centrais', bold: true, size: 18, color: ACCENT_COLOR, font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 28, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'f8fafc' },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Organização Licenciada:', bold: true, size: 18, color: PRIMARY_COLOR, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    width: { size: 72, type: WidthType.PERCENTAGE },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'DGLAB — Direção-Geral do Livro, dos Arquivos e das Bibliotecas (Uso Exclusivo)', size: 18, color: TEXT_COLOR, font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 28, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'f8fafc' },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Diretório de Instalação:', bold: true, size: 18, color: PRIMARY_COLOR, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    width: { size: 72, type: WidthType.PERCENTAGE },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: '/opt/app_usb/ (Diretório base homologado no sistema operativo Linux)', bold: true, size: 18, color: TEXT_COLOR, font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 28, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'f8fafc' },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Porta de Operação:', bold: true, size: 18, color: PRIMARY_COLOR, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    width: { size: 72, type: WidthType.PERCENTAGE },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Exclusivamente Porta 3005 (Sem suporte secundário à porta 3000)', bold: true, size: 18, color: ACCENT_COLOR, font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 28, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'f8fafc' },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Servidor Web & Proxy:', bold: true, size: 18, color: PRIMARY_COLOR, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    width: { size: 72, type: WidthType.PERCENTAGE },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Servidor Autónomo Node.js/Express na Intranet DGLAB (Sem Proxy / Sem Nginx)', size: 18, color: TEXT_COLOR, font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 28, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: 'f8fafc' },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Versão e Data:', bold: true, size: 18, color: PRIMARY_COLOR, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    width: { size: 72, type: WidthType.PERCENTAGE },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Versão 3.0.0 (Especificação Estrutural e Arquitetura) · Outubro de 2026', size: 18, color: TEXT_COLOR, font: 'Calibri' })] })],
                  }),
                ],
              }),
            ],
          }),

          // Secção 0
          createSectionHeading('0', 'Enquadramento e Resumo de Arquitetura'),
          createBodyParagraph(
            'A presente especificação técnica define a arquitetura, modelo de dados, localização física dos ficheiros e parâmetros de segurança da aplicação RIDIS, em convergência estrita com as normas ISO/IEC 27001:2022 e a Diretiva NIS 2 (UE 2022/2555). As instruções de instalação passo a passo do sistema operativo e de ferramentas foram deliberadamente remetidas para um documento externo dedicado, focando-se este documento na topologia técnica, na base de dados, na estrutura de pastas em /opt/app_usb/ e no papel central da pasta "relatorios/".'
          ),

          // Tabela Resumida de Convergência
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 28, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Parâmetro Técnico', bold: true, size: 18, color: 'ffffff', font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    width: { size: 36, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Convergência ISO 27001 / NIS 2', bold: true, size: 18, color: 'ffffff', font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    width: { size: 36, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Implementação Técnica no RIDIS', bold: true, size: 18, color: 'ffffff', font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'f8fafc' },
                    borders: cellBorderObj,
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Diretório Homologado', bold: true, size: 17, color: PRIMARY_COLOR, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    borders: cellBorderObj,
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'ISO A.8.9 (Gestão de Configuração)', italics: true, size: 17, color: SECONDARY_COLOR, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    borders: cellBorderObj,
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Instalação unificada e estruturada sob /opt/app_usb/.', size: 17, color: TEXT_COLOR, font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'ffffff' },
                    borders: cellBorderObj,
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Porta Única (3005)', bold: true, size: 17, color: PRIMARY_COLOR, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    borders: cellBorderObj,
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'ISO A.8.20 (Segurança da Rede)', italics: true, size: 17, color: SECONDARY_COLOR, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    borders: cellBorderObj,
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Operação exclusiva na porta 3005; eliminação da porta 3000.', size: 17, color: TEXT_COLOR, font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'f8fafc' },
                    borders: cellBorderObj,
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Servidor Autónomo', bold: true, size: 17, color: PRIMARY_COLOR, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    borders: cellBorderObj,
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'ISO A.8.20 (Redução de Superfície)', italics: true, size: 17, color: SECONDARY_COLOR, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    borders: cellBorderObj,
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Node.js Express atua diretamente na LAN (sem proxy / sem Nginx).', size: 17, color: TEXT_COLOR, font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'ffffff' },
                    borders: cellBorderObj,
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Pasta relatorios/', bold: true, size: 17, color: PRIMARY_COLOR, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    borders: cellBorderObj,
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'ISO A.8.10 / NIS 2 (Integridade)', italics: true, size: 17, color: SECONDARY_COLOR, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    borders: cellBorderObj,
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Diretório centralizado para cópia e indexação dos relatórios .html/.csv.', size: 17, color: TEXT_COLOR, font: 'Calibri' })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'f8fafc' },
                    borders: cellBorderObj,
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Base de Dados Local', bold: true, size: 17, color: PRIMARY_COLOR, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    borders: cellBorderObj,
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'ISO A.8.24 / NIS 2 Art. 21(2)(c)', italics: true, size: 17, color: SECONDARY_COLOR, font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    borders: cellBorderObj,
                    margins: { top: 60, bottom: 60, left: 80, right: 80 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'SQLite 3 WAL em /opt/app_usb/gestao_discos.db (sem portas expostas).', size: 17, color: TEXT_COLOR, font: 'Calibri' })] })],
                  }),
                ],
              }),
            ],
          }),

          // Secção 1
          createSectionHeading('1', 'Pacotes e Módulos de Software Requeridos'),
          createBodyParagraph(
            'A aplicação assenta numa arquitetura minimalista e auto-suficiente sem dependências externas de nuvem, requerendo no sistema operativo:'
          ),
          createBodyParagraph('• Sistema Operativo Homologado: Ubuntu Server 24.04 LTS ou Debian 12 (Bookworm) / RHEL 9 (64-bit).'),
          createBodyParagraph('• Runtime Node.js: Versão 22 LTS (com gestor de pacotes npm), necessário pelo suporte ao motor nativo node:sqlite de alta velocidade.'),
          createBodyParagraph('• Motor de Base de Dados: SQLite 3 e respetivas bibliotecas de sistema (libsqlite3-dev).'),
          createBodyParagraph('• Utilitários de Sistema e Segurança: Git, build-essential, curl, ufw (firewall interna), fail2ban, logrotate, rsyslog, gzip.'),
          createBodyParagraph('• Módulos da Aplicação (npm): express (servidor HTTP autónomo), multer (uploads volumosos até 50MB), react/react-dom 19, vite, pdfkit, docx (geradores de relatórios e documentação), tsx e typescript.'),

          // Secção 2
          createSectionHeading('2', 'Base de Dados: Especificação e Script DDL de Criação'),
          createBodyParagraph(
            'A base de dados é mantida exclusivamente no ficheiro /opt/app_usb/gestao_discos.db através do motor relacional SQLite 3 com modo WAL (Write-Ahead Logging). Não abre quaisquer portas de rede no servidor, garantindo isolamento total e imunidade face a ataques remotos.'
          ),
          createSubHeading('Script DDL Homologado (/opt/app_usb/deploy/schema_criacao_bd.sql)'),
          createCodeBlock(
`-- Ativação de Modos de Segurança, Integridade e Concorrência
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

PRAGMA integrity_check;`
          ),

          // Secção 3
          createSectionHeading('3', 'Servidor Web: Operação Exclusiva na Porta 3005 (Sem Proxy)'),
          createBodyParagraph(
            'A aplicação RIDIS foi concebida para atuar diretamente como servidor HTTP autónomo na intranet da DGLAB:'
          ),
          createBodyParagraph('• Porta 3005 Exclusiva: Toda a aplicação escuta única e exclusivamente na porta TCP 3005 (http://<ip-do-servidor>:3005/). Qualquer suporte secundário à porta 3000 foi removido, eliminando conflitos e ambiguidades operacionais.'),
          createBodyParagraph('• Sem Proxy Reverso / Sem Nginx: O servidor Express embutido em Node.js distribui os ficheiros estáticos da SPA React, executa os endpoints REST e gere o upload de relatórios (até 50MB) de forma direta e sem intermediários, reduzindo a superfície de ataque e o esforço de manutenção.'),

          // Secção 4
          createSectionHeading('4', 'Estrutura Completa de Diretórios e Ficheiros em /opt/app_usb/'),
          createBodyParagraph(
            'Apresenta-se de seguida o mapeamento integral dos componentes da aplicação, detalhando a localização exata no sistema de ficheiros, a função técnica e as permissões de segurança:'
          ),

          // Tabela de Ficheiros
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Ficheiro / Diretório', bold: true, size: 18, color: 'ffffff', font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    width: { size: 48, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Função Operacional e Papel no Sistema', bold: true, size: 18, color: 'ffffff', font: 'Calibri' })] })],
                  }),
                  new TableCell({
                    width: { size: 22, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: PRIMARY_COLOR },
                    borders: cellBorderObj,
                    margins: { top: 80, bottom: 80, left: 100, right: 100 },
                    children: [new Paragraph({ children: [new TextRun({ text: 'Permissão POSIX', bold: true, size: 18, color: 'ffffff', font: 'Calibri' })] })],
                  }),
                ],
              }),
              ...[
                ['/opt/app_usb/server.ts', 'Servidor backend Express, API REST, SQLite nativo e Vite middleware na porta 3005', '640 (ridis:ridis)'],
                ['/opt/app_usb/gestao_discos.db*', 'Base de dados relacional SQLite (ficheiros .db, .db-wal e .db-shm)', '660 (ridis:ridis)'],
                ['/opt/app_usb/.env', 'Variáveis de ambiente (APP_PORT=3005, caminhos de dados e segredos)', '600 (ridis:ridis)'],
                ['/opt/app_usb/package.json', 'Manifesto de dependências do Node.js e scripts de execução', '640 (ridis:ridis)'],
                ['/opt/app_usb/tsconfig.json', 'Configurações de compilação TypeScript', '640 (ridis:ridis)'],
                ['/opt/app_usb/vite.config.ts', 'Configuração do bundler Vite parametrizado para a porta 3005', '640 (ridis:ridis)'],
                ['/opt/app_usb/index.html', 'Ponto de entrada HTML da SPA React', '640 (ridis:ridis)'],
                ['/opt/app_usb/LICENSE / LICENCA.md', 'Termos legais de Direitos de Autor e Licença Exclusiva DGLAB', '644 (ridis:ridis)'],
                ['/opt/app_usb/relatorios/ (Destaque)', 'Pasta central de relatórios Snap2HTML (.html), .txt e .csv para leitura/indexação', '770 (ridis:ridis)'],
                ['/opt/app_usb/backups/', 'Diretório reservado para cópias de segurança diárias (.db.gz)', '750 (ridis:ridis)'],
                ['/opt/app_usb/deploy/', 'Scripts de suporte: schema_criacao_bd.sql, ridis.service, env_producao.example', '750 (ridis:ridis)'],
                ['/opt/app_usb/src/', 'Código-fonte da SPA React TypeScript (App.tsx, types.ts, main.tsx, index.css)', '750 (ridis:ridis)'],
                ['/opt/app_usb/public/', 'Ativos estáticos públicos e documentos técnicos oficiais (PDF e DOCX)', '750 (ridis:ridis)'],
              ].map(([fpath, desc, perm], idx) =>
                new TableRow({
                  children: [
                    new TableCell({
                      shading: { type: ShadingType.CLEAR, fill: idx % 2 === 0 ? 'f8fafc' : 'ffffff' },
                      borders: cellBorderObj,
                      margins: { top: 60, bottom: 60, left: 80, right: 80 },
                      children: [new Paragraph({ children: [new TextRun({ text: fpath, bold: true, size: 16, color: ACCENT_COLOR, font: 'Consolas' })] })],
                    }),
                    new TableCell({
                      borders: cellBorderObj,
                      margins: { top: 60, bottom: 60, left: 80, right: 80 },
                      children: [new Paragraph({ children: [new TextRun({ text: desc, size: 17, color: TEXT_COLOR, font: 'Calibri' })] })],
                    }),
                    new TableCell({
                      borders: cellBorderObj,
                      margins: { top: 60, bottom: 60, left: 80, right: 80 },
                      children: [new Paragraph({ children: [new TextRun({ text: perm, bold: true, size: 16, color: SUCCESS_COLOR, font: 'Consolas' })] })],
                    }),
                  ],
                })
              ),
            ],
          }),

          // Secção 5 - DESTAQUE PASTA RELATÓRIOS
          createSectionHeading('5', 'A Pasta Central «relatorios/»: Procedimento e Custódia'),
          createBodyParagraph(
            'A pasta /opt/app_usb/relatorios/ assume um papel crítico em todo o ecossistema de preservação digital da DGLAB:'
          ),
          createCalloutBox(
            'PASTA DE DESTINO DOS RELATÓRIOS: /opt/app_usb/relatorios/',
            [
              '1. Finalidade Operacional: É nesta diretoria que mais tarde os relatórios de validação dos discos USB (ficheiros Snap2HTML em formato .html, relatórios de texto .txt ou listagens .csv gerados pelas ferramentas de digitalização) terão que ser copiados/alojados pelos técnicos.',
              '2. Deteção e Indexação Automática: A aplicação RIDIS monitoriza e lê diretamente o conteúdo desta pasta. Sempre que um relatório é aí colocado, o sistema permite associá-lo com 1 clique ao disco correspondente, extraindo automaticamente a contagem de imagens e os Códigos de Referência dos documentos digitais (ex: PT-TT-JC-A-005-0023).',
              '3. Requisitos de Permissões: A pasta deve possuir permissão chmod 770 (ou 775) com proprietário ridis:ridis, garantindo que os técnicos possam transferir ficheiros (via SFTP, SCP ou partilha de rede Samba) e que o RIDIS tenha permissão integral de leitura e análise.',
            ]
          ),

          // Secção 6
          createSectionHeading('6', 'Configurações do Serviço Systemd e Segurança'),
          createBodyParagraph(
            'Para garantir a execução contínua e segura da aplicação como serviço de sistema na porta 3005 com sandboxing (ISO 27001 A.8.9):'
          ),
          createSubHeading('6.1 Ficheiro de Serviço Systemd (/etc/systemd/system/ridis.service)'),
          createCodeBlock(
`[Unit]
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

# Sandboxing de Seguranca ISO/IEC 27001 A.8.9
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
WantedBy=multi-user.target`
          ),

          createSubHeading('6.2 Firewall Interna UFW (Porta 3005)'),
          createCodeBlock(
`sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 10.0.0.0/8 to any port 22 proto tcp comment 'SSH Admin DGLAB'
sudo ufw allow from 10.0.0.0/22 to any port 3005
sudo ufw allow from 10.0.4.0/24 to any port 3005
sudo ufw allow from 172.29.0.0/24 to any port 3005
sudo ufw allow from 192.168.111.0/24 to any port 3005
sudo ufw enable`
          ),

          createSubHeading('6.3 Rotina de Backup da Base de Dados (NIS 2 / ISO 27001 A.8.13)'),
          createCodeBlock(
`# Execução diária às 02h00 em /etc/cron.d/ridis-backup
0 2 * * * ridis /usr/bin/sqlite3 /opt/app_usb/gestao_discos.db ".backup '/opt/app_usb/backups/backup_auto_$(date +\\%Y\\%m\\%d_\\%H\\%M\\%S).db'" && gzip /opt/app_usb/backups/backup_auto_*.db && find /opt/app_usb/backups -name "*.db.gz" -mtime +90 -delete`
          ),

          // Secção 7 - Direitos de Autor
          createSectionHeading('7', 'Proteção Jurídica e Direitos de Autor (Copyright)'),
          createBodyParagraph(
            'Copyright © 2026 José Miguel Magalhães. Todos os direitos de propriedade intelectual e direitos de autor reservados. A presente aplicação e a respetiva documentação técnica foram desenvolvidas sob licença proprietária e exclusiva para a Direção-Geral do Livro, dos Arquivos e das Bibliotecas (DGLAB). É estritamente proibida qualquer reprodução, engenharia reversa, sublicenciamento, distribuição ou utilização externa sem o consentimento formal por escrito do autor.'
          ),

          // Caixa Final de Homologação
          new Paragraph({ spacing: { before: 200, after: 100 } }),
          createCalloutBox(
            'HOMOLOGAÇÃO TÉCNICA — USO RESTRITO ADMINISTRAÇÃO BD (DGLAB)',
            [
              'Documento técnico oficial emitido em formato Microsoft Word (.docx) e Adobe PDF, aprovado exclusivamente para o ambiente interno da DGLAB.',
              'Autor / Responsável Técnico: José Miguel Magalhães · DGLAB / Serviços Centrais (2026).',
            ],
            '93c5fd',
            'f8fafc',
            PRIMARY_COLOR
          ),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

// Execução direta CLI
if (process.argv[1]?.endsWith('generate_compliance_docx.js') || process.argv[1]?.endsWith('generate_compliance_docx.ts')) {
  const destPublic = path.join(process.cwd(), 'public', 'RIDIS_Especificacao_Tecnica_ISO27001_NIS2.docx');
  const destRoot = path.join(process.cwd(), 'RIDIS_Especificacao_Tecnica_ISO27001_NIS2.docx');
  const destDeploy = path.join(process.cwd(), 'deploy', 'RIDIS_Especificacao_Tecnica_ISO27001_NIS2.docx');

  if (!fs.existsSync(path.dirname(destPublic))) {
    fs.mkdirSync(path.dirname(destPublic), { recursive: true });
  }

  generateComplianceDOCX(destPublic)
    .then(() => {
      fs.copyFileSync(destPublic, destRoot);
      fs.copyFileSync(destPublic, destDeploy);
      console.log('Documento Word (.docx) gerado com sucesso em:');
      console.log(' - ' + destPublic);
      console.log(' - ' + destRoot);
      console.log(' - ' + destDeploy);
    })
    .catch((err) => {
      console.error('Erro ao gerar documento Word:', err);
      process.exit(1);
    });
}
