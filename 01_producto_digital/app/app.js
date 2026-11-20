const WORLD_GEOJSON = 'https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson';
const els = Object.fromEntries(['globeViz','globeStatus','countryPicker','resetView','results','resultsContent','resultsError','resultsTitle','scopeNote','animalList','plantList','toast'].map(id => [id, document.getElementById(id)]));
const regionNames = new Intl.DisplayNames(['es'], { type: 'region' });
const REGION_LABELS = { Africa: 'África', Asia: 'Asia', Europe: 'Europa', 'North America': 'América del Norte', 'South America': 'América del Sur', Oceania: 'Oceanía', Antarctica: 'Antártida' };
let globe;
let countries = [];
let countryByCode = new Map();
let selectedFeature = null;
let toastTimer;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 3000);
}

function getCountryCode(feature) {
  const properties = feature.properties || {};
  return [properties.ISO_A2_EH, properties.ISO_A2, properties.iso_a2]
    .map(code => String(code || '').toUpperCase())
    .find(code => /^[A-Z]{2}$/.test(code)) || '';
}

function countryName(feature) {
  const props = feature.properties || {};
  const original = props.ADMIN || props.name || props.NAME || 'Lugar seleccionado';
  const code = getCountryCode(feature);
  const localized = code ? regionNames.of(code) : '';
  return localized && localized !== code ? localized : original;
}

function countryLabel(row) {
  const localized = regionNames.of(row.iso2);
  return localized && localized !== row.iso2 ? localized : row.name;
}

function drawTexture(features) {
  const canvas = document.createElement('canvas');
  canvas.width = 2048; canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const x = lng => (lng + 180) / 360 * canvas.width;
  const y = lat => (90 - lat) / 180 * canvas.height;
  ctx.fillStyle = '#102e32'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = 'rgba(170, 211, 182, .16)'; ctx.lineWidth = 1;
  for (let lng = -180; lng <= 180; lng += 30) { ctx.beginPath(); ctx.moveTo(x(lng), 0); ctx.lineTo(x(lng), canvas.height); ctx.stroke(); }
  for (let lat = -60; lat <= 60; lat += 30) { ctx.beginPath(); ctx.moveTo(0, y(lat)); ctx.lineTo(canvas.width, y(lat)); ctx.stroke(); }
  const rings = geometry => geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat();
  for (const feature of features) {
    ctx.beginPath();
    for (const ring of rings(feature.geometry)) {
      ring.forEach(([lng, lat], index) => {
        if (index === 0 || Math.abs(lng - ring[index - 1][0]) > 180) ctx.moveTo(x(lng), y(lat));
        else ctx.lineTo(x(lng), y(lat));
      });
      ctx.closePath();
    }
    ctx.fillStyle = '#719876'; ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(205, 232, 181, .36)'; ctx.lineWidth = 1.2; ctx.stroke();
  }
  return canvas.toDataURL('image/png');
}

function renderCountryOptions(countryRows) {
  const valid = countryRows.filter(row => /^[A-Z]{2}$/.test(row.iso2));
  valid.sort((a, b) => countryLabel(a).localeCompare(countryLabel(b), 'es'));
  countryByCode = new Map(valid.map(row => {
    const feature = countries.find(item => getCountryCode(item) === row.iso2) || {
      type: 'Feature',
      properties: { ADMIN: row.name, ISO_A2_EH: row.iso2, CONTINENT: row.region },
      geometry: null
    };
    return [row.iso2, feature];
  }));
  els.countryPicker.innerHTML = '<option value="">Selecciona un país o territorio…</option>' + valid.map(row => `<option value="${escapeHtml(row.iso2)}">${escapeHtml(countryLabel(row))}</option>`).join('');
  els.countryPicker.disabled = false;
}

