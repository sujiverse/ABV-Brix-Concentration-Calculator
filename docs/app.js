(() => {
  const ingredientsEl = document.getElementById('ingredients');
  const addRowBtn = document.getElementById('addRow');
  const clearAllBtn = document.getElementById('clearAll');
  const totalVolumeEl = document.getElementById('totalVolume');
  const finalAbvEl = document.getElementById('finalAbv');
  // removed legacy finalBrixEl
  const bottleSizeEl = document.getElementById('bottleSize');
  const bottleCountEl = document.getElementById('bottleCount');
  const bottleRemainderEl = document.getElementById('bottleRemainder');

  const presets = {
    water: { name: '물', volumeMl: 100, abvPercent: 0, brix: 0 },
    vodka40: { name: '보드카 40%', volumeMl: 50, abvPercent: 40, brix: 0 },
    wine12: { name: '와인 12%', volumeMl: 150, abvPercent: 12, brix: 5 },
    syrup1to1: { name: '설탕시럽 1:1', volumeMl: 30, abvPercent: 0, brix: 50 },
  };

  // localStorage keys
  const LS_CUSTOM_PRESETS = 'mix_custom_presets_v1';
  const LS_LOGS = 'mix_logs_v1';
  const LS_CUSTOM_TYPES = 'mix_custom_types_v1';

  function createRow(initial = {}) {
    const row = document.createElement('div');
    row.className = 'row';

    const typeSel = document.createElement('select');
    const TYPE_LABELS = {
      water: '물',
      spirit: '술(도수%)',
      sugar_dry: '건설탕(g)',
      syrup: '설탕 시럽(°Bx)',
      glycerin: '글리세린',
      fruit: '과일/과일주스',
      herb: '마른 약재',
      other: '기타(밀도·질량)'
    };
    ['water','spirit','sugar_dry','syrup','glycerin','fruit','herb','other'].forEach(t=>{
      const o=document.createElement('option');o.value=t;o.textContent=TYPE_LABELS[t]||t;typeSel.appendChild(o);
    });
    typeSel.value = initial.type ?? 'water';

    const name = document.createElement('input');
    name.placeholder = '재료명';
    name.value = initial.name ?? '';

    const amount = document.createElement('input');
    amount.type = 'number';
    amount.placeholder = '양';
    amount.min = '0';
    amount.step = 'any';
    amount.value = initial.amount ?? (initial.volumeMl ?? '');

    const unitSel = document.createElement('select');
    ;['mL','g'].forEach(u=>{const o=document.createElement('option');o.value=u;o.textContent=u;unitSel.appendChild(o);});
    unitSel.value = initial.inputUnit ?? 'mL';

    const abv = document.createElement('input');
    abv.type = 'number'; abv.placeholder='도수%'; abv.min='0'; abv.max='100'; abv.step='any';
    abv.value = initial.abvPercent ?? initial.abvPct ?? '';

    const brix = document.createElement('input');
    brix.type='number'; brix.placeholder='°Bx'; brix.min='0'; brix.max='100'; brix.step='any';
    brix.value = initial.brix ?? '';

    const removeBtn = document.createElement('button');
    removeBtn.textContent = '삭제';
    removeBtn.className = 'danger remove';
    removeBtn.addEventListener('click', () => {
      row.remove();
      recalc();
    });

    ;[typeSel, name, amount, unitSel, abv, brix].forEach((el) => {
      el.addEventListener('input', recalc);
      el.addEventListener('change', recalc);
    });

    row.append(typeSel, name, amount, unitSel, abv, brix, removeBtn);
    ingredientsEl.appendChild(row);
  }

  function getRows() {
    return Array.from(ingredientsEl.querySelectorAll('.row')).map((row) => {
      const [typeSel, name, amount, unitSel, abv, brix] = row.querySelectorAll('select, input');
      return {
        type: typeSel.value,
        name: name.value.trim(),
        inputUnit: unitSel.value,
        amount: parseFloat(amount.value) || 0,
        abvPct: parseFloat(abv.value) || 0,
        brix: parseFloat(brix.value) || 0,
      };
    });
  }

  function compute(results) {
    const { totalVolumeMl, ethanolMl, sugarMassG } = results;

    const finalAbvPercent = totalVolumeMl > 0 ? (ethanolMl / totalVolumeMl) * 100 : 0;

    // °Bx 근사: 각 재료의 °Bx를 당질 질량 비율로 보고, 전체 혼합물에 대한 g/100g로 환산
    // 간단화: 밀도 ~ 1 g/mL 가정 → 총질량 ≈ 총부피(mL)
    const totalMassG = totalVolumeMl; // 근사
    const finalBrix = totalMassG > 0 ? (sugarMassG / totalMassG) * 100 : 0;

    return {
      totalVolumeMl,
      finalAbvPercent,
      finalBrix,
    };
  }

  function aggregate() {
    const rows = getRows();
    // computeMix 이용
    const ignoreSugarSolidVolume = document.getElementById('optIgnoreSugarVol')?.checked ?? true;
    const apparentMode = document.getElementById('optApparentMode')?.checked ?? false;
    const aGly = parseFloat(document.getElementById('optAGly')?.value) || 0;
    const aEth = parseFloat(document.getElementById('optAEth')?.value) || 0;
    const opts = apparentMode ? { ignoreSugarSolidVolume, apparentBx: { aGly, aEth } } : { ignoreSugarSolidVolume };
    const { computeMix } = window.computeMixModule || {};
    if (!computeMix) return { totalVolumeMl: 0, ethanolMl: 0, sugarMassG: 0, _mix: null };
    const mix = computeMix(rows, opts);
    return { totalVolumeMl: mix.totalVol_mL, ethanolMl: mix.ethanolVol_mL, sugarMassG: mix.trueBx * mix.totalMass_g / 100, _mix: mix };
  }

  function recalc() {
    const agg = aggregate();
    const { totalVolumeMl, finalAbvPercent, finalBrix } = compute(agg);
    const mix = agg._mix;
    totalVolumeEl.textContent = `${fmt(totalVolumeMl)} mL`;
    finalAbvEl.textContent = mix ? `${fmt(mix.abvPct)} %` : `${fmt(finalAbvPercent)} %`;
    const trueBxEl = document.getElementById('finalTrueBrix');
    const appBxEl = document.getElementById('finalApparentBrix');
    if (trueBxEl && appBxEl) {
      if (mix) {
        trueBxEl.textContent = `${fmt(mix.trueBx)} °Bx`;
        appBxEl.textContent = (mix.apparentBx == null) ? '-' : `${fmt(mix.apparentBx)} °Bx`;
      } else {
        trueBxEl.textContent = `${fmt(finalBrix)} °Bx`;
        appBxEl.textContent = '-';
      }
    }

    // bottle calc
    const bSize = parseFloat(bottleSizeEl?.value) || 0;
    if (bSize > 0 && totalVolumeMl > 0) {
      const count = Math.floor(totalVolumeMl / bSize);
      const rem = totalVolumeMl - count * bSize;
      bottleCountEl.textContent = `${count}`;
      bottleRemainderEl.textContent = `${fmt(rem)} mL`;
    } else {
      bottleCountEl.textContent = '-';
      bottleRemainderEl.textContent = '-';
    }

    // 간단한 경고 표시(옵셔널)
    const abvForWarn = mix ? mix.abvPct : finalAbvPercent;
    if (abvForWarn > 70) {
      finalAbvEl.title = '경고: 매우 높은 도수입니다. 실제 혼합 시 주의하세요.';
    } else {
      finalAbvEl.title = '';
    }
  }

  function fmt(n) {
    const v = Number(n);
    if (!isFinite(v)) return '-';
    return (Math.round((v + Number.EPSILON) * 100) / 100).toLocaleString();
  }

  function wirePresets() {
    document.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-preset');
        const p = presets[key];
        if (!p) return;
        // map old preset to new schema defaults
        const mapped = key === 'water'
          ? { type:'water', name:'물', inputUnit:'mL', amount:100 }
          : key === 'vodka40'
          ? { type:'spirit', name:'보드카', inputUnit:'mL', amount:50, abvPct:40 }
          : key === 'wine12'
          ? { type:'spirit', name:'와인', inputUnit:'mL', amount:150, abvPct:12 }
          : { type:'syrup', name:'설탕시럽', inputUnit:'mL', amount:30, brix:50 };
        createRow(mapped);
        recalc();
      });
    });
    document.querySelectorAll('[data-quick]').forEach((btn)=>{
      btn.addEventListener('click', ()=>{
        const type = btn.getAttribute('data-quick');
        if (type === 'sugar') createRow({ type:'sugar_dry', name:'건설탕', inputUnit:'g', amount:0 });
        else if (type === 'glycerin') createRow({ type:'glycerin', name:'글리세린', inputUnit:'mL', amount:0 });
        else if (type === 'fruit') createRow({ type:'fruit', name:'과일/과일주스', inputUnit:'mL', amount:0, brix:10 });
        else if (type === 'herb') createRow({ type:'herb', name:'마른 약재', inputUnit:'g', amount:0 });
        else createRow({ type:'other', name:'기타', inputUnit:'mL', amount:0 });
        recalc();
      });
    });
  }

  // -------- Custom Types --------
  const customTypeLabelEl = document.getElementById('customTypeLabel');
  const customTypeBaseEl = document.getElementById('customTypeBase');
  const addCustomTypeBtn = document.getElementById('addCustomTypeBtn');
  const customTypeChipsEl = document.getElementById('customTypeChips');

  function loadCustomTypes(){ try { return JSON.parse(localStorage.getItem(LS_CUSTOM_TYPES)||'[]'); } catch { return []; } }
  function saveCustomTypes(list){ localStorage.setItem(LS_CUSTOM_TYPES, JSON.stringify(list)); }
  function renderCustomTypeChips(){
    const list = loadCustomTypes();
    customTypeChipsEl.innerHTML = '';
    list.forEach((t, idx)=>{
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.textContent = t.label;
      btn.addEventListener('click', ()=>{
        // default mapping from base
        const base = t.base;
        if (base === 'water') createRow({ type:'water', name:t.label, inputUnit:'mL', amount:0 });
        else if (base === 'spirit') createRow({ type:'spirit', name:t.label, inputUnit:'mL', amount:0, abvPct:40 });
        else if (base === 'sugar_dry') createRow({ type:'sugar_dry', name:t.label, inputUnit:'g', amount:0 });
        else if (base === 'syrup') createRow({ type:'syrup', name:t.label, inputUnit:'mL', amount:0, brix:50 });
        else if (base === 'glycerin') createRow({ type:'glycerin', name:t.label, inputUnit:'mL', amount:0 });
        else if (base === 'fruit') createRow({ type:'fruit', name:t.label, inputUnit:'mL', amount:0, brix:10 });
        else if (base === 'herb') createRow({ type:'herb', name:t.label, inputUnit:'g', amount:0 });
        else createRow({ type:'other', name:t.label, inputUnit:'mL', amount:0 });
        recalc();
      });
      const del = document.createElement('button');
      del.className = 'danger chip';
      del.textContent = '삭제';
      del.addEventListener('click', ()=>{
        const cur = loadCustomTypes();
        cur.splice(idx,1);
        saveCustomTypes(cur);
        renderCustomTypeChips();
      });
      const wrap = document.createElement('span');
      wrap.style.display = 'inline-flex';
      wrap.style.gap = '6px';
      wrap.append(btn, del);
      customTypeChipsEl.appendChild(wrap);
    });
    if (!list.length) customTypeChipsEl.innerHTML = '<p class="notes">사용자 정의 종류가 없습니다.</p>';
  }

  addCustomTypeBtn?.addEventListener('click', ()=>{
    const label = (customTypeLabelEl?.value||'').trim();
    const base = customTypeBaseEl?.value || 'other';
    if (!label) return;
    const list = loadCustomTypes();
    list.push({ label, base });
    saveCustomTypes(list);
    customTypeLabelEl.value='';
    renderCustomTypeChips();
  });


  function rerenderOn(el) { el?.addEventListener('input', recalc); el?.addEventListener('change', recalc); }
  addRowBtn?.addEventListener('click', () => { createRow(); recalc(); });
  clearAllBtn?.addEventListener('click', () => { ingredientsEl.innerHTML = ''; recalc(); });
  rerenderOn(document.getElementById('optIgnoreSugarVol'));
  rerenderOn(document.getElementById('optApparentMode'));
  rerenderOn(document.getElementById('optAGly'));
  rerenderOn(document.getElementById('optAEth'));
  rerenderOn(bottleSizeEl);
  
  // 겉보기 모드 토글 시 계수 입력 활성화/비활성화
  document.getElementById('optApparentMode')?.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    document.getElementById('optAGly').disabled = !enabled;
    document.getElementById('optAEth').disabled = !enabled;
  });

  // 겉보기 모드 토글 시 계수 입력 활성화/비활성화 (기존 함수는 그대로 유지)

  // 초기 행 2개
  createRow({ type: 'water', name: '물', inputUnit: 'mL', amount: 100, brix: 0 });
  createRow({ type: 'spirit', name: '보드카', inputUnit: 'mL', amount: 50, abvPct: 40 });
  wirePresets();
  recalc();

  // -------- Custom presets --------
  const customNameEl = document.getElementById('customPresetName');
  const addCustomPresetBtn = document.getElementById('addCustomPresetBtn');
  const customPresetListEl = document.getElementById('customPresetList');

  function loadCustomPresets() {
    try { return JSON.parse(localStorage.getItem(LS_CUSTOM_PRESETS) || '[]'); } catch { return []; }
  }
  function saveCustomPresets(list) {
    localStorage.setItem(LS_CUSTOM_PRESETS, JSON.stringify(list));
  }
  function renderCustomPresets() {
    const list = loadCustomPresets();
    if (!list.length) { customPresetListEl.innerHTML = '<p class="notes">사용자 프리셋 없음</p>'; return; }
    customPresetListEl.innerHTML = '';
    list.forEach((preset, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'row';
      const name = document.createElement('div');
      name.textContent = preset.name || `프리셋 ${idx+1}`;
      const applyBtn = document.createElement('button');
      applyBtn.textContent = '적용';
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '삭제';
      deleteBtn.className = 'danger';
      applyBtn.addEventListener('click', () => {
        ingredientsEl.innerHTML = '';
        preset.rows.forEach(r => createRow(r));
        recalc();
      });
      deleteBtn.addEventListener('click', () => {
        const cur = loadCustomPresets();
        cur.splice(idx, 1);
        saveCustomPresets(cur);
        renderCustomPresets();
      });
      wrapper.append(name, document.createElement('div'), document.createElement('div'), applyBtn, deleteBtn);
      customPresetListEl.appendChild(wrapper);
    });
  }
  addCustomPresetBtn?.addEventListener('click', () => {
    const name = (customNameEl?.value || '').trim();
    const rows = getRows();
    if (!rows.length) return;
    const list = loadCustomPresets();
    list.push({ name, rows });
    saveCustomPresets(list);
    customNameEl.value = '';
    renderCustomPresets();
  });
  renderCustomPresets();
  renderCustomTypeChips();

  // -------- Logs --------
  const logNameEl = document.getElementById('logName');
  const logCommentEl = document.getElementById('logComment');
  const saveLogBtn = document.getElementById('saveLogBtn');
  const clearLogsBtn = document.getElementById('clearLogsBtn');
  const logListEl = document.getElementById('logList');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  function loadLogs() {
    try { return JSON.parse(localStorage.getItem(LS_LOGS) || '[]'); } catch { return []; }
  }
  function saveLogs(list) {
    localStorage.setItem(LS_LOGS, JSON.stringify(list));
  }
  function renderLogs() {
    const logs = loadLogs();
    if (!logs.length) { logListEl.innerHTML = '<p class="notes">저장된 로그가 없습니다.</p>'; return; }
    // 동적 컬럼 생성: 모든 로그의 재료명을 수집
    const ingredientNames = Array.from(new Set(logs.flatMap(l => (l.rows||[]).map(r => r.name || '무명'))));
    // 테이블 구성
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['시간', '이름', '코멘트', ...ingredientNames.map(n => `${n}(mL)`), 'ABV(%)', 'True °Bx', 'Apparent °Bx', '적용', '삭제']
      .forEach(h => { const th = document.createElement('th'); th.textContent = h; headerRow.appendChild(th); });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    logs.forEach((log, idx) => {
      const tr = document.createElement('tr');
      const ts = new Date(log.ts).toLocaleString();
      const base = [ts, log.name || '(무제)', log.comment || ''];
      base.forEach(v => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });

      // compute per-ingredient volume using computeMix on saved rows
      const byName = Object.create(null);
      try {
        const { computeMix } = window.computeMixModule || {};
        if (computeMix) {
          const savedRows = (log.rows || []).map(r => ({
            type: r.type || 'water',
            name: r.name || '무명',
            inputUnit: r.inputUnit || 'mL',
            amount: parseFloat(r.amount) || 0,
            abvPct: parseFloat(r.abvPct) || 0,
            brix: parseFloat(r.brix) || 0,
          }));
          const mixRes = computeMix(savedRows, { ignoreSugarSolidVolume: true });
          (mixRes.breakdown || []).forEach(b => {
            byName[b.name] = (byName[b.name] || 0) + (parseFloat(b.vol_mL) || 0);
          });
        }
      } catch {}
      ingredientNames.forEach(n => {
        const td = document.createElement('td');
        const val = byName[n] ? fmt(byName[n]) : '';
        td.textContent = val;
        tr.appendChild(td);
      });

      const tdAbv = document.createElement('td');
      tdAbv.textContent = log.result ? fmt(log.result.finalAbvPercent ?? log.result.abvPct) : '';
      tr.appendChild(tdAbv);
      const tdTrue = document.createElement('td');
      tdTrue.textContent = log.result && (log.result.trueBx != null ? fmt(log.result.trueBx) : fmt(log.result.finalBrix ?? 0));
      tr.appendChild(tdTrue);
      const tdApp = document.createElement('td');
      tdApp.textContent = (log.result && log.result.apparentBx != null) ? fmt(log.result.apparentBx) : '';
      tr.appendChild(tdApp);

      const applyTd = document.createElement('td');
      const applyBtn = document.createElement('button');
      applyBtn.textContent = '적용';
      applyBtn.addEventListener('click', () => {
        ingredientsEl.innerHTML = '';
        (log.rows||[]).forEach(r => createRow(r));
        recalc();
      });
      applyTd.appendChild(applyBtn);
      tr.appendChild(applyTd);

      const delTd = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '삭제';
      deleteBtn.className = 'danger';
      deleteBtn.addEventListener('click', () => {
        const cur = loadLogs();
        cur.splice(idx, 1);
        saveLogs(cur);
        renderLogs();
      });
      delTd.appendChild(deleteBtn);
      tr.appendChild(delTd);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    logListEl.innerHTML = '';
    logListEl.appendChild(table);
  }
  function toSerializableRows(rows) {
    return rows.map(r => ({ type: r.type, name: r.name, inputUnit: r.inputUnit, amount: r.amount, abvPct: r.abvPct, brix: r.brix }));
  }

  saveLogBtn?.addEventListener('click', () => {
    const name = (logNameEl?.value || '').trim();
    const comment = (logCommentEl?.value || '').trim();
    const rows = getRows();
    const agg = aggregate();
    const comp = agg._mix ? { finalAbvPercent: agg._mix.abvPct, finalBrix: agg._mix.trueBx, trueBx: agg._mix.trueBx, apparentBx: agg._mix.apparentBx } : compute(agg);
    const logs = loadLogs();
    logs.push({ ts: Date.now(), name, comment, rows: toSerializableRows(rows), result: comp });
    saveLogs(logs);
    logNameEl.value = '';
    logCommentEl.value = '';
    renderLogs();
  });
  clearLogsBtn?.addEventListener('click', () => { saveLogs([]); renderLogs(); });
  renderLogs();

  // -------- CSV export (Excel-compatible) --------
  function exportLogsToCsv() {
    const logs = loadLogs();
    if (!logs.length) return;
    const ingredientNames = Array.from(new Set(logs.flatMap(l => (l.rows||[]).map(r => r.name || '무명'))));
    const headers = ['시간','이름','코멘트', ...ingredientNames.map(n=>`${n}(mL)`),'ABV(%)','True °Bx','Apparent °Bx'];
    const rows = [headers];
    logs.forEach(log => {
      const base = [new Date(log.ts).toLocaleString(), log.name || '', log.comment || ''];
      const byName = Object.create(null);
      try {
        const { computeMix } = window.computeMixModule || {};
        if (computeMix) {
          const savedRows = (log.rows || []).map(r => ({
            type: r.type || 'water',
            name: r.name || '무명',
            inputUnit: r.inputUnit || 'mL',
            amount: parseFloat(r.amount) || 0,
            abvPct: parseFloat(r.abvPct) || 0,
            brix: parseFloat(r.brix) || 0,
          }));
          const mixRes = computeMix(savedRows, { ignoreSugarSolidVolume: true });
          (mixRes.breakdown || []).forEach(b => {
            byName[b.name] = (byName[b.name] || 0) + (parseFloat(b.vol_mL) || 0);
          });
        }
      } catch {}
      const vols = ingredientNames.map(n => byName[n] ? String((Math.round(byName[n]*100)/100)) : '');
      const abvVal = log.result ? (log.result.finalAbvPercent ?? log.result.abvPct) : undefined;
      const trueVal = log.result ? (log.result.trueBx ?? log.result.finalBrix) : undefined;
      const appVal = log.result ? log.result.apparentBx : undefined;
      const tail = [
        abvVal != null ? String(Math.round(abvVal*100)/100) : '',
        trueVal != null ? String(Math.round(trueVal*100)/100) : '',
        appVal != null ? String(Math.round(appVal*100)/100) : ''
      ];
      rows.push([...base, ...vols, ...tail]);
    });
    const csv = rows.map(r => r.map(cell => {
      const s = String(cell ?? '');
      // quote if contains comma, quote or newline
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g,'""') + '"';
      return s;
    }).join(',')).join('\n');
    const bom = '\uFEFF'; // Excel UTF-8 BOM
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mix-logs-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exportCsvBtn?.addEventListener('click', exportLogsToCsv);
})();


