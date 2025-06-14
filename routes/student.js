import express from 'express';
import { isStudentSession } from '../middlewares/auth.js';
import Quiz from '../models/Quiz.js';

const router = express.Router();

// Student dashboard

router.get('/dashboard', isStudentSession, async (req, res) => {
  console.log('🎯 Dashboard GET edildi! Giriş yapan:', req.user);

  try {
    const participatedQuizzes = await Quiz.find({
      'sessions.participants.user': req.user.id
    })
      .sort({ 'sessions.startTime': -1 })
      .limit(5);

    res.render('student-dashboard', {
      user: req.user,
      recentQuizzes: participatedQuizzes
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.redirect('/dashboard');
  }
});


// Join quiz page
router.get('/join', isStudentSession, (req, res) => {
  res.render('student-quiz', { user: req.user });
});

// Join quiz handler
router.post('/join', isStudentSession, async (req, res) => {
  try {
    const { quizCode } = req.body;

    // Quiz'i bul
    const quiz = await Quiz.findOne({
      'sessions.code': quizCode,
      'sessions.endTime': { $exists: false }
    });

    if (!quiz) {
      return res.render('join-quiz', {
        user: req.user,
        error: 'Geçersiz quiz kodu veya quiz aktif değil'
      });
    }

    // Öğrencinin daha önce katılıp katılmadığını kontrol et
    const session = quiz.sessions.find((s) => s.code === quizCode);
    const alreadyJoined = session.participants.some(
      (p) => p.user.toString() === req.user.id.toString()
    );

    if (alreadyJoined) {
      return res.render('join-quiz', {
        user: req.user,
        error: 'Bu quize zaten katıldınız'
      });
    }

    // Öğrenciyi katılımcılara ekle
    session.participants.push({
      user: req.user.id,
      name: req.user.fullName,
      score: 0,
      answers: []
    });

    await quiz.save();
    res.redirect(`/student/quiz/${quiz._id}?session=${quizCode}`);
  } catch (error) {
    console.error('Join quiz error:', error);
    res.render('join-quiz', {
      user: req.user,
      error: 'Quiz\'e katılırken bir hata oluştu'
    });
  }
});

// Quiz page
router.get('/quiz/:id', isStudentSession, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    const sessionCode = req.query.session;

    if (!quiz || !sessionCode) {
      return res.redirect('/student/dashboard');
    }

    const session = quiz.sessions.find((s) => s.code === sessionCode);
    if (!session) {
      return res.redirect('/student/dashboard');
    }

    const participant = session.participants.find(
      (p) => p.user.toString() === req.user.id.toString()
    );

    if (!participant) {
      return res.redirect('/student/dashboard');
    }

    res.render('quiz-session', {
      user: req.user,
      quiz,
      session: sessionCode,
      participant
    });
  } catch (error) {
    console.error('Quiz page error:', error);
    res.redirect('/student/dashboard');
  }
});

// Submit answer
router.post('/quiz/:id/answer', isStudentSession, async (req, res) => {
  try {
    const { questionIndex, answer, timeSpent, sessionCode } = req.body;

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz bulunamadı' });
    }

    const session = quiz.sessions.find((s) => s.code === sessionCode);
    if (!session) {
      return res.status(404).json({ error: 'Oturum bulunamadı' });
    }

    const participant = session.participants.find(
      (p) => p.user.toString() === req.user.id.toString()
    );

    if (!participant) {
      return res.status(403).json({ error: 'Bu quize katılmadınız' });
    }

    // Cevabı kontrol et
    const question = quiz.questions[questionIndex];
    const isCorrect = parseInt(answer) === question.correctOption;

    // Puanı hesapla
    const timeBonus = Math.max(0, 1 - timeSpent / (quiz.timeLimit * 1000));
    const points = isCorrect
      ? Math.round(quiz.pointsPerQuestion * (1 + timeBonus))
      : 0;

    // Cevabı kaydet
    participant.answers.push({
      questionIndex,
      answer: parseInt(answer),
      isCorrect,
      timeSpent
    });

    // Toplam puanı güncelle
    participant.score += points;

    await quiz.save();
    res.json({ isCorrect, points, correctOption: question.correctOption });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: 'Bir hata oluştu' });
  }
});

export default router;
