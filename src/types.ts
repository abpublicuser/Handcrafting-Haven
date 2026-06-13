import { Timestamp } from 'firebase/firestore';

export interface Album {
  id: string;
  name: string;
  coverImageUrl: string;
  userId: string;
  userName: string;
  createdAt: Timestamp;
}

export interface MomentImage {
  url: string;
  comment: string;
}

export interface Moment {
  id: string;
  albumId: string;
  date: string;
  images: MomentImage[];
  note: string;
  userId: string;
  userName: string;
  createdAt: Timestamp;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
