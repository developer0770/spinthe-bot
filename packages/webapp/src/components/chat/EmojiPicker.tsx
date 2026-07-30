import { motion } from 'framer-motion';

export const COMMON_EMOJIS = [
  '😀','😁','😂','🤣','😊','😍','🥰','😘','😎','🤩','😇','🥳','😜','🤪','😏',
  '😉','🙂','🙃','😋','🤗','🤭','🤫','🤔','🤐','😴','🥱','😪','😤','😭','😢',
  '🥺','😡','🤬','😱','😨','😰','🤯','😳','🥵','🥶','😱','🤗','💋','❤️','💔',
  '💖','💘','💞','💘','💕','💗','🔥','✨','🌟','⭐','🎉','🎊','🎁','🌹','🌸',
  '🍷','🍸','🍹','🧸','🌹','💄','👗','🍾','🍻','👀','👏','🙌','👋','🫶','💑',
  '🍒','🍓','🍑','🌈','☀️','🌙','⭐','💫','💯','💥','🍀','🎵','🎶','🕺','💃',
];

interface Props {
  onPick: (emoji: string) => void;
  onStickers?: () => void;
  stickers?: boolean;
}

export default function EmojiPicker({ onPick }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="absolute bottom-full left-0 right-0 mb-2 bg-bg-800 border border-white/10 rounded-2xl p-3 shadow-2xl max-h-56 overflow-y-auto no-scrollbar grid grid-cols-8 gap-1"
    >
      {COMMON_EMOJIS.map((e, i) => (
        <button
          key={i}
          onClick={() => onPick(e)}
          className="text-2xl hover:bg-white/10 rounded-lg p-1 active:scale-90 transition"
        >
          {e}
        </button>
      ))}
    </motion.div>
  );
}
