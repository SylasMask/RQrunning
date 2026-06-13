// =============================================================================
// Sylas Training Hub - 核心逻辑
// =============================================================================

// 全局状态管理
const state = {
  // 心率参数
  restHR: 60,
  age: 35,
  maxHR: null,
  maxHRFormula: 'fox',

  // 配速参数
  pbPace: '03:50',

  // 计算结果
  hrZones: [],
  paceIntervals: [],
  paceSteady: [],

  // 联动状态
  hasHRData: false,
  hasPaceData: false
};

// =============================================================================
// 标签页切换
// =============================================================================

function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      // 移除所有 active 状态
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabContents.forEach(c => c.classList.remove('active'));

      // 激活当前标签
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      document.getElementById(`${targetTab}-panel`).classList.add('active');

      // 如果切换到联动标签页，渲染结果
      if (targetTab === 'combined') {
        renderCombinedResults();
      }

      // 更新 URL
      updateURL({ tab: targetTab });
    });
  });
}

// =============================================================================
// 心率区间计算
// =============================================================================

// 训练区间配置
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

// 计算最大心率
function calculateMaxHR(age, formula) {
  if (formula === 'tanaka') {
    return Math.round(208 - 0.7 * age);
  }
  return 220 - age; // fox
}

// 计算心率区间
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

// 渲染心率区间表格
function renderHRZones(zones) {
  const tbody = document.getElementById('hrZonesTableBody');

  tbody.innerHTML = zones.map(zone => `
    <tr>
      <td><span class="badge badge-zone-${zone.code.toLowerCase()}">${zone.code} 区</span></td>
      <td>${zone.intensity}</td>
      <td class="font-mono font-bold">${zone.hrRange} bpm</td>
      <td class="numeric font-mono">${zone.rq}</td>
      <td>${zone.energy}</td>
      <td>${zone.use}</td>
    </tr>
  `).join('');
}

// 心率计算按钮事件
function initHRCalculator() {
  const calcBtn = document.getElementById('calcHrBtn');
  const shareBtn = document.getElementById('shareHrBtn');
  const restHRInput = document.getElementById('restHR');
  const ageInput = document.getElementById('age');
  const maxHRInput = document.getElementById('maxHR');
  const formulaSelect = document.getElementById('maxHrFormula');

  // 更新公式提示
  formulaSelect.addEventListener('change', () => {
    const formula = formulaSelect.value;
    const age = parseInt(ageInput.value) || 35;
    const estimated = calculateMaxHR(age, formula);
    const formulaText = formula === 'fox' ? '220 - 年龄' : '208 - 0.7 × 年龄';
    document.getElementById('formulaHint').textContent =
      `当前估算公式：${formulaText}，估算值 ${estimated} bpm。若有实测值，建议优先填写。`;
  });

  ageInput.addEventListener('input', () => {
    formulaSelect.dispatchEvent(new Event('change'));
  });

  // 计算心率区间
  calcBtn.addEventListener('click', () => {
    const restHR = parseInt(restHRInput.value);
    const age = parseInt(ageInput.value);
    const maxHRManual = maxHRInput.value ? parseInt(maxHRInput.value) : null;
    const formula = formulaSelect.value;

    // 验证输入
    if (!restHR || restHR < 40 || restHR > 100) {
      showNotice('hrNotice', '请输入有效的静息心率（40-100 bpm）', 'error');
      return;
    }

    if (!age || age < 10 || age > 100) {
      showNotice('hrNotice', '请输入有效的年龄（10-100 岁）', 'error');
      return;
    }

    // 确定最大心率
    let maxHR;
    let source;
    if (maxHRManual) {
      maxHR = maxHRManual;
      source = '实测';
    } else {
      maxHR = calculateMaxHR(age, formula);
      source = '估算';
    }

    // 更新状态
    state.restHR = restHR;
    state.age = age;
    state.maxHR = maxHR;
    state.maxHRFormula = formula;
    state.hasHRData = true;

    // 计算区间
    const zones = calculateHRZones(restHR, maxHR);
    state.hrZones = zones;

    // 更新显示
    document.getElementById('hrRestDisplay').textContent = restHR;
    document.getElementById('hrMaxDisplay').textContent = maxHR;
    document.getElementById('hrReserveDisplay').textContent = maxHR - restHR;
    document.getElementById('hrSourceDisplay').textContent = source;

    // 渲染结果
    renderHRZones(zones);
    document.getElementById('hrResultsCard').style.display = 'block';

    showNotice('hrNotice', '✓ 计算完成！已生成 6 个训练区间。', 'success');

    // 更新 URL
    updateURL({
      restHR,
      age,
      maxHR: maxHRManual || '',
      formula
    });
  });

  // 分享链接
  shareBtn.addEventListener('click', () => {
    copyCurrentURL();
    showNotice('hrNotice', '✓ 分享链接已复制到剪贴板！', 'success');
  });

  // 初始化时触发公式提示
  formulaSelect.dispatchEvent(new Event('change'));
}

