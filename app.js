const numberFormat = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 });
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

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
}

const routes = {
  drive: {
    kicker: '01 / BACK ON THE ROAD',
    title: '다른 일상에서 시작하는 두 번째 여정.',
    description: '한 운수회사에서 퇴역한 버스도 차량 상태와 용도에 따라 국내에서 다시 쓰일 수 있습니다. 차량을 소유하는 것과 여객운송사업의 자격은 별개입니다.',
    checks: ['이전등록이 가능한 차량인지', '검사·보험과 사용할 용도의 요건', '차량 이력과 정비 상태'],
    source: 'https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=1&cciNo=2&cnpClsNo=3&csmSeq=675&popMenu=ov',
  },
  export: {
    kicker: '02 / BEYOND THE BORDER',
    title: '국경 너머, 누군가의 일상을 싣다.',
    description: '수입국의 조건을 충족하는 버스는 해외 중고차 시장으로 이어질 수 있습니다. 차령·배출가스 등 현지 규정과 선적 비용, 부품 조달 가능성을 함께 살펴야 합니다.',
    checks: ['계약상 수출이 허용되는 차량인지', '수출말소와 수출 이행 신고 절차', '수입국의 차량 기준과 현지 수요'],
    source: 'https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=3&cciNo=2&cnpClsNo=2&csmSeq=675',
  },
  recycle: {
    kicker: '03 / BACK INTO CIRCULATION',
    title: '한 대의 버스에서, 여러 번의 쓰임으로.',
    description: '재사용할 부품을 회수하고 남은 차체는 적법한 폐차 절차로 처리합니다. 회수 가능한 부품과 금속의 가치뿐 아니라 견인·보관·처리 비용도 함께 고려해야 합니다.',
    checks: ['등록된 자동차해체재활용업체인지', '매입 금액과 견인·말소 비용의 포함 범위', '폐차인수증명서와 말소 완료 확인'],
    source: 'https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=3&cciNo=2&cnpClsNo=1&csmSeq=675',
  },
  space: {
    kicker: '04 / A PLACE FOR NEW STORIES',
    title: '사람을 태우던 차에서, 머무는 공간으로.',
    description: '전시·교육·휴게 공간이나 카페 등으로 바꾸려면 차량 서류와 설치 장소의 요건부터 확인해야 합니다. 폐차 전용 매각물은 온전한 차체의 재사용이 허용된다고 볼 수 없습니다.',
    checks: ['목적에 맞는 등록·말소 경로와 매각 조건', '부지·건축 관련 요건과 영업 신고', '운반·보수·설치와 유지관리 비용'],
    source: 'https://www.easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=3&cciNo=2&cnpClsNo=2&csmSeq=675',
  },
};

connectTabs($('.journey-tabs'), (tab) => {
  const route = routes[tab.dataset.route];
  $('#route-panel').setAttribute('aria-labelledby', tab.id);
  $('#route-kicker').textContent = route.kicker;
  $('#route-title').textContent = route.title;
  $('#route-description').textContent = route.description;
  $('#route-checklist').replaceChildren(...route.checks.map((text) => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
  $('#route-source').href = route.source;
});

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

function makeText(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

async function loadPrices() {
  try {
    const response = await fetch('content/research-data.json');
    if (!response.ok) throw new Error('Research data unavailable');
    const data = await response.json();
    const sourceById = new Map(data.sources.map((source) => [source.id, source]));
    const groupById = new Map(data.priceGroups.map((group) => [group.id, group]));
    connectTabs($('.price-controls'), (tab) => {
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
        const label = makeText('div', '', 'price-row-label');
        const name = makeText('strong', item.model);
        if (key === 'public') {
          const sourceLink = document.createElement('a');
          sourceLink.href = sourceById.get(item.sourceIds[0]).url;
          sourceLink.target = '_blank';
          sourceLink.rel = 'noopener noreferrer';
          sourceLink.setAttribute('aria-label', `${item.seller} ${item.model} 매각 공고 원문`);
          sourceLink.append(name);
          name.append(document.createTextNode(' ↗'));
          label.append(sourceLink);
        } else {
          label.append(name);
        }
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
        row.append(label, barArea);
        return row;
      });
      $('#price-rows').style.setProperty('--rows', group.items.length);
      $('#price-rows').replaceChildren(...rows);
    });
  } catch {
    $$('.price-controls button').forEach((button) => { button.disabled = true; });
    const warning = makeText('p', '다른 가격 사례를 불러오지 못했습니다. 잠시 후 새로고침하거나 아래 조사 데이터에서 전체 사례를 확인해 주세요.', 'no-script');
    warning.setAttribute('role', 'status');
    $('#price-panel').after(warning);
  }
}
loadPrices();

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
