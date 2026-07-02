export type PollType =
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'YES_NO'
  | 'RATING'
  | 'EMOJI'
  | 'IMAGE_CHOICE';

export type Visibility = 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
export type PollStatus = 'active' | 'closed' | 'archived';

export interface User {
  id: string;
  email?: string;
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  pollCount?: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface PollOption {
  id: string;
  text: string;
  imageUrl: string | null;
  order: number;
  voteCount: number;
}

export interface Poll {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  type: PollType;
  visibility: Visibility;
  allowMultiple: boolean;
  oneVotePerIp: boolean;
  requireLogin: boolean;
  commentsDisabled: boolean;
  isPinned: boolean;
  isArchived: boolean;
  status: PollStatus;
  expiresAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  voteCount: number;
  category: Category | null;
  tags: Tag[];
  options: PollOption[];
  author: Pick<User, 'id' | 'username' | 'name' | 'avatarUrl'> | null;
  counts: { comments?: number; favorites?: number; votes?: number };
  isFavorited: boolean;
}

export interface OptionResult {
  optionId: string;
  text: string;
  imageUrl: string | null;
  order: number;
  votes: number;
  percentage: number;
}

export interface PollResults {
  pollId: string;
  totalVotes: number;
  options: OptionResult[];
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: Pick<User, 'id' | 'username' | 'name' | 'avatarUrl'>;
  likeCount: number;
  likedByMe: boolean;
}

export interface NotificationItem {
  id: string;
  type: 'VOTE' | 'COMMENT' | 'EXPIRED' | 'MILESTONE' | 'FOLLOW';
  message: string;
  pollId: string | null;
  read: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalPolls: number;
  activePolls: number;
  closedPolls: number;
  totalVotesReceived: number;
  publicPolls: number;
  privatePolls: number;
  totalViews: number;
  recentPolls: Poll[];
  popularPolls: Poll[];
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
