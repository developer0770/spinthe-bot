import { motion } from 'framer-motion';

/**
 * Экран загрузки: показывает спиннер и текст «Подключение к игре...».
 */
export default function AuthLoading({ error }: { error?: string | null }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-header">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="w-20 h-20 mb-6"
      >
        <div className="w-20 h-20 rounded-full border-4 border-lime/30 border-t-lime" />
      </motion.div>

      {error ? (
        <div className="px-6 text-center">
          <p className="text-danger text-lg mb-3">⚠️ Ошибка подключения</p>
          <p className="text-gray-300 text-sm mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-lime text-white rounded-lg font-semibold"
          >
            Попробовать снова
          </button>
        </div>
      ) : (
        <p className="text-white/80 text-lg">Подключение к игре…</p>
      )}

      <p className="absolute bottom-6 text-gray-500 text-sm">@spinthe_bot</p>
    </div>
  );
}
