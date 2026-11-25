/* ============================================================
   BREAKER CATALOG  (edit freely)
   ------------------------------------------------------------
   Breakers: breakers/all/breaker-001.png ... breaker-1000.png
      Only the files that exist are shown (no names, no empty tiles).
      Each slot can be .png, .jpg, .jpeg or .webp (see EXTS in breaker3d.js).
   To change the count, edit COUNT below.
   ============================================================ */
(function(){
  const COUNT=1000;
  const pad=n=>String(n).padStart(3,'0');
  const mk=(id,name,dir,pre,short,icon)=>({id,name,short,icon,label:'',full:'',dir,files:Array.from({length:COUNT},(_,i)=>pre+'-'+pad(i+1)+'.png')});
  window.BREAKER_TYPES=[
    mk('all','Breaker','breakers/all/','breaker'),   // breakers/all/breaker-001.png ... 1000
    mk('contactor','Magnetic Contactor','contactors/all/','contactor'), // contactors/all/contactor-001.png ... 1000
    mk('overload','Overload','overloads/all/','overload'),     // overloads/all/overload-001.png ... 1000
    mk('timer','Timer','timers/all/','timer'),                 // timers/all/timer-001.png ... 1000
    mk('meter','Meter','meters/all/','meter'),
    mk('more','MORE','more/all/','more'),                 // meters/all/meter-001.png ... 1000
    // MORE library: more/all/more-001.png ... more-1000.png
    mk("solar","Solar Panel","solars/all/","solar","Solar","<path d=\"M4 8h16l-2 11H6z\"/><path d=\"M9.3 8L8.5 19M14.7 8l.8 11M5 13.5h14M12 2v3M5 4l2 2M19 4l-2 2\"/>"),
    mk("battery","Battery","batteries/all/","battery","Battery","<rect x=\"3\" y=\"7\" width=\"16\" height=\"11\" rx=\"2\"/><path d=\"M21 11v3M8 10.5v4M6 12.5h4M13.5 12.5h3\"/>"),
    mk("terminal","Terminal","terminals/all/","terminal","Terminal","<rect x=\"6\" y=\"3\" width=\"12\" height=\"18\" rx=\"2\"/><circle cx=\"12\" cy=\"8\" r=\"2\"/><circle cx=\"12\" cy=\"16\" r=\"2\"/><path d=\"M12 10v4\"/>"),
    mk("relay","Relay","relays/all/","relay","Relay","<rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\"/><path d=\"M8 9h3l3 3h2M8 15h8\"/>"),
    mk("motor","Motor","motors/all/","motor","Motor","<rect x=\"3\" y=\"7\" width=\"14\" height=\"10\" rx=\"3\"/><path d=\"M17 12h4M7 7V5M13 7V5\"/><circle cx=\"10\" cy=\"12\" r=\"2.2\"/>"),
  ];
})();
