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

export type UserRole = 'admin' | 'revisor' | 'operador';

export interface Usuario {
  id: number;
  username: string;
  is_admin: boolean;
  role: UserRole;
  created_at: string;
}

export interface DbBackupInfo {
  filename: string;
  size_bytes: number;
  created_at: string;
  type: 'sqlite' | 'full_json';
  label: string;
}

export interface DbAdminStatus {
  db_path: string;
  db_size_bytes: number;
  db_modified_at: string;
  integrity_status: string;
  backups_dir: string;
  relatorios_dir: string;
  counts: {
    discos_usb: number;
    relatorio_ficheiros: number;
    usuarios: number;
    relatorios_html: number;
    relatorios_size_bytes: number;
  };
  migration_diagnostics?: {
    linked_ok_count: number;
    missing_reports: {
      id: number;
      id_disco: string;
      arquivo: string;
      ticket_num: string;
      relatorio_path: string;
    }[];
    unlinked_reports: {
      filename: string;
      size_bytes: number;
      modified_at: string;
    }[];
    disks_without_report: {
      id: number;
      id_disco: string;
      arquivo: string;
      ticket_num: string;
    }[];
  };
  backups: DbBackupInfo[];
}