// =============================================================================
// 配速课表计算
// =============================================================================

// 间歇训练配置
const INTERVAL_ROWS = [
  { type: '短间歇', distance: '400米', delta: -30, rest: '01:30', reps: '10-30组' },
  { type: '', distance: '800米', delta: -15, rest: '02:30', reps: '6-25组' },
  { type: '', distance: '1000米', delta: -10, rest: '03:00', reps: '5-15组' },
  { type: '长间歇', distance: '2000米', delta: -5, rest: '05:00', reps: '3-10组' },
  { type: '', distance: '3000米', delta: 0, rest: '05:00', reps: '2-9组' },
  { type: '', distance: '5000米', delta: 10, rest: '08:00', reps: '1-8组' },
  { type: '重复跑', distance: '＜400米', delta: null, rest: '充分恢复', reps: '10-30组', paceText: '全力冲刺' }
];

// 匀速跑配置
const STEADY_ROWS = [
  { category: '有氧（上限）', delta: 40, duration: '40-90分钟', race: '5km', raceDelta: -10, raceDistance: 5 },
  { category: '有氧（下限）', delta: 100, duration: '40-90分钟', race: '10km', raceDelta: 0, raceDistance: 10 },
  { category: '节奏（上限）', delta: 5, duration: '30-80分钟', race: '半马', raceDelta: 10, raceDistance: 21.0975 },
  { category: '节奏（下限）', delta: 35, duration: '30-80分钟', race: '全马', raceDelta: 20, raceDistance: 42.195 }
];

// 解析配速字符串 (mm:ss -> 秒)
function parsePace(text) {
  const value = String(text || '').trim();
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (seconds > 59) return null;

  return minutes * 60 + seconds;
}