function renderSpecies(target, taxa) {
  if (!taxa.length) {
    target.innerHTML = '<p class="species-empty">No hay registros disponibles para este grupo en este país.</p>';
    return;
  }
  target.innerHTML = taxa.map((item, index) => `
    <article class="species-card">
      <span class="species-num">${String(index + 1).padStart(2, '0')}</span>
      <div class="species-info">
        <div class="species-common">${escapeHtml(item.common_name || 'Nombre común no registrado')}</div>
        <div class="species-common-label">${item.common_name ? `Nombre común · ${escapeHtml(item.common_language_label || 'idioma no indicado')}` : 'Nombre común'}</div>
        <div class="species-name" lang="la">${escapeHtml(item.scientific_name)}</div>
        <div class="species-scientific">Nombre científico</div>
        <p class="species-description">${Number(item.record_count).toLocaleString('es-MX')} registros de observación asociados a este lugar.</p>
      </div>
    </article>`).join('');
}

let countryRequest = 0;
function countryView(feature) {
  const centroid = window.d3?.geoCentroid ? d3.geoCentroid(feature) : null;
  let lat = centroid?.[1];
  let lng = centroid?.[0];

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    const positions = [];
    const collect = value => {
      if (!Array.isArray(value)) return;
      if (value.length >= 2 && Number.isFinite(value[0]) && Number.isFinite(value[1])) positions.push(value);
      else value.forEach(collect);
    };
    collect(feature.geometry?.coordinates);
    if (positions.length) {
      const sinLng = positions.reduce((sum, point) => sum + Math.sin(point[0] * Math.PI / 180), 0);
      const cosLng = positions.reduce((sum, point) => sum + Math.cos(point[0] * Math.PI / 180), 0);
      lng = Math.atan2(sinLng, cosLng) * 180 / Math.PI;
      lat = positions.reduce((sum, point) => sum + point[1], 0) / positions.length;
    }
  }

  let span = 18;
  if (window.d3?.geoBounds) {
    const [[west, south], [east, north]] = d3.geoBounds(feature);
    const width = east >= west ? east - west : east + 360 - west;
    span = Math.max(width, north - south);
  }
  const altitude = Math.max(0.62, Math.min(1.9, 0.62 + span / 180 * 1.25));
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng, altitude } : null;
}

function focusCountry(feature) {
  selectedFeature = feature;
  if (!globe) return;
  globe.controls().autoRotate = false;
  globe.polygonsData([...countries]);
  const view = feature.geometry ? countryView(feature) : null;
  if (view) globe.pointOfView(view, 1100);
}

