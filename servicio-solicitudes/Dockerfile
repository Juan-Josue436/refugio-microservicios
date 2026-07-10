# Usamos una imagen ligera de Node.js
FROM node:18-alpine

# Creamos el directorio de trabajo
WORKDIR /app

# Copiamos los archivos de dependencias
COPY package.json ./

# Instalamos las dependencias
RUN npm install

# Copiamos el resto del código fuente
COPY . .

# Compilamos TypeScript a JavaScript
RUN npm run build

# Exponemos el puerto (cambiará internamente según el servicio, pero Docker se adapta)
EXPOSE 3000

# Comando para arrancar la aplicación
CMD ["npm", "start"]