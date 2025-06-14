// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Ad alanı zorunludur'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Soyad alanı zorunludur'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email alanı zorunludur'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      message: 'Geçerli bir email adresi girin'
    }
  },
  password: {
    type: String,
    required: [true, 'Şifre alanı zorunludur'],
    minlength: [8, 'Şifre en az 8 karakter olmalıdır']
    // eski `validate` bloğu burada kaldırıldı
  },
  role: {
    type: String,
    enum: ['student', 'teacher'],
    required: [true, 'Rol seçilmelidir']
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// fullName sanal alanı
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// save öncesi hook: eğer password değiştiyse hash’le
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// comparePassword metodu
userSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// reset token üretme
userSchema.methods.generateResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpires = Date.now() + 3600000; // 1 saat
  return resetToken;
};

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
