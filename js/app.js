/* Section navigation, floating table scrollbar, and the table/figure pop-up. */
(function(){
  var sections = Array.prototype.slice.call(document.querySelectorAll('.stack > section'));
  var navlist  = document.getElementById('navlist');
  var search   = document.getElementById('search');
  var rail     = document.getElementById('rail');
  var toggle   = document.getElementById('navToggle');
  var nowLabel = document.getElementById('nowLabel');
  var countEl  = document.getElementById('count');
  var prevFab  = document.getElementById('prevFab');
  var nextFab  = document.getElementById('nextFab');
  var KEY = 'ubd:section';
  var buttons = [];
  var current = 0;

  function isNarrow(){ return window.matchMedia('(max-width: 999px)').matches; }

  sections.forEach(function(sec, i){
    var li = document.createElement('li');
    var b  = document.createElement('button');
    b.type = 'button';
    b.innerHTML = '<span class="n">' + sec.dataset.n + '</span><span class="t">' + sec.dataset.title + '</span>';
    b.addEventListener('click', function(){ show(i, true); });
    li.appendChild(b);
    navlist.appendChild(li);
    buttons.push({ li: li, btn: b, text: (sec.dataset.title + ' ' + sec.textContent).toLowerCase() });
  });

  countEl.textContent = sections.length + ' sections';

  function show(i, userAction){
    if (i < 0 || i >= sections.length) return;
    current = i;
    sections.forEach(function(s, j){ s.hidden = (j !== i); });
    buttons.forEach(function(o, j){ o.btn.setAttribute('aria-current', j === i ? 'true' : 'false'); });
    nowLabel.textContent = sections[i].dataset.title;
    prevFab.disabled = (i === 0);
    nextFab.disabled = (i === sections.length - 1);
    try { localStorage.setItem(KEY, sections[i].id); } catch (e) {}
    if (userAction){
      if (history.replaceState) history.replaceState(null, '', '#' + sections[i].id);
      window.scrollTo({ top: 0, behavior: 'auto' });
      if (isNarrow()) closeRail();
    }
  }

  var railBd = document.createElement('div');
  railBd.className = 'railbd';
  rail.parentNode.insertBefore(railBd, rail);
  function setRail(open){
    rail.classList.toggle('open', open);
    railBd.classList.toggle('on', open);
    document.body.classList.toggle('rail-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function openRail(){ setRail(true); }
  function closeRail(){ if (isNarrow()) setRail(false); }

  toggle.addEventListener('click', function(){ if (rail.classList.contains('open')) closeRail(); else openRail(); });
  railBd.addEventListener('click', closeRail);
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && rail.classList.contains('open')) closeRail(); });

  search.addEventListener('input', function(){
    var q = search.value.trim().toLowerCase();
    var hits = 0;
    buttons.forEach(function(o){
      var match = !q || o.text.indexOf(q) !== -1;
      o.li.hidden = !match;
      if (match) hits++;
    });
    countEl.textContent = q ? (hits + ' of ' + sections.length + ' sections match') : (sections.length + ' sections');
  });

  prevFab.addEventListener('click', function(){ show(current - 1, true); });
  nextFab.addEventListener('click', function(){ show(current + 1, true); });

  document.addEventListener('keydown', function(e){
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (document.body.classList.contains('modal-open')) return;
    if (e.key === 'ArrowLeft')  show(current - 1, true);
    if (e.key === 'ArrowRight') show(current + 1, true);
  });

  function resize(){ if (!isNarrow()) setRail(false); }
  window.addEventListener('resize', resize);

  var startId = (location.hash || '').replace('#','');
  if (!startId){ try { startId = localStorage.getItem(KEY) || ''; } catch (e) { startId = ''; } }
  var startIdx = 0;
  sections.forEach(function(s, i){ if (s.id === startId) startIdx = i; });
  resize();
  show(startIdx, false);
})();

