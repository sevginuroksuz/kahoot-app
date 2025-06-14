// routes/profile.js (ES Module)
import express from 'express';
import { auth } from '../middlewares/auth.js';

const router = express.Router();

// Profil sayfası
router.get('/', auth, async (req, res) => {
  try {
    res.render('profile', {
      user: req.user,
      messages: req.flash()
    });
  } catch (error) {
    console.error('Profile error:', error);
    req.flash('error', 'Profil sayfası yüklenirken bir hata oluştu');
    res.redirect('back');
  }
});

// Profil güncelleme
router.post('/update', auth, async (req, res) => {
  try {
    const { firstName, lastName, email, currentPassword, newPassword, confirmPassword } = req.body;
    const user = req.user;

    // Email değişiklik kontrolü
    if (email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailExists) {
        req.flash('error', 'Bu email adresi başka bir kullanıcı tarafından kullanılıyor');
        return res.redirect('/profile');
      }
    }

    // Şifre değişikliği kontrolü
    if (currentPassword && newPassword) {
      if (newPassword !== confirmPassword) {
        req.flash('error', 'Yeni şifreler uyuşmuyor');
        return res.redirect('/profile');
      }
      const isValid = await user.comparePassword(currentPassword);
      if (!isValid) {
        req.flash('error', 'Mevcut şifre yanlış');
        return res.redirect('/profile');
      }
      user.password = newPassword;
    }

    // Diğer bilgileri güncelle
    user.firstName = firstName;
    user.lastName = lastName;
    user.email = email;

    await user.save();
    req.flash('success', 'Profil başarıyla güncellendi');
    res.redirect('/profile');
  } catch (error) {
    console.error('Profile update error:', error);
    req.flash('error', 'Profil güncellenirken bir hata oluştu');
    res.redirect('/profile');
  }
});

export default router;
