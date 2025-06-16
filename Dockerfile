# Usa una imagen ligera de Nginx para contenido estático
FROM nginx:alpine

# Copia solo el contenido del directorio public/
COPY public/ /usr/share/nginx/html/

# Puerto expuesto (opcional, Cloud Run lo maneja automáticamente)
EXPOSE 80