async function showCountry(feature, place = '') {
  const code = getCountryCode(feature);
  if (!code) { showToast('No hay datos de país para esta región.'); return; }
  if ([...els.countryPicker.options].some(option => option.value === code)) {
    els.countryPicker.value = code;
  }
  const request = ++countryRequest;
  focusCountry(feature);
  els.resultsContent.hidden = true;
  els.resultsError.hidden = true;
  els.globeStatus.textContent = `Buscando registros de ${place || countryName(feature)}…`;
  try {
    const response = await fetch(`data/country/${encodeURIComponent(code)}.json`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo consultar la base de datos.');
    if (request !== countryRequest) return;
    els.resultsTitle.textContent = place || countryName(feature);
    const region = REGION_LABELS[data.country.region] || data.country.region;
    const updated = new Date(data.country.refreshed_at).toLocaleDateString('es-MX');
    els.scopeNote.textContent = `Región: ${region} · Base actualizada: ${updated}`;
    renderSpecies(els.animalList, data.fauna);
    renderSpecies(els.plantList, data.flora);
    els.resultsContent.hidden = false;
    els.globeStatus.textContent = `${place || countryName(feature)} · ${region}`;
  } catch (error) {
    if (request !== countryRequest) return;
    els.resultsError.textContent = `${error.message} Inicia el servidor del proyecto para consultar la base local.`;
    els.resultsError.hidden = false;
    els.globeStatus.textContent = `No se cargaron datos de ${place || countryName(feature)}`;
  }
}

async function init() {
  if (location.protocol === 'file:') {
    els.globeStatus.textContent = 'Abriendo el prototipo…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    try {
      // Al abrir index.html directamente, aprovecha el servidor si ya está iniciado.
      // Si no está disponible, el aviso guía al usuario al lanzador del proyecto.
      await fetch('http://127.0.0.1:8000/api/health', {
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });
      location.replace(`http://127.0.0.1:8000/${location.hash || '#explorar'}`);
    } catch {
      els.globeStatus.textContent = 'Falta iniciar el servidor';
      els.resultsError.innerHTML = 'Abre <strong>abrir_prototipo.bat</strong> en la carpeta del proyecto para iniciar los datos y mostrar el globo.';
      els.resultsError.hidden = false;
    } finally {
      clearTimeout(timeout);
    }
    return;
  }
  try {
    if (typeof Globe !== 'function') throw new Error('No se cargó la biblioteca del globo. Revisa tu conexión a internet.');
    const response = await fetch(WORLD_GEOJSON);
    if (!response.ok) throw new Error('No se pudieron cargar los países del mapa.');
    const data = await response.json();
    countries = data.features || [];
    const countryResponse = await fetch('data/countries.json');
    if (!countryResponse.ok) throw new Error('No se pudo cargar la lista de países.');
    const countryData = await countryResponse.json();
    renderCountryOptions(countryData.countries || []);
    const host = document.createElement('div'); host.className = 'globe-visual'; els.globeViz.appendChild(host);
    globe = Globe()(host)
      .width(els.globeViz.clientWidth)
      .height(els.globeViz.clientHeight || 520)
      .backgroundColor('rgba(0,0,0,0)')
      .globeImageUrl(drawTexture(countries))
      .showAtmosphere(true)
      .atmosphereColor('#6ea69b')
      .atmosphereAltitude(0.13)
      .polygonsData(countries)
      .polygonAltitude(feature => feature === selectedFeature ? 0.018 : 0.004)
      .polygonCapColor(feature => feature === selectedFeature ? 'rgba(242, 155, 87, .94)' : 'rgba(184, 215, 163, .15)')
      .polygonSideColor(() => 'rgba(20, 55, 48, .45)')
      .polygonStrokeColor(feature => feature === selectedFeature ? 'rgba(255, 190, 124, .98)' : 'rgba(206, 231, 184, .58)')
      .polygonLabel(feature => `<div style="background:#25382d;color:#f5f3ec;padding:8px 10px;border-radius:3px;font:13px 'Nunito',sans-serif">${escapeHtml(countryName(feature))}<br><small>Ver flora y fauna</small></div>`)
      .onPolygonClick((feature, event) => {
        event?.stopPropagation?.();
        showCountry(feature, countryName(feature));
      })
      .onGlobeClick(({ lat, lng }) => {
        const feature = window.d3?.geoContains ? countries.find(item => d3.geoContains(item, [lng, lat])) : null;
        if (feature) showCountry(feature, countryName(feature));
        else showToast('Pulsa un país para consultar sus registros.');
      });
    globe.controls().autoRotate = !selectedFeature;
    globe.controls().autoRotateSpeed = 0.28;
    globe.controls().enableDamping = true;
    if (selectedFeature) focusCountry(selectedFeature);
    else globe.pointOfView({ lat: 15, lng: -25, altitude: 2.15 });
    const resizeObserver = new ResizeObserver(() => {
      if (globe && els.globeViz.clientWidth) globe.width(els.globeViz.clientWidth).height(els.globeViz.clientHeight || 520);
    });
    resizeObserver.observe(els.globeViz);
    els.globeStatus.textContent = 'Selecciona un país';
  } catch (error) {
    els.globeStatus.textContent = 'No se pudo cargar el globo';
    els.resultsError.textContent = `${error.message} Inicia el servidor local para consultar los datos por país.`;
    els.resultsError.hidden = false;
  }
}

els.countryPicker.addEventListener('change', () => {
  if (!els.countryPicker.value) return;
  const feature = countryByCode.get(els.countryPicker.value);
  if (feature) showCountry(feature, countryName(feature));
});

els.resetView.addEventListener('click', () => {
  if (!globe) return;
  selectedFeature = null;
  globe.polygonsData([...countries]);
  globe.controls().autoRotate = true;
  globe.pointOfView({ lat: 15, lng: -25, altitude: 2.15 }, 750);
});
init();
