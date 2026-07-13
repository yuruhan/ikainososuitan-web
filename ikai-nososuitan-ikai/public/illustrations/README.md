# Ilustraciones de la novela

Coloca aquí las imágenes que quieres integrar dentro de los capítulos.

## Convención sugerida de nombres

- `ch1-1.jpg`, `ch1-2.jpg` → ilustraciones del Capítulo 1
- `ch2-1.jpg` → ilustración del Capítulo 2
- ...

## Cómo integrar una ilustración en el texto

Edita el archivo `frontend/src/data/illustrations.js` y añade una entrada:

```js
CHAPTER_ILLUSTRATIONS[1] = [
  { after: 30, src: "/illustrations/ch1-1.jpg", alt: "El despertar de Dyan" },
  { after: 200, src: "/illustrations/ch1-2.jpg", alt: "Rias en el bosque" },
];
```

- `after` → índice del párrafo después del cual aparecerá la imagen (0 = antes de todo, 30 = tras el párrafo 30, etc.).
- `src` → ruta pública del archivo.
- `alt` → texto alternativo/descripción.

Todas las imágenes usan `loading="lazy"` automáticamente y solo se cargan al hacer scroll cerca de ellas.
