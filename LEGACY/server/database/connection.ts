// MongoDB connection manager
import mongoose from 'mongoose';

export interface DatabaseConfig {
    uri: string;
    dbName: string;
    maxRetries?: number;
    retryDelay?: number;
}

class DatabaseConnection {
    private static instance: DatabaseConnection;
    private isConnected: boolean = false;
    // @ts-ignore Reserved for future database configuration
    private config: DatabaseConfig | null = null;

    private constructor() { }

    static getInstance(): DatabaseConnection {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }

    /**
     * Connect to MongoDB
     */
    async connect(config: DatabaseConfig): Promise<void> {
        if (this.isConnected) {
            return;
        }

        this.config = config;
        const maxRetries = config.maxRetries || 1;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await mongoose.connect(config.uri, {
                    dbName: config.dbName,
                    maxPoolSize: 10,
                    serverSelectionTimeoutMS: 5000,  // Increased timeout for local MongoDB
                    socketTimeoutMS: 45000,
                });

                this.isConnected = true;
                console.log('✅ Connected to MongoDB');

                // Set up connection event handlers
                this.setupEventHandlers();
                return;

            } catch (error) {
                console.warn(`⚠️ MongoDB connection attempt ${attempt}/${maxRetries} failed:`, (error as Error).message);
                if (attempt >= maxRetries) {
                    console.error('❌ Could not connect to MongoDB. Is the "mongod" service running?');
                    throw new Error('MongoDB connection failed');
                }
                if (config.retryDelay) {
                    await this.delay(config.retryDelay);
                }
            }
        }
    }

    /**
     * Disconnect from MongoDB
     */
    async disconnect(): Promise<void> {
        if (!this.isConnected) {
            return;
        }

        try {
            await mongoose.disconnect();
            this.isConnected = false;
            console.log('🔌 Disconnected from MongoDB');
        } catch (error) {
            console.error('❌ Error disconnecting from MongoDB:', error);
            throw error;
        }
    }

    /**
     * Check if connected
     */
    getConnectionStatus(): boolean {
        return this.isConnected && mongoose.connection.readyState === 1;
    }

    /**
     * Get the mongoose connection
     */
    getConnection(): mongoose.Connection {
        return mongoose.connection;
    }

    /**
     * Setup connection event handlers
     */
    private setupEventHandlers(): void {
        mongoose.connection.on('error', (error) => {
            console.error('❌ MongoDB connection error:', error);
            this.isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected');
            this.isConnected = false;
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
            this.isConnected = true;
        });

        // Graceful shutdown
        process.on('SIGINT', async () => {
            await this.disconnect();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await this.disconnect();
            process.exit(0);
        });
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton instance
export const database = DatabaseConnection.getInstance();
export default database;
