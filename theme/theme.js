// THEME – brand and colours used from JavaScript (logo, footer, canvas
// drawings). The CSS side lives in theme.css. For another institution,
// replace the values here; the keys are what the app looks up.
window.THEME = {
  brand: {
    name: 'SCAPE°',
    // Wordmark: name with the subtitle spread over its full width.
    logoHtml:
      '<span class="logo-word">SCAPE°</span>' +
      '<span class="logo-sub" aria-hidden="true"><span>Wetter</span><span>Klima</span><span>Mensch</span></span>',
    logoLabel: 'SCAPE° – Wetter Klima Mensch',
    claim: 'Wetter, Klima, Wandel. Wir erklären es.',
    contactHtml: 'SCAPE°<br>Frankfurter Straße 39<br>63065 Offenbach am Main<br>Instagram: @scape_offenbach<br>scape@offenbach.de',
    titleSuffix: ' – SCAPE°',
    themeColor: '#F2E4BA',
    // Short mark S° for the browser tab.
    favicon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#FFF487"/><text x="16" y="23.5" text-anchor="middle" font-family="Helvetica Neue, Arial, sans-serif" font-size="19" fill="#000">S°</text></svg>'
  },

  // Typeface for canvas text (the same stack as --font in theme.css).
  font: '"Founders Grotesk","Helvetica Neue",Inter,Arial,sans-serif',

  // The SCAPE° palette by name. Drawings refer to these names.
  palette: {
    black: '#000000', white: '#FFFFFF',
    olive: '#726B1E', sand: '#D4BFA3',
    gold: '#E09F00', amber: '#F59E24', yellow: '#FFE547', yellowStrong: '#FFD500', yellowBright: '#FFED00', yellowS: '#FDC618',
    yellowPastel: '#FFF487', yellowPale: '#FDF6B7',
    rust: '#D55117', orange: '#EE7518', salmon: '#EF887F', pink: '#F8E1E6', cream: '#F2E4BA',
    red: '#E41513', red2: '#E8472E',
    purple: '#442683', purple2: '#523E91', lavender: '#E0E5F5', lilac: '#C5B8DB',
    greenStrong: '#00983A', green: '#62BA91', greenPale: '#B0D8C0', mint: '#CFE6CE', paleGreen: '#D0E8DC',
    cyan: '#0097BE', cyan2: '#44ABCC', cyan3: '#80C0DA', petrol: '#1F6C8E', teal: '#007B73', grey: '#AEC4C2',
    navy: '#28348B', blue: '#0253A0', blue2: '#3274BA', bluePale: '#98B8DD', ice: '#D4EDF8'
  }
};

// ---- Isobaren zeichnen: colours on the map canvas ----
THEME.isobars = {
  // One fixed colour per isobar level, low to high pressure (4-hPa steps
  // from 984 hPa): cool for low, warm for high. 13 entries.
  levels: ['#442683', '#523E91', '#28348B', '#0253A0', '#3274BA', '#0097BE', '#007B73', '#00983A', '#726B1E', '#C89F09', '#EE7518', '#D55117', '#E41513'],
  ink: '#000000',
  paper: '#FFFFFF',
  land: '#F2E4BA',             // land / practice field
  sea: '#D4EDF8',              // sea on the Europe map
  coast: 'rgba(0,0,0,.35)',
  grid: 'rgba(0,0,0,.1)',      // lattice lines
  gridFaint: 'rgba(0,0,0,.07)',
  rim: 'rgba(0,0,0,.55)',
  muted: 'rgba(0,0,0,.45)',    // labels on the map (scale, place names)
  hidden: 'rgba(0,0,0,.55)',   // values of hidden grid points
  dot: 'rgba(0,0,0,.35)',      // grid points without a station
  below: '#D4EDF8',            // tutorial: station below the isobar
  above: '#F8E1E6',            // tutorial: station above the isobar
  wrong: '#E41513'             // crossings, wrongly separated stations
};
