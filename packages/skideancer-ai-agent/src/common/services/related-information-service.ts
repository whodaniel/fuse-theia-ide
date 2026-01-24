/**
 * @fuse/skideancer-ai-agent - Related Information Service
 * Ported from SkIDEancer - provides AI-powered related information lookup
 * 
 * Features:
 * - Find related documentation
 * - Find related code snippets
 * - Find related commands
 * - Provider registration system
 * - Smart result ranking
 */

import { injectable, postConstruct } from '@ide/core/shared/inversify';
import { Disposable, DisposableCollection, Emitter, Event } from '@ide/core';

export enum RelatedInformationType {
    CommandInformation = 'command',
    SettingInformation = 'setting',
    SymbolInformation = 'symbol',
    DocumentationInformation = 'documentation',
    WorkspaceInformation = 'workspace'
}

export interface RelatedInformationResult {
    type: RelatedInformationType;
    weight: number;
    title: string;
    description: string;
    uri?: string;
    range?: {
        startLine: number;
        endLine: number;
    };
}

export interface IRelatedInformationProvider {
    readonly types: RelatedInformationType[];
    provideRelatedInformation(query: string): Promise<RelatedInformationResult[]>;
}

export const RelatedInformationService = Symbol('RelatedInformationService');

export interface RelatedInformationService {
    isEnabled(): boolean;
    getRelatedInformation(query: string, types: RelatedInformationType[]): Promise<RelatedInformationResult[]>;
    registerProvider(type: RelatedInformationType, provider: IRelatedInformationProvider): Disposable;
}

@injectable()
export class RelatedInformationServiceImpl implements RelatedInformationService, Disposable {
    
    protected readonly toDispose = new DisposableCollection();
    protected readonly providers = new Map<RelatedInformationType, IRelatedInformationProvider[]>();
    
    static readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
    
    protected readonly onProviderChangedEmitter = new Emitter<void>();
    readonly onProviderChanged: Event<void> = this.onProviderChangedEmitter.event;
    
    @postConstruct()
    protected init(): void {
        this.toDispose.push(this.onProviderChangedEmitter);
        
        // Register default providers
        this.registerDefaultProviders();
        
        console.log('[RelatedInformationService] Initialized');
    }
    
    dispose(): void {
        this.providers.clear();
        this.toDispose.dispose();
    }
    
    isEnabled(): boolean {
        return this.providers.size > 0;
    }
    
    registerProvider(type: RelatedInformationType, provider: IRelatedInformationProvider): Disposable {
        const providers = this.providers.get(type) || [];
        providers.push(provider);
        this.providers.set(type, providers);
        this.onProviderChangedEmitter.fire();
        
        return {
            dispose: () => {
                const providers = this.providers.get(type) || [];
                const index = providers.indexOf(provider);
                if (index >= 0) {
                    providers.splice(index, 1);
                    if (providers.length === 0) {
                        this.providers.delete(type);
                    }
                }
                this.onProviderChangedEmitter.fire();
            }
        };
    }
    
    async getRelatedInformation(
        query: string, 
        types: RelatedInformationType[]
    ): Promise<RelatedInformationResult[]> {
        if (this.providers.size === 0) {
            return [];
        }
        
        // Get providers for requested types
        const relevantProviders: IRelatedInformationProvider[] = [];
        for (const type of types) {
            const typeProviders = this.providers.get(type);
            if (typeProviders) {
                relevantProviders.push(...typeProviders);
            }
        }
        
        if (relevantProviders.length === 0) {
            return [];
        }
        
        // Query all providers in parallel
        const results = await Promise.allSettled(
            relevantProviders.map(provider => 
                this.withTimeout(
                    provider.provideRelatedInformation(query),
                    RelatedInformationServiceImpl.DEFAULT_TIMEOUT
                )
            )
        );
        
        // Collect successful results
        const allResults: RelatedInformationResult[] = [];
        for (const result of results) {
            if (result.status === 'fulfilled') {
                allResults.push(
                    ...result.value.filter(r => types.includes(r.type))
                );
            }
        }
        
        // Sort by weight (higher is better)
        allResults.sort((a, b) => b.weight - a.weight);
        
        return allResults;
    }
    
