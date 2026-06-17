// =============================================================================
// 呼吸节奏 RQrunning - 交互式 Widget 逻辑
// =============================================================================

// 全局状态
const state = {
  maxHR: 190,
  restHR: 50,
  pbPace: '03:50',
  selectedZone: 'T',  // 默认选中 T 区（乳酸阈值）
  zones: [],
  pbPaceSeconds: 230
};

const STORAGE_KEY = 'rqrunning-settings';
let urlUpdateFrame = null;

// 训练区间配置（复用原有数据）
const HR_ZONES = [
  {
    code: 'D',
    name: '恢复跑',
    min: 0.50,
    max: 0.60,
    rq: '0.70-0.75',
    energy: '脂肪90% / 糖10%',
    use: '恢复训练、热身、放松'
  },
  {
    code: 'E',
    name: '有氧耐力',
    min: 0.60,
    max: 0.75,
    rq: '0.75-0.85',
    energy: '脂肪70% / 糖30%',
    use: '打基础、长距离慢跑'
  },
  {
    code: 'M',
    name: '马拉松配速',
    min: 0.75,
    max: 0.84,
    rq: '0.85-0.90',
    energy: '脂肪50% / 糖50%',
    use: '马拉松比赛配速训练'
  },
  {
    code: 'T',
    name: '乳酸阈值',
    min: 0.84,
    max: 0.88,
    rq: '0.90-0.95',
    energy: '脂肪20% / 糖80%',
    use: '提升乳酸阈值、节奏跑'
  },
  {
    code: 'A',
    name: '有氧动力',
    min: 0.88,
    max: 0.95,
    rq: '0.95-1.00',
    energy: '糖95% / 脂肪5%',
    use: '长间歇、提升最大摄氧量'
  },
  {
    code: 'I',
    name: '无氧能力',
    min: 0.95,
    max: 1.00,
    rq: '1.00+',
    energy: '无氧糖酵解为主',
    use: '短间歇、速度训练'
  }
];

// 间歇训练配置（重新分组）
const SHORT_INTERVAL_ROWS = [
  { distance: '＜400米', delta: null, rest: '充分恢复', reps: '10-30组', paceText: '全力冲刺' },
  { distance: '400米', delta: -30, rest: '01:30', reps: '10-30组' },
  { distance: '800米', delta: -15, rest: '02:30', reps: '6-25组' },
  { distance: '1000米', delta: -10, rest: '03:00', reps: '5-15组' }
];

const LONG_INTERVAL_ROWS = [
  { distance: '2000米', delta: -5, rest: '05:00', reps: '3-10组' },
  { distance: '3000米', delta: 0, rest: '05:00', reps: '2-9组' },
  { distance: '5000米', delta: 10, rest: '08:00', reps: '1-8组' }
];

// 匀速跑配置（增加长距离时长）
const STEADY_ROWS = [
  { category: '有氧（上限）', delta: 40, duration: '40-90分钟', lsdDuration: '90-150分钟', race: '5km', raceDelta: -10, raceDistance: 5 },
  { category: '有氧（下限）', delta: 100, duration: '40-90分钟', lsdDuration: '90-150分钟', race: '10km', raceDelta: 0, raceDistance: 10 },
  { category: '节奏（上限）', delta: 5, duration: '30-80分钟', lsdDuration: '90-150分钟', race: '半马', raceDelta: 10, raceDistance: 21.0975 },
  { category: '节奏（下限）', delta: 35, duration: '30-80分钟', lsdDuration: '90-150分钟', race: '全马', raceDelta: 20, raceDistance: 42.195 }
];

// 配速偏移映射（复用）
const PACE_OFFSETS = {
  'D': +80,
  'E': +50,
  'M': +25,
  'T': +5,
  'A': -8,
  'I': -20
};

// =============================================================================
// 工具函数（复用）
// =============================================================================

function parsePace(text) {
  const value = String(text || '').trim();
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (seconds > 59) return null;
  return minutes * 60 + seconds;
}

