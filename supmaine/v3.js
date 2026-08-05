/* SupMaine v3 — "The Album".
   A near-textless, photo-first read of the trip, built for someone who wants
   to know where we are next without reading a paragraph to find out.

   WHY THE DATA IS CURATED HERE INSTEAD OF PARSED FROM THE DAY FRAGMENTS:
   v1 and v2 present every option co-equally (Thursday alone carries five).
   That is correct for the planning document and wrong for this one — a photo
   album cannot show five parallel Thursdays without becoming a maze. So v3
   carries the live plan only, hand-kept. If a fragment time changes, change
   it here too. Everything else on the site stays single-source.

   IMAGES: hotlinked Wikimedia Commons + two local jpgs. No API key, no
   referrer restriction, no quota. Every tile falls back to a drawn glyph
   card if its image 404s, so a dead URL costs one picture, never the page. */

(function () {
  var W = function (f, w) {
    return 'https://commons.wikimedia.org/wiki/Special:FilePath/' +
      encodeURIComponent(f) + '?width=' + (w || 700);
  };
  var M = function (q) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
  };

  var HOLIDAY = 'Holiday Inn Portland By the Bay 88 Spring St Portland ME';
  var ALAMO = 'Alamo Rent A Car 1001 Westbrook St Portland ME 04102';
  var BIKESHOP = 'Bar Harbor Bicycle Shop 141 Cottage St Bar Harbor ME 04609';

  /* stop = [time, label, glyph, photo(0 if none), mapQuery, flags]
     flags: k = key/booked (orange chip)   w = full-width tile */
  var DAYS = [
    { id: 'd1', dow: 'Tue', n: '4', mon: 'Aug', iso: '2026-08-04',
      hed: 'Fly in, lobster rolls, a cottage in the pines',
      hero: W('Burnt Island Lighthouse Boothbay Harbor, Maine.JPG', 900), heroG: '🛬',
      stops: [
        ['12:02p', 'Land at PWM', '🛬', 0, ''],
        ['12:15p', 'The Jeep', '🚙', 0, ALAMO],
        ['1:00p', 'Bath — the hosts', '👋', 0, '141 North Street Bath ME 04530'],
        ['2:45p', "Red's Eats", '🦞', 0, "Red's Eats Wiscasset ME", 'k'],
        ['4:15p', 'Boothbay Harbor', '⚓', 0, 'Boothbay Harbor ME'],
        ['6:30p', 'Dinner', '🍽', 0, 'Boothbay Harbor ME restaurants'],
        ['', 'Cottage 9, Edgecomb', '🏡', 'cottage.jpg', '5 Boothbay Road Edgecomb ME 04556', 'w']
      ] },

    { id: 'd2', dow: 'Wed', n: '5', mon: 'Aug', iso: '2026-08-05',
      hed: 'A 1927 schooner, a summit, a mile of granite',
      hero: W('View of Camden, ME.jpg', 900), heroG: '⛵',
      stops: [
        ['10:00a', 'Camden Harbor', '⚓', 0, 'Camden Harbor Public Landing Maine'],
        ['10:45a', 'Schooner Olad', '⛵', 0, 'Schooner Olad Camden Maine', 'k'],
        ['11:45a', 'Lunch in Camden', '🥪', 0, 'Camden Deli 37 Main St Camden ME 04843'],
        ['12:45p', 'Mount Battie', '🏔', 0, 'Mount Battie Camden Hills State Park'],
        ['2:30p', 'Rockland Breakwater', '🗼', W('Rockland breakwater lighthouse.jpg'),
          'Rockland Breakwater Lighthouse'],
        ['4:30p', 'Marshall Point', '🗼', W('Marshall Point Lighthouse Horizontal.JPG'),
          'Marshall Point Lighthouse Port Clyde ME'],
        ['', 'The dome + alpacas', '🦙', 'dome.jpg', '187 Come Spring Lane Union ME 04862', 'w']
      ] },

    { id: 'd3', dow: 'Thu', n: '6', mon: 'Aug', iso: '2026-08-06',
      hed: 'Acadia — carriage roads, iron rungs, the summit',
      hero: W('Jordan Pond, Acadia National Park.JPG', 900), heroG: '🌲',
      stops: [
        ['9:00a', 'E-bikes, Bar Harbor', '🚲', 0, BIKESHOP, 'k'],
        ['9:50a', 'Eagle Lake', '🏞', 0, 'Eagle Lake Bridge 487 Eagle Lake Rd Bar Harbor ME 04609'],
        ['10:45a', 'Bubble Pond', '🌲', 0,
          'Bubble Pond Carriage Road Trailhead Bar Harbor ME 04609'],
        ['11:20a', 'Jordan Pond', '🥞', 0,
          'Jordan Pond House 2928 Park Loop Rd Seal Harbor ME 04675'],
        ['12:45p', 'Bikes back', '🚲', 0, BIKESHOP],
        ['1:30p', 'The Beehive', '🥾', W('Acadia national park sand beach z.JPG'),
          'Sand Beach Park Loop Rd Bar Harbor ME 04609'],
        ['3:30p', 'Thunder Hole', '🌊', W('Thunder hole, Acadia National Park, Maine.jpg'),
          'Thunder Hole Acadia'],
        ['3:45p', 'Cadillac summit', '⛰', W('Cadillac Mountain.jpg'),
          'Cadillac Summit Road Acadia National Park Bar Harbor ME 04609', 'k'],
        ['', 'Harraseeket Inn, Freeport', '🏨', 0,
          'Harraseeket Inn 162 Main St Freeport ME 04032', 'w']
      ] },

    { id: 'd4', dow: 'Fri', n: '7', mon: 'Aug', iso: '2026-08-07',
      hed: 'The wedding begins — an island lobster bake at sunset',
      hero: W('Peaks Island - panoramio.jpg', 900), heroG: '🦞',
      stops: [
        ['9:00a', 'Breakfast, Cape Elizabeth', '☕', 0, 'Cape Elizabeth ME breakfast'],
        ['10:30a', 'Portland Head Light', '🗼',
          W('Portland Head Light - Cape Elizabeth, Maine, USA - September 28, 2023 01.jpg'),
          'Portland Head Light Fort Williams Park'],
        ['2:15p', 'Casco Bay ferry', '⛴', 0, 'Casco Bay Lines Ferry Terminal Portland ME'],
        ['4:30p', 'Welcome lobster bake', '🦞', 0, 'Greenwood Garden Peaks Island ME', 'k'],
        ['', 'Holiday Inn By the Bay', '🏨', 0, HOLIDAY, 'w']
      ] },

    { id: 'd5', dow: 'Sat', n: '8', mon: 'Aug', iso: '2026-08-08', wed: 1,
      hed: 'Jeannette & Austin — vows by the ocean',
      hero: 'https://www.theknot.com/tk-media/images/de940559-d019-486d-b88e-927caf0c7676~rt_auto-cr_252.1164.3200.2640-rs_2880.h?ordering=explicit&quality=90',
      heroG: '💍',
      stops: [
        ['8:30a', 'Slow breakfast', '☕', 0, 'Hot Suppa Portland ME'],
        ['10:00a', 'Free morning', '☀️', 0, ''],
        ['1:00p', 'Get ready', '👗', 0, ''],
        ['3:30p', 'Welcome drinks', '🥂', 0, 'Cape Elizabeth ME'],
        ['4:00p', 'Ceremony', '💍', 0, 'Cape Elizabeth ME', 'k'],
        ['5:00p', 'Reception', '🎉', 0, ''],
        ['', 'Holiday Inn By the Bay', '🏨', 0, HOLIDAY, 'w']
      ] },

    { id: 'd5b', dow: 'Sun', n: '9', mon: 'Aug', iso: '2026-08-09',
      hed: 'Recovery day — beaches and lighthouses, all a la carte',
      hero: W('Portland Headlight 1.JPG', 900), heroG: '🌅',
      stops: [
        ['10:00a', 'Old Port coffee', '☕', 0, 'Old Port Portland ME'],
        ['', 'Working waterfront', '🚢', 0, 'Commercial Street Portland ME waterfront'],
        ['lunch', "Gilbert's Chowder", '🥣', 0,
          "Gilbert's Chowder House 92 Commercial St Portland ME"],
        ['', 'Eastern Promenade', '🌅', 0, 'Eastern Promenade Portland ME'],
        ['', 'Crescent Beach', '🏖', W('Crescent Beach State Park, Cape Elizabeth ME.jpg'),
          'Crescent Beach State Park Cape Elizabeth'],
        ['', 'Two Lights', '🗼', W('Cape-elizabeth-light.jpg'),
          'Two Lights State Park Cape Elizabeth'],
        ['', 'Holiday Inn By the Bay', '🏨', 0, HOLIDAY, 'w']
      ] },

    { id: 'd6', dow: 'Mon', n: '10', mon: 'Aug', iso: '2026-08-10',
      hed: 'Last full day — eat your way through the Old Port',
      hero: W('Old Port area of Portland, ME.jpg', 900), heroG: '🍟',
      stops: [
        ['9:00a', 'Tandem Coffee', '☕', 0, 'Tandem Coffee Portland ME'],
        ['12:00p', 'Duckfat', '🍟', 0, 'Duckfat Portland ME', 'k'],
        ['', 'Eventide oysters', '🦪', 0, 'Eventide Oyster Co Portland ME'],
        ['', 'Gelato Fiasco', '🍦', 0, 'Gelato Fiasco Old Port Portland ME'],
        ['', 'Eastern Promenade', '🌅', 0, 'Eastern Promenade Portland ME'],
        ['or', 'South-coast ride', '🚲', 0, 'Gorham Bike and Ski Saco ME'],
        ['dinner', "Hosts' dinner pick", '🍽', 0, 'Fore Street restaurant Portland ME', 'k'],
        ['eve', 'Return the Jeep', '🚙', 0, ALAMO],
        ['', 'Hilton Garden Inn Airport', '🏨', 0,
          'Hilton Garden Inn Portland Airport 145 Jetport Blvd Portland ME 04102', 'w']
      ] },

    { id: 'd7', dow: 'Tue', n: '11', mon: 'Aug', iso: '2026-08-11',
      hed: 'Shuttle, two flights, home before lunch',
      hero: 0, heroG: '✈️',
      stops: [
        ['4:45a', 'Shuttle to PWM', '🚐', 0, 'Portland International Jetport'],
        ['6:30a', 'PWM → LGA', '✈️', 0, ''],
        ['8:55a', 'LGA → BHM', '✈️', 0, ''],
        ['10:30a', 'Home', '🏠', 0, '']
      ] }
  ];

  /* ---------- render ---------- */
  var esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };
  var fadeIn = function (img) {
    img.addEventListener('load', function () { img.classList.add('in'); });
    img.addEventListener('error', function () { img.remove(); });
    if (img.complete && img.naturalWidth) img.classList.add('in');
  };

  var rail = document.getElementById('rail');
  var main = document.getElementById('album');
  var todayISO = new Date().toLocaleDateString('en-CA');
  var todayEl = null;

  DAYS.forEach(function (d) {
    rail.insertAdjacentHTML('beforeend',
      '<a href="#' + d.id + '" data-iso="' + d.iso + '">' + d.n + '</a>');

    var tiles = d.stops.map(function (s) {
      var f = s[5] || '';
      var q = s[4];
      var tag = q ? 'a' : 'div';
      var attr = q ? ' href="' + esc(M(q)) + '" target="_blank" rel="noopener"' : '';
      return '<' + tag + ' class="t' + (f.indexOf('w') > -1 ? ' wide' : '') +
        (f.indexOf('k') > -1 ? ' key' : '') + '"' + attr + '>' +
        '<span class="g">' + s[2] + '</span>' +
        (s[3] ? '<img alt="' + esc(s[1]) + '" loading="lazy" src="' + esc(s[3]) + '">' : '') +
        '<span class="veil"></span>' +
        (s[0] ? '<span class="tm">' + esc(s[0]) + '</span>' : '') +
        (q ? '<span class="pin">↗</span>' : '') +
        '<span class="lb">' + esc(s[1]) + '</span>' +
        '</' + tag + '>';
    }).join('');

    var sec = document.createElement('section');
    sec.className = 'day' + (d.wed ? ' wed' : '');
    sec.id = d.id;
    sec.innerHTML =
      '<div class="hero"><span class="g" style="font-size:60px">' + d.heroG + '</span>' +
      (d.hero ? '<img alt="' + esc(d.hed) + '" src="' + esc(d.hero) + '">' : '') +
      '<span class="scrim"></span><div class="plate">' +
      '<div><div class="dow">' + d.dow + '</div><div class="num">' + d.n + '</div></div>' +
      '<div class="mon">' + d.mon + '</div></div></div>' +
      '<div class="hed">' + esc(d.hed) + '</div>' +
      '<div class="grid">' + tiles + '</div>';
    main.appendChild(sec);
    if (d.iso === todayISO) todayEl = sec;
  });

  Array.prototype.forEach.call(document.querySelectorAll('img'), fadeIn);

  /* today's numeral lights up, and the page opens on today */
  var chip = rail.querySelector('[data-iso="' + todayISO + '"]');
  if (chip) chip.classList.add('now');
  if (todayEl && !location.hash) {
    requestAnimationFrame(function () {
      todayEl.scrollIntoView({ block: 'start' });
    });
  }

  /* signature: the rope fills as the week scrolls past */
  var fill = document.querySelector('#rope i');
  var tick = function () {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    fill.style.height = (h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0) + '%';
  };
  window.addEventListener('scroll', tick, { passive: true });
  window.addEventListener('resize', tick);
  tick();
})();
