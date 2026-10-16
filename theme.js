/* phosphor theme. loaded synchronously in <head> on every page so the saved
   theme is applied before first paint (no green flash for amber users).
   external file rather than inline so the CSP can stay script-src 'self'.
   the class lives on <html> because <body> doesn't exist yet at this point. */
(function(){
  "use strict";

  var KEY = 'sentinel.phosphor';
  var root = document.documentElement;

  function load(){
    try { return localStorage.getItem(KEY) === 'amber' ? 'amber' : 'green'; }
    catch(e){ return 'green'; }
  }
  function save(name){
    try { localStorage.setItem(KEY, name); } catch(e){ /* private mode, quota, etc. theme still swaps */ }
  }

  function current(){ return root.classList.contains('theme-amber') ? 'amber' : 'green'; }

  function syncButtons(){
    var name = current();
    var btns = document.querySelectorAll('.theme-toggle');
    for(var i = 0; i < btns.length; i++){
      btns[i].textContent = 'phosphor: ' + name;
      btns[i].setAttribute('aria-pressed', name === 'amber' ? 'true' : 'false');
    }
  }

  function set(name){
    name = name === 'amber' ? 'amber' : 'green';
    root.classList.toggle('theme-amber', name === 'amber');
    save(name);
    syncButtons();
    var ev;
    try { ev = new Event('themechange'); }
    catch(e){ ev = document.createEvent('Event'); ev.initEvent('themechange', false, false); }
    document.dispatchEvent(ev);
    return name;
  }

  function toggle(){ return set(current() === 'amber' ? 'green' : 'amber'); }

  if(load() === 'amber') root.classList.add('theme-amber');

  window.sentinelTheme = { get: current, set: set, toggle: toggle };

  document.addEventListener('DOMContentLoaded', function(){
    syncButtons();
    var btns = document.querySelectorAll('.theme-toggle');
    for(var i = 0; i < btns.length; i++){
      btns[i].addEventListener('click', function(){ toggle(); });
    }
  });
})();