function formatPace(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`;
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remain = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`;
  }
  return `${minutes}:${String(remain).padStart(2, '0')}`;
}

function normalizePaceInput(text) {
  const digits = String(text || '').replace(/\D/g, '').slice(0, 4);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  const minutes = digits.slice(0, digits.length - 2);
  const seconds = digits.slice(-2);
  return `${minutes}:${seconds}`;
}

function calculateHRZones(restHR, maxHR) {
  const reserve = maxHR - restHR;
  return HR_ZONES.map(zone => {
    const hrMin = Math.round(restHR + reserve * zone.min);
    const hrMax = Math.round(restHR + reserve * zone.max);
    return {
      ...zone,
      hrMin,
      hrMax,
      hrRange: `${hrMin}-${hrMax}`,
      intensity: `${Math.round(zone.min * 100)}-${Math.round(zone.max * 100)}%`
    };
  });
}

function parseEnergyString(energyStr) {
  // 解析 "脂肪70% / 糖30%" 或 "糖95% / 脂肪5%" 或 "无氧糖酵解为主"
  const fatFirst = energyStr.match(/脂肪(\d+)%.*?糖(\d+)%/);
  if (fatFirst) {
    return { fat: parseInt(fatFirst[1]), carb: parseInt(fatFirst[2]) };
  }

  const carbFirst = energyStr.match(/糖(\d+)%.*?脂肪(\d+)%/);
  if (carbFirst) {
    return { fat: parseInt(carbFirst[2]), carb: parseInt(carbFirst[1]) };
  }

  // 无氧区间
  if (energyStr.includes('无氧')) {
    return { fat: 0, carb: 100 };
  }

  return { fat: 50, carb: 50 };
}

function getRQDescription(rqStr) {
  // 从 RQ 推断描述
  const rqLower = parseFloat(rqStr.split('-')[0]);
  if (rqLower < 0.80) return '脂肪燃烧为主';
  if (rqLower < 0.90) return '糖脂混合供能';
  return '糖原供能为主';
}

// =============================================================================
// 核心逻辑 - 重计算与渲染
// =============================================================================

function recompute() {
  // 1. 验证边界
  if (state.maxHR <= state.restHR) {
    state.maxHR = state.restHR + 10;
    document.getElementById('maxHR').value = state.maxHR;
  }

  // 2. 计算心率区间
  state.zones = calculateHRZones(state.restHR, state.maxHR);

  // 3. 解析配速
  const pbSeconds = parsePace(state.pbPace);
  if (pbSeconds) {
    state.pbPaceSeconds = pbSeconds;
  }

  // 4. 更新控件显示值
  document.getElementById('maxHRValue').innerHTML = `${state.maxHR} <small>bpm</small>`;
  document.getElementById('restHRValue').innerHTML = `${state.restHR} <small>bpm</small>`;
  document.getElementById('reserveValue').innerHTML =
    `储备 ${state.maxHR - state.restHR} <small>bpm</small>`;

  // 5. 渲染三大模块
  renderZoneBar();
  renderRQPanel();
  renderPacePanel();

  // 6. 渲染详细课表
  renderShortIntervalTable();
  renderLongIntervalTable();
  renderSteadyTable();

  // 7. 同步分享 URL 与本地设置
  updateURL();
  saveToLocalStorage();
}

// =============================================================================
// 渲染 - 心率区间条带
// =============================================================================