    private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Provider timed out after ${ms}ms`));
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
    
    private registerDefaultProviders(): void {
        // Command Information Provider
        this.registerProvider(RelatedInformationType.CommandInformation, {
            types: [RelatedInformationType.CommandInformation],
            provideRelatedInformation: async (query) => {
                // Search through common commands
                const commands = [
                    { id: 'ai-agent.analyze', title: 'AI Agent: Analyze Code', desc: 'Analyze current file for issues' },
                    { id: 'ai-agent.suggest', title: 'AI Agent: Get Suggestions', desc: 'Get AI-powered suggestions' },
                    { id: 'ai-agent.clear-context', title: 'AI Agent: Clear Memory', desc: 'Clear agent context and memory' },
                    { id: 'editor.action.formatDocument', title: 'Format Document', desc: 'Format the current document' },
                    { id: 'workbench.action.findInFiles', title: 'Search in Files', desc: 'Search across workspace' },
                    { id: 'workbench.action.showCommands', title: 'Command Palette', desc: 'Show all commands' }
                ];
                
                const lowerQuery = query.toLowerCase();
                return commands
                    .filter(cmd => 
                        cmd.title.toLowerCase().includes(lowerQuery) || 
                        cmd.desc.toLowerCase().includes(lowerQuery)
                    )
                    .map(cmd => ({
                        type: RelatedInformationType.CommandInformation,
                        weight: this.calculateMatchWeight(query, cmd.title),
                        title: cmd.title,
                        description: cmd.desc
                    }));
            }
        });
        
        // Documentation Provider
        this.registerProvider(RelatedInformationType.DocumentationInformation, {
            types: [RelatedInformationType.DocumentationInformation],
            provideRelatedInformation: async (query) => {
                // In a real implementation, this would search documentation
                const docs = [
                    { 
                        title: 'Getting Started with AI Agent', 
                        desc: 'Learn how to use the AI Agent for code analysis',
                        uri: 'docs://ai-agent/getting-started'
                    },
                    { 
                        title: 'Code Analysis Features', 
                        desc: 'Security scanning, metrics, and auto-fixes',
                        uri: 'docs://ai-agent/code-analysis'
                    },
                    { 
                        title: 'AI Flow Workflows', 
                        desc: 'Create and execute AI-powered workflows',
                        uri: 'docs://ai-agent/flows'
                    }
                ];
                
                const lowerQuery = query.toLowerCase();
                return docs
                    .filter(doc => 
                        doc.title.toLowerCase().includes(lowerQuery) || 
                        doc.desc.toLowerCase().includes(lowerQuery)
                    )
                    .map(doc => ({
                        type: RelatedInformationType.DocumentationInformation,
                        weight: this.calculateMatchWeight(query, doc.title),
                        title: doc.title,
                        description: doc.desc,
                        uri: doc.uri
                    }));
            }
        });
    }
    
    private calculateMatchWeight(query: string, target: string): number {
        const lowerQuery = query.toLowerCase();
        const lowerTarget = target.toLowerCase();
        
        // Exact match
        if (lowerTarget === lowerQuery) return 1.0;
        
        // Starts with query
        if (lowerTarget.startsWith(lowerQuery)) return 0.9;
        
        // Contains query
        if (lowerTarget.includes(lowerQuery)) return 0.7;
        
        // Word match
        const queryWords = lowerQuery.split(/\s+/);
        const targetWords = lowerTarget.split(/\s+/);
        const matchCount = queryWords.filter(qw => targetWords.some(tw => tw.includes(qw))).length;
        return matchCount / queryWords.length * 0.5;
    }
}
