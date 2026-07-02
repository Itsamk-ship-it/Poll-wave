import { api } from './api';
import type {
  AuthResponse,
  Category,
  Comment,
  DashboardStats,
  NotificationItem,
  Paginated,
  Poll,
  PollResults,
  User,
} from './types';

const unwrap = <T>(p: Promise<{ data: { data: T } }>) => p.then((r) => r.data.data);
const unwrapPage = <T>(p: Promise<{ data: any }>): Promise<Paginated<T>> =>
  p.then((r) => ({ data: r.data.data, meta: r.data.meta }));

// ── Auth ──────────────────────────────────────────────
export const authApi = {
  register: (body: { email: string; username: string; password: string; name?: string }) =>
    unwrap<AuthResponse>(api.post('/auth/register', body)),
  login: (body: { emailOrUsername: string; password: string }) =>
    unwrap<AuthResponse>(api.post('/auth/login', body)),
  me: () => unwrap<User>(api.get('/auth/me')),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    unwrap<{ message: string }>(api.post('/auth/change-password', body)),
};

// ── Polls ─────────────────────────────────────────────
export interface PollListParams {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  type?: string;
  sort?: string;
  status?: string;
}

export const pollsApi = {
  list: (params: PollListParams = {}) => unwrapPage<Poll>(api.get('/polls', { params })),
  mine: (params: PollListParams = {}) => unwrapPage<Poll>(api.get('/polls/mine', { params })),
  get: (idOrSlug: string) => unwrap<Poll>(api.get(`/polls/${idOrSlug}`)),
  results: (idOrSlug: string) => unwrap<PollResults>(api.get(`/polls/${idOrSlug}/results`)),
  share: (idOrSlug: string) =>
    unwrap<{ url: string; embed: string; slug: string; social: Record<string, string> }>(
      api.get(`/polls/${idOrSlug}/share`),
    ),
  create: (body: any) => unwrap<Poll>(api.post('/polls', body)),
  update: (id: string, body: any) => unwrap<Poll>(api.patch(`/polls/${id}`, body)),
  remove: (id: string) => unwrap<{ message: string }>(api.delete(`/polls/${id}`)),
  duplicate: (id: string) => unwrap<Poll>(api.post(`/polls/${id}/duplicate`)),
  archive: (id: string, value?: boolean) => unwrap<Poll>(api.post(`/polls/${id}/archive`, { value })),
  pin: (id: string, value?: boolean) => unwrap<Poll>(api.post(`/polls/${id}/pin`, { value })),
  close: (id: string, close = true) => unwrap<Poll>(api.post(`/polls/${id}/close`, { close })),
};

// ── Votes ─────────────────────────────────────────────
export const votesApi = {
  cast: (body: { pollId: string; optionIds: string[]; rating?: number }) =>
    unwrap<{ message: string; results: PollResults }>(api.post('/votes', body)),
  status: (pollId: string) =>
    unwrap<{ voted: boolean; optionIds: string[] }>(api.get(`/votes/${pollId}/status`)),
};

// ── Comments ──────────────────────────────────────────
export const commentsApi = {
  list: (pollId: string, params: { page?: number; limit?: number } = {}) =>
    unwrapPage<Comment>(api.get(`/comments/poll/${pollId}`, { params })),
  add: (pollId: string, content: string) =>
    unwrap<Comment>(api.post(`/comments/poll/${pollId}`, { content })),
  edit: (id: string, content: string) => unwrap<Comment>(api.patch(`/comments/${id}`, { content })),
  remove: (id: string) => unwrap<{ message: string }>(api.delete(`/comments/${id}`)),
  like: (id: string) => unwrap<{ liked: boolean; likeCount: number }>(api.post(`/comments/${id}/like`)),
  unlike: (id: string) => unwrap<{ liked: boolean; likeCount: number }>(api.delete(`/comments/${id}/like`)),
};

// ── Favorites ─────────────────────────────────────────
export const favoritesApi = {
  list: (params: { page?: number; limit?: number } = {}) =>
    unwrapPage<Poll>(api.get('/favorites', { params })),
  add: (pollId: string) => unwrap<{ favorited: boolean }>(api.post(`/favorites/${pollId}`)),
  remove: (pollId: string) => unwrap<{ favorited: boolean }>(api.delete(`/favorites/${pollId}`)),
  status: (pollId: string) => unwrap<{ favorited: boolean }>(api.get(`/favorites/${pollId}/status`)),
};

// ── Categories ────────────────────────────────────────
export const categoriesApi = {
  list: () => unwrap<Category[]>(api.get('/categories')),
  create: (body: { name: string; icon?: string; color?: string }) =>
    unwrap<Category>(api.post('/categories', body)),
};

// ── Search ────────────────────────────────────────────
export interface SearchResult {
  polls: { items: Poll[]; total: number; page: number; limit: number; totalPages: number };
  users: User[];
  categories: Category[];
  tags: { id: string; name: string; slug: string }[];
}
export const searchApi = {
  query: (params: { q?: string; type?: string; category?: string; sort?: string; page?: number; limit?: number }) =>
    unwrap<SearchResult>(api.get('/search', { params })),
};

// ── Notifications ─────────────────────────────────────
export const notificationsApi = {
  list: (params: { page?: number; limit?: number } = {}) =>
    unwrapPage<NotificationItem>(api.get('/notifications', { params })),
  unreadCount: () => unwrap<{ count: number }>(api.get('/notifications/unread-count')),
  markRead: (id: string) => unwrap<NotificationItem>(api.post(`/notifications/${id}/read`)),
  markAllRead: () => unwrap<{ updated: number }>(api.post('/notifications/read-all')),
  remove: (id: string) => unwrap<{ message: string }>(api.delete(`/notifications/${id}`)),
};

// ── Dashboard ─────────────────────────────────────────
export const dashboardApi = {
  get: () => unwrap<DashboardStats>(api.get('/dashboard')),
};

// ── Analytics ─────────────────────────────────────────
export interface PollAnalytics {
  totalViews: number;
  totalVotes: number;
  conversionRate: number;
  dailyActivity: { date: string; votes: number }[];
  topVotingTimes: { hour: number; votes: number }[];
  deviceBreakdown: Record<string, number>;
  browserBreakdown: Record<string, number>;
  options: PollResults['options'];
}
export const analyticsApi = {
  poll: (pollId: string) => unwrap<PollAnalytics>(api.get(`/analytics/poll/${pollId}`)),
};

// ── Users ─────────────────────────────────────────────
export interface UserProfile {
  id: string;
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
  counts: { polls: number; votes: number; followers: number; following: number };
  isFollowing: boolean;
}
export const usersApi = {
  profile: (username: string) => unwrap<UserProfile>(api.get(`/users/${username}`)),
  polls: (username: string, params: { page?: number; limit?: number } = {}) =>
    unwrapPage<Poll>(api.get(`/users/${username}/polls`, { params })),
  updateMe: (body: { name?: string; bio?: string; avatarUrl?: string; username?: string }) =>
    unwrap<User>(api.patch('/users/me', body)),
  follow: (username: string) => unwrap<{ following: boolean }>(api.post(`/users/${username}/follow`)),
  unfollow: (username: string) => unwrap<{ following: boolean }>(api.delete(`/users/${username}/follow`)),
};
