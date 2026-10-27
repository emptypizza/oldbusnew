const numberFormat = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const SVG_NS = 'http://www.w3.org/2000/svg';

// Tabs use the WAI-ARIA keyboard pattern. Every panel remains readable without animation.
function connectTabs(list, onChange) {
  const tabs = $$('[role="tab"]', list);
  const select = (tab, focus = false) => {
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    onChange(tab);
    if (focus) tab.focus();
  };
  list.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab && list.contains(tab) && !tab.disabled) select(tab);
  });
  list.addEventListener('keydown', (event) => {
    const index = tabs.indexOf(event.target);
    if (index < 0) return;
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) {
      event.preventDefault();
      if (!tabs[next].disabled) select(tabs[next], true);
    }
  });
  return { select };
}

function makeText(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function setFigure(element, amount, unit) {
  element.replaceChildren(document.createTextNode(numberFormat.format(amount)), makeText('small', unit));
}

function percent(part, total) {
  return `${(part / total * 100).toFixed(1)}%`;
}

const fleetOrder = ['city', 'intercity', 'rural', 'express'];
const fleetShort = { city: '시내', intercity: '시외', rural: '농어촌', express: '고속' };
const fleetColor = { city: '#e6f0b9', intercity: '#94b8a4', rural: '#e89862', express: '#547f70' };
const scrapOrder = ['commercial', 'noncommercial'];
const scrapShort = { commercial: '사업용', noncommercial: '비사업용' };
const scrapSwatch = { commercial: 'business', noncommercial: 'private' };

let ranges = { used: '800–3,000만 원', scrap: '300–850만 원' };
let priceControls = null;
let fleetSelection = null;
let scrapSelection = null;
let fleetModel = null;
let scrapModel = null;

const routes = {
  drive: {
    kicker: '01 / BACK ON THE ROAD',
    title: '다른 일상에서 시작하는 두 번째 여정.',
    description: '한 운수회사에서 퇴역한 버스도 차량 상태와 용도에 따라 국내에서 다시 쓰일 수 있습니다. 차량을 소유하는 것과 여객운송사업의 자격은 별개입니다.',
    checks: ['이전등록이 가능한 차량인지', '검사·보험과 사용할 용도의 요건', '차량 이력과 정비 상태'],
    source: 'https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=1&cciNo=2&cnpClsNo=3&csmSeq=675&popMenu=ov',
    pathId: 'domestic_used',
    costFields: ['vehicle'],
    costHint: (labels) => `공개된 중고 판매 호가는 ${labels.used}입니다. 차량 매입 칸에 비교할 금액을 적어 보세요.`,
    related: { kind: 'price', price: 'used', label: '중고 판매 호가 보기' },
  },
  export: {
    kicker: '02 / BEYOND THE BORDER',
    title: '국경 너머, 누군가의 일상을 싣다.',
    description: '수입국의 조건을 충족하는 버스는 해외 중고차 시장으로 이어질 수 있습니다. 차령·배출가스 등 현지 규정과 선적 비용, 부품 조달 가능성을 함께 살펴야 합니다.',
    checks: ['계약상 수출이 허용되는 차량인지', '수출말소와 수출 이행 신고 절차', '수입국의 차량 기준과 현지 수요'],
    source: 'https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=3&cciNo=2&cnpClsNo=2&csmSeq=675',
    pathId: 'export',
    costFields: ['vehicle', 'transport'],
    costHint: () => '이 조사에는 수출 가격 사례가 없습니다. 차량 매입과 운반 비용을 나눠 적어 보세요.',
  },
  recycle: {
    kicker: '03 / BACK INTO CIRCULATION',
    title: '한 대의 버스에서, 여러 번의 쓰임으로.',
    description: '재사용할 부품을 회수하고 남은 차체는 적법한 폐차 절차로 처리합니다. 회수 가능한 부품과 금속의 가치뿐 아니라 견인·보관·처리 비용도 함께 고려해야 합니다.',
    checks: ['등록된 자동차해체재활용업체인지', '매입 금액과 견인·말소 비용의 포함 범위', '폐차인수증명서와 말소 완료 확인'],
    source: 'https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=3&cciNo=2&cnpClsNo=1&csmSeq=675',
    pathId: 'dismantling',
    costFields: ['vehicle', 'transport'],
    costHint: (labels) => `공개된 폐차 매입 견적은 ${labels.scrap}입니다. 견인 비용 포함 여부는 확인되지 않았습니다.`,
    related: { kind: 'price', price: 'scrap', label: '폐차 매입 견적 보기' },
  },
  space: {
    kicker: '04 / A PLACE FOR NEW STORIES',
    title: '사람을 태우던 차에서, 머무는 공간으로.',
    description: '전시·교육·휴게 공간이나 카페 등으로 바꾸려면 차량 서류와 설치 장소의 요건부터 확인해야 합니다. 폐차 전용 매각물은 온전한 차체의 재사용이 허용된다고 볼 수 없습니다.',
    checks: ['목적에 맞는 등록·말소 경로와 매각 조건', '부지·건축 관련 요건과 영업 신고', '운반·보수·설치와 유지관리 비용'],
    source: 'https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=3&cciNo=2&cnpClsNo=2&csmSeq=675',
    pathId: 'space_reuse',
    costFields: ['transport', 'renovation', 'utilities', 'site', 'other'],
    costHint: () => '공간으로 쓸 때는 운반, 내부 공사, 전기·급배수, 부지·인허가, 예비비를 따로 더합니다.',
    related: { kind: 'cost', label: '차값 너머의 비용 더하기' },
  },
};

let pathById = new Map();

function renderRouteMeta(route) {
  const meta = $('#route-meta');
  const path = pathById.get(route.pathId);
  meta.replaceChildren();
  if (!path) {
    meta.hidden = true;
    return;
  }
  const buyer = makeText('p', '');
  buyer.append(makeText('span', '주로 이어지는 곳', 'route-meta-label'), document.createTextNode(path.buyer));
  const factors = makeText('div', '');
  factors.append(makeText('span', '값을 가르는 조건', 'route-meta-label'));
  factors.append(makeText('ul', '', 'route-factors'));
  path.valueFactors.forEach((factor) => factors.lastElementChild.append(makeText('li', factor)));
  meta.append(buyer, factors, makeText('p', path.check, 'route-checkline'));
  meta.hidden = false;
}

function renderRelated(route) {
  const link = $('#route-related');
  if (!route.related) {
    link.hidden = true;
    return;
  }
  link.hidden = false;
  link.dataset.kind = route.related.kind;
  if (route.related.price) link.dataset.price = route.related.price;
  else delete link.dataset.price;
  link.href = route.related.kind === 'cost' ? '#cost-tool' : '#prices';
  link.replaceChildren(document.createTextNode(`${route.related.label} `), makeText('span', '→'));
  link.querySelector('span').setAttribute('aria-hidden', 'true');
}

function applyCostHint(route) {
  $$('#cost-form label').forEach((label) => {
    const input = $('input', label);
    label.classList.toggle('is-relevant', route.costFields.includes(input.name));
  });
  const hint = $('#cost-hint');
  hint.hidden = false;
  hint.textContent = route.costHint(ranges);
}

function renderRoute(tab) {
  const route = routes[tab.dataset.route];
  $('#route-panel').setAttribute('aria-labelledby', tab.id);
  $('#route-kicker').textContent = route.kicker;
  $('#route-title').textContent = route.title;
  $('#route-description').textContent = route.description;
  $('#route-checklist').replaceChildren(...route.checks.map((text) => makeText('li', text)));
  $('#route-source').href = route.source;
  renderRouteMeta(route);
  renderRelated(route);
  applyCostHint(route);
}

connectTabs($('.journey-tabs'), renderRoute);

function paintFleet() {
  if (!fleetModel) return;
  const { total, operators, categories } = fleetModel;
  const selected = fleetSelection ? categories.get(fleetSelection) : null;
  $('#fleet-kicker').textContent = selected ? selected.label : '4개 업종 보유 대수';
  setFigure($('#fleet-value'), selected ? selected.vehicles : total, '대');
  $('#fleet-caption').textContent = selected
    ? `${numberFormat.format(selected.operators)}개 업체 · ${percent(selected.vehicles, total)}`
    : `${numberFormat.format(operators)}개 업체`;
  const summary = fleetOrder.map((id) => {
    const category = categories.get(id);
    return `${fleetShort[id]} ${numberFormat.format(category.vehicles)}대`;
  }).join(', ');
  $('#fleet-donut').setAttribute('aria-label', selected
    ? `${selected.label} ${numberFormat.format(selected.vehicles)}대, ${percent(selected.vehicles, total)}, ${numberFormat.format(selected.operators)}개 업체.`
    : `${summary}. 합계 ${numberFormat.format(total)}대.`);
  $$('.donut-arc').forEach((arc) => arc.classList.toggle('is-dim', fleetSelection && arc.dataset.fleet !== fleetSelection));
  $$('#fleet-legend .legend-button').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.fleet === fleetSelection));
  });
}

