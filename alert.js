// alert.js - custom alert component
(function(){
  const WRAP_ID = 'customAlertWrap';

  function ensureWrap(){
    let wrap = document.getElementById(WRAP_ID);
    if(!wrap){
      wrap = document.createElement('div');
      wrap.id = WRAP_ID;
      wrap.className = 'custom-alert-wrap';
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  function createAlert(message, opts = {}){
    const { title = '', type = 'info', timeout = 4500, dismissible = true } = opts;
    const wrap = ensureWrap();
    const el = document.createElement('div');
    el.className = 'custom-alert ' + type;

    const icon = document.createElement('div');
    icon.className = 'icon';
    // simple icon glyphs
    icon.innerHTML = type === 'success' ? '&#10003;' : type === 'error' ? '&#10060;' : type === 'warn' ? '&#9888;' : '&#8505;';

    const body = document.createElement('div');
    body.className = 'body';
    if(title){
      const t = document.createElement('div'); t.className = 'title'; t.textContent = title; body.appendChild(t);
    }
    const p = document.createElement('div'); p.className = 'msg'; p.textContent = message; body.appendChild(p);

    const close = document.createElement('button');
    close.className = 'close';
    close.innerHTML = '&#10005;';
    close.title = 'Bezárás';

    if(dismissible){
      close.addEventListener('click', ()=>dismiss(el));
    }else{ close.style.display = 'none' }

    el.appendChild(icon);
    el.appendChild(body);
    el.appendChild(close);

    wrap.prepend(el);

    // show
    requestAnimationFrame(()=>{ el.classList.add('show'); });

    let timer = null;
    if(timeout > 0){ timer = setTimeout(()=>dismiss(el), timeout); }

    return { el, dismiss: () => dismiss(el, timer) };
  }

  function dismiss(el, timer){
    if(!el) return;
    el.classList.remove('show');
    el.classList.add('hide');
    if(timer) clearTimeout(timer);
    setTimeout(()=>{ try{ el.remove() }catch(e){} }, 280);
  }

  // expose global helper
  window.showAlert = function(message, opts){
    if(typeof message === 'object'){ opts = message; message = opts.message || '' }
    opts = opts || {};
    return createAlert(message, opts);
  };

  // override native alert
  window.alert = function(msg){ showAlert(String(msg), { type: 'info', timeout: 3500 }); };

})();
