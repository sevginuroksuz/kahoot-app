// middlewares/auth.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// 1) Genel JWT kontrolü
export const auth = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/login');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);
    if (!user) throw new Error('Kullanıcı bulunamadı');

    req.token = token;
    req.user = user;
    return next();
  } catch (err) {
    res.clearCookie('token');
    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }
};

// 2) Rol kontrolü middleware’i
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      req.flash('error', 'Bu sayfaya erişim yetkiniz yok');
      const redirectPath =
        req.user.role === 'teacher'
          ? '/teacher/dashboard'
          : '/student/dashboard';
      return res.redirect(redirectPath);
    }
    return next();
  };
};

// 3) Token üretme yardımcı
export const generateToken = (user, rememberMe = false) => {
  const expiresIn = rememberMe ? '30d' : '1d';
  return jwt.sign(
    { _id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

// 4) Cookie’ye token koyma
export const setTokenCookie = (res, token, rememberMe = false) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: rememberMe
      ? 30 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000,
  };
  res.cookie('token', token, cookieOptions);
};

// 5) Kolay alias
export const isAuthenticated = auth;

// 6) Teacher oturum kontrolü
export const isTeacherSession = (req, res, next) => {
  if (req.session.user?.role === 'teacher') {
    req.user = req.session.user;
    return next();
  }
  req.flash('error', 'Lütfen öğretmen olarak giriş yapın');
  return res.redirect('/auth/login');
};

// 7) Student oturum kontrolü
export const isStudentSession = (req, res, next) => {
  if (req.session.user?.role === 'student') {
    req.user = req.session.user;
    return next();
  }
  req.flash('error', 'Lütfen giriş yapın');
  return res.redirect('/auth/login');
};
