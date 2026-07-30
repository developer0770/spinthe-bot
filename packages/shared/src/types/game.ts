export type GameStatus = 'waiting' | 'spinning' | 'choosing' | 'chatting' | 'finished';
export type ChoiceType = 'kiss' | 'reject' | null;

export interface GameDTO {
  id: string;
  tableId: number;
  currentStep: number;
  totalSteps: number;
  currentSpinnerId: number | null;
  currentTargetId: number | null;
  status: GameStatus;
  isTutorial: boolean;
}

export interface SpinResultDTO {
  spinnerId: number;
  targetId: number;
  rotationDeg: number;
  step: number;
}
