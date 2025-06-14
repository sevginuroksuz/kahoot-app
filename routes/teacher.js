import express from 'express';
import { isTeacherSession } from '../middlewares/auth.js';
import Quiz from '../models/Quiz.js';
import { activeSessions } from '../socket-session.js'; 

const router = express.Router();

// Teacher dashboard
router.get('/dashboard', isTeacherSession, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ creator: req.user._id });
    res.render('dashboard', { user: req.user, quizzes });
  } catch (error) {
    console.error('Teacher dashboard error:', error);
    res.redirect('/dashboard');
  }
});

// Create quiz page
router.get('/create-quiz', isTeacherSession, (req, res) => {
  res.render('create-quiz', { user: req.user });
});

// Create quiz handler
router.post('/create-quiz', isTeacherSession, async (req, res) => {
  try {
    const { title, description, timeLimit, pointsPerQuestion, questions } = req.body;

    const formattedQuestions = Object.values(questions).map(q => ({
      text: q.text,
      options: Object.values(q.options),
      correctOption: parseInt(q.correctOption)
    }));

    const quiz = new Quiz({
      title,
      description,
      timeLimit,
      pointsPerQuestion,
      creator: req.user.id,
      questions: formattedQuestions
    });

    await quiz.save();
    res.redirect('/teacher/quizzes');
  } catch (error) {
    console.error('Create quiz error:', error);
    res.render('create-quiz', {
      user: req.user,
      error: 'Quiz oluşturulurken bir hata oluştu'
    });
  }
});

// List quizzes
router.get('/quizzes', isTeacherSession, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ creator: req.user.id });
    res.render('my-quizzes', { user: req.user, quizzes });
  } catch (error) {
    console.error('List quizzes error:', error);
    res.redirect('/dashboard');
  }
});

// Edit quiz page
router.get('/edit-quiz/:id', isTeacherSession, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      creator: req.user._id
    });
    if (!quiz) return res.redirect('/teacher/quizzes');
    res.render('edit-quiz', { user: req.user, quiz });
  } catch (error) {
    console.error('Edit quiz error:', error);
    res.redirect('/teacher/quizzes');
  }
});

// Update quiz
router.post('/edit-quiz/:id', isTeacherSession, async (req, res) => {
  try {
    await Quiz.findOneAndUpdate(
      { _id: req.params.id, creator: req.user._id },
      req.body
    );
    res.redirect('/teacher/quizzes');
  } catch (error) {
    console.error('Update quiz error:', error);
    res.redirect('/teacher/quizzes');
  }
});

// Delete quiz
router.delete('/quiz/:id', isTeacherSession, async (req, res) => {
  try {
    await Quiz.findOneAndDelete({
      _id: req.params.id,
      creator: req.user._id
    });
    res.sendStatus(200);
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.sendStatus(500);
  }
});

// Quiz results
router.get('/quiz/:id/results', isTeacherSession, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({
      _id: req.params.id,
      creator: req.user._id
    });
    if (!quiz) return res.redirect('/teacher/quizzes');
    const stats = quiz.getSessionStats(req.query.session);
    res.render('quiz-results', { user: req.user, quiz, stats });
  } catch (error) {
    console.error('Quiz results error:', error);
    res.redirect('/teacher/quizzes');
  }
});

// Start quiz session

function generateSessionCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

//  Quiz Başlatma Rotası
router.get('/start-quiz/:id', isTeacherSession, async (req, res) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) return res.status(404).send('Quiz bulunamadı');

  let sessionCode;
  do {
    sessionCode = generateSessionCode();
  } while (activeSessions.has(sessionCode)); // benzersiz olmalı

  activeSessions.set(sessionCode, {
    quizId: quiz._id,
    participants: new Map()
  });

  // 🔁 Öğretmen için doğru yönlendirme:
  res.redirect(`/session/${sessionCode}`);

});

// Öğretmen canlı oturum sayfası
router.get('/session/:code', isTeacherSession, (req, res) => {
  res.render('teacher-session', { code: req.params.code });
});


function startSession() {
  socket.emit('start-session', {
    quizId: '<%= quiz._id %>',
    code: '<%= session %>'
  });
}

export default router;