function renderFleet(fleet) {
  const categories = new Map(fleet.categories.map((category) => [category.id, category]));
  fleetModel = { total: fleet.total, operators: fleet.operators, categories };
  const donut = $('#fleet-donut');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'donut-svg');
  svg.setAttribute('viewBox', '0 0 232 232');
  svg.setAttribute('aria-hidden', 'true');
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('transform', 'rotate(-90 116 116)');
  const radius = 101.5;
  const circumference = 2 * Math.PI * radius;
  let cursor = 0;
  fleetOrder.forEach((id, index) => {
    const category = categories.get(id);
    const circle = document.createElementNS(SVG_NS, 'circle');
    const length = index === fleetOrder.length - 1
      ? circumference - cursor
      : category.vehicles / fleet.total * circumference;
    circle.setAttribute('class', 'donut-arc');
    circle.setAttribute('cx', '116');
    circle.setAttribute('cy', '116');
    circle.setAttribute('r', String(radius));
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', fleetColor[id]);
    circle.setAttribute('stroke-width', '29');
    circle.setAttribute('stroke-dasharray', `${length} ${circumference - length}`);
    circle.setAttribute('stroke-dashoffset', `${-cursor}`);
    circle.dataset.fleet = id;
    circle.addEventListener('click', () => {
      fleetSelection = fleetSelection === id ? null : id;
      paintFleet();
    });
    group.append(circle);
    cursor += length;
  });
  svg.append(group);
  donut.querySelector('.donut-svg')?.remove();
  donut.prepend(svg);
  donut.classList.add('is-ready');
  $('#fleet-legend').replaceChildren(...fleetOrder.map((id) => {
    const category = categories.get(id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'legend-button';
    button.dataset.fleet = id;
    button.setAttribute('aria-pressed', 'false');
    const name = makeText('span', '', 'legend-name');
    const swatch = makeText('i', '', `swatch ${id}`);
    swatch.setAttribute('aria-hidden', 'true');
    name.append(swatch, document.createTextNode(fleetShort[id]));
    const figure = makeText('span', '', 'legend-figure');
    figure.append(
      document.createTextNode(`${numberFormat.format(category.vehicles)} `),
      makeText('small', percent(category.vehicles, fleet.total)),
    );
    button.append(name, figure);
    button.addEventListener('click', () => {
      fleetSelection = fleetSelection === id ? null : id;
      paintFleet();
    });
    return button;
  }));
  paintFleet();
}

