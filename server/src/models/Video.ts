import { Schema, model, Document, Types } from 'mongoose';

export interface IQualityVariant {
  label: string; // e.g. '1080p', '720p', '480p', '360p', 'Auto'
  url: string;
  bitrate?: number;
}

export interface IVideo extends Document {
  title: string;
  slug: string;
  description: string;
  releaseYear: number;
  duration: number; // in minutes
  ageRating: string;
  genres: Types.ObjectId[];
  categories: Types.ObjectId[];
  cast: string[];
  director: string;

  // Assets (all hosted on Cloudflare R2)
  poster: string;
  banner: string;
  trailerUrl: string;

  // Video streaming
  videoUrl: string;          // direct MP4 or HLS master playlist URL
  hlsMasterPlaylistUrl: string;
  qualities: IQualityVariant[];
  rawVideoKey: string;       // R2 key of the original uploaded file

  // Metadata
  status: 'draft' | 'published' | 'processing';
  isFeatured: boolean;
  isTrending: boolean;
  views: number;
  averageRating: number;
  tags: string[];
  language: string;

  createdAt: Date;
  updatedAt: Date;
}

const qualitySchema = new Schema<IQualityVariant>(
  {
    label: { type: String, required: true },
    url: { type: String, required: true },
    bitrate: { type: Number },
  },
  { _id: false }
);

const videoSchema = new Schema<IVideo>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    releaseYear: { type: Number, default: new Date().getFullYear() },
    duration: { type: Number, default: 0 },
    ageRating: { type: String, default: 'NR' },
    genres: [{ type: Schema.Types.ObjectId, ref: 'Genre' }],
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    cast: [{ type: String }],
    director: { type: String, default: '' },

    poster: { type: String, default: '' },
    banner: { type: String, default: '' },
    trailerUrl: { type: String, default: '' },

    videoUrl: { type: String, default: '' },
    hlsMasterPlaylistUrl: { type: String, default: '' },
    qualities: { type: [qualitySchema], default: [] },
    rawVideoKey: { type: String, default: '' },

    status: {
      type: String,
      enum: ['draft', 'published', 'processing'],
      default: 'draft',
    },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 10 },
    tags: [{ type: String }],
    language: { type: String, default: 'English' },
  },
  { timestamps: true }
);

videoSchema.index({ title: 'text', description: 'text', tags: 'text' });
videoSchema.index({ status: 1, isFeatured: 1, isTrending: 1 });
videoSchema.index({ slug: 1 }, { unique: true });

export const Video = model<IVideo>('Video', videoSchema);
