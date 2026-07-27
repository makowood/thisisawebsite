(function(){
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas = document.getElementById('rain');
  var ctx = canvas.getContext('2d');
  var glyphs = "アイウエオカキクケコサシスセソ0123456789TERMINUSLACUNAOMPHALOSREDOUBTSENTINEL";
  var fontSize = 15, drops = [], W, H;
  var frameTick = 0, speedDivisor = 2; // higher = slower rain

  function hexToRgb(hex){
    hex = hex.replace('#', '');
    if(hex.length === 3){ hex = hex.split('').map(function(c){ return c + c; }).join(''); }
    var num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  var themeColors = { green: '#39ff6a', bgRgba: 'rgba(6,10,7,0.08)' };
  function computeThemeColors(){
    var cs = getComputedStyle(document.body);
    var green = cs.getPropertyValue('--green').trim();
    var rgb = hexToRgb(cs.getPropertyValue('--bg').trim());
    themeColors = {
      green: green,
      bgRgba: 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',0.08)'
    };
  }
  computeThemeColors();
  document.addEventListener('themechange', computeThemeColors);

  function resize(){
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    var cols = Math.floor(W / fontSize);
    drops = new Array(cols).fill(0).map(function(){ return Math.random() * -50; });
  }
  window.addEventListener('resize', resize);
  resize();

  function drawRain(){
    requestAnimationFrame(drawRain);
    frameTick++;
    if(frameTick % speedDivisor !== 0) return;

    ctx.fillStyle = themeColors.bgRgba;
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = themeColors.green;
    ctx.font = fontSize + 'px monospace';
    for(var i=0;i<drops.length;i++){
      var char = glyphs[Math.floor(Math.random()*glyphs.length)];
      ctx.fillText(char, i*fontSize, drops[i]*fontSize);
      if(drops[i]*fontSize > H && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }
  if(!reduceMotion) requestAnimationFrame(drawRain);

})();
