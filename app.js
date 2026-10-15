'use strict';
/* FrameLab — protótipo educacional independente. Nenhum arquivo é enviado para um servidor. */
const $ = id => document.getElementById(id);
const qsa = selector => Array.from(document.querySelectorAll(selector));
const state = {
  view: 'home', videoFile: null, videoUrl: null, files: [], cues: [], style: 'classic',
  ratio: '9:16', fontSize: 38, fontColor: '#ffffff', position: 'bottom',
  editing: false, toastTimer: null, audioContext: null, audioSource: null
};
const video = $('video');
const videoInput = $('videoInput');
const srtInput = $('srtInput');
function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => $('toast').classList.remove('show'), 4600);
}
function safeText(value) { return String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').slice(0, 160); }
function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00';
  const n = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}
function formatBytes(size) {
  return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(size / 1024)} KB`;
}
function showView(view) {
  if (view === 'studio' && !state.videoFile) toast('Abra um vídeo para usar todas as ferramentas do estúdio.');
  state.view = view;
  qsa('.view').forEach(el => el.classList.toggle('active', el.id === `${view}View`));
  qsa('.nav-item[data-view]').forEach(el => el.classList.toggle('selected', el.dataset.view === view));
  $('pageName').textContent = ({ home: 'Visão geral', projects: 'Meus projetos', studio: 'Estúdio de edição' })[view] || 'Visão geral';
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function showTab(tab) {
  qsa('.tab').forEach(el => el.classList.toggle('selected', el.dataset.tab === tab));
  qsa('.tab-panel').forEach(el => el.classList.toggle('active', el.id === `${tab}Panel`));
}
function chooseVideo() { videoInput.value = ''; videoInput.click(); }
function openTool(tool) {
  showView('studio');
  showTab(({ subtitles: 'text', styles: 'style', formats: 'format' })[tool] || 'text');
}
function updateCaption() {
  let text = $('captionInput').value.trim();
  if (state.cues.length && Number.isFinite(video.currentTime)) {
    const cue = state.cues.find(c => video.currentTime >= c.start && video.currentTime < c.end);
    text = cue ? cue.text : '';
  }
  const overlay = $('captionOverlay');
  overlay.textContent = text;
  overlay.style.display = state.videoFile && text ? 'block' : 'none';
  overlay.className = `caption-overlay style-${state.style}`;
  overlay.dataset.position = state.position;
  overlay.style.fontSize = `${state.fontSize}px`;
  overlay.style.color = state.fontColor;
}
function updateRatio() {
  const ratio = state.ratio === '9:16' ? '9 / 16' : state.ratio === '16:9' ? '16 / 9' : '1 / 1';
  $('videoStage').style.aspectRatio = ratio;
  qsa('[data-ratio]').forEach(el => el.classList.toggle('selected', el.dataset.ratio === state.ratio));
}
function updateControls() {
  const hasVideo = !!state.videoFile;
  ['playBtn', 'timeline', 'muteBtn', 'exportBtn'].forEach(id => { $(id).disabled = !hasVideo || state.editing; });
  $('stagePlaceholder').hidden = hasVideo;
  $('studioTitle').textContent = hasVideo ? 'Vamos deixar perfeito.' : 'Seu estúdio de edição.';
  $('studioDescription').textContent = hasVideo ? safeText(state.videoFile.name) : 'Importe um vídeo para desbloquear as ferramentas.';
  $('fileMeta').textContent = hasVideo ? `${safeText(state.videoFile.name)} • ${formatBytes(state.videoFile.size)}` : 'Nenhum arquivo selecionado';
  $('projectCount').textContent = String(state.files.length);
  $('timeTotal').textContent = formatTime(video.duration);
  $('timeNow').textContent = formatTime(video.currentTime);
  $('timeline').max = Number.isFinite(video.duration) ? Math.max(0.01, video.duration) : 100;
  $('timeline').value = Number.isFinite(video.currentTime) ? video.currentTime : 0;
  $('playBtn').textContent = video.paused ? '▶' : '❚❚';
  $('muteBtn').textContent = video.muted ? '◖×' : '◖))';
  const timelineVisual = $('timelineVisual');
  timelineVisual.classList.toggle('populated', hasVideo);
  timelineVisual.replaceChildren();
  const span = document.createElement('span');
  span.className = hasVideo ? 'clip-label' : 'timeline-empty';
  span.textContent = hasVideo ? `▶ ${safeText(state.videoFile.name)}` : 'Importe um arquivo para visualizar a linha do tempo.';
  timelineVisual.appendChild(span);
  updateCaption();
  renderProjects();
}
async function loadVideo(file) {
  if (!file) return;
  const maybeVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name);
  if (!maybeVideo) return toast('Selecione um arquivo de vídeo MP4, WEBM ou MOV.');
  if (file.size > 1024 * 1024 * 500) return toast('Para este protótipo, use um vídeo de até 500 MB.');
  video.pause();
  if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
  state.videoFile = file;
  state.videoUrl = URL.createObjectURL(file);
  video.src = state.videoUrl;
  video.load();
  state.cues = [];
  srtInput.value = '';
  $('srtState').textContent = '';
  $('clearSrtBtn').hidden = true;
  state.files.unshift({ file, added: new Date() });
  if (state.files.length > 12) state.files.length = 12;
  showView('studio');
  updateControls();
  toast(`Arquivo “${safeText(file.name)}” importado. Edite sua legenda e teste a prévia.`);
}
function renderProjects() {
  const root = $('projectsList'); root.replaceChildren();
  const recent = $('recentProjects'); recent.replaceChildren();
  if (!state.files.length) {
    root.innerHTML = '<div class="projects-empty"><span>▣</span><h2>Nenhum projeto criado</h2><p>Selecione um vídeo para abrir o editor.</p><button class="btn-primary" type="button" id="projectsUploadBtn">Importar vídeo</button></div>';
    $('projectsUploadBtn').addEventListener('click', chooseVideo);
    recent.innerHTML = '<span class="empty-icon">▣</span><span>Nenhum projeto nesta sessão. Vamos criar o primeiro?</span>';
    return;
  }
  state.files.forEach((entry, idx) => {
    const row = document.createElement('button'); row.className = 'project-row'; row.type = 'button';
    const thumb = document.createElement('span'); thumb.className = 'project-thumb'; thumb.textContent = '▶';
    const info = document.createElement('span');
    const b = document.createElement('b'); b.textContent = safeText(entry.file.name);
    const small = document.createElement('small'); small.textContent = `${formatBytes(entry.file.size)} · ${entry.added.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · Nesta sessão`;
    info.append(b, small);
    const arrow = document.createElement('span'); arrow.className = 'project-open'; arrow.textContent = 'Abrir →';
    row.append(thumb, info, arrow);
    row.addEventListener('click', () => {
      if (state.videoFile !== entry.file) loadVideo(entry.file);
      else showView('studio');
    });
    root.appendChild(row);
    if (idx === 0) {
      const icon = document.createElement('span'); icon.className = 'empty-icon'; icon.textContent = '▶';
      const description = document.createElement('span'); description.textContent = `${safeText(entry.file.name)} — clique em “Ver todos” para abrir.`;
      recent.append(icon, description);
    }
  });
}
function parseSrt(input) {
  const groups = input.replace(/^\uFEFF/, '').replace(/\r/g, '').trim().split(/\n\s*\n/);
  const output = [];
  const timePattern = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/;
  const parseTime = part => { const m = part.trim().match(timePattern); return m ? Number(m[1])*3600 + Number(m[2])*60 + Number(m[3]) + Number(m[4].padEnd(3, '0'))/1000 : NaN; };
  for (const group of groups) {
    const lines = group.split('\n');
    const idx = lines.findIndex(line => line.includes('-->'));
    if (idx < 0) continue;
    const [startText, endText] = lines[idx].split('-->');
    const start = parseTime(startText), end = parseTime(endText);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const text = lines.slice(idx + 1).join('\n').replace(/<[^>]*>/g, '').trim();
    if (text) output.push({ start, end, text });
  }
  return output.sort((a, b) => a.start - b.start);
}
function renderSourceFrame(ctx, canvas, currentVideo) {
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#050505'; ctx.fillRect(0, 0, w, h);
  if (currentVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && currentVideo.videoWidth) {
    const scale = Math.min(w / currentVideo.videoWidth, h / currentVideo.videoHeight);
    const dw = currentVideo.videoWidth * scale, dh = currentVideo.videoHeight * scale;
    ctx.drawImage(currentVideo, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }
  let caption = $('captionInput').value.trim();
  if (state.cues.length) {
    const cue = state.cues.find(c => currentVideo.currentTime >= c.start && currentVideo.currentTime < c.end);
    caption = cue?.text ?? '';
  }
  if (!caption) return;
  const fontsize = state.fontSize * h / 460;
  ctx.font = `${state.style === 'minimal' ? '500' : '800'} ${fontsize}px Arial, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const maxwidth = w * .83, lines = [];
  caption.split('\n').forEach(para => {
    let current = '';
    for (const word of para.split(/\s+/)) {
      const possible = current ? current + ' ' + word : word;
      if (ctx.measureText(possible).width > maxwidth && current) { lines.push(current); current = word; }
      else current = possible;
    }
    if (current) lines.push(current);
  });
  const rendered = state.style === 'bold' ? lines.map(t => t.toUpperCase()) : lines;
  const lineHeight = fontsize * 1.24;
  const allHeight = rendered.length * lineHeight;
  const centerY = state.position === 'top' ? h * .13 + allHeight / 2 : state.position === 'center' ? h / 2 : h * .86 - allHeight / 2;
  const firstY = centerY - (rendered.length - 1) * lineHeight / 2;
  ctx.shadowColor = '#000000cc'; ctx.shadowBlur = fontsize * .18;
  if (state.style === 'boxed') {
    const rectWidth = Math.min(w * .91, Math.max(...rendered.map(l => ctx.measureText(l).width)) + fontsize * .48);
    const rectHeight = allHeight + fontsize * .22;
    ctx.shadowBlur = 0; ctx.fillStyle = '#793ad7e8';
    ctx.fillRect((w - rectWidth) / 2, centerY - rectHeight / 2, rectWidth, rectHeight);
  }
  for (let i = 0; i < rendered.length; i++) {
    const y = firstY + i * lineHeight;
    if (state.style === 'bold') { ctx.lineWidth = fontsize * .09; ctx.strokeStyle = '#111'; ctx.strokeText(rendered[i], w / 2, y); }
    ctx.fillStyle = state.fontColor;
    ctx.fillText(rendered[i], w / 2, y);
  }
  ctx.shadowBlur = 0;
}
async function exportVideo() {
  if (!state.videoFile || state.editing) return;
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) {
    return toast('Exportação não suportada neste navegador. Use Chrome ou Edge atualizados.');
  }
  const [width, height] = ({ '9:16': [540, 960], '16:9': [960, 540], '1:1': [720, 720] })[state.ratio];
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=vp8', 'video/webm']
    .find(type => MediaRecorder.isTypeSupported(type));
  if (!mime) return toast('Seu navegador não oferece um codificador WebM compatível.');
  state.editing = true;
  $('exportOverlay').hidden = false;
  $('exportProgress').style.width = '0%'; $('exportPercent').textContent = '0%';
  video.pause(); video.currentTime = 0; video.muted = false;
  updateControls();
  let raf = 0, rec;
  let audioContext = null;
  let chunkParts = [];
  try {
    const stream = canvas.captureStream(30);
    try {
      if (!state.audioContext && (window.AudioContext || window.webkitAudioContext)) {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        state.audioSource = state.audioContext.createMediaElementSource(video);
        state.audioSource.connect(state.audioContext.destination);
      }
      audioContext = state.audioContext;
      if (audioContext && state.audioSource) {
        const destination = audioContext.createMediaStreamDestination();
        state.audioSource.connect(destination);
        for (const track of destination.stream.getAudioTracks()) stream.addTrack(track);
        await audioContext.resume();
      }
    } catch (err) { console.warn('Áudio não disponível nesta exportação:', err); }
    rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
    rec.ondataavailable = event => { if (event.data.size > 0) chunkParts.push(event.data); };
    const complete = new Promise((resolve, reject) => {
      rec.onerror = event => reject(event.error || new Error('Falha na codificação'));
      rec.onstop = resolve;
    });
    const drawLoop = () => {
      renderSourceFrame(ctx, canvas, video);
      const percent = video.duration > 0 ? Math.min(100, Math.round(video.currentTime / video.duration * 100)) : 0;
      $('exportProgress').style.width = `${percent}%`;
      $('exportPercent').textContent = `${percent}%`;
      if (state.editing) raf = requestAnimationFrame(drawLoop);
    };
    drawLoop();
    rec.start(500);
    const ended = new Promise((resolve, reject) => {
      video.addEventListener('ended', resolve, { once: true });
      video.addEventListener('error', () => reject(new Error('Falha na reprodução do vídeo.')), { once: true });
    });
    await video.play();
    await ended;
    renderSourceFrame(ctx, canvas, video);
    if (rec.state !== 'inactive') rec.stop();
    await complete;
    cancelAnimationFrame(raf);
    const file = new Blob(chunkParts, { type: 'video/webm' });
    if (!file.size) throw new Error('O arquivo exportado está vazio.');
    const url = URL.createObjectURL(file);
    const download = document.createElement('a');
    download.href = url;
    download.download = `${state.videoFile.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'framelab'}-editado.webm`;
    document.body.appendChild(download); download.click(); download.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast(`Exportação concluída (${formatBytes(file.size)}). Verifique seus downloads.`);
  } catch (err) {
    if (rec && rec.state !== 'inactive') { try { rec.stop(); } catch { /* noop */ } }
    cancelAnimationFrame(raf);
    console.error(err);
    toast(`Não foi possível exportar: ${err.message}`);
  } finally {
    state.editing = false;
    $('exportOverlay').hidden = true;
    video.pause(); video.currentTime = 0;
    updateControls();
  }
}
function bind() {
  qsa('[data-view]').forEach(el => el.addEventListener('click', () => showView(el.dataset.view)));
  qsa('[data-tool]').forEach(el => el.addEventListener('click', () => openTool(el.dataset.tool)));
  qsa('[data-go]').forEach(el => el.addEventListener('click', () => showView(el.dataset.go)));
  qsa('.tab').forEach(el => el.addEventListener('click', () => showTab(el.dataset.tab)));
  ['newProjectBtn','editCard','captionCard','uploadHomeBtn','projectsNewBtn','studioUploadBtn','replaceVideoBtn','tipBtn'].forEach(id => $(id).addEventListener('click', chooseVideo));
  $('brandBtn').addEventListener('click', () => showView('home'));
  videoInput.addEventListener('change', event => loadVideo(event.target.files?.[0]));
  const drop = $('dropHome');
  ['dragover', 'dragenter'].forEach(event => drop.addEventListener(event, e => { e.preventDefault(); drop.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach(event => drop.addEventListener(event, e => { e.preventDefault(); drop.classList.remove('dragover'); }));
  drop.addEventListener('drop', e => loadVideo(e.dataTransfer.files?.[0]));
  $('playBtn').addEventListener('click', () => { if (video.paused) video.play().catch(err => toast(err.message)); else video.pause(); });
  $('muteBtn').addEventListener('click', () => { video.muted = !video.muted; updateControls(); });
  $('timeline').addEventListener('input', event => { if (state.videoFile) video.currentTime = Number(event.target.value); updateCaption(); $('timeNow').textContent = formatTime(video.currentTime); });
  for (const name of ['loadedmetadata', 'timeupdate', 'play', 'pause', 'ended', 'durationchange']) {
    video.addEventListener(name, () => {
      if (name === 'timeupdate') {
        $('timeNow').textContent = formatTime(video.currentTime);
        if (Number.isFinite(video.duration)) $('timeline').value = video.currentTime;
        updateCaption();
      } else if (name === 'loadedmetadata' || name === 'durationchange') updateControls();
      else $('playBtn').textContent = video.paused ? '▶' : '❚❚';
    });
  }
  video.addEventListener('error', () => { if (state.videoFile) toast('Não foi possível abrir o formato deste vídeo. Tente MP4 H.264 ou WebM.'); });
  $('captionInput').addEventListener('input', updateCaption);
  $('srtButton').addEventListener('click', () => { srtInput.value = ''; srtInput.click(); });
  srtInput.addEventListener('change', async event => {
    const file = event.target.files?.[0]; if (!file) return;
    if (file.size > 3_000_000) return toast('O arquivo SRT ultrapassa o limite de 3 MB.');
    try {
      const captions = parseSrt(await file.text());
      if (!captions.length) return toast('Não foram encontradas legendas com tempos válidos neste SRT.');
      state.cues = captions;
      $('srtState').textContent = `✓ ${captions.length} legendas importadas de ${safeText(file.name)}`;
      $('clearSrtBtn').hidden = false;
      updateCaption(); toast(`${captions.length} legendas sincronizadas carregadas.`);
    } catch (err) { toast(`Falha ao ler o arquivo SRT: ${err.message}`); }
  });
  $('clearSrtBtn').addEventListener('click', () => { state.cues = []; srtInput.value = ''; $('srtState').textContent = ''; $('clearSrtBtn').hidden = true; updateCaption(); });
  qsa('[data-style]').forEach(el => el.addEventListener('click', () => { state.style = el.dataset.style; qsa('[data-style]').forEach(x => x.classList.toggle('selected', x === el)); updateCaption(); }));
  qsa('[data-ratio]').forEach(el => el.addEventListener('click', () => { state.ratio = el.dataset.ratio; updateRatio(); }));
  qsa('[data-position]').forEach(el => el.addEventListener('click', () => { state.position = el.dataset.position; qsa('[data-position]').forEach(x => x.classList.toggle('selected', x === el)); updateCaption(); }));
  $('fontSize').addEventListener('input', e => { state.fontSize = Number(e.target.value); $('fontSizeValue').textContent = `${state.fontSize} px`; updateCaption(); });
  $('fontColor').addEventListener('input', e => { state.fontColor = e.target.value; $('colorValue').textContent = state.fontColor.toUpperCase(); updateCaption(); });
  $('exportBtn').addEventListener('click', exportVideo);
  $('aboutBtn').addEventListener('click', () => $('modalBackdrop').hidden = false);
  for (const id of ['modalClose', 'modalOk']) $(id).addEventListener('click', () => $('modalBackdrop').hidden = true);
  $('modalBackdrop').addEventListener('click', e => { if (e.target === $('modalBackdrop')) $('modalBackdrop').hidden = true; });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') $('modalBackdrop').hidden = true;
    if (e.code === 'Space' && state.view === 'studio' && state.videoFile && !['TEXTAREA','INPUT','BUTTON'].includes(document.activeElement.tagName)) {
      e.preventDefault(); if (video.paused) video.play(); else video.pause();
    }
  });
  updateCaption(); updateRatio(); renderProjects();
}
bind();