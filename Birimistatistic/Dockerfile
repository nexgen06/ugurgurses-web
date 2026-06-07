FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_AUTH_PROVIDER=supabase
ARG VITE_DATA_PROVIDER=supabase
ARG VITE_FIREBASE_ENABLED=false
ARG VITE_USE_FIRESTORE=false
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_AUTH_PROVIDER=$VITE_AUTH_PROVIDER \
    VITE_DATA_PROVIDER=$VITE_DATA_PROVIDER \
    VITE_FIREBASE_ENABLED=$VITE_FIREBASE_ENABLED \
    VITE_USE_FIRESTORE=$VITE_USE_FIRESTORE \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY scripts/serve.mjs scripts/serve.mjs
COPY --from=build /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "scripts/serve.mjs"]