// 格式化配速 (秒 -> mm:ss)
function formatPace(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`;
}

// 格式化时长 (秒 -> h:mm:ss 或 mm:ss)
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

// 规范化配速输入
function normalizePaceInput(text) {
  const digits = String(text || '').replace(/\D/g, '').slice(0, 4);
  if (!digits) return '';

  if (digits.length <= 2) return digits;

  const minutes = digits.slice(0, digits.length - 2);
  const seconds = digits.slice(-2);
  return `${minutes}:${seconds}`;
}

// 渲染间歇训练表格
function renderIntervalTable(pbSeconds) {
  const tbody = document.getElementById('intervalTableBody');

  tbody.innerHTML = INTERVAL_ROWS.map(row => {
    const pace = row.paceText || formatPace(pbSeconds + row.delta);
    const deltaText = row.delta === null ? '-' : `${row.delta > 0 ? '+' : ''}${row.delta}秒`;
    const typeCell = row.type ? `<span class="badge">${row.type}</span>` : '';

    return `
      <tr>
        <td>${typeCell}</td>
        <td>${row.distance}</td>
        <td class="numeric font-mono">${deltaText}</td>
        <td class="numeric font-mono font-bold text-primary">${pace}</td>
        <td class="numeric font-mono">${row.rest}</td>
        <td class="numeric">${row.reps}</td>
      </tr>
    `;
  }).join('');
}

// 渲染匀速跑表格
function renderSteadyTable(pbSeconds) {
  const tbody = document.getElementById('steadyTableBody');

  tbody.innerHTML = STEADY_ROWS.map(row => {
    const trainingPace = pbSeconds + row.delta;
    const racePace = pbSeconds + row.raceDelta;
    const predictedSeconds = racePace * row.raceDistance;

    return `
      <tr>
        <td><span class="badge">${row.category}</span></td>
        <td class="numeric font-mono font-bold text-primary">${formatPace(trainingPace)}</td>
        <td>${row.duration}</td>
        <td><strong>${row.race}</strong></td>
        <td class="numeric font-mono font-bold">${formatPace(racePace)}</td>
        <td class="numeric font-mono font-bold text-primary">${formatDuration(predictedSeconds)}</td>
      </tr>
    `;
  }).join('');

  // 更新统计卡片
  const row5km = STEADY_ROWS[0];
  const rowHalf = STEADY_ROWS[2];
  const rowFull = STEADY_ROWS[3];

  document.getElementById('pace5kmDisplay').textContent =
    formatDuration((pbSeconds + row5km.raceDelta) * row5km.raceDistance);
  document.getElementById('paceHalfDisplay').textContent =
    formatDuration((pbSeconds + rowHalf.raceDelta) * rowHalf.raceDistance);
  document.getElementById('paceFullDisplay').textContent =
    formatDuration((pbSeconds + rowFull.raceDelta) * rowFull.raceDistance);
}

// 配速计算初始化
function initPaceCalculator() {
  const calcBtn = document.getElementById('calcPaceBtn');
  const shareBtn = document.getElementById('sharePaceBtn');
  const pbPaceInput = document.getElementById('pbPace');
  const pbPaceHint = document.getElementById('pbPaceHint');

  // 输入规范化
  pbPaceInput.addEventListener('input', () => {
    const normalized = normalizePaceInput(pbPaceInput.value);
    if (pbPaceInput.value !== normalized) {
      pbPaceInput.value = normalized;
    }
  });

  // 计算配速课表
  calcBtn.addEventListener('click', () => {
    const raw = pbPaceInput.value.trim();
    const pbSeconds = parsePace(raw);

    if (pbSeconds === null) {
      pbPaceHint.textContent = '请输入有效的 mm:ss 配速格式，例如 03:50；秒数必须在 00-59 之间。';
      pbPaceHint.classList.add('error');
      showNotice('paceNotice', '配速格式错误，请检查输入！', 'error');
      return;
    }

    // 更新状态
    state.pbPace = formatPace(pbSeconds);
    state.hasPaceData = true;
    pbPaceInput.value = state.pbPace;

    // 清除错误提示
    pbPaceHint.textContent = '格式校验通过。当前输入将作为全部训练配速和比赛预测的基准。';
    pbPaceHint.classList.remove('error');

    // 更新统计卡片
    document.getElementById('paceCurrentDisplay').textContent = state.pbPace;

    // 渲染结果
    renderIntervalTable(pbSeconds);
    renderSteadyTable(pbSeconds);

    // 显示结果卡片
    document.getElementById('intervalResultsCard').style.display = 'block';
    document.getElementById('steadyResultsCard').style.display = 'block';

    showNotice('paceNotice', '✓ 计算完成！已生成间歇训练和比赛预测方案。', 'success');

    // 更新 URL
    updateURL({ pbPace: state.pbPace });
  });

  // 分享链接
  shareBtn.addEventListener('click', () => {
    copyCurrentURL();
    showNotice('paceNotice', '✓ 分享链接已复制到剪贴板！', 'success');
  });
}

// =============================================================================
// 智能联动功能
// =============================================================================

// 心率区间 → 配速推荐（基于经验公式）
function estimatePaceFromHR(pbPaceSeconds, hrZone) {
  const paceOffsets = {
    'D': +80,   // 恢复跑：10km PB + 80秒
    'E': +50,   // 有氧耐力：10km PB + 50秒
    'M': +25,   // 马拉松配速：10km PB + 25秒
    'T': +5,    // 乳酸阈值：10km PB + 5秒（接近10km配速）
    'A': -8,    // 有氧动力：10km PB - 8秒（接近5km配速）
    'I': -20    // 无氧能力：10km PB - 20秒（短间歇）
  };

  return pbPaceSeconds + (paceOffsets[hrZone] || 0);
}

// 配速 → 心率区间推荐
function estimateHRZoneFromPace(pbPaceSeconds, currentPace) {
  const delta = currentPace - pbPaceSeconds;

  if (delta >= 60) return 'D';       // 慢很多 → 恢复跑
  if (delta >= 30) return 'E';       // 慢 30-60秒 → 有氧
  if (delta >= 15) return 'M';       // 慢 15-30秒 → 马拉松
  if (delta >= -5) return 'T';       // ±5秒 → 乳酸阈值
  if (delta >= -15) return 'A';      // 快 5-15秒 → 有氧动力
  return 'I';                        // 快超过15秒 → 无氧
}

// 获取置信度（根据训练强度）
function getConfidenceLevel(zoneCode) {
  const confidence = {
    'D': 3, // 中等（恢复跑个体差异较大）
    'E': 4, // 高（有氧区间较稳定）
    'M': 4, // 高（马拉松配速有明确对应）
    'T': 5, // 非常高（乳酸阈值是关键指标）
    'A': 4, // 高（5km配速参考）
    'I': 3  // 中等（无氧区间个体差异大）
  };
  return confidence[zoneCode] || 3;
}

// 生成置信度星级
function getConfidenceStars(level) {
  return '⭐'.repeat(level);
}

// 获取训练说明
function getTrainingNote(zoneCode) {
  const notes = {
    'D': '此配速应感觉非常轻松，可边跑边对话，用于恢复和热身。',
    'E': '此配速应感觉轻松，可持续较长时间，是打基础的核心训练。',
    'M': '此配速接近全马比赛强度，应感觉稍有吃力但可持续。',
    'T': '此配速接近10km比赛强度，是提升乳酸阈值的关键训练，应感觉持续但可控的吃力。',
    'A': '此配速接近5km配速，用于长间歇训练，提升最大摄氧量。',
    'I': '此配速用于短间歇和速度训练，应全力但可重复多组。'
  };
  return notes[zoneCode] || '';
}

// 生成心率配速对照表
function generateCombinedTable() {
  // 检查是否有必要的数据
  if (!state.hasHRData || !state.hasPaceData) {
    return null;
  }

  const pbPaceSeconds = parsePace(state.pbPace);
  if (!pbPaceSeconds) return null;

  return state.hrZones.map(zone => {
    const suggestedPaceSeconds = estimatePaceFromHR(pbPaceSeconds, zone.code);
    const confidence = getConfidenceLevel(zone.code);

    return {
      zone: zone.code,
      zoneName: zone.name,
      hrRange: zone.hrRange,
      hrPercent: zone.intensity,
      suggestedPace: formatPace(suggestedPaceSeconds),
      paceRange: `${formatPace(suggestedPaceSeconds - 5)} - ${formatPace(suggestedPaceSeconds + 5)}`,
      confidence: confidence,
      confidenceStars: getConfidenceStars(confidence),
      note: getTrainingNote(zone.code),
      rq: zone.rq,
      energy: zone.energy
    };
  });
}

// 渲染联动结果
function renderCombinedResults() {
  const combinedTable = generateCombinedTable();

  if (!combinedTable) {
    // 显示提示信息
    const panel = document.getElementById('combined-panel');
    const notice = panel.querySelector('.notice');

    if (!state.hasHRData && !state.hasPaceData) {
      notice.innerHTML = `
        <strong>💡 使用提示：</strong>
        请先在"心率区间"和"配速课表"标签页中分别输入你的参数并计算，
        然后返回此页面查看心率与配速的智能联动分析。
      `;
      notice.className = 'notice notice-warning';
    } else if (!state.hasHRData) {
      notice.innerHTML = `
        <strong>⚠️ 缺少心率数据：</strong>
        请先在"心率区间"标签页中计算你的心率区间。
      `;
      notice.className = 'notice notice-warning';
    } else if (!state.hasPaceData) {
      notice.innerHTML = `
        <strong>⚠️ 缺少配速数据：</strong>
        请先在"配速课表"标签页中计算你的配速方案。
      `;
      notice.className = 'notice notice-warning';
    }

    document.getElementById('combinedResults').style.display = 'none';
    return;
  }

  // 隐藏提示，显示结果
  const panel = document.getElementById('combined-panel');
  panel.querySelector('.notice').style.display = 'none';
  document.getElementById('combinedResults').style.display = 'block';

  // 渲染表格
  const tbody = document.getElementById('combinedTableBody');
  tbody.innerHTML = combinedTable.map(row => `
    <tr>
      <td>
        <span class="badge badge-zone-${row.zone.toLowerCase()}">${row.zone} 区</span>
        <div style="margin-top: 4px; font-size: 13px; color: var(--muted);">${row.zoneName}</div>
      </td>
      <td>
        <div class="font-mono font-bold">${row.hrRange} bpm</div>
        <div style="margin-top: 2px; font-size: 12px; color: var(--muted);">${row.hrPercent}</div>
      </td>
      <td class="numeric">
        <div class="font-mono font-bold text-primary" style="font-size: 16px;">${row.suggestedPace}</div>
        <div style="margin-top: 2px; font-size: 11px; color: var(--muted);">±5秒: ${row.paceRange}</div>
      </td>
      <td>
        <div style="margin-bottom: 4px;">
          <span style="font-size: 16px;">${row.confidenceStars}</span>
          <span style="font-size: 12px; color: var(--muted); margin-left: 4px;">
            ${row.confidence === 5 ? '非常高' : row.confidence === 4 ? '高' : '中等'}
          </span>
        </div>
        <div style="font-size: 12px; color: var(--muted); line-height: 1.5;">
          ${row.note}
        </div>
      </td>
    </tr>
  `).join('');

  // 生成统计摘要
  renderCombinedSummary(combinedTable);
}

// 渲染联动摘要
function renderCombinedSummary(combinedTable) {
  const summaryCard = document.getElementById('combinedSummary');
  if (!summaryCard) return;

  // 找到关键区间
  const tZone = combinedTable.find(z => z.zone === 'T');
  const mZone = combinedTable.find(z => z.zone === 'M');
  const eZone = combinedTable.find(z => z.zone === 'E');

  summaryCard.innerHTML = `
    <h3 class="card-title" style="font-size: 18px; margin-bottom: 16px;">💡 关键训练建议</h3>

    <div style="display: grid; gap: 14px;">
      <div style="padding: 14px; border-radius: 12px; background: var(--panel-soft); border: 1px solid var(--line);">
        <div style="font-size: 13px; color: var(--muted); margin-bottom: 6px;">🎯 乳酸阈值训练（T区）</div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 12px; color: var(--muted);">心率：</span>
            <span class="font-mono font-bold" style="font-size: 16px;">${tZone.hrRange} bpm</span>
          </div>
          <div>
            <span style="font-size: 12px; color: var(--muted);">配速：</span>
            <span class="font-mono font-bold text-primary" style="font-size: 16px;">${tZone.suggestedPace}</span>
          </div>
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: var(--muted); line-height: 1.5;">
          节奏跑核心训练，持续 20-60 分钟，接近 10km 比赛强度。
        </div>
      </div>

      <div style="padding: 14px; border-radius: 12px; background: var(--panel-soft); border: 1px solid var(--line);">
        <div style="font-size: 13px; color: var(--muted); margin-bottom: 6px;">🏃 马拉松配速（M区）</div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 12px; color: var(--muted);">心率：</span>
            <span class="font-mono font-bold" style="font-size: 16px;">${mZone.hrRange} bpm</span>
          </div>
          <div>
            <span style="font-size: 12px; color: var(--muted);">配速：</span>
            <span class="font-mono font-bold text-primary" style="font-size: 16px;">${mZone.suggestedPace}</span>
          </div>
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: var(--muted); line-height: 1.5;">
          全马比赛配速训练，应感觉稍有吃力但可持续。
        </div>
      </div>

      <div style="padding: 14px; border-radius: 12px; background: var(--panel-soft); border: 1px solid var(--line);">
        <div style="font-size: 13px; color: var(--muted); margin-bottom: 6px;">🌱 轻松跑（E区）</div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 12px; color: var(--muted);">心率：</span>
            <span class="font-mono font-bold" style="font-size: 16px;">${eZone.hrRange} bpm</span>
          </div>
          <div>
            <span style="font-size: 12px; color: var(--muted);">配速：</span>
            <span class="font-mono font-bold text-primary" style="font-size: 16px;">${eZone.suggestedPace}</span>
          </div>
        </div>
        <div style="margin-top: 8px; font-size: 12px; color: var(--muted); line-height: 1.5;">
          打基础的核心训练，应感觉轻松，可持续较长时间。
        </div>
      </div>
    </div>
  `;
}

// =============================================================================
// 工具函数
// =============================================================================

// 显示通知
function showNotice(elementId, message, type = 'info') {
  const notice = document.getElementById(elementId);
  notice.textContent = message;
  notice.className = 'notice';

  if (type === 'success') notice.classList.add('notice-success');
  if (type === 'warning') notice.classList.add('notice-warning');
  if (type === 'error') notice.classList.add('notice-error');
}

// 更新 URL 参数
function updateURL(params) {
  const url = new URL(window.location);
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
  });
  window.history.replaceState({}, '', url);
}

// 复制当前 URL
function copyCurrentURL() {
  const url = window.location.href;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
  } else {
    // 降级方案
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
}

// 从 URL 加载参数
function loadFromURL() {
  const params = new URLSearchParams(window.location.search);

  // 加载标签页
  const tab = params.get('tab');
  if (tab && ['hr-zones', 'pace-table', 'combined'].includes(tab)) {
    document.querySelector(`[data-tab="${tab}"]`)?.click();
  }

  // 加载心率参数
  if (params.has('restHR')) {
    document.getElementById('restHR').value = params.get('restHR');
  }
  if (params.has('age')) {
    document.getElementById('age').value = params.get('age');
  }
  if (params.has('maxHR')) {
    document.getElementById('maxHR').value = params.get('maxHR');
  }
  if (params.has('formula')) {
    document.getElementById('maxHrFormula').value = params.get('formula');
  }

  // 加载配速参数
  if (params.has('pbPace')) {
    document.getElementById('pbPace').value = params.get('pbPace');
  }

  // 如果有参数，自动触发计算
  if (params.has('restHR') && params.has('age')) {
    setTimeout(() => document.getElementById('calcHrBtn').click(), 100);
  }
  if (params.has('pbPace')) {
    setTimeout(() => document.getElementById('calcPaceBtn').click(), 100);
  }
}

// =============================================================================
// 初始化
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initHRCalculator();
  initPaceCalculator();
  loadFromURL();

  console.log('🏃 Sylas Training Hub initialized');
});
