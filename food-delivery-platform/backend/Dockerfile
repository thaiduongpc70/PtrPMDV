FROM node:20-alpine
WORKDIR /app
COPY food-delivery-platform/backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY food-delivery-platform/backend ./backend
COPY food-delivery-platform/frontend ./frontend
COPY food_delivery_db.sql ./food_delivery_db.sql
COPY docs /docs
RUN mkdir -p /storage/exports
WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/server.js"]
