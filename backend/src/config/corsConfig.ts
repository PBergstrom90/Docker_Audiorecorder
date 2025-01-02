export const corsOptions = {
  origin: ['https://192.168.50.221', 'https://192.168.50.221:443', 'https://localhost:443'],
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