function paintScrap() {
  if (!scrapModel) return;
  const { total, categories } = scrapModel;
  const selected = scrapSelection ? categories.get(scrapSelection) : null;
  setFigure($('#scrap-value'), selected ? selected.vehicles : total, '대');
  $('#scrap-subtitle').textContent = selected
    ? `${selected.label} · ${percent(selected.vehicles, total)}`
    : '사업용과 비사업용 승합차를 합한 수치';
  const summary = scrapOrder.map((id) => `${scrapShort[id]} ${numberFormat.format(categories.get(id).vehicles)}대`).join(', ');
  $('#scrap-bar').setAttribute('aria-label', selected
    ? `${selected.label} ${numberFormat.format(selected.vehicles)}대, ${percent(selected.vehicles, total)}.`
    : summary);
  $$('#scrap-bar span').forEach((span) => span.classList.toggle('is-dim', scrapSelection && span.dataset.scrap !== scrapSelection));
  $$('#scrap-legend .legend-button').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.scrap === scrapSelection));
  });
}

function renderScrap(scrappage) {
  const categories = new Map(scrappage.categories.map((category) => [category.id, category]));
  scrapModel = { total: scrappage.total, categories };
  const commercial = categories.get('commercial');
  $('#scrap-bar span[data-scrap="commercial"]').style.width = `${commercial.vehicles / scrappage.total * 100}%`;
  $('#scrap-legend').replaceChildren(...scrapOrder.map((id) => {
    const category = categories.get(id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'legend-button';
    button.dataset.scrap = id;
    button.setAttribute('aria-pressed', 'false');
    const name = makeText('span', '', 'legend-name');
    const swatch = makeText('i', '', `swatch ${scrapSwatch[id]}`);
    swatch.setAttribute('aria-hidden', 'true');
    name.append(swatch, document.createTextNode(scrapShort[id]));
    const figure = makeText('span', '', 'legend-figure');
    figure.append(document.createTextNode(numberFormat.format(category.vehicles)), makeText('small', '대'));
    button.append(name, figure);
    button.addEventListener('click', () => {
      scrapSelection = scrapSelection === id ? null : id;
      paintScrap();
    });
    return button;
  }));
  $$('#scrap-bar span').forEach((span) => {
    span.onclick = () => {
      scrapSelection = scrapSelection === span.dataset.scrap ? null : span.dataset.scrap;
      paintScrap();
    };
  });
  paintScrap();
}

const pricePresentation = {
  scrap: {
    dataId: 'purchase_quotes',
    title: '폐차 매입 견적',
    badge: '민간 업체 공개 사례',
    description: '폐차를 맡기는 차량에 대해 업체가 공개한 매입 견적입니다. 차종과 연식, 엔진에 따라 금액이 달라집니다.',
    count: '선별한 6건 · 동일 업체',
    note: '선별한 공개 사례의 범위이며 시장 평균이나 실제 거래 성사 가격이 아닙니다. 부가세·견인비·말소비 포함 여부는 확인되지 않았습니다.',
  },
  used: {
    dataId: 'used_asking_prices',
    title: '중고 판매 호가',
    badge: '판매자가 제시한 금액',
    description: '판매자가 게시한 차량별 호가입니다. 연식과 주행거리, 등록 상태가 서로 달라 같은 조건의 시세로 비교할 수 없습니다.',
    count: '선별한 5건 · 동일 업체',
    note: '시장 평균이나 실거래가가 아닙니다. 1,150만원 유니버스 럭셔리는 ‘말소차량’으로 표기됐으며 운행·재등록 가능 여부를 별도로 확인해야 합니다. 게시물의 현재 판매 상태와 부가세 포함 여부는 미확인입니다.',
  },
  public: {
    dataId: 'public_reserve_prices',
    title: '공공 매각 예정가',
    badge: '폐차 전용 · 입찰 기준 금액',
    description: '폐차 조건으로 공고된 대당 예정가격입니다. 고성 공고는 4대를 묶어 매각하며, 합계 예정가는 1,052만 6,800원입니다.',
    count: '공고 2건 · 실제 낙찰가 미확인',
    note: '2024년·2026년의 서로 다른 공고 사례입니다. 고성 대당 2,631,700원은 4대 일괄 입찰의 대당 내역이며, 울산 3,100,000원은 부가세 포함입니다. 두 공고 모두 폐차 조건으로 재사용용 매물 가격이 아닙니다.',
  },
};

function priceDetails(key, item, sourceById) {
  if (key === 'scrap') {
    return [
      item.engineLabel ? `엔진 ${item.engineLabel}` : '',
      '부가세·견인·말소 비용 포함 여부는 확인되지 않았습니다.',
    ].filter(Boolean);
  }
  if (key === 'used') {
    const lines = [];
    if (item.seats) lines.push(`${item.seats}인승`);
    if (item.registrationNote) lines.push(item.registrationNote);
    lines.push('부가세 포함 여부와 현재 판매 상태는 확인되지 않았습니다.');
    return lines;
  }
  const lines = [item.condition || '폐차 전용'];
  if (item.vehicles === 4) lines.push(item.lotPriceLabel);
  if (item.vatIncluded === true) lines.push('부가세 포함');
  lines.push('실제 낙찰가는 확인되지 않았습니다.');
  const source = sourceById.get(item.sourceIds?.[0]);
  return { lines, source, seller: item.seller };
}

function closePriceDetails(except) {
  $$('.price-row-toggle').forEach((button) => {
    const open = button === except;
    button.setAttribute('aria-expanded', String(open));
    const detail = document.getElementById(button.getAttribute('aria-controls'));
    if (detail) detail.hidden = !open;
  });
}

function renderPrice(tab, groupById, sourceById) {
  const key = tab.dataset.price;
  const presentation = pricePresentation[key];
  const group = groupById.get(presentation.dataId);
  const min = group.rangeMinKrw / 10000;
  const max = group.rangeMaxKrw / 10000;
  const panel = $('#price-panel');
  panel.setAttribute('aria-labelledby', tab.id);
  panel.dataset.group = key;
  $('#price-type').textContent = presentation.badge;
  $('#price-range').replaceChildren(
    document.createTextNode(numberFormat.format(min)),
    makeText('span', '—'),
    document.createTextNode(numberFormat.format(max)),
    makeText('small', key === 'public' ? '대당 만원' : '만원'),
  );
  $('#price-title').textContent = presentation.title;
  $('#price-description').textContent = presentation.description;
  $('#price-period').textContent = group.periodLabel;
  $('#price-count').textContent = presentation.count;
  $('#price-note').textContent = presentation.note;
  $('#price-original').href = sourceById.get(group.sourceIds[0]).url;
  $('#price-original').firstChild.textContent = key === 'public' ? '울산 공고 확인 ' : '원문에서 확인 ';
  $('#price-axis-max').textContent = `${numberFormat.format(max)}만원`;
  const rows = [...group.items].sort((a, b) => a.amountKrw - b.amountKrw).map((item) => {
    const row = makeText('div', '', 'price-row');
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'price-row-toggle';
    toggle.setAttribute('aria-expanded', 'false');
    const detailId = `price-detail-${item.id}`;
    toggle.setAttribute('aria-controls', detailId);
    const label = makeText('div', '', 'price-row-label');
    label.append(makeText('strong', item.model));
    const year = item.modelYear ? `${item.modelYear}년식` : `연식 ${item.yearMonthLabel}`;
    const date = item.listingDate.replaceAll('-', '.');
    label.append(makeText('span', `${year} · ${date}`));
    if (key === 'used') label.append(makeText('span', `${numberFormat.format(item.mileageKm)}km${item.registrationNote ? ' · 말소차량' : ''}`));
    if (key === 'public') label.append(makeText('span', item.seller + (item.vehicles === 4 ? ' · 4대 일괄' : ' · 부가세 포함')));
    const barArea = makeText('div', '', 'bar-area');
    const bar = makeText('span', '', 'value-bar');
    bar.style.setProperty('--bar', `${item.amountKrw / group.rangeMaxKrw * 100}%`);
    bar.setAttribute('aria-hidden', 'true');
    barArea.append(bar, makeText('strong', numberFormat.format(item.amountKrw / 10000)));
    toggle.append(label, barArea);
    const detail = makeText('div', '', 'price-detail');
    detail.id = detailId;
    detail.hidden = true;
    const details = priceDetails(key, item, sourceById);
    const lines = Array.isArray(details) ? details : details.lines;
    lines.forEach((line) => { if (line) detail.append(makeText('p', line)); });
    if (!Array.isArray(details) && details.source) {
      const sourceLink = document.createElement('a');
      sourceLink.href = details.source.url;
      sourceLink.target = '_blank';
      sourceLink.rel = 'noopener noreferrer';
      sourceLink.textContent = `${details.seller} 공고 원문 ↗`;
      detail.append(sourceLink);
    }
    toggle.addEventListener('click', () => {
      const willOpen = toggle.getAttribute('aria-expanded') !== 'true';
      closePriceDetails(willOpen ? toggle : null);
    });
    row.append(toggle, detail);
    return row;
  });
  $('#price-rows').style.setProperty('--rows', group.items.length);
  $('#price-rows').replaceChildren(...rows);
}

async function loadResearch() {
  try {
    const response = await fetch('content/research-data.json');
    if (!response.ok) throw new Error('Research data unavailable');
    const data = await response.json();
    pathById = new Map(data.dispositionPaths.map((path) => [path.id, path]));
    const sourceById = new Map(data.sources.map((source) => [source.id, source]));
    const groupById = new Map(data.priceGroups.map((group) => [group.id, group]));
    ranges = {
      used: groupById.get('used_asking_prices').rangeLabel,
      scrap: groupById.get('purchase_quotes').rangeLabel,
    };
    renderFleet(data.fleet);
    renderScrap(data.scrappage);
    priceControls = connectTabs($('.price-controls'), (tab) => renderPrice(tab, groupById, sourceById));
    priceControls.select($('.price-controls [aria-selected="true"]'));
    renderRoute($('.journey-tabs [aria-selected="true"]'));
  } catch {
    $$('.price-controls button').forEach((button) => { button.disabled = true; });
    const warning = makeText('p', '다른 가격 사례를 불러오지 못했습니다. 잠시 후 새로고침하거나 아래 조사 데이터에서 전체 사례를 확인해 주세요.', 'no-script');
    warning.setAttribute('role', 'status');
    $('#price-panel').after(warning);
  }
}
loadResearch();

$('#route-related').addEventListener('click', (event) => {
  const link = event.currentTarget;
  if (link.dataset.kind !== 'price' || !priceControls) return;
  event.preventDefault();
  const tab = $(`.price-controls [data-price="${link.dataset.price}"]`);
  if (!tab || tab.disabled) return;
  priceControls.select(tab);
  document.getElementById('prices').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#price-panel').focus();
});

const menuButton = $('.menu-toggle');
const mobileMenu = $('#mobile-menu');
function closeMenu(restoreFocus = false) {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', '메뉴 열기');
  mobileMenu.hidden = true;
  if (restoreFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => {
  const opening = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(opening));
  menuButton.setAttribute('aria-label', opening ? '메뉴 닫기' : '메뉴 열기');
  mobileMenu.hidden = !opening;
});
mobileMenu.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !mobileMenu.hidden) closeMenu(true);
});
window.matchMedia('(min-width: 681px)').addEventListener('change', (event) => {
  if (event.matches) closeMenu();
});

