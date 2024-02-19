FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm i
RUN npx prisma generate && npm run build

EXPOSE 3000

CMD ["npm", "start"]