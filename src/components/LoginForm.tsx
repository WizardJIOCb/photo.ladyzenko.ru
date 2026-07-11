"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Images, LockKeyhole, Sparkles } from "lucide-react";

export default function LoginForm({ inviteCode = "" }: { inviteCode?: string }) {
  const [register, setRegister] = useState(Boolean(inviteCode));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/auth/${register ? "register" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const data = await response.json();
    if (response.ok) window.location.href = "/archive";
    else {
      setError(data.error || "Что-то пошло не так");
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="brand brand--light"><span className="brand-mark">Ф</span><span>Фото</span></div>
        <div className="memory-collage" aria-hidden="true">
          <div className="collage-card collage-card--one"><span>лето</span></div>
          <div className="collage-card collage-card--two"><span>вместе</span></div>
          <div className="collage-card collage-card--three"><span>дом</span></div>
          <div className="collage-flower">✣</div>
        </div>
        <div className="login-quote">
          <Sparkles size={18} />
          <blockquote>«Счастлив тот, кто счастлив у себя дома»</blockquote>
          <span>Лев Толстой</span>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="login-mobile-brand brand"><span className="brand-mark">Ф</span><span>Фото</span></div>
          <div className="eyebrow"><Images size={15} /> Семейный архив</div>
          <h1>{register ? "Создадим ваш архив" : "С возвращением"}</h1>
          <p>{register ? "Соберите все семейные истории в одном надёжном месте." : "Ваши воспоминания уже ждут вас внутри."}</p>
          <form onSubmit={submit} className="auth-form">
            {register && <label>Как вас зовут<input name="name" required autoComplete="name" placeholder="Например, Анна" /></label>}
            <label>Электронная почта<input name="email" type="email" required autoComplete="email" placeholder="name@example.com" /></label>
            <label>Пароль<div className="password-field"><input name="password" type={showPassword ? "text" : "password"} minLength={register ? 8 : 1} required autoComplete={register ? "new-password" : "current-password"} placeholder="••••••••" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Показать пароль">{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
            {register && inviteCode ? <div className="invite-accepted"><CheckCircle2 /><span><b>Приглашение в семью получено</b><small>После регистрации вы сразу попадёте в общий архив.</small></span><input type="hidden" name="inviteCode" value={inviteCode} /></div> : register && <label>Семейный код<input name="inviteCode" required autoComplete="off" placeholder="Код из приглашения" /></label>}
            {error && <div className="form-error">{error}</div>}
            <button className="button button--primary button--wide" disabled={loading}>
              {loading ? "Подождите…" : register ? "Создать архив" : "Войти в архив"}<ArrowRight size={18} />
            </button>
          </form>
          <button className="auth-switch" onClick={() => { setRegister(!register); setError(""); }}>
            {register ? "Уже есть аккаунт? Войти" : "Впервые здесь? Создать аккаунт"}
          </button>
          <div className="privacy-note"><LockKeyhole size={14} /> Личный архив. Доступ есть только у вашей семьи.</div>
        </div>
      </section>
    </main>
  );
}
