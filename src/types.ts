export interface SavedTikTok {
  id: string;
  url: string;
  originalUrl?: string;
  isWatched?: boolean;
  metadataStatus?: 'loading' | 'ready' | 'unavailable';
  videoId?: string;
  embedUrl?: string;
  title: string;
  authorName: string;
  authorHandle: string;
  thumbnailUrl?: string;
  collectionId: string;
  tags: string[];
  notes: string;
  isFavorite: boolean;
  createdAt: string;
  publishedAt?: string;
}

export interface CollectionFolder {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface VaultBackup {
  profile?: import('./Onboarding').VaultProfile;
  version: number;
  exportedAt: string;
  collections: CollectionFolder[];
  items: SavedTikTok[];
}
