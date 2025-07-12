import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // Configuración del servidor de desarrollo
  server: {
    // Asegura que el servidor de desarrollo escuche en todas las interfaces de red
    // Útil para Cloud Shell o entornos virtualizados
    host: '0.0.0.0',
    // Puerto por defecto de Vite es 5173, pero puedes cambiarlo si lo necesitas
    port: 5173, 
  },
  // Opciones de construcción para producción
  build: {
    // Directorio de salida de la construcción (por defecto es 'dist')
    outDir: 'dist', 
    // Define la raíz de tu aplicación para la construcción
    // Aquí le decimos a Vite que todas tus páginas HTML están en la raíz del proyecto
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        pago: path.resolve(__dirname, 'pago.html'),
        perfil: path.resolve(__dirname, 'perfil.html'),
        productos: path.resolve(__dirname, 'productos.html'),
        registro: path.resolve(__dirname, 'registro.html'),
      },
    },
    // Asegura que los assets de la carpeta 'public' se copien directamente
    // a la carpeta 'dist' sin ser procesados por el bundler de Vite.
    // Esto es crucial para tus CSS e imágenes que están en 'public/assets'.
    // Los assets de 'public' irán a 'dist/assets'
    assetsDir: 'assets', 
  },
  // Configuración para servir archivos estáticos desde la carpeta 'public'
  // Esto hace que los contenidos de 'public' estén disponibles en la raíz del servidor de desarrollo
  // y se copien directamente a 'dist' en la construcción.
  publicDir: 'public',
  // Resuelve alias de rutas si los necesitas (opcional)
  resolve: {
    alias: {
      // '@': path.resolve(__dirname, './src'), // Ejemplo de alias
    },
  },
});
