// Mongoose 8.x TypeScript compatibility fix
// This file exports properly typed model accessors to avoid union type issues

import mongoose from 'mongoose';

// Helper to get a properly typed model accessor
export function getModel<T>(name: string): mongoose.Model<T> {
    return mongoose.models[name] as mongoose.Model<T> || mongoose.model<T>(name);
}

// Type assertion helper for model operations
export function asModel<T>(model: any): mongoose.Model<T> {
    return model as mongoose.Model<T>;
}
