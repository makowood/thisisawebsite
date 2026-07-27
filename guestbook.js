(function(){
  "use strict";

  var API_BASE = "/api/guestbook";
  var NAME_MAX = 40;
  var MESSAGE_MAX = 200;

  var nameInput = document.getElementById("gbName");
  var nameCount = document.getElementById("gbNameCount");
  var messageInput = document.getElementById("gbMessage");
  var messageCount = document.getElementById("gbMessageCount");
  var submitBtn = document.getElementById("gbSubmit");
  var statusEl = document.getElementById("gbStatus");
  var entriesEl = document.getElementById("gbEntries");

  function updateCounter(input, counterEl, max){
    var len = input.value.length;
    counterEl.textContent = len + "/" + max;
    counterEl.classList.toggle("gb-counter-warn", max - len <= 10);
  }

  function setStatus(msg, cls){
    statusEl.textContent = msg || "";
    statusEl.className = "gb-status" + (cls ? " " + cls : "");
  }

  function formatTime(ts){
    try{
      return new Date(ts).toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    } catch(e){
      return "";
    }
  }

  function renderEntries(entries){
    entriesEl.innerHTML = "";
    if(!entries || !entries.length){
      var empty = document.createElement("p");
      empty.className = "dim";
      empty.textContent = "no entries yet — be the first.";
      entriesEl.appendChild(empty);
      return;
    }
    entries.forEach(function(entry){
      var wrap = document.createElement("div");
      wrap.className = "gb-entry";

      var head = document.createElement("div");
      head.className = "gb-entry-head";

      var name = document.createElement("span");
      name.className = "gb-entry-name";
      name.textContent = entry.name;

      var time = document.createElement("span");
      time.className = "gb-entry-time";
      time.textContent = formatTime(entry.ts);

      head.appendChild(name);
      head.appendChild(time);

      var msg = document.createElement("p");
      msg.className = "gb-entry-msg";
      msg.textContent = entry.message;

      var key = document.createElement("span");
      key.className = "gb-entry-key";
      key.textContent = entry.key;

      wrap.appendChild(head);
      wrap.appendChild(msg);
      wrap.appendChild(key);
      entriesEl.appendChild(wrap);
    });
  }

  function loadEntries(){
    entriesEl.innerHTML = '<p class="dim">loading guestbook...</p>';
    try{
      fetch(API_BASE)
        .then(function(res){
          if(!res.ok) throw new Error("bad response");
          return res.json();
        })
        .then(function(entries){
          entries.sort(function(a,b){ return b.ts - a.ts; });
          renderEntries(entries);
        })
        .catch(function(){
          entriesEl.innerHTML = '<p class="dim">couldn’t load the guestbook right now. try refreshing in a bit.</p>';
        });
    } catch(e){
      entriesEl.innerHTML = '<p class="dim">couldn’t load the guestbook right now. try refreshing in a bit.</p>';
    }
  }

  function submitEntry(){
    var name = nameInput.value.trim();
    var message = messageInput.value.trim();

    if(!name || !message){
      setStatus("both name and message are required.", "gb-error");
      return;
    }
    if(name.length > NAME_MAX){
      setStatus("name's gotta be " + NAME_MAX + " characters or under.", "gb-error");
      return;
    }
    if(message.length > MESSAGE_MAX){
      setStatus("message's gotta be " + MESSAGE_MAX + " characters or under.", "gb-error");
      return;
    }

    submitBtn.disabled = true;
    setStatus("signing...", "");

    try{
      fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, message: message })
      })
        .then(function(res){
          return res.json().then(function(body){ return { ok: res.ok, status: res.status, body: body }; });
        })
        .then(function(result){
          submitBtn.disabled = false;
          if(!result.ok){
            setStatus((result.body && result.body.message) || "couldn't sign that. try again.", "gb-error");
            return;
          }
          setStatus("signed. thanks for stopping by.", "gb-ok");
          nameInput.value = "";
          messageInput.value = "";
          updateCounter(nameInput, nameCount, NAME_MAX);
          updateCounter(messageInput, messageCount, MESSAGE_MAX);
          loadEntries();
        })
        .catch(function(){
          submitBtn.disabled = false;
          setStatus("couldn't reach the guestbook right now. try again in a bit.", "gb-error");
        });
    } catch(e){
      submitBtn.disabled = false;
      setStatus("couldn't reach the guestbook right now. try again in a bit.", "gb-error");
    }
  }

  nameInput.addEventListener("input", function(){ updateCounter(nameInput, nameCount, NAME_MAX); });
  messageInput.addEventListener("input", function(){ updateCounter(messageInput, messageCount, MESSAGE_MAX); });
  submitBtn.addEventListener("click", submitEntry);

  updateCounter(nameInput, nameCount, NAME_MAX);
  updateCounter(messageInput, messageCount, MESSAGE_MAX);
  loadEntries();
})();
