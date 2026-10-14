/** A single photo as the client sees it. Mirrors a subset of a Drive file resource. */
export interface Photo {
  id: string;
  name: string;
  createdTime: string;
  /** Natural pixel width, when Drive was able to read it from the file. */
  width: number | null;
  /** Natural pixel height, when Drive was able to read it from the file. */
  height: number | null;
  mimeType: string;
}

export interface GalleryResponse {
  photos: Photo[];
  nextPageToken: string | null;
}

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'error';

export interface UploadTask {
  id: string;
  fileName: string;
  status: UploadStatus;
  progress: number;
  errorMessage?: string;
}

export interface ApiErrorBody {
  error: string;
}
