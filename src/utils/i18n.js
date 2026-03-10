const TRANSLATIONS = {
  en: {
    // BottomNav
    nav_sounds: 'Sounds',
    nav_quiz: 'Quiz',
    nav_progress: 'Progress',

    // Browse
    page_sounds_title: 'English Sounds',
    rules_toggle: 'Rules',
    tab_all: 'All Sounds',

    // Group labels
    group1: 'Alphabet',
    group2: 'Common Sounds',
    group3: 'Advanced Sounds',
    group4: 'Additional Sounds',

    // Quiz IDLE
    quiz_title: 'Quiz',
    quiz_subtitle: 'What do you want to practice?',
    mode_all_title: 'All Phonograms',
    mode_all_desc: (n) => `Practice all ${n} phonograms in random order`,
    mode_struggling_title: 'Still Learning',
    mode_struggling_desc: (n) => `Focus on the ${n} phonograms you haven't mastered yet`,
    mode_new_title: 'New Only',
    mode_new_desc: (n) => `Start fresh with ${n} phonograms you haven't tried`,
    stat_mastered: 'Mastered',
    stat_practicing: 'Practicing',
    stat_not_started: 'Not Started',
    tip_mastered: 'Got it right 80%+ of the time with at least 5 attempts',
    tip_practicing: 'Tried at least once but not yet mastered',
    tip_not_started: 'Never attempted',
    streak_days: (n) => n === 1 ? '1 day streak' : `${n} day streak`,

    // Quiz QUESTION / REVEALED
    tap_to_hear: 'Tap to hear',
    tap_to_hear_again: 'Tap to hear again',
    show_answer: 'Show Answer',
    got_it: 'Got It!',
    keep_practicing: 'Keep Practicing',
    back: 'Back',
    of_label: (i, n) => `${i} of ${n}`,
    correct_so_far: (n) => `${n} correct so far`,

    // Quiz DONE
    round_complete: 'Round Complete!',
    phonograms_reviewed: (n) => `${n} phonograms reviewed`,
    practice_again: 'Practice Again',
    review_label: 'Review these:',

    // Progress
    progress_title: 'Progress',
    overall_accuracy: 'Overall Accuracy',
    correct_of: (c, t) => `${c} correct out of ${t} total attempts`,
    section_mastered: 'Mastered',
    section_learning: 'Still Learning',
    section_not_started: 'Not Started Yet',
    empty_state: 'No practice sessions yet',
    empty_state_sub: 'Go to Sounds or Quiz to get started',
    reset_all: 'Reset All Progress',
    reset_confirm: 'This will erase all your progress. Are you sure?',
    reset_yes: 'Yes, Reset',
    cancel: 'Cancel',
    learning_label: 'Learning',
    not_yet_label: 'Not Yet',
    correct_label: 'correct',
    language_label: 'Language',
  },

  es: {
    nav_sounds: 'Sonidos',
    nav_quiz: 'Prueba',
    nav_progress: 'Progreso',

    page_sounds_title: 'Sonidos del Inglés',
    rules_toggle: 'Reglas',
    tab_all: 'Todos los Sonidos',

    group1: 'Alfabeto',
    group2: 'Sonidos Comunes',
    group3: 'Sonidos Avanzados',
    group4: 'Sonidos Adicionales',

    quiz_title: 'Prueba',
    quiz_subtitle: '¿Qué quieres practicar?',
    mode_all_title: 'Todos los Fonogramas',
    mode_all_desc: (n) => `Practica los ${n} fonogramas en orden aleatorio`,
    mode_struggling_title: 'Aún Aprendiendo',
    mode_struggling_desc: (n) => `Enfócate en los ${n} fonogramas que no has dominado`,
    mode_new_title: 'Solo Nuevos',
    mode_new_desc: (n) => `Empieza con los ${n} fonogramas que no has intentado`,
    stat_mastered: 'Dominados',
    stat_practicing: 'Practicando',
    stat_not_started: 'Sin Empezar',
    tip_mastered: 'Acertado 80%+ del tiempo con al menos 5 intentos',
    tip_practicing: 'Intentado al menos una vez pero no dominado aún',
    tip_not_started: 'Nunca intentado',
    streak_days: (n) => n === 1 ? '1 día seguido' : `${n} días seguidos`,

    tap_to_hear: 'Toca para escuchar',
    tap_to_hear_again: 'Toca para escuchar otra vez',
    show_answer: 'Ver Respuesta',
    got_it: '¡Lo Sé!',
    keep_practicing: 'Seguir Practicando',
    back: 'Atrás',
    of_label: (i, n) => `${i} de ${n}`,
    correct_so_far: (n) => `${n} correcto hasta ahora`,

    round_complete: '¡Ronda Completa!',
    phonograms_reviewed: (n) => `${n} fonogramas revisados`,
    practice_again: 'Practicar de Nuevo',
    review_label: 'Repasar estos:',

    progress_title: 'Progreso',
    overall_accuracy: 'Precisión General',
    correct_of: (c, t) => `${c} correctas de ${t} intentos totales`,
    section_mastered: 'Dominados',
    section_learning: 'Aún Aprendiendo',
    section_not_started: 'Sin Empezar',
    empty_state: 'Aún no hay sesiones de práctica',
    empty_state_sub: 'Ve a Sonidos o Prueba para comenzar',
    reset_all: 'Reiniciar Todo',
    reset_confirm: 'Esto borrará todo tu progreso. ¿Estás seguro?',
    reset_yes: 'Sí, Reiniciar',
    cancel: 'Cancelar',
    learning_label: 'Aprendiendo',
    not_yet_label: 'Sin Empezar',
    correct_label: 'correcto',
    language_label: 'Lenguaje',
  },
}

const LANG_KEY = 'phonogram_language'

export function getStoredLanguage() {
  return localStorage.getItem(LANG_KEY) || 'en'
}

export function setStoredLanguage(lang) {
  localStorage.setItem(LANG_KEY, lang)
}

export function createT(lang) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.en
  return function t(key, ...args) {
    const val = dict[key] ?? TRANSLATIONS.en[key]
    if (typeof val === 'function') return val(...args)
    return val ?? key
  }
}