function renderZoneBar() {
  const zoneBar = document.getElementById('zoneBar');
  const reserve = state.maxHR - state.restHR;

  // 先计算每个区间的实际 bpm 跨度
  const zoneWidths = state.zones.map(zone => {
    return Math.round(reserve * (zone.max - zone.min));
  });

  // 总跨度应该等于储备心率
  const totalWidth = zoneWidths.reduce((sum, w) => sum + w, 0);

  zoneBar.innerHTML = state.zones.map((zone, idx) => {
    // 按比例分配宽度，确保总和为 100%
    const widthPercent = (zoneWidths[idx] / totalWidth * 100).toFixed(2);
    const isActive = zone.code === state.selectedZone;

    return `
      <div class="zone-segment ${isActive ? 'active' : ''}"
           data-zone="${zone.code}"
           style="flex: 0 0 ${widthPercent}%"
           role="tab"
           aria-selected="${isActive}"
           aria-label="${zone.code}区 ${zone.name} ${zone.hrRange} bpm">
        <div class="zone-code">${zone.code}</div>
        <div class="zone-bpm">${zone.hrRange}</div>
      </div>
    `;
  }).join('');

  // 绑定点击事件
  zoneBar.querySelectorAll('.zone-segment').forEach(seg => {
    seg.addEventListener('click', () => {
      state.selectedZone = seg.dataset.zone;
      recompute();
    });
  });

  // 刻度
  const zoneScale = document.getElementById('zoneScale');
  zoneScale.innerHTML = `
    <span>${state.restHR}</span>
    <span>${state.maxHR}</span>
  `;

  // 区间详情
  const selected = state.zones.find(z => z.code === state.selectedZone);
  if (selected) {
    document.getElementById('zoneDetail').innerHTML = `
      <div class="text-lg font-bold mb-2" style="color: var(--sport-green);">${selected.code} 区 - ${selected.name}</div>
      <div class="text-sm" style="color: var(--text-secondary);">
        <strong style="color: var(--text-primary);">心率：</strong>${selected.hrRange} bpm（${selected.intensity}）
        · <strong style="color: var(--text-primary);">用途：</strong>${selected.use}
      </div>
    `;
  }
}

// =============================================================================
// 渲染 - RQ 呼吸商指示
// =============================================================================

function renderRQPanel() {
  const selected = state.zones.find(z => z.code === state.selectedZone);
  if (!selected) return;

  const energy = parseEnergyString(selected.energy);
  const desc = getRQDescription(selected.rq);

  document.getElementById('rqPanel').innerHTML = `
    <div class="text-center mb-6">
      <div class="text-xs uppercase tracking-wider font-semibold mb-2" style="color: var(--text-secondary);">当前区间 RQ 范围</div>
      <div class="text-4xl font-bold mb-2" style="color: var(--sport-cyan);">${selected.rq}</div>
      <div class="text-lg" style="color: var(--text-primary);">${desc}</div>
    </div>

    <div class="energy-bar mb-4">
      <div class="energy-segment fat" style="flex: 0 0 ${energy.fat}%">
        ${energy.fat > 15 ? `脂肪 ${energy.fat}%` : ''}
      </div>
      <div class="energy-segment carb" style="flex: 0 0 ${energy.carb}%">
        ${energy.carb > 15 ? `糖 ${energy.carb}%` : ''}
      </div>
    </div>

    <div class="flex justify-center gap-6 text-sm mb-4" style="color: var(--text-secondary);">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-full" style="background: linear-gradient(to right, #00ff88, #00d9a5);"></div>
        <span>脂肪供能 ${energy.fat}%</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-full" style="background: linear-gradient(to right, #ff6b35, #ff9500);"></div>
        <span>糖原供能 ${energy.carb}%</span>
      </div>
    </div>

    <div class="p-4 rounded-xl border-l-4 text-sm" style="background: var(--bg-card); border-color: var(--sport-cyan); color: var(--text-secondary);">
      <strong style="color: var(--text-primary);">科学原理：</strong>${selected.use}。RQ 值越低，脂肪供能占比越高；越高则糖原占比越大。
    </div>
  `;
}

// =============================================================================
// 渲染 - 配速预测
// =============================================================================

