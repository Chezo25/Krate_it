export interface User {
  $id: string;
  email: string;
  name: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface FileDocument {
  $id: string;
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
  storageId: string;
  folderId?: string;
  userId: string;
  path: string;
  isShared: boolean;
  shareToken?: string;
  shareExpiry?: string;
  tags: string[];
  $createdAt: string;
  $updatedAt: string;
}

export interface FolderDocument {
  $id: string;
  name: string;
  parentId?: string;
  userId: string;
  path: string;
  isShared: boolean;
  shareToken?: string;
  shareExpiry?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface ActivityDocument {
  $id: string;
  userId: string;
  action: string;
  targetId: string;
  targetName: string;
  targetType: "file" | "folder";
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  $createdAt: string;
}

export interface ShareDocument {
  $id: string;
  resourceId: string;
  resourceType: "file" | "folder";
  ownerId: string;
  sharedWithUserId?: string;
  sharedWithEmail?: string;
  permissions: string[];
  token: string;
  expiresAt?: string;
  isPublic: boolean;
  $createdAt: string;
}

export interface AppwriteContext {
  userId: string;
  sessionId: string;
  user: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  documents: T[];
  total: number;
  offset: number;
  limit: number;
}