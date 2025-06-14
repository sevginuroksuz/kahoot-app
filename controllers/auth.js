import User, { findOne } from '../models/ser';
import { generateToken, setTokenCookie } from '../middlewares/auth';
import { createTransport } from 'nodemailer';
import { randomBytes, createHash } from 'crypto';
import { hash } from 'bcryptjs';
require('dotenv').config();



// Email transporter configuration
const transporter = createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});


// Register sayfasını göster
export function getRegister(req, res) {
    res.render('register', { messages: req.flash() });
}

// Register işlemi
export async function postRegister(req, res) {
    try {
        const { firstName, lastName, email, password, role } = req.body;

        // Email kontrolü
        const existingUser = await findOne({ email });
        if (existingUser) {
            req.flash('error', 'Bu email adresi zaten kullanılıyor');
            return res.redirect('/register');
        }

        // Yeni kullanıcı oluştur
        const user = new User({
            firstName,
            lastName,
            email,
            password,
            role
        });

        await user.save();

        // Token oluştur ve cookie'ye kaydet
        const token = generateToken(user, false);
        setTokenCookie(res, token, false);

        // Role göre yönlendir
        if (user.role === 'teacher') {
            res.redirect('/teacher/dashboard');
        } else {
            res.redirect('/student/dashboard');
        }
    } catch (error) {
        console.error('Register error:', error);
        req.flash('error', 'Kayıt olurken bir hata oluştu');
        res.redirect('/register');
    }
}

export async function postLogin(req, res) {
    
    try {
        const { email, password, rememberMe } = req.body;

        const user = await findOne({ email });
        if (!user) {
            req.flash('error', 'Email veya şifre hatalı');
            return res.redirect('/login');
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
        //     req.flash('error', 'Email veya şifre hatalı');
        //     return res.redirect('/login');
        // }
                return res.render('login', {
                    messages: { error: ['Email veya şifre hatalı'] }
                });
        }

        // Kullanıcıyı session'a kaydet
        req.session.user = {
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
        };

        const token = generateToken(user, rememberMe);
        setTokenCookie(res, token, rememberMe);

        const returnTo = req.session.returnTo || (user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
        delete req.session.returnTo;
        res.redirect(returnTo);
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'Giriş yapılırken bir hata oluştu');
        res.redirect('/login');
    }
}


// Şifremi unuttum sayfasını göster
export function getForgotPassword(req, res) {
    res.render('forgot-password', { messages: req.flash() });
}

// Şifremi unuttum işlemi
export async function postForgotPassword(req, res) {
    try {
        const { email } = req.body;

        const user = await findOne({ email });
        if (!user) {
            req.flash('error', 'Bu email adresiyle kayıtlı kullanıcı bulunamadı');
            return res.redirect('/forgot-password');
        }

        const resetToken = randomBytes(32).toString('hex');
        const resetPasswordToken = createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = resetPasswordToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 saat
        await user.save({ validateBeforeSave: false });

        const resetURL = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: 'Şifre Sıfırlama',
            html: `
                <h1>Şifre Sıfırlama</h1>
                <p>Merhaba ${user.firstName}, aşağıdaki linkle şifreni sıfırla:</p>
                <a href="${resetURL}">Şifremi Sıfırla</a>
                <p>Bu link 1 saat içinde geçerlidir.</p>
            `
        };

        await transporter.sendMail(mailOptions);

        req.flash('success', 'Şifre sıfırlama linki email adresinize gönderildi');
        res.redirect('/login');
    } catch (error) {
        console.error('Forgot password error:', error);
        req.flash('error', 'Şifre sıfırlama sırasında bir hata oluştu');
        res.redirect('/forgot-password');
    }
}



export async function getResetPassword(req, res) {
    try {
        const resetToken = createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await findOne({
            resetPasswordToken: resetToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error', 'Şifre sıfırlama linki geçersiz veya süresi dolmuş');
            return res.redirect('/forgot-password');
        }

        res.render('reset-password', {
            token: req.params.token,
            messages: req.flash()
        });
    } catch (error) {
        console.error('Reset password page error:', error);
        req.flash('error', 'Bir hata oluştu');
        res.redirect('/forgot-password');
    }
}


export async function postResetPassword(req, res) {
    try {
        const { token, password } = req.body;

        const resetPasswordToken = createHash('sha256').update(token).digest('hex');

        const user = await findOne({
            resetPasswordToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.flash('error', 'Şifre sıfırlama linki geçersiz veya süresi dolmuş');
            return res.redirect('/forgot-password');
        }

        const hashedPassword = await hash(password, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save({ validateBeforeSave: false });


        req.flash('success', 'Şifreniz başarıyla güncellendi');
        res.redirect('/login');
    } catch (error) {
        console.error('Reset password error:', error);
        req.flash('error', 'Şifre güncellenirken bir hata oluştu');
        res.redirect('back');
    }
}


// Çıkış yap
export function logout(req, res) {
    res.clearCookie('token');
    res.redirect('/login');
} 

export function getLogin(req, res) {
    res.render('login', { messages: req.flash() });
}