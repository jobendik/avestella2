import mongoose, { Schema, Document, Model } from 'mongoose';

// ==========================================
// Screenshot Model
// ==========================================

export interface IScreenshot extends Document {
  screenshotId: string;
  playerId: string;
  playerName: string;
  
  // Storage references
  imageRef: string;           // S3/Firebase Storage reference
  thumbnailRef?: string;      // Thumbnail for gallery view
  
  // Capture settings
  filter: string;             // Filter applied (none, warm, cool, vintage, etc.)
  template: string;           // Template used (minimal, stats, social, etc.)
  caption?: string;
  
  // Game state at capture
  stats: {
    fragments: number;
    bonds: number;
    beacons: number;
    level: number;
    stardust: number;
  };
  
  // Location data
  location: {
    x: number;
    y: number;
    realm: string;
    biome?: string;
  };
  
  // Social data
  visiblePlayers: Array<{
    playerId: string;
    playerName: string;
  }>;
  
  // Sharing tracking
  shares: Array<{
    platform: string;
    timestamp: Date;
  }>;
  
  // Public gallery
  isPublic: boolean;
  likes: number;
  likedBy: string[];
  
  // Metadata
  fileSize: number;
  dimensions: {
    width: number;
    height: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const ScreenshotSchema = new Schema<IScreenshot>({
  screenshotId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  playerId: {
    type: String,
    required: true,
    index: true
  },
  playerName: {
    type: String,
    required: true
  },
  imageRef: {
    type: String,
    required: true
  },
  thumbnailRef: String,
  filter: {
    type: String,
    default: 'none',
    enum: ['none', 'warm', 'cool', 'vintage', 'neon', 'dreamy', 'dramatic', 'soft']
  },
  template: {
    type: String,
    default: 'minimal',
    enum: ['minimal', 'stats', 'social', 'artistic', 'celebration']
  },
  caption: {
    type: String,
    maxlength: 200
  },
  stats: {
    fragments: { type: Number, default: 0 },
    bonds: { type: Number, default: 0 },
    beacons: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    stardust: { type: Number, default: 0 }
  },
  location: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    realm: { type: String, required: true },
    biome: String
  },
  visiblePlayers: [{
    playerId: String,
    playerName: String
  }],
  shares: [{
    platform: { type: String, enum: ['twitter', 'facebook', 'instagram', 'discord', 'link'] },
    timestamp: { type: Date, default: Date.now }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: {
    type: [String],
    default: []
  },
  fileSize: {
    type: Number,
    default: 0
  },
  dimensions: {
    width: { type: Number, default: 1920 },
    height: { type: Number, default: 1080 }
  }
}, {
  timestamps: true,
  collection: 'screenshots'
});

// Indexes for efficient queries
ScreenshotSchema.index({ playerId: 1, createdAt: -1 });
ScreenshotSchema.index({ isPublic: 1, likes: -1 });
ScreenshotSchema.index({ isPublic: 1, createdAt: -1 });
ScreenshotSchema.index({ 'location.realm': 1, createdAt: -1 });

export const Screenshot: Model<IScreenshot> = mongoose.model<IScreenshot>('Screenshot', ScreenshotSchema);

// ==========================================
// Gallery Album Model
// ==========================================

export interface IGalleryAlbum extends Document {
  albumId: string;
  playerId: string;
  name: string;
  description?: string;
  coverScreenshotId?: string;
  screenshotIds: string[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GalleryAlbumSchema = new Schema<IGalleryAlbum>({
  albumId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  playerId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 50
  },
  description: {
    type: String,
    maxlength: 200
  },
  coverScreenshotId: String,
  screenshotIds: {
    type: [String],
    default: []
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'gallery_albums'
});

GalleryAlbumSchema.index({ playerId: 1, name: 1 });

export const GalleryAlbum: Model<IGalleryAlbum> = mongoose.model<IGalleryAlbum>('GalleryAlbum', GalleryAlbumSchema);

// ==========================================
// Featured Screenshot Model (curated by admins)
// ==========================================

export interface IFeaturedScreenshot extends Document {
  screenshotId: string;
  featuredBy: string;         // Admin who featured it
  featuredReason?: string;
  category: string;           // 'daily_pick', 'weekly_best', 'community_favorite', 'artistic'
  priority: number;           // Display order
  featuredAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

const FeaturedScreenshotSchema = new Schema<IFeaturedScreenshot>({
  screenshotId: {
    type: String,
    required: true,
    index: true
  },
  featuredBy: {
    type: String,
    required: true
  },
  featuredReason: String,
  category: {
    type: String,
    required: true,
    enum: ['daily_pick', 'weekly_best', 'community_favorite', 'artistic']
  },
  priority: {
    type: Number,
    default: 0
  },
  featuredAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: Date,
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  collection: 'featured_screenshots'
});

FeaturedScreenshotSchema.index({ isActive: 1, category: 1, priority: -1 });

export const FeaturedScreenshot: Model<IFeaturedScreenshot> = mongoose.model<IFeaturedScreenshot>('FeaturedScreenshot', FeaturedScreenshotSchema);

// ==========================================
// Screenshot Report Model (for moderation)
// ==========================================

export interface IScreenshotReport extends Document {
  reportId: string;
  screenshotId: string;
  reporterId: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  reviewedBy?: string;
  reviewedAt?: Date;
  actionTaken?: string;
  createdAt: Date;
}

const ScreenshotReportSchema = new Schema<IScreenshotReport>({
  reportId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  screenshotId: {
    type: String,
    required: true,
    index: true
  },
  reporterId: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true,
    enum: ['inappropriate', 'offensive', 'spam', 'harassment', 'other']
  },
  details: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'reviewed', 'dismissed', 'action_taken']
  },
  reviewedBy: String,
  reviewedAt: Date,
  actionTaken: String
}, {
  timestamps: true,
  collection: 'screenshot_reports'
});

ScreenshotReportSchema.index({ status: 1, createdAt: 1 });

export const ScreenshotReport: Model<IScreenshotReport> = mongoose.model<IScreenshotReport>('ScreenshotReport', ScreenshotReportSchema);
