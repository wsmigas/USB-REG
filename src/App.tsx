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
  ArrowUpCircle,
  ArrowDownCircle,
  FileSpreadsheet,
  Filter,
} from 'lucide-react';
import {
  DiscoUsb,
  RidisStats,
  IndexedFileRow,
  RelatorioFileInfo,
  Usuario,
} from './types';

type ActiveTab = 'inventario' | 'pesquisa_tif' | 'relatorios' | 'usuarios';

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

  // Auth state (defaults to authenticated admin session so portal is immediately accessible, with full login/logout support)
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    username: string;
    is_admin: boolean;
  } | null>(() => {
    const saved = localStorage.getItem('ridis_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return { id: 2, username: 'jmagalhaes', is_admin: true };
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

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Inline delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Create / Edit Disk Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
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

  // Dedicated TIF Search Tab state
  const [tifSearchQuery, setTifSearchQuery] = useState('');
  const [tifSearchArquivo, setTifSearchArquivo] = useState('');
  const [tifSearchOnlyTif, setTifSearchOnlyTif] = useState(true);
  const [tifResults, setTifResults] = useState<IndexedFileRow[]>([]);
  const [tifTotal, setTifTotal] = useState(0);
  const [tifElapsedMs, setTifElapsedMs] = useState(0);
  const [tifLoading, setTifLoading] = useState(false);

  // Relatorios Folder Tab state
  const [relatoriosInfo, setRelatoriosInfo] = useState<{
    pasta_local: string;
    db_local: string;
    relatorios: RelatorioFileInfo[];
  }>({
    pasta_local: '/relatorios',
    db_local: '/gestao_discos.db',
    relatorios: [],
  });
  const [reindexing, setReindexing] = useState(false);

  // Usuarios Tab state
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserAdmin, setNewUserAdmin] = useState(false);
  const [passwordInputs, setPasswordInputs] = useState<Record<number, string>>({});
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<number | null>(null);

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
  }, [busca, fArquivo, fProjeto, fLocalizacao, fVerificado, fIntegrado, fArmazenado, showFlash]);

  useEffect(() => {
    if (currentUser) {
      fetchDiscos();
    }
  }, [currentUser, fetchDiscos]);

  // Fetch dedicated TIF search
  const fetchTifSearch = useCallback(async () => {
    setTifLoading(true);
    try {
      const params = new URLSearchParams();
      if (tifSearchQuery) params.set('q', tifSearchQuery);
      if (tifSearchArquivo) params.set('arquivo', tifSearchArquivo);
      params.set('apenas_tif', tifSearchOnlyTif ? '1' : '0');

      const res = await fetch(`/api/pesquisa-tif?${params.toString()}`);
      if (!res.ok) throw new Error('Erro na pesquisa de ficheiros TIF');
      const data = await res.json();
      setTifResults(data.ficheiros || []);
      setTifTotal(data.total || 0);
      setTifElapsedMs(data.elapsed_ms || 0);
    } catch (e: any) {
      showFlash(e.message || 'Erro na pesquisa TIF', 'danger');
    } finally {
      setTifLoading(false);
    }
  }, [tifSearchQuery, tifSearchArquivo, tifSearchOnlyTif, showFlash]);

  useEffect(() => {
    if (currentUser && activeTab === 'pesquisa_tif') {
      fetchTifSearch();
    }
  }, [currentUser, activeTab, fetchTifSearch]);

  // Fetch relatorios folder status
  const fetchRelatorios = useCallback(async () => {
    try {
      const res = await fetch('/api/relatorios');
      if (res.ok) {
        const data = await res.json();
        setRelatoriosInfo(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (currentUser && activeTab === 'relatorios') {
      fetchRelatorios();
    }
  }, [currentUser, activeTab, fetchRelatorios]);

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
      setLoginPassword('');
    } catch {
      setLoginError('Erro ao comunicar com o servidor.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ridis_user');
  };

  // Open New / Edit Disk Modal
  const openNewDiscoModal = () => {
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

  const handleSaveDisco = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);
    setUploadProgress(null);

    try {
      let uploadedRelatorioPath: string | null = null;

      if (formFile) {
        const chunkSize = 2 * 1024 * 1024; // 2 MB per chunk to avoid proxy limits
        const totalChunks = Math.max(1, Math.ceil(formFile.size / chunkSize));
        const uploadId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const pct = Math.round(((chunkIndex + 1) / totalChunks) * 100);
          setUploadProgress(
            totalChunks > 1
              ? `A transferir relatório Snap2HTML para relatorios/ (${pct}%)...`
              : 'A transferir relatório Snap2HTML para relatorios/...'
          );

          const start = chunkIndex * chunkSize;
          const end = Math.min(start + chunkSize, formFile.size);
          const slice = formFile.slice(start, end);
          const buffer = await slice.arrayBuffer();
          const chunkBase64 = arrayBufferToBase64(buffer);

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

        setUploadProgress('A indexar ficheiros .TIF na base de dados SQLite...');
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
      if (activeTab === 'relatorios') fetchRelatorios();
      if (activeTab === 'pesquisa_tif') fetchTifSearch();
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

  // Batch reindex handler
  const handleReindexAll = async () => {
    setReindexing(true);
    try {
      const res = await fetch('/api/reindexar', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showFlash(data.message, 'success');
        fetchRelatorios();
        fetchDiscos();
      } else {
        showFlash('Erro ao reindexar relatórios.', 'danger');
      }
    } finally {
      setReindexing(false);
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
          is_admin: newUserAdmin,
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
      setNewUserAdmin(false);
      fetchUsuarios();
    } catch {
      showFlash('Erro ao criar utilizador.', 'danger');
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

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '-';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
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

            <div className="mt-6 pt-5 border-t border-slate-800">
              <div className="text-xs text-slate-400 mb-2">Acesso rápido de demonstração:</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoginUsername('jmagalhaes');
                    setLoginPassword('ridis2026');
                  }}
                  className="flex-1 py-1.5 px-3 rounded border border-slate-700 hover:border-slate-600 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  jmagalhaes (Admin)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginUsername('operador');
                    setLoginPassword('operador123');
                  }}
                  className="flex-1 py-1.5 px-3 rounded border border-slate-700 hover:border-slate-600 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  operador (Operador)
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer className="relative z-10 text-center py-4 text-xs text-slate-500">
          <strong className="text-slate-400">DGLAB</strong> · Direção-Geral do Livro, dos Arquivos e das Bibliotecas ·
          Serviços Centrais
        </footer>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Bar Contract: 3 Clean Zones (Brand Wordmark | Navigation Links | Primary Actions) */}
      <header
        className={`sticky top-0 z-30 border-b px-6 py-3.5 flex items-center justify-between gap-4 ${
          theme === 'dark'
            ? 'bg-slate-950/95 border-slate-800 backdrop-blur-md'
            : 'bg-white/95 border-slate-200 backdrop-blur-md'
        }`}
      >
        {/* Zone 1: Brand Title (Single text element wordmark) */}
        <a
          href="#inventario"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('inventario');
          }}
          className="text-lg font-bold tracking-tight whitespace-nowrap shrink-0"
        >
          RIDIS
        </a>

        {/* Zone 2: 4 Navigation Links */}
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
          <button
            type="button"
            onClick={() => setActiveTab('pesquisa_tif')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'pesquisa_tif'
                ? 'border-blue-500 text-blue-500 font-semibold'
                : theme === 'dark'
                ? 'border-transparent text-slate-400 hover:text-slate-100'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Pesquisa TIF
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('relatorios')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'relatorios'
                ? 'border-blue-500 text-blue-500 font-semibold'
                : theme === 'dark'
                ? 'border-transparent text-slate-400 hover:text-slate-100'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Relatórios Snap2HTML
          </button>
          {currentUser.is_admin && (
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
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={openNewDiscoModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Registo
          </button>

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
            {/* Institutional Header & Utility Actions */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Gestão de Discos USB e Matrizes de Digitalização
                </h1>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Direção-Geral do Livro, dos Arquivos e das Bibliotecas (DGLAB) · Base de dados SQLite local (
                  <span className="font-mono">gestao_discos.db</span>) · Pasta de relatórios (
                  <span className="font-mono">relatorios/</span>) · Sessão:{' '}
                  <strong className="font-semibold">{currentUser.username}</strong> (
                  {currentUser.is_admin ? 'Administrador' : 'Operador'})
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href="/api/exportar-template"
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
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
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
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
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    theme === 'dark'
                      ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-amber-400'
                      : 'border-slate-200 bg-white hover:bg-slate-100 text-amber-700'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importar CSV
                </button>
              </div>
            </div>

            {/* Statistics Grid (Single-Elevation, Tabular Numerals) */}
            <div
              className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border rounded-xl divide-y md:divide-y-0 md:divide-x ${
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
                  Total Imagens Declaradas
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums mt-1">
                  {formatNumber(stats.total_imagens)}
                </div>
              </div>
              <div className="p-4">
                <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Matrizes .TIF Indexadas
                </div>
                <div className="text-2xl font-bold font-mono tabular-nums mt-1 text-blue-500">
                  {formatNumber(stats.total_indexed_tif)}
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
                    placeholder="Pesquisar disco, ticket, cota PT-... ou ficheiro .tif (* ou ?)..."
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
                  <span>
                    <strong>V</strong> = Verificado · <strong>I</strong> = Integrado · <strong>A</strong> = Armazenado no
                    Servidor
                  </span>
                  <span>·</span>
                  <span>Exemplos pesquisa TIF:</span>
                  <button
                    type="button"
                    onClick={() => setBusca('PT-ANTT*m0001.tif')}
                    className="font-mono text-blue-400 hover:underline cursor-pointer"
                  >
                    PT-ANTT*m0001.tif
                  </button>
                  <button
                    type="button"
                    onClick={() => setBusca('PT/ADPRT/*')}
                    className="font-mono text-blue-400 hover:underline cursor-pointer"
                  >
                    PT/ADPRT/*
                  </button>
                  <button
                    type="button"
                    onClick={() => setBusca('*_m0015.tif')}
                    className="font-mono text-blue-400 hover:underline cursor-pointer"
                  >
                    *_m0015.tif
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`font-mono tabular-nums ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                    {hasActiveFilters
                      ? `Filtros ativos (${discos.length} registos encontrados)`
                      : `A mostrar ${discos.length} registos mais recentes`}
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
              <div
                className={`border rounded-xl overflow-hidden ${
                  theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
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
                        <th className="py-3 px-4">Arquivo / Remetente</th>
                        <th className="py-3 px-4">Data / Ticket Envio</th>
                        <th className="py-3 px-4">ID do Disco / Projeto / Localização</th>
                        <th className="py-3 px-4">Capacidade / Marca / S/N</th>
                        <th className="py-3 px-4 text-center">Estado (V · I · A)</th>
                        <th className="py-3 px-4">Integração / Imagens / Índice TIF</th>
                        <th className="py-3 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y text-sm ${theme === 'dark' ? 'divide-slate-800/80' : 'divide-slate-200'}`}>
                      {discos.map((d) => (
                        <React.Fragment key={d.id}>
                          <tr
                            className={`transition-colors ${
                              theme === 'dark' ? 'hover:bg-slate-900/90' : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* 1. Arquivo e Remetente */}
                            <td className="py-3.5 px-4 align-top">
                              <div
                                className="font-bold text-sm"
                                title={arquivosMap[d.arquivo] || d.arquivo || '-'}
                              >
                                {d.arquivo || '-'}
                              </div>
                              <div className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                {d.remetente || '-'}
                              </div>
                            </td>

                            {/* 2. Data e Ticket de Envio */}
                            <td className="py-3.5 px-4 align-top font-mono tabular-nums">
                              <div className="text-xs">{d.data_entrada || '-'}</div>
                              <div className="mt-1 flex items-center gap-1.5 text-xs">
                                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Ticket:</span>
                                {d.ticket_num ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(d.ticket_num, `ticket-${d.id}`)}
                                    title="Clique para copiar o número do ticket"
                                    className="font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    {d.ticket_num}
                                    {copiedKey === `ticket-${d.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3 opacity-70" />
                                    )}
                                  </button>
                                ) : (
                                  <span>-</span>
                                )}
                              </div>
                            </td>

                            {/* 3. ID Disco, Projeto e Localização (Unboxed metadata with separators) */}
                            <td className="py-3.5 px-4 align-top">
                              <button
                                type="button"
                                onClick={() => openEditDiscoModal(d)}
                                className="font-bold font-mono text-blue-400 hover:underline text-left cursor-pointer"
                              >
                                {d.id_disco || 'Sem ID'}
                              </button>
                              <div
                                className={`text-xs mt-1 flex flex-wrap items-center gap-1.5 ${
                                  theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                                }`}
                              >
                                {d.projeto && <span>Proj: {d.projeto}</span>}
                                {d.projeto && d.localizacao && <span aria-hidden="true">·</span>}
                                {d.localizacao && (
                                  <span>
                                    Localização: <strong className="font-semibold text-blue-400">{d.localizacao}</strong>
                                  </span>
                                )}
                              </div>
                              {d.observacoes && (
                                <div
                                  className={`text-xs mt-1.5 italic ${
                                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                                  }`}
                                >
                                  Obs: {d.observacoes}
                                </div>
                              )}
                            </td>

                            {/* 4. Capacidade, Marca e S/N */}
                            <td className="py-3.5 px-4 align-top">
                              <div className="text-xs">
                                <span className="font-mono tabular-nums">{d.tamanho_disco || '-'}</span> ·{' '}
                                <span>{d.marca || '-'}</span>
                              </div>
                              <div className="text-xs font-mono tabular-nums mt-1 flex items-center gap-1">
                                <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>S/N:</span>
                                {d.numero_serie ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(d.numero_serie, `sn-${d.id}`)}
                                    className="hover:text-blue-400 inline-flex items-center gap-1 cursor-pointer"
                                    title="Clique para copiar o número de série"
                                  >
                                    {d.numero_serie}
                                    {copiedKey === `sn-${d.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3 opacity-50" />
                                    )}
                                  </button>
                                ) : (
                                  <span>-</span>
                                )}
                              </div>
                            </td>

                            {/* 5. Estado V · I · A (Accessible text + semantic color) */}
                            <td className="py-3.5 px-4 align-top text-center font-mono text-xs">
                              <div className="inline-flex items-center gap-2">
                                <span
                                  title={`Verificado: ${d.verificado ? 'SIM' : 'NÃO'}`}
                                  className={`font-semibold ${
                                    d.verificado ? 'text-emerald-400' : 'text-red-400 opacity-75'
                                  }`}
                                >
                                  V:{d.verificado ? 'SIM' : 'NÃO'}
                                </span>
                                <span aria-hidden="true" className="text-slate-600">
                                  ·
                                </span>
                                <span
                                  title={`Integrado: ${d.integrado ? 'SIM' : 'NÃO'}`}
                                  className={`font-semibold ${
                                    d.integrado ? 'text-emerald-400' : 'text-red-400 opacity-75'
                                  }`}
                                >
                                  I:{d.integrado ? 'SIM' : 'NÃO'}
                                </span>
                                <span aria-hidden="true" className="text-slate-600">
                                  ·
                                </span>
                                <span
                                  title={`Armazenado no Servidor: ${d.armazenado_servidor ? 'SIM' : 'NÃO'}`}
                                  className={`font-semibold ${
                                    d.armazenado_servidor ? 'text-emerald-400' : 'text-red-400 opacity-75'
                                  }`}
                                >
                                  A:{d.armazenado_servidor ? 'SIM' : 'NÃO'}
                                </span>
                              </div>
                            </td>

                            {/* 6. Ticket Integração, Total Imagens e Ficheiros TIF Indexados */}
                            <td className="py-3.5 px-4 align-top font-mono tabular-nums text-xs">
                              {d.ticket_integracao ? (
                                <div className="flex items-center gap-1">
                                  <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>Integ:</span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(d.ticket_integracao, `integ-${d.id}`)}
                                    className="font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    {d.ticket_integracao}
                                    {copiedKey === `integ-${d.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3 opacity-70" />
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <div className={theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>
                                  Integ: —
                                </div>
                              )}
                              <div className={`mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                                Total img: <strong>{formatNumber(d.total_imagens || 0)}</strong>
                                {d.indexed_tif_count > 0 && (
                                  <>
                                    {' '}
                                    ·{' '}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setInspectModalDisco(d);
                                        setInspectMode('index');
                                        setInspectQuery(busca);
                                      }}
                                      className="text-blue-400 hover:underline font-semibold cursor-pointer"
                                      title="Ver ficheiros .TIF indexados neste relatório Snap2HTML"
                                    >
                                      {formatNumber(d.indexed_tif_count)} .TIF indexados
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* 7. Ações */}
                            <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {d.relatorio_path && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInspectModalDisco(d);
                                      setInspectMode('index');
                                      setInspectQuery(busca);
                                    }}
                                    className={`px-2.5 py-1.5 rounded border text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer ${
                                      theme === 'dark'
                                        ? 'border-blue-800/80 bg-blue-950/40 text-blue-300 hover:bg-blue-900/50'
                                        : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                    }`}
                                    title="Explorar ficheiros .TIF indexados e relatório Snap2HTML"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    Snap2HTML
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => openEditDiscoModal(d)}
                                  className={`p-1.5 rounded border transition-colors cursor-pointer ${
                                    theme === 'dark'
                                      ? 'border-slate-700 text-amber-400 hover:bg-slate-800'
                                      : 'border-slate-200 text-amber-600 hover:bg-slate-100'
                                  }`}
                                  title="Editar registo"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {currentUser.is_admin && (
                                  <>
                                    {confirmDeleteId === d.id ? (
                                      <div className="inline-flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteDisco(d.id)}
                                          className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer"
                                        >
                                          Confirmar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteId(null)}
                                          className="px-2 py-1 rounded border border-slate-700 text-xs cursor-pointer"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(d.id)}
                                        className={`p-1.5 rounded border transition-colors cursor-pointer ${
                                          theme === 'dark'
                                            ? 'border-slate-700 text-red-400 hover:bg-red-950/50'
                                            : 'border-slate-200 text-red-600 hover:bg-red-50'
                                        }`}
                                        title="Eliminar registo e relatório"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Highlighted TIF File Matches Row when searching by TIF / Cota */}
                          {d.matched_files && d.matched_files.length > 0 && (
                            <tr
                              className={
                                theme === 'dark' ? 'bg-blue-950/25 border-t border-blue-900/40' : 'bg-blue-50/60'
                              }
                            >
                              <td colSpan={7} className="py-2.5 px-4 text-xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-blue-400">
                                      Ficheiros encontrados no relatório Snap2HTML ({d.matched_files_total}):
                                    </span>
                                    <span className="font-mono text-slate-300">
                                      {d.matched_files.slice(0, 4).join(' · ')}
                                      {(d.matched_files_total || 0) > 4 &&
                                        ` · (+${(d.matched_files_total || 0) - 4} mais)`}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInspectModalDisco(d);
                                      setInspectMode('index');
                                      setInspectQuery(busca);
                                    }}
                                    className="text-blue-400 hover:underline font-medium shrink-0 cursor-pointer"
                                  >
                                    Ver todos os ficheiros correspondentes →
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PESQUISA RÁPIDA DE FICHEIROS .TIF */}
        {activeTab === 'pesquisa_tif' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Pesquisa Rápida de Ficheiros .TIF nos Relatórios Snap2HTML
                </h1>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Pesquisa indexada instantânea na tabela <span className="font-mono">relatorio_ficheiros</span> (
                  <span className="font-mono">idx_relatorio_ficheiros_nome</span>) · Suporta wildcards (
                  <span className="font-mono">*</span>, <span className="font-mono">?</span>) e normalização automática{' '}
                  <span className="font-mono">PT/</span> → <span className="font-mono">PT-</span>.
                </p>
              </div>
              <div className="font-mono text-xs text-blue-400">
                {formatNumber(tifTotal)} ficheiros encontrados em {tifElapsedMs} ms
              </div>
            </div>

            {/* TIF Search Controls */}
            <div
              className={`p-4 rounded-xl border grid grid-cols-1 md:grid-cols-12 gap-3 items-center ${
                theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="md:col-span-6 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={tifSearchQuery}
                  onChange={(e) => setTifSearchQuery(e.target.value)}
                  placeholder="Ex: PT-ADPRT-NOT*m0005.tif, PT/ANTT/*, *0042_m0012.tif, AHU..."
                  className={`w-full pl-9 pr-8 py-2 rounded-lg border text-xs font-mono focus:outline-none focus:border-blue-500 ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-800 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                {tifSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTifSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="md:col-span-3">
                <select
                  value={tifSearchArquivo}
                  onChange={(e) => setTifSearchArquivo(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none focus:border-blue-500 ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-800 text-slate-200'
                      : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="">Todos os Arquivos</option>
                  {Object.entries(arquivosMap).map(([sigla, nome]) => (
                    <option key={sigla} value={sigla}>
                      {sigla} — {nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 flex items-center justify-end gap-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={tifSearchOnlyTif}
                    onChange={(e) => setTifSearchOnlyTif(e.target.checked)}
                    className="rounded border-slate-700"
                  />
                  <span>Apenas ficheiros .TIF / .TIFF</span>
                </label>
              </div>
            </div>

            {/* TIF Results Table */}
            <div
              className={`border rounded-xl overflow-hidden ${
                theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
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
                      <th className="py-3 px-4">Nome do Ficheiro (.TIF)</th>
                      <th className="py-3 px-4">Pasta no Disco</th>
                      <th className="py-3 px-4 text-right">Tamanho</th>
                      <th className="py-3 px-4">Disco USB / Matriz</th>
                      <th className="py-3 px-4">Arquivo / Localização Física</th>
                      <th className="py-3 px-4">Ticket Envio</th>
                      <th className="py-3 px-4 text-right">Relatório</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs ${theme === 'dark' ? 'divide-slate-800/80' : 'divide-slate-200'}`}>
                    {tifLoading ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          A pesquisar no índice local SQLite...
                        </td>
                      </tr>
                    ) : tifResults.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400">
                          Nenhum ficheiro .TIF encontrado para o critério indicado.
                        </td>
                      </tr>
                    ) : (
                      tifResults.map((row) => (
                        <tr
                          key={row.id}
                          className={theme === 'dark' ? 'hover:bg-slate-900/90' : 'hover:bg-slate-50'}
                        >
                          <td className="py-2.5 px-4 font-mono font-semibold text-blue-400">
                            <button
                              type="button"
                              onClick={() => handleCopy(row.nome_ficheiro, `tif-${row.id}`)}
                              className="inline-flex items-center gap-1.5 hover:underline text-left cursor-pointer"
                              title="Clique para copiar o nome do ficheiro .TIF"
                            >
                              {row.nome_ficheiro}
                              {copiedKey === `tif-${row.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3 opacity-50" />
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-400">{row.pasta || '-'}</td>
                          <td className="py-2.5 px-4 font-mono tabular-nums text-right">
                            {formatBytes(row.tamanho_bytes)}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-semibold">
                            <button
                              type="button"
                              onClick={() => {
                                setBusca(row.id_disco || '');
                                setActiveTab('inventario');
                              }}
                              className="hover:underline text-blue-400 cursor-pointer"
                            >
                              {row.id_disco}
                            </button>
                          </td>
                          <td className="py-2.5 px-4">
                            <strong>{row.arquivo}</strong> · <span>{row.localizacao || '-'}</span>
                          </td>
                          <td className="py-2.5 px-4 font-mono tabular-nums">{row.ticket_num || '-'}</td>
                          <td className="py-2.5 px-4 text-right">
                            {row.relatorio_path && (
                              <a
                                href={`/relatorios/${row.relatorio_path}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-blue-400 hover:underline font-medium"
                              >
                                Abrir HTML <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PASTA RELATORIOS/ E INDEXAÇÃO SNAP2HTML */}
        {activeTab === 'relatorios' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Pasta Local <span className="font-mono text-blue-400">relatorios/</span> e Indexação Snap2HTML
                </h1>
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Todos os relatórios Snap2HTML importados são guardados em{' '}
                  <span className="font-mono">{relatoriosInfo.pasta_local}</span> e indexados automaticamente em{' '}
                  <span className="font-mono">{relatoriosInfo.db_local}</span>.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <a
                  href="/api/relatorios/exemplo-snap2html"
                  className={`px-3.5 py-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                    theme === 'dark'
                      ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-200'
                      : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  Descarregar Relatório Snap2HTML de Teste (.html)
                </a>

                <button
                  type="button"
                  onClick={handleReindexAll}
                  disabled={reindexing}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${reindexing ? 'animate-spin' : ''}`} />
                  {reindexing ? 'A Reindexar...' : 'Reindexar Pasta relatorios/'}
                </button>
              </div>
            </div>

            <div
              className={`border rounded-xl overflow-hidden ${
                theme === 'dark' ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
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
                      <th className="py-3 px-4">Ficheiro na Pasta relatorios/</th>
                      <th className="py-3 px-4 text-right">Tamanho HTML</th>
                      <th className="py-3 px-4">Disco Associado</th>
                      <th className="py-3 px-4">Arquivo / Projeto</th>
                      <th className="py-3 px-4 text-right">Total Indexados</th>
                      <th className="py-3 px-4 text-right">Matrizes .TIF</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y text-xs ${theme === 'dark' ? 'divide-slate-800/80' : 'divide-slate-200'}`}>
                    {relatoriosInfo.relatorios.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Nenhum ficheiro .html encontrado na pasta relatorios/.
                        </td>
                      </tr>
                    ) : (
                      relatoriosInfo.relatorios.map((r) => (
                        <tr
                          key={r.filename}
                          className={theme === 'dark' ? 'hover:bg-slate-900/90' : 'hover:bg-slate-50'}
                        >
                          <td className="py-3 px-4 font-mono font-medium text-blue-400">
                            <span className="inline-flex items-center gap-1.5">
                              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                              relatorios/{r.filename}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-right">
                            {formatBytes(r.size_bytes)}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold">
                            {r.disco ? r.disco.id_disco : 'Não associado'}
                          </td>
                          <td className="py-3 px-4">
                            {r.disco ? `${r.disco.arquivo} · ${r.disco.projeto || '-'}` : '-'}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-right">
                            {r.disco ? formatNumber(r.disco.total_indexados) : 0}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-right font-semibold text-emerald-400">
                            {r.disco ? formatNumber(r.disco.total_tif) : 0}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <a
                              href={`/relatorios/${r.filename}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-400 hover:underline font-medium"
                            >
                              Ver Relatório Original <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GESTÃO DE UTILIZADORES (ADMIN) */}
        {activeTab === 'usuarios' && currentUser.is_admin && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-500" />
                Gestão de Utilizadores
              </h1>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Administração de contas de acesso (Administradores e Operadores) gravadas na tabela{' '}
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
                <div className="md:col-span-4">
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
                <div className="md:col-span-4">
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
                <div className="md:col-span-2 flex items-center h-9">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUserAdmin}
                      onChange={(e) => setNewUserAdmin(e.target.checked)}
                    />
                    <span>Administrador</span>
                  </label>
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
                        <span className={u.is_admin ? 'text-blue-400 font-semibold' : 'text-slate-400'}>
                          {u.is_admin ? 'Administrador' : 'Operador'}
                        </span>
                        {u.id !== currentUser.id && (
                          <button
                            type="button"
                            onClick={() => handleToggleAdmin(u.id)}
                            title={u.is_admin ? 'Despromover para Operador' : 'Promover a Administrador'}
                            className="ml-2 inline-flex items-center text-slate-400 hover:text-blue-400 align-middle cursor-pointer"
                          >
                            {u.is_admin ? (
                              <ArrowDownCircle className="w-4 h-4" />
                            ) : (
                              <ArrowUpCircle className="w-4 h-4" />
                            )}
                          </button>
                        )}
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
      </main>

      {/* MODAL 1: CRIAR / EDITAR DISCO USB E IMPORTAR RELATÓRIO SNAP2HTML */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <div
            className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden my-8 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="px-6 py-4 bg-blue-600 text-white flex items-center justify-between">
              <h2 className="text-base font-bold">
                {editingDisco ? `Editar Disco: ${editingDisco.id_disco}` : 'Registar Novo Disco'}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded hover:bg-blue-700 transition-colors cursor-pointer"
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
                    value={formData.arquivo}
                    onChange={(e) => setFormData({ ...formData, arquivo: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-xs ${
                      theme === 'dark'
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
                    value={formData.remetente}
                    onChange={(e) => setFormData({ ...formData, remetente: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-xs ${
                      theme === 'dark'
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
                    value={formData.data_entrada}
                    onChange={(e) => setFormData({ ...formData, data_entrada: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Ticket nº *</label>
                  <input
                    type="text"
                    required
                    value={formData.ticket_num}
                    onChange={(e) => setFormData({ ...formData, ticket_num: e.target.value })}
                    placeholder="TICK-2026-..."
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">ID do disco *</label>
                  <input
                    type="text"
                    required
                    value={formData.id_disco}
                    onChange={(e) => setFormData({ ...formData, id_disco: e.target.value })}
                    placeholder="DISCO-..."
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Projeto</label>
                  <input
                    type="text"
                    value={formData.projeto}
                    onChange={(e) => setFormData({ ...formData, projeto: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border text-xs ${
                      theme === 'dark'
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
                    value={formData.localizacao}
                    onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                    placeholder="Armário A · Gaveta 2"
                    className={`w-full px-3 py-2 rounded-lg border text-xs ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Tamanho do disco</label>
                  <input
                    type="text"
                    value={formData.tamanho_disco}
                    onChange={(e) => setFormData({ ...formData, tamanho_disco: e.target.value })}
                    placeholder="4 TB"
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Marca</label>
                  <input
                    type="text"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    placeholder="Seagate / WD"
                    className={`w-full px-3 py-2 rounded-lg border text-xs ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">n/s: *</label>
                  <input
                    type="text"
                    required
                    value={formData.numero_serie}
                    onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                    placeholder="Número de série"
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-1">
                <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer py-2">
                  <input
                    type="checkbox"
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
                    value={formData.ticket_integracao}
                    onChange={(e) => setFormData({ ...formData, ticket_integracao: e.target.value })}
                    placeholder="INT-2026-..."
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer py-2">
                  <input
                    type="checkbox"
                    checked={formData.integrado}
                    onChange={(e) => setFormData({ ...formData, integrado: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span>Integrado (I)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer py-2">
                  <input
                    type="checkbox"
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
                    value={formData.total_imagens}
                    onChange={(e) =>
                      setFormData({ ...formData, total_imagens: parseInt(e.target.value, 10) || 0 })
                    }
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Snap2HTML Upload Field */}
              <div
                className={`p-4 rounded-xl border ${
                  theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <label className="block text-xs font-semibold mb-1">
                  Relatório do disco (Snap2HTML, .html / .htm) — Indexação Automática de Ficheiros .TIF
                </label>
                {editingDisco?.relatorio_path && (
                  <div className="text-xs text-slate-400 mb-2">
                    Relatório atual em <span className="font-mono">relatorios/</span>:{' '}
                    <a
                      href={`/relatorios/${editingDisco.relatorio_path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline font-mono"
                    >
                      {editingDisco.relatorio_path}
                    </a>{' '}
                    ({editingDisco.indexed_tif_count} ficheiros .TIF indexados) — selecione outro ficheiro abaixo para
                    substituir e reindexar.
                  </div>
                )}
                <input
                  type="file"
                  accept=".html,.htm"
                  onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  O ficheiro é gravado na pasta local <span className="font-mono">relatorios/</span> e todos os nomes de
                  ficheiros (<span className="font-mono">.tif</span>, metadados) são extraídos e indexados
                  automaticamente na base de dados SQLite.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Observações</label>
                <textarea
                  rows={3}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border text-xs ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
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
                  {inspectModalDisco.arquivo} · Ticket: {inspectModalDisco.ticket_num} · Localização:{' '}
                  {inspectModalDisco.localizacao || '-'} · Ficheiro:{' '}
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
                    Vista HTML Original
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
                      placeholder="Filtrar ficheiros .tif neste disco (ex: m0005.tif)..."
                      className={`w-full pl-9 pr-4 py-2 rounded-lg border text-xs font-mono ${
                        theme === 'dark'
                          ? 'bg-slate-950 border-slate-800 text-slate-100'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inspectOnlyTif}
                      onChange={(e) => setInspectOnlyTif(e.target.checked)}
                    />
                    <span>Apenas matrizes .TIF</span>
                  </label>
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
                        <th className="py-2.5 px-4">Nome do Ficheiro Indexado</th>
                        <th className="py-2.5 px-4 text-right">Tamanho</th>
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
        className={`border-t py-4 px-6 text-xs flex flex-wrap items-center justify-between gap-2 ${
          theme === 'dark' ? 'border-slate-900 text-slate-500' : 'border-slate-200 text-slate-500'
        }`}
      >
        <div>
          <strong>RIDIS · DGLAB</strong> — Direção-Geral do Livro, dos Arquivos e das Bibliotecas
        </div>
        <div className="font-mono">Base de Dados Local SQLite · Indexação Automática Snap2HTML (.TIF)</div>
      </footer>
    </div>
  );
}