function renderPacePanel() {
  const selected = state.zones.find(z => z.code === state.selectedZone);
  if (!selected) return;

  const suggestedPace = state.pbPaceSeconds + PACE_OFFSETS[selected.code];
  const rangeMin = formatPace(suggestedPace - 5);
  const rangeMax = formatPace(suggestedPace + 5);

  // Hero 区域
  document.getElementById('paceHero').innerHTML = `
    <div class="text-xs uppercase tracking-wider font-semibold mb-3" style="color: var(--sport-green);">${selected.code} 区 - ${selected.name}</div>
    <div class="text-5xl font-bold mb-3" style="color: var(--sport-green);">${formatPace(suggestedPace)}</div>
    <div class="text-base" style="color: var(--text-primary);">建议范围：${rangeMin} ~ ${rangeMax}</div>
  `;

  // 列表
  const paceList = document.getElementById('paceList');
  paceList.innerHTML = state.zones.map(zone => {
    const pace = state.pbPaceSeconds + PACE_OFFSETS[zone.code];
    const isActive = zone.code === state.selectedZone;

    // 区间徽章颜色映射 - 高饱和度运动色
    const zoneColors = {
      'D': 'from-green-400 to-emerald-400',
      'E': 'from-cyan-400 to-blue-400',
      'M': 'from-yellow-400 to-amber-400',
      'T': 'from-orange-400 to-orange-500',
      'A': 'from-orange-500 to-red-500',
      'I': 'from-red-500 to-red-600'
    };

    return `
      <li class="pace-item ${isActive ? 'active' : ''} flex justify-between items-center px-5 py-4 rounded-xl" data-zone="${zone.code}">
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 flex items-center justify-center rounded-lg bg-gradient-to-br ${zoneColors[zone.code]} text-white font-bold text-sm">${zone.code}</span>
          <span class="font-semibold" style="color: var(--text-primary);">${zone.name}</span>
        </div>
        <div class="text-2xl font-bold" style="color: var(--sport-green);">${formatPace(pace)}</div>
      </li>
    `;
  }).join('');

  // 绑定点击事件
  paceList.querySelectorAll('.pace-item').forEach(item => {
    item.addEventListener('click', () => {
      state.selectedZone = item.dataset.zone;
      recompute();
    });
  });
}

// =============================================================================
// 渲染 - 详细课表（拆分为短/长间歇）
// =============================================================================

function renderShortIntervalTable() {
  const tbody = document.getElementById('shortIntervalBody');
  const pbSeconds = state.pbPaceSeconds;

  tbody.innerHTML = SHORT_INTERVAL_ROWS.map(row => {
    const pace = row.paceText || formatPace(pbSeconds + row.delta);

    return `
      <tr>
        <td class="px-4 py-3" data-label="距离">${row.distance}</td>
        <td class="px-4 py-3 text-right font-mono font-bold" data-label="建议配速" style="color: var(--sport-green);">${pace}</td>
        <td class="px-4 py-3 text-right font-mono" data-label="间歇时长">${row.rest}</td>
        <td class="px-4 py-3 text-right" data-label="建议组数">${row.reps}</td>
      </tr>
    `;
  }).join('');
}

function renderLongIntervalTable() {
  const tbody = document.getElementById('longIntervalBody');
  const pbSeconds = state.pbPaceSeconds;

  tbody.innerHTML = LONG_INTERVAL_ROWS.map(row => {
    const pace = formatPace(pbSeconds + row.delta);

    return `
      <tr>
        <td class="px-4 py-3" data-label="距离">${row.distance}</td>
        <td class="px-4 py-3 text-right font-mono font-bold" data-label="建议配速" style="color: var(--sport-green);">${pace}</td>
        <td class="px-4 py-3 text-right font-mono" data-label="间歇时长">${row.rest}</td>
        <td class="px-4 py-3 text-right" data-label="建议组数">${row.reps}</td>
      </tr>
    `;
  }).join('');
}