/* Floating horizontal scrollbar: drives whichever table is currently on screen. */
(function(){
  var hbar  = document.getElementById('hbar');
  var track = document.getElementById('htrack');
  var thumb = document.getElementById('hthumb');
  var stack = document.getElementById('stack');
  if (!hbar || !track || !thumb || !stack) return;

  var active = null, lock = false, dragging = false, grabOffset = 0;

  function currentWraps(){
    var sec = document.querySelector('.stack > section:not([hidden])');
    return sec ? Array.prototype.slice.call(sec.querySelectorAll('.tablewrap')) : [];
  }
  function overflows(w){ return (w.scrollWidth - w.clientWidth) > 4; }
  function visibleHeight(el){
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    return Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
  }
  function modalScroller(){
    if (!document.body.classList.contains('modal-open')) return null;
    var m = document.querySelector('.modal:not([hidden])');
    var mb = m && m.querySelector('.modalbody');
    return (mb && mb.querySelector('table')) ? mb : null;
  }
  function pick(){
    var mb = modalScroller();
    if (mb) return (overflows(mb) && visibleHeight(mb) > 48) ? mb : null;
    var best = null, bestH = 0;
    currentWraps().forEach(function(w){
      if (!overflows(w)) return;
      var h = visibleHeight(w);
      if (h > bestH){ bestH = h; best = w; }
    });
    return bestH > 48 ? best : null;
  }
  function render(){
    if (!active){ hbar.classList.remove('on'); return; }
    hbar.classList.add('on');
    var tw = track.clientWidth;
    var span = active.scrollWidth - active.clientWidth;
    var th = Math.max(44, Math.round(tw * (active.clientWidth / active.scrollWidth)));
    var p  = span > 0 ? (active.scrollLeft / span) : 0;
    thumb.style.width = th + 'px';
    thumb.style.left  = Math.round(p * (tw - th)) + 'px';
    track.setAttribute('aria-valuenow', String(Math.round(p * 100)));
  }
  function onWrapScroll(){ if (!lock) render(); }
  function sync(){
    var next = pick();
    if (next !== active){
      if (active) active.removeEventListener('scroll', onWrapScroll);
      active = next;
      if (active) active.addEventListener('scroll', onWrapScroll, { passive: true });
    }
    render();
  }
  function scrollFrom(clientX, offset){
    if (!active) return;
    var r = track.getBoundingClientRect();
    var tw = track.clientWidth, th = thumb.offsetWidth;
    var denom = tw - th;
    var p = denom > 0 ? ((clientX - r.left - offset) / denom) : 0;
    p = Math.min(1, Math.max(0, p));
    lock = true;
    active.scrollLeft = p * (active.scrollWidth - active.clientWidth);
    lock = false;
    render();
  }

  thumb.addEventListener('pointerdown', function(e){
    if (!active) return;
    e.preventDefault();
    dragging = true;
    grabOffset = e.clientX - thumb.getBoundingClientRect().left;
    try { thumb.setPointerCapture(e.pointerId); } catch (err) {}
  });
  thumb.addEventListener('pointermove', function(e){ if (dragging) scrollFrom(e.clientX, grabOffset); });
  function endDrag(e){
    if (!dragging) return;
    dragging = false;
    try { thumb.releasePointerCapture(e.pointerId); } catch (err) {}
  }
  thumb.addEventListener('pointerup', endDrag);
  thumb.addEventListener('pointercancel', endDrag);
  track.addEventListener('pointerdown', function(e){
    if (e.target === thumb || !active) return;
    scrollFrom(e.clientX, thumb.offsetWidth / 2);
  });
  track.addEventListener('keydown', function(e){
    if (!active) return;
    var step = Math.max(90, active.clientWidth * 0.6);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft'){
      e.preventDefault(); e.stopPropagation();
      active.scrollLeft += (e.key === 'ArrowRight' ? step : -step);
      render();
    } else if (e.key === 'Home'){
      e.preventDefault(); e.stopPropagation(); active.scrollLeft = 0; render();
    } else if (e.key === 'End'){
      e.preventDefault(); e.stopPropagation(); active.scrollLeft = active.scrollWidth; render();
    }
  });

  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync, { passive: true });
  if (window.MutationObserver){
    new MutationObserver(sync).observe(stack, { attributes: true, subtree: true, attributeFilter: ['hidden'] });
  }
  setTimeout(sync, 80);
  window.__hbarSync = sync;
})();

