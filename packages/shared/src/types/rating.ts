export type RatingCategory = 'kisses' | 'music' | 'hearts' | 'couples' | 'smile';
export type RatingPeriod = 'day' | 'week' | 'month' | 'all_time';

export interface RatingRowDTO {
  rank: number;
  userId: number;
  name: string;
  avatarUrl: string | null;
  score: number;
  isMe: boolean;
}
