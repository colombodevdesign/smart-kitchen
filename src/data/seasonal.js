const SEASONAL = {
  1:  ['cavolo nero', 'verza', 'radicchio', 'porri', 'arance', 'kiwi', 'clementine'],
  2:  ['cavolo nero', 'verza', 'finocchi', 'radicchio', 'broccoli', 'arance', 'pompelmo'],
  3:  ['asparagi', 'carciofi', 'spinaci', 'piselli', 'broccoli', 'fragole'],
  4:  ['asparagi', 'fave', 'piselli freschi', 'spinaci', 'carciofi', 'fragole'],
  5:  ['zucchine', 'fave', 'asparagi', 'lattuga', 'fragole', 'ciliegie'],
  6:  ['zucchine', 'pomodori', 'melanzane', 'peperoni', 'fagiolini', 'ciliegie', 'albicocche'],
  7:  ['pomodori', 'melanzane', 'peperoni', 'cetrioli', 'fagiolini', 'mais', 'pesche', 'albicocche'],
  8:  ['pomodori', 'melanzane', 'peperoni', 'cetrioli', 'mais', 'pesche', 'fichi', 'anguria'],
  9:  ['zucca', 'funghi', 'uva', 'pere', 'mele', 'fichi', 'radicchio'],
  10: ['zucca', 'funghi porcini', 'castagne', 'radicchio', 'cavolo nero', 'mele', 'pere'],
  11: ['cavolo nero', 'cavolfiore', 'broccoli', 'zucca', 'radicchio', 'melograno', 'cachi'],
  12: ['cavolo nero', 'verza', 'radicchio', 'porri', 'cavolfiore', 'arance', 'clementine'],
}

export function getSeasonal() {
  return SEASONAL[new Date().getMonth() + 1] ?? []
}

export function getMonthName() {
  return new Date().toLocaleDateString('it-IT', { month: 'long' })
}
