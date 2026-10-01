// Shared by /projects/fireballs/, /snacks/ and /games/. Copied from the league's LeagueLobster page.
// Public schedule (league data). Times are local, America/Chicago.
var GAMES = [
  {d:"2026-09-26", t:"1:30 PM",  f:"1H", opp:"Lovelady", home:true},
  {d:"2026-10-03", t:"12:00 PM", f:"1G", opp:"Callaway", home:true},
  {d:"2026-10-10", off:true},
  {d:"2026-10-17", t:"10:30 AM", f:"2A", opp:"Braden",   home:false},
  {d:"2026-10-24", t:"1:30 PM",  f:"1H", opp:"Haddad",   home:false},
  {d:"2026-10-31", t:"12:00 PM", f:"2A", opp:"Bledsoe",  home:true},
  {d:"2026-11-07", t:"1:30 PM",  f:"1H", opp:"Farley",   home:true},
  {d:"2026-11-14", t:"10:30 AM", f:"1H", opp:"Bodiford", home:false},
  {d:"2026-11-21", t:"1:30 PM",  f:"1H", opp:"Lovelady", home:false}
];
// Field outlines on field-map.jpg in its original 1355x1025 coordinates: [centerX, centerY, width, height, rotationDeg].
var FIELD_BOXES = {"1C":[445,135,175,125,10],"1F":[612,172,170,125,10],"1B":[378,272,170,125,10],"1E":[582,320,235,140,10],"1H":[785,368,170,125,10],"1A":[313,410,170,125,10],"1D":[517,458,235,140,10],"1G":[752,513,235,140,10],"2C":[150,640,155,125,8],"2F":[360,676,225,140,8],"2H":[602,716,225,140,8],"2B":[112,787,155,125,8],"2E":[306,817,185,125,8],"2G":[515,840,185,115,8],"2A":[105,938,180,125,8],"2D":[330,945,230,135,8]};

// Jerseys: white/gray for home games, blue for away games.
// Jersey tiles and chips are filled with the jersey color (classes jersey-home / jersey-away).
function jerseyFor(g){ return g.home ? {name:"White/Gray", short:"white/gray", cls:"jersey-home"} : {name:"Blue", short:"blue", cls:"jersey-away"}; }
function jerseyChip(g){ var j=jerseyFor(g); return '<span class="jersey '+j.cls+'">'+j.name+' jersey</span>'; }
