# ---------- Build Angular ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build
# Angular 19 peut sortir dans dist/budget-front/browser ou dist/budget-front
# selon la version du builder — on normalise dans /app/dist/out
RUN if [ -d /app/dist/budget-front/browser ]; then \
      mv /app/dist/budget-front/browser /app/dist/out; \
    else \
      mv /app/dist/budget-front /app/dist/out; \
    fi \
    && echo "=== Contenu dist ===" \
    && ls /app/dist/out

# ---------- Serveur nginx ----------
FROM nginx:alpine
COPY --from=build /app/dist/out /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
