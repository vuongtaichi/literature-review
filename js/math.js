/* Renders the inline equations, written as \( ... \), with KaTeX. Runs after vi.js has built the
   Vietnamese panes, so both languages are rendered; pop-ups copy the rendered tables. */
(function(){
  if (!window.renderMathInElement) return;              // KaTeX failed to load: the LaTeX source stays readable
  window.renderMathInElement(document.body, {
    delimiters: [{ left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
    strict: 'ignore'                                     // Vietnamese letters inside \text{}
  });
})();
