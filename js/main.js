// mikeside.com — shared behavior
document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav ul');
  if (toggle && menu) {
    toggle.addEventListener('click', () => menu.classList.toggle('open'));
    menu.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => menu.classList.remove('open'))
    );
  }

  // Mark the current page's nav link active
  const here = location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.nav ul a').forEach(a => {
    const href = a.getAttribute('href').replace(/index\.html$/, '');
    if (href !== '/' && here.startsWith(href)) a.classList.add('active');
    else if (href === '/' && (here === '/' || here === '')) a.classList.add('active');
  });

  // Footer year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

// Lizard ticker (front page only) — reads /data/lizard-feed.json, prepends a
// computed countdown item, duplicates the list for a seamless CSS loop.
document.addEventListener('DOMContentLoaded', () => {
  const track = document.getElementById('ticker-track');
  if (!track) return;
  fetch('/data/lizard-feed.json')
    .then(r => r.json())
    .then(feed => {
      const items = [];
      if (feed.countdown && feed.countdown.date) {
        const days = Math.ceil((new Date(feed.countdown.date + 'T00:00:00') - new Date()) / 86400000);
        if (days > 0) items.push({ text: '\u{1F3AA} ' + days + ' ' + feed.countdown.label, href: feed.countdown.href });
        else if (days >= -3) items.push({ text: '\u{1F3AA} DICK’S IS NOW', href: feed.countdown.href });
      }
      items.push(...(feed.items || []));
      if (!items.length) return;
      const frag = () => items.map(it =>
        '<a href="' + it.href + '">' + it.text.replace(/&/g,'&amp;').replace(/</g,'&lt;') + '</a>'
      ).join('<span class="tick-sep">◆</span>');
      // two copies -> track scrolls -50% for a perfect loop
      track.innerHTML = frag() + '<span class="tick-sep">◆</span>' + frag() + '<span class="tick-sep">◆</span>';
    })
    .catch(() => { /* ticker is decorative — fail silent */ });
});
