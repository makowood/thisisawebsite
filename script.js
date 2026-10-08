(function(){
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- boot sequence ---------------- */
  var logo = document.getElementById('logo');
  var mainLogoArt =
".-----..-..-..-. .--.   .-. .--.    .--.                       \n" +
"`-. .-': :; :: :: .--'  : :: .--'  : .; :                      \n" +
"  : :  :    :: :`. `.   : :`. `.   :    :                      \n" +
"  : :  : :: :: : _`, :  : : _`, :  : :: :                      \n" +
"  :_;  :_;:_;:_;`.__.'  :_;`.__.'  :_;:_;                      \n" +
"                                                               \n" +
"                                                               \n" +
".-.   .-. .--. .---.  .--. .-..-----. .--.      .---. .-..-..-.\n" +
": :.-.: :: .--': .; :: .--': :`-. .-': .--'     : .--': :: :: :\n" +
": :: :: :: `;  :   .'`. `. : :  : :  : `;       : `;  `.  .': :\n" +
": `' `' ;: :__ : .; : _`, :: :  : :  : :__  _   : :    .' ; : :\n" +
" `.,`.,' `.__.':___.'`.__.':_;  :_;  `.__.': ;  :_;   :_,'  :_;\n" +
"                                           ;'";
  var altLogoArt =
" ____  _____ _   _ _____ ___ _   _ _____ _\n" +
"/ ___|| ____| \\ | |_   _|_ _| \\ | | ____| |\n" +
"\\___ \\|  _| |  \\| | | |  | ||  \\| |  _| | |\n" +
" ___) | |___| |\\  | | |  | || |\\  | |___| |___\n" +
"|____/|_____|_| \\_| |_| |___|_| \\_|_____|_____|";
  logo.textContent = mainLogoArt;

  logo.addEventListener('click', function(e){
    if(e.detail === 3){
      logo.textContent = altLogoArt;
      setTimeout(function(){ logo.textContent = mainLogoArt; }, 1000);
    }
  });

  /* ---------------- splash text ---------------- */
  var splashText = [
    "psst. try sl.",
    "formerly a honeypot. ask me how.",
    "4 OCPUs became 2 and nobody told me.",
    "SSH is tailnet-only now. nice try.",
    "type help. or don't. i'm not your boss.",
    "compiled with love and mild sleep deprivation.",
    "there is no A: drive. there never was.",
    "press any key to continue. (there is no any key.)",
    "my dad built this. be nice. or don't, he can take it.",
    "warning: this site contains puns.",
    "still named sentinel.local. old habits.",
    "config.sys not found. some things never change.",
    "129.146.78.0 and proud of it.",
    "root login disabled. root login declined politely.",
    "caught real hackers once. now it just tells jokes.",
    "uptime measured in vibes, not days.",
    "not a chatbot. worse: a homelab project.",
    "no cookies. no tracking. no ads. just green text.",
    "runs on an oracle free tier and spite.",
    "cowrie retired. this is its sequel.",
    "DNS propagated eventually. so will you.",
    "TLS cert: valid. life choices: pending review.",
    "IT'S NOT A BUG, IT'S A FEATURE. (it might be a bug.)",
    "ping lacuna and pray.",
    "996 bytes free. probably fine.",
    "this splash text changes every reload. riveting, i know.",
    "no capes. no exceptions.",
    "may contain traces of iptables.",
    "hand-typed, badly, at 1am.",
    "ask about the honeypot. seriously, ask.",
    "best viewed in a terminal font and low expectations.",
    "the cake was never here. this is a website.",
    "certified 100% artisanal, handcrafted spaghetti code.",
    "now with fewer honeypots than before!",
    "you are not stuck. you just haven't found /explore yet.",
    "sudo won't save you here.",
    "this message will not self-destruct. budget cuts."
  ];
  var splashEl = document.getElementById('splash');
  if(splashEl){
    splashEl.textContent = splashText[Math.floor(Math.random() * splashText.length)];
  }

  function typeInto(container, text, cls, cb){
    var div = document.createElement('div');
    div.className = 'line' + (cls ? ' ' + cls : '');
    container.appendChild(div);
    if(reduceMotion){ div.textContent = text; cb(); return; }
    var i = 0;
    (function tick(){
      div.textContent = text.slice(0, i);
      i++;
      if(i <= text.length){
        setTimeout(tick, 6 + Math.random()*10);
      } else { cb(); }
    })();
  }

  /* ---------------- shell ---------------- */
  var output = document.getElementById('output');
  var promptline = document.getElementById('promptline');
  var input = document.getElementById('cmdInput');
  var promptLabel = document.getElementById('promptLabel');
  var history = [], historyIdx = -1;
  var mode = 'shell'; // shell | guess | snake | pong | breakout | hack | rm | vim | sl | format | gbadmin
  var guessTarget = null, guessTries = 0;
  var pendingDeleteKey = null;
  var dosMode = false;

  function shellPromptText(){ return dosMode ? 'A:\\>' : 'guest@sentinel:~$'; }

  function print(text, cls){
    var div = document.createElement('div');
    div.className = 'line' + (cls ? ' ' + cls : '');
    div.textContent = text;
    output.appendChild(div);
    window.scrollTo(0, document.body.scrollHeight);
  }
  function printHTML(html, cls){
    var div = document.createElement('div');
    div.className = 'line' + (cls ? ' ' + cls : '');
    div.innerHTML = html;
    output.appendChild(div);
  }

  function startShell(){
    promptLabel.textContent = shellPromptText();
    promptline.style.display = 'flex';
    input.focus();
    print("");
    print("welcome. this is a real homelab, not a template. type help to look around.", "dim");
    print("");
    resetIdleTimer();
  }

  /* ---------------- idle ghost demo ---------------- */
  var idleTimer = null;
  var ghostTyping = false;
  var IDLE_MS = 45000;
  var ghostDemoCount = 0;
  var MAX_GHOST_DEMOS = 3; // after this many unanswered demos, go dormant and stop spamming
  var dormant = false;

  function resetIdleTimer(){
    clearTimeout(idleTimer);
    if(dormant) return;
    idleTimer = setTimeout(maybeGhostDemo, IDLE_MS);
  }

  function wakeFromDormancy(){
    dormant = false;
    ghostDemoCount = 0;
  }

  function maybeGhostDemo(){
    if(reduceMotion || mode !== 'shell'){ resetIdleTimer(); return; }
    ghostDemoCount++;
    if(ghostDemoCount > MAX_GHOST_DEMOS){
      dormant = true; // nobody's watching; stop polling and typing at an empty room
      return;
    }
    var demoCmds = ['fortune', 'fleet'];
    ghostType(demoCmds[Math.floor(Math.random() * demoCmds.length)]);
  }

  function ghostType(cmd){
    ghostTyping = true;
    input.value = '';
    var i = 0;
    (function tick(){
      if(!ghostTyping) return;
      if(i > cmd.length){
        ghostTyping = false;
        printHTML('<span class="dim">guest@sentinel:~$</span> ' + escapeHTML(cmd));
        handleShell(cmd);
        input.value = '';
        resetIdleTimer();
        return;
      }
      input.value = cmd.slice(0, i);
      i++;
      setTimeout(tick, 90 + Math.random() * 60);
    })();
  }

  document.addEventListener('click', function(){
    if(mode !== 'snake' && mode !== 'pong' && mode !== 'breakout') input.focus();
  });

  /* ---------------- fake breach sequence ---------------- */
  var hackLines = [
    ["red", "initiating breach.local :: unauthorized session"],
    ["dim", "spoofing origin ..."],
    ["dim", "routing traffic through 4 hops ..."],
    ["", "scanning subnet 10.20.34.0/24 for live hosts ..."],
    ["dim", "10.20.34.7    ......... closed"],
    ["dim", "10.20.34.12   ......... closed"],
    ["amber", "10.20.34.14   ......... OPEN   [22/tcp   ssh]"],
    ["dim", "10.20.34.15   ......... closed"],
    ["amber", "10.20.34.101  ......... OPEN   [3389/tcp rdp]"],
    ["dim", "10.20.34.118  ......... closed"],
    ["", "attempting credential bruteforce on 10.20.34.14 ..."],
    ["dim", "root:root .................. denied"],
    ["dim", "admin:admin123 ............. denied"],
    ["amber", "root:cowrie_default ........ accepted (?)"],
    ["", "escalating privileges ..."],
    ["dim", "[###.......] 30%"],
    ["dim", "[######....] 60%"],
    ["dim", "[##########] 100%"],
    ["red bold", "root access granted."],
    ["", ""],
    ["white", "...nah."],
    ["dim", "this box used to run cowrie, a honeypot built to eat exactly this script for breakfast."],
    ["dim", "it's retired now, but 'root:cowrie_default' was a nice touch, wasn't it."],
    ["dim", "no ports were harmed. type 'help' if you want to do something real."]
  ];

  var rmLines = [
    ["red bold", "rm: descending into '/' ..."],
    ["red", "WARNING: this will recursively delete EVERYTHING."],
    ["dim", "deleting /boot ..."],
    ["dim", "deleting /etc ..."],
    ["dim", "deleting /home ..."],
    ["dim", "deleting /var ..."],
    ["amber", "self-destruct in 3..."],
    ["amber", "2..."],
    ["amber", "1..."],
    ["red bold", "rm: cannot remove '/': Permission denied"],
    ["", ""],
    ["white", "relax."],
    ["dim", "this box used to be a honeypot. it's seen every 'rm -rf /' there is, and worse."],
    ["dim", "nothing here was ever root you could actually reach."],
    ["dim", "type 'help' if you'd like to do something that doesn't require a system restore."]
  ];

  var formatLines = [
    ["red bold", "Format will erase ALL data on non-removable disk drive C:"],
    ["amber", "Proceed with Format (Y/N)? y"],
    ["dim", "Checking existing disk format."],
    ["dim", "Verifying 65,536K"],
    ["dim", "[####......] 40%"],
    ["dim", "[########..] 80%"],
    ["dim", "[##########] 100%"],
    ["red bold", "Format cannot run on a drive that has never existed."],
    ["", ""],
    ["white", "nice try."],
    ["dim", "there is no drive C: here. there's barely a drive A:."],
    ["dim", "this box survived actual attackers. your format command isn't going to do it."],
    ["dim", "type 'help' if you want to do something that isn't 1993 cosplay."]
  ];

  function runSequence(lines, idx, onDone){
    if(idx >= lines.length){ onDone(); return; }
    var entry = lines[idx];
    typeInto(output, entry[1], entry[0], function(){
      var pause = entry[1] === '' ? 260 : (entry[0] === 'red bold' ? 500 : 45);
      setTimeout(function(){ runSequence(lines, idx+1, onDone); }, pause);
    });
  }

  /* ---------------- sl (steam locomotive) ---------------- */
  function runSL(){
    if(reduceMotion){ print("choo choo. you meant 'ls', didn't you.", "dim"); return; }
    mode = 'sl';
    var rows = [
      "      __",
      "  ___/ o|--=====",
      " |_/ ~\\_|      /",
      " `-(o)-(o)----'"
    ];
    var VW = 50;
    var maxLen = Math.max.apply(null, rows.map(function(r){ return r.length; }));
    var wrap = document.createElement('div');
    var lineDivs = rows.map(function(){
      var d = document.createElement('div');
      d.className = 'line dim';
      wrap.appendChild(d);
      return d;
    });
    output.appendChild(wrap);
    var p = VW;
    (function frame(){
      rows.forEach(function(r, i){
        var full = p >= 0 ? (' '.repeat(p) + r) : r.slice(-p);
        lineDivs[i].textContent = full.slice(0, VW);
      });
      p -= 3;
      if(p > -maxLen){
        setTimeout(frame, 40);
      } else {
        wrap.remove();
        print("choo choo. you meant 'ls', didn't you.", "dim");
        mode = 'shell';
      }
    })();
  }

  var commands = {
    help: function(){
      print("available commands:");
      print("  whoami          who runs this thing");
      print("  neofetch        specs, but for a person");
      print("  fleet           status of the homelab devices");
      print("  theme           swap green / amber phosphor");
      print("  games           list playable games");
      print("  clear           clear the screen");
      print("");
      print("there's more where that came from. good luck.", "dim");
    },
    games: function(){
      print("available games:");
      print("  snake           yes, really");
      print("  pong            you vs. a cpu paddle");
      print("  breakout        break some bricks");
      print("  guess           tiny number-guessing game");
      print("");
      print("type any of these to play.", "dim");
    },
    neofetch: function(){
      printHTML(
        '<pre style="margin:0;font-family:inherit;">' +
        '   ___        <span class="white">michael</span>@<span class="amber">sentinel</span>\n' +
        '  |_  |       ---------------\n' +
        '    | |__     <span class="dim">OS</span>: human, patched irregularly\n' +
        '   _| |__|    <span class="dim">Shell</span>: fish\n' +
        '  |___|       <span class="dim">Editor</span>: vscodium + claude code\n' +
        '              <span class="dim">Focus</span>: cybersecurity, byu-idaho\n' +
        '              <span class="dim">Uptime</span>: 4.0 gpa, several semesters running\n' +
        '              <span class="dim">DE</span>: hyprland (cachyos)\n' +
        '              <span class="dim">Packages</span>: piano, guitar, bass, drums, cardistry\n' +
        '              <span class="dim">Hobby proc</span>: line upon line (etsy)\n' +
        '</pre>'
      );
    },
    resume: function(){
      printHTML('moved up top — see the <a href="resume.html">resume</a> tab.');
    },
    blog: function(){ commands.posts(); },
    posts: function(){
      printHTML('writeups now live with the rest of the work — see the <a href="projects.html">projects</a> tab.');
    },
    now: function(){
      print("currently:");
      print("  - building this site out, command by command");
      print("  - studying for security+");
      print("  - picking the next homelab project worth writing up");
      print("  - slowly turning a fibonacci sequence into a scripture-encoding easter egg");
    },
    theme: function(){
      document.body.classList.toggle('theme-amber');
      document.dispatchEvent(new Event('themechange'));
      print(document.body.classList.contains('theme-amber') ? "phosphor: amber." : "phosphor: green.");
    },
    cowsay: function(msg){
      var text = (msg || "moo.").trim() || "moo.";
      var width = Math.min(Math.max(text.length, 4), 40);
      var words = text.split(' ');
      var lines = [], cur = '';
      words.forEach(function(w){
        if((cur + ' ' + w).trim().length > width){ lines.push(cur.trim()); cur = w; }
        else { cur = (cur + ' ' + w).trim(); }
      });
      if(cur) lines.push(cur.trim());
      var top = ' ' + '_'.repeat(width+2);
      var bottom = ' ' + '-'.repeat(width+2);
      var body = lines.map(function(l, i){
        var pad = l + ' '.repeat(width - l.length);
        var bracket = lines.length === 1 ? ['<', '>'] : (i===0 ? ['/','\\'] : (i===lines.length-1 ? ['\\','/'] : ['|','|']));
        return bracket[0] + ' ' + pad + ' ' + bracket[1];
      }).join('\n');
      var art =
        top + '\n' + body + '\n' + bottom + '\n' +
        '        \\   ^__^\n' +
        '         \\  (oo)\\_______\n' +
        '            (__)\\       )\\/\\\n' +
        '                ||----w |\n' +
        '                ||     ||';
      printHTML('<pre style="margin:0;font-family:inherit;">' + art.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</pre>');
    },
    whoami: function(){
      print("michael");
      print("cybersecurity student. byu-idaho.");
      print("builds and breaks his own infrastructure for fun, mostly on purpose.");
    },
    fleet: function(){
      printHTML('<span class="ok">terminus</span>   — exit node, minecraft server, backup cron');
      printHTML('<span class="ok">lacuna</span>     — pi-hole, dns');
      printHTML('<span class="ok">omphalos</span>   — daily driver, cachyos + hyprland');
      printHTML('<span class="ok">redoubt</span>    — pixel 9, grapheneos');
      printHTML('<span class="ok">sentinel</span>   — this box. oracle cloud. formerly a honeypot.');
      printHTML('<span class="ok">nas</span>        — bulk storage, media server');
      printHTML('<span class="ok">knulli</span>     — retro handheld, emulation station');
    },
    projects: function(){
      printHTML('moved up top — see the <a href="projects.html">projects</a> tab.');
    },
    stack: function(){
      print("caddy, tailscale, wazuh (formerly), grapheneos, cachyos + hyprland,");
      print("pi-hole, rclone + backblaze, bitwarden, fish shell. mostly self-hosted, on purpose.");
    },
    clear: function(){
      output.innerHTML = "";
    },
    guess: function(){
      guessTarget = Math.floor(Math.random()*100)+1;
      guessTries = 0;
      mode = 'guess';
      promptLabel.textContent = 'guess#';
      print("i'm thinking of a number, 1 through 100. type 'exit' to quit.", "amber");
    },
    "guestbook-admin": function(args){
      var key = (args || '').trim();
      if(!key){ print("usage: guestbook-admin <key>", "dim"); return; }
      pendingDeleteKey = key;
      mode = 'gbadmin';
      input.type = 'password';
      promptLabel.textContent = 'admin token:';
      print("enter the admin token to delete '" + key + "'. type 'exit' to cancel.", "amber");
    },
    hack: function(){
      mode = 'hack';
      runSequence(hackLines, 0, function(){ mode = 'shell'; });
    },
    snake: function(){
      startSnake();
    },
    pong: function(){
      startPong();
    },
    breakout: function(){
      startBreakout();
    },
    rm: function(args){
      var normalized = (args || '').trim().replace(/\s+/g, ' ');
      if(normalized === '-rf /' || normalized === '-rf/'){
        mode = 'rm';
        runSequence(rmLines, 0, function(){ mode = 'shell'; });
        return;
      }
      if(!normalized){ print("rm: missing operand", "dim"); return; }
      print("rm: cannot remove '" + normalized.replace(/^-\w+\s*/, '') + "': No such file or directory", "dim");
    },
    ls: function(args){
      var target = (args || '').trim();
      if(target){
        print("ls: cannot access '" + target + "': it's a metaphor, not a filesystem.", "dim");
        return;
      }
      print("regrets/", "dim");
      print("side_projects/           (mostly abandoned)", "dim");
      print("todo.txt                 (never opened)", "dim");
      print("hopes.sh                 (not actually executable)", "dim");
      print("honeypot.log             (permission denied, obviously)", "dim");
    },
    cd: function(args){
      var target = (args || '').trim();
      if(!target || target === '~'){ print("already home. there's nowhere else to go.", "dim"); return; }
      print("cd: " + target + ": No such directory. this isn't that kind of website.", "dim");
    },
    cat: function(args){
      var target = (args || '').trim();
      if(!target){ print("usage: cat <file>", "dim"); return; }
      if(/honeypot/i.test(target)){
        print("cat: " + target + ": decommissioned. cowrie doesn't live here anymore.", "dim");
        return;
      }
      print("cat: " + target + ": No such file or directory (it was never real)", "dim");
    },
    echo: function(args){
      print(args || "");
    },
    pwd: function(){
      print("/home/guest — you are here, metaphorically speaking.", "dim");
    },
    touch: function(args){
      var target = (args || '').trim();
      if(!target){ print("usage: touch <file>", "dim"); return; }
      print("touch: created '" + target + "'. it will never be opened again.", "dim");
    },
    mkdir: function(args){
      var target = (args || '').trim();
      if(!target){ print("usage: mkdir <directory>", "dim"); return; }
      print("mkdir: created '" + target + "'. still empty. much like the gesture.", "dim");
    },
    chmod: function(){
      print("chmod: permissions updated. it changed nothing — everything here was already this permissive.", "dim");
    },
    sl: function(){
      runSL();
    },
    dir: function(){
      print(" Volume in drive A is SENTINEL", "dim");
      print(" Volume Serial Number is 1337-C0DE", "dim");
      print("");
      print(" Directory of A:\\", "white");
      print("");
      print("CONFIG   SYS           128  01-01-80  12:00a", "dim");
      print("AUTOEXEC BAT            64  01-01-80  12:00a", "dim");
      print("HOMELAB      <DIR>          01-01-80  12:00a", "dim");
      print("REGRETS  TXT         1,337  01-01-80  12:00a", "dim");
      print("        3 file(s)      1,529 bytes", "dim");
      print("        1 dir(s)      65,536 bytes free", "dim");
    },
    cls: function(){
      output.innerHTML = "";
    },
    "config.sys": function(){
      print("config.sys not found. some things never change.", "dim");
    },
    "autoexec.bat": function(){
      print("Starting MS-DOS...", "dim");
      print("HIMEM.SYS not found.", "dim");
      print("EMM386 not loaded — EMM386 already installed. (it was never installed.)", "dim");
      print("autoexec.bat: nothing actually happened. this isn't 1993.", "dim");
    },
    format: function(args){
      var normalized = (args || '').trim().toLowerCase().replace(/\s+/g, '');
      if(normalized === 'c:' || normalized === 'c'){
        mode = 'format';
        runSequence(formatLines, 0, function(){ mode = 'shell'; });
        return;
      }
      print("Invalid drive specification", "dim");
    },
    "a:": function(){
      if(dosMode){ print("A:\\> already mounted. type 'c:' to eject.", "dim"); return; }
      dosMode = true;
      promptLabel.textContent = shellPromptText();
      print("");
      print("Microsoft(R) MS-DOS(R) Version 6.22", "white");
      print("switching to drive A:. type 'c:' to return to sentinel.", "dim");
    },
    "c:": function(){
      if(!dosMode){ print("C:\\> already home.", "dim"); return; }
      dosMode = false;
      promptLabel.textContent = shellPromptText();
      print("back on sentinel.local. the floppy is safe.", "dim");
    },
    fortune: function(){
      var fortunes = [
        "there are only two hard problems in computer science: cache invalidation and naming things.",
        "a backup you haven't tested is a rumor, not a backup.",
        "it's not a bug, it's an undocumented feature request from production.",
        "the 's' in iot stands for security.",
        "it's always dns. it was dns this time too.",
        "friends don't let friends run untested migrations on a friday.",
        "every homelab starts with 'i'll just spin up one container' and ends with a rack.",
        "the cloud is just someone else's computer, and today that computer is having a bad day.",
        "99 little bugs in the code. take one down, patch it around — 127 little bugs in the code.",
        "uptime is a lie we tell monitoring dashboards.",
        "there's no place like 127.0.0.1.",
        "sudo make me a sandwich."
      ];
      print(fortunes[Math.floor(Math.random() * fortunes.length)], "amber");
    },
    ping: function(args){
      var name = (args || '').trim().toLowerCase().split(' ')[0];
      var devices = {
        terminus: { ip: "10.20.34.10",  ms: "4.2",  note: "exit node duty and a minecraft server on the same box. shockingly stable." },
        lacuna:   { ip: "10.20.34.11",  ms: "1.1",  note: "pi-hole doing what pi-hole does: blocking ads and judging your dns queries." },
        omphalos: { ip: "10.20.34.12",  ms: "0.3",  note: "daily driver. always awake — closing the lid is a personality flaw." },
        redoubt:  { ip: "10.20.34.101", ms: "38.7", note: "phone's on wifi in another room, also currently pinging you back with notifications." },
        sentinel: { ip: "127.0.0.1",    ms: "0.02", note: "you're pinging the box that's serving you this page. very meta." },
        nas:      { ip: "10.20.34.20",  ms: "6.8",  note: "spinning rust, spinning slowly. give it a second." },
        knulli:   { ip: "10.20.34.150", ms: "12.4", note: "retro handheld, mid save-state. please hold." }
      };
      if(!name){ print("usage: ping <host>", "dim"); return; }
      var d = devices[name];
      if(!d){
        print("ping: cannot resolve " + args.trim() + ": Unknown host", "dim");
        return;
      }
      print("PING " + name + ".local (" + d.ip + "): 56 data bytes");
      print("64 bytes from " + d.ip + ": icmp_seq=0 ttl=64 time=" + d.ms + " ms");
      print("--- " + name + ".local ping statistics ---");
      print("1 packets transmitted, 1 packets received, 0% packet loss");
      print(d.note, "dim");
    },
    vim: function(){
      mode = 'vim';
      promptLabel.textContent = '';
      for(var i=0; i<10; i++){ print("~", "dim"); }
      print('"resume.txt" [New]', "dim");
    },
    coffee: function(){
      printHTML(
        '<pre style="margin:0;font-family:inherit;">' +
        '    ( (\n' +
        '     ) )\n' +
        '    ______\n' +
        '   |      |]\n' +
        '   |      |\n' +
        '    \\____/\n' +
        '</pre>'
      );
      print("HTTP 418: I'm a teapot.", "amber");
      print("(this is a mug, technically. rfc 2324 never said it had to be accurate.)", "dim");
    },
    date: function(){
      print("the mainframe stirs. it always knows what time it is.", "red");
      var now = new Date();
      print(now.toLocaleString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }), "white");
    },
    weather: function(){
      print("REXBURG, ID — current conditions", "white");
      print("  temp: 19°F (feels like personal failure)", "dim");
      print("  wind: 22 mph, direction: straight through your jacket", "dim");
      print("  sky: overcast, with a chance of more overcast", "dim");
      print("");
      print("you should've worn a coat.", "amber");
    },
    man: function(args){
      var manPages = {
        help:     { name: "list available shell commands", synopsis: "help", desc: "Displays a list of commands this shell claims to support. Coverage is voluntary." },
        whoami:   { name: "print the current user", synopsis: "whoami", desc: "Prints the identity of the user. Assumes the user is Michael. This assumption has never been wrong." },
        neofetch: { name: "display system information for a human", synopsis: "neofetch", desc: "Prints specs for a biological host instead of a machine. Uptime is measured in gpa." },
        fleet:    { name: "report homelab device status", synopsis: "fleet", desc: "Lists every device in the homelab and its status. All statuses are self-reported." },
        stack:    { name: "list the software stack", synopsis: "stack", desc: "Lists the tools this site and its infrastructure depend on. Self-hosted, on purpose." },
        now:      { name: "print current focus", synopsis: "now", desc: "Prints whatever the operator is presently supposed to be working on." },
        theme:    { name: "toggle terminal phosphor color", synopsis: "theme", desc: "Swaps the display between green and amber phosphor. Has no effect on mood." },
        games:    { name: "list playable games", synopsis: "games", desc: "Lists the games this shell supports. Playing them is optional, but encouraged." },
        "guestbook-admin": { name: "delete a guestbook entry", synopsis: "guestbook-admin <key>", desc: "Prompts for an admin token and deletes KEY from the guestbook if it matches. Wrong token, no delete." },
        cowsay:   { name: "print a message from a cow", synopsis: "cowsay [message]", desc: "Prints MESSAGE inside the mouth of an ascii cow. Defaults to \"moo.\" if MESSAGE is omitted." },
        guess:    { name: "play a number-guessing game", synopsis: "guess", desc: "Starts a number-guessing game between 1 and 100. No prize is awarded on completion." },
        snake:    { name: "play snake", synopsis: "snake", desc: "Launches a canvas-based game of snake. Controlled with arrow keys." },
        pong:     { name: "play pong against the house", synopsis: "pong", desc: "Launches pong. Up/down or w/s move your paddle. The cpu paddle is beatable, statistically." },
        breakout: { name: "break some bricks", synopsis: "breakout", desc: "Launches breakout. Left/right or a/d move the paddle. Bricks do not respawn, mercifully." },
        hack:     { name: "simulate an unauthorized breach", synopsis: "hack", desc: "Simulates a break-in for entertainment. No system was harmed, entered, or impressed." },
        fortune:  { name: "print sysadmin wisdom", synopsis: "fortune", desc: "Prints one line of unsolicited sysadmin wisdom, chosen at random." },
        ping:     { name: "send a fake echo request", synopsis: "ping <host>", desc: "Sends a fake icmp echo request to HOST. Response time and honesty are both editorialized." },
        rm:       { name: "remove files recursively", synopsis: "rm -rf /", desc: "Attempts to recursively remove the root filesystem. Historically unsuccessful." },
        vim:      { name: "edit a file, allegedly", synopsis: "vim", desc: "Opens a modal text editor. An exit is rumored to exist." },
        coffee:   { name: "attempt to brew coffee", synopsis: "coffee", desc: "Attempts to brew coffee via http, per rfc 2324. Fails as specified." },
        date:     { name: "print the current date and time", synopsis: "date", desc: "Reports the current date and time, with unnecessary editorializing." },
        weather:  { name: "print the local forecast", synopsis: "weather", desc: "Reports the weather in Rexburg, ID. It is, statistically, cold." },
        sudo:     { name: "execute a command as root", synopsis: "sudo <command>", desc: "Attempts to run COMMAND as root. Permission is not, and will not be, granted." },
        man:      { name: "print the manual for a command", synopsis: "man <command>", desc: "Prints documentation for COMMAND that, statistically, no one asked for." },
        ls:       { name: "list directory contents", synopsis: "ls", desc: "Lists files in the current directory. All of them are metaphors." },
        cd:       { name: "change directory", synopsis: "cd <directory>", desc: "Attempts to change the working directory. There is nowhere else to go." },
        cat:      { name: "concatenate and print files", synopsis: "cat <file>", desc: "Prints the contents of FILE. FILE does not exist. Nothing here does." },
        echo:     { name: "print a line of text", synopsis: "echo [text]", desc: "Prints TEXT back at you. The one command here that actually works as advertised." },
        pwd:      { name: "print working directory", synopsis: "pwd", desc: "Prints the current directory. Existentially speaking, also the only one." },
        touch:    { name: "create an empty file", synopsis: "touch <file>", desc: "Creates FILE. FILE will never be opened again." },
        mkdir:    { name: "create a directory", synopsis: "mkdir <directory>", desc: "Creates DIRECTORY. It will remain empty, much like the gesture." },
        chmod:    { name: "change file permissions", synopsis: "chmod <mode> <file>", desc: "Changes permissions on FILE. Changes nothing else, since nothing was real to begin with." },
        sl:       { name: "steam locomotive", synopsis: "sl", desc: "Cures you of typing 'sl' when you meant 'ls'. Does not actually cure anything." },
        dir:      { name: "list directory contents, DOS-style", synopsis: "dir", desc: "Lists the contents of drive A: in glorious 8.3 filename format." },
        cls:      { name: "clear screen, DOS-style", synopsis: "cls", desc: "Clears the screen. Identical to 'clear', but with more nostalgia." },
        format:   { name: "format a disk", synopsis: "format c:", desc: "Attempts to format drive C:. Drive C: does not exist here. Neither does 1993." },
        "a:":     { name: "switch to drive A:", synopsis: "a:", desc: "Mounts the floppy and swaps the prompt to DOS-style. Type 'c:' to come back." },
        "c:":     { name: "switch to drive C:", synopsis: "c:", desc: "Returns from drive A: to the regular shell prompt." },
        "config.sys":   { name: "boot configuration file", synopsis: "config.sys", desc: "Does not exist. Never did. Some things never change." },
        "autoexec.bat":{ name: "startup batch file", synopsis: "autoexec.bat", desc: "Attempts to boot MS-DOS. This isn't 1993, so it doesn't." }
      };
      var name = (args || '').trim().toLowerCase().split(' ')[0];
      if(!name){ print("What manual page do you want?", "dim"); return; }
      var entry = manPages[name];
      if(!entry){ print("No manual entry for " + name, "dim"); return; }
      var header = name.toUpperCase() + "(1)";
      print(header + "                    Sentinel Manual                    " + header, "dim");
      print("");
      print("NAME", "amber");
      print("    " + name + " - " + entry.name);
      print("");
      print("SYNOPSIS", "amber");
      print("    " + entry.synopsis);
      print("");
      print("DESCRIPTION", "amber");
      print("    " + entry.desc);
      print("");
    }
  };

  function handleShell(raw){
    var trimmed = raw.trim();
    if(trimmed === ''){ return; }
    if(trimmed.toLowerCase().indexOf('sudo') === 0){
      var sudoRest = trimmed.slice(4).trim().toLowerCase().replace(/\s+/g, ' ');
      if(sudoRest === 'rm honeypot'){
        print("already done. see: my entire personality.", "amber");
        return;
      }
      print("Permission denied: nice try.", "red");
      return;
    }
    var spaceIdx = trimmed.indexOf(' ');
    var cmd = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toLowerCase();
    var args = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1);
    if(commands[cmd]){ commands[cmd](args); }
    else { print("Bad command or file name", "dim"); }
  }

  function handleGuess(raw){
    var v = raw.trim().toLowerCase();
    if(v === 'exit'){
      mode = 'shell'; promptLabel.textContent = shellPromptText();
      print("bailed out. the number was " + guessTarget + ".", "dim");
      return;
    }
    var n = parseInt(v, 10);
    if(isNaN(n)){ print("numbers only. or 'exit'.", "dim"); return; }
    guessTries++;
    if(n === guessTarget){
      print("got it in " + guessTries + " guesses. nicely done.", "ok");
      mode = 'shell'; promptLabel.textContent = shellPromptText();
    } else if(n < guessTarget){
      print("higher.", "amber");
    } else {
      print("lower.", "amber");
    }
  }

  function handleGbAdmin(raw){
    var v = raw.trim();
    var key = pendingDeleteKey;
    pendingDeleteKey = null;
    mode = 'shell';
    input.type = 'text';
    promptLabel.textContent = shellPromptText();

    if(v.toLowerCase() === 'exit' || !v){
      print("cancelled.", "dim");
      return;
    }

    try{
      fetch('/api/guestbook/' + encodeURIComponent(key), {
        method: 'DELETE',
        headers: { 'X-Admin-Token': v }
      })
        .then(function(res){
          return res.json().then(function(body){ return { ok: res.ok, body: body }; });
        })
        .then(function(result){
          if(result.ok){ print("deleted '" + key + "'.", "ok"); }
          else { print((result.body && result.body.message) || "delete failed.", "red"); }
        })
        .catch(function(){
          print("couldn't reach the guestbook api.", "red");
        });
    } catch(e){
      print("couldn't reach the guestbook api.", "red");
    }
  }

  function handleVim(raw){
    var v = raw.trim();
    if(v === ':q' || v === ':wq' || v === ':q!'){
      mode = 'shell';
      promptLabel.textContent = shellPromptText();
      print(":wq", "dim");
      print("no changes were made. there was nothing to change. there is never anything to change.", "dim");
    }
    // anything else: stuck. nothing happens.
  }

  input.addEventListener('keydown', function(e){
    wakeFromDormancy();
    resetIdleTimer();
    if(ghostTyping){ ghostTyping = false; input.value = ''; }
    if(e.key === 'Enter'){
      var val = input.value;
      if(mode === 'shell'){
        printHTML('<span class="dim">' + escapeHTML(promptLabel.textContent) + '</span> ' + escapeHTML(val));
        if(val.trim() !== ''){ history.push(val); }
        historyIdx = history.length;
        handleShell(val);
      } else if(mode === 'guess'){
        printHTML('<span class="dim">guess#</span> ' + escapeHTML(val));
        handleGuess(val);
      } else if(mode === 'vim'){
        handleVim(val);
      } else if(mode === 'gbadmin'){
        printHTML('<span class="dim">admin token:</span> ' + '*'.repeat(val.length));
        handleGbAdmin(val);
      }
      input.value = '';
    } else if(e.key === 'ArrowUp'){
      if(history.length){
        historyIdx = Math.max(0, historyIdx-1);
        input.value = history[historyIdx] || '';
        e.preventDefault();
      }
    } else if(e.key === 'ArrowDown'){
      if(history.length){
        historyIdx = Math.min(history.length, historyIdx+1);
        input.value = history[historyIdx] || '';
        e.preventDefault();
      }
    }
  });

  function escapeHTML(s){
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ---------------- arcade (snake / pong / breakout share one canvas) ---------------- */
  var arcadeWrap, arcadeCanvas, arcadeCtx, arcadeScoreEl;
  var snakeLoop, snakeState;
  var pongLoop, pongState;
  var breakoutLoop, breakoutState;
  var heldKeys = {};

  function ensureArcade(){
    if(arcadeWrap) return;
    arcadeWrap = document.createElement('div');
    arcadeWrap.id = 'arcadeWrap';
    arcadeCanvas = document.createElement('canvas');
    arcadeCanvas.id = 'arcadeCanvas';
    arcadeCanvas.width = 300; arcadeCanvas.height = 300;
    arcadeCanvas.tabIndex = 0;
    arcadeWrap.appendChild(arcadeCanvas);
    arcadeScoreEl = document.createElement('div');
    arcadeScoreEl.className = 'line dim';
    arcadeScoreEl.id = 'arcadeScore';
    arcadeScoreEl.textContent = 'score: 0';
    arcadeWrap.appendChild(arcadeScoreEl);
    output.appendChild(arcadeWrap);
    arcadeCtx = arcadeCanvas.getContext('2d');
  }

  function stopAllArcadeLoops(){
    clearInterval(snakeLoop);
    clearInterval(pongLoop);
    clearInterval(breakoutLoop);
  }

  function exitArcade(msg){
    mode = 'shell';
    stopAllArcadeLoops();
    heldKeys = {};
    if(arcadeWrap) arcadeWrap.style.display = 'none';
    print(msg, "dim");
    input.focus();
  }

  /* ---- snake ---- */
  function startSnake(){
    mode = 'snake';
    print("arrow keys to move, esc to quit. good luck.", "amber");
    ensureArcade();
    stopAllArcadeLoops();
    arcadeWrap.style.display = 'flex';
    arcadeCanvas.focus();
    resetSnake();
    snakeLoop = setInterval(stepSnake, 110);
  }

  function resetSnake(){
    snakeState = {
      cell: 15,
      cols: 20, rows: 20,
      snake: [{x:10,y:10},{x:9,y:10},{x:8,y:10}],
      dir: {x:1,y:0}, nextDir: {x:1,y:0},
      food: randomFood([{x:10,y:10},{x:9,y:10},{x:8,y:10}]),
      score: 0, dead: false
    };
    arcadeScoreEl.textContent = 'score: 0';
    drawSnake();
  }

  function randomFood(occupied){
    var f;
    do{
      f = { x: Math.floor(Math.random()*20), y: Math.floor(Math.random()*20) };
    } while(occupied.some(function(s){ return s.x===f.x && s.y===f.y; }));
    return f;
  }

  function stepSnake(){
    if(!snakeState || snakeState.dead) return;
    snakeState.dir = snakeState.nextDir;
    var head = { x: snakeState.snake[0].x + snakeState.dir.x, y: snakeState.snake[0].y + snakeState.dir.y };

    if(head.x < 0 || head.y < 0 || head.x >= snakeState.cols || head.y >= snakeState.rows ||
       snakeState.snake.some(function(s){ return s.x===head.x && s.y===head.y; })){
      snakeState.dead = true;
      arcadeScoreEl.textContent = 'score: ' + snakeState.score + ' — you crashed. press enter to retry, esc to quit.';
      clearInterval(snakeLoop);
      drawSnake();
      return;
    }

    snakeState.snake.unshift(head);
    if(head.x === snakeState.food.x && head.y === snakeState.food.y){
      snakeState.score++;
      snakeState.food = randomFood(snakeState.snake);
      arcadeScoreEl.textContent = 'score: ' + snakeState.score;
    } else {
      snakeState.snake.pop();
    }
    drawSnake();
  }

  function drawSnake(){
    var c = snakeState.cell;
    arcadeCtx.fillStyle = '#030503';
    arcadeCtx.fillRect(0,0,arcadeCanvas.width, arcadeCanvas.height);
    arcadeCtx.fillStyle = '#ffb300';
    arcadeCtx.fillRect(snakeState.food.x*c, snakeState.food.y*c, c-1, c-1);
    arcadeCtx.fillStyle = '#39ff6a';
    snakeState.snake.forEach(function(s,i){
      arcadeCtx.globalAlpha = i===0 ? 1 : 0.75;
      arcadeCtx.fillRect(s.x*c, s.y*c, c-1, c-1);
    });
    arcadeCtx.globalAlpha = 1;
  }

  function exitSnake(){
    exitArcade(snakeState && snakeState.score ? ("snake closed. final score: " + snakeState.score) : "snake closed.");
  }

  /* ---- pong ---- */
  function startPong(){
    mode = 'pong';
    print("up/down (or w/s) to move, esc to quit. first to 5 wins.", "amber");
    ensureArcade();
    stopAllArcadeLoops();
    heldKeys = {};
    arcadeWrap.style.display = 'flex';
    arcadeCanvas.focus();
    resetPong();
    pongLoop = setInterval(stepPong, 16);
  }

  function resetPong(){
    pongState = {
      w: arcadeCanvas.width, h: arcadeCanvas.height,
      paddleH: 50, paddleW: 6,
      playerY: 125, aiY: 125,
      playerScore: 0, aiScore: 0,
      over: false
    };
    serveBall(pongState, Math.random() < 0.5 ? -1 : 1);
    arcadeScoreEl.textContent = 'you 0 — cpu 0';
    drawPong();
  }

  function serveBall(s, dir){
    s.ballX = s.w/2; s.ballY = s.h/2;
    s.ballVX = dir * 2.6;
    s.ballVY = (Math.random()*2 - 1) * 2.2;
  }

  function stepPong(){
    var s = pongState;
    if(!s || s.over) return;
    var speed = 4.2;
    if(heldKeys['arrowup'] || heldKeys['w']) s.playerY -= speed;
    if(heldKeys['arrowdown'] || heldKeys['s']) s.playerY += speed;
    s.playerY = Math.max(0, Math.min(s.h - s.paddleH, s.playerY));

    var aiCenter = s.aiY + s.paddleH/2;
    if(aiCenter < s.ballY - 10) s.aiY += 3.1;
    else if(aiCenter > s.ballY + 10) s.aiY -= 3.1;
    s.aiY = Math.max(0, Math.min(s.h - s.paddleH, s.aiY));

    s.ballX += s.ballVX;
    s.ballY += s.ballVY;

    if(s.ballY <= 0 || s.ballY >= s.h){ s.ballVY *= -1; }

    var playerX = s.w - 14;
    if(s.ballX + 4 >= playerX && s.ballX + 4 <= playerX + s.paddleW &&
       s.ballY >= s.playerY && s.ballY <= s.playerY + s.paddleH && s.ballVX > 0){
      s.ballVX *= -1.06;
      s.ballVY += (s.ballY - (s.playerY + s.paddleH/2)) * 0.12;
    }
    var aiX = 8;
    if(s.ballX - 4 <= aiX + s.paddleW && s.ballX - 4 >= aiX && s.ballVX < 0 &&
       s.ballY >= s.aiY && s.ballY <= s.aiY + s.paddleH){
      s.ballVX *= -1.06;
      s.ballVY += (s.ballY - (s.aiY + s.paddleH/2)) * 0.12;
    }

    if(s.ballX < 0){ s.aiScore++; serveBall(s, 1); }
    else if(s.ballX > s.w){ s.playerScore++; serveBall(s, -1); }

    arcadeScoreEl.textContent = 'you ' + s.playerScore + ' — cpu ' + s.aiScore;

    if(s.playerScore >= 5 || s.aiScore >= 5){
      s.over = true;
      clearInterval(pongLoop);
      arcadeScoreEl.textContent += (s.playerScore > s.aiScore ?
        ' — you win. press enter to play again, esc to quit.' :
        ' — cpu wins. press enter to play again, esc to quit.');
    }
    drawPong();
  }

  function drawPong(){
    var s = pongState;
    arcadeCtx.fillStyle = '#030503';
    arcadeCtx.fillRect(0, 0, s.w, s.h);
    arcadeCtx.strokeStyle = 'rgba(57,255,106,0.25)';
    arcadeCtx.setLineDash([4,6]);
    arcadeCtx.beginPath();
    arcadeCtx.moveTo(s.w/2, 0); arcadeCtx.lineTo(s.w/2, s.h);
    arcadeCtx.stroke();
    arcadeCtx.setLineDash([]);
    arcadeCtx.fillStyle = '#39ff6a';
    arcadeCtx.fillRect(8, s.aiY, s.paddleW, s.paddleH);
    arcadeCtx.fillRect(s.w - 14, s.playerY, s.paddleW, s.paddleH);
    arcadeCtx.fillStyle = '#ffb300';
    arcadeCtx.fillRect(s.ballX - 4, s.ballY - 4, 8, 8);
  }

  function exitPong(){
    exitArcade(pongState ?
      ("pong closed. final score — you " + pongState.playerScore + ", cpu " + pongState.aiScore + ".") :
      "pong closed.");
  }

  /* ---- breakout ---- */
  function startBreakout(){
    mode = 'breakout';
    print("left/right (or a/d) to move, esc to quit. clear the bricks.", "amber");
    ensureArcade();
    stopAllArcadeLoops();
    heldKeys = {};
    arcadeWrap.style.display = 'flex';
    arcadeCanvas.focus();
    resetBreakout();
    breakoutLoop = setInterval(stepBreakout, 16);
  }

  function resetBreakout(){
    var bricks = [];
    var cols = 8, rows = 4, bw = 34, bh = 12, gap = 2, offX = 4, offY = 26;
    for(var r=0; r<rows; r++){
      for(var c=0; c<cols; c++){
        bricks.push({ x: offX + c*(bw+gap), y: offY + r*(bh+gap), w: bw, h: bh, alive: true });
      }
    }
    breakoutState = {
      w: arcadeCanvas.width, h: arcadeCanvas.height,
      paddleW: 50, paddleH: 8,
      paddleX: 125,
      ballX: 150, ballY: 220,
      ballVX: (Math.random() < 0.5 ? -1 : 1) * 2.2,
      ballVY: -2.6,
      bricks: bricks, lives: 3, score: 0, over: false
    };
    arcadeScoreEl.textContent = 'score: 0 — lives: 3';
    drawBreakout();
  }

  function stepBreakout(){
    var s = breakoutState;
    if(!s || s.over) return;
    var speed = 4.6;
    if(heldKeys['arrowleft'] || heldKeys['a']) s.paddleX -= speed;
    if(heldKeys['arrowright'] || heldKeys['d']) s.paddleX += speed;
    s.paddleX = Math.max(0, Math.min(s.w - s.paddleW, s.paddleX));

    s.ballX += s.ballVX;
    s.ballY += s.ballVY;

    if(s.ballX <= 4 || s.ballX >= s.w - 4) s.ballVX *= -1;
    if(s.ballY <= 4) s.ballVY *= -1;

    var paddleY = s.h - 16;
    if(s.ballY + 4 >= paddleY && s.ballY + 4 <= paddleY + s.paddleH &&
       s.ballX >= s.paddleX && s.ballX <= s.paddleX + s.paddleW && s.ballVY > 0){
      s.ballVY *= -1;
      s.ballVX += (s.ballX - (s.paddleX + s.paddleW/2)) * 0.1;
    }

    s.bricks.forEach(function(b){
      if(!b.alive) return;
      if(s.ballX + 4 > b.x && s.ballX - 4 < b.x + b.w && s.ballY + 4 > b.y && s.ballY - 4 < b.y + b.h){
        b.alive = false;
        s.ballVY *= -1;
        s.score += 10;
      }
    });

    if(!s.over && s.bricks.every(function(b){ return !b.alive; })){
      s.over = true;
      clearInterval(breakoutLoop);
      arcadeScoreEl.textContent = 'score: ' + s.score + ' — cleared. press enter to play again, esc to quit.';
      drawBreakout();
      return;
    }

    if(s.ballY > s.h){
      s.lives--;
      if(s.lives <= 0){
        s.over = true;
        clearInterval(breakoutLoop);
        arcadeScoreEl.textContent = 'score: ' + s.score + ' — out of lives. press enter to play again, esc to quit.';
      } else {
        s.ballX = s.w/2; s.ballY = s.h - 40;
        s.ballVX = (Math.random() < 0.5 ? -1 : 1) * 2.2;
        s.ballVY = -2.6;
        arcadeScoreEl.textContent = 'score: ' + s.score + ' — lives: ' + s.lives;
      }
    } else {
      arcadeScoreEl.textContent = 'score: ' + s.score + ' — lives: ' + s.lives;
    }

    drawBreakout();
  }

  function drawBreakout(){
    var s = breakoutState;
    arcadeCtx.fillStyle = '#030503';
    arcadeCtx.fillRect(0, 0, s.w, s.h);
    var colors = ['#ffb300', '#39ff6a'];
    s.bricks.forEach(function(b, i){
      if(!b.alive) return;
      arcadeCtx.fillStyle = colors[Math.floor(i / 8) % 2];
      arcadeCtx.fillRect(b.x, b.y, b.w - 1, b.h - 1);
    });
    arcadeCtx.fillStyle = '#39ff6a';
    arcadeCtx.fillRect(s.paddleX, s.h - 16, s.paddleW, s.paddleH);
    arcadeCtx.fillStyle = '#ffb300';
    arcadeCtx.fillRect(s.ballX - 4, s.ballY - 4, 8, 8);
  }

  function exitBreakout(){
    exitArcade(breakoutState ? ("breakout closed. final score: " + breakoutState.score + ".") : "breakout closed.");
  }

  document.addEventListener('keydown', function(e){
    if(mode !== 'snake' && mode !== 'pong' && mode !== 'breakout') return;
    var key = e.key.toLowerCase();

    if(key === 'escape'){
      if(mode === 'snake') exitSnake();
      else if(mode === 'pong') exitPong();
      else if(mode === 'breakout') exitBreakout();
      return;
    }

    if(mode === 'snake'){
      if(snakeState && snakeState.dead && key === 'enter'){ resetSnake(); snakeLoop = setInterval(stepSnake, 110); return; }
      var d = snakeState ? snakeState.dir : {x:1,y:0};
      if(key === 'arrowup' && d.y===0){ snakeState.nextDir = {x:0,y:-1}; e.preventDefault(); }
      else if(key === 'arrowdown' && d.y===0){ snakeState.nextDir = {x:0,y:1}; e.preventDefault(); }
      else if(key === 'arrowleft' && d.x===0){ snakeState.nextDir = {x:-1,y:0}; e.preventDefault(); }
      else if(key === 'arrowright' && d.x===0){ snakeState.nextDir = {x:1,y:0}; e.preventDefault(); }
      return;
    }

    if(mode === 'pong'){
      if(pongState && pongState.over && key === 'enter'){ resetPong(); pongLoop = setInterval(stepPong, 16); return; }
      if(['arrowup','arrowdown','w','s'].indexOf(key) !== -1){ heldKeys[key] = true; e.preventDefault(); }
      return;
    }

    if(mode === 'breakout'){
      if(breakoutState && breakoutState.over && key === 'enter'){ resetBreakout(); breakoutLoop = setInterval(stepBreakout, 16); return; }
      if(['arrowleft','arrowright','a','d'].indexOf(key) !== -1){ heldKeys[key] = true; e.preventDefault(); }
      return;
    }
  });

  document.addEventListener('keyup', function(e){
    var key = e.key.toLowerCase();
    if(heldKeys.hasOwnProperty(key)) heldKeys[key] = false;
  });

  /* ---------------- konami code ---------------- */
  var konamiSeq = ['arrowup','arrowup','arrowdown','arrowdown','arrowleft','arrowright','arrowleft','arrowright','b','a'];
  var konamiPos = 0;

  document.addEventListener('keydown', function(e){
    var key = e.key.toLowerCase();
    if(key === konamiSeq[konamiPos]){
      konamiPos++;
      if(konamiPos === konamiSeq.length){
        konamiPos = 0;
        konamiFireworks();
      }
    } else {
      konamiPos = (key === konamiSeq[0]) ? 1 : 0;
    }
  });

  function konamiFireworks(){
    if(reduceMotion){
      print("** konami code accepted **", "amber");
      return;
    }
    var width = 44;
    var sparkles = ['*','+','.','x','\'','`'];
    var colors = ['amber','white','red',''];
    var frames = 10;
    var i = 0;
    printHTML('<span class="amber bold">** konami code accepted **</span>');
    (function frame(){
      if(i >= frames){
        print("cheat activated: +0 lives, +100% nostalgia.", "dim");
        print("(sentinel doesn't do powerups. it barely does uptime.)", "dim");
        return;
      }
      var chars = [];
      for(var c=0; c<width; c++){
        if(Math.random() < 0.14){
          var ch = sparkles[Math.floor(Math.random()*sparkles.length)];
          var cls = colors[Math.floor(Math.random()*colors.length)];
          chars.push(cls ? '<span class="'+cls+'">'+ch+'</span>' : ch);
        } else {
          chars.push(' ');
        }
      }
      printHTML(chars.join(''));
      i++;
      setTimeout(frame, 90);
    })();
  }

  /* ---------------- bezel glitch ---------------- */
  var crtEl = document.querySelector('.crt');
  var screenEl = document.querySelector('.screen');
  var bezelClicks = [];

  crtEl.addEventListener('click', function(e){
    if(e.target !== crtEl) return; // only the bare bezel, not clicks inside the screen
    var now = Date.now();
    bezelClicks = bezelClicks.filter(function(t){ return now - t < 2000; });
    bezelClicks.push(now);
    if(bezelClicks.length >= 5){
      bezelClicks = [];
      triggerGlitch();
    }
  });

  function triggerGlitch(){
    if(reduceMotion) return;
    screenEl.classList.add('glitch');
    setTimeout(function(){ screenEl.classList.remove('glitch'); }, 400);
  }

  startShell();

})();
