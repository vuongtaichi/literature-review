/* Adds the Tieng Viet / English toggle to every [data-vi] card, using window.VI. */
(function(){
  var VI = window.VI || {};
  var cards = document.querySelectorAll('[data-vi]');
  Array.prototype.forEach.call(cards, function(card){
    var key = card.getAttribute('data-vi');
    if (!VI[key]) return;
    var en = document.createElement('div');
    en.className = 'en';
    while (card.firstChild) en.appendChild(card.firstChild);
    var vn = document.createElement('div');
    vn.className = 'vi';
    vn.hidden = true;
    vn.lang = 'vi';
    vn.innerHTML = VI[key];
    var bar = document.createElement('div');
    bar.className = 'vibar';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vibtn';
    btn.setAttribute('aria-pressed','false');
    btn.textContent = 'Ti\u1ebfng Vi\u1ec7t';
    btn.addEventListener('click', function(){
      var on = vn.hidden;
      vn.hidden = !on;
      en.hidden = on;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.textContent = on ? 'English' : 'Ti\u1ebfng Vi\u1ec7t';
    });
    bar.appendChild(btn);
    card.appendChild(bar);
    card.appendChild(en);
    card.appendChild(vn);
    if (window.__zoomBind) window.__zoomBind(vn);
  });
})();
