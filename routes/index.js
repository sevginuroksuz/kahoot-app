// routes/index.js
import express from 'express';
import { auth } from '../middlewares/auth.js';

const router = express.Router();

// Ana sayfa
// Eğer kullanıcı girişliyse dashboard’a yönlendir, değilse index.ejs render et
router.get('/', (req, res) => {
  if (req.cookies?.token) {
    return res.redirect('/dashboard');
  }
  res.render('index');
});

// Giriş sayfası
router.get('/login', (req, res) => {
  res.render('login', {
    messages: {
      error:   req.flash('error'),
      success: req.flash('success')
    }
  });
});

// Kayıt sayfası
router.get('/register', (req, res) => {
  res.render('register', {
    messages: {
      error:   req.flash('error'),
      success: req.flash('success')
    }
  });
});

// Şifre unuttum sayfası
router.get('/forgot-password', (req, res) => {
  res.render('forgot-password', {
    messages: {
      error:   req.flash('error'),
      success: req.flash('success')
    }
  });
});

// Şifre sıfırlama sayfası (token ile)
router.get('/reset-password/:token', (req, res) => {
  res.render('reset-password', {
    token: req.params.token,
    messages: {
      error:   req.flash('error'),
      success: req.flash('success')
    }
  });
});

// Dashboard yönlendirmesi (korumalı)
router.get('/dashboard', auth, (req, res) => {
  if (req.user.role === 'teacher') {
    res.redirect('/teacher/dashboard');
  } else {
    res.redirect('/student/dashboard');
  }
});

export default router;
