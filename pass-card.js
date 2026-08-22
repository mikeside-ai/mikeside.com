(function () {
  // Acadia Park Pass — shortcut card, self-injecting.
  // Tries to drop into the Thursday Aug 6 section (right after its heading);
  // if that heading isn't found (site restructured, wording changed, etc.),
  // falls back to a small floating shortcut so the pass is never unreachable.

  function buildCard() {
    var a = document.createElement('a');
    a.href = 'pass.html';
    a.id = 'acadia-pass-card';
    a.setAttribute('aria-label', 'Acadia Park Pass \u2014 tap for full screen');
    a.style.cssText = [
      'display:flex', 'align-items:center', 'gap:14px',
      'background:#FFFFFF', 'border:1.5px solid #2F5D3A', 'border-radius:12px',
      'padding:12px 14px', 'margin:10px 0 14px', 'text-decoration:none',
      'color:#1B2B26', 'box-shadow:0 3px 10px rgba(27,43,38,.08)',
      'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif'
    ].join(';');

    var img = document.createElement('img');
    img.src = 'data:image/png;base64,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';
    img.alt = 'Acadia entrance pass QR';
    img.style.cssText = 'width:72px;height:72px;flex-shrink:0;image-rendering:pixelated;border-radius:6px;';

    var text = document.createElement('span');
    text.style.cssText = 'display:block;min-width:0;';
    text.innerHTML =
      '<strong style="display:block;font-size:15px;color:#2F5D3A;letter-spacing:.02em;">\uD83E\uDD9E Acadia Park Pass \u2014 tap for full screen</strong>' +
      '<span style="display:block;font-size:12.5px;line-height:1.45;margin-top:3px;color:#4A5A54;">Vladimir + photo ID \u00b7 valid Aug 4\u201310 \u00b7 entrance only (Cadillac 1:30p is a separate QR)</span>' +
      '<span style="display:block;font-size:11.5px;line-height:1.4;margin-top:4px;color:#B3401E;font-weight:600;">Pack the printout \u2014 NPS requires it on the dashboard.</span>';

    a.appendChild(img);
    a.appendChild(text);
    return a;
  }

  function findThursdayHeading() {
    var els = document.querySelectorAll('h1, h2, h3, h4, [class*="day"], [class*="head"]');
    for (var i = 0; i < els.length; i++) {
      var t = (els[i].textContent || '').toLowerCase();
      if (t.indexOf('thu') !== -1 && (t.indexOf('aug 6') !== -1 || t.indexOf('august 6') !== -1 || t.indexOf('8/6') !== -1)) {
        return els[i];
      }
    }
    return null;
  }

  function inject() {
    if (document.getElementById('acadia-pass-card')) return;
    var card = buildCard();
    var heading = findThursdayHeading();
    if (heading && heading.parentNode) {
      heading.insertAdjacentElement('afterend', card);
    } else {
      card.style.position = 'fixed';
      card.style.bottom = '16px';
      card.style.right = '16px';
      card.style.left = '16px';
      card.style.maxWidth = '360px';
      card.style.margin = '0 auto';
      card.style.zIndex = '9999';
      document.body.appendChild(card);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
