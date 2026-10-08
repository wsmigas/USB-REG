/**
 * RIDIS — Gestão de Discos USB e Matrizes
 * 
 * Copyright (c) 2026 José Miguel Magalhães. Todos os direitos reservados.
 * Desenvolvido e licenciado exclusivamente para uso interno da DGLAB (Direção-Geral do Livro, dos Arquivos e das Bibliotecas).
 * É expressamente proibida a cópia, reprodução, redistribuição, engenharia reversa
 * ou utilização para qualquer outro fim sem autorização prévia por escrito do autor.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Download,
  Upload,
  FileText,
  Edit3,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  HardDrive,
  FolderOpen,
  Users,
  LogOut,
  Sun,
  Moon,
  X,
  ExternalLink,
  Key,
  ArrowUp,
  ArrowUpCircle,
  ArrowDownCircle,
  FileSpreadsheet,
  Filter,
  MessageSquareText,
  Database,
  RotateCcw,
  ShieldCheck,
  Archive,
} from 'lucide-react';
import {
  DiscoUsb,
  RidisStats,
  IndexedFileRow,
  Usuario,
  DbAdminStatus,
  UserRole,
} from './types';

type ActiveTab = 'inventario' | 'usuarios' | 'admin_bd';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('ridis_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('ridis_theme', theme);
  }, [theme]);

  const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

  // Auth state with 5-minute session inactivity check
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    username: string;
    is_admin: boolean;
    role: UserRole;
  } | null>(() => {
    const saved = localStorage.getItem('ridis_user');
    const lastActivity = Number(localStorage.getItem('ridis_last_activity') || '0');
    if (saved) {
      if (lastActivity > 0 && Date.now() - lastActivity > 5 * 60 * 1000) {
        localStorage.removeItem('ridis_user');
        localStorage.removeItem('ridis_last_activity');
        return null;
      }
      try {
        const u = JSON.parse(saved);
        if (u && !u.role) {
          u.role = u.is_admin ? 'admin' : 'operador';
        }
        return u;
      } catch {
        // ignore
      }
    }
    return null;
  });

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('inventario');

  // Toast / Flash notification
  const [flashMessage, setFlashMessage] = useState<{
    type: 'success' | 'danger' | 'warning';
    text: string;
  } | null>(null);

  const showFlash = useCallback(
    (text: string, type: 'success' | 'danger' | 'warning' = 'success') => {
      setFlashMessage({ text, type });
      setTimeout(() => {
        setFlashMessage((prev) => (prev?.text === text ? null : prev));
      }, 5000);
    },
    []
  );

  // Inventory & Filters state
  const [discos, setDiscos] = useState<DiscoUsb[]>([]);
  const [arquivosMap, setArquivosMap] = useState<Record<string, string>>({});
  const [projetosList, setProjetosList] = useState<string[]>([]);
  const [localizacoesList, setLocalizacoesList] = useState<string[]>([]);
  const [stats, setStats] = useState<RidisStats>({
    total: 0,
    total_imagens: 0,
    verificado: 0,
    pct_verificado: 0,
    integrado: 0,
    pct_integrado: 0,
    armazenado: 0,
    pct_armazenado: 0,
    total_indexed_files: 0,
    total_indexed_tif: 0,
  });
  const [loadingDiscos, setLoadingDiscos] = useState(true);

  const [busca, setBusca] = useState('');
  const [fArquivo, setFArquivo] = useState('');
  const [fProjeto, setFProjeto] = useState('');
  const [fLocalizacao, setFLocalizacao] = useState('');
  const [fVerificado, setFVerificado] = useState('');
  const [fIntegrado, setFIntegrado] = useState('');
  const [fArmazenado, setFArmazenado] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(25);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Scroll to top button visibility state
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Inline delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Create / Edit Disk Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormReadOnly, setIsFormReadOnly] = useState(false);
  const [editingDisco, setEditingDisco] = useState<DiscoUsb | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    arquivo: '',
    remetente: '',
    data_entrada: '',
    ticket_num: '',
    id_disco: '',
    projeto: '',
    localizacao: '',
    tamanho_disco: '',
    marca: '',
    numero_serie: '',
    verificado: false,
    ticket_integracao: '',
    integrado: false,
    armazenado_servidor: false,
    total_imagens: 0,
    observacoes: '',
  });

  // CSV Import Modal state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);

  // Snap2HTML Report & Indexed Files Explorer Modal state
  const [inspectModalDisco, setInspectModalDisco] = useState<DiscoUsb | null>(null);
  const [inspectMode, setInspectMode] = useState<'index' | 'html'>('index');
  const [inspectQuery, setInspectQuery] = useState('');
  const [inspectOnlyTif, setInspectOnlyTif] = useState(false);
  const [inspectFiles, setInspectFiles] = useState<IndexedFileRow[]>([]);
  const [inspectTotal, setInspectTotal] = useState(0);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Usuarios Tab state
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('operador');
  const [passwordInputs, setPasswordInputs] = useState<Record<number, string>>({});
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<number | null>(null);

  // Permission helpers
  const isRootAdmin = currentUser?.username.toLowerCase() === 'admin';
  const isAdmin = Boolean(currentUser?.is_admin || currentUser?.role === 'admin');
  const isRevisor = currentUser?.role === 'revisor';
  const canEditOrDelete = isAdmin || isRevisor;

  // Database Administration Tab state (Admin Only)
  const [dbAdminStatus, setDbAdminStatus] = useState<DbAdminStatus | null>(null);
  const [dbAdminLoading, setDbAdminLoading] = useState(false);
  const [creatingBackupMode, setCreatingBackupMode] = useState<'sqlite' | 'full_json' | null>(null);
  const [optimizingDb, setOptimizingDb] = useState(false);
  const [restoreUploadFile, setRestoreUploadFile] = useState<File | null>(null);
  const [restoreUploadMode, setRestoreUploadMode] = useState<'replace' | 'merge'>('replace');
  const [restoringDb, setRestoringDb] = useState(false);
  const [restoreProgressText, setRestoreProgressText] = useState<string | null>(null);
  const [confirmUploadRestore, setConfirmUploadRestore] = useState(false);
  const [confirmRestoreFilename, setConfirmRestoreFilename] = useState<string | null>(null);
  const [confirmDeleteBackupFilename, setConfirmDeleteBackupFilename] = useState<string | null>(null);

  // Batch Report Migration state (Admin Only)
  const [migratingReports, setMigratingReports] = useState(false);
  const [migrationReportsProgress, setMigrationReportsProgress] = useState<{
    current: number;
    total: number;
    filename: string;
    pct: number;
  } | null>(null);
  const [autoLinkingReports, setAutoLinkingReports] = useState(false);
  const [manualLinkSelection, setManualLinkSelection] = useState<Record<string, string>>({});
  const [linkingReportFilename, setLinkingReportFilename] = useState<string | null>(null);

  // GitHub System Auto-Update state (Admin Only)
  const [gitRepoUrl, setGitRepoUrl] = useState('https://github.com/wsmigas/USB-REG.git');
  const [gitUpdating, setGitUpdating] = useState(false);
  const [gitRestartAfterUpdate, setGitRestartAfterUpdate] = useState(true);
  const [gitUpdateLogs, setGitUpdateLogs] = useState<string[] | null>(null);
  const [confirmGitUpdate, setConfirmGitUpdate] = useState(false);

  // Legal Protection & Copyright state (José Miguel Magalhães - DGLAB)
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [copiedLicenseText, setCopiedLicenseText] = useState(false);

  // Reset pagination to 25 whenever search or filters change
  useEffect(() => {
    setVisibleLimit(25);
  }, [busca, fArquivo, fProjeto, fLocalizacao, fVerificado, fIntegrado, fArmazenado]);

  // Fetch main inventory
  const fetchDiscos = useCallback(async () => {
    setLoadingDiscos(true);
    try {
      const params = new URLSearchParams();
      if (busca) params.set('q', busca);
      if (fArquivo) params.set('f_arquivo', fArquivo);
      if (fProjeto) params.set('f_projeto', fProjeto);
      if (fLocalizacao) params.set('f_localizacao', fLocalizacao);
      if (fVerificado !== '') params.set('f_verificado', fVerificado);
      if (fIntegrado !== '') params.set('f_integrado', fIntegrado);
      if (fArmazenado !== '') params.set('f_armazenado', fArmazenado);
      params.set('limit', String(visibleLimit));

      const res = await fetch(`/api/discos?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao carregar discos');
      const data = await res.json();
      setDiscos(data.discos || []);
      setProjetosList(data.projetos || []);
      setLocalizacoesList(data.localizacoes || []);
      setArquivosMap(data.arquivos || {});
      if (data.stats) setStats(data.stats);
    } catch (e: any) {
      showFlash(e.message || 'Erro ao comunicar com o servidor.', 'danger');
    } finally {
      setLoadingDiscos(false);
    }
  }, [busca, fArquivo, fProjeto, fLocalizacao, fVerificado, fIntegrado, fArmazenado, visibleLimit, showFlash]);

  useEffect(() => {
    if (currentUser) {
      fetchDiscos();
    }
  }, [currentUser, fetchDiscos]);

  // Fetch usuarios
  const fetchUsuarios = useCallback(async () => {
    try {
      const res = await fetch('/api/usuarios');
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data.usuarios || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (currentUser && activeTab === 'usuarios') {
      fetchUsuarios();
    }
  }, [currentUser, activeTab, fetchUsuarios]);

  // Fetch Database Admin Status (Strictly login 'admin' Only)
  const fetchDbAdminStatus = useCallback(async () => {
    if (currentUser?.username.toLowerCase() !== 'admin') return;
    setDbAdminLoading(true);
    try {
      const res = await fetch(`/api/admin/db/status?admin_user_id=${currentUser.id}`, {
        headers: {
          'x-admin-user-id': String(currentUser.id),
          'x-admin-username': currentUser.username,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setDbAdminStatus(data);
      }
    } catch {
      // ignore
    } finally {
      setDbAdminLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.username.toLowerCase() === 'admin' && activeTab === 'admin_bd') {
      fetchDbAdminStatus();
    }
  }, [currentUser, activeTab, fetchDbAdminStatus]);

  // Ensure users cannot remain on restricted tabs
  useEffect(() => {
    if (currentUser && !isAdmin && activeTab === 'usuarios') {
      setActiveTab('inventario');
    }
    if (currentUser && !isRootAdmin && activeTab === 'admin_bd') {
      setActiveTab('inventario');
    }
  }, [currentUser, isAdmin, isRootAdmin, activeTab]);

  // Inspect modal files loader
  const fetchInspectFiles = useCallback(async () => {
    if (!inspectModalDisco) return;
    setInspectLoading(true);
    try {
      const params = new URLSearchParams();
      if (inspectQuery) params.set('q', inspectQuery);
      if (inspectOnlyTif) params.set('apenas_tif', '1');
      const res = await fetch(`/api/discos/${inspectModalDisco.id}/ficheiros?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInspectFiles(data.ficheiros || []);
        setInspectTotal(data.total || 0);
      }
    } finally {
      setInspectLoading(false);
    }
  }, [inspectModalDisco, inspectQuery, inspectOnlyTif]);

  useEffect(() => {
    if (inspectModalDisco && inspectMode === 'index') {
      fetchInspectFiles();
    }
  }, [inspectModalDisco, inspectMode, fetchInspectFiles]);

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1200);
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Utilizador ou palavra-passe incorretos.');
        return;
      }
      setCurrentUser(data.user);
      localStorage.setItem('ridis_user', JSON.stringify(data.user));
      localStorage.setItem('ridis_last_activity', String(Date.now()));
      setLoginPassword('');
    } catch {
      setLoginError('Erro ao comunicar com o servidor.');
    }
  };

  const handleLogout = useCallback((reason?: string | React.MouseEvent) => {
    setCurrentUser(null);
    localStorage.removeItem('ridis_user');
    localStorage.removeItem('ridis_last_activity');
    if (typeof reason === 'string' && reason) {
      setLoginError(reason);
    }
  }, []);

  // Auto-logout after 5 minutes of inactivity
  useEffect(() => {
    if (!currentUser) return;

    let lastRecorded = Date.now();
    localStorage.setItem('ridis_last_activity', String(lastRecorded));

    const updateActivity = () => {
      const now = Date.now();
      // Throttle localStorage writes to once every 5 seconds
      if (now - lastRecorded > 5000) {
        lastRecorded = now;
        localStorage.setItem('ridis_last_activity', String(now));
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    for (const ev of events) {
      window.addEventListener(ev, updateActivity, { passive: true });
    }

    const intervalId = window.setInterval(() => {
      // Do not auto-logout while a heavy upload/migration is in progress
      if (formSaving || restoringDb || migratingReports || gitUpdating) {
        lastRecorded = Date.now();
        localStorage.setItem('ridis_last_activity', String(lastRecorded));
        return;
      }
      const storedLast = Number(localStorage.getItem('ridis_last_activity') || lastRecorded);
      if (Date.now() - storedLast >= INACTIVITY_TIMEOUT_MS) {
        handleLogout('Sessão expirada após 5 minutos de inatividade.');
      }
    }, 15000);

    return () => {
      for (const ev of events) {
        window.removeEventListener(ev, updateActivity);
      }
      window.clearInterval(intervalId);
    };
  }, [currentUser, formSaving, restoringDb, migratingReports, gitUpdating, INACTIVITY_TIMEOUT_MS, handleLogout]);

  // Open New / Edit / View Disk Modal
  const openNewDiscoModal = () => {
    setIsFormReadOnly(false);
    setEditingDisco(null);
    setFormFile(null);
    setFormError(null);
    setUploadProgress(null);
    setFormData({
      arquivo: fArquivo || '',
      remetente: '',
      data_entrada: new Date().toISOString().split('T')[0],
      ticket_num: '',
      id_disco: '',
      projeto: fProjeto || '',
      localizacao: fLocalizacao || '',
      tamanho_disco: '',
      marca: '',
      numero_serie: '',
      verificado: false,
      ticket_integracao: '',
      integrado: false,
      armazenado_servidor: false,
      total_imagens: 0,
      observacoes: '',
    });
    setIsFormOpen(true);
  };

  const openEditDiscoModal = (d: DiscoUsb) => {
    setIsFormReadOnly(false);
    setEditingDisco(d);
    setFormFile(null);
    setFormError(null);
    setUploadProgress(null);
    setFormData({
      arquivo: d.arquivo || '',
      remetente: d.remetente || '',
      data_entrada: d.data_entrada || '',
      ticket_num: d.ticket_num || '',
      id_disco: d.id_disco || '',
      projeto: d.projeto || '',
      localizacao: d.localizacao || '',
      tamanho_disco: d.tamanho_disco || '',
      marca: d.marca || '',
      numero_serie: d.numero_serie || '',
      verificado: Boolean(d.verificado),
      ticket_integracao: d.ticket_integracao || '',
      integrado: Boolean(d.integrado),
      armazenado_servidor: Boolean(d.armazenado_servidor),
      total_imagens: Number(d.total_imagens) || 0,
      observacoes: d.observacoes || '',
    });
    setIsFormOpen(true);
  };

  const openViewDiscoModal = (d: DiscoUsb) => {
    setIsFormReadOnly(true);
    setEditingDisco(d);
    setFormFile(null);
    setFormError(null);
    setUploadProgress(null);
    setFormData({
      arquivo: d.arquivo || '',
      remetente: d.remetente || '',
      data_entrada: d.data_entrada || '',
      ticket_num: d.ticket_num || '',
      id_disco: d.id_disco || '',
      projeto: d.projeto || '',
      localizacao: d.localizacao || '',
      tamanho_disco: d.tamanho_disco || '',
      marca: d.marca || '',
      numero_serie: d.numero_serie || '',
      verificado: Boolean(d.verificado),
      ticket_integracao: d.ticket_integracao || '',
      integrado: Boolean(d.integrado),
      armazenado_servidor: Boolean(d.armazenado_servidor),
      total_imagens: Number(d.total_imagens) || 0,
      observacoes: d.observacoes || '',
    });
    setIsFormOpen(true);
  };

  const safeParseJson = async (res: Response): Promise<any> => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return {
        error: `Erro HTTP ${res.status}: ${text.replace(/<[^>]+>/g, ' ').trim().slice(0, 140) || res.statusText}`,
      };
    }
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const step = 0x8000;
    for (let i = 0; i < bytes.length; i += step) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + step)));
    }
    return btoa(binary);
  };

  const compressBufferIfSupported = async (
    rawBuffer: ArrayBuffer
  ): Promise<{ buffer: ArrayBuffer; compressed: boolean }> => {
    if (typeof CompressionStream !== 'undefined') {
      try {
        const cs = new CompressionStream('gzip');
        const writer = cs.writable.getWriter();
        writer.write(new Uint8Array(rawBuffer));
        writer.close();
        const compressedBuffer = await new Response(cs.readable).arrayBuffer();
        if (compressedBuffer.byteLength < rawBuffer.byteLength) {
          return { buffer: compressedBuffer, compressed: true };
        }
      } catch {
        // Fallback to raw uncompressed buffer
      }
    }
    return { buffer: rawBuffer, compressed: false };
  };

  const handleSaveDisco = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);
    setUploadProgress(null);

    try {
      let uploadedRelatorioPath: string | null = null;

      if (formFile) {
        const chunkSize = Math.floor(1.5 * 1024 * 1024); // 1.5 MB raw per chunk + gzip compression
        const totalChunks = Math.max(1, Math.ceil(formFile.size / chunkSize));
        const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const pct = Math.round(((chunkIndex + 1) / totalChunks) * 100);
          setUploadProgress(
            totalChunks > 1
              ? `A transferir ficheiro para relatorios/ (${pct}%)...`
              : 'A transferir ficheiro para relatorios/...'
          );

          const start = chunkIndex * chunkSize;
          const end = Math.min(start + chunkSize, formFile.size);
          const slice = formFile.slice(start, end);
          const rawBuffer = await slice.arrayBuffer();
          const { buffer: payloadBuf, compressed } = await compressBufferIfSupported(rawBuffer);
          const chunkBase64 = arrayBufferToBase64(payloadBuf);

          const chunkRes = await fetch('/api/relatorios/upload-chunk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uploadId,
              chunkIndex,
              totalChunks,
              originalName: formFile.name,
              id_disco: formData.id_disco,
              ticket_num: formData.ticket_num,
              compressed,
              chunkBase64,
            }),
          });

          const chunkData = await safeParseJson(chunkRes);
          if (!chunkRes.ok) {
            const msg = chunkData.error || 'Erro ao carregar o ficheiro de relatório.';
            setFormError(msg);
            showFlash(msg, 'danger');
            return;
          }

          if (chunkData.done && chunkData.relatorio_path) {
            uploadedRelatorioPath = chunkData.relatorio_path;
          }
        }

        setUploadProgress('A indexar códigos de referência na base de dados SQLite...');
      }

      const url = editingDisco ? `/api/discos/${editingDisco.id}` : '/api/discos';
      const method = editingDisco ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          relatorio_uploaded_path: uploadedRelatorioPath,
        }),
      });
      const data = await safeParseJson(res);
      if (!res.ok) {
        const msg = data.error || 'Erro ao guardar o registo.';
        setFormError(msg);
        showFlash(msg, 'danger');
        return;
      }

      showFlash(data.message || 'Registo guardado com sucesso!', 'success');
      setIsFormOpen(false);
      fetchDiscos();
    } catch (err: any) {
      const msg = `Erro ao comunicar com o servidor: ${err?.message || 'verifique a ligação'}`;
      setFormError(msg);
      showFlash(msg, 'danger');
    } finally {
      setFormSaving(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteDisco = async (id: number) => {
    try {
      const res = await fetch(`/api/discos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        showFlash(data.error || 'Erro ao eliminar registo.', 'danger');
        return;
      }
      showFlash(data.message || 'Registo eliminado.', 'success');
      setConfirmDeleteId(null);
      fetchDiscos();
    } catch {
      showFlash('Erro ao eliminar registo.', 'danger');
    }
  };

  // CSV Import handler
  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    setCsvUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', csvFile);
      const res = await fetch('/api/importar-csv', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        showFlash(data.error || 'Erro na importação CSV.', 'danger');
        return;
      }
      showFlash(data.message, data.erros > 0 ? 'warning' : 'success');
      setIsCsvModalOpen(false);
      setCsvFile(null);
      fetchDiscos();
    } catch {
      showFlash('Erro ao importar ficheiro CSV.', 'danger');
    } finally {
      setCsvUploading(false);
    }
  };

  // User management handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newUserPassword,
          role: newUserRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showFlash(data.error || 'Erro ao criar utilizador.', 'danger');
        return;
      }
      showFlash(data.message, 'success');
      setNewUsername('');
      setNewUserPassword('');
      setNewUserRole('operador');
      fetchUsuarios();
    } catch {
      showFlash('Erro ao criar utilizador.', 'danger');
    }
  };

  const handleUpdateUserRole = async (userId: number, role: UserRole) => {
    try {
      const res = await fetch(`/api/usuarios/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, current_user_id: currentUser?.id }),
      });
      const data = await res.json();
      if (res.ok) {
        showFlash(data.message, 'success');
        fetchUsuarios();
      } else {
        showFlash(data.error || 'Erro ao alterar perfil.', 'danger');
      }
    } catch {
      showFlash('Erro ao comunicar com o servidor.', 'danger');
    }
  };

  const handleResetPassword = async (userId: number) => {
    const pwd = passwordInputs[userId];
    if (!pwd) return;
    const res = await fetch(`/api/usuarios/${userId}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    });
    const data = await res.json();
    if (res.ok) {
      showFlash(data.message, 'success');
      setPasswordInputs((prev) => ({ ...prev, [userId]: '' }));
    } else {
      showFlash(data.error || 'Erro ao atualizar palavra-passe.', 'danger');
    }
  };

  const handleToggleAdmin = async (userId: number) => {
    const res = await fetch(`/api/usuarios/${userId}/toggle-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_user_id: currentUser?.id }),
    });
    const data = await res.json();
    if (res.ok) {
      showFlash(data.message, 'success');
      fetchUsuarios();
    } else {
      showFlash(data.error || 'Erro ao alterar perfil.', 'danger');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const res = await fetch(`/api/usuarios/${userId}?current_user_id=${currentUser?.id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (res.ok) {
      showFlash(data.message, 'success');
      setConfirmDeleteUserId(null);
      fetchUsuarios();
    } else {
      showFlash(data.error || 'Erro ao eliminar utilizador.', 'danger');
    }
  };

  // Database Administration handlers (Admin Only)
  const handleCreateBackup = async (mode: 'sqlite' | 'full_json') => {
    if (!currentUser?.is_admin) return;
    setCreatingBackupMode(mode);
    try {
      const res = await fetch('/api/admin/db/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user-id': String(currentUser.id),
        },
        body: JSON.stringify({
          admin_user_id: currentUser.id,
          mode,
          include_reports: true,
        }),
      });
      const data = await safeParseJson(res);
      if (res.ok) {
        showFlash(data.message, 'success');
        fetchDbAdminStatus();
      } else {
        showFlash(data.error || 'Erro ao criar cópia de segurança.', 'danger');
      }
    } catch {
      showFlash('Erro ao comunicar com o servidor durante o backup.', 'danger');
    } finally {
      setCreatingBackupMode(null);
    }
  };

  const handleRestoreSavedBackup = async (filename: string) => {
    if (!currentUser?.is_admin) return;
    setRestoringDb(true);
    try {
      const res = await fetch(`/api/admin/db/backups/${encodeURIComponent(filename)}/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user-id': String(currentUser.id),
        },
        body: JSON.stringify({ admin_user_id: currentUser.id }),
      });
      const data = await safeParseJson(res);
      if (res.ok) {
        showFlash(data.message, 'success');
        setConfirmRestoreFilename(null);
        fetchDbAdminStatus();
        fetchDiscos();
      } else {
        showFlash(data.error || 'Erro ao restaurar base de dados.', 'danger');
      }
    } catch {
      showFlash('Erro ao comunicar com o servidor durante o restauro.', 'danger');
    } finally {
      setRestoringDb(false);
    }
  };

  const handleDeleteSavedBackup = async (filename: string) => {
    if (!currentUser?.is_admin) return;
    try {
      const res = await fetch(
        `/api/admin/db/backups/${encodeURIComponent(filename)}?admin_user_id=${currentUser.id}`,
        {
          method: 'DELETE',
          headers: { 'x-admin-user-id': String(currentUser.id) },
        }
      );
      const data = await safeParseJson(res);
      if (res.ok) {
        showFlash(data.message, 'success');
        setConfirmDeleteBackupFilename(null);
        fetchDbAdminStatus();
      } else {
        showFlash(data.error || 'Erro ao eliminar ficheiro de backup.', 'danger');
      }
    } catch {
      showFlash('Erro ao eliminar backup.', 'danger');
    }
  };

  const handleUploadRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.is_admin || !restoreUploadFile) return;
    setRestoringDb(true);
    setRestoreProgressText('A preparar compressão e envio...');

    try {
      // 3 MB raw slices compressed with GZIP (~250KB-500KB over the wire).
      // If any slice exceeds 1.4 MB after compression, it automatically splits into 1 MB sub-slices so no request ever triggers proxy 403!
      const chunkSize = 3 * 1024 * 1024;
      const maxWireBytes = Math.floor(1.4 * 1024 * 1024);
      const fallbackSubChunkSize = 1 * 1024 * 1024;
      const totalChunks = Math.max(1, Math.ceil(restoreUploadFile.size / chunkSize));
      const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      let nextChunkToClaim = 0;
      let completedChunks = 0;
      let fatalError: string | null = null;

      const sendSliceAtOffset = async (
        chunkIndex: number,
        byteOffset: number,
        payloadBuf: ArrayBuffer,
        compressed: boolean
      ): Promise<boolean> => {
        const chunkBase64 = arrayBufferToBase64(payloadBuf);
        let res: Response | null = null;
        let data: any = null;
        for (let attempt = 1; attempt <= 4; attempt++) {
          try {
            res = await fetch(
              `/api/admin/db/restore-chunk?admin_user_id=${currentUser.id}&admin_username=${encodeURIComponent(
                currentUser.username
              )}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-admin-user-id': String(currentUser.id),
                  'x-admin-username': currentUser.username,
                },
                body: JSON.stringify({
                  admin_user_id: currentUser.id,
                  admin_username: currentUser.username,
                  uploadId,
                  chunkIndex,
                  totalChunks,
                  offset: byteOffset,
                  compressed,
                  deferFinalize: true,
                  originalName: restoreUploadFile.name,
                  mode: restoreUploadMode,
                  chunkBase64,
                }),
              }
            );
            data = await safeParseJson(res);
            if (res.ok) return true;
          } catch {
            // Network glitch, wait and retry
          }
          if (attempt < 4) {
            await new Promise((r) => setTimeout(r, 900 * attempt));
          }
        }
        fatalError = data?.error || `Erro ao transferir bloco ${chunkIndex + 1}/${totalChunks}.`;
        return false;
      };

      const uploadSingleChunk = async (chunkIndex: number): Promise<boolean> => {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, restoreUploadFile.size);
        const rawBuffer = await restoreUploadFile.slice(start, end).arrayBuffer();
        const { buffer: payloadBuf, compressed } = await compressBufferIfSupported(rawBuffer);

        if (payloadBuf.byteLength <= maxWireBytes) {
          return sendSliceAtOffset(chunkIndex, start, payloadBuf, compressed);
        }

        // Fallback if slice didn't compress below 1.4MB: send in 1MB sub-slices
        for (let subOffset = 0; subOffset < rawBuffer.byteLength; subOffset += fallbackSubChunkSize) {
          const subEnd = Math.min(subOffset + fallbackSubChunkSize, rawBuffer.byteLength);
          const subRaw = rawBuffer.slice(subOffset, subEnd);
          const subComp = await compressBufferIfSupported(subRaw);
          const ok = await sendSliceAtOffset(chunkIndex, start + subOffset, subComp.buffer, subComp.compressed);
          if (!ok) return false;
        }
        return true;
      };

      const workerCount = Math.min(3, totalChunks);
      const workers = Array.from({ length: workerCount }, async () => {
        while (fatalError === null) {
          const myIndex = nextChunkToClaim++;
          if (myIndex >= totalChunks) break;
          const ok = await uploadSingleChunk(myIndex);
          if (!ok) break;
          completedChunks++;
          const pct = Math.round((completedChunks / totalChunks) * 100);
          setRestoreProgressText(
            `A transferir "${restoreUploadFile.name}" com compressão GZIP (${pct}% · ${completedChunks}/${totalChunks} blocos)...`
          );
        }
      });

      await Promise.all(workers);

      if (fatalError) {
        showFlash(fatalError, 'danger');
        return;
      }

      setRestoreProgressText('A aplicar e validar base de dados no servidor...');
      const finRes = await fetch(
        `/api/admin/db/restore-finalize?admin_user_id=${currentUser.id}&admin_username=${encodeURIComponent(
          currentUser.username
        )}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-user-id': String(currentUser.id),
            'x-admin-username': currentUser.username,
          },
          body: JSON.stringify({
            admin_user_id: currentUser.id,
            admin_username: currentUser.username,
            uploadId,
            originalName: restoreUploadFile.name,
            mode: restoreUploadMode,
          }),
        }
      );

      const finData = await safeParseJson(finRes);
      if (!finRes.ok) {
        showFlash(finData?.error || 'Erro ao finalizar o restauro da base de dados.', 'danger');
        return;
      }

      showFlash(finData.message || 'Base de dados migrada/restaurada com sucesso!', 'success');
      setRestoreUploadFile(null);
      setConfirmUploadRestore(false);
      fetchDbAdminStatus();
      fetchDiscos();
    } catch {
      showFlash('Erro ao comunicar com o servidor ao enviar ficheiro de base de dados.', 'danger');
    } finally {
      setRestoringDb(false);
      setRestoreProgressText(null);
    }
  };

  const handleBatchMigrateReports = async (fileList: FileList | null) => {
    if (!currentUser?.is_admin || !fileList || fileList.length === 0) return;

    const htmlFiles = Array.from(fileList).filter((f) => {
      const lower = f.name.toLowerCase();
      return (lower.endsWith('.html') || lower.endsWith('.htm')) && !f.name.startsWith('.');
    });

    if (htmlFiles.length === 0) {
      showFlash('Nenhum ficheiro .html ou .htm encontrado na seleção.', 'warning');
      return;
    }

    setMigratingReports(true);
    let migratedCount = 0;
    let linkedCount = 0;
    let totalTifCount = 0;
    let errorsCount = 0;

    try {
      const chunkSize = Math.floor(1.5 * 1024 * 1024); // 1.5 MB raw per chunk + gzip compression

      for (let i = 0; i < htmlFiles.length; i++) {
        const file = htmlFiles[i];
        const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));
        const uploadId = `${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`;

        let fileSuccess = false;
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const pct = Math.round(((chunkIndex + 1) / totalChunks) * 100);
          setMigrationReportsProgress({
            current: i + 1,
            total: htmlFiles.length,
            filename: file.name,
            pct,
          });

          const start = chunkIndex * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const rawBuffer = await file.slice(start, end).arrayBuffer();
          const { buffer: payloadBuf, compressed } = await compressBufferIfSupported(rawBuffer);
          const chunkBase64 = arrayBufferToBase64(payloadBuf);

          let res: Response | null = null;
          let data: any = null;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              res = await fetch(
                `/api/admin/db/migrate-report-chunk?admin_user_id=${currentUser.id}&admin_username=${encodeURIComponent(
                  currentUser.username
                )}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-admin-user-id': String(currentUser.id),
                    'x-admin-username': currentUser.username,
                  },
                  body: JSON.stringify({
                    admin_user_id: currentUser.id,
                    admin_username: currentUser.username,
                    uploadId,
                    chunkIndex,
                    totalChunks,
                    originalName: file.name,
                    compressed,
                    chunkBase64,
                  }),
                }
              );
              data = await safeParseJson(res);
              if (res.ok) break;
            } catch {
              // retry on network hiccup
            }
            if (attempt < 3) {
              await new Promise((r) => setTimeout(r, 1000));
            }
          }

          if (!res || !res.ok) {
            errorsCount++;
            break;
          }
          if (data.done) {
            fileSuccess = true;
            if (Array.isArray(data.linked_discos) && data.linked_discos.length > 0) {
              linkedCount += data.linked_discos.length;
            }
            totalTifCount += Number(data.indexed_tif) || 0;
          }
        }

        if (fileSuccess) {
          migratedCount++;
        }
      }

      showFlash(
        `Migração de relatórios concluída: ${migratedCount}/${htmlFiles.length} ficheiros .HTML transferidos (${linkedCount} associados a discos, ${totalTifCount.toLocaleString(
          'pt-PT'
        )} matrizes .TIF indexadas)${errorsCount > 0 ? ` · ${errorsCount} com erro` : ''}!`,
        errorsCount > 0 && migratedCount === 0 ? 'danger' : 'success'
      );
      fetchDbAdminStatus();
      fetchDiscos();
    } catch {
      showFlash('Erro durante a migração em lote de relatórios Snap2HTML.', 'danger');
    } finally {
      setMigratingReports(false);
      setMigrationReportsProgress(null);
    }
  };

  const handleAutoLinkReports = async (forceReindexAll = true) => {
    if (!currentUser?.is_admin) return;
    setAutoLinkingReports(true);
    try {
      const res = await fetch('/api/admin/db/auto-link-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user-id': String(currentUser.id),
        },
        body: JSON.stringify({
          admin_user_id: currentUser.id,
          force_reindex_all: forceReindexAll,
        }),
      });
      const data = await safeParseJson(res);
      if (res.ok) {
        showFlash(data.message, 'success');
        fetchDbAdminStatus();
        fetchDiscos();
      } else {
        showFlash(data.error || 'Erro ao associar relatórios.', 'danger');
      }
    } catch {
      showFlash('Erro ao comunicar com o servidor.', 'danger');
    } finally {
      setAutoLinkingReports(false);
    }
  };

  const handleManualLinkReport = async (filename: string) => {
    const discoId = Number(manualLinkSelection[filename] || 0);
    if (!currentUser?.is_admin || !discoId) {
      showFlash('Selecione primeiro o registo de disco na lista.', 'warning');
      return;
    }
    setLinkingReportFilename(filename);
    try {
      const res = await fetch('/api/admin/db/link-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user-id': String(currentUser.id),
        },
        body: JSON.stringify({
          admin_user_id: currentUser.id,
          disco_id: discoId,
          filename,
        }),
      });
      const data = await safeParseJson(res);
      if (res.ok) {
        showFlash(data.message, 'success');
        fetchDbAdminStatus();
        fetchDiscos();
      } else {
        showFlash(data.error || 'Erro ao associar relatório ao disco.', 'danger');
      }
    } catch {
      showFlash('Erro ao comunicar com o servidor.', 'danger');
    } finally {
      setLinkingReportFilename(null);
    }
  };

  const handleOptimizeDb = async () => {
    if (!currentUser?.is_admin) return;
    setOptimizingDb(true);
    try {
      const res = await fetch('/api/admin/db/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user-id': String(currentUser.id),
        },
        body: JSON.stringify({ admin_user_id: currentUser.id }),
      });
      const data = await safeParseJson(res);
      if (res.ok) {
        showFlash(data.message, 'success');
        fetchDbAdminStatus();
      } else {
        showFlash(data.error || 'Erro ao otimizar base de dados.', 'danger');
      }
    } catch {
      showFlash('Erro ao comunicar com o servidor.', 'danger');
    } finally {
      setOptimizingDb(false);
    }
  };

  const handleUpdateFromGitHub = async () => {
    if (!currentUser?.is_admin) return;
    setGitUpdating(true);
    setConfirmGitUpdate(false);
    setGitUpdateLogs(['A iniciar atualização automática a partir do GitHub...']);
    try {
      const res = await fetch('/api/admin/system/update-github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-user-id': String(currentUser.id),
        },
        body: JSON.stringify({
          admin_user_id: currentUser.id,
          repoUrl: gitRepoUrl.trim() || 'https://github.com/wsmigas/USB-REG.git',
          restartServer: gitRestartAfterUpdate,
        }),
      });
      const data = await safeParseJson(res);
      if (Array.isArray(data.logs)) {
        setGitUpdateLogs(data.logs);
      }
      if (res.ok) {
        showFlash(data.message || 'Site atualizado com sucesso a partir do GitHub!', 'success');
        if (gitRestartAfterUpdate) {
          setTimeout(() => {
            window.location.reload();
          }, 2800);
        }
      } else {
        showFlash(data.error || 'Erro ao atualizar a partir do GitHub.', 'danger');
      }
    } catch (e: any) {
      showFlash(`Erro ao comunicar com o servidor durante a atualização: ${e?.message || e}`, 'danger');
    } finally {
      setGitUpdating(false);
    }
  };

  const hasActiveFilters = Boolean(
    busca || fArquivo || fProjeto || fLocalizacao || fVerificado || fIntegrado || fArmazenado
  );

  const clearAllFilters = () => {
    setBusca('');
    setFArquivo('');
    setFProjeto('');
    setFLocalizacao('');
    setFVerificado('');
    setFIntegrado('');
    setFArmazenado('');
  };

  const buildExportCsvUrl = () => {
    const params = new URLSearchParams();
    if (busca) params.set('q', busca);
    if (fArquivo) params.set('f_arquivo', fArquivo);
    if (fProjeto) params.set('f_projeto', fProjeto);
    if (fLocalizacao) params.set('f_localizacao', fLocalizacao);
    if (fVerificado !== '') params.set('f_verificado', fVerificado);
    if (fIntegrado !== '') params.set('f_integrado', fIntegrado);
    if (fArmazenado !== '') params.set('f_armazenado', fArmazenado);
    const qs = params.toString();
    return `/api/exportar-csv${qs ? `?${qs}` : ''}`;
  };

  const formatNumber = (n: number) => n.toLocaleString('pt-PT');

  const getOtrsTicketUrl = (ticket: string) => {
    if (!ticket) return '#';
    const clean = String(ticket).replace(/^["']|["']$/g, '').trim();
    return `http://suporte.tt.pt/otrs/index.pl?Action=AgentTicketSearch;Subaction=Search;Fulltext=${encodeURIComponent(clean)};CheckTicketNumberAndRedirect=1`;
  };

  const formatDatePt = (dateStr: string) => {
    if (!dateStr) return '-';
    const s = String(dateStr).trim();
    const isoMatch = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (isoMatch) {
      return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }
    const dmyDash = s.match(/^(\d{2})-(\d{2})-(\d{4})/);
    if (dmyDash) {
      return `${dmyDash[1]}/${dmyDash[2]}/${dmyDash[3]}`;
    }
    return s;
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '-';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const LICENSE_FULL_TEXT = `TERMO DE LICENCIAMENTO PROPRIETÁRIO E DIREITOS DE AUTOR
================================================================================
RIDIS — Sistema de Gestão de Discos USB, Matrizes e Relatórios de Preservação Digital
================================================================================

AUTOR E TITULAR DOS DIREITOS DE AUTOR (COPYRIGHT):
José Miguel Magalhães
Todos os direitos reservados. Copyright (c) 2026 José Miguel Magalhães.

ENTIDADE LICENCIADA EXCLUSIVA:
DGLAB — Direção-Geral do Livro, dos Arquivos e das Bibliotecas
(República Portuguesa)

--------------------------------------------------------------------------------
1. CONCESSÃO DE LICENÇA DE USO EXCLUSIVO
--------------------------------------------------------------------------------
O Autor concede à DGLAB (Direção-Geral do Livro, dos Arquivos e das Bibliotecas)
uma licença não-transferível, intransmissível e restrita para a utilização, 
execução e exploração interna deste software (RIDIS) exclusivamente nas suas 
operações arquivísticas e infraestruturas institucionais oficiais.

--------------------------------------------------------------------------------
2. FINALIDADE ESTRITA E RESTRIÇÃO ABSOLUTA DE USO
--------------------------------------------------------------------------------
Esta aplicação e o seu respetivo código fonte destinam-se ÚNICA E EXCLUSIVAMENTE
a utilização no âmbito das funções da DGLAB.

É EXPRESSAMENTE PROIBIDA A UTILIZAÇÃO DESTE SOFTWARE, TOTAL OU PARCIALMENTE:
a) Para qualquer outro fim que não as atividades operacionais internas da DGLAB;
b) Por quaisquer terceiros, outras entidades públicas ou privadas, pessoas 
   singulares ou coletivas externas à DGLAB;
c) Em contextos comerciais, industriais, ou de prestação de serviços a terceiros.

--------------------------------------------------------------------------------
3. PROIBIÇÃO DE CÓPIA, DISTRIBUIÇÃO E SUBLICENCIAMENTO
--------------------------------------------------------------------------------
Sem a prévia autorização expressa e por escrito do Autor (José Miguel Magalhães),
é estritamente proibido:
a) Copiar, reproduzir, duplicar ou clonar o código fonte ou os binários desta 
   aplicação;
b) Distribuir, sublicenciar, ceder, emprestar, vender, alugar ou transferir 
   o software a quaisquer outras entidades;
c) Publicar o código fonte em repositórios públicos ou canais de distribuição 
   abertos.

--------------------------------------------------------------------------------
4. ENGENHARIA REVERSA E DESCOMPILAÇÃO
--------------------------------------------------------------------------------
É estritamente vedada a realização de descompilação, desmontagem, engenharia 
reversa ou qualquer tentativa de extração não autorizada do código fonte ou 
arquitetura dos componentes de software.

--------------------------------------------------------------------------------
5. ENQUADRAMENTO JURÍDICO E PROTEÇÃO LEGAL
--------------------------------------------------------------------------------
Este software está integralmente protegido pela legislação nacional portuguesa 
e internacional sobre Direitos de Autor e Propriedade Intelectual, nomeadamente:
- Código do Direito de Autor e dos Direitos Conexos (CDADC - Decreto-Lei n.º 63/85);
- Regime Jurídico da Proteção de Programas de Computador (Decreto-Lei n.º 252/94);
- Diretiva 2009/24/CE do Parlamento Europeu e do Conselho;
- Convenção de Berna para a Proteção das Obras Literárias e Artísticas.

Qualquer infração, cópia ilegítima ou utilização fora do âmbito exclusivo da 
DGLAB constitui violação de direitos de autor, sujeitando os infratores a 
responsabilidade civil e criminal.

--------------------------------------------------------------------------------
Data de Registo: 2026
Autor: José Miguel Magalhães
Organização Licenciada: DGLAB (Direção-Geral do Livro, dos Arquivos e das Bibliotecas)`;

  const renderLicenseModal = () => {
    if (!showLicenseModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
        <div
          className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden my-8 ${
            theme === 'dark'
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white border-b border-blue-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">Proteção Jurídica & Direitos de Autor</h2>
                <p className="text-xs text-blue-300">Termo de Licenciamento Proprietário e Exclusivo</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowLicenseModal(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
            {/* Key Entities Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                className={`p-3.5 rounded-xl border ${
                  theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  Autor & Titular dos Direitos
                </div>
                <div className="text-sm font-bold text-blue-400 mt-1">José Miguel Magalhães</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Todos os direitos reservados © 2026</div>
              </div>
              <div
                className={`p-3.5 rounded-xl border ${
                  theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                  Organização Licenciada
                </div>
                <div className="text-sm font-bold text-emerald-400 mt-1">DGLAB</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Direção-Geral do Livro, dos Arquivos e das Bibliotecas
                </div>
              </div>
            </div>

            {/* Critical Restriction Callout */}
            <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-red-300 text-xs">
                <span>⚠️</span>
                <span>Restrição Absoluta de Utilização e Finalidade</span>
              </div>
              <p className="text-red-200/90 leading-relaxed text-[11px]">
                Esta aplicação foi desenvolvida e licenciada <strong>única e exclusivamente para utilização interna na DGLAB</strong>.
                <strong> Não pode ser utilizada para mais nenhum fim</strong>, comercial, pessoal ou institucional,
                nem transferida ou disponibilizada a terceiros sem autorização prévia por escrito do autor.
              </p>
            </div>

            {/* Clauses */}
            <div className="space-y-3">
              <div
                className={`p-3 rounded-lg border ${
                  theme === 'dark' ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200 flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
                  1. Concessão de Licença Restrita
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Licença não-transferível, intransmissível e restrita às operações arquivísticas e patrimoniais da DGLAB.
                </p>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  theme === 'dark' ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200 flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
                  2. Proibição Estrita de Cópia e Distribuição
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  É proibida a reprodução, duplicação, distribuição, cedência, locação, sublicenciamento ou publicação do código fonte e dos binários.
                </p>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  theme === 'dark' ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200 flex items-center gap-1.5 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
                  3. Engenharia Reversa e Proteção Legal
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  É vedada a descompilação, engenharia reversa ou desassemblagem. Protegido pelo Código do Direito de Autor (Decreto-Lei n.º 63/85), Regime Jurídico de Programas de Computador (Decreto-Lei n.º 252/94) e Diretiva Europeia 2009/24/CE.
                </p>
              </div>
            </div>

            {/* Verbatim License Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>Texto Integral do Termo de Licenciamento (LICENSE)</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(LICENSE_FULL_TEXT);
                    setCopiedLicenseText(true);
                    setTimeout(() => setCopiedLicenseText(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 cursor-pointer text-xs"
                >
                  {copiedLicenseText ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Termo</span>
                    </>
                  )}
                </button>
              </div>
              <pre
                className={`p-3 rounded-lg border font-mono text-[10px] leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap select-all ${
                  theme === 'dark'
                    ? 'bg-slate-950 text-slate-300 border-slate-800'
                    : 'bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                {LICENSE_FULL_TEXT}
              </pre>
            </div>
          </div>

          {/* Footer */}
          <div
            className={`px-6 py-3 border-t flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="text-[11px] text-slate-500">
              RIDIS · Registo de Direitos de Autor 2026
            </div>
            <button
              type="button"
              onClick={() => setShowLicenseModal(false)}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render Login screen if logged out
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#10131a] text-slate-100 relative overflow-hidden">
        {/* Subtle technical grid background */}
        <div
          className="fixed inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(110, 168, 254, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(110, 168, 254, 0.06) 1px, transparent 1px)',
            backgroundSize: '42px 42px',
          }}
        />

        {/* Hard Disk Platter SVG Illustration */}
        <svg
          className="fixed -right-40 -bottom-40 w-[640px] h-[640px] opacity-80 pointer-events-none"
          viewBox="0 0 400 400"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="platterGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2a3040" />
              <stop offset="70%" stopColor="#1a1f2b" />
              <stop offset="100%" stopColor="#12151e" />
            </radialGradient>
            <linearGradient id="armGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3a4152" />
              <stop offset="100%" stopColor="#232833" />
            </linearGradient>
          </defs>
          <circle cx="200" cy="200" r="190" fill="url(#platterGrad)" stroke="#333c4d" strokeWidth="1" />
          <circle cx="200" cy="200" r="150" fill="none" stroke="#0d6efd" strokeWidth="0.6" opacity="0.25" />
          <circle cx="200" cy="200" r="115" fill="none" stroke="#0d6efd" strokeWidth="0.6" opacity="0.20" />
          <circle cx="200" cy="200" r="80" fill="none" stroke="#0d6efd" strokeWidth="0.6" opacity="0.16" />
          <circle cx="200" cy="200" r="45" fill="#1a1f2b" stroke="#333c4d" strokeWidth="1" />
          <circle cx="200" cy="200" r="14" fill="#0d6efd" opacity="0.55" />
          <circle cx="200" cy="200" r="5" fill="#e1e1e6" opacity="0.8" />
          <g transform="rotate(28 200 200)">
            <rect x="196" y="30" width="8" height="150" rx="4" fill="url(#armGrad)" />
            <circle cx="200" cy="30" r="13" fill="url(#armGrad)" stroke="#0d6efd" strokeWidth="1.2" opacity="0.9" />
          </g>
        </svg>

        <div className="relative z-10 flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-2xl">
            <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
              <HardDrive className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-center text-white tracking-tight">RIDIS</h1>
            <p className="text-xs text-slate-400 text-center mt-1 mb-6 leading-relaxed">
              Registo e Inventário de Discos USB e Matrizes
              <br />
              Direção-Geral do Livro, dos Arquivos e das Bibliotecas
            </p>

            {loginError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Utilizador</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="nome.utilizador"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Palavra-passe</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors cursor-pointer"
              >
                Entrar
              </button>
            </form>
          </div>
        </div>

        <footer className="relative z-10 text-center py-4 px-4 text-xs text-slate-500 space-y-1.5">
          <div>
            <strong className="text-slate-400">DGLAB</strong> · Direção-Geral do Livro, dos Arquivos e das Bibliotecas · Serviços Centrais
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
            <span>© 2026 <strong>José Miguel Magalhães</strong> · Licença Exclusiva DGLAB</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => setShowLicenseModal(true)}
              className="text-blue-400 hover:text-blue-300 underline font-medium cursor-pointer inline-flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Direitos de Autor & Termos de Uso
            </button>
          </div>
        </footer>
        {renderLicenseModal()}
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Banner / Header */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md ${
          theme === 'dark'
            ? 'bg-slate-900/80 border-slate-800'
            : 'bg-white/95 border-slate-200'
        }`}
      >
        <div className="max-w-[1440px] w-full mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          {/* Zone 1: Brand Banner (Login Logo + RIDIS + DGLAB Badge + Subtitle) */}
          <a
            href="#inventario"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('inventario');
            }}
            className="flex items-center gap-4 shrink-0"
          >
            <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0">
              <HardDrive className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-3xl font-extrabold tracking-tight leading-none ${
                    theme === 'dark' ? 'text-slate-200' : 'text-slate-900'
                  }`}
                >
                  RIDIS
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#0b1d3a] border border-blue-800/80 text-blue-200 text-xs font-bold tracking-wider uppercase">
                  DGLAB
                </span>
              </div>
              <p className={`text-sm mt-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Gestão de Discos USB e Matrizes de Digitalização
              </p>
            </div>
          </a>

          {/* Zone 2: Navigation Links */}
          <nav className="flex items-center gap-6 text-sm font-medium overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('inventario')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'inventario'
                  ? 'border-blue-500 text-blue-500 font-semibold'
                  : theme === 'dark'
                  ? 'border-transparent text-slate-400 hover:text-slate-100'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Inventário de Discos
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('usuarios')}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'usuarios'
                    ? 'border-blue-500 text-blue-500 font-semibold'
                    : theme === 'dark'
                    ? 'border-transparent text-slate-400 hover:text-slate-100'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Utilizadores
              </button>
            )}
            {isRootAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('admin_bd')}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'admin_bd'
                    ? 'border-blue-500 text-blue-500 font-semibold'
                    : theme === 'dark'
                    ? 'border-transparent text-slate-400 hover:text-slate-100'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Administração BD
              </button>
            )}
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {canEditOrDelete && (
              <button
                type="button"
                onClick={openNewDiscoModal}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Registo
              </button>
            )}

            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'border-slate-800 text-slate-300 hover:bg-slate-900'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div
              className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 whitespace-nowrap shrink-0 ${
                theme === 'dark'
                  ? 'bg-slate-900/90 border-slate-800 text-slate-200'
                  : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}
              title={`Sessão iniciada como ${currentUser.username} (${
                isAdmin ? 'Administrador' : isRevisor ? 'Revisor' : 'Operador'
              })`}
            >
              <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="font-semibold">{currentUser.username}</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                  isAdmin
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                    : isRevisor
                    ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                    : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                {isAdmin ? 'Admin' : isRevisor ? 'Revisor' : 'Operador'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title={`Terminar sessão (${currentUser.username})`}
              className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                theme === 'dark'
                  ? 'border-slate-800 text-slate-300 hover:bg-red-950/50 hover:border-red-800 hover:text-red-300'
                  : 'border-slate-200 text-slate-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6">
        {/* Flash Notification Banner */}
        {flashMessage && (
          <div
            className={`mb-5 px-4 py-3 rounded-lg border flex items-center justify-between text-sm ${
              flashMessage.type === 'success'
                ? theme === 'dark'
                  ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : flashMessage.type === 'warning'
                ? theme === 'dark'
                  ? 'bg-amber-950/70 border-amber-800 text-amber-200'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
                : theme === 'dark'
                ? 'bg-red-950/70 border-red-800 text-red-200'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <span>{flashMessage.text}</span>
            <button
              type="button"
              onClick={() => setFlashMessage(null)}
              className="p-1 opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: INVENTÁRIO DE DISCOS USB E MATRIZES */}
        {activeTab === 'inventario' && (
          <div className="space-y-6">

            {/* Statistics Grid (Single-Elevation, Tabular Numerals) */}
            <div
              className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 border rounded-xl divide-y md:divide-y-0 md:divide-x ${
                theme === 'dark'
                  ? 'bg-slate-900/60 border-slate-800 divide-slate-800'
                  : 'bg-white border-slate-200 divide-slate-200'
              }`}
            >
              <div className="p-4">
                <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Discos / Matrizes
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums mt-1">
                  {formatNumber(stats.total)}
                </div>
              </div>
              <div className="p-4">
                <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Total de Imagens
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums mt-1">
                  {formatNumber(stats.total_imagens)}
                </div>
              </div>
              <div className="p-4">
                <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Verificados (V)
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums mt-1">
                  {formatNumber(stats.verificado)}{' '}
                  <span className="text-sm font-normal text-emerald-500">{stats.pct_verificado}%</span>
                </div>
              </div>
              <div className="p-4">
                <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Integrados (I)
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums mt-1">
                  {formatNumber(stats.integrado)}{' '}
                  <span className="text-sm font-normal text-emerald-500">{stats.pct_integrado}%</span>
                </div>
              </div>
              <div className="p-4">
                <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  No Servidor (A)
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums mt-1">
                  {formatNumber(stats.armazenado)}{' '}
                  <span className="text-sm font-normal text-amber-500">{stats.pct_armazenado}%</span>
                </div>
              </div>
            </div>

            {/* Unified Filter & TIF Search Bar */}
            <div
              className={`p-4 rounded-xl border space-y-3 ${
                theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
                {/* Search Input */}
                <div className="lg:col-span-4 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Pesquisar disco, ticket ou código de referência PT-... (* ou ?)..."
                    className={`w-full pl-9 pr-8 py-2 rounded-lg border text-xs font-mono focus:outline-none focus:border-blue-500 ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                  {busca && (
                    <button
                      type="button"
                      onClick={() => setBusca('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Arquivo Filter */}
                <div className="lg:col-span-2">
                  <select
                    value={fArquivo}
                    onChange={(e) => setFArquivo(e.target.value)}
                    className={`w-full px-2.5 py-2 rounded-lg border text-xs focus:outline-none focus:border-blue-500 ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="">Todos Arquivos</option>
                    {Object.entries(arquivosMap).map(([sigla, nome]) => (
                      <option key={sigla} value={sigla}>
                        {sigla} — {nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Projeto Filter */}
                <div className="lg:col-span-2">
                  <select
                    value={fProjeto}
                    onChange={(e) => setFProjeto(e.target.value)}
                    className={`w-full px-2.5 py-2 rounded-lg border text-xs focus:outline-none focus:border-blue-500 ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="">Todos Projetos</option>
                    {projetosList.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Localização Filter */}
                <div className="lg:col-span-2">
                  <select
                    value={fLocalizacao}
                    onChange={(e) => setFLocalizacao(e.target.value)}
                    className={`w-full px-2.5 py-2 rounded-lg border text-xs focus:outline-none focus:border-blue-500 ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="">Todas Localizações</option>
                    {localizacoesList.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                {/* V / I / A Compact Filters */}
                <div className="lg:col-span-2 grid grid-cols-3 gap-1.5">
                  <select
                    value={fVerificado}
                    onChange={(e) => setFVerificado(e.target.value)}
                    title="Filtrar por Verificado (V)"
                    className={`px-2 py-2 rounded-lg border text-xs focus:outline-none focus:border-blue-500 ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="">V: Todos</option>
                    <option value="1">V: SIM</option>
                    <option value="0">V: NÃO</option>
                  </select>

                  <select
                    value={fIntegrado}
                    onChange={(e) => setFIntegrado(e.target.value)}
                    title="Filtrar por Integrado (I)"
                    className={`px-2 py-2 rounded-lg border text-xs focus:outline-none focus:border-blue-500 ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="">I: Todos</option>
                    <option value="1">I: SIM</option>
                    <option value="0">I: NÃO</option>
                  </select>

                  <select
                    value={fArmazenado}
                    onChange={(e) => setFArmazenado(e.target.value)}
                    title="Filtrar por Armazenado no Servidor (A)"
                    className={`px-2 py-2 rounded-lg border text-xs focus:outline-none focus:border-blue-500 ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="">A: Todos</option>
                    <option value="1">A: SIM</option>
                    <option value="0">A: NÃO</option>
                  </select>
                </div>
              </div>

              {/* Filter Legend & Quick TIF Search Shortcuts */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className={`flex items-center gap-3 flex-wrap ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>Exemplos pesquisa de documentos:</span>
                  <button
                    type="button"
                    onClick={() => setBusca('PT/TT/JC')}
                    className="font-mono text-blue-400 hover:underline cursor-pointer"
                  >
                    PT/TT/JC
                  </button>
                  <button
                    type="button"
                    onClick={() => setBusca('PT-TT-JC')}
                    className="font-mono text-blue-400 hover:underline cursor-pointer"
                  >
                    PT-TT-JC
                  </button>
                  <button
                    type="button"
                    onClick={() => setBusca('PT/ADPRT/*')}
                    className="font-mono text-blue-400 hover:underline cursor-pointer"
                  >
                    PT/ADPRT/*
                  </button>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-slate-600 text-white text-[9px] leading-none font-bold inline-flex items-center justify-center">
                      V
                    </span>
                    Verificado
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-slate-600 text-white text-[9px] leading-none font-bold inline-flex items-center justify-center">
                      I
                    </span>
                    Integrado
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-slate-600 text-white text-[9px] leading-none font-bold inline-flex items-center justify-center">
                      A
                    </span>
                    Armazenado no Servidor
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`font-mono tabular-nums ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {hasActiveFilters
                      ? `Filtros ativos (${formatNumber(stats.total)} registos encontrados)`
                      : `A mostrar ${discos.length} de ${formatNumber(stats.total)} registos`}
                  </span>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="text-red-400 hover:text-red-300 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Limpar filtros
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Disk Inventory List / Table */}
            {loadingDiscos ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className={`h-20 rounded-xl border animate-pulse ${
                      theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-100 border-slate-200'
                    }`}
                  />
                ))}
              </div>
            ) : discos.length === 0 ? (
              <div
                className={`p-12 rounded-xl border text-center ${
                  theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <p className="text-sm font-medium">
                  Nenhum registo encontrado para a combinação de filtros ou pesquisa selecionada.
                </p>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Experimente limpar os filtros ou registar um novo disco com relatório Snap2HTML.
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="px-4 py-2 rounded-lg border border-slate-700 text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Limpar Filtros
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={openNewDiscoModal}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Registar Novo Disco
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {discos.map((d) => (
                  <div
                    key={d.id}
                    className={`border rounded-xl overflow-hidden transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-900/60 border-slate-800 hover:border-blue-500/40'
                        : 'bg-white border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    {/* Top Row: 7 Columns */}
                    <div className="px-4 py-3 grid grid-cols-1 lg:grid-cols-[1fr_2.2fr_1.7fr_1.8fr_auto_2.6fr_auto] gap-3 items-center text-xs">
                      {/* 1. Arquivo e Remetente */}
                      <div className="min-w-0">
                        <div
                          className="font-bold text-sm truncate"
                          title={arquivosMap[d.arquivo] || d.arquivo || '-'}
                        >
                          {d.arquivo || '-'}
                        </div>
                        <div className={`mt-0.5 truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                          {d.remetente || '-'}
                        </div>
                      </div>

                      {/* 2. Data e Ticket de Envio */}
                      <div className="min-w-0">
                        <div className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                          {formatDatePt(d.data_entrada)}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
                          <span className={`shrink-0 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            Ticket de envio:
                          </span>
                          {d.ticket_num ? (
                            <a
                              href={getOtrsTicketUrl(d.ticket_num)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`Abrir ticket ${d.ticket_num} no OTRS (nova aba)`}
                              className="font-bold font-mono text-[#6ea8fe] hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>{d.ticket_num}</span>
                              <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
                            </a>
                          ) : (
                            <span>-</span>
                          )}
                        </div>
                      </div>

                      {/* 3. ID do Disco, Projeto e Localização */}
                      <div className="min-w-0">
                        <div>
                          <button
                            type="button"
                            onClick={() => openViewDiscoModal(d)}
                            className="font-bold text-sm text-[#6ea8fe] hover:underline text-left cursor-pointer"
                            title="Clique para ver os detalhes do disco (modo leitura)"
                          >
                            {d.id_disco || 'Sem ID'}
                          </button>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {d.projeto && (
                            <span className="px-2 py-0.5 rounded bg-[#0d6efd] text-white text-[11px] font-semibold">
                              Proj: {d.projeto}
                            </span>
                          )}
                          {d.localizacao && (
                            <span className={`inline-flex items-center gap-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              Localização:
                              <span className="px-2 py-0.5 rounded bg-[#0d6efd] text-white text-[11px] font-semibold">
                                {d.localizacao}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 4. Capacidade | Marca e S/N */}
                      <div className="min-w-0">
                        <div className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                          {d.tamanho_disco || '-'} | {d.marca || '-'}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1">
                          <span className={`shrink-0 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                            S/N:
                          </span>
                          {d.numero_serie ? (
                            <button
                              type="button"
                              onClick={() => handleCopy(d.numero_serie, `sn-${d.id}`)}
                              className="font-mono hover:text-blue-400 inline-flex items-center gap-1 cursor-pointer select-text text-left"
                              title="Clique para copiar o número de série"
                            >
                              <span>{d.numero_serie}</span>
                              {copiedKey === `sn-${d.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                              ) : (
                                <Copy className="w-2.5 h-2.5 opacity-40 hover:opacity-100 shrink-0" />
                              )}
                            </button>
                          ) : (
                            <span>-</span>
                          )}
                        </div>
                      </div>

                      {/* 5. Estado V · I · A (Circular Green/Red Indicators) */}
                      <div className="flex items-center gap-1 pr-2">
                        <span
                          title={`Verificado: ${d.verificado ? 'Sim' : 'Não'}`}
                          className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] leading-none font-bold text-white select-none ${
                            d.verificado ? 'bg-[#198754]' : 'bg-[#dc3545]'
                          }`}
                        >
                          V
                        </span>
                        <span
                          title={`Integrado: ${d.integrado ? 'Sim' : 'Não'}`}
                          className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] leading-none font-bold text-white select-none ${
                            d.integrado ? 'bg-[#198754]' : 'bg-[#dc3545]'
                          }`}
                        >
                          I
                        </span>
                        <span
                          title={`Armazenado no Servidor: ${d.armazenado_servidor ? 'Sim' : 'Não'}`}
                          className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] leading-none font-bold text-white select-none ${
                            d.armazenado_servidor ? 'bg-[#198754]' : 'bg-[#dc3545]'
                          }`}
                        >
                          A
                        </span>
                      </div>

                      {/* 6. Ticket de Integração e Total de img */}
                      <div className="min-w-0">
                        {d.ticket_integracao && (
                          <div className="mb-0.5 flex flex-wrap items-baseline gap-x-1.5">
                            <span className={`shrink-0 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                              Ticket de integração:
                            </span>
                            <a
                              href={getOtrsTicketUrl(d.ticket_integracao)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold font-mono text-[#6ea8fe] hover:underline inline-flex items-center gap-1 cursor-pointer"
                              title={`Abrir ticket de integração ${d.ticket_integracao} no OTRS (nova aba)`}
                            >
                              <span>{d.ticket_integracao}</span>
                              <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
                            </a>
                          </div>
                        )}
                        <div className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
                          Total de img: {d.total_imagens || 0}
                        </div>
                      </div>

                      {/* 7. Ações (Ícones à direita conforme imagem) */}
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {d.relatorio_path && (
                          <button
                            type="button"
                            onClick={() => {
                              setInspectModalDisco(d);
                              setInspectMode('index');
                              setInspectQuery('');
                            }}
                            className="px-2 py-1 rounded border border-[#0dcaf0] text-[#0dcaf0] hover:bg-[#0dcaf0]/15 transition-colors cursor-pointer"
                            title="Abrir Relatório / Índice do Disco"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canEditOrDelete && (
                          <button
                            type="button"
                            onClick={() => openEditDiscoModal(d)}
                            className="px-2 py-1 rounded border border-[#ffc107] text-[#ffc107] hover:bg-[#ffc107]/15 transition-colors cursor-pointer"
                            title="Editar Registo"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canEditOrDelete && (
                          <>
                            {confirmDeleteId === d.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDisco(d.id)}
                                  className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer"
                                >
                                  Sim
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 rounded border border-slate-600 text-xs cursor-pointer"
                                >
                                  Não
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(d.id)}
                                className="px-2 py-1 rounded border border-[#dc3545] text-[#dc3545] hover:bg-[#dc3545]/15 transition-colors cursor-pointer"
                                title="Eliminar Registo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Highlighted Document Reference Matches Row when searching by Cota / Código de Referência */}
                    {d.matched_files && d.matched_files.length > 0 && (
                      <div
                        className={`px-4 py-2 border-t text-xs flex flex-wrap items-center justify-between gap-2 ${
                          theme === 'dark'
                            ? 'bg-blue-950/30 border-white/10'
                            : 'bg-blue-50/70 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[#6ea8fe]">
                            Documentos / Códigos de Referência encontrados ({d.matched_files_total}):
                          </span>
                          <span className="font-mono text-slate-300">
                            {d.matched_files.slice(0, 6).join(' · ')}
                            {(d.matched_files_total || 0) > 6 &&
                              ` · (+${(d.matched_files_total || 0) - 6} mais)`}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setInspectModalDisco(d);
                            setInspectMode('index');
                            setInspectQuery(busca);
                          }}
                          className="text-[#6ea8fe] hover:underline font-medium shrink-0 cursor-pointer"
                        >
                          Ver todos os documentos correspondentes →
                        </button>
                      </div>
                    )}

                    {/* Bottom Row: Observações (Full-width strip with comment icon, exactly as in screenshot) */}
                    {d.observacoes && (
                      <div
                        className={`px-4 py-2 border-t text-xs flex items-center gap-2 ${
                          theme === 'dark'
                            ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <MessageSquareText className="w-3.5 h-3.5 shrink-0 opacity-75" />
                        <span>{d.observacoes}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Pagination / Load Next 25 Records Footer */}
                <div
                  className={`p-4 border rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs ${
                    theme === 'dark'
                      ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <div>
                    A mostrar <strong className={theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}>{formatNumber(discos.length)}</strong> de{' '}
                    <strong className={theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}>{formatNumber(stats.total)}</strong> registos
                  </div>

                  {discos.length < stats.total && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setVisibleLimit((prev) => prev + 25)}
                        disabled={loadingDiscos}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors cursor-pointer"
                      >
                        Ver mais 25 registos (+{Math.min(25, stats.total - discos.length)})
                      </button>
                      {stats.total - discos.length > 25 && (
                        <button
                          type="button"
                          onClick={() => setVisibleLimit(stats.total)}
                          disabled={loadingDiscos}
                          className={`px-3 py-2 rounded-lg border font-medium transition-colors cursor-pointer ${
                            theme === 'dark'
                              ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                              : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          Ver todos ({formatNumber(stats.total)})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: GESTÃO DE UTILIZADORES (ADMIN) */}
        {activeTab === 'usuarios' && isAdmin && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-500" />
                Gestão de Utilizadores
              </h1>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Administração de contas de acesso (Administradores, Revisores e Operadores) gravadas na tabela{' '}
                <span className="font-mono">usuarios</span>.
              </p>
            </div>

            {/* Novo Utilizador Card */}
            <div
              className={`p-5 rounded-xl border ${
                theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <h2 className="text-sm font-semibold mb-4">Novo Utilizador</h2>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium mb-1">Utilizador</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                    placeholder="ex: m.silva"
                    className={`w-full px-3 py-2 rounded-lg border text-xs ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-800 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium mb-1">Palavra-passe</label>
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className={`w-full px-3 py-2 rounded-lg border text-xs ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-800 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-xs font-medium mb-1">Perfil de Acesso</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-800 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="operador">Operador (Apenas Consulta)</option>
                    <option value="revisor">Revisor (Ver, Editar e Apagar)</option>
                    <option value="admin">Administrador (Acesso e Gestão Total)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="w-full py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Criar
                  </button>
                </div>
              </form>
            </div>

            {/* Lista de Utilizadores */}
            <div
              className={`border rounded-xl overflow-hidden ${
                theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr
                    className={`border-b text-xs font-semibold ${
                      theme === 'dark'
                        ? 'bg-slate-900/90 border-slate-800 text-slate-400'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <th className="py-3 px-4">Utilizador</th>
                    <th className="py-3 px-4">Perfil</th>
                    <th className="py-3 px-4">Criado em</th>
                    <th className="py-3 px-4">Redefinir Palavra-passe</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-xs ${theme === 'dark' ? 'divide-slate-800/80' : 'divide-slate-200'}`}>
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 px-4 font-semibold">{u.username}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              u.role === 'admin'
                                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                                : u.role === 'revisor'
                                ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                                : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {u.role === 'admin' ? 'Administrador' : u.role === 'revisor' ? 'Revisor' : 'Operador'}
                          </span>
                          {u.id !== currentUser.id && (
                            <select
                              value={u.role || (u.is_admin ? 'admin' : 'operador')}
                              onChange={(e) => handleUpdateUserRole(u.id, e.target.value as UserRole)}
                              className={`px-2 py-1 rounded border text-[11px] cursor-pointer ${
                                theme === 'dark'
                                  ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                                  : 'bg-slate-50 border-slate-300 text-slate-700 hover:border-slate-400'
                              }`}
                              title="Alterar perfil do utilizador"
                            >
                              <option value="operador">Operador</option>
                              <option value="revisor">Revisor</option>
                              <option value="admin">Administrador</option>
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-slate-400">{u.created_at}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 max-w-xs">
                          <input
                            type="password"
                            placeholder="Nova palavra-passe"
                            value={passwordInputs[u.id] || ''}
                            onChange={(e) =>
                              setPasswordInputs((prev) => ({ ...prev, [u.id]: e.target.value }))
                            }
                            className={`flex-1 px-2.5 py-1.5 rounded border text-xs ${
                              theme === 'dark'
                                ? 'bg-slate-950 border-slate-800 text-slate-100'
                                : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleResetPassword(u.id)}
                            className="p-1.5 rounded border border-amber-700/60 text-amber-400 hover:bg-amber-950/40 cursor-pointer"
                            title="Atualizar palavra-passe"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {u.id !== currentUser.id && (
                          <>
                            {confirmDeleteUserId === u.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="px-2 py-1 rounded bg-red-600 text-white text-xs font-semibold cursor-pointer"
                                >
                                  Confirmar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteUserId(null)}
                                  className="px-2 py-1 rounded border border-slate-700 text-xs cursor-pointer"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteUserId(u.id)}
                                className="p-1.5 rounded border border-red-800/50 text-red-400 hover:bg-red-950/40 cursor-pointer"
                                title="Eliminar utilizador"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: MÓDULO DE ADMINISTRAÇÃO DA BASE DE DADOS (EXCLUSIVO PARA O LOGIN ADMIN) */}
        {activeTab === 'admin_bd' && currentUser.username.toLowerCase() === 'admin' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
                  <Database className="w-6 h-6 text-blue-500" />
                  Administração da Base de Dados Local — Backup e Restauro
                </h1>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Módulo exclusivo para o login <span className="font-mono font-semibold">admin</span> · Gestão de cópias de segurança, restauro de snapshots e
                  manutenção da base de dados SQLite (<span className="font-mono">gestao_discos.db</span>) e relatórios (
                  <span className="font-mono">relatorios/</span>).
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href="/api/exportar-template"
                  className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    theme === 'dark'
                      ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300'
                      : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  Template CSV
                </a>
                <a
                  href={buildExportCsvUrl()}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    theme === 'dark'
                      ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-emerald-400'
                      : 'border-slate-200 bg-white hover:bg-slate-100 text-emerald-700'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Exportar CSV
                </a>
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(true)}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    theme === 'dark'
                      ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-amber-400'
                      : 'border-slate-200 bg-white hover:bg-slate-100 text-amber-700'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importar CSV
                </button>

                <button
                  type="button"
                  onClick={handleOptimizeDb}
                  disabled={optimizingDb}
                  className={`px-3.5 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    theme === 'dark'
                      ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-emerald-400'
                      : 'border-slate-200 bg-white hover:bg-slate-100 text-emerald-700'
                  }`}
                >
                  <ShieldCheck className={`w-4 h-4 ${optimizingDb ? 'animate-pulse' : ''}`} />
                  {optimizingDb ? 'A Compactar & Otimizar SQLite...' : 'Compactar Códigos de Referência & Otimizar (VACUUM)'}
                </button>

                <button
                  type="button"
                  onClick={fetchDbAdminStatus}
                  disabled={dbAdminLoading}
                  className={`px-3.5 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    theme === 'dark'
                      ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300'
                      : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${dbAdminLoading ? 'animate-spin' : ''}`} />
                  Atualizar Estado
                </button>
              </div>
            </div>

            {/* Database Metrics Summary */}
            <div
              className={`grid grid-cols-2 md:grid-cols-5 border rounded-xl divide-y md:divide-y-0 md:divide-x ${
                theme === 'dark'
                  ? 'bg-slate-900/60 border-slate-800 divide-slate-800'
                  : 'bg-white border-slate-200 divide-slate-200'
              }`}
            >
              <div className="p-4">
                <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Ficheiro SQLite (gestao_discos.db)
                </div>
                <div className="text-xl font-bold font-mono tabular-nums mt-1">
                  {formatBytes(dbAdminStatus?.db_size_bytes || 0)}
                </div>
                <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                  Integridade: {dbAdminStatus?.integrity_status || 'ok'}
                </div>
              </div>

              <div className="p-4">
                <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Tabela discos_usb
                </div>
                <div className="text-xl font-bold font-mono tabular-nums mt-1">
                  {formatNumber(dbAdminStatus?.counts.discos_usb || 0)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">registos de discos</div>
              </div>

              <div className="p-4">
                <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Tabela relatorio_ficheiros
                </div>
                <div className="text-xl font-bold font-mono tabular-nums mt-1 text-blue-400">
                  {formatNumber(dbAdminStatus?.counts.relatorio_ficheiros || 0)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">códigos de referência indexados</div>
              </div>

              <div className="p-4">
                <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Pasta Local relatorios/
                </div>
                <div className="text-xl font-bold font-mono tabular-nums mt-1">
                  {formatNumber(dbAdminStatus?.counts.relatorios_html || 0)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {formatBytes(dbAdminStatus?.counts.relatorios_size_bytes || 0)} em HTML
                </div>
              </div>

              <div className="p-4">
                <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Snapshots em backups/
                </div>
                <div className="text-xl font-bold font-mono tabular-nums mt-1 text-amber-400">
                  {formatNumber(dbAdminStatus?.backups.length || 0)}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Últ. mod: {dbAdminStatus?.db_modified_at || '-'}
                </div>
              </div>
            </div>

            {/* GitHub 1-Click Auto-Update Banner (https://github.com/wsmigas/USB-REG.git) */}
            <div
              className={`p-5 rounded-xl border space-y-3 ${
                theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 text-blue-400 ${gitUpdating ? 'animate-spin' : ''}`} />
                    Atualização Automática do Site via GitHub (Sem SSH)
                  </h2>
                  <p className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Sincroniza o código com o repositório GitHub e recompila a aplicação mantendo{' '}
                    <span className="font-mono">gestao_discos.db</span>,{' '}
                    <span className="font-mono">relatorios/</span> e{' '}
                    <span className="font-mono">backups/</span> 100% intactos.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="text"
                    value={gitRepoUrl}
                    onChange={(e) => setGitRepoUrl(e.target.value)}
                    disabled={gitUpdating}
                    className={`w-72 px-3 py-2 rounded-lg border text-xs font-mono ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                    placeholder="https://github.com/wsmigas/USB-REG.git"
                  />

                  <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={gitRestartAfterUpdate}
                      onChange={(e) => setGitRestartAfterUpdate(e.target.checked)}
                      disabled={gitUpdating}
                    />
                    <span>Reiniciar servidor após atualizar</span>
                  </label>

                  {!confirmGitUpdate ? (
                    <button
                      type="button"
                      onClick={() => setConfirmGitUpdate(true)}
                      disabled={gitUpdating}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${gitUpdating ? 'animate-spin' : ''}`} />
                      {gitUpdating ? 'A Atualizar Site...' : 'Atualizar Site do GitHub'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleUpdateFromGitHub}
                        disabled={gitUpdating}
                        className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        Confirmar Atualização
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmGitUpdate(false)}
                        disabled={gitUpdating}
                        className="px-3 py-2 rounded-lg border border-slate-700 text-xs cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {gitUpdateLogs && gitUpdateLogs.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto space-y-1">
                  {gitUpdateLogs.map((line, idx) => (
                    <div key={idx} className="whitespace-pre-wrap break-all">
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Two-Column Action Panels: Backup vs Restore */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Panel 1: Criar e Descarregar Cópia de Segurança (Backup) */}
              <div
                className={`p-5 rounded-xl border space-y-4 ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Archive className="w-4 h-4 text-blue-400" />
                    1. Cópia de Segurança (Backup)
                  </h2>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Crie um ponto de restauro local na pasta <span className="font-mono">backups/</span> do servidor ou
                    descarregue uma cópia diretamente para o seu computador.
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div className="text-xs font-semibold text-slate-400">
                    Guardar Ponto de Restauro da Base de Dados no Servidor (<span className="font-mono">backups/</span>):
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleCreateBackup('sqlite')}
                      disabled={creatingBackupMode !== null}
                      className="w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Database className="w-4 h-4" />
                      {creatingBackupMode === 'sqlite' ? 'A criar Snapshot...' : 'Criar Snapshot SQLite (.db)'}
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-400">
                    Descarregar Base de Dados para o Computador:
                  </div>
                  <div>
                    <a
                      href={`/api/admin/db/download-sqlite?admin_user_id=${currentUser.id}`}
                      className={`w-full px-4 py-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                        theme === 'dark'
                          ? 'border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200'
                          : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <Download className="w-4 h-4 text-blue-400" />
                      Descarregar Base de Dados SQLite (.db)
                    </a>
                  </div>
                </div>
              </div>

              {/* Panel 2: Migrar Base Antiga / Restaurar a partir de Ficheiro Externo */}
              <div
                className={`p-5 rounded-xl border space-y-4 ${
                  theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    2. Migrar Base Antiga (<span className="font-mono">gestao_discos.db</span>) ou Restaurar Backup
                  </h2>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Carregue o ficheiro <span className="font-mono">gestao_discos.db</span> da sua aplicação antiga (ou um
                    backup <span className="font-mono">.db</span>). O envio é feito em blocos seguros com compressão GZIP.
                  </p>
                </div>

                <form onSubmit={handleUploadRestore} className="space-y-3 pt-1">
                  <div
                    className={`p-3.5 rounded-lg border ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".db,.sqlite,.sqlite3"
                      onChange={(e) => {
                        setRestoreUploadFile(e.target.files?.[0] || null);
                        setConfirmUploadRestore(false);
                      }}
                      className="block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-500 cursor-pointer"
                    />
                  </div>

                  {restoreUploadFile && !restoreUploadFile.name.toLowerCase().endsWith('.json') && (
                    <div
                      className={`p-3 rounded-lg border text-xs space-y-2 ${
                        theme === 'dark' ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-slate-300">Modo de Migração SQLite:</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label
                          className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer ${
                            restoreUploadMode === 'replace'
                              ? 'border-amber-500 bg-amber-500/10 text-amber-200'
                              : 'border-slate-800 text-slate-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="restore_mode"
                            checked={restoreUploadMode === 'replace'}
                            onChange={() => setRestoreUploadMode('replace')}
                            className="mt-0.5"
                          />
                          <div>
                            <div className="font-semibold">Substituir Tudo (Integral)</div>
                            <div className="text-[11px] opacity-80">
                              Substitui os registos atuais pelos registos da base antiga.
                            </div>
                          </div>
                        </label>

                        <label
                          className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer ${
                            restoreUploadMode === 'merge'
                              ? 'border-blue-500 bg-blue-500/10 text-blue-200'
                              : 'border-slate-800 text-slate-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="restore_mode"
                            checked={restoreUploadMode === 'merge'}
                            onChange={() => setRestoreUploadMode('merge')}
                            className="mt-0.5"
                          />
                          <div>
                            <div className="font-semibold">Fundir / Adicionar Registos</div>
                            <div className="text-[11px] opacity-80">
                              Mantém os registos atuais e importa/atualiza os da base antiga.
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {restoreProgressText && (
                    <div className="p-2.5 rounded-lg bg-blue-950/50 border border-blue-800 text-blue-200 text-xs flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>{restoreProgressText}</span>
                    </div>
                  )}

                  {restoreUploadFile && !confirmUploadRestore && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setConfirmUploadRestore(true)}
                        className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {restoreUploadMode === 'merge' ? 'Migrar e Fundir' : 'Restaurar / Migrar'} &quot;
                        {restoreUploadFile.name}&quot;
                      </button>
                    </div>
                  )}

                  {restoreUploadFile && confirmUploadRestore && (
                    <div className="p-3 rounded-lg border border-amber-700/80 bg-amber-950/40 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <span className="text-amber-200 font-medium">
                        {restoreUploadMode === 'merge'
                          ? `Confirmar a importação/fusão dos registos de "${restoreUploadFile.name}"?`
                          : `Confirmar a substituição dos dados atuais pelo ficheiro "${restoreUploadFile.name}"?`}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={restoringDb}
                          className="px-3.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold cursor-pointer"
                        >
                          {restoringDb ? 'A Processar...' : 'Confirmar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmUploadRestore(false)}
                          className="px-3 py-1.5 rounded border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>

            {/* Panel 3: Migração em Lote de Relatórios Snap2HTML (relatorios/*.html) da Base Antiga */}
            <div
              className={`p-5 rounded-xl border space-y-5 ${
                theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-[#6ea8fe]" />
                    3. Migração da Pasta de Relatórios Antiga (<span className="font-mono">relatorios/*.html</span>)
                  </h2>
                  <p className={`text-xs mt-1 max-w-3xl ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Depois de migrar a base de dados (<span className="font-mono">gestao_discos.db</span> ou{' '}
                    <span className="font-mono">.csv</span>), carregue aqui todos os relatórios Snap2HTML da pasta{' '}
                    <span className="font-mono">relatorios/</span> antiga de uma só vez. O sistema preserva o nome
                    original de cada ficheiro, liga-o automaticamente ao respetivo disco e indexa todas as matrizes{' '}
                    <span className="font-mono">.TIF</span>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Select multiple .html files */}
                  <label
                    className={`px-3.5 py-2 rounded-lg bg-[#0d6efd] hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      migratingReports ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Selecionar Ficheiros .HTML (Lote)
                    <input
                      type="file"
                      accept=".html,.htm"
                      multiple
                      disabled={migratingReports}
                      onChange={(e) => {
                        handleBatchMigrateReports(e.target.files);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>

                  {/* Select entire relatorios/ directory */}
                  <label
                    className={`px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      migratingReports ? 'opacity-50 pointer-events-none' : ''
                    } ${
                      theme === 'dark'
                        ? 'border-blue-500/50 bg-blue-950/30 hover:bg-blue-950/60 text-blue-300'
                        : 'border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700'
                    }`}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Selecionar Pasta relatorios/ Inteira
                    <input
                      type="file"
                      multiple
                      disabled={migratingReports}
                      {...({ webkitdirectory: '', directory: '' } as any)}
                      onChange={(e) => {
                        handleBatchMigrateReports(e.target.files);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => handleAutoLinkReports(true)}
                    disabled={autoLinkingReports || migratingReports}
                    className={`px-3.5 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                      theme === 'dark'
                        ? 'border-slate-700 bg-slate-950 hover:bg-slate-800 text-slate-200'
                        : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                    title="Procura correspondências automáticas entre os ficheiros em relatorios/ e os discos registados e reindexa todos os ficheiros .TIF"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${autoLinkingReports ? 'animate-spin' : ''}`} />
                    {autoLinkingReports ? 'A Associar e Indexar...' : 'Associar & Reindexar Tudo'}
                  </button>
                </div>
              </div>

              {/* Progress bar when batch migrating HTML files */}
              {migrationReportsProgress && (
                <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs text-blue-200">
                    <span className="font-semibold flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />A migrar relatório{' '}
                      {migrationReportsProgress.current} de {migrationReportsProgress.total}:{' '}
                      <span className="font-mono text-white">{migrationReportsProgress.filename}</span>
                    </span>
                    <span className="font-mono font-bold">
                      {Math.round(
                        (((migrationReportsProgress.current - 1 + migrationReportsProgress.pct / 100) /
                          migrationReportsProgress.total) *
                          100)
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-[#0d6efd] transition-all duration-200"
                      style={{
                        width: `${Math.round(
                          (((migrationReportsProgress.current - 1 + migrationReportsProgress.pct / 100) /
                            migrationReportsProgress.total) *
                            100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Migration Diagnostics Summary */}
              {dbAdminStatus?.migration_diagnostics && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Box 1: Linked & Ready */}
                  <div
                    className={`p-3.5 rounded-lg border ${
                      theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="text-xs text-slate-400">Relatórios Associados e Prontos</div>
                    <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                      {dbAdminStatus.migration_diagnostics.linked_ok_count} discos com relatório OK
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Ficheiro <span className="font-mono">.html</span> presente em{' '}
                      <span className="font-mono">relatorios/</span>
                    </div>
                  </div>

                  {/* Box 2: Missing HTML files referenced by DB */}
                  <div
                    className={`p-3.5 rounded-lg border ${
                      dbAdminStatus.migration_diagnostics.missing_reports.length > 0
                        ? 'bg-amber-950/25 border-amber-700/60'
                        : theme === 'dark'
                        ? 'bg-slate-950/60 border-slate-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="text-xs text-slate-400">Relatórios Aguardando Upload (.html em falta)</div>
                    <div
                      className={`text-lg font-bold font-mono mt-0.5 ${
                        dbAdminStatus.migration_diagnostics.missing_reports.length > 0
                          ? 'text-amber-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {dbAdminStatus.migration_diagnostics.missing_reports.length} ficheiros em falta
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {dbAdminStatus.migration_diagnostics.missing_reports.length > 0
                        ? 'Carregue a pasta relatorios/ antiga acima para completar'
                        : 'Todos os relatórios referenciados na BD estão presentes'}
                    </div>
                  </div>

                  {/* Box 3: Unlinked HTML files in relatorios/ */}
                  <div
                    className={`p-3.5 rounded-lg border ${
                      dbAdminStatus.migration_diagnostics.unlinked_reports.length > 0
                        ? 'bg-blue-950/25 border-blue-700/60'
                        : theme === 'dark'
                        ? 'bg-slate-950/60 border-slate-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="text-xs text-slate-400">Ficheiros .HTML na Pasta Sem Disco Associado</div>
                    <div
                      className={`text-lg font-bold font-mono mt-0.5 ${
                        dbAdminStatus.migration_diagnostics.unlinked_reports.length > 0
                          ? 'text-blue-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {dbAdminStatus.migration_diagnostics.unlinked_reports.length} ficheiros soltos
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {dbAdminStatus.migration_diagnostics.disks_without_report.length} discos registados sem relatório
                    </div>
                  </div>
                </div>
              )}

              {/* Detail List 1: Missing Reports (Referenced in DB, waiting for HTML upload) */}
              {dbAdminStatus?.migration_diagnostics &&
                dbAdminStatus.migration_diagnostics.missing_reports.length > 0 && (
                  <div className="p-4 rounded-xl border border-amber-700/60 bg-amber-950/20 space-y-2">
                    <div className="text-xs font-bold text-amber-300">
                      Registos que já têm relatório definido na base de dados mas cujo ficheiro .HTML ainda não foi
                      carregado ({dbAdminStatus.migration_diagnostics.missing_reports.length}):
                    </div>
                    <p className="text-[11px] text-amber-200/80">
                      Basta usar o botão <strong>&quot;Selecionar Pasta relatorios/ Inteira&quot;</strong> ou{' '}
                      <strong>&quot;Selecionar Ficheiros .HTML (Lote)&quot;</strong> acima e escolher estes ficheiros — a
                      ligação fica imediatamente ativa:
                    </p>
                    <div className="max-h-44 overflow-y-auto divide-y divide-amber-800/30 text-xs pt-1">
                      {dbAdminStatus.migration_diagnostics.missing_reports.map((mr) => (
                        <div key={mr.id} className="py-1.5 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-white">{mr.id_disco}</span>
                            <span className="text-slate-400 ml-2">
                              ({mr.arquivo} · Ticket: {mr.ticket_num || '-'})
                            </span>
                          </div>
                          <span className="font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-700/50">
                            Falta ficheiro: {mr.relatorio_path}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Detail List 2: Unlinked HTML files in relatorios/ (Allow manual 1-click association to a disk) */}
              {dbAdminStatus?.migration_diagnostics &&
                dbAdminStatus.migration_diagnostics.unlinked_reports.length > 0 && (
                  <div
                    className={`p-4 rounded-xl border space-y-3 ${
                      theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold text-blue-400">
                      Ficheiros .HTML na pasta <span className="font-mono">relatorios/</span> sem disco atribuído (
                      {dbAdminStatus.migration_diagnostics.unlinked_reports.length}):
                    </div>
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-800 text-xs">
                      {dbAdminStatus.migration_diagnostics.unlinked_reports.map((ur) => (
                        <div key={ur.filename} className="py-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <a
                              href={`/relatorios/${encodeURIComponent(ur.filename)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono font-semibold text-blue-400 hover:underline"
                            >
                              {ur.filename}
                            </a>
                            <span className="text-slate-500 font-mono">({formatBytes(ur.size_bytes)})</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <select
                              value={manualLinkSelection[ur.filename] || ''}
                              onChange={(e) =>
                                setManualLinkSelection((prev) => ({ ...prev, [ur.filename]: e.target.value }))
                              }
                              className={`px-2.5 py-1 rounded border text-xs ${
                                theme === 'dark'
                                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                                  : 'bg-white border-slate-300 text-slate-800'
                              }`}
                            >
                              <option value="">Associar ao disco...</option>
                              {discos.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.id_disco} ({d.arquivo} · {d.ticket_num})
                                  {d.relatorio_path ? ' [Já tem relatório]' : ''}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={!manualLinkSelection[ur.filename] || linkingReportFilename === ur.filename}
                              onClick={() => handleManualLinkReport(ur.filename)}
                              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold cursor-pointer"
                            >
                              {linkingReportFilename === ur.filename ? 'A indexar...' : 'Associar & Indexar'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Table of Saved Backups in ./backups/ */}
            <div
              className={`border rounded-xl overflow-hidden ${
                theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">
                    Pontos de Restauro Guardados no Servidor (<span className="font-mono">backups/</span>)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pode restaurar qualquer cópia de segurança abaixo com um clique ou descarregá-la para arquivo externo.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr
                      className={`border-b text-xs font-semibold ${
                        theme === 'dark'
                          ? 'bg-slate-900/90 border-slate-800 text-slate-400'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      <th className="py-3 px-4">Ficheiro de Backup</th>
                      <th className="py-3 px-4">Tipo de Cópia</th>
                      <th className="py-3 px-4">Data / Hora</th>
                      <th className="py-3 px-4 text-right">Tamanho</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs ${theme === 'dark' ? 'divide-slate-800/80' : 'divide-slate-200'}`}>
                    {!dbAdminStatus || dbAdminStatus.backups.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          Ainda não existem pontos de restauro guardados na pasta <span className="font-mono">backups/</span>.
                          Clique em &quot;Criar Snapshot SQLite&quot; ou &quot;Criar Backup Completo&quot; acima.
                        </td>
                      </tr>
                    ) : (
                      dbAdminStatus.backups.map((b) => (
                        <tr
                          key={b.filename}
                          className={theme === 'dark' ? 'hover:bg-slate-900/90' : 'hover:bg-slate-50'}
                        >
                          <td className="py-3 px-4 font-mono font-semibold text-blue-400">{b.filename}</td>
                          <td className="py-3 px-4">
                            <span
                              className={
                                b.type === 'full_json'
                                  ? 'text-emerald-400 font-semibold'
                                  : b.filename.startsWith('pre_restauro_')
                                  ? 'text-amber-400 font-medium'
                                  : 'text-slate-300'
                              }
                            >
                              {b.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-slate-400">{b.created_at}</td>
                          <td className="py-3 px-4 font-mono tabular-nums text-right">{formatBytes(b.size_bytes)}</td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <a
                                href={`/api/admin/db/backups/${encodeURIComponent(
                                  b.filename
                                )}/download?admin_user_id=${currentUser.id}`}
                                className="px-2.5 py-1 rounded border border-blue-700/70 text-blue-400 hover:bg-blue-950/50 inline-flex items-center gap-1 font-medium"
                                title="Descarregar este ficheiro de backup"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Descarregar
                              </a>

                              {confirmRestoreFilename === b.filename ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    disabled={restoringDb}
                                    onClick={() => handleRestoreSavedBackup(b.filename)}
                                    className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer"
                                  >
                                    {restoringDb ? 'A restaurar...' : 'Confirmar Restauro'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmRestoreFilename(null)}
                                    className="px-2 py-1 rounded border border-slate-700 cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmRestoreFilename(b.filename)}
                                  className="px-2.5 py-1 rounded border border-amber-700/70 text-amber-400 hover:bg-amber-950/50 inline-flex items-center gap-1 font-medium cursor-pointer"
                                  title="Restaurar a base de dados para este ponto"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Restaurar
                                </button>
                              )}

                              {confirmDeleteBackupFilename === b.filename ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSavedBackup(b.filename)}
                                    className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-semibold cursor-pointer"
                                  >
                                    Apagar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteBackupFilename(null)}
                                    className="px-2 py-1 rounded border border-slate-700 cursor-pointer"
                                  >
                                    Não
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteBackupFilename(b.filename)}
                                  className="p-1.5 rounded border border-red-800/60 text-red-400 hover:bg-red-950/50 cursor-pointer"
                                  title="Eliminar ficheiro de backup"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Panel 5: Direitos de Autor, Propriedade Intelectual & Licença */}
            <div
              className={`rounded-2xl border p-5 shadow-sm space-y-4 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Direitos de Autor e Proteção Jurídica (Copyright)</h3>
                    <p className="text-xs text-slate-400">
                      Registo formal de propriedade intelectual e regime de exclusividade institucional
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLicenseModal(true)}
                  className="px-3 py-1.5 rounded-lg border border-blue-700/60 bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Ver Termo de Licenciamento Completo
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Autor e Titular dos Direitos</div>
                  <div className="text-sm font-bold text-blue-400 mt-1">José Miguel Magalhães</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Todos os direitos reservados © 2026</div>
                </div>
                <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Entidade Licenciada Exclusiva</div>
                  <div className="text-sm font-bold text-emerald-400 mt-1">DGLAB</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Direção-Geral do Livro, dos Arquivos e das Bibliotecas</div>
                </div>
                <div className={`p-3.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Finalidade & Âmbito de Uso</div>
                  <div className="text-xs font-bold text-amber-300 mt-1">Uso Estrito e Exclusivo na DGLAB</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Não pode ser usada para mais nenhum fim</div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 text-xs text-slate-400 flex items-start gap-2">
                <span className="text-blue-400 font-bold shrink-0 mt-0.5">ℹ️</span>
                <span>
                  Protegido pelo <strong>Código do Direito de Autor e dos Direitos Conexos</strong> (Decreto-Lei n.º 63/85) e pelo{' '}
                  <strong>Regime Jurídico da Proteção de Programas de Computador</strong> (Decreto-Lei n.º 252/94).
                  Licença estritamente intransmissível. Qualquer utilização, cópia, descompilação ou distribuição fora da DGLAB é ilícita.
                </span>
              </div>
            </div>

            {/* Panel 6: Convergência Normativa ISO/IEC 27001 & NIS II — Especificação Técnica de Implantação */}
            <div
              className={`rounded-2xl border p-5 shadow-sm space-y-4 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold">Convergência Normativa ISO/IEC 27001:2022 & Diretiva NIS 2</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600/30 text-blue-300 border border-blue-500/40">
                        /opt/app_usb/ · Porta 3005 Exclusiva
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Arquitetura autónoma na intranet DGLAB: estrutura de ficheiros, pasta central <span className="font-mono text-emerald-400">relatorios/</span> e BD SQLite (WAL)
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="/api/documentacao-pdf"
                    target="_blank"
                    rel="noreferrer"
                    download="RIDIS_Especificacao_Tecnica_ISO27001_NIS2.pdf"
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                    title="Descarregar Especificação Técnica em formato Adobe PDF"
                  >
                    <Download className="w-4 h-4" />
                    Descarregar PDF Oficial
                  </a>
                  <a
                    href="/api/documentacao-docx"
                    download="RIDIS_Especificacao_Tecnica_ISO27001_NIS2.docx"
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer border border-sky-400/30"
                    title="Descarregar Manual Técnico em formato Microsoft Word (.docx)"
                  >
                    <FileText className="w-4 h-4" />
                    Descarregar Manual Word (.docx)
                  </a>
                </div>
              </div>

              {/* Destaque Central: Pasta relatorios/ onde mais tarde os relatórios terão que ser copiados */}
              <div className="p-4 rounded-xl border border-emerald-600/40 bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300">
                      Pasta Central Obrigatória: <code className="font-mono bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-700/60 text-emerald-200">/opt/app_usb/relatorios/</code>
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                    chmod 770 (ridis:ridis)
                  </span>
                </div>
                <p className="text-xs text-emerald-100/90 leading-relaxed">
                  É para esta pasta que <strong>mais tarde os relatórios de validação dos discos USB terão que ser copiados/transferidos</strong> pelos técnicos (ficheiros Snap2HTML <code className="font-mono">.html</code>, relatórios <code className="font-mono">.txt</code> ou listagens <code className="font-mono">.csv</code>).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px] text-emerald-200/80">
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
                    <strong>1. Cópia de Ficheiros:</strong> Transferência direta via SFTP, SMB/Samba ou rsync para <code className="font-mono text-white">/opt/app_usb/relatorios/</code>.
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
                    <strong>2. Deteção & Leitura:</strong> A app monitoriza esta diretoria e associa com 1 clique os relatórios aos discos inventariados.
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
                    <strong>3. Indexação de Matrizes:</strong> Extração automática de Códigos de Referência e contagem de imagens TIF sem perda de dados.
                  </div>
                </div>
              </div>

              {/* Cards de Arquitetura e Estrutura */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {/* 1. Servidor Autónomo na Porta 3005 */}
                <div
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-400">1. Servidor na Porta 3005</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/40">Sem Porta 3000</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Operação <strong>exclusiva na porta 3005</strong> para evitar conflitos na intranet da DGLAB. O backend Express serve a interface SPA e a API nativamente sem necessidade de Nginx ou proxy reverso.
                  </p>
                </div>

                {/* 2. Base de Dados SQLite (WAL) */}
                <div
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">2. Base de Dados SQLite</span>
                    <a
                      href="/api/implantacao/script-bd"
                      download="schema_criacao_bd.sql"
                      className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5 font-semibold"
                    >
                      <Download className="w-2.5 h-2.5" /> .sql
                    </a>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Ficheiro local <code className="font-mono text-slate-300">/opt/app_usb/gestao_discos.db</code> em modo WAL (Write-Ahead Logging). Concorrência de leitura/escrita e integridade transacional sem portas de BD expostas.
                  </p>
                </div>

                {/* 3. Serviço Systemd em /opt/app_usb/ */}
                <div
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400">3. Serviço de Sistema Systemd</span>
                    <a
                      href="/api/implantacao/service"
                      download="ridis.service"
                      className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5 font-semibold"
                    >
                      <Download className="w-2.5 h-2.5" /> .service
                    </a>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Unidade <code className="font-mono text-slate-300">/etc/systemd/system/ridis.service</code> com <code className="font-mono">WorkingDirectory=/opt/app_usb</code>, arranque no boot, reinício automático (NIS 2) e isolamento sandboxed.
                  </p>
                </div>
              </div>

              {/* Tabela de Estrutura de Ficheiros e Localizações em /opt/app_usb/ */}
              <div
                className={`p-4 rounded-xl border space-y-2.5 ${
                  theme === 'dark' ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                    Estrutura de Ficheiros e Localização Exata em <code className="font-mono text-blue-400">/opt/app_usb/</code>
                  </span>
                  <div className="flex items-center gap-2 text-[10px]">
                    <a
                      href="/api/implantacao/script-bd"
                      download="schema_criacao_bd.sql"
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-mono border border-slate-700 flex items-center gap-1"
                    >
                      <Database className="w-2.5 h-2.5" /> schema.sql
                    </a>
                    <a
                      href="/api/implantacao/service"
                      download="ridis.service"
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-mono border border-slate-700 flex items-center gap-1"
                    >
                      <HardDrive className="w-2.5 h-2.5" /> ridis.service
                    </a>
                    <a
                      href="/api/documentacao-pdf"
                      target="_blank"
                      rel="noreferrer"
                      download="RIDIS_Especificacao_Tecnica_ISO27001_NIS2.pdf"
                      className="px-2 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-white font-mono flex items-center gap-1 font-bold"
                    >
                      <Download className="w-2.5 h-2.5" /> PDF
                    </a>
                    <a
                      href="/api/documentacao-docx"
                      download="RIDIS_Especificacao_Tecnica_ISO27001_NIS2.docx"
                      className="px-2 py-0.5 rounded bg-sky-700 hover:bg-sky-600 text-white font-mono flex items-center gap-1 font-bold border border-sky-400/40"
                    >
                      <FileText className="w-2.5 h-2.5" /> Word (.docx)
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80 space-y-1">
                    <div className="text-blue-300 font-bold">/opt/app_usb/server.ts</div>
                    <div className="text-slate-400 font-sans text-[10px]">Servidor backend Express na porta 3005 e API REST</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80 space-y-1">
                    <div className="text-emerald-300 font-bold">/opt/app_usb/gestao_discos.db</div>
                    <div className="text-slate-400 font-sans text-[10px]">Base de dados SQLite com tabelas de discos e matrizes</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80 space-y-1">
                    <div className="text-emerald-400 font-bold">/opt/app_usb/relatorios/</div>
                    <div className="text-slate-400 font-sans text-[10px]">Destino obrigatório para cópia de relatórios Snap2HTML/CSV</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80 space-y-1">
                    <div className="text-amber-300 font-bold">/opt/app_usb/backups/</div>
                    <div className="text-slate-400 font-sans text-[10px]">Diretório de salvaguarda de cópias de segurança (.db.gz)</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80 space-y-1">
                    <div className="text-purple-300 font-bold">/opt/app_usb/deploy/</div>
                    <div className="text-slate-400 font-sans text-[10px]">Scripts schema_criacao_bd.sql, ridis.service e env_producao</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80 space-y-1">
                    <div className="text-sky-300 font-bold">/opt/app_usb/.env</div>
                    <div className="text-slate-400 font-sans text-[10px]">Variáveis de ambiente (APP_PORT=3005 e caminhos locais)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: CRIAR / EDITAR DISCO USB E IMPORTAR RELATÓRIO SNAP2HTML */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <div
            className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden my-8 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div
              className={`px-6 py-4 text-white flex items-center justify-between ${
                isFormReadOnly ? 'bg-slate-800' : 'bg-blue-600'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold">
                  {isFormReadOnly
                    ? `Ficha do Disco: ${editingDisco?.id_disco || formData.id_disco}`
                    : editingDisco
                    ? `Editar Disco: ${editingDisco.id_disco}`
                    : 'Registar Novo Disco'}
                </h2>
                {isFormReadOnly && (
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-700 text-slate-300 border border-slate-600">
                    Modo Leitura (Protegido)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className={`p-1 rounded transition-colors cursor-pointer ${
                  isFormReadOnly ? 'hover:bg-slate-700' : 'hover:bg-blue-700'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDisco} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-lg border border-red-700/80 bg-red-950/60 text-red-200 text-xs font-medium flex items-center justify-between gap-2">
                  <span>{formError}</span>
                  <button
                    type="button"
                    onClick={() => setFormError(null)}
                    className="text-red-300 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {uploadProgress && (
                <div className="p-3 rounded-lg border border-blue-700/80 bg-blue-950/60 text-blue-200 text-xs font-medium flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>{uploadProgress}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Arquivo</label>
                  <select
                    disabled={isFormReadOnly}
                    value={formData.arquivo}
                    onChange={(e) => setFormData({ ...formData, arquivo: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-xs ${
                      isFormReadOnly
                        ? 'opacity-85 cursor-default bg-slate-900 border-slate-700 text-slate-200'
                        : theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="">-- Selecione o Arquivo --</option>
                    {Object.entries(arquivosMap).map(([sigla, nome]) => (
                      <option key={sigla} value={sigla}>
                        {sigla} - {nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Remetente</label>
                  <input
                    type="text"
                    disabled={isFormReadOnly}
                    value={formData.remetente}
                    onChange={(e) => setFormData({ ...formData, remetente: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-xs ${
                      isFormReadOnly
                        ? 'opacity-85 cursor-default bg-slate-900 border-slate-700 text-slate-200'
                        : theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Data</label>
                  <input
                    type="date"
                    disabled={isFormReadOnly}
                    value={formData.data_entrada}
                    onChange={(e) => setFormData({ ...formData, data_entrada: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${
                      isFormReadOnly
                        ? 'opacity-85 cursor-default bg-slate-900 border-slate-700 text-slate-200'
                        : theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Ticket nº *</label>
                  <input
                    type="text"
                    required={!isFormReadOnly}
                    disabled={isFormReadOnly}
                    value={formData.ticket_num}
                    onChange={(e) => setFormData({ ...formData, ticket_num: e.target.value })}
                    placeholder="TICK-2026-..."
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${
                      isFormReadOnly
                        ? 'opacity-85 cursor-default bg-slate-900 border-slate-700 text-slate-200'
                        : theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">ID do disco *</label>
                  <input
                    type="text"
                    required={!isFormReadOnly}
                    disabled={isFormReadOnly}
                    value={formData.id_disco}
                    onChange={(e) => setFormData({ ...formData, id_disco: e.target.value })}
                    placeholder="DISCO-..."
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${
                      isFormReadOnly
                        ? 'opacity-85 cursor-default bg-slate-900 border-slate-700 text-slate-200'
                        : theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Projeto</label>
                  <input
                    type="text"
                    disabled={isFormReadOnly}
                    value={formData.projeto}
                    onChange={(e) => setFormData({ ...formData, projeto: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-xs ${
                      isFormReadOnly
                        ? 'opacity-85 cursor-default bg-slate-900 border-slate-700 text-slate-200'
                        : theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Localização</label>
                  <input
                    type="text"
                    disabled={isFormReadOnly}
                    value={formData.localizacao}
                    onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                    placeholder="Armário A · Gaveta 2"
                    className={`w-full px-3 py-2 rounded-lg border text-xs ${
                      isFormReadOnly
                        ? 'opacity-85 cursor-default bg-slate-900 border-slate-700 text-slate-200'
                        : theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Tamanho do disco</label>
                  <input
                    type="text"
                    disabled={isFormReadOnly}
                    value={formData.tamanho_disco}
                    onChange={(e) => setFormData({ ...formData, tamanho_disco: e.target.value })}
                    placeholder="4 TB"
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${
                      isFormReadOnly
                        ? 'opacity-85 cursor-default bg-slate-900 border-slate-700 text-slate-200'
                        : theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Marca</label>
                  <input
                    type="text"
                    disabled={isFormReadOnly}
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    placeholder="Seagate / WD"
                    className={`w-full px-3 py-2 rounded-lg border text-xs ${
                      isFormReadOnly
                        ? 'opacity-85 cursor-default bg-slate-900 border-slate-700 text-slate-200'
                        : theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">n/s: *</label>
                  <input
                    type="text"
                    required={!isFormReadOnly}
                    disabled={isFormReadOnly}
                    value={formData.numero_serie}
                    onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                    placeholder="Número de série"
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${
                      isFormReadOnly
                        ? 'opacity-85 cursor-default bg-slate-900 border-slate-700 text-slate-200'
                        : theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-1">
                <label className={`flex items-center gap-2.5 text-xs font-medium py-2 ${isFormReadOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    disabled={isFormReadOnly}
                    checked={formData.verificado}
                    onChange={(e) => setFormData({ ...formData, verificado: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span>Verificado (V)</span>
                </label>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Ticket de integração</label>
                  <input
                    type="text"
                    disabled={isFormReadOnly}
                    value={formData.ticket_integracao}
                    onChange={(e) => setFormData({ ...formData, ticket_integracao: e.target.value })}
                    placeholder="INT-2026-..."
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${
                      isFormReadOnly
                        ? 'opacity-85 cursor-default bg-slate-900 border-slate-700 text-slate-200'
                        : theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <label className={`flex items-center gap-2.5 text-xs font-medium py-2 ${isFormReadOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    disabled={isFormReadOnly}
                    checked={formData.integrado}
                    onChange={(e) => setFormData({ ...formData, integrado: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span>Integrado (I)</span>
                </label>

                <label className={`flex items-center gap-2.5 text-xs font-medium py-2 ${isFormReadOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    disabled={isFormReadOnly}
                    checked={formData.armazenado_servidor}
                    onChange={(e) =>
                      setFormData({ ...formData, armazenado_servidor: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  <span>Armazenado em servidor (A)</span>
                </label>

                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Total de imagens (0 = preenchido pelo Snap2HTML)
                  </label>
                  <input
                    type="number"
                    min={0}
                    disabled={isFormReadOnly}
                    value={formData.total_imagens}
                    onChange={(e) =>
                      setFormData({ ...formData, total_imagens: parseInt(e.target.value, 10) || 0 })
                    }
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${
                      isFormReadOnly
                        ? 'opacity-85 cursor-default bg-slate-900 border-slate-700 text-slate-200'
                        : theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Snap2HTML / TXT / CSV Upload Field */}
              <div
                className={`p-4 rounded-xl border ${
                  theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <label className="block text-xs font-semibold mb-1">
                  Relatório ou Lista de Códigos (.html, .htm, .txt, .csv) — Indexação Automática
                </label>
                {editingDisco?.relatorio_path && (
                  <div className="text-xs text-slate-400 mb-2">
                    Ficheiro atual em <span className="font-mono">relatorios/</span>:{' '}
                    <a
                      href={`/relatorios/${editingDisco.relatorio_path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline font-mono"
                    >
                      {editingDisco.relatorio_path}
                    </a>{' '}
                    ({editingDisco.indexed_tif_count} documentos/códigos indexados)
                    {!isFormReadOnly && ' — selecione outro ficheiro abaixo para substituir e reindexar.'}
                  </div>
                )}
                {!isFormReadOnly ? (
                  <>
                    <input
                      type="file"
                      accept=".html,.htm,.txt,.csv"
                      onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Suporta relatórios <strong>Snap2HTML</strong> (<span className="font-mono">.html</span>,{' '}
                      <span className="font-mono">.htm</span>) e ficheiros de texto/tabela (
                      <span className="font-mono">.txt</span>, <span className="font-mono">.csv</span>) com códigos de
                      referência linha a linha (ex: <span className="font-mono">PT-TT-NOT-CNCSC1-001-001-0081</span>). O ficheiro é
                      guardado em <span className="font-mono">relatorios/</span> e os códigos são indexados
                      automaticamente na base de dados SQLite.
                    </p>
                  </>
                ) : !editingDisco?.relatorio_path ? (
                  <p className="text-xs text-slate-500 italic">Sem relatório ou ficheiro associado.</p>
                ) : null}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Observações</label>
                <textarea
                  rows={3}
                  disabled={isFormReadOnly}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border text-xs ${
                    isFormReadOnly
                      ? 'opacity-85 cursor-default bg-slate-900 border-slate-700 text-slate-200'
                      : theme === 'dark'
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                {isFormReadOnly ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="px-4 py-2 rounded-lg border border-slate-700 text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Fechar
                    </button>
                    {canEditOrDelete && (
                      <button
                        type="button"
                        onClick={() => setIsFormReadOnly(false)}
                        className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Desbloquear para editar este registo"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar este Registo
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-end gap-2.5 w-full">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="px-4 py-2 rounded-lg border border-slate-700 text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={formSaving}
                      className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {formSaving ? 'A guardar e indexar...' : 'Guardar Registo'}
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EXPLORADOR DE RELATÓRIO SNAP2HTML & FICHEIROS .TIF INDEXADOS */}
      {inspectModalDisco && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div
            className={`w-full max-w-5xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh] ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold font-mono">
                  Relatório Snap2HTML — {inspectModalDisco.id_disco}
                </h2>
                <p className="text-xs text-slate-400">
                  {inspectModalDisco.arquivo} · Ticket:{' '}
                  {inspectModalDisco.ticket_num ? (
                    <a
                      href={getOtrsTicketUrl(inspectModalDisco.ticket_num)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#6ea8fe] hover:underline font-mono inline-flex items-center gap-0.5"
                      title={`Abrir ticket ${inspectModalDisco.ticket_num} no OTRS (nova aba)`}
                    >
                      {inspectModalDisco.ticket_num}
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>
                  ) : (
                    '-'
                  )}{' '}
                  · Localização: {inspectModalDisco.localizacao || '-'} · Ficheiro:{' '}
                  <span className="font-mono">relatorios/{inspectModalDisco.relatorio_path}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-lg p-0.5 bg-slate-950 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setInspectMode('index')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      inspectMode === 'index' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Índice SQLite ({inspectTotal})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectMode('html')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      inspectMode === 'html' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Ficheiro Original
                  </button>
                </div>

                {inspectModalDisco.relatorio_path && (
                  <a
                    href={`/relatorios/${inspectModalDisco.relatorio_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium hover:bg-slate-800 inline-flex items-center gap-1"
                  >
                    Nova Aba <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setInspectModalDisco(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {inspectMode === 'index' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={inspectQuery}
                      onChange={(e) => setInspectQuery(e.target.value)}
                      placeholder="Filtrar documentos / códigos de referência neste disco (ex: PT-TT-JC)..."
                      className={`w-full pl-9 pr-4 py-2 rounded-lg border text-xs font-mono ${
                        theme === 'dark'
                          ? 'bg-slate-950 border-slate-800 text-slate-100'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr
                        className={`border-b text-xs font-semibold sticky top-0 ${
                          theme === 'dark'
                            ? 'bg-slate-900 border-slate-800 text-slate-400'
                            : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}
                      >
                        <th className="py-2.5 px-4">Pasta no Disco</th>
                        <th className="py-2.5 px-4">Código de Referência / Documento</th>
                        <th className="py-2.5 px-4 text-right">Tamanho Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
                      {inspectLoading ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-400">
                            A carregar ficheiros indexados...
                          </td>
                        </tr>
                      ) : inspectFiles.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-400">
                            Nenhum ficheiro encontrado.
                          </td>
                        </tr>
                      ) : (
                        inspectFiles.map((f) => (
                          <tr key={f.id} className="hover:bg-slate-800/40">
                            <td className="py-2 px-4 text-slate-400">{f.pasta || '-'}</td>
                            <td className="py-2 px-4 text-blue-400 font-semibold">{f.nome_ficheiro}</td>
                            <td className="py-2 px-4 text-right tabular-nums">{formatBytes(f.tamanho_bytes)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-slate-950 overflow-hidden">
                {inspectModalDisco.relatorio_path ? (
                  <iframe
                    src={`/relatorios/${inspectModalDisco.relatorio_path}`}
                    title={`Relatório ${inspectModalDisco.id_disco}`}
                    className="w-full h-[68vh] border-0"
                  />
                ) : (
                  <div className="p-12 text-center text-sm text-slate-400">
                    Este disco não tem relatório Snap2HTML anexado.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: IMPORTAR FICHEIRO CSV */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-400" />
                Importar Ficheiro CSV
              </h2>
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="p-1 rounded hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleImportCsv} className="p-6 space-y-4">
              <p className="text-xs text-slate-400">
                Selecione um ficheiro CSV estruturado com o separador <code className="text-slate-200">;</code> ou{' '}
                <code className="text-slate-200">,</code>.
              </p>
              <input
                type="file"
                accept=".csv"
                required
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="block w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={csvUploading || !csvFile}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  {csvUploading ? 'A importar...' : 'Importar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quiet Institutional Footer */}
      <footer
        className={`border-t py-4 px-6 text-xs flex flex-wrap items-center justify-between gap-3 ${
          theme === 'dark' ? 'border-slate-900 text-slate-400' : 'border-slate-200 text-slate-600'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <strong>RIDIS · DGLAB</strong> — Direção-Geral do Livro, dos Arquivos e das Bibliotecas
          <span className="hidden sm:inline text-slate-600">|</span>
          <span>© 2026 <strong>José Miguel Magalhães</strong>. Todos os direitos reservados.</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            Licença Exclusiva DGLAB
          </span>
          <button
            type="button"
            onClick={() => setShowLicenseModal(true)}
            className="text-blue-400 hover:text-blue-300 underline text-xs cursor-pointer flex items-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Aviso Legal & Direitos
          </button>
        </div>
      </footer>

      {/* Botão Flutuante Voltar ao Topo (Canto Inferior Direito) */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          title="Voltar ao topo da página"
          aria-label="Voltar ao topo"
          className={`fixed bottom-6 right-6 z-40 p-3 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center cursor-pointer border group hover:scale-110 active:scale-95 ${
            theme === 'dark'
              ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400/50 shadow-blue-950/80'
              : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-400 shadow-blue-500/40'
          }`}
        >
          <ArrowUp className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
        </button>
      )}

      {renderLicenseModal()}
    </div>
  );
}
