import 'dotenv/config';
import express from 'express';
import http from 'http';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import flash from 'connect-flash';
import cors from 'cors';
import { Server } from 'socket.io';
import { activeSessions } from './socket-session.js';




// Models & Routes
import Quiz from './models/Quiz.js';
import indexRoutes from './routes/index.js';
import authRoutes  from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import studentRoutes from './routes/student.js';
import teacherRoutes from './routes/teacher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app); // HTTP sunucusu
const io = new Server(server);        // Socket.io sunucusu

//Session sayfası: /session/:code
app.get('/start-quiz/:id', (req, res) => {
  res.redirect(`/teacher/start-quiz/${req.params.id}`);
});

app.get('/session/:code', async (req, res) => {
  const sessionData = activeSessions.get(req.params.code);
  if (!sessionData) {
    return res.status(404).send('Oturum bulunamadı');
  }

  const quiz = await Quiz.findById(sessionData.quizId);
  if (!quiz) {
    return res.status(404).send('Quiz bulunamadı');
  }

  res.render('quiz-session', {
    quiz,
    session: req.params.code,
    user: { name: 'Teacher' }
  });
});

import { Router } from 'express';
const router = Router();

// Öğrencinin quiz’e katılma formunu göster  *************
app.use(studentRoutes);
router.get('/student/quiz', (req, res) => {
  // Eğer kullanıcı login kontrolü yapıyorsanız, middleware ekleyin
  res.render('student-quiz');  
});

// (İsterseniz) form POST ile gönderilecekse; ama biz kodda socket ile yapıyoruz
// Yine de sağlamak için örnek:
router.post('/student/quiz/join', (req, res) => {
  // Burada kodu ve ismi alıp server-side validasyon yapabilirsiniz
  const { sessionCode, playerName } = req.body;
  // Başarılıysa quiz sayfasına yönlendir
  res.redirect(`/student/quiz?code=${sessionCode}&name=${playerName}`);
});

export default router;


// ① View engine ayarları
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ② Middleware'ler
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'super-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 5 * 60 * 1000 }
}));
app.use(flash());
app.use((req, res, next) => {
  res.locals.user    = req.session.user;
  res.locals.success = req.flash('success');
  res.locals.error   = req.flash('error');
  next();
});
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));

// ③ MongoDB bağlantısı
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quizDB';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log(`✅ MongoDB bağlı (${mongoUri})`))
  .catch(err => console.error('❌ MongoDB hatası:', err));

// ④ Rotalar
app.use('/',        indexRoutes);
app.use('/auth',    authRoutes);
app.use('/profile', profileRoutes);
app.use('/student', studentRoutes);
app.use('/teacher', teacherRoutes);

// ⑤ AJAX API (opsiyonel örnek)
app.get('/api/quizzes/:quizId/questions', async (req, res) => { /*...*/ });
app.post('/api/quizzes/:quizId/answer',   async (req, res) => { /*...*/ });

// ⑥ Statik dosyalar
app.use(express.static(path.join(__dirname, 'public')));

// ⑦ Hata & 404 handler (opsiyonel)
app.use((err, req, res, next) => {
  console.error('❌ Hata:', err);
  res.status(500).send('Sunucu hatası');
});
app.use((req, res) => {
  res.status(404).send('Sayfa bulunamadı');
});


// ⑨ Socket.io olayları
io.on('connection', (socket) => {
  console.log('🟢 Bağlantı:', socket.id);

  socket.on('join-session', ({ code, name }) => {
    const session = activeSessions.get(code);
    if (!session) {
      socket.emit('session-error', { message: '❌ Geçersiz oturum kodu' });
      return;
    }
    socket.join(code);
    session.participants.set(socket.id, { name, answers: [] });
    io.to(code).emit('participant-joined', { participantId: socket.id, name });
  });

  socket.on('start-session', ({ quizId, code }) => {
    activeSessions.set(code, {
      quizId,
      participants: new Map()
    });
    console.log(`🚀 Oturum başlatıldı: ${code}`);
    io.to(code).emit('quiz-started');
  });


  socket.on('question-change', async ({ quizId, questionIndex, timeLimit }) => {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return;
    const question = quiz.questions[questionIndex];

    io.emit('question-changed', {
      text: question.text,
      options: question.options,
      image: question.image,
      timeLimit
    });
  });

  socket.on('submit-answer', ({ code, answer }) => {
    const session = activeSessions.get(code);
    if (session && session.participants.has(socket.id)) {
      const participant = session.participants.get(socket.id);
      participant.answers.push(answer);
      io.to(code).emit('answer-submitted', {
        participantId: socket.id,
        questionIndex: participant.answers.length - 1,
        answer
      });
    }
  });

  socket.on('end-session', async ({ quizId }) => {
    for (const [code, session] of activeSessions.entries()) {
      if (session.quizId.toString() === quizId) {
        const quiz = await Quiz.findById(quizId);
        if (!quiz) continue;

        const results = Array.from(session.participants.values()).map(p => {
          const correctAnswers = p.answers.reduce((acc, ans, i) =>
            ans === quiz.questions[i].correctOption ? acc + 1 : acc, 0);
          return {
            name: p.name,
            score: correctAnswers * quiz.pointsPerQuestion,
            correctAnswers,
            totalQuestions: quiz.questions.length
          };
        });

        io.to(code).emit('session-ended', { results });
        activeSessions.delete(code);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 Koptu:', socket.id);
    for (const [code, session] of activeSessions.entries()) {
      if (session.participants.has(socket.id)) {
        session.participants.delete(socket.id);
        io.to(code).emit('participant-left', { participantId: socket.id });
      }
    }
  });
});

// ⑩ Sunucuyu başlat
server.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Sunucu 3000 portunda çalışıyor');
});