/* Click a table to open it full-screen. */
(function(){
  var modal = document.getElementById('modal');
  var bd    = document.getElementById('modalbd');
  var panel = modal ? modal.querySelector('.modalpanel') : null;
  var ttl   = document.getElementById('modalttl');
  var bodyEl= document.getElementById('modalbody');
  var xbtn  = document.getElementById('modalx');
  if (!modal || !bodyEl || !xbtn) return;

  var opener = null;
  var shown  = null;   // the wrap currently cloned into the modal

  var lang = document.createElement('button');
  lang.type = 'button';
  lang.className = 'modallang';
  lang.hidden = true;
  xbtn.parentNode.insertBefore(lang, xbtn);

  function twinOf(wrap){
    var pane = wrap.closest('.en') || wrap.closest('.vi');
    if (!pane || !pane.parentNode) return null;
    var card  = pane.parentNode;
    var other = pane.classList.contains('en') ? card.querySelector('.vi') : card.querySelector('.en');
    if (!other) return null;
    var SEL = '.tablewrap, .mapwrap';
    var mine   = Array.prototype.slice.call(pane.querySelectorAll(SEL));
    var theirs = Array.prototype.slice.call(other.querySelectorAll(SEL));
    var i = mine.indexOf(wrap);
    return (i >= 0 && theirs[i]) ? theirs[i] : null;
  }

  lang.addEventListener('click', function(e){
    e.stopPropagation();
    var t = shown && twinOf(shown);
    if (t) show(t);
  });

  function labelFor(wrap){
    var card = wrap.closest('.card');
    var h = card ? card.querySelector('h2') : null;
    var sec = wrap.closest('section');
    var secTitle = sec ? (sec.dataset.title || '') : '';
    if (h) return secTitle ? (secTitle + ' — ' + h.textContent) : h.textContent;
    return secTitle || 'Table';
  }
  function fit(){
    if (!panel) return;
    panel.style.width = '';
    var inner = bodyEl.firstElementChild;
    if (!inner) return;
    var el = inner.querySelector('table') || inner.querySelector('svg') || inner;
    var w;
    var pad = 34;                                    // .modalbody left + right padding
    var room = window.innerWidth - 32;               // .modal left + right padding
    if (el.tagName === 'TABLE'){
      unfitCols(el);
      // a table stretches to whatever panel it is in, so size the panel from its own min-width
      var mw = parseFloat(getComputedStyle(el).minWidth);
      w = (isFinite(mw) && mw > 0) ? mw : el.scrollWidth;
      // too wide for the window: shrink the columns in proportion so the whole table shows,
      // down to 60% of its designed width (narrower than that, sideways scrolling is kinder than slivers)
      if (w + pad > room){
        var target = Math.max(room - pad, Math.min(w, Math.max(w * 0.6, 640)));
        fitCols(el, target);
        w = target;
      }
    } else {
      w = Math.max(el.getBoundingClientRect().width, el.scrollWidth || 0);
    }
    panel.style.width = Math.min(Math.ceil(w + pad), room) + 'px';
    if (el.tagName !== 'TABLE') return;
    // content can still be wider than the declared min-width; widen the panel if the window allows, else shrink
    var over = bodyEl.scrollWidth - bodyEl.clientWidth;
    if (over > 1){
      if (w + over + pad <= room) panel.style.width = Math.ceil(w + over + pad) + 'px';
      else if (!el.classList.contains('fitcols')){
        var tg = Math.max(room - pad, Math.min(w + over, Math.max((w + over) * 0.6, 640)));
        panel.style.width = '';
        fitCols(el, tg);
        panel.style.width = Math.min(Math.ceil(tg + pad), room) + 'px';
      }
    }
  }
  function unfitCols(t){
    var cg = t.querySelector('colgroup[data-fit]');
    if (cg) cg.remove();
    t.classList.remove('fitcols');
    t.style.width = t.style.minWidth = '';
  }
  function fitCols(t, target){
    var row = t.querySelector('thead tr') || t.querySelector('tr');
    if (!row) return;
    var cells = Array.prototype.slice.call(row.children);
    var ws = cells.map(function(c){ return c.getBoundingClientRect().width; });
    var sum = ws.reduce(function(a, b){ return a + b; }, 0);
    if (!sum) return;
    var cg = document.createElement('colgroup'); cg.setAttribute('data-fit', '');
    cells.forEach(function(c, i){
      var col = document.createElement('col');
      if (c.colSpan > 1) col.span = c.colSpan;
      col.style.width = (ws[i] / sum * 100).toFixed(3) + '%';
      cg.appendChild(col);
    });
    t.insertBefore(cg, t.firstChild);
    t.classList.add('fitcols');
    t.style.width = t.style.minWidth = target + 'px';
  }
  function show(wrap){
    shown = wrap;
    ttl.textContent = labelFor(wrap);
    bodyEl.innerHTML = '';
    bodyEl.appendChild(wrap.cloneNode(true));
    if (!modal.hidden) fit();
    var t = twinOf(wrap);
    lang.hidden = !t;
    if (t) lang.textContent = wrap.closest('.vi') ? 'English' : 'Ti\u1ebfng Vi\u1ec7t';
    bodyEl.scrollLeft = wrap.scrollLeft;
  }
  function open(wrap, trigger){
    opener = trigger || null;
    show(wrap);
    modal.hidden = false;
    fit();
    document.body.classList.add('modal-open');
    if (window.__hbarSync) window.__hbarSync();
    xbtn.focus();
  }
  function close(){
    modal.hidden = true;
    bodyEl.innerHTML = '';
    document.body.classList.remove('modal-open');
    if (window.__hbarSync) window.__hbarSync();
    if (opener && opener.focus) opener.focus();
    opener = null; shown = null; lang.hidden = true;
    if (panel) panel.style.width = '';
  }

  xbtn.addEventListener('click', close);
  bd.addEventListener('click', close);
  window.addEventListener('resize', function(){ if (!modal.hidden) fit(); }, { passive: true });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && !modal.hidden){ e.preventDefault(); close(); }
  });
  if (panel){
    panel.addEventListener('keydown', function(e){
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.stopPropagation();
    });
  }

  function bind(root){
  Array.prototype.forEach.call(root.querySelectorAll('.tablewrap, .mapwrap'), function(wrap){
    if (wrap.__zoomBound) return;
    wrap.__zoomBound = true;
    var sx = 0, sy = 0;
    wrap.addEventListener('pointerdown', function(e){ sx = e.clientX; sy = e.clientY; });
    wrap.addEventListener('click', function(e){
      if (e.target.closest('a, button')) return;
      if (Math.abs(e.clientX - sx) > 6 || Math.abs(e.clientY - sy) > 6) return;
      var sel = window.getSelection();
      if (sel && String(sel).length > 0) return;
      open(wrap, null);
    });
    var hint = wrap.previousElementSibling;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'expandbtn';
    btn.textContent = 'Expand';
    btn.addEventListener('click', function(e){ e.stopPropagation(); open(wrap, btn); });
    if (hint && hint.classList.contains('scrollhint')) hint.appendChild(btn);
    else if (wrap.classList.contains('mapwrap')) {
      var bar = document.createElement('p');
      bar.className = 'scrollhint';
      var lbl = document.createElement('span');
      lbl.innerHTML = '<span class="maplbl wide">Map scrolls sideways \u2192</span>' +
                      '<span class="maplbl narrow">Map shrunk to fit \u00b7 Expand for full size</span>';
      bar.appendChild(lbl); bar.appendChild(btn);
      wrap.parentNode.insertBefore(bar, wrap);
    }
    else wrap.parentNode.insertBefore(btn, wrap);
  });
  }
  bind(document);
  window.__zoomBind = bind;
})();
