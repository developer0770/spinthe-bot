import { useAuth } from './hooks/useAuth';
import AuthLoading from './components/splash/AuthLoading';
import SplashScreen from './screens/SplashScreen';
import { useAuthStore } from './store/authStore';

/**
 * Корень приложения.
 * 1) useAuth — обменивает Telegram initData на JWT при старте.
 * 2) Пока грузится — AuthLoading.
 * 3) После авторизации — SplashScreen (приветственная анимация) → GameRoot (с навигацией).
 */
export default function App() {
  const { status, error } = useAuth();
  const user = useAuthStore((s) => s.user);

  if (status === 'loading' || status === 'idle' || !user) {
    return <AuthLoading error={error} />;
  }

  if (status === 'error') {
    return <AuthLoading error={error} />;
  }

  return <SplashScreen />;
}
