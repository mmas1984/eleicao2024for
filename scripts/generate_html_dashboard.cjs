const fs = require('fs');

const dataSummary = JSON.parse(fs.readFileSync('src/data-summary.json', 'utf8'));
const records = JSON.parse(fs.readFileSync('src/records.json', 'utf8'));

// Format records lightly to keep file efficient while keeping 100% of the rows
// [ano, turno, municipio, numero, candidato, bairro, votos, perc, status]
const compactRecords = records.map(r => [
  r.numero,
  r.candidato,
  r.bairro,
  r.votos,
  r.perc,
  r.status
]);

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Executivo - Análise Eleitoral Fortaleza 2024</title>
  <meta name="description" content="Análise exploratória e inteligência de dados de votação por bairro em Fortaleza 2024.">
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Apache ECharts CDN -->
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
  <!-- Google Fonts: Plus Jakarta Sans & JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
    }
    .font-mono-num {
      font-family: 'JetBrains Mono', monospace;
      font-variant-numeric: tabular-nums;
    }
    /* Custom Scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #f1f5f9; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  </style>
</head>
<body class="min-h-screen bg-slate-50 text-slate-800 antialiased flex flex-col">

  <!-- TOP BAR / HEADER -->
  <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
      <!-- Zone 1: Wordmark / Brand -->
      <div class="flex items-center gap-3 shrink-0">
        <div class="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
          FT
        </div>
        <div>
          <span class="text-base font-bold tracking-tight text-slate-900 block leading-tight">Fortaleza Eleições 2024</span>
          <span class="text-xs text-slate-500 block">Painel de Inteligência de Votação por Bairro</span>
        </div>
      </div>

      <!-- Zone 2: Navigation / Scope -->
      <nav class="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
        <a href="#kpis" class="hover:text-blue-600 transition-colors whitespace-nowrap">Indicadores</a>
        <a href="#graficos" class="hover:text-blue-600 transition-colors whitespace-nowrap">Gráficos</a>
        <a href="#insights" class="hover:text-blue-600 transition-colors whitespace-nowrap">Insights Estratégicos</a>
        <a href="#tabela" class="hover:text-blue-600 transition-colors whitespace-nowrap">Tabela Detalhada</a>
      </nav>

      <!-- Zone 3: Actions -->
      <div class="flex items-center gap-2 shrink-0">
        <button onclick="exportFilteredCSV()" class="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          Exportar CSV
        </button>
        <button onclick="window.print()" class="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-xs">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          Imprimir / Relatório
        </button>
      </div>
    </div>
  </header>

  <!-- MAIN CONTAINER -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6">

    <!-- HERO CONTEXT BANNER -->
    <div class="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-700/50">
      <div class="space-y-1.5 max-w-3xl">
        <div class="flex items-center gap-2 text-xs font-medium text-slate-300">
          <span>TRE-CE 2024</span>
          <span>·</span>
          <span>1º Turno</span>
          <span>·</span>
          <span>Fortaleza / CE</span>
          <span>·</span>
          <span>54 Candidatos Avaliados</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Análise Territorial de Votação: Eleições 2024
        </h1>
        <p class="text-sm text-slate-300 leading-relaxed">
          Exploração aprofundada de <strong>586.560 votos</strong> distribuídos em <strong>111 bairros</strong> de Fortaleza. Mapeamento de redutos eleitorais, dispersão territorial e eficiência partidária para vereadores eleitos e suplentes.
        </p>
      </div>
      <div class="grid grid-cols-2 gap-3 shrink-0 bg-white/5 p-3.5 rounded-lg border border-white/10">
        <div>
          <div class="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Total de Registros</div>
          <div class="text-xl font-bold font-mono-num text-white mt-0.5">5.789</div>
        </div>
        <div>
          <div class="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Eleitos vs Suplentes</div>
          <div class="text-xl font-bold font-mono-num text-emerald-400 mt-0.5">42 / 12</div>
        </div>
      </div>
    </div>

    <!-- FILTERS CONTROL PANEL -->
    <section class="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h2 class="text-sm font-bold uppercase tracking-wider text-slate-800">Controles de Filtro Dinâmicos</h2>
          <p class="text-xs text-slate-500">Selecione filtros para recalcular os KPIs e gráficos em tempo real</p>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="resetFilters()" class="text-xs font-semibold text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors">
            Limpar Filtros
          </button>
          <span id="activeFiltersBadge" class="text-xs font-mono-num bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-md border border-blue-200">
            5.789 registros ativos
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <!-- Status Filter -->
        <div>
          <label class="block font-semibold text-slate-700 mb-1.5">Status Eleitoral</label>
          <select id="statusFilter" onchange="applyFilters()" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all">
            <option value="ALL">Todos os Resultados (54)</option>
            <option value="ELEITO">Somente ELEITOS (42)</option>
            <option value="SUPLENTE">Somente SUPLENTES (12)</option>
          </select>
        </div>

        <!-- Party Filter -->
        <div>
          <label class="block font-semibold text-slate-700 mb-1.5">Partido / Legenda</label>
          <select id="partyFilter" onchange="applyFilters()" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all">
            <option value="ALL">Todos os Partidos</option>
          </select>
        </div>

        <!-- Candidate Filter -->
        <div>
          <label class="block font-semibold text-slate-700 mb-1.5">Candidato Específico</label>
          <select id="candidateFilter" onchange="applyFilters()" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all">
            <option value="ALL">Todos os Candidatos</option>
          </select>
        </div>

        <!-- Bairro Filter -->
        <div>
          <label class="block font-semibold text-slate-700 mb-1.5">Bairro de Fortaleza</label>
          <select id="bairroFilter" onchange="applyFilters()" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all">
            <option value="ALL">Todos os Bairros (111)</option>
          </select>
        </div>
      </div>
    </section>

    <!-- KPIS SECTION (BIG NUMBERS) -->
    <section id="kpis" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <!-- Total Votos -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total de Votos</span>
        <span id="kpiTotalVotos" class="text-xl sm:text-2xl font-bold font-mono-num text-slate-900 block mt-1">586.560</span>
        <span class="text-[10px] text-slate-400 mt-0.5 block">100% dos votos na base</span>
      </div>

      <!-- Média por Bairro -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Média p/ Linha</span>
        <span id="kpiAvgVotos" class="text-xl sm:text-2xl font-bold font-mono-num text-slate-900 block mt-1">101,3</span>
        <span class="text-[10px] text-slate-400 mt-0.5 block">Votos médios/bairro</span>
      </div>

      <!-- Mediana -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Mediana</span>
        <span id="kpiMedianVotos" class="text-xl sm:text-2xl font-bold font-mono-num text-slate-900 block mt-1">41</span>
        <span class="text-[10px] text-slate-400 mt-0.5 block">Valor central típico</span>
      </div>

      <!-- Desvio Padrão -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Desvio Padrão</span>
        <span id="kpiStdDev" class="text-xl sm:text-2xl font-bold font-mono-num text-amber-700 block mt-1">235,4</span>
        <span class="text-[10px] text-slate-400 mt-0.5 block">Alta dispersão (redutos)</span>
      </div>

      <!-- Máximo num Bairro -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Pico em Bairro</span>
        <span id="kpiMaxVotos" class="text-xl sm:text-2xl font-bold font-mono-num text-blue-700 block mt-1">4.978</span>
        <span id="kpiMaxDetail" class="text-[10px] text-slate-400 mt-0.5 block truncate" title="Chiquinho / P. Ayrton Senna">Chiquinho dos Carneiros</span>
      </div>

      <!-- Bairro Líder em Votos -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Maior Bairro</span>
        <span id="kpiTopBairroName" class="text-base sm:text-lg font-bold text-slate-900 block mt-1 truncate" title="MESSEJANA">MESSEJANA</span>
        <span id="kpiTopBairroVotos" class="text-[10px] font-mono-num text-slate-500 mt-0.5 block">20.242 votos</span>
      </div>

      <!-- Votos de Eleitos (%) -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <span class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">% Eleitos</span>
        <span id="kpiEleitosPerc" class="text-xl sm:text-2xl font-bold font-mono-num text-emerald-700 block mt-1">86,1%</span>
        <span class="text-[10px] text-slate-400 mt-0.5 block">505.267 votos</span>
      </div>
    </section>

    <!-- CHARTS GRID -->
    <section id="graficos" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      <!-- Chart 1: Ranking dos Top Candidatos -->
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
        <div class="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Top Candidatos por Votação Total</h3>
            <p class="text-xs text-slate-500">Ranking nominal dos candidatos mais votados no universo filtrado</p>
          </div>
          <span class="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded">Barras Horizontais</span>
        </div>
        <div id="chartCandidates" class="w-full h-80"></div>
      </div>

      <!-- Chart 2: Top Bairros por Volume de Votos -->
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
        <div class="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Bairros com Maior Volume de Votos</h3>
            <p class="text-xs text-slate-500">Concentração geográfica e colégios eleitorais prioritários</p>
          </div>
          <span class="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded">Volume Total</span>
        </div>
        <div id="chartBairros" class="w-full h-80"></div>
      </div>

      <!-- Chart 3: Distribuição por Partido -->
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
        <div class="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Distribuição de Votos por Partido</h3>
            <p class="text-xs text-slate-500">Participação relativa das bancadas partidárias na amostra</p>
          </div>
          <span class="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded">Gráfico de Rosca</span>
        </div>
        <div id="chartPartidos" class="w-full h-80"></div>
      </div>

      <!-- Chart 4: Análise de Concentração / Reduto Eleitoral -->
      <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
        <div class="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Índice de Reduto Eleitoral (Concentração)</h3>
            <p class="text-xs text-slate-500">% do total de votos que cada candidato obteve em seu bairro principal</p>
          </div>
          <span class="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded">Top Redutos</span>
        </div>
        <div id="chartConcentration" class="w-full h-80"></div>
      </div>

    </section>

    <!-- STRATEGIC INSIGHTS SECTION -->
    <section id="insights" class="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
      <div class="flex items-center gap-2 pb-3 border-b border-slate-100">
        <div class="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
        <h2 class="text-base font-bold text-slate-900">Diagnóstico Estatístico e Insights Estratégicos Executivos</h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <!-- Insight 1 -->
        <div class="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-blue-900 uppercase tracking-wider text-[11px]">1. Fenômeno dos Hiper-Redutos</span>
            <span class="font-mono-num font-semibold text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded text-[10px]">Até 63,9%</span>
          </div>
          <p class="text-slate-600 leading-relaxed">
            Diversos candidatos possuem votação fortemente territorializada. <strong>Marcos Paulo (11111)</strong> teve <strong>63,9%</strong> de todos os seus votos no <em>Conjunto Palmeiras</em> (3.190 votos). <strong>Chiquinho dos Carneiros (25456)</strong> obteve <strong>52,1%</strong> no <em>Planalto Ayrton Senna</em> (4.978 votos), e <strong>Germano He Man (33024)</strong> concentrou <strong>46,8%</strong> na <em>Vila União</em> (4.758 votos).
          </p>
        </div>

        <!-- Insight 2 -->
        <div class="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-emerald-900 uppercase tracking-wider text-[11px]">2. Estratégia de Capilaridade</span>
            <span class="font-mono-num font-semibold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded text-[10px]">Dispersão</span>
          </div>
          <p class="text-slate-600 leading-relaxed">
            Em contraste com os hiper-redutos, os líderes gerais <strong>Priscila Costa (PL - 36.226 votos)</strong> e <strong>Gabriel Biologia (PSOL - 30.682 votos)</strong> tiveram forte capilaridade por toda a capital. Priscila teve seu bairro máximo com apenas 3,4% do total (Messejana com 1.214 votos), pontuando expressivamente em dezenas de bairros da periferia e áreas centrais.
          </p>
        </div>

        <!-- Insight 3 -->
        <div class="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-indigo-900 uppercase tracking-wider text-[11px]">3. Polarização Geográfica-Social</span>
            <span class="font-mono-num font-semibold text-indigo-700 bg-indigo-100/60 px-1.5 py-0.5 rounded text-[10px]">Segmentação</span>
          </div>
          <p class="text-slate-600 leading-relaxed">
            Em bairros de alta renda da Zona Leste como <em>Aldeota</em> e <em>Meireles</em>, destacam-se amplamente <strong>Gabriel Biologia (2.243 votos na Aldeota)</strong>, <strong>Bella Carmelo (1.838 votos)</strong> e <strong>Marcelo Mendes (947 votos)</strong>. Já na Zona Sul/Oeste (<em>Messejana</em>, <em>Conjunto Ceará I</em>, <em>Mondubim</em>), dominam nomes do <strong>PDT</strong>, <strong>AVANTE</strong> e lideranças comunitárias.
          </p>
        </div>

        <!-- Insight 4 -->
        <div class="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-bold text-amber-900 uppercase tracking-wider text-[11px]">4. Suplentes com Força Local</span>
            <span class="font-mono-num font-semibold text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded text-[10px]">Quociente</span>
          </div>
          <p class="text-slate-600 leading-relaxed">
            Mesmo na condição de Suplentes, candidatos como <strong>Claudio Lima (70369)</strong> somaram votações avassaladoras em bairros específicos (2.322 votos no Cristo Redentor e 1.180 no Pirambu), assim como <strong>Dayane Costa (20012)</strong> obteve 1.354 votos no Vicente Pinzon, evidenciando o impacto do cálculo partidário na conversão de cadeiras.
          </p>
        </div>
      </div>
    </section>

    <!-- SEARCHABLE DATA TABLE -->
    <section id="tabela" class="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div class="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-sm font-bold text-slate-900">Tabela Analítica Completa por Bairro e Candidato</h2>
          <p class="text-xs text-slate-500">Base auditada com 5.789 registros eleitorais</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="relative">
            <input type="text" id="searchInput" oninput="handleSearch()" placeholder="Buscar candidato ou bairro..." class="bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all">
            <svg class="w-4 h-4 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <span id="tableCount" class="text-xs font-mono-num text-slate-500 whitespace-nowrap">
            5.789 itens
          </span>
        </div>
      </div>

      <div class="overflow-x-auto max-h-[500px]">
        <table class="w-full text-left text-xs text-slate-600 border-collapse">
          <thead class="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th class="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onclick="sortTable(0)">Candidato</th>
              <th class="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onclick="sortTable(1)">Número</th>
              <th class="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onclick="sortTable(2)">Partido</th>
              <th class="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onclick="sortTable(3)">Bairro</th>
              <th class="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onclick="sortTable(4)">Votos no Bairro</th>
              <th class="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors" onclick="sortTable(5)">% no Bairro</th>
              <th class="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onclick="sortTable(6)">Status</th>
            </tr>
          </thead>
          <tbody id="tableBody" class="divide-y divide-slate-100 font-normal">
            <!-- Populated via JavaScript -->
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div class="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div id="paginationInfo">Mostrando 1 a 50 de 5.789 registros</div>
        <div class="flex items-center gap-1.5">
          <button id="btnPrevPage" onclick="prevPage()" class="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 font-medium disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
          <span id="pageBadge" class="font-mono-num font-semibold px-2">1 / 116</span>
          <button id="btnNextPage" onclick="nextPage()" class="px-2.5 py-1 rounded bg-white border border-slate-300 hover:bg-slate-100 font-medium disabled:opacity-50 disabled:cursor-not-allowed">Próxima</button>
        </div>
      </div>
    </section>

  </main>

  <!-- FOOTER -->
  <footer class="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <p class="font-medium text-slate-700">Eleições Fortaleza 2024 · Análise Estatística Territorial</p>
        <p class="text-[11px] text-slate-400 mt-0.5">Fonte dos dados tabulados: Tribunal Regional Eleitoral do Ceará (TRE-CE) / Apuração Bairro a Bairro.</p>
      </div>
      <div class="flex items-center gap-4 text-slate-600">
        <span>Base Autocontida 100% Offline</span>
        <span>·</span>
        <span>Data Science & Business Intelligence</span>
      </div>
    </div>
  </footer>

  <!-- EMBEDDED REAL DATA & JAVASCRIPT LOGIC -->
  <script>
    // Embedded exact audited dataset
    const DATA_SUMMARY = ${JSON.stringify(dataSummary)};
    const RAW_RECORDS = ${JSON.stringify(compactRecords)};

    const PARTIDO_MAP = {
      '10': 'REPUBLICANOS', '11': 'PP', '12': 'PDT', '13': 'PT', '14': 'PTB',
      '15': 'MDB', '16': 'PSTU', '18': 'REDE', '20': 'PODE', '21': 'PCB',
      '22': 'PL', '23': 'CIDADANIA', '25': 'PRD', '27': 'DC', '28': 'PRTB',
      '29': 'PCO', '30': 'NOVO', '33': 'MOBILIZA', '35': 'PMB', '36': 'AGIR',
      '40': 'PSB', '43': 'PV', '44': 'UNIÃO', '45': 'PSDB', '50': 'PSOL',
      '55': 'PSD', '70': 'AVANTE', '77': 'SOLIDARIEDADE'
    };

    // Normalized records
    let fullList = RAW_RECORDS.map(r => ({
      numero: r[0],
      candidato: r[1],
      bairro: r[2],
      votos: r[3],
      perc: r[4],
      status: r[5],
      partido: PARTIDO_MAP[r[0].substring(0, 2)] || ('Partido ' + r[0].substring(0, 2))
    }));

    let filteredRecords = [...fullList];
    let currentPage = 1;
    const PAGE_SIZE = 50;
    let sortColumnIndex = 4;
    let sortAsc = false;

    // Charts instances
    let chartCand, chartBairro, chartParty, chartConcentration;

    // Initialize Dropdowns
    function initDropdowns() {
      // Parties
      const parties = [...new Set(fullList.map(r => r.partido))].sort();
      const partySelect = document.getElementById('partyFilter');
      parties.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        partySelect.appendChild(opt);
      });

      // Candidates
      const cands = [...new Set(fullList.map(r => r.candidato))].sort();
      const candSelect = document.getElementById('candidateFilter');
      cands.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        candSelect.appendChild(opt);
      });

      // Bairros
      const bairros = [...new Set(fullList.map(r => r.bairro))].sort();
      const bairroSelect = document.getElementById('bairroFilter');
      bairros.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        bairroSelect.appendChild(opt);
      });
    }

    // Apply Filters
    function applyFilters() {
      const status = document.getElementById('statusFilter').value;
      const party = document.getElementById('partyFilter').value;
      const candidate = document.getElementById('candidateFilter').value;
      const bairro = document.getElementById('bairroFilter').value;
      const search = document.getElementById('searchInput').value.trim().toLowerCase();

      filteredRecords = fullList.filter(r => {
        if (status !== 'ALL' && r.status !== status) return false;
        if (party !== 'ALL' && r.partido !== party) return false;
        if (candidate !== 'ALL' && r.candidato !== candidate) return false;
        if (bairro !== 'ALL' && r.bairro !== bairro) return false;
        if (search) {
          const matchCand = r.candidato.toLowerCase().includes(search);
          const matchBairro = r.bairro.toLowerCase().includes(search);
          const matchNum = r.numero.includes(search);
          if (!matchCand && !matchBairro && !matchNum) return false;
        }
        return true;
      });

      currentPage = 1;
      updateKPIs();
      updateCharts();
      renderTable();
    }

    function handleSearch() {
      applyFilters();
    }

    function resetFilters() {
      document.getElementById('statusFilter').value = 'ALL';
      document.getElementById('partyFilter').value = 'ALL';
      document.getElementById('candidateFilter').value = 'ALL';
      document.getElementById('bairroFilter').value = 'ALL';
      document.getElementById('searchInput').value = '';
      applyFilters();
    }

    // Update KPIs based on filteredRecords
    function updateKPIs() {
      const totalVotos = filteredRecords.reduce((acc, r) => acc + r.votos, 0);
      const totalRows = filteredRecords.length;

      document.getElementById('activeFiltersBadge').textContent = totalRows.toLocaleString('pt-BR') + ' registros ativos';
      document.getElementById('kpiTotalVotos').textContent = totalVotos.toLocaleString('pt-BR');

      if (totalRows === 0) {
        document.getElementById('kpiAvgVotos').textContent = '0';
        document.getElementById('kpiMedianVotos').textContent = '0';
        document.getElementById('kpiStdDev').textContent = '0';
        document.getElementById('kpiMaxVotos').textContent = '0';
        document.getElementById('kpiTopBairroName').textContent = '-';
        document.getElementById('kpiTopBairroVotos').textContent = '0 votos';
        document.getElementById('kpiEleitosPerc').textContent = '0%';
        return;
      }

      const avg = totalVotos / totalRows;
      document.getElementById('kpiAvgVotos').textContent = avg.toFixed(1).replace('.', ',');

      const sortedVotos = filteredRecords.map(r => r.votos).sort((a,b) => a - b);
      const median = sortedVotos[Math.floor(sortedVotos.length / 2)];
      document.getElementById('kpiMedianVotos').textContent = median.toLocaleString('pt-BR');

      const variance = sortedVotos.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / totalRows;
      const stdDev = Math.sqrt(variance);
      document.getElementById('kpiStdDev').textContent = stdDev.toFixed(1).replace('.', ',');

      const maxRow = filteredRecords.reduce((max, r) => r.votos > max.votos ? r : max, filteredRecords[0]);
      document.getElementById('kpiMaxVotos').textContent = maxRow.votos.toLocaleString('pt-BR');
      document.getElementById('kpiMaxDetail').textContent = maxRow.candidato + ' (' + maxRow.bairro + ')';
      document.getElementById('kpiMaxDetail').title = maxRow.candidato + ' no bairro ' + maxRow.bairro;

      // Group by Bairro to get top bairro in current slice
      const bMap = {};
      filteredRecords.forEach(r => {
        bMap[r.bairro] = (bMap[r.bairro] || 0) + r.votos;
      });
      const topBairroEntry = Object.entries(bMap).sort((a,b) => b[1] - a[1])[0];
      if (topBairroEntry) {
        document.getElementById('kpiTopBairroName').textContent = topBairroEntry[0];
        document.getElementById('kpiTopBairroVotos').textContent = topBairroEntry[1].toLocaleString('pt-BR') + ' votos';
      }

      // Votos de eleitos %
      const votosEleitos = filteredRecords.filter(r => r.status === 'ELEITO').reduce((acc, r) => acc + r.votos, 0);
      const percEleitos = totalVotos > 0 ? ((votosEleitos / totalVotos) * 100).toFixed(1) : '0';
      document.getElementById('kpiEleitosPerc').textContent = percEleitos.replace('.', ',') + '%';
    }

    // Initialize Echarts
    function initCharts() {
      chartCand = echarts.init(document.getElementById('chartCandidates'));
      chartBairro = echarts.init(document.getElementById('chartBairros'));
      chartParty = echarts.init(document.getElementById('chartPartidos'));
      chartConcentration = echarts.init(document.getElementById('chartConcentration'));

      window.addEventListener('resize', () => {
        chartCand.resize();
        chartBairro.resize();
        chartParty.resize();
        chartConcentration.resize();
      });
    }

    function updateCharts() {
      // 1. Candidate Chart (Top 12)
      const candMap = {};
      filteredRecords.forEach(r => {
        if (!candMap[r.candidato]) {
          candMap[r.candidato] = { votos: 0, status: r.status, partido: r.partido };
        }
        candMap[r.candidato].votos += r.votos;
      });
      const sortedCands = Object.entries(candMap).sort((a,b) => b[1].votos - a[1].votos).slice(0, 12).reverse();

      chartCand.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: params => {
            const item = params[0];
            return '<strong>' + item.name + '</strong><br/>Votos: ' + item.value.toLocaleString('pt-BR');
          }
        },
        grid: { left: '3%', right: '8%', bottom: '3%', top: '3%', containLabel: true },
        xAxis: { type: 'value', axisLabel: { formatter: v => (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v) } },
        yAxis: { type: 'category', data: sortedCands.map(c => c[0]), axisLabel: { fontSize: 11 } },
        series: [{
          name: 'Votos',
          type: 'bar',
          data: sortedCands.map(c => ({
            value: c[1].votos,
            itemStyle: { color: c[1].status === 'ELEITO' ? '#2563eb' : '#94a3b8' }
          })),
          label: { show: true, position: 'right', formatter: p => p.value.toLocaleString('pt-BR'), fontSize: 10 }
        }]
      }, true);

      // 2. Bairros Chart (Top 12)
      const bairroMap = {};
      filteredRecords.forEach(r => {
        bairroMap[r.bairro] = (bairroMap[r.bairro] || 0) + r.votos;
      });
      const sortedBairros = Object.entries(bairroMap).sort((a,b) => b[1] - a[1]).slice(0, 12);

      chartBairro.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: params => {
            const item = params[0];
            return '<strong>' + item.name + '</strong><br/>Total: ' + item.value.toLocaleString('pt-BR') + ' votos';
          }
        },
        grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
        xAxis: {
          type: 'category',
          data: sortedBairros.map(b => b[0]),
          axisLabel: { interval: 0, rotate: 30, fontSize: 10 }
        },
        yAxis: { type: 'value', axisLabel: { formatter: v => (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v) } },
        series: [{
          name: 'Votos no Bairro',
          type: 'bar',
          data: sortedBairros.map(b => b[1]),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#0284c7' },
              { offset: 1, color: '#0369a1' }
            ])
          }
        }]
      }, true);

      // 3. Parties Chart
      const partyMap = {};
      filteredRecords.forEach(r => {
        partyMap[r.partido] = (partyMap[r.partido] || 0) + r.votos;
      });
      const partyData = Object.entries(partyMap)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }));

      chartParty.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c} votos ({d}%)' },
        legend: { orient: 'horizontal', bottom: 'bottom', textStyle: { fontSize: 11 } },
        series: [{
          name: 'Votos por Partido',
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
          data: partyData
        }]
      }, true);

      // 4. Concentration Chart
      // For each candidate in filtered list, calculate top bairro concentration
      const candRecordsMap = {};
      filteredRecords.forEach(r => {
        if (!candRecordsMap[r.candidato]) candRecordsMap[r.candidato] = { total: 0, bairros: {} };
        candRecordsMap[r.candidato].total += r.votos;
        candRecordsMap[r.candidato].bairros[r.bairro] = (candRecordsMap[r.candidato].bairros[r.bairro] || 0) + r.votos;
      });

      const concentrationList = Object.entries(candRecordsMap)
        .map(([nome, data]) => {
          let topB = '';
          let topV = 0;
          Object.entries(data.bairros).forEach(([b, v]) => {
            if (v > topV) { topV = v; topB = b; }
          });
          const perc = data.total > 0 ? (topV / data.total) * 100 : 0;
          return { nome, total: data.total, topB, topV, perc };
        })
        .filter(c => c.total >= 3000) // Minimum significant vote total
        .sort((a,b) => b.perc - a.perc)
        .slice(0, 10);

      chartConcentration.setOption({
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: params => {
            const p = params[0];
            const item = concentrationList[p.dataIndex];
            return '<strong>' + item.nome + '</strong><br/>Reduto: ' + item.topB + '<br/>Concentração: ' + item.perc.toFixed(1) + '% (' + item.topV.toLocaleString('pt-BR') + ' de ' + item.total.toLocaleString('pt-BR') + ' votos)';
          }
        },
        grid: { left: '3%', right: '10%', bottom: '5%', top: '5%', containLabel: true },
        xAxis: { type: 'value', max: 70, axisLabel: { formatter: '{value}%' } },
        yAxis: { type: 'category', data: concentrationList.map(c => c.nome).reverse(), axisLabel: { fontSize: 10 } },
        series: [{
          name: '% no Reduto Principal',
          type: 'bar',
          data: concentrationList.map(c => c.perc.toFixed(1)).reverse(),
          itemStyle: {
            color: p => p.value > 30 ? '#dc2626' : (p.value > 15 ? '#ea580c' : '#2563eb')
          },
          label: { show: true, position: 'right', formatter: '{c}%', fontSize: 10 }
        }]
      }, true);
    }

    // Render Table
    function renderTable() {
      // Sorting
      filteredRecords.sort((a,b) => {
        let vA, vB;
        if (sortColumnIndex === 0) { vA = a.candidato; vB = b.candidato; }
        else if (sortColumnIndex === 1) { vA = a.numero; vB = b.numero; }
        else if (sortColumnIndex === 2) { vA = a.partido; vB = b.partido; }
        else if (sortColumnIndex === 3) { vA = a.bairro; vB = b.bairro; }
        else if (sortColumnIndex === 4) { vA = a.votos; vB = b.votos; }
        else if (sortColumnIndex === 5) { vA = a.perc; vB = b.perc; }
        else if (sortColumnIndex === 6) { vA = a.status; vB = b.status; }

        if (typeof vA === 'string') {
          return sortAsc ? vA.localeCompare(vB) : vB.localeCompare(vA);
        }
        return sortAsc ? vA - vB : vB - vA;
      });

      const total = filteredRecords.length;
      document.getElementById('tableCount').textContent = total.toLocaleString('pt-BR') + ' registros';

      const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
      if (currentPage > totalPages) currentPage = totalPages;

      const start = (currentPage - 1) * PAGE_SIZE;
      const pageData = filteredRecords.slice(start, start + PAGE_SIZE);

      const tbody = document.getElementById('tableBody');
      tbody.innerHTML = '';

      if (pageData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-slate-400">Nenhum registro encontrado para os filtros selecionados.</td></tr>';
      } else {
        pageData.forEach(r => {
          const tr = document.createElement('tr');
          tr.className = 'hover:bg-slate-50/80 transition-colors';
          const isEleito = r.status === 'ELEITO';

          tr.innerHTML = \`
            <td class="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">\${r.candidato}</td>
            <td class="py-2.5 px-4 font-mono-num text-slate-600">\${r.numero}</td>
            <td class="py-2.5 px-4"><span class="font-medium text-slate-700">\${r.partido}</span></td>
            <td class="py-2.5 px-4 text-slate-800 font-medium">\${r.bairro}</td>
            <td class="py-2.5 px-4 text-right font-mono-num font-semibold text-slate-900">\${r.votos.toLocaleString('pt-BR')}</td>
            <td class="py-2.5 px-4 text-right font-mono-num text-slate-600">\${r.perc.toFixed(2).replace('.', ',')}%</td>
            <td class="py-2.5 px-4 whitespace-nowrap">
              <span class="inline-flex items-center text-xs font-semibold \${isEleito ? 'text-emerald-700' : 'text-slate-500'}">
                \${r.status}
              </span>
            </td>
          \`;
          tbody.appendChild(tr);
        });
      }

      // Pagination controls
      document.getElementById('paginationInfo').textContent = total === 0 ? 'Nenhum resultado' :
        \`Mostrando \${start + 1} a \${Math.min(start + PAGE_SIZE, total)} de \${total.toLocaleString('pt-BR')} registros\`;
      document.getElementById('pageBadge').textContent = \`\${currentPage} / \${totalPages}\`;
      document.getElementById('btnPrevPage').disabled = currentPage <= 1;
      document.getElementById('btnNextPage').disabled = currentPage >= totalPages;
    }

    function sortTable(colIndex) {
      if (sortColumnIndex === colIndex) {
        sortAsc = !sortAsc;
      } else {
        sortColumnIndex = colIndex;
        sortAsc = (colIndex === 0 || colIndex === 2 || colIndex === 3);
      }
      renderTable();
    }

    function prevPage() {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    }

    function nextPage() {
      const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);
      if (currentPage < totalPages) {
        currentPage++;
        renderTable();
      }
    }

    // Export Filtered CSV
    function exportFilteredCSV() {
      let csv = 'Numero,Candidato,Partido,Bairro,Votos,% Votos Obtidos,Status\\n';
      filteredRecords.forEach(r => {
        csv += \`"\${r.numero}","\${r.candidato}","\${r.partido}","\${r.bairro}",\${r.votos},"\${r.perc.toFixed(2).replace('.', ',')}","\${r.status}"\\n\`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'votacao_fortaleza_2024_filtrado.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Initialize application
    window.addEventListener('DOMContentLoaded', () => {
      initDropdowns();
      initCharts();
      updateKPIs();
      updateCharts();
      renderTable();
    });
  </script>
</body>
</html>
`;

fs.writeFileSync('public/dashboard.html', htmlContent);
console.log('Successfully generated public/dashboard.html with total length:', htmlContent.length);
