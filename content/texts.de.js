// Every visible text of the app. Edit or translate this file to adapt the
// exhibit; index.html only holds data-t="path.to.key" placeholders that
// js/texts.js fills from here. Entries written as functions build a sentence
// around runtime values. Lines marked LOCAL refer to SCAPE°, its region or
// its country (here: the German weather service DWD).
window.TEXTS = {
  lang: 'de',
  pageTitle: 'Isobaren zeichnen',
  description: 'Ein Isobaren-Spiel im Browser: Messstationen zeigen den Luftdruck, und du zeichnest die Linien gleichen Drucks ein – wie auf einer Wetterkarte.',

  // Texts of the shared kit (js/view.js, js/kit.js).
  kit: {
    viewToDesktop: 'Desktop-Ansicht',
    viewToMobile: 'Handy-Ansicht',
    viewToDesktopAria: 'Zur Desktop-Ansicht wechseln',
    viewToMobileAria: 'Zur Handy-Ansicht wechseln',
    fullscreenEnter: 'Vollbild',
    fullscreenExit: 'Vollbild beenden',
    infoAria: 'Erklärung anzeigen',
    merke: 'Merke',
    tasks: 'Aufgaben',
    merkeLocked: 'Löse die Aufgaben – dann erscheint hier, was du herausgefunden hast.',
    devLink: '(dev)'
  },

  poster: {
    headline: 'Isobaren<br>zeichnen',
    lead: 'Die Zahlen sind Messungen, die Linien machen die Wetterkarte. Zeichne Linien gleichen Luftdrucks zwischen die Stationen.'
  },

  stageAria: {
    tutorial: 'Übungsfeld mit Messstationen und ihrem Luftdruck. Zeichne mit Finger oder Maus.',
    synoptic: 'Europakarte mit Messstationen und ihrem Luftdruck. Zeichne mit Finger oder Maus.'
  },

  // first-hint badge on the board (disappears with the first stroke)
  badge: {
    tutorial: X => 'Zieh mit dem Finger die Linie für ' + X + ' hPa',
    synoptic: 'Wähle eine Isobare und zeichne sie ein'
  },

  modes: {
    label: 'Spiel',
    tutorial: 'Tutorial',
    synoptic: 'Wetter­lagen',
    best: n => 'Bestwert: ' + n,
    noBest: 'noch kein Wert'
  },

  presets: {
    prev: 'Vorige Wetterlage',
    next: 'Nächste Wetterlage',
    infoAria: 'Wetterlage erklären',
    count: (n, total, code) => 'Wetterlage ' + n + ' von ' + total + ' · ' + code,
    wz: {
      title: 'Westlage', code: 'WZ',
      desc: 'Islandtief im Norden, Azorenhoch im Süden: Dazwischen liegen die Isobaren fast parallel von West nach Ost. Atlantische Tiefs ziehen im Wochentakt über Mitteleuropa – wechselhaft, windig, mild.'
    },
    hm: {
      title: 'Hoch Mitteleuropa', code: 'HM',
      desc: 'Ein kräftiges Hoch liegt direkt über Mitteleuropa: weite, geschlossene Ringe, kaum Wind. Im Sommer sonnig und warm, im Winter Nebel und Frost. Die Tiefs müssen außen herum ziehen.'
    },
    trm: {
      title: 'Trog Mitteleuropa', code: 'TrM',
      desc: 'Zwischen einem Hochkeil über dem Atlantik und einem Hoch über Russland reicht eine Tiefdruckrinne von Skandinavien bis zum Mittelmeer. Die Isobaren beulen sich darin weit nach Süden aus – kalte Luft strömt nach Mitteleuropa, oft mit Schauern, Gewittern und einem Genuatief. In Höhenkarten (500 hPa) sieht der Trog genauso aus, nur noch deutlicher.'
    },
    omega: {
      title: 'Omega-Lage', code: 'Ω',
      desc: 'Ein blockierendes Hoch über der Nordsee und Skandinavien, flankiert von je einem Tief im Westen und im Osten: Die Isobaren formen ein griechisches Ω. Solche Lagen halten sich oft wochenlang – im Sommer Hitze und Dürre, an den Flanken Starkregen.'
    },
    nwz: {
      title: 'Nordwestlage', code: 'NWz',
      desc: 'Das Azorenhoch schiebt einen Keil weit nach Norden, über Skandinavien liegt ein Tief. Dazwischen weht ein kräftiger Nordwestwind: kühle Meeresluft, Schauer an den Nordrändern der Mittelgebirge und Stau an den Alpen.'
    },
    hfa: {
      title: 'Hoch Fennoskandien', code: 'HFa',
      desc: 'Das Hoch sitzt über Skandinavien, tiefer Druck über dem Mittelmeer. Über Mitteleuropa verlaufen die Isobaren von Ost nach West: Ostwind bringt trockene Kontinentalluft – im Winter die klassische Lage für strengen Frost.'
    },
    swz: {
      title: 'Südwestlage', code: 'SWz',
      desc: 'Ein großes Tief liegt westlich der Britischen Inseln, ein Hoch über dem Balkan. Die Isobaren laufen von Südwest nach Nordost: Sehr milde, feuchte Luft strömt heran, im Winter Tauwetter, im Sommer schwül mit Gewittern.'
    },
    storm: {
      title: 'Sturmtief über der Nordsee', code: 'Orkan',
      desc: 'Ein tiefes Sturmtief liegt über der Nordsee, die Isobaren drängen sich an seiner Südflanke – genau dort, über Nordfrankreich, Benelux und Deutschland, tobt der Orkan. Je enger die Linien, desto stärker der Wind.'
    }
  },

  levels: {
    label: 'Isobare',
    aria: X => 'Isobare ' + X + ' hPa zeichnen'
  },

  // city names on the Europe map
  cities: {
    london: 'London', paris: 'Paris', berlin: 'Berlin', madrid: 'Madrid', rome: 'Rom',
    oslo: 'Oslo', moscow: 'Moskau', reykjavik: 'Reykjavík', warsaw: 'Warschau', istanbul: 'Istanbul'
  },

  map: {
    scaleBar: '500 km (50° N)',
    high: 'H',      // Hoch – drawn blue
    low: 'T'        // Tief – drawn red
  },

  mapNote: {
    pressure: I => '<b>Bodendruck</b> in hPa, auf Meereshöhe umgerechnet · Isobaren alle ' + I + ' hPa',
    scaleEurope: '<b>Maßstab:</b> 1 Kästchen ≈ 390 km (bei 50° N), Karte 26° W – 40° O, 35 – 70° N',
    scalePractice: '<b>Maßstab:</b> Übungsfeld ohne geografischen Maßstab',
    touch: '<b>Ein Finger zeichnet, zwei Finger scrollen</b> oder verschieben die Karte; auseinanderziehen zoomt',
    mouse: 'Zoomen: Strg + Mausrad · verschieben: rechte Maustaste'
  },

  // the line under the board
  status: {
    noCrossing: 'Isobaren dürfen sich nicht kreuzen',
    timeUp: 'Zeit abgelaufen!',
    great: 'Stark! Das ist eine echte Wetterkarte.',
    wrongSide: 'Rote Ringe: Stationen auf der falschen Seite',
    seeTruth: 'Tipp: „Wahres Feld“ zeigt die Musterlösung',
    crossing: 'Rotes ✕: Isobaren kreuzen sich nie',
    tutorialStart: X => 'Zieh die ' + X + '-hPa-Linie: Trenne Rot (unter ' + X + ') von Blau (über ' + X + ')',
    tutorialOpen: 'Setz am offenen Ende an: bis zum Rand – oder zum Ring schließen',
    tutorialMixed: 'Noch liegen rote und blaue Stationen auf derselben Seite',
    tutorialDone: 'Perfekt getrennt! Tippe auf „Prüfen“',
    synopticStart: 'Wähle oben eine Isobare und zeichne sie frei ein',
    synopticDraw: (X, I) => 'Zeichne ' + X + ' hPa – Stufen alle ' + I + ' hPa'
  },

  tools: {
    pen: 'Stift',
    eraser: 'Radierer',
    hint: 'Tipp',
    hintAlways: 'immer an',
    hintOn: 'an',
    hintCost: '−10 Punkte',
    clear: 'Alles löschen',
    clearSub: 'nur deine Linien',
    infoAria: 'Zeichnen erklären',
    note: '<p>Zeichne frei mit Finger oder Maus. Enden nahe am Rand rasten am Rand ein, ein Ende nahe am Anfang schließt den Ring. Setz an einem offenen Ende an, um weiterzuzeichnen.</p><p>Tippe eine Linie an, um sie zu löschen, oder wisch mit dem <b>Radierer</b> darüber. <b>Zurück</b> (oder Strg + Z) macht beides rückgängig.</p><p>Der <b>Tipp</b> färbt die Stationen: rot unter der gewählten Isobare, blau darüber. Außer im Tutorial kostet er 10 Punkte.</p>'
  },

  readout: {
    stations: 'Stationen',
    levels: 'Isobaren',
    open: 'Offene Enden',
    levelsOf: (n, total) => n + ' / ' + total,
    openValue: (open, crossings) => open + (crossings ? ' · ' + crossings + ' ✕' : '')
  },

  actions: {
    check: 'Prüfen',
    checkSub: 'Punkte zählen',
    undo: 'Zurück',
    undoSub: 'letzter Strich',
    newMap: 'Neue Karte',
    newMapSub: 'gleiches Spiel'
  },

  result: {
    of: '/ 100',
    starsAria: n => n + ' von 3 Sternen',
    invalid: 'Ungültig: Kreuzung',
    top: 'Wetterdienst-reif',
    almost: n => 'Fast – ' + n + (n === 1 ? ' Station' : ' Stationen') + ' falsch',
    good: 'Gute Analyse',
    onTheWay: 'Auf dem Weg',
    again: 'Nochmal hinschauen',
    percent: n => n + ' %',
    sepLabel: 'Trennung',
    sepNote: 'Wie viele Stationspaare (eins unter, eins über der Isobare) deine Linien richtig trennen. 75 Punkte.',
    smoothLabel: 'Glattheit',
    smoothNote: 'Echte Isobaren biegen sich gleichmäßig. Ringe und weite Bögen sind frei, aber Wackeln, Zickzack oder ein Knick kosten. 25 Punkte.',
    penCrossings: n => n + (n === 1 ? ' Kreuzung' : ' Kreuzungen') + ': −' + 15 * n,
    penOpen: n => n + (n === 1 ? ' offenes Ende' : ' offene Enden') + ': −' + 10 * n,
    penHint: 'Tipp benutzt: −10',
    penTime: 'Zeit abgelaufen',
    level: X => X + ' hPa',
    missing: (below, above) => '<span class="bad">fehlt</span> – ' + below + ' Stationen liegen darunter, ' + above + ' darüber.',
    separated: n => '<span class="ok">✓</span> trennt alle ' + n + ' Stationen richtig.',
    partly: (pct, wrong) => '<span class="bad">✗</span> ' + pct + ' % getrennt – ' + wrong + (wrong === 1 ? ' Station' : ' Stationen') + ' auf der falschen Seite.',
    truth: 'Wahres Feld',
    retry: 'Weiterzeichnen',
    newMap: 'Neue Karte'
  },

  hint: 'Eine Isobare verbindet Orte mit gleichem Luftdruck. Sie endet nie mitten auf der Karte und kreuzt keine andere. Die Karten sind ausgedachte, aber typische Wetterlagen – keine echten Messungen.',

  tasks: {
    title: 'Aufgaben',
    tutorial: 'Löse das Tutorial: Trenne alle roten von allen blauen Stationen und tippe auf „Prüfen“.',
    score: 'Hol bei einer Wetterlage mindestens 70 Punkte – das sind zwei Sterne.',
    truth: 'Prüfe eine Wetterlage und schalte „Wahres Feld“ ein. Wo liegt das Tief (T), wo das Hoch (H)?',
    done: {
      tutorial: 'Geschafft: Die Linie trennt hohen von tiefem Druck.',
      score: 'Zwei Sterne – deine Karte zeigt die Wetterlage.',
      truth: 'Ringe um tiefe Werte sind Tiefs, Ringe um hohe Werte Hochs.'
    }
  },
  merke: {
    title: 'Merke',
    text: 'Eine Isobare verbindet Orte mit gleichem Luftdruck. Isobaren kreuzen sich nie und hören nicht mitten auf der Karte auf. Ringe um tiefe Werte sind Tiefs (T), Ringe um hohe Werte sind Hochs (H). Wo die Linien eng liegen, weht starker Wind.'
  },

  topics: {
    what: {
      title: 'Was ist eine Isobare?',
      // LOCAL: the DWD (Deutscher Wetterdienst) as the national reference
      body: '<p>Eine Isobare verbindet Orte mit gleichem Luftdruck – so wie eine Höhenlinie auf der Wanderkarte Orte gleicher Höhe verbindet. Auf Wetterkarten werden sie in festen Abständen gezeichnet, hier alle 4 hPa, auf der Europakarte wie beim Deutschen Wetterdienst alle 5 hPa.</p><p>Wichtig: Eine Isobare liegt <i>zwischen</i> den Messwerten. Zwischen einer Station mit 1006 hPa und einer mit 1010 hPa muss die 1008er-Linie irgendwo hindurch. Wo genau, ist eine Schätzung – das nennt man Interpolation.</p><p>Eine Isobare trennt alle Werte darunter von allen Werten darüber. Sie endet nie mitten im Feld: Sie läuft bis zum Rand oder schließt sich zum Ring.</p><p>Wo Isobaren eng beieinander liegen, ändert sich der Druck schnell – dort weht starker Wind. Geschlossene Ringe um niedrige Werte sind Tiefs (T), um hohe Werte Hochs (H).</p>'
    },
    maps: {
      title: 'Bodendruck oder Höhenkarte? Und welcher Maßstab?',
      // LOCAL: the DWD (Deutscher Wetterdienst) as the national reference
      body: '<p>Alle Karten im Spiel zeigen den <b>Bodendruck</b>: den Luftdruck an jeder Station, auf Meereshöhe umgerechnet – sonst hätte eine Bergstation immer viel weniger Druck als eine Station an der Küste. So sehen die Bodenwetterkarten des Deutschen Wetterdienstes aus, mit Isobaren alle 5 hPa.</p><p><b>Höhenkarten</b> funktionieren anders: Sie zeigen, in welcher Höhe ein bestimmter Druck herrscht, meist 500 hPa in etwa 5,5 km Höhe, gemessen in geopotentiellen Dekametern (etwa 552 gpdm). Die Linien heißen dort Isohypsen. Tröge und Rücken sind in der Höhe besonders deutlich; am Boden zeichnen sie sich als ausgebeulte Isobaren und Tiefdruckrinnen ab.</p><p><b>Maßstab:</b> Die Europakarte reicht von 26° West bis 40° Ost und von 35° bis 70° Nord. Ein Kästchen ist 5,5 Längengrade breit und 3,5 Breitengrade hoch, bei 50° Nord also rund 390 km in beide Richtungen; nach Norden hin wird die Karte etwas gestreckt. Das Übungsfeld des Tutorials hat keinen geografischen Maßstab.</p>'
    },
    scoring: {
      title: 'Wie wird bewertet?',
      body: '<p>Es gibt keine einzig richtige Lösung. Das Spiel prüft deine Linien <b>strukturell</b>: Liegt für jede Isobare jede Station auf der richtigen Seite? Für jede Druckstufe werden alle Paare aus einer Station darunter und einer darüber gebildet – jedes Paar, das deine Linien nicht trennen, kostet. Das ergibt bis zu 75 Punkte.</p><p>Harte Regeln: Isobaren kreuzen sich nie – jede Kreuzung wird rot markiert und kostet 15 Punkte. Und sie enden nie mitten im Feld: Ein offenes Ende trennt nichts, weil der Druck um das Ende herum „fließen“ kann, und kostet zusätzlich 10 Punkte. Der Tipp kostet ebenfalls 10.</p><p>Dazu kommt die <b>Glattheit</b> (bis zu 25 Punkte): Echte Isobaren biegen sich gleichmäßig. Ein Ring oder ein weiter Bogen ist völlig in Ordnung, aber Wackeln, Zickzack und Knicke kosten Punkte.</p><p>Drei Sterne gibt es nur für eine fehlerfreie Karte: jede Isobare gezeichnet, jede Station auf der richtigen Seite, keine offenen Enden, keine Kreuzung.</p>'
    },
    truth: {
      title: 'Was zeigt „Wahres Feld“?',
      body: '<p>Deine Linien zeichnest du frei. Für die Bewertung werden sie in ein feines Raster übertragen, und eine Füllung prüft, welche Stationen im selben Gebiet landen – bewertet wird also nicht Pixel für Pixel, sondern die Seite, auf der jede Station liegt. Es gibt viele richtige Lösungen.</p><p>Hinter jeder Karte steckt ein vollständiges, stetiges Druckfeld – auch zwischen den Stationen. Nach dem Prüfen zeigt „Wahres Feld“ die Isobaren dieses Feldes als Musterlösung, mit Hochs (H, blau) und Tiefs (T, rot) und den Werten an den Gitterpunkten ohne Station. Sie wird auf einem fünfmal feineren Gitter berechnet (Marching Squares) und ist darum so glatt wie eine echte Wetterkarte. Sie zählt nicht zur Punktzahl – sie zeigt, was zwischen den Stationen wirklich los war. So geht es Meteorologinnen und Meteorologen auch: Die Messnetze haben Lücken.</p>'
    },
    modes: {
      title: 'Die Spielmodi',
      // LOCAL: the DWD (Deutscher Wetterdienst) as the national reference
      body: '<p><b>Tutorial:</b> wenige Stationen, eine einzige Isobare, und die Stationen sind nach „darunter“ (rot) und „darüber“ (blau) eingefärbt.</p><p><b>Wetterlagen:</b> ganz Europa mit Küsten, feinerem Gitter und echten hPa-Werten – acht Großwetterlagen von der Westlage über den Trog Mitteleuropa bis zur Omega-Lage. Isobaren wie beim Deutschen Wetterdienst alle 5 hPa. Nach dem Prüfen zeigt „Wahres Feld“ die ganze Lage mit Hochs (H) und Tiefs (T).</p><p>Die Wetterlagen sind nachgebaut, keine historischen Wetterkarten: Jede Karte setzt die typischen Hochs und Tiefs der Lage etwas anders, damit keine zwei Karten gleich sind.</p>'
    }
  },

  sources: 'Küstenlinien: Natural Earth (1:50m Land), gemeinfrei. Großwetterlagen nach Hess und Brezowsky, vereinfacht nachgebaut.'
};
