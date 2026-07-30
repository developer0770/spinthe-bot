import { useState } from 'react';
import Header from '../components/layout/Header';
import { useUserStore } from '../store/userStore';
import { hapticSelect } from '../utils/telegram';
import ProfileSetup from '../components/onboarding/ProfileSetup';
import GameTable from '../components/game/GameTable';

type Stage = 'welcome' | 'onboarding' | 'game';

/**
 * После успешной авторизации последовательно показываем:
 *   1. Экран приветствия «Ты вошёл в игру» с кнопкой «Начать играть»
 *   2. Онбординг (пол и возраст) — если пользователь новый
 *   3. Игровой стол
 */
export default function GameScreen() {
  const me = useUserStore((s) => s.me);
  const [stage, setStage] = useState<Stage>(
    me && me.gender && me.age ? 'game' : 'welcome',
  );

  if (stage === 'welcome') {
    return (
      <div className="fixed inset-0 flex flex-col bg-header">
        <Header />

        <div className="flex-1 pt-14 pb-12 flex flex-col items-center justify-center px-4">
          <div className="w-24 h-24 rounded-full bg-lime flex items-center justify-center mb-6 shadow-xl text-4xl">
            ✓
          </div>

          <h2 className="text-white text-2xl font-bold mb-2">Добро пожаловать!</h2>
          <p className="text-white/70 text-center mb-4">
            Ты успешно вошёл в игру «Целуй и Знакомься»
          </p>

          {me && (
            <div className="bg-white/10 rounded-xl p-4 w-full max-w-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center flex-shrink-0">
                  {me.avatarUrl ? (
                    <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">👤</span>
                  )}
                </div>
                <div className="text-white min-w-0">
                  <div className="font-semibold text-lg truncate">
                    {me.name || 'Игрок'}
                  </div>
                  <div className="text-sm text-white/60">
                    {me.gender === 'female' ? '👩 Девушка' : me.gender === 'male' ? '👨 Парень' : 'Пол не указан'}
                    {me.age ? `, ${me.age}` : ''}
                  </div>
                  <div className="text-sm text-heart">
                    ❤️ {me.hearts} сердечек
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              hapticSelect();
              // Если профиль не заполнен — ведём на онбординг, иначе сразу в игру
              if (me && me.gender && me.age) {
                setStage('game');
              } else {
                setStage('onboarding');
              }
            }}
            className="mt-6 px-10 py-3 bg-lime text-white font-bold rounded-full shadow-lg hover:bg-lime-dark transition active:scale-95 text-lg"
          >
            Начать играть
          </button>
        </div>

        <div className="fixed bottom-0 left-0 right-0 h-10 bg-header-dark flex items-center justify-center text-white/50 text-sm">
          @spinthe_bot
        </div>
      </div>
    );
  }

  if (stage === 'onboarding') {
    return (
      <>
        <Header />
        <ProfileSetup onComplete={() => setStage('game')} />
      </>
    );
  }

  // stage === 'game'
  return <GameTable />;
}
