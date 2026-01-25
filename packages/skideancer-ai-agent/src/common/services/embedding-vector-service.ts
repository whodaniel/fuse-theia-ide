/**
 * @fuse/skideancer-ai-agent - Embedding Vector Service
 * Ported from SkIDEancer - provides vector embeddings for semantic search
 * 
 * Features:
 * - Generate embeddings for code/text
 * - Provider registration system
 * - Caching and batching
 * - Timeout handling
 */

import { injectable, postConstruct } from '@theia/core/shared/inversify';
import { Disposable, DisposableCollection, Emitter, Event } from '@theia/core';

export interface IEmbeddingVectorProvider {
    readonly id: string;
    readonly name: string;
    provideEmbedding(texts: string[]): Promise<number[][]>;
}

export const EmbeddingVectorService = Symbol('EmbeddingVectorService');

export interface EmbeddingVectorService {
    isEnabled(): boolean;
    getEmbedding(text: string): Promise<number[]>;
    getEmbeddings(texts: string[]): Promise<number[][]>;
    registerProvider(provider: IEmbeddingVectorProvider): Disposable;
    getSimilarity(embedding1: number[], embedding2: number[]): number;
}

@injectable()
export class EmbeddingVectorServiceImpl implements EmbeddingVectorService, Disposable {
    
    protected readonly toDispose = new DisposableCollection();
    protected readonly providers: IEmbeddingVectorProvider[] = [];
    protected readonly cache = new Map<string, number[]>();
    
    static readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
    static readonly MAX_CACHE_SIZE = 1000;
    
    protected readonly onProviderChangedEmitter = new Emitter<void>();
    readonly onProviderChanged: Event<void> = this.onProviderChangedEmitter.event;
    
    @postConstruct()
    protected init(): void {
        this.toDispose.push(this.onProviderChangedEmitter);
        console.log('[EmbeddingVectorService] Initialized');
    }
    
    dispose(): void {
        this.cache.clear();
        this.toDispose.dispose();
    }
    
    isEnabled(): boolean {
        return this.providers.length > 0;
    }
    
    registerProvider(provider: IEmbeddingVectorProvider): Disposable {
        this.providers.push(provider);
        this.onProviderChangedEmitter.fire();
        console.log(`[EmbeddingVectorService] Registered provider: ${provider.id}`);
        
        return {
            dispose: () => {
                const index = this.providers.indexOf(provider);
                if (index >= 0) {
                    this.providers.splice(index, 1);
                    this.onProviderChangedEmitter.fire();
                }
            }
        };
    }
    
    async getEmbedding(text: string): Promise<number[]> {
        const embeddings = await this.getEmbeddings([text]);
        return embeddings[0];
    }
    
    async getEmbeddings(texts: string[]): Promise<number[][]> {
        if (this.providers.length === 0) {
            throw new Error('No embedding vector providers registered');
        }
        
        // Check cache for already computed embeddings
        const results: (number[] | null)[] = texts.map(text => this.cache.get(text) || null);
        const uncachedIndices: number[] = [];
        const uncachedTexts: string[] = [];
        
        for (let i = 0; i < texts.length; i++) {
            if (results[i] === null) {
                uncachedIndices.push(i);
                uncachedTexts.push(texts[i]);
            }
        }
        
        // Fetch uncached embeddings
        if (uncachedTexts.length > 0) {
            const provider = this.providers[0]; // Use first available provider
            
            try {
                const newEmbeddings = await this.withTimeout(
                    provider.provideEmbedding(uncachedTexts),
                    EmbeddingVectorServiceImpl.DEFAULT_TIMEOUT
                );
                
                // Store in cache and results
                for (let i = 0; i < uncachedIndices.length; i++) {
                    const idx = uncachedIndices[i];
                    const embedding = newEmbeddings[i];
                    results[idx] = embedding;
                    this.cacheEmbedding(uncachedTexts[i], embedding);
                }
            } catch (error) {
                console.error('[EmbeddingVectorService] Error getting embeddings:', error);
                // Return zero vectors as fallback
                for (const idx of uncachedIndices) {
                    results[idx] = new Array(384).fill(0); // Common embedding size
                }
            }
        }
        
        return results as number[][];
    }
    
    getSimilarity(embedding1: number[], embedding2: number[]): number {
        if (embedding1.length !== embedding2.length) {
            throw new Error('Embeddings must have the same dimension');
        }
        
        // Cosine similarity
        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;
        
        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }
        
        const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
        if (magnitude === 0) return 0;
        
        return dotProduct / magnitude;
    }
    
    private cacheEmbedding(text: string, embedding: number[]): void {
        // LRU-style cache management
        if (this.cache.size >= EmbeddingVectorServiceImpl.MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(text, embedding);
    }
    
    private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Embedding provider timed out after ${ms}ms`));
            }, ms);
            
            promise
                .then(result => {
                    clearTimeout(timer);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timer);
                    reject(error);
                });
        });
    }
}

// ============================================================================
// Simple Local Embedding Provider (for testing/fallback)
// ============================================================================

@injectable()
export class SimpleEmbeddingProvider implements IEmbeddingVectorProvider {
    readonly id = 'simple-local';
    readonly name = 'Simple Local Embeddings';
    
    async provideEmbedding(texts: string[]): Promise<number[][]> {
        // Simple bag-of-words style embedding for demonstration
        // In production, this would call an actual embedding model
        return texts.map(text => this.simpleEmbed(text));
    }
    
    private simpleEmbed(text: string): number[] {
        const dimension = 128;
        const embedding = new Array(dimension).fill(0);
        
        // Hash words into embedding dimensions
        const words = text.toLowerCase().split(/\s+/);
        for (const word of words) {
            const hash = this.hashString(word);
            const idx = Math.abs(hash) % dimension;
            embedding[idx] += 1;
        }
        
        // Normalize
        const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
        if (magnitude > 0) {
            for (let i = 0; i < embedding.length; i++) {
                embedding[i] /= magnitude;
            }
        }
        
        return embedding;
    }
    
    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }
}
