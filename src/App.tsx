import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import {
  Download,
  Filter,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  MapPin,
  Users,
  Award,
  Vote,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  ArrowUpDown,
  BookOpen
} from 'lucide-react';

import dataSummary from './data-summary.json';
import rawRecords from './records.json';

interface RecordItem {
  ano: string;
  turno: string;
  municipio: string;
  numero: string;
  candidato: string;
  bairro: string;
  votos: number;
  perc: number;
  status: string;
  partido: string;
}

const PARTIDO_MAP: Record<string, string> = {
  '10': 'REPUBLICANOS',
  '11': 'PP',
  '12': 'PDT',
  '13': 'PT',
  '14': 'PTB',
  '15': 'MDB',
  '16': 'PSTU',
  '18': 'REDE',
  '20': 'PODE',
  '21': 'PCB',
  '22': 'PL',
  '23': 'CIDADANIA',
  '25': 'PRD',
  '27': 'DC',
  '28': 'PRTB',
  '29': 'PCO',
  '30': 'NOVO',
  '33': 'MOBILIZA',
  '35': 'PMB',
  '36': 'AGIR',
  '40': 'PSB',
  '43': 'PV',
  '44': 'UNIÃO',
  '45': 'PSDB',
  '50': 'PSOL',
  '55': 'PSD',
  '70': 'AVANTE',
  '77': 'SOLIDARIEDADE'
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'redutos' | 'candidato' | 'bairro' | 'tabela' | 'auditoria'>('overview');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [partyFilter, setPartyFilter] = useState<string>('ALL');
  const [candidateFilter, setCandidateFilter] = useState<string>('ALL');
  const [bairroFilter, setBairroFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected for drilldown tabs
  const [selectedCandidate, setSelectedCandidate] = useState<string>('PRISCILA COSTA');
  const [selectedBairro, setSelectedBairro] = useState<string>('MESSEJANA');

  // Table pagination & sort
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [sortField, setSortField] = useState<keyof RecordItem>('votos');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Normalized records
  const allRecords: RecordItem[] = useMemo(() => {
    return (rawRecords as any[]).map(r => ({
      ano: r.ano,
      turno: r.turno,
      municipio: r.municipio,
      numero: r.numero,
      candidato: r.candidato,
      bairro: r.bairro,
      votos: r.votos,
      perc: r.perc,
      status: r.status,
      partido: PARTIDO_MAP[r.numero.substring(0, 2)] || ('Legenda ' + r.numero.substring(0, 2))
    }));
  }, []);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (partyFilter !== 'ALL' && r.partido !== partyFilter) return false;
      if (candidateFilter !== 'ALL' && r.candidato !== candidateFilter) return false;
      if (bairroFilter !== 'ALL' && r.bairro !== bairroFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mCand = r.candidato.toLowerCase().includes(q);
        const mBairro = r.bairro.toLowerCase().includes(q);
        const mNum = r.numero.includes(q);
        const mParty = r.partido.toLowerCase().includes(q);
        if (!mCand && !mBairro && !mNum && !mParty) return false;
      }
      return true;
    });
  }, [allRecords, statusFilter, partyFilter, candidateFilter, bairroFilter, searchQuery]);

  // Unique lists for selectors
  const uniqueParties = useMemo(() => [...new Set(allRecords.map(r => r.partido))].sort(), [allRecords]);
  const uniqueCandidates = useMemo(() => [...new Set(allRecords.map(r => r.candidato))].sort(), [allRecords]);
  const uniqueBairros = useMemo(() => [...new Set(allRecords.map(r => r.bairro))].sort(), [allRecords]);

  // KPIs
  const kpis = useMemo(() => {
    const totalVotos = filteredRecords.reduce((acc, r) => acc + r.votos, 0);
    const count = filteredRecords.length;
    if (count === 0) {
      return {
        totalVotos: 0,
        avgVotos: 0,
        medianVotos: 0,
        stdDev: 0,
        maxVotos: 0,
        maxDetail: '-',
        eleitosPerc: 0,
        eleitosVotos: 0,
        bairrosAtivos: 0,
        candidatosAtivos: 0
      };
    }
    const avg = totalVotos / count;
    const sorted = [...filteredRecords].map(r => r.votos).sort((a,b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = sorted.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    let maxItem = filteredRecords[0];
    filteredRecords.forEach(r => {
      if (r.votos > maxItem.votos) maxItem = r;
    });

    const eleitosVotos = filteredRecords.filter(r => r.status === 'ELEITO').reduce((acc, r) => acc + r.votos, 0);
    const eleitosPerc = totalVotos > 0 ? (eleitosVotos / totalVotos) * 100 : 0;

    const bairrosAtivos = new Set(filteredRecords.map(r => r.bairro)).size;
    const candidatosAtivos = new Set(filteredRecords.map(r => r.candidato)).size;

    return {
      totalVotos,
      avgVotos: avg,
      medianVotos: median,
      stdDev,
      maxVotos: maxItem.votos,
      maxDetail: `${maxItem.candidato} (${maxItem.bairro})`,
      eleitosPerc,
      eleitosVotos,
      bairrosAtivos,
      candidatosAtivos
    };
  }, [filteredRecords]);

  // Sorted and Paginated Table data
  const sortedTableData = useMemo(() => {
    const data = [...filteredRecords];
    data.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
    return data;
  }, [filteredRecords, sortField, sortAsc]);

  const totalPages = Math.ceil(sortedTableData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTableData.slice(start, start + pageSize);
  }, [sortedTableData, currentPage, pageSize]);

  // Chart References
  const overviewCandChartRef = useRef<HTMLDivElement>(null);
  const overviewBairroChartRef = useRef<HTMLDivElement>(null);
  const overviewPartyChartRef = useRef<HTMLDivElement>(null);
  const overviewRedutoChartRef = useRef<HTMLDivElement>(null);
  const drillCandidateChartRef = useRef<HTMLDivElement>(null);
  const drillBairroChartRef = useRef<HTMLDivElement>(null);

  // Helper for safe ECharts instance retrieval
  const getOrCreateChart = (dom: HTMLDivElement | null) => {
    if (!dom) return null;
    return echarts.getInstanceByDom(dom) || echarts.init(dom);
  };

  // Overview Charts render
  useEffect(() => {
    if (activeTab !== 'overview') return;

    const chartCand = getOrCreateChart(overviewCandChartRef.current);
    const chartBairro = getOrCreateChart(overviewBairroChartRef.current);
    const chartParty = getOrCreateChart(overviewPartyChartRef.current);
    const chartReduto = getOrCreateChart(overviewRedutoChartRef.current);
    if (chartCand) {
      const candMap: Record<string, { votos: number; status: string; partido: string }> = {};
      filteredRecords.forEach(r => {
        if (!candMap[r.candidato]) candMap[r.candidato] = { votos: 0, status: r.status, partido: r.partido };
        candMap[r.candidato].votos += r.votos;
      });
      const topCands = Object.entries(candMap).sort((a, b) => b[1].votos - a[1].votos).slice(0, 12).reverse();

      chartCand.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params: any) => {
            const p = params[0];
            return `<strong>${p.name}</strong><br/>Total: ${p.value.toLocaleString('pt-BR')} votos`;
          }
        },
        grid: { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
        xAxis: { type: 'value', axisLabel: { formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v) } },
        yAxis: { type: 'category', data: topCands.map(c => c[0]), axisLabel: { fontSize: 11 } },
        series: [{
          type: 'bar',
          data: topCands.map(c => ({
            value: c[1].votos,
            itemStyle: { color: c[1].status === 'ELEITO' ? '#2563eb' : '#94a3b8' }
          })),
          label: { show: true, position: 'right', formatter: (p: any) => p.value.toLocaleString('pt-BR'), fontSize: 10 }
        }]
      });
    }

    if (chartBairro) {
      const bMap: Record<string, number> = {};
      filteredRecords.forEach(r => {
        bMap[r.bairro] = (bMap[r.bairro] || 0) + r.votos;
      });
      const topBairros = Object.entries(bMap).sort((a, b) => b[1] - a[1]).slice(0, 12);

      chartBairro.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params: any) => {
            const p = params[0];
            return `<strong>${p.name}</strong><br/>Votos no Bairro: ${p.value.toLocaleString('pt-BR')}`;
          }
        },
        grid: { left: '3%', right: '4%', bottom: '18%', top: '5%', containLabel: true },
        xAxis: {
          type: 'category',
          data: topBairros.map(b => b[0]),
          axisLabel: { interval: 0, rotate: 30, fontSize: 10 }
        },
        yAxis: { type: 'value', axisLabel: { formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v) } },
        series: [{
          type: 'bar',
          data: topBairros.map(b => b[1]),
          itemStyle: { color: '#0284c7' }
        }]
      });
    }

    if (chartParty) {
      const pMap: Record<string, number> = {};
      filteredRecords.forEach(r => {
        pMap[r.partido] = (pMap[r.partido] || 0) + r.votos;
      });
      const partyData = Object.entries(pMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));

      chartParty.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c} votos ({d}%)' },
        legend: { orient: 'horizontal', bottom: 0, textStyle: { fontSize: 11 } },
        series: [{
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          data: partyData
        }]
      });
    }

    if (chartReduto) {
      const candMap: Record<string, { total: number; bairros: Record<string, number> }> = {};
      filteredRecords.forEach(r => {
        if (!candMap[r.candidato]) candMap[r.candidato] = { total: 0, bairros: {} };
        candMap[r.candidato].total += r.votos;
        candMap[r.candidato].bairros[r.bairro] = (candMap[r.candidato].bairros[r.bairro] || 0) + r.votos;
      });

      const list = Object.entries(candMap)
        .map(([nome, d]) => {
          let topB = '';
          let topV = 0;
          Object.entries(d.bairros).forEach(([b, v]) => {
            if (v > topV) { topV = v; topB = b; }
          });
          const perc = d.total > 0 ? (topV / d.total) * 100 : 0;
          return { nome, total: d.total, topB, topV, perc };
        })
        .filter(c => c.total >= 3000)
        .sort((a, b) => b.perc - a.perc)
        .slice(0, 10);

      chartReduto.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params: any) => {
            const p = params[0];
            const item = list[p.dataIndex];
            return `<strong>${item.nome}</strong><br/>Reduto: ${item.topB}<br/>Concentração: ${item.perc.toFixed(1)}% (${item.topV.toLocaleString('pt-BR')} de ${item.total.toLocaleString('pt-BR')} votos)`;
          }
        },
        grid: { left: '3%', right: '10%', bottom: '5%', top: '5%', containLabel: true },
        xAxis: { type: 'value', max: 70, axisLabel: { formatter: '{value}%' } },
        yAxis: { type: 'category', data: list.map(c => c.nome).reverse(), axisLabel: { fontSize: 10 } },
        series: [{
          type: 'bar',
          data: list.map(c => c.perc.toFixed(1)).reverse(),
          itemStyle: {
            color: (p: any) => p.value > 30 ? '#dc2626' : (p.value > 15 ? '#ea580c' : '#2563eb')
          },
          label: { show: true, position: 'right', formatter: '{c}%', fontSize: 10 }
        }]
      });
    }

    const handleResize = () => {
      chartCand?.resize();
      chartBairro?.resize();
      chartParty?.resize();
      chartReduto?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [activeTab, filteredRecords]);

  // Candidate Drilldown chart
  useEffect(() => {
    if (activeTab !== 'candidato') return;
    const chart = getOrCreateChart(drillCandidateChartRef.current);
    if (chart) {
      const candRows = allRecords.filter(r => r.candidato === selectedCandidate);
      const topRows = candRows.sort((a, b) => b.votos - a.votos).slice(0, 12).reverse();

      chart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: topRows.map(r => r.bairro) },
        series: [{
          type: 'bar',
          data: topRows.map(r => r.votos),
          itemStyle: { color: '#2563eb' },
          label: { show: true, position: 'right', formatter: (p: any) => p.value.toLocaleString('pt-BR') }
        }]
      });
    }
    const handleResize = () => chart?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [activeTab, selectedCandidate, allRecords]);

  // Bairro Drilldown chart
  useEffect(() => {
    if (activeTab !== 'bairro') return;
    const chart = getOrCreateChart(drillBairroChartRef.current);
    if (chart) {
      const bRows = allRecords.filter(r => r.bairro === selectedBairro);
      const topRows = bRows.sort((a, b) => b.votos - a.votos).slice(0, 12).reverse();

      chart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
        xAxis: { type: 'value' },
        yAxis: { type: 'category', data: topRows.map(r => r.candidato) },
        series: [{
          type: 'bar',
          data: topRows.map(r => r.votos),
          itemStyle: { color: '#0d9488' },
          label: { show: true, position: 'right', formatter: (p: any) => p.value.toLocaleString('pt-BR') }
        }]
      });
    }
    const handleResize = () => chart?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [activeTab, selectedBairro, allRecords]);

  // Export CSV
  const handleExportCSV = () => {
    let csv = 'Ano,Turno,Municipio,Numero,Candidato,Partido,Bairro,Votos,% Votos Obtidos,Status\n';
    filteredRecords.forEach(r => {
      csv += `"${r.ano}","${r.turno}","${r.municipio}","${r.numero}","${r.candidato}","${r.partido}","${r.bairro}",${r.votos},"${r.perc.toFixed(2).replace('.', ',')}","${r.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'analise_votacao_fortaleza_2024_filtrado.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setPartyFilter('ALL');
    setCandidateFilter('ALL');
    setBairroFilter('ALL');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Sort Table
  const handleSort = (field: keyof RecordItem) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'candidato' || field === 'bairro' || field === 'partido');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              FZ
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight">Fortaleza Eleições 2024</span>
              <span className="text-xs text-slate-500 block">Painel Executivo de Votação por Bairro</span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => setActiveTab('overview')}
              className={`hover:text-blue-600 transition-colors whitespace-nowrap pb-1 ${activeTab === 'overview' ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : ''}`}
            >
              Visão Executiva
            </button>
            <button
              onClick={() => setActiveTab('redutos')}
              className={`hover:text-blue-600 transition-colors whitespace-nowrap pb-1 ${activeTab === 'redutos' ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : ''}`}
            >
              Redutos Eleitorais
            </button>
            <button
              onClick={() => setActiveTab('candidato')}
              className={`hover:text-blue-600 transition-colors whitespace-nowrap pb-1 ${activeTab === 'candidato' ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : ''}`}
            >
              Raio-X Candidato
            </button>
            <button
              onClick={() => setActiveTab('bairro')}
              className={`hover:text-blue-600 transition-colors whitespace-nowrap pb-1 ${activeTab === 'bairro' ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : ''}`}
            >
              Análise Bairros
            </button>
            <button
              onClick={() => setActiveTab('tabela')}
              className={`hover:text-blue-600 transition-colors whitespace-nowrap pb-1 ${activeTab === 'tabela' ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : ''}`}
            >
              Base Completa
            </button>
            <button
              onClick={() => setActiveTab('auditoria')}
              className={`hover:text-blue-600 transition-colors whitespace-nowrap pb-1 ${activeTab === 'auditoria' ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : ''}`}
            >
              Auditoria de Dados
            </button>
          </nav>

          {/* Zone 3: Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="./dashboard.html"
              download="dashboard_votacao_fortaleza_2024.html"
              className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs"
              title="Baixar arquivo HTML autocontido com os dados completos"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar HTML Autocontido
            </a>
            <a
              href="./dashboard.html"
              target="_blank"
              rel="noreferrer"
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Abrir versão HTML independente em nova aba"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* SUB-HEADER / MOBILE NAV */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs">
        {(['overview', 'redutos', 'candidato', 'bairro', 'tabela', 'auditoria'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap font-medium ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-100'}`}
          >
            {tab === 'overview' && 'Visão'}
            {tab === 'redutos' && 'Redutos'}
            {tab === 'candidato' && 'Candidato'}
            {tab === 'bairro' && 'Bairro'}
            {tab === 'tabela' && 'Base'}
            {tab === 'auditoria' && 'Auditoria'}
          </button>
        ))}
      </div>

      {/* MAIN VIEWPORT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6 w-full">

        {/* HERO / CONTEXT BANNER */}
        <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-700/50">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <span>TRE-CE 2024</span>
              <span>·</span>
              <span>1º Turno</span>
              <span>·</span>
              <span>Fortaleza / CE</span>
              <span>·</span>
              <span>Câmara Municipal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Painel Estratégico de Inteligência Eleitoral: Votação por Bairro
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Consolidação analítica de <strong>586.560 votos</strong> auditados em <strong>111 bairros</strong> da capital cearense. Cruzamento de métricas contínuas, concentração territorial, correlações e distribuição de bancadas.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 shrink-0 bg-white/5 p-3.5 rounded-lg border border-white/10">
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Linhas Auditadas</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5 tabular-nums">5.789</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Eleitos / Suplentes</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5 tabular-nums">42 / 12</div>
            </div>
          </div>
        </section>

        {/* FILTER BAR (Visible for Overview & Tabela) */}
        {(activeTab === 'overview' || activeTab === 'redutos' || activeTab === 'tabela') && (
          <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Filtros Cruzados Multidimensionais</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-md border border-blue-200 tabular-nums">
                  {filteredRecords.length.toLocaleString('pt-BR')} registros ativos
                </span>
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-semibold text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Status Eleitoral</label>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">Todos os Resultados (54 candidatos)</option>
                  <option value="ELEITO">Somente ELEITOS (42 candidatos)</option>
                  <option value="SUPLENTE">Somente SUPLENTES (12 candidatos)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Partido / Legenda</label>
                <select
                  value={partyFilter}
                  onChange={e => { setPartyFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">Todos os Partidos ({uniqueParties.length})</option>
                  {uniqueParties.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Candidato</label>
                <select
                  value={candidateFilter}
                  onChange={e => { setCandidateFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">Todos os Candidatos ({uniqueCandidates.length})</option>
                  {uniqueCandidates.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Bairro</label>
                <select
                  value={bairroFilter}
                  onChange={e => { setBairroFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="ALL">Todos os Bairros ({uniqueBairros.length})</option>
                  {uniqueBairros.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        )}

        {/* TAB 1: VISÃO GERAL */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total de Votos</span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 block mt-1 tabular-nums">
                  {kpis.totalVotos.toLocaleString('pt-BR')}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{filteredRecords.length.toLocaleString('pt-BR')} registros</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Média p/ Registro</span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 block mt-1 tabular-nums">
                  {kpis.avgVotos.toFixed(1).replace('.', ',')}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Votos médios/bairro</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Mediana</span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 block mt-1 tabular-nums">
                  {kpis.medianVotos.toLocaleString('pt-BR')}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Ponto central 50%</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Desvio Padrão</span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-amber-700 block mt-1 tabular-nums">
                  {kpis.stdDev.toFixed(1).replace('.', ',')}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Alta assimetria</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Pico em 1 Bairro</span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-blue-700 block mt-1 tabular-nums">
                  {kpis.maxVotos.toLocaleString('pt-BR')}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block truncate" title={kpis.maxDetail}>
                  {kpis.maxDetail}
                </span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Bairros Ativos</span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 block mt-1 tabular-nums">
                  {kpis.bairrosAtivos}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">de 111 mapeados</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">% Votos Eleitos</span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 block mt-1 tabular-nums">
                  {kpis.eleitosPerc.toFixed(1).replace('.', ',')}%
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{kpis.eleitosVotos.toLocaleString('pt-BR')} votos</span>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Top Candidatos por Votação</h3>
                    <p className="text-xs text-slate-500">Azul: Eleito · Cinza: Suplente</p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Barras</span>
                </div>
                <div ref={overviewCandChartRef} className="w-full h-80" />
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Top Bairros em Volume de Votos</h3>
                    <p className="text-xs text-slate-500">Maiores colégios eleitorais apurados</p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Volume</span>
                </div>
                <div ref={overviewBairroChartRef} className="w-full h-80" />
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Distribuição de Votos por Partido</h3>
                    <p className="text-xs text-slate-500">Participação percentual das maiores legendas</p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Rosca</span>
                </div>
                <div ref={overviewPartyChartRef} className="w-full h-80" />
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Concentração Eleitoral no Bairro Líder</h3>
                    <p className="text-xs text-slate-500">% do total de votos obtida em um único bairro</p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Top Redutos</span>
                </div>
                <div ref={overviewRedutoChartRef} className="w-full h-80" />
              </div>
            </div>

            {/* Strategic Insights Cards */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <h2 className="text-base font-bold text-slate-900">Insights Estratégicos Baseados nos Dados</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 uppercase text-[11px]">1. Hiper-Concentração</span>
                    <span className="font-mono font-semibold text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded text-[10px]">Até 63,9%</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Candidatos como <strong>Marcos Paulo (11111)</strong> concentraram <strong>63,9%</strong> dos seus votos num único bairro (Conjunto Palmeiras com 3.190 votos), demonstrando a força decisiva do voto hiper-local para a vitória.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 uppercase text-[11px]">2. Votação Capilar</span>
                    <span className="font-mono font-semibold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded text-[10px]">Liderança Geral</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    <strong>Priscila Costa (PL - 36.226 votos)</strong> foi a mais votada na cidade inteira com perfil disperso: seu bairro número 1 (Messejana) representou apenas <strong>3,4%</strong> do seu total, somando votos em praticamente todos os 111 bairros.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-900 uppercase text-[11px]">3. Polarização Geográfica</span>
                    <span className="font-mono font-semibold text-indigo-700 bg-indigo-100/60 px-1.5 py-0.5 rounded text-[10px]">Leste vs Oeste</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    A Aldeota e Meireles concentraram os maiores índices de <strong>Gabriel Biologia (PSOL)</strong> e <strong>Bella Carmelo (PL)</strong>, enquanto na Zona Oeste e Sul (Antônio Bezerra, Messejana, Siqueira) prevaleceram bancadas comunitárias do <strong>PDT</strong> e <strong>PSD</strong>.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 uppercase text-[11px]">4. Suplentes com Reduto</span>
                    <span className="font-mono font-semibold text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded text-[10px]">Quociente</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    O candidato <strong>Claudio Lima (70369 - Suplente)</strong> teve expressivos <strong>2.322 votos no Cristo Redentor</strong>, superando quase todos os eleitos no local, evidenciando como a barreira de legenda afeta a ocupação de cadeiras.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REDUTOS ELEITORAIS */}
        {activeTab === 'redutos' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-red-600" />
                Matriz de Redutos Eleitorais: Dependência Territorial
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
                Esta análise cruza o <strong>volume total de votos</strong> de cada candidato com o <strong>peso percentual do seu bairro mais representativo</strong>. Candidatos com mais de 30% de seus votos num só bairro dependem fortemente de uma única base geográfica (hiper-reduto), ao passo que candidatos com menos de 10% dependem de capilaridade em toda a cidade.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dataSummary.allCandidates.slice(0, 15).map(c => {
                const percNum = parseFloat(c.concentracaoTopBairro);
                const isHigh = percNum >= 30;
                const isMed = percNum >= 15 && percNum < 30;
                return (
                  <div key={c.nome} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-900 text-sm block leading-tight">{c.nome}</span>
                          <span className="text-xs text-slate-500 font-mono">{c.numero} · {c.partido}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${c.status === 'ELEITO' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {c.status}
                        </span>
                      </div>

                      <div className="mt-4 space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Votos Totais na Base:</span>
                          <span className="font-mono font-bold text-slate-900">{c.votosTotal.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Bairro Principal:</span>
                          <span className="font-bold text-blue-700">{c.topBairro}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Votos no Bairro Principal:</span>
                          <span className="font-mono text-slate-800">{c.topBairroVotos.toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500 font-medium">Índice de Concentração</span>
                        <span className={`font-mono font-bold ${isHigh ? 'text-red-600' : isMed ? 'text-amber-600' : 'text-blue-600'}`}>
                          {c.concentracaoTopBairro}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isHigh ? 'bg-red-500' : isMed ? 'bg-amber-500' : 'bg-blue-600'}`}
                          style={{ width: `${Math.min(percNum * 1.5, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: RAIO-X POR CANDIDATO */}
        {activeTab === 'candidato' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Selecione o Candidato para Auditoria Territorial</h2>
                <p className="text-xs text-slate-500">Exibição detalhada de desempenho em todos os 111 bairros</p>
              </div>
              <div className="w-full md:w-80">
                <select
                  value={selectedCandidate}
                  onChange={e => setSelectedCandidate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {uniqueCandidates.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {(() => {
              const candData = dataSummary.allCandidates.find(c => c.nome === selectedCandidate) || {
                nome: selectedCandidate,
                numero: '-',
                partido: '-',
                status: '-',
                votosTotal: 0,
                topBairro: '-',
                topBairroVotos: 0,
                concentracaoTopBairro: '0'
              };
              const candRows = allRecords.filter(r => r.candidato === selectedCandidate).sort((a,b) => b.votos - a.votos);

              return (
                <div className="space-y-6">
                  {/* Cand Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Candidato & Partido</span>
                      <span className="text-base sm:text-lg font-bold text-slate-900 block mt-1 truncate">{candData.nome}</span>
                      <span className="text-xs text-slate-500 font-mono mt-0.5 block">{candData.numero} · {candData.partido}</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Resultado</span>
                      <span className={`text-lg sm:text-xl font-bold block mt-1 ${candData.status === 'ELEITO' ? 'text-emerald-600' : 'text-slate-600'}`}>
                        {candData.status}
                      </span>
                      <span className="text-xs text-slate-400 mt-0.5 block">Câmara Municipal</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total de Votos</span>
                      <span className="text-xl sm:text-2xl font-bold font-mono text-blue-700 block mt-1 tabular-nums">
                        {candData.votosTotal.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-xs text-slate-400 mt-0.5 block">em {candRows.length} bairros</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Bairro Líder (Reduto)</span>
                      <span className="text-base sm:text-lg font-bold text-slate-900 block mt-1 truncate">{candData.topBairro}</span>
                      <span className="text-xs font-mono text-slate-500 mt-0.5 block">
                        {candData.topBairroVotos.toLocaleString('pt-BR')} votos ({candData.concentracaoTopBairro}%)
                      </span>
                    </div>
                  </div>

                  {/* Cand Chart & Table */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
                      <h3 className="text-sm font-bold text-slate-900 pb-2 mb-3 border-b border-slate-100">
                        Top 12 Bairros com Maior Votação de {selectedCandidate}
                      </h3>
                      <div ref={drillCandidateChartRef} className="w-full h-80" />
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
                      <h3 className="text-sm font-bold text-slate-900 pb-2 mb-3 border-b border-slate-100 flex items-center justify-between">
                        <span>Votação Detalhada por Bairro</span>
                        <span className="text-xs text-slate-400 font-mono">{candRows.length} bairros</span>
                      </h3>
                      <div className="overflow-y-auto max-h-80 divide-y divide-slate-100 text-xs">
                        {candRows.map((r, i) => (
                          <div key={r.bairro} className="py-2 flex items-center justify-between hover:bg-slate-50 px-2 rounded">
                            <span className="text-slate-800 font-medium">
                              <span className="text-slate-400 font-mono mr-2">{i + 1}.</span>
                              {r.bairro}
                            </span>
                            <div className="flex items-center gap-3 font-mono">
                              <span className="font-bold text-slate-900">{r.votos.toLocaleString('pt-BR')} votos</span>
                              <span className="text-slate-500 text-[11px]">{((r.votos / candData.votosTotal) * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 4: ANÁLISE POR BAIRRO */}
        {activeTab === 'bairro' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Selecione o Bairro / Colégio Eleitoral</h2>
                <p className="text-xs text-slate-500">Avalie os candidatos líderes e a distribuição política no bairro</p>
              </div>
              <div className="w-full md:w-80">
                <select
                  value={selectedBairro}
                  onChange={e => setSelectedBairro(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {uniqueBairros.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {(() => {
              const bRows = allRecords.filter(r => r.bairro === selectedBairro).sort((a,b) => b.votos - a.votos);
              const totalBairroVotos = bRows.reduce((acc, r) => acc + r.votos, 0);
              const leader = bRows[0] || { candidato: '-', votos: 0, partido: '-', status: '-' };
              const leaderPerc = totalBairroVotos > 0 ? (leader.votos / totalBairroVotos) * 100 : 0;

              return (
                <div className="space-y-6">
                  {/* Bairro Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Bairro</span>
                      <span className="text-lg font-bold text-slate-900 block mt-1 truncate">{selectedBairro}</span>
                      <span className="text-xs text-slate-400 mt-0.5 block">Fortaleza / CE</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Votos Totais no Bairro</span>
                      <span className="text-xl sm:text-2xl font-bold font-mono text-blue-700 block mt-1 tabular-nums">
                        {totalBairroVotos.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-xs text-slate-400 mt-0.5 block">{bRows.length} candidatos pontuaram</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Candidato Vencedor</span>
                      <span className="text-base font-bold text-slate-900 block mt-1 truncate">{leader.candidato}</span>
                      <span className="text-xs text-slate-500 font-mono mt-0.5 block">{leader.partido} ({leader.status})</span>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Votos do Vencedor</span>
                      <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 block mt-1 tabular-nums">
                        {leader.votos.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-xs text-slate-500 font-mono mt-0.5 block">{leaderPerc.toFixed(1)}% dos votos do bairro</span>
                    </div>
                  </div>

                  {/* Bairro Chart & Table */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
                      <h3 className="text-sm font-bold text-slate-900 pb-2 mb-3 border-b border-slate-100">
                        Top 12 Mais Votados em {selectedBairro}
                      </h3>
                      <div ref={drillBairroChartRef} className="w-full h-80" />
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
                      <h3 className="text-sm font-bold text-slate-900 pb-2 mb-3 border-b border-slate-100 flex items-center justify-between">
                        <span>Ranking Completo no Bairro</span>
                        <span className="text-xs text-slate-400 font-mono">{bRows.length} registros</span>
                      </h3>
                      <div className="overflow-y-auto max-h-80 divide-y divide-slate-100 text-xs">
                        {bRows.map((r, i) => (
                          <div key={r.candidato} className="py-2 flex items-center justify-between hover:bg-slate-50 px-2 rounded">
                            <div>
                              <span className="text-slate-400 font-mono mr-2">{i + 1}.</span>
                              <span className="text-slate-900 font-semibold">{r.candidato}</span>
                              <span className="text-slate-400 text-[11px] ml-1.5">({r.partido})</span>
                            </div>
                            <div className="flex items-center gap-3 font-mono">
                              <span className="font-bold text-slate-900">{r.votos.toLocaleString('pt-BR')}</span>
                              <span className="text-slate-500 text-[11px]">{((r.votos / totalBairroVotos) * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 5: TABELA ANALÍTICA */}
        {activeTab === 'tabela' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Base Tabulada Auditada (TRE-CE)</h2>
                <p className="text-xs text-slate-500">Ordenação multicritério, pesquisa em tempo real e exportação</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder="Pesquisar candidato ou bairro..."
                    className="bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2" />
                </div>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[550px]">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('candidato')}>
                      <div className="flex items-center gap-1">Candidato <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                    </th>
                    <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('numero')}>
                      <div className="flex items-center gap-1">Número <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                    </th>
                    <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('partido')}>
                      <div className="flex items-center gap-1">Partido <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                    </th>
                    <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('bairro')}>
                      <div className="flex items-center gap-1">Bairro <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                    </th>
                    <th className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('votos')}>
                      <div className="flex items-center justify-end gap-1">Votos <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                    </th>
                    <th className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('perc')}>
                      <div className="flex items-center justify-end gap-1">% Bairro <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                    </th>
                    <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">Status <ArrowUpDown className="w-3 h-3 text-slate-400" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-normal">
                  {paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Nenhum registro encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((r, i) => (
                      <tr key={`${r.numero}-${r.bairro}-${i}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">{r.candidato}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{r.numero}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-700">{r.partido}</td>
                        <td className="py-2.5 px-4 text-slate-800 font-medium">{r.bairro}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{r.votos.toLocaleString('pt-BR')}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600">{r.perc.toFixed(2).replace('.', ',')}%</td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <span className={`text-xs font-semibold ${r.status === 'ELEITO' ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
              <div>
                Mostrando {sortedTableData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, sortedTableData.length)} de {sortedTableData.length.toLocaleString('pt-BR')} linhas
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span>Itens por página:</span>
                  <select
                    value={pageSize}
                    onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono px-2 font-semibold">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: AUDITORIA & METODOLOGIA */}
        {activeTab === 'auditoria' && (
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-6 text-xs text-slate-700">
            <div className="pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Auditoria de Dados, Mapeamento de Colunas e Metodologia Científica
              </h2>
              <p className="text-slate-500 mt-1">
                Documentação técnica da base de dados de votação eleitoral em Fortaleza 2024.
              </p>
            </div>

            {/* Column Audit Table */}
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-2.5">1. Dicionário e Classificação de Colunas</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50 font-semibold text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Coluna</th>
                      <th className="py-2.5 px-3">Tipo de Dado</th>
                      <th className="py-2.5 px-3">Classificação Estatística</th>
                      <th className="py-2.5 px-3">Valores Nulos / Faltantes</th>
                      <th className="py-2.5 px-3">Descrição e Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">Ano</td>
                      <td className="py-2 px-3">Inteiro</td>
                      <td className="py-2 px-3">Temporal / Discreta</td>
                      <td className="py-2 px-3 text-emerald-600 font-semibold">0 (100% preenchido)</td>
                      <td className="py-2 px-3">Ano da eleição municipal (2024).</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">Turno</td>
                      <td className="py-2 px-3">Inteiro</td>
                      <td className="py-2 px-3">Categórica Ordinal</td>
                      <td className="py-2 px-3 text-emerald-600 font-semibold">0 (100% preenchido)</td>
                      <td className="py-2 px-3">Turno eleitoral (1 = Primeiro Turno proporcional).</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">Município</td>
                      <td className="py-2 px-3">Texto</td>
                      <td className="py-2 px-3">Categórica / Geográfica</td>
                      <td className="py-2 px-3 text-emerald-600 font-semibold">0 (100% preenchido)</td>
                      <td className="py-2 px-3">Município de apuração: FORTALEZA (CE).</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">Número</td>
                      <td className="py-2 px-3">Texto / Cód.</td>
                      <td className="py-2 px-3">Identificador / Categórica</td>
                      <td className="py-2 px-3 text-emerald-600 font-semibold">0 (100% preenchido)</td>
                      <td className="py-2 px-3">Número de urna (5 dígitos). Os 2 primeiros dígitos identificam a legenda partidária.</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">Candidato</td>
                      <td className="py-2 px-3">Texto</td>
                      <td className="py-2 px-3">Categórica Nominal</td>
                      <td className="py-2 px-3 text-emerald-600 font-semibold">0 (100% preenchido)</td>
                      <td className="py-2 px-3">Nome de urna do candidato a vereador (54 nomes únicos monitorados).</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">Bairro</td>
                      <td className="py-2 px-3">Texto</td>
                      <td className="py-2 px-3">Categórica Geográfica</td>
                      <td className="py-2 px-3 text-emerald-600 font-semibold">0 (100% preenchido)</td>
                      <td className="py-2 px-3">Bairro de votação (111 bairros distintos com pequenas variações de grafia tratadas).</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">Votos</td>
                      <td className="py-2 px-3">Inteiro</td>
                      <td className="py-2 px-3">Numérica Quantitativa Discreta</td>
                      <td className="py-2 px-3 text-emerald-600 font-semibold">0 (100% preenchido)</td>
                      <td className="py-2 px-3">Quantidade total de votos nominais recebidos no bairro. Varia de 1 a 4.978.</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">% Votos Obtidos</td>
                      <td className="py-2 px-3">Decimal</td>
                      <td className="py-2 px-3">Numérica Contínua</td>
                      <td className="py-2 px-3 text-emerald-600 font-semibold">0 (100% preenchido)</td>
                      <td className="py-2 px-3">Percentual de votos obtidos pelo candidato nas seções daquele bairro.</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold text-slate-900">STATUS</td>
                      <td className="py-2 px-3">Texto</td>
                      <td className="py-2 px-3">Categórica Binária</td>
                      <td className="py-2 px-3 text-emerald-600 font-semibold">0 (100% preenchido)</td>
                      <td className="py-2 px-3">Resultado da eleição: ELEITO (42) ou SUPLENTE (12).</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quality and Anomalies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Qualidade e Integridade dos Dados
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed">
                  <li><strong>Total de Linhas:</strong> 5.789 registros tabulados.</li>
                  <li><strong>Ausência de Nulos:</strong> 0 valores nulos ou vazios nas colunas essenciais.</li>
                  <li><strong>Formatação Decimal:</strong> Percentuais com vírgula padrão brasileiro normalizados para cálculos numéricos.</li>
                  <li><strong>Soma Verificada:</strong> 586.560 votos exatos sem duplicação de chave (candidato + bairro).</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Tratamento de Inconsistências de Grafia
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  Identificaram-se pequenas inconsistências textuais no campo <code>Bairro</code> decorrentes de digitação manual na fonte original:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li><code>JOÃO XXIII</code> vs <code>JOÃOXIII</code> (sem espaço).</li>
                  <li><code>Dionísio Torres</code> (Title Case) vs <code>DIONÍSIO TORRES</code>.</li>
                  <li><code>Fatima</code> (sem acento) vs <code>FÁTIMA</code>.</li>
                  <li><code>Praia do Futuro</code> (Title Case) vs <code>PRAIA DO FUTURO</code>.</li>
                </ul>
              </div>
            </div>

            {/* Statistical Methodology */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900">2. Metodologia Estatística Aplicada</h4>
              <p className="text-slate-600 leading-relaxed">
                Para a análise exploratória, aplicamos medidas descritivas de tendência central e de dispersão:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-2">
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase">Média Aritmética</div>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">101,32</div>
                </div>
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase">Mediana</div>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">41,00</div>
                </div>
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase">Desvio Padrão (s)</div>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">235,44</div>
                </div>
                <div className="bg-white p-2.5 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-400 uppercase">Coef. de Variação (CV)</div>
                  <div className="font-mono font-bold text-amber-700 text-sm mt-0.5">232,4%</div>
                </div>
              </div>
              <p className="text-slate-500 text-[11px] pt-1">
                * O Coeficiente de Variação superior a 200% comprova a altíssima heterogeneidade espacial do voto: a maioria dos candidatos tem votação tímida em grande parte dos bairros, com picos monumentais em seus redutos específicos.
              </p>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-800">Eleições Fortaleza 2024 · Inteligência Territorial de Votação</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Dados tabulados oficiais do Tribunal Regional Eleitoral do Ceará (TRE-CE).</p>
          </div>
          <div className="flex items-center gap-4 text-slate-600">
            <a href="./dashboard.html" download="dashboard_votacao_fortaleza_2024.html" className="hover:text-blue-600 flex items-center gap-1 font-medium">
              <Download className="w-3.5 h-3.5" />
              Download do HTML Autocontido
            </a>
            <span>·</span>
            <span>Versão 1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
