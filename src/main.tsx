/**
 * RIDIS — Gestão de Discos USB e Matrizes
 * 
 * Copyright (c) 2026 José Miguel Magalhães. Todos os direitos reservados.
 * Licenciado exclusivamente para uso interno da DGLAB (Direção-Geral do Livro, dos Arquivos e das Bibliotecas).
 * É expressamente proibida a cópia, reprodução, redistribuição ou utilização para qualquer outro fim.
 */

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
