export interface DiscoUsb {
  id: number;
  arquivo: string;
  remetente: string;
  data_entrada: string;
  ticket_num: string;
  id_disco: string;
  projeto: string;
  localizacao: string;
  tamanho_disco: string;
  marca: string;
  numero_serie: string;
  verificado: boolean;
  ticket_integracao: string;
  integrado: boolean;
  armazenado_servidor: boolean;
  total_imagens: number;
  observacoes: string;
  relatorio_path: string | null;
  created_at: string;
  indexed_files_count: number;
  indexed_tif_count: number;
  matched_files?: string[];
  matched_files_total?: number;
}

export interface RidisStats {
  total: number;
  total_imagens: number;
  verificado: number;
  pct_verificado: number;
  integrado: number;
  pct_integrado: number;
  armazenado: number;
  pct_armazenado: number;
  total_indexed_files: number;
  total_indexed_tif: number;
}

export interface IndexedFileRow {
  id: number;
  disco_id?: number;
  nome_ficheiro: string;
  tamanho_bytes: number;
  pasta: string;
  id_disco?: string;
  arquivo?: string;
  projeto?: string;
  localizacao?: string;
  ticket_num?: string;
  ticket_integracao?: string;
  data_entrada?: string;
  relatorio_path?: string | null;
  verificado?: number;
  integrado?: number;
  armazenado_servidor?: number;
}

export interface RelatorioFileInfo {
  filename: string;
  size_bytes: number;
  modified_at: string;
  disco: {
    id: number;
    id_disco: string;
    arquivo: string;
    ticket_num: string;
    projeto: string;
    localizacao: string;
    relatorio_path: string;
    data_entrada: string;
    total_indexados: number;
    total_tif: number;
  } | null;
}

export interface Usuario {
  id: number;
  username: string;
  is_admin: boolean;
  created_at: string;
}
