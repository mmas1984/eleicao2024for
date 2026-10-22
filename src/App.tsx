import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import {
  Download,
  Filter,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ExternalLink,
  ArrowUpDown,
  BookOpen,
  Map as MapIcon,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';

import dataSummary from './data-summary.json';
import rawRecords from './records.json';
import fortalezaGeoJson from './fortaleza_map.json';

// Register map once globally
echarts.registerMap('fortaleza', fortalezaGeoJson as any);

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
  const [activeTab, setActiveTab] = useState<'overview' | 'mapa' | 'redutos' | 'candidato' | 'bairro' | 'tabela' | 'auditoria'>('overview');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [partyFilter, setPartyFilter] = useState<string>('ALL');
  const [candidateFilter, setCandidateFilter] = useState<string>('ALL');
  const [bairroFilter, setBairroFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Map Mode
  const [mapMode, setMapMode] = useState<'volume' | 'candidato' | 'vencedor'>('volume');
  const [mapCandidate, setMapCandidate] = useState<string>('PRISCILA COSTA');
  const [hoveredOrSelectedBairro, setHoveredOrSelectedBairro] = useState<string>('MESSEJANA');

  // Selected for drilldown tabs
  const [selectedCandidate, setSelectedCandidate] = useState<string>('PRISCILA COSTA');
  const [selectedBairro, setSelectedBairro] = useState<string>('MESSEJANA');

  // Bairro Candidate Comparator State
  const [compareCand1, setCompareCand1] = useState<string>('MARCEL COLARES');
  const [compareCand2, setCompareCand2] = useState<string>('PRISCILA COSTA');
  const [compareCand3, setCompareCand3] = useState<string>('LUIZ PAUPINA');
  const [compareChartType, setCompareChartType] = useState<'bar' | 'radar'>('bar');
  const bairroCompareChartRef = useRef<HTMLDivElement>(null);

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

  // City-wide global Bairro Aggregation Map (baseline 100% of capital)
  const globalBairroSummaryMap = useMemo(() => {
    const map: Record<string, { totalVotos: number; leader: string; leaderVotes: number; leaderPerc: string; leaderParty: string; leaderStatus: string }> = {};
    allRecords.forEach(r => {
      if (!map[r.bairro]) {
        map[r.bairro] = { totalVotos: 0, leader: '', leaderVotes: 0, leaderPerc: '0%', leaderParty: '', leaderStatus: '' };
      }
      map[r.bairro].totalVotos += r.votos;
      if (r.votos > map[r.bairro].leaderVotes) {
        map[r.bairro].leaderVotes = r.votos;
        map[r.bairro].leader = r.candidato;
        map[r.bairro].leaderParty = r.partido;
        map[r.bairro].leaderStatus = r.status;
      }
    });
    Object.keys(map).forEach(b => {
      const tot = map[b].totalVotos;
      map[b].leaderPerc = tot > 0 ? ((map[b].leaderVotes / tot) * 100).toFixed(1) + '%' : '0%';
    });
    return map;
  }, [allRecords]);

  // Bairro Aggregation Map (reactive to current active filters)
  const bairroSummaryMap = useMemo(() => {
    const map: Record<string, { totalVotos: number; leader: string; leaderVotes: number; leaderPerc: string; leaderParty: string; leaderStatus: string }> = {};
    filteredRecords.forEach(r => {
      if (!map[r.bairro]) {
        map[r.bairro] = { totalVotos: 0, leader: '', leaderVotes: 0, leaderPerc: '0%', leaderParty: '', leaderStatus: '' };
      }
      map[r.bairro].totalVotos += r.votos;
      if (r.votos > map[r.bairro].leaderVotes) {
        map[r.bairro].leaderVotes = r.votos;
        map[r.bairro].leader = r.candidato;
        map[r.bairro].leaderParty = r.partido;
        map[r.bairro].leaderStatus = r.status;
      }
    });
    Object.keys(map).forEach(b => {
      const tot = map[b].totalVotos;
      map[b].leaderPerc = tot > 0 ? ((map[b].leaderVotes / tot) * 100).toFixed(1) + '%' : '0%';
    });
    return map;
  }, [filteredRecords]);

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
  const mapChartRef = useRef<HTMLDivElement>(null);

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

  // MAP CHART RENDER
  useEffect(() => {
    if (activeTab !== 'mapa') return;

    let chart: echarts.ECharts | null = null;
    let resizeTimer: any = null;

    const initMap = () => {
      const dom = mapChartRef.current;
      if (!dom) return;
      chart = getOrCreateChart(dom);
      if (!chart) return;

      chart.resize();

      let mapData: any[] = [];
      let minVal = 0;
      let maxVal = 21000;
      let visualColors = ['#f0fdf4', '#86efac', '#22c55e', '#15803d', '#14532d'];

      const geoFeatures: string[] = (fortalezaGeoJson as any).features.map((f: any) => f.properties.name);
      const allBairrosSet = Array.from(new Set([...geoFeatures, ...Object.keys(bairroSummaryMap), ...uniqueBairros]));

      if (mapMode === 'volume') {
        visualColors = ['#eff6ff', '#93c5fd', '#3b82f6', '#1d4ed8', '#172554'];
        maxVal = 21000;
        mapData = allBairrosSet.map(bairro => {
          const info = bairroSummaryMap[bairro] || {
            totalVotos: 0,
            leader: 'Sem votos apurados',
            leaderVotes: 0,
            leaderPerc: '0%',
            leaderParty: '-'
          };
          return {
            name: bairro,
            value: info.totalVotos,
            leader: info.leader,
            leaderVotes: info.leaderVotes,
            leaderPerc: info.leaderPerc,
            leaderParty: info.leaderParty
          };
        });
      } else if (mapMode === 'candidato') {
        visualColors = ['#fef2f2', '#fca5a5', '#ef4444', '#b91c1c', '#7f1d1d'];
        const candRows = filteredRecords.filter(r => r.candidato === mapCandidate);
        const candMap: Record<string, number> = {};
        candRows.forEach(r => { candMap[r.bairro] = (candMap[r.bairro] || 0) + r.votos; });
        const candVotesArr = Object.values(candMap);
        maxVal = candVotesArr.length > 0 ? Math.max(...candVotesArr, 500) : 500;
        mapData = allBairrosSet.map(bairro => {
          const v = candMap[bairro] || 0;
          const tot = bairroSummaryMap[bairro]?.totalVotos || globalBairroSummaryMap[bairro]?.totalVotos || 0;
          const p = tot > 0 ? ((v / tot) * 100).toFixed(1) + '%' : '0%';
          return {
            name: bairro,
            value: v,
            candVotos: v,
            candPerc: p,
            totalBairro: tot,
            candidateName: mapCandidate
          };
        });
      } else if (mapMode === 'vencedor') {
        visualColors = ['#f5f3ff', '#c4b5fd', '#8b5cf6', '#6d28d9', '#4c1d95'];
        maxVal = 4500;
        mapData = allBairrosSet.map(bairro => {
          const info = bairroSummaryMap[bairro] || globalBairroSummaryMap[bairro] || {
            totalVotos: 0,
            leader: 'Sem votos',
            leaderVotes: 0,
            leaderPerc: '0%',
            leaderParty: '-'
          };
          return {
            name: bairro,
            value: info.leaderVotes,
            leader: info.leader,
            leaderParty: info.leaderParty,
            leaderPerc: info.leaderPerc,
            totalBairro: info.totalVotos
          };
        });
      }

      chart.setOption({
        backgroundColor: '#f8fafc',
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(255, 255, 255, 0.96)',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          padding: 10,
          textStyle: { color: '#0f172a' },
          formatter: (params: any) => {
            if (!params.data) return `<strong>${params.name}</strong><br/>Sem dados registrados`;
            if (mapMode === 'volume') {
              return `
                <div style="font-family: inherit;">
                  <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 4px;">${params.name}</div>
                  <div style="font-size: 11px; color: #475569;">Total no Bairro: <strong style="color: #2563eb; font-family: monospace;">${(params.data.value || 0).toLocaleString('pt-BR')} votos</strong></div>
                  <div style="font-size: 11px; color: #475569; margin-top: 2px;">Vencedor: <strong>${params.data.leader || '-'}</strong> (${(params.data.leaderVotes || 0).toLocaleString('pt-BR')} · ${params.data.leaderPerc || '0%'})</div>
                </div>
              `;
            } else if (mapMode === 'candidato') {
              return `
                <div style="font-family: inherit;">
                  <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 4px;">${params.name}</div>
                  <div style="font-size: 11px; color: #475569;">Votos de <strong>${params.data.candidateName}</strong>: <strong style="color: #dc2626; font-family: monospace;">${(params.data.value || 0).toLocaleString('pt-BR')}</strong></div>
                  <div style="font-size: 11px; color: #475569; margin-top: 2px;">Representatividade no Bairro: <strong>${params.data.candPerc || '0%'}</strong></div>
                </div>
              `;
            } else {
              return `
                <div style="font-family: inherit;">
                  <div style="font-weight: 700; font-size: 13px; color: #0f172a; margin-bottom: 4px;">${params.name}</div>
                  <div style="font-size: 11px; color: #475569;">Líder no Bairro: <strong style="color: #6d28d9;">${params.data.leader || '-'} (${params.data.leaderParty || '-'})</strong></div>
                  <div style="font-size: 11px; color: #475569; margin-top: 2px;">Votação: <strong>${(params.data.value || 0).toLocaleString('pt-BR')} votos</strong> (${params.data.leaderPerc || '0%'} do bairro)</div>
                </div>
              `;
            }
          }
        },
        visualMap: {
          min: minVal,
          max: maxVal,
          text: ['Alto', 'Baixo'],
          realtime: false,
          calculable: true,
          left: 20,
          bottom: 25,
          inRange: { color: visualColors },
          textStyle: { fontSize: 10, color: '#475569' }
        },
        series: [
          {
            name: 'Bairros de Fortaleza',
            type: 'map',
            map: 'fortaleza',
            roam: true,
            scaleLimit: { min: 0.8, max: 6 },
            label: {
              show: false,
              fontSize: 9,
              color: '#334155'
            },
            itemStyle: {
              borderColor: '#cbd5e1',
              borderWidth: 1,
              areaColor: '#f1f5f9'
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 11,
                fontWeight: 'bold',
                color: '#0f172a'
              },
              itemStyle: {
                areaColor: '#fde047',
                borderColor: '#0f172a',
                borderWidth: 1.5
              }
            },
            select: {
              itemStyle: {
                areaColor: '#f59e0b',
                borderColor: '#0f172a',
                borderWidth: 2
              }
            },
            selectedMode: 'single',
            data: mapData
          }
        ]
      }, true);

      const handleClick = (params: any) => {
        if (params.name) {
          setHoveredOrSelectedBairro(params.name);
        }
      };

      const handleMouseOver = (params: any) => {
        if (params.name && params.data && params.data.value !== undefined) {
          setHoveredOrSelectedBairro(params.name);
        }
      };

      chart.on('click', handleClick);
      chart.on('mouseover', handleMouseOver);

      resizeTimer = setTimeout(() => {
        chart?.resize();
      }, 50);
    };

    initMap();

    const handleResize = () => chart?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      if (chart) {
        chart.off('click');
        chart.off('mouseover');
      }
    };
  }, [activeTab, mapMode, mapCandidate, bairroSummaryMap, globalBairroSummaryMap, filteredRecords]);

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

  // Auto-populate Top 3 candidates of the chosen bairro
  useEffect(() => {
    const bRows = allRecords.filter(r => r.bairro === selectedBairro).sort((a,b) => b.votos - a.votos);
    if (bRows.length >= 3) {
      setCompareCand1(bRows[0].candidato);
      setCompareCand2(bRows[1].candidato);
      setCompareCand3(bRows[2].candidato);
    } else if (bRows.length === 2) {
      setCompareCand1(bRows[0].candidato);
      setCompareCand2(bRows[1].candidato);
      setCompareCand3('');
    } else if (bRows.length === 1) {
      setCompareCand1(bRows[0].candidato);
      setCompareCand2('');
      setCompareCand3('');
    }
  }, [selectedBairro, allRecords]);

  // Bairro Candidate Comparator Chart render (Grouped Bar or Radar)
  useEffect(() => {
    if (activeTab !== 'bairro') return;
    const chart = getOrCreateChart(bairroCompareChartRef.current);
    if (!chart) return;

    const candidatesToCompare = [compareCand1, compareCand2, compareCand3].filter(Boolean);
    if (candidatesToCompare.length === 0) {
      chart.clear();
      return;
    }

    const bRows = allRecords.filter(r => r.bairro === selectedBairro);
    const totalBairroVotos = bRows.reduce((acc, r) => acc + r.votos, 0);

    const colors = ['#2563eb', '#f59e0b', '#10b981'];

    const compData = candidatesToCompare.map((cName, idx) => {
      const rowInBairro = bRows.find(r => r.candidato === cName);
      const votosNoBairro = rowInBairro ? rowInBairro.votos : 0;
      const percNoBairro = totalBairroVotos > 0 ? (votosNoBairro / totalBairroVotos) * 100 : 0;

      const summaryInfo = dataSummary.allCandidates.find(c => c.nome === cName);
      const totalCidade = summaryInfo ? summaryInfo.votosTotal : 0;
      const topBairro = summaryInfo ? summaryInfo.topBairro : '';
      const topBairroVotos = summaryInfo ? summaryInfo.topBairroVotos : 0;
      const mediaCidade = totalCidade / 111;
      const pesoNoCand = totalCidade > 0 ? (votosNoBairro / totalCidade) * 100 : 0;

      return {
        name: cName,
        votosNoBairro,
        percNoBairro,
        totalCidade,
        topBairro,
        topBairroVotos,
        mediaCidade,
        pesoNoCand,
        color: colors[idx % colors.length],
        status: summaryInfo?.status || '-',
        partido: summaryInfo?.partido || '-'
      };
    });

    if (compareChartType === 'bar') {
      chart.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params: any) => {
            let res = `<strong>${params[0].axisValue}</strong><br/>`;
            params.forEach((p: any) => {
              res += `<span style="color:${p.color}; font-weight:bold;">● ${p.seriesName}:</span> ${Number(p.value).toLocaleString('pt-BR')}<br/>`;
            });
            return res;
          }
        },
        legend: {
          data: compData.map(c => c.name),
          top: 0,
          textStyle: { fontSize: 11, fontWeight: 600 }
        },
        grid: { left: '3%', right: '4%', bottom: '5%', top: '45px', containLabel: true },
        xAxis: {
          type: 'category',
          data: [
            `Votos em ${selectedBairro}`,
            'Média p/ Bairro em Fortaleza',
            'Pico no Bairro Líder (Reduto)'
          ],
          axisLabel: { interval: 0, fontSize: 11, fontWeight: 500 }
        },
        yAxis: {
          type: 'value',
          axisLabel: { formatter: (v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toLocaleString('pt-BR') }
        },
        series: compData.map(c => ({
          name: c.name,
          type: 'bar',
          barGap: '15%',
          itemStyle: { color: c.color, borderRadius: [4, 4, 0, 0] },
          label: {
            show: true,
            position: 'top',
            formatter: (p: any) => Math.round(p.value).toLocaleString('pt-BR'),
            fontSize: 10,
            fontWeight: 'bold'
          },
          data: [
            c.votosNoBairro,
            Math.round(c.mediaCidade),
            c.topBairroVotos
          ]
        }))
      }, true);
    } else {
      const maxVotosBairro = Math.max(...compData.map(c => c.votosNoBairro), 100) * 1.15;
      const maxPercBairro = Math.max(...compData.map(c => c.percNoBairro), 5) * 1.25;
      const maxPesoNoCand = Math.max(...compData.map(c => c.pesoNoCand), 5) * 1.25;
      const maxMediaCidade = Math.max(...compData.map(c => c.mediaCidade), 50) * 1.15;
      const maxTotalCidade = Math.max(...compData.map(c => c.totalCidade), 5000) * 1.15;

      chart.setOption({
        tooltip: { trigger: 'item' },
        legend: {
          data: compData.map(c => c.name),
          top: 0,
          textStyle: { fontSize: 11, fontWeight: 600 }
        },
        radar: {
          indicator: [
            { name: `Votos em ${selectedBairro}`, max: Math.ceil(maxVotosBairro) },
            { name: `% do Eleitorado Local`, max: Math.ceil(maxPercBairro) },
            { name: `% Peso no Total do Candidato`, max: Math.ceil(maxPesoNoCand) },
            { name: `Média Capital/Bairro`, max: Math.ceil(maxMediaCidade) },
            { name: `Total na Cidade`, max: Math.ceil(maxTotalCidade) }
          ],
          shape: 'polygon',
          radius: '65%',
          axisName: {
            color: '#334155',
            fontSize: 11,
            fontWeight: 600
          },
          splitArea: {
            areaStyle: {
              color: ['rgba(241, 245, 249, 0.9)', 'rgba(248, 250, 252, 0.9)']
            }
          }
        },
        series: [{
          name: 'Comparativo Radar',
          type: 'radar',
          data: compData.map(c => ({
            name: c.name,
            value: [
              c.votosNoBairro,
              parseFloat(c.percNoBairro.toFixed(1)),
              parseFloat(c.pesoNoCand.toFixed(1)),
              Math.round(c.mediaCidade),
              c.totalCidade
            ],
            itemStyle: { color: c.color },
            lineStyle: { width: 2.5 },
            areaStyle: { opacity: 0.18 }
          }))
        }]
      }, true);
    }

    const handleResize = () => chart?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [activeTab, selectedBairro, compareCand1, compareCand2, compareCand3, compareChartType, allRecords]);

  // Map Zoom Controls
  const handleMapZoom = (direction: 'in' | 'out' | 'reset') => {
    const chart = echarts.getInstanceByDom(mapChartRef.current as any);
    if (!chart) return;
    if (direction === 'reset') {
      chart.dispatchAction({ type: 'restore' });
    } else {
      const scale = direction === 'in' ? 1.3 : 0.77;
      chart.dispatchAction({
        type: 'geoRoam',
        zoom: scale
      });
    }
  };

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
              <span className="text-xs text-slate-500 block">Painel Geográfico e Executivo de Votação</span>
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
              onClick={() => setActiveTab('mapa')}
              className={`hover:text-blue-600 transition-colors whitespace-nowrap pb-1 flex items-center gap-1.5 ${activeTab === 'mapa' ? 'text-blue-600 font-semibold border-b-2 border-blue-600' : ''}`}
            >
              <MapIcon className="w-4 h-4 text-emerald-600" />
              Mapa de Fortaleza
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

      {/* MOBILE NAV */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs">
        {(['overview', 'mapa', 'redutos', 'candidato', 'bairro', 'tabela', 'auditoria'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-md whitespace-nowrap font-medium ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-100'}`}
          >
            {tab === 'overview' && 'Visão'}
            {tab === 'mapa' && 'Mapa'}
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

        {/* HERO BANNER */}
        <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-700/50">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
              <span>TRE-CE 2024</span>
              <span>·</span>
              <span>1º Turno Proporcional</span>
              <span>·</span>
              <span>Fortaleza / CE</span>
              <span>·</span>
              <span>Georreferenciamento de 111 Bairros</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Inteligência Territorial e Mapa de Votação por Bairro
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Consolidação analítica de <strong>586.560 votos</strong> em <strong>111 bairros</strong> da capital cearense. Explore a mancha de votação, colégios eleitorais e os redutos territoriais no mapa cartográfico interativo.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 shrink-0 bg-white/5 p-3.5 rounded-lg border border-white/10">
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Linhas Auditadas</div>
              <div className="text-xl font-bold font-mono text-white mt-0.5 tabular-nums">5.789</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Bairros Mapeados</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5 tabular-nums">111</div>
            </div>
          </div>
        </section>

        {/* FILTERS AND CONTROLS STRIP */}
        <section className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Filtros Dinâmicos Globais</h2>
              <span className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold border border-blue-200">
                {filteredRecords.length.toLocaleString('pt-BR')} registros ativos
              </span>
            </div>
            <div className="flex items-center gap-2">
              {(statusFilter !== 'ALL' || partyFilter !== 'ALL' || candidateFilter !== 'ALL' || bairroFilter !== 'ALL' || searchQuery.trim() !== '') && (
                <button
                  onClick={handleResetFilters}
                  className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpar Filtros
                </button>
              )}
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                title="Exportar base filtrada em CSV"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            {/* Status */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="ALL">Todos os Status</option>
                <option value="ELEITO">ELEITO (43)</option>
                <option value="SUPLENTE">SUPLENTE (11)</option>
              </select>
            </div>

            {/* Partido */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Partido</label>
              <select
                value={partyFilter}
                onChange={e => { setPartyFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="ALL">Todos os Partidos ({uniqueParties.length})</option>
                {uniqueParties.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Candidato */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Candidato</label>
              <select
                value={candidateFilter}
                onChange={e => { setCandidateFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="ALL">Todos os Candidatos ({uniqueCandidates.length})</option>
                {uniqueCandidates.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Bairro */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Bairro</label>
              <select
                value={bairroFilter}
                onChange={e => { setBairroFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                <option value="ALL">Todos os Bairros ({uniqueBairros.length})</option>
                {uniqueBairros.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Busca Livre */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Busca Rápida</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Candidato, bairro, nº..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </section>

        {/* EXECUTIVE KPI CARDS STRIP (REACTIVE TO ALL FILTERS & TABS) */}
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

        {/* TAB: MAPA DE FORTALEZA */}
        {activeTab === 'mapa' && (
          <div className="space-y-6">
            {/* Map Mode Selector Bar */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-600" />
                  Visualização Cartográfica Territorial
                </h2>
                <p className="text-xs text-slate-500">Passe o mouse ou clique sobre qualquer bairro para inspecionar os votos</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => setMapMode('volume')}
                    className={`px-3 py-1.5 rounded-md transition-colors ${mapMode === 'volume' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Volume Total de Votos
                  </button>
                  <button
                    onClick={() => setMapMode('candidato')}
                    className={`px-3 py-1.5 rounded-md transition-colors ${mapMode === 'candidato' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Por Candidato
                  </button>
                  <button
                    onClick={() => setMapMode('vencedor')}
                    className={`px-3 py-1.5 rounded-md transition-colors ${mapMode === 'vencedor' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Líder do Bairro
                  </button>
                </div>

                {mapMode === 'candidato' && (
                  <div className="w-56">
                    <select
                      value={mapCandidate}
                      onChange={e => setMapCandidate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                    >
                      {uniqueCandidates.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Map Grid: Map Canvas + Bairro Inspector Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Map Canvas (2 cols) */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-4 relative flex flex-col min-h-[580px]">
                {/* Floating Zoom & Action Controls */}
                <div className="absolute top-6 left-6 z-10 flex flex-col gap-1.5 bg-white/95 backdrop-blur-xs p-1.5 rounded-lg border border-slate-200 shadow-xs">
                  <button
                    onClick={() => handleMapZoom('in')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
                    title="Aproximar Zoom"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMapZoom('out')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors"
                    title="Afastar Zoom"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMapZoom('reset')}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700 transition-colors border-t border-slate-100 mt-0.5"
                    title="Redefinir Enquadramento"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Map Title Indicator */}
                <div className="absolute top-6 right-6 z-10 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs text-xs">
                  {mapMode === 'volume' && <span className="font-semibold text-blue-700">Densidade Eleitoral por Bairro</span>}
                  {mapMode === 'candidato' && <span className="font-semibold text-red-700">Mancha de Votos: {mapCandidate}</span>}
                  {mapMode === 'vencedor' && <span className="font-semibold text-purple-700">Vereador Mais Votado no Bairro</span>}
                </div>

                <div ref={mapChartRef} className="w-full flex-1 h-[540px]" />
                <div className="text-[11px] text-slate-400 mt-2 text-center">
                  Dica: Use a roda do mouse para aproximar ou arraste para navegar pelo território da cidade. Clique em qualquer bairro para travar o raio-x ao lado.
                </div>
              </div>

              {/* Bairro Inspector Sidebar (1 col) */}
              {(() => {
                const bInfo = bairroSummaryMap[hoveredOrSelectedBairro] || {
                  totalVotos: 0,
                  leader: '-',
                  leaderVotes: 0,
                  leaderPerc: '0%',
                  leaderParty: '-',
                  leaderStatus: '-'
                };
                const bRows = allRecords.filter(r => r.bairro === hoveredOrSelectedBairro).sort((a,b) => b.votos - a.votos);

                return (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      <div className="pb-3 border-b border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Raio-X Territorial</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-semibold">
                            {((bInfo.totalVotos / (kpis.totalVotos || 586560)) * 100).toFixed(2)}% do total
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={hoveredOrSelectedBairro}
                            onChange={e => setHoveredOrSelectedBairro(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                          >
                            {uniqueBairros.map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                          <span className="font-bold text-blue-700">{bInfo.totalVotos.toLocaleString('pt-BR')} votos apurados</span>
                          <span>{bRows.length} candidatos</span>
                        </div>
                      </div>

                      {/* Leader Card */}
                      <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Candidato Vencedor no Bairro</span>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900 truncate">{bInfo.leader}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${bInfo.leaderStatus === 'ELEITO' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                            {bInfo.leaderStatus}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 flex justify-between pt-1">
                          <span>{bInfo.leaderParty}</span>
                          <span className="font-mono font-semibold text-blue-700">
                            {bInfo.leaderVotes.toLocaleString('pt-BR')} votos ({bInfo.leaderPerc})
                          </span>
                        </div>
                      </div>

                      {/* Top 5 in Bairro */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                          <span>Top 5 Vereadores no Bairro</span>
                          <span className="text-[11px] font-normal text-slate-400">Votos nominais</span>
                        </div>
                        <div className="space-y-2 text-xs">
                          {bRows.slice(0, 5).map((r, idx) => {
                            const p = bInfo.totalVotos > 0 ? (r.votos / bInfo.totalVotos) * 100 : 0;
                            return (
                              <div key={r.candidato} className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-slate-800 truncate">
                                    <span className="text-slate-400 font-mono mr-1.5">{idx + 1}.</span>
                                    {r.candidato}
                                  </span>
                                  <span className="font-mono text-slate-900 font-semibold">{r.votos.toLocaleString('pt-BR')}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-600 rounded-full"
                                    style={{ width: `${Math.min(p * 2.5, 100)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
                      <button
                        onClick={() => {
                          setSelectedBairro(hoveredOrSelectedBairro);
                          setActiveTab('bairro');
                        }}
                        className="w-full py-2 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-center shadow-xs"
                      >
                        Ver Perfil Completo do Bairro
                      </button>
                      <button
                        onClick={() => {
                          setBairroFilter(hoveredOrSelectedBairro);
                          setActiveTab('tabela');
                        }}
                        className="w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-center"
                      >
                        Filtrar Registros na Tabela
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 1: VISÃO GERAL */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Interactive Map Callout Banner */}
            <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MapIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-blue-950">Novo Mapa Cartográfico de Fortaleza Disponível</h3>
                  <p className="text-xs text-blue-700">Visualize a distribuição espacial de votos por bairro, densidade e redutos eleitorais.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('mapa')}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shadow-xs"
              >
                Abrir Mapa Completo
              </button>
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

        {/* TAB: REDUTOS ELEITORAIS */}
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

        {/* TAB: RAIO-X POR CANDIDATO */}
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

        {/* TAB: ANÁLISE POR BAIRRO */}
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
                      <span className="text-base sm:text-lg font-bold text-slate-900 block mt-1 truncate">{leader.candidato}</span>
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

                  {/* SEÇÃO COMPARADOR DE ATÉ 3 CANDIDATOS NO BAIRRO */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-600" />
                          Comparativo Direto de Votação em {selectedBairro} (Até 3 Candidatos)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Compare o volume, a representatividade percentual e os indicadores eleitorais dentro deste bairro
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          onClick={() => {
                            if (bRows[0]) setCompareCand1(bRows[0].candidato);
                            if (bRows[1]) setCompareCand2(bRows[1].candidato);
                            if (bRows[2]) setCompareCand3(bRows[2].candidato);
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                          title="Carregar os 3 vereadores mais votados deste bairro"
                        >
                          <RotateCcw className="w-3 h-3 text-slate-500" />
                          Top 3 Deste Bairro
                        </button>

                        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
                          <button
                            onClick={() => setCompareChartType('bar')}
                            className={`px-3 py-1 rounded-md transition-colors ${compareChartType === 'bar' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Barras Agrupadas
                          </button>
                          <button
                            onClick={() => setCompareChartType('radar')}
                            className={`px-3 py-1 rounded-md transition-colors ${compareChartType === 'radar' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            Gráfico de Radar
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Dropdowns for up to 3 candidates */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {/* Cand 1 */}
                      <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/30">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                          <label className="font-bold text-blue-900">Candidato A (Azul)</label>
                        </div>
                        <select
                          value={compareCand1}
                          onChange={e => setCompareCand1(e.target.value)}
                          className="w-full bg-white border border-blue-200 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Nenhum</option>
                          {uniqueCandidates.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      {/* Cand 2 */}
                      <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/30">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                          <label className="font-bold text-amber-900">Candidato B (Laranja)</label>
                        </div>
                        <select
                          value={compareCand2}
                          onChange={e => setCompareCand2(e.target.value)}
                          className="w-full bg-white border border-amber-200 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">Nenhum</option>
                          {uniqueCandidates.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      {/* Cand 3 */}
                      <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/30">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                          <label className="font-bold text-emerald-900">Candidato C (Verde)</label>
                        </div>
                        <select
                          value={compareCand3}
                          onChange={e => setCompareCand3(e.target.value)}
                          className="w-full bg-white border border-emerald-200 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">Nenhum</option>
                          {uniqueCandidates.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Chart & Metrics Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                      <div className="lg:col-span-2 bg-slate-50/60 rounded-xl border border-slate-200 p-3 min-h-[360px] flex flex-col justify-center">
                        <div ref={bairroCompareChartRef} className="w-full h-80" />
                      </div>

                      {/* Detailed comparison cards */}
                      <div className="space-y-3">
                        {[
                          { name: compareCand1, color: '#2563eb', border: 'border-blue-200', bg: 'bg-blue-50/40' },
                          { name: compareCand2, color: '#f59e0b', border: 'border-amber-200', bg: 'bg-amber-50/40' },
                          { name: compareCand3, color: '#10b981', border: 'border-emerald-200', bg: 'bg-emerald-50/40' }
                        ].filter(item => Boolean(item.name)).map(item => {
                          const candRow = bRows.find(r => r.candidato === item.name);
                          const votosNoB = candRow ? candRow.votos : 0;
                          const percNoB = totalBairroVotos > 0 ? (votosNoB / totalBairroVotos) * 100 : 0;
                          const posNoB = bRows.findIndex(r => r.candidato === item.name) + 1;
                          const info = dataSummary.allCandidates.find(c => c.nome === item.name);
                          const totalCid = info ? info.votosTotal : 0;
                          const pesoNoC = totalCid > 0 ? (votosNoB / totalCid) * 100 : 0;

                          return (
                            <div key={item.name} className={`p-3.5 rounded-xl border ${item.border} ${item.bg} space-y-2 text-xs`}>
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-bold text-slate-900 block text-sm">{item.name}</span>
                                  <span className="text-[11px] text-slate-500 font-mono">{info?.partido || '-'} · {info?.numero || '-'}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${info?.status === 'ELEITO' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                                  {info?.status || '-'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                                <div>
                                  <span className="text-slate-500 block">Votos em {selectedBairro}:</span>
                                  <span className="font-mono font-bold text-slate-900 text-xs">{votosNoB.toLocaleString('pt-BR')} ({percNoB.toFixed(1)}%)</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Posição no Bairro:</span>
                                  <span className="font-mono font-bold text-slate-800 text-xs">#{posNoB > 0 ? posNoB : '-'} lugar</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Total na Cidade:</span>
                                  <span className="font-mono font-semibold text-slate-700">{totalCid.toLocaleString('pt-BR')} votos</span>
                                </div>
                                <div>
                                  <span className="text-slate-500 block">Peso deste Bairro:</span>
                                  <span className="font-mono font-semibold text-slate-700">{pesoNoC.toFixed(1)}% do total</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB: TABELA ANALÍTICA */}
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

        {/* TAB: AUDITORIA & METODOLOGIA */}
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
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
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
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
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
            <span>Versão 1.2.0 com Mapa Cartográfico</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