const costForm = $('#cost-form');
const costInputs = $$('input', costForm);
function updateCosts() {
  const invalid = costInputs.some((input) => !input.validity.valid);
  const values = costInputs.map((input) => input.validity.valid && input.value !== '' ? Number(input.value) : 0);
  // Sum integer tenths to avoid floating point artifacts in decimal inputs.
  const total = values.reduce((sum, value) => sum + Math.round(value * 10), 0) / 10;
  $('#cost-total').replaceChildren(document.createTextNode(numberFormat.format(total)), makeText('small', '만원'));
  const hasInputs = costInputs.some((input) => input.value !== '');
  $('#cost-status').textContent = invalid
    ? '각 항목에 0~1,000,000만원을 소수 첫째 자리까지 입력하세요. 잘못된 항목은 합계에서 제외됩니다.'
    : hasInputs ? '입력한 항목의 합계입니다. 미입력 항목은 0원으로 계산합니다.' : '확인한 금액을 입력란에 적어 보세요.';
}
costForm.addEventListener('input', updateCosts);
costForm.addEventListener('submit', (event) => event.preventDefault());
costForm.addEventListener('reset', () => setTimeout(updateCosts, 0));
applyCostHint(routes.drive);

if ('IntersectionObserver' in window) {
  const links = $$('.desktop-nav a');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
  $$('#top, #market, #journey, #prices, #guide').forEach((section) => observer.observe(section));
}
