export interface CommunityUser {
  id: string;
  name: string;
  handle: string;
  avatar: number;
  bio: string;
  followersCount: number;
  followingCount: number;
  reviewsCount: number;
  listsCount: number;
  isFollowing?: boolean;
  topFavorites?: string[];
  joinedAt?: string;
}

export interface UserReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar: number;
  titleId: string;
  titleName: string;
  rating: number; // 1 to 5 stars
  reviewTitle: string;
  content: string;
  createdAt: string;
  likes: number;
  isLikedByMe?: boolean;
  containsSpoilers?: boolean;
}

export interface EpisodeDiscussion {
  id: string;
  userId: string;
  userName: string;
  userAvatar: number;
  titleId: string;
  titleName: string;
  seasonNum: number;
  episodeNum: number;
  episodeName: string;
  comment: string;
  createdAt: string;
  likes: number;
  isLikedByMe?: boolean;
  isSpoiler?: boolean;
}

export interface PublicList {
  id: string;
  userId: string;
  userName: string;
  userAvatar: number;
  title: string;
  description: string;
  isPublic: boolean;
  titleIds: string[];
  createdAt: string;
  likes: number;
  isLikedByMe?: boolean;
}

export interface Recommendation {
  id: string;
  userId: string;
  userName: string;
  userAvatar: number;
  titleId: string;
  titleName: string;
  titleBackdrop?: string;
  note: string;
  createdAt: string;
  likes: number;
  isLikedByMe?: boolean;
}

export type CommunityTab = 'feed' | 'lists' | 'reviews' | 'debates';