function renderSteadyTable() {
  const trainingBody = document.getElementById('steadyTrainingBody');
  const raceBody = document.getElementById('racePredicBody');
  const pbSeconds = state.pbPaceSeconds;

  // 匀速跑训练表（新增长距离时长列）
  trainingBody.innerHTML = STEADY_ROWS.map(row => {
    const trainingPace = pbSeconds + row.delta;
    return `
      <tr>
        <td class="px-4 py-3" data-label="训练类别"><span class="px-2 py-1 rounded text-xs font-semibold" style="background: rgba(0,255,136,0.2); color: var(--sport-green);">${row.category}</span></td>
        <td class="px-4 py-3 text-right font-mono font-bold" data-label="建议配速" style="color: var(--sport-green);">${formatPace(trainingPace)}</td>
        <td class="px-4 py-3" data-label="训练时长">${row.duration}</td>
        <td class="px-4 py-3" data-label="长距离时长">${row.lsdDuration}</td>
      </tr>
    `;
  }).join('');

  // 比赛预测表
  raceBody.innerHTML = STEADY_ROWS.map(row => {
    const racePace = pbSeconds + row.raceDelta;
    const predictedSeconds = racePace * row.raceDistance;
    return `
      <tr>
        <td class="px-4 py-3" data-label="比赛项目"><strong style="color: var(--text-primary);">${row.race}</strong></td>
        <td class="px-4 py-3 text-right font-mono font-bold" data-label="比赛配速">${formatPace(racePace)}</td>
        <td class="px-4 py-3 text-right font-mono font-bold" data-label="成绩预测" style="color: var(--sport-green);">${formatDuration(predictedSeconds)}</td>
      </tr>
    `;
  }).join('');
}

// =============================================================================
// URL 同步（可选）
// =============================================================================

function updateURL() {
  if (urlUpdateFrame) {
    cancelAnimationFrame(urlUpdateFrame);
  }

  urlUpdateFrame = requestAnimationFrame(() => {
    const url = new URL(window.location);
    url.searchParams.set('maxHR', state.maxHR);
    url.searchParams.set('restHR', state.restHR);
    url.searchParams.set('pbPace', state.pbPace);
    url.searchParams.set('zone', state.selectedZone);
    window.history.replaceState({}, '', url);
    urlUpdateFrame = null;
  });
}

function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      maxHR: state.maxHR,
      restHR: state.restHR,
      pbPace: state.pbPace,
      selectedZone: state.selectedZone
    }));
  } catch (error) {
    // 浏览器隐私模式或禁用存储时忽略，不影响计算功能。
  }
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const saved = JSON.parse(raw);
    if (Number.isInteger(saved.maxHR) && saved.maxHR >= 150 && saved.maxHR <= 210) {
      state.maxHR = saved.maxHR;
      document.getElementById('maxHR').value = saved.maxHR;
    }
    if (Number.isInteger(saved.restHR) && saved.restHR >= 40 && saved.restHR <= 90) {
      state.restHR = saved.restHR;
      document.getElementById('restHR').value = saved.restHR;
    }
    if (parsePace(saved.pbPace)) {
      state.pbPace = saved.pbPace;
      document.getElementById('pbPace').value = saved.pbPace;
    }
    if (['D', 'E', 'M', 'T', 'A', 'I'].includes(saved.selectedZone)) {
      state.selectedZone = saved.selectedZone;
    }
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function getShareURL() {
  const url = new URL(window.location);
  url.searchParams.set('maxHR', state.maxHR);
  url.searchParams.set('restHR', state.restHR);
  url.searchParams.set('pbPace', state.pbPace);
  url.searchParams.set('zone', state.selectedZone);
  return url.toString();
}

async function copyShareLink(button) {
  const shareURL = getShareURL();
  const originalText = button.textContent;

  try {
    await navigator.clipboard.writeText(shareURL);
    button.textContent = '已复制';
  } catch (error) {
    window.prompt('复制失败，请手动复制链接：', shareURL);
    button.textContent = '复制链接';
  }

  setTimeout(() => {
    button.textContent = originalText;
  }, 1600);
}

