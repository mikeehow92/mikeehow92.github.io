// postcss.config.js
// Este archivo es necesario para que Vite y PostCSS funcionen correctamente,
// incluso si no estás añadiendo plugins personalizados.
export default {
  plugins: {
    // Si estás usando TailwindCSS con PostCSS, puedes descomentar estas líneas:
    // 'tailwindcss': {},
    // 'autoprefixer': {},
    // Para este proyecto, como Tailwind se carga por CDN, no son estrictamente necesarios aquí,
    // pero el archivo debe existir y ser un objeto válido.
  },
};
