// server.js (ES Module sürümü)
import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module'de __dirname tanımı
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// JSON ve statik dosyaları ayarla
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB bağlantısı
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/quizDB';
await mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
console.log(`✅ MongoDB'ye Bağlandı (${mongoUri})`);

// Soru şeması
const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answers: [
    { text: String, correct: Boolean }
  ]
});
const Question = mongoose.model('Question', questionSchema);

// Quiz sayfasını sun
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'quiz.html'));
});

// API: Tüm soruları getir
app.get('/api/questions', async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// API: Yeni soru ekle
app.post('/api/questions', async (req, res) => {
  const { question, answers } = req.body;
  if (!question || !Array.isArray(answers)) {
    return res.status(400).json({ message: 'Soru ve cevaplar gerekli!' });
  }
  try {
    const newQuestion = new Question({ question, answers });
    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// API: Soru güncelle
app.put('/api/questions/:id', async (req, res) => {
  try {
    const updated = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Soru bulunamadı!' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// API: Soru sil
app.delete('/api/questions/:id', async (req, res) => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Soru bulunamadı!' });
    res.json({ message: 'Soru başarıyla silindi!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// API: Tüm soruları sil
app.delete('/api/questions', async (req, res) => {
  try {
    await Question.deleteMany({});
    res.json({ message: 'Tüm sorular başarıyla silindi!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Sunucuyu başlat
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server ${PORT} portunda çalışıyor!`));