function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('maxHR')) {
    const val = parseInt(params.get('maxHR'));
    if (val >= 150 && val <= 210) {
      state.maxHR = val;
      document.getElementById('maxHR').value = val;
    }
  }
  if (params.has('restHR')) {
    const val = parseInt(params.get('restHR'));
    if (val >= 40 && val <= 90) {
      state.restHR = val;
      document.getElementById('restHR').value = val;
    }
  }
  if (params.has('pbPace')) {
    const pace = params.get('pbPace');
    if (parsePace(pace)) {
      state.pbPace = pace;
      document.getElementById('pbPace').value = pace;
    }
  }
  if (params.has('zone')) {
    const zone = params.get('zone');
    if (['D', 'E', 'M', 'T', 'A', 'I'].includes(zone)) {
      state.selectedZone = zone;
    }
  }
}

// =============================================================================
// 事件绑定
// =============================================================================

function initControls() {
  const maxHRSlider = document.getElementById('maxHR');
  const restHRSlider = document.getElementById('restHR');
  const pbPaceInput = document.getElementById('pbPace');
  const resetBtn = document.getElementById('resetBtn');
  const shareBtn = document.getElementById('shareBtn');

  // 最大心率（添加验证）
  maxHRSlider.addEventListener('input', (e) => {
    const newMaxHR = parseInt(e.target.value);
    // 验证：最大心率必须大于静息心率
    if (newMaxHR <= state.restHR) {
      // 自动调整静息心率
      state.restHR = Math.max(40, newMaxHR - 10);
      document.getElementById('restHR').value = state.restHR;
    }
    state.maxHR = newMaxHR;
    recompute();
  });

  // 静息心率（添加验证）
  restHRSlider.addEventListener('input', (e) => {
    const newRestHR = parseInt(e.target.value);
    // 验证：静息心率必须小于最大心率
    if (newRestHR >= state.maxHR) {
      // 自动调整最大心率
      state.maxHR = Math.min(210, newRestHR + 10);
      document.getElementById('maxHR').value = state.maxHR;
    }
    state.restHR = newRestHR;
    recompute();
  });

  // 配速输入
  pbPaceInput.addEventListener('input', (e) => {
    const normalized = normalizePaceInput(e.target.value);
    if (e.target.value !== normalized) {
      e.target.value = normalized;
    }
  });

  pbPaceInput.addEventListener('blur', (e) => {
    const value = e.target.value.trim();
    const pbSeconds = parsePace(value);

    const hint = document.getElementById('pbPaceHint');
    if (pbSeconds === null && value !== '') {
      hint.textContent = '格式错误，请输入 mm:ss（秒数 00-59）';
      hint.style.color = '#ff6b35';
      return;
    }

    // 添加合理性检查（2:00 - 10:00 之间）
    if (pbSeconds && (pbSeconds < 120 || pbSeconds > 600)) {
      hint.textContent = '配速应在 2:00 - 10:00 之间，请检查输入';
      hint.style.color = '#ff6b35';
      return;
    }

    if (pbSeconds) {
      state.pbPace = formatPace(pbSeconds);
      e.target.value = state.pbPace;
      hint.textContent = '格式 mm:ss，作为各区间配速推算的基准。';
      hint.style.color = '';
      recompute();
    }
  });

  pbPaceInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  });

  // 重置按钮（添加确认提示）
  resetBtn.addEventListener('click', () => {
    if (!confirm('确定要重置所有参数到默认值吗？')) {
      return;
    }

    state.maxHR = 190;
    state.restHR = 50;
    state.pbPace = '03:50';
    state.selectedZone = 'T';

    document.getElementById('maxHR').value = 190;
    document.getElementById('restHR').value = 50;
    document.getElementById('pbPace').value = '03:50';

    recompute();
  });

  shareBtn.addEventListener('click', () => {
    copyShareLink(shareBtn);
  });
}

// =============================================================================
// 初始化
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  loadFromLocalStorage();
  loadFromURL();
  initControls();
  recompute();
});
