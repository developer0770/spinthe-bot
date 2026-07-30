export type EventRewardType = 'gift' | 'bottle' | 'hearts' | 'frame';

export interface EventRewardDTO {
  type: EventRewardType;
  id?: string;
  amount?: number;
  name: string;
  imageUrl: string;
}

export interface EventDTO {
  id: string;
  title: string;
  description: string;
  subtitle?: string;
  rewards: EventRewardDTO[];
  claimed: boolean;
  endsAt: string | null;
}
