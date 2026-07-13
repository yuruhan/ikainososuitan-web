// Configuración de ilustraciones inline por capítulo.
//
// Cómo usar:
// 1. Pon tus imágenes en /app/frontend/public/illustrations/
//    (por ejemplo: ch1-1.jpg, ch1-2.jpg, ch2-1.jpg, ...)
// 2. Añade una entrada por cada imagen indicando el capítulo, la posición
//    (índice del párrafo después del cual aparecerá la ilustración) y el nombre del archivo.
// 3. Si un archivo no existe, la imagen se ocultará automáticamente sin romper la web.
//
// Formato: CHAPTER_ILLUSTRATIONS[chapter_index] = [{ after: paragraphIndex, src, alt }, ...]

export const CHAPTER_ILLUSTRATIONS = {
  1: [
    // { after: 30, src: "/illustrations/ch1-1.jpg", alt: "El despertar de Dyan" },
    // { after: 200, src: "/illustrations/ch1-2.jpg", alt: "Rias encuentra a Dyan" },
  ],
  2: [],
  3: [],
  4: [],
  5: [],
  6: [],
  7: [],
  8: [],
  9: [],
  10: [],
  11: [],
  12: [],
  13: [],
  14: [],
  15: [],
  16: [],
  17: [],
  18: [],
  19: [],
  20: [],
  21: [],
  22: [],
  23: [],
  24: [],
};

export const getChapterIllustrations = (chapterIndex) =>
  CHAPTER_ILLUSTRATIONS[chapterIndex] || [];
