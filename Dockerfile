# Utiliser une image Node.js officielle comme image de base
FROM node:20-alpine

# Définir le répertoire de travail dans le conteneur
WORKDIR /usr/src/app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances de production
RUN npm install --only=production

# Copier le reste des fichiers de l'application
COPY . .

# Exposer le port sur lequel l'application tourne
EXPOSE 3000

# Commande pour démarrer l'application
CMD [ "npm", "start" ]