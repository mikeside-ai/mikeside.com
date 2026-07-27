// mikeside.com — Dev Log
// Reads /data/devlog.json, merges any external feeds listed in it,
// draws one tile per project, and renders the wire below.
// Contract: data/DEVLOG.md
(function () {
  const $tiles = document.getElementById('devlog-tiles');
  const $list = document.getElementById('devlog-entries');
  const $moreWrap = document.getElementById('devlog-more');
  const $moreBtn = $moreWrap ? $moreWrap.querySelector('button') : null;
  if (!$tiles || !$list) return;

  const PAGE = 8;
  let projects = [];
  let entries = [];
  let filter = null;
  let shown = PAGE;

  const fmt = d => {
    const p = d.split('-');
    return p.length === 3 ? `${+p[1]}/${+p[2]}/${p[0].slice(2)}` : d;
  };
  const nameOf = id => {
    const p = projects.find(x => x.id === id);
    return p ? p.name : id;
  };

  fetch('/data/devlog.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(async cfg => {
      projects = cfg.projects || [];
      const feeds = await Promise.all((cfg.feeds || []).map(f =>
        fetch(f.url, { cache: 'no-store' })
          .then(r => (r.ok ? r.json() : null))
          .then(j => {
            const list = Array.isArray(j) ? j : (j && j.entries) || [];
            return list.map(e => Object.assign({ project: f.project }, e));
          })
          .catch(() => [])
      ));
      entries = (cfg.entries || []).concat(...feeds)
        .filter(e => e && e.date && e.title && projects.some(p => p.id === e.project));
      entries.sort((a, b) => b.date.localeCompare(a.date));
      render();
    })
    .catch(() => {
      $list.innerHTML = '<div class="post-item"><span>The dev log feed is unavailable right now.</span></div>';
    });

  function render() { renderTiles(); renderList(); }

  function renderTiles() {
    $tiles.textContent = '';
    projects.forEach(p => {
      const mine = entries.filter(e => e.project === p.id);
      const el = document.createElement('div');
      el.className = 'card devlog-tile' + (filter === p.id ? ' active' : '');
      el.setAttribute('role', 'button');
      el.tabIndex = 0;
      el.setAttribute('aria-pressed', filter === p.id ? 'true' : 'false');

      const h = document.createElement('h3');
      h.textContent = p.name;
      el.appendChild(h);

      const meta = document.createElement('p');
      meta.className = 'devlog-meta';
      meta.textContent = mine.length
        ? `${mine.length} ${mine.length === 1 ? 'entry' : 'entries'} · latest ${fmt(mine[0].date)}`
        : 'No entries yet';
      el.appendChild(meta);

      const pick = () => {
        filter = (filter === p.id) ? null : p.id;
        shown = PAGE;
        render();
      };
      el.addEventListener('click', pick);
      el.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); }
      });
      $tiles.appendChild(el);
    });
  }

  function renderList() {
    $list.textContent = '';
    const pool = filter ? entries.filter(e => e.project === filter) : entries;

    if (!pool.length) {
      const empty = document.createElement('div');
      empty.className = 'post-item';
      const s = document.createElement('span');
      s.textContent = 'Nothing here yet — first note coming soon.';
      empty.appendChild(s);
      $list.appendChild(empty);
      if ($moreWrap) $moreWrap.hidden = true;
      return;
    }

    pool.slice(0, shown).forEach(e => {
      const row = document.createElement('div');
      row.className = 'post-item devlog-item';

      const main = document.createElement('div');
      main.className = 'devlog-main';

      const top = document.createElement('div');
      top.className = 'devlog-top';

      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = nameOf(e.project);
      top.appendChild(chip);

      if (e.type) {
        const t = document.createElement('span');
        t.className = 'chip type';
        t.textContent = e.type;
        top.appendChild(t);
      }

      const title = document.createElement('span');
      title.className = 'devlog-title';
      if (e.url) {
        const a = document.createElement('a');
        a.href = e.url;
        a.textContent = e.title;
        title.appendChild(a);
      } else {
        title.textContent = e.title;
      }
      top.appendChild(title);
      main.appendChild(top);

      if (e.notes) {
        const note = document.createElement('p');
        note.className = 'devlog-note';
        note.textContent = e.notes;
        main.appendChild(note);
      }

      const time = document.createElement('time');
      time.dateTime = e.date;
      time.textContent = fmt(e.date);

      row.appendChild(main);
      row.appendChild(time);
      $list.appendChild(row);
    });

    if ($moreWrap) $moreWrap.hidden = pool.length <= shown;
  }

  if ($moreBtn) {
    $moreBtn.addEventListener('click', () => { shown += 12; renderList(); });
  }
})();
