/* Glossary links: in every section, the first use of each glossary term gets a dotted underline (English
   and Vietnamese text separately); clicking it opens the definition in the citation window.
   Terms and definitions: window.GLOSS (js/glossary-data.js, written by build/phase1.py). */
(function(){
  var G = window.GLOSS || [];
  if (!G.length) return;
  var byId = {};
  G.forEach(function(g){ byId[g.id] = g; });

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function matcher(lang){
    var map = {}, list = [];
    G.forEach(function(g){ g[lang].match.forEach(function(t){ map[t] = g.id; list.push(t); }); });
    list.sort(function(a, b){ return b.length - a.length; });       // longest first: "data assimilation" before "assimilation"
    var src = list.map(function(t){ return t.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); }).join('|');
    return { re: new RegExp('(?<![\\p{L}\\p{N}_-])(?:' + src + ')(?![\\p{L}\\p{N}_-])', 'gu'), map: map };
  }
  var M = { en: matcher('en'), vi: matcher('vi') };

  var SKIP = 'a, button, h1, h2, h3, h4, table, svg, figure, code, pre, .rfsum, .gterm, .eyebrow, .vibar, .katex, .scrollhint, [data-vi="read_gloss"]';
  function mark(root, lang, used){
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function(n){
        if (!n.data || n.data.length < 2 || /\\\(|\\\)|\$/.test(n.data)) return NodeFilter.FILTER_REJECT;   // leave maths to KaTeX
        var p = n.parentElement;
        return (p && !p.closest(SKIP)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var nodes = [], n;
    while ((n = w.nextNode())) nodes.push(n);
    var m = M[lang];
    nodes.forEach(function(node){
      var hits = [], r;
      m.re.lastIndex = 0;
      while ((r = m.re.exec(node.data))){
        var id = m.map[r[0]];
        if (id && !used[id]){ used[id] = true; hits.push([r.index, r[0], id]); }
      }
      for (var i = hits.length - 1; i >= 0; i--){                   // split from the end so earlier offsets stay valid
        var h = hits[i];
        var rest = node.splitText(h[0]);
        rest.splitText(h[1].length);
        var s = document.createElement('span');
        s.className = 'gterm'; s.setAttribute('role', 'button'); s.tabIndex = 0; s.dataset.g = h[2];
        s.textContent = h[1];
        rest.parentNode.replaceChild(s, rest);
      }
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('.stack > section'), function(sec){
    var usedEn = {}, usedVi = {};
    Array.prototype.forEach.call(sec.querySelectorAll('.card'), function(card){
      if (card.classList.contains('head')) return;
      var en = card.querySelector(':scope > .en'), vi = card.querySelector(':scope > .vi');
      if (en) mark(en, 'en', usedEn);
      else if (!card.hasAttribute('data-vi')) mark(card, 'en', usedEn);
      if (vi) mark(vi, 'vi', usedVi);
    });
  });

  function card(id, vi){
    var g = byId[id], L = vi ? g.vi : g.en;
    var el = document.createElement('div');
    el.className = 'rfsum refcard';
    el.dataset.title = (vi ? 'Thuật ngữ' : 'Glossary') + ' · ' + L.term;
    el.innerHTML = '<p class="rc-title">' + esc(L.term) + '</p><p>' + esc(L.def) + '</p>' +
      '<p class="rc-jour">' + (vi ? 'Mọi thuật ngữ: mục Cách đọc bài tổng quan này.' : 'All terms: How to read this review.') + '</p>';
    el.__vi = vi;
    el.__twin = function(){ return card(id, !vi); };
    return el;
  }
  function open(t){ if (window.__openCard) window.__openCard(card(t.dataset.g, !!t.closest('.vi')), t); }
  document.addEventListener('click', function(e){
    var t = e.target.closest && e.target.closest('.gterm');
    if (!t) return;
    e.preventDefault(); e.stopPropagation(); open(t);
  });
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var t = e.target.closest && e.target.closest('.gterm');
    if (!t) return;
    e.preventDefault(); open(t);
  });
})();
