// routes/auth.js
import express from 'express';
import bcrypt  from 'bcryptjs';
import User    from '../models/User.js';

const router = express.Router();

// Register route
router.post('/register', async (req, res, next) => {
  console.log('REGISTER BODY:', req.body);
  try {
    const { firstName, lastName, email, password, confirmPassword, role } = req.body;

    // Şifre kuralları: en az 1 büyük, 1 küçük, 1 rakam
    if (!/[A-Z]/.test(password) ||
        !/[a-z]/.test(password) ||
        !/\d/.test(password)) {
      req.flash('error', 'Şifre en az bir büyük harf, bir küçük harf ve bir rakam içermelidir');
      return res.redirect('/register');
    }

    // Şifre eşleşme kontrolü
    if (password !== confirmPassword) {
      req.flash('error', 'Şifreler eşleşmiyor');
      return res.redirect('/register');
    }

    // Email kontrolü
    if (await User.findOne({ email })) {
      req.flash('error', 'Bu e-posta zaten kayıtlı');
      return res.redirect('/register');
    }

    // Yeni kullanıcıyı oluşturuyoruz; pre-save hook hash’leyecek
    const user = new User({ firstName, lastName, email, password, role });
    await user.save();

    console.log('USER CREATED:', user._id);
    req.flash('success', 'Kayıt başarılı, lütfen giriş yapın');
    return res.redirect('/login');
  } catch (err) {
    console.error('REGISTER ERROR:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      req.flash('error', messages.join(' | '));
      return res.redirect('/register');
    }
    return next(err);
  }
});

// Login route
router.post('/login', async (req, res, next) => {
  console.log('LOGIN BODY:', req.body);
  try {
    const { email, password, rememberMe } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      console.log('❌ Kullanıcı bulunamadı');
      req.flash('error', 'Kullanıcı bulunamadı');
      return res.redirect('/login');
    }

    const match = await user.comparePassword(password);
    console.log('🧪 Password eşleşti mi?:', match);

    if (!match) {
      console.log('❌ Şifre eşleşmedi');
      req.flash('error', 'Şifre yanlış');
      return res.redirect('/login');
    }

    // Başarılı giriş:
    console.log('✅ Login başarılı! Rol:', user.role);

    req.session.user = {
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role
    };

    req.user = user; 

    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    }

    if (user.role === 'teacher') {
      return res.redirect('/teacher/dashboard');
    } else if (user.role === 'student') {
      return res.redirect('/student/dashboard');
    } else {
      req.flash('error', 'Kullanıcı rolü tanımsız');
      return res.redirect('/login');
    }

  } catch (err) {
    console.error('LOGIN ERROR:', err);
    return next(err);
  }
});


// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    return res.redirect('/');
  });
});

export default router;
