/**
 * @fuse/skideancer-ai-agent - Agent Service Implementation
 * Ported from SkIDEancer's advanced agent system
 * 
 * Features:
 * - Multi-capability agent with memory
 * - Short-term and long-term memory
 * - Conversation history tracking
 * - Tool registration and execution
 * - Context-aware processing
 */

import { injectable, inject, postConstruct } from '@ide/core/shared/inversify';
import { Emitter, Event, Disposable, DisposableCollection } from '@ide/core';
import {
    AgentService as IAgentService,
    IAgentContext,
    IAgentCapability,
    IAgentResponse,
    IAgentTool,
    IAgentOptions,
    IConversationMessage
} from './types';

@injectable()
export class AgentServiceImpl implements IAgentService, Disposable {
    
    protected readonly toDispose = new DisposableCollection();
    
    protected readonly capabilities = new Map<string, IAgentCapability>();
    
    protected context: IAgentContext = {
        visibleFiles: [],
        conversationHistory: [],
        shortTermMemory: new Map(),
        longTermMemory: new Map(),
        variables: new Map(),
        tools: new Map()
    };
    
    protected readonly onDidChangeContextEmitter = new Emitter<void>();
    readonly onDidChangeContext: Event<void> = this.onDidChangeContextEmitter.event;
    
    protected readonly onDidExecuteCapabilityEmitter = new Emitter<{
        capability: string;
        result: IAgentResponse;
    }>();
    readonly onDidExecuteCapability = this.onDidExecuteCapabilityEmitter.event;
    
    @postConstruct()
    protected init(): void {
        this.toDispose.push(this.onDidChangeContextEmitter);
        this.toDispose.push(this.onDidExecuteCapabilityEmitter);
        
        // Register default tools
        this.registerDefaultTools();
        
        // Load long-term memory from storage
        this.loadLongTermMemory();
        
        console.log('[AgentService] Initialized with memory and capability system');
    }
    
    dispose(): void {
        this.saveLongTermMemory();
        this.toDispose.dispose();
    }
    
    // =========================================================================
    // Capability Management
    // =========================================================================
    
    async getCapabilities(): Promise<IAgentCapability[]> {
        return Array.from(this.capabilities.values());
    }
    
    registerCapability(capability: IAgentCapability): void {
        this.capabilities.set(capability.id, capability);
        console.log(`[AgentService] Registered capability: ${capability.id}`);
    }
    
    unregisterCapability(id: string): void {
        this.capabilities.delete(id);
        console.log(`[AgentService] Unregistered capability: ${id}`);
    }
    
    // =========================================================================
    // Core Processing
    // =========================================================================
    
    async process(input: string, options?: IAgentOptions): Promise<IAgentResponse> {
        // Add user message to history
        this.addToHistory('user', input);
        
        try {
            // Determine best capability for input
            const capability = await this.determineCapability(input, options);
            
            if (!capability) {
                const response: IAgentResponse = {
                    id: this.generateId(),
                    content: 'I\'m not sure how to help with that. Could you rephrase or provide more context?',
                    confidence: 0.2
                };
                this.addToHistory('assistant', response.content as string);
                return response;
            }
            
            // Execute capability
            const response = await capability.execute(this.context);
            response.id = this.generateId();
            response.capability = capability.id;
            
            // Add response to history
            this.addToHistory('assistant', 
                typeof response.content === 'string' 
                    ? response.content 
                    : JSON.stringify(response.content),
                { confidence: response.confidence }
            );
            
            // Emit event
            this.onDidExecuteCapabilityEmitter.fire({
                capability: capability.id,
                result: response
            });
            
            return response;
            
        } catch (error) {
            console.error('[AgentService] Error processing input:', error);
            const errorResponse: IAgentResponse = {
                id: this.generateId(),
                content: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
                confidence: 0
            };
            return errorResponse;
        }
    }
    
    async suggest(context: Partial<IAgentContext>): Promise<IAgentResponse[]> {
        const mergedContext = { ...this.context, ...context };
        const suggestions: IAgentResponse[] = [];
        
        for (const capability of this.capabilities.values()) {
            try {
                const result = await capability.execute(mergedContext);
                if (result.confidence > 0.5) {
                    suggestions.push(result);
                }
            } catch (error) {
                console.warn(`[AgentService] Capability ${capability.id} failed:`, error);
            }
        }
        
        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }
    
    async explain(response: IAgentResponse): Promise<string> {
        if (response.explanation) {
            return response.explanation;
        }
        
        // Generate explanation based on capability
        const capability = response.capability 
            ? this.capabilities.get(response.capability)
            : undefined;
            
        if (capability) {
            return `This response was generated by the "${capability.name}" capability. ` +
                   `${capability.description}. ` +
                   `Confidence: ${Math.round(response.confidence * 100)}%`;
        }
        
        return `Response generated with ${Math.round(response.confidence * 100)}% confidence.`;
    }
    
    // =========================================================================
    // Context Management
    // =========================================================================
    
    getContext(): IAgentContext {
        return { ...this.context };
    }
    
    updateContext(context: Partial<IAgentContext>): void {
        Object.assign(this.context, context);
        this.onDidChangeContextEmitter.fire();
    }
    
    clearContext(): void {
        this.context.conversationHistory = [];
        this.context.shortTermMemory.clear();
        this.context.variables.clear();
        this.onDidChangeContextEmitter.fire();
        console.log('[AgentService] Context cleared');
    }
    
    // =========================================================================
    // Memory System
    // =========================================================================
    
    remember(key: string, value: unknown, type: 'short' | 'long'): void {
        const memory = type === 'short' 
            ? this.context.shortTermMemory 
            : this.context.longTermMemory;
        memory.set(key, value);
        
        if (type === 'long') {
            this.saveLongTermMemory();
        }
        
        console.log(`[AgentService] Remembered "${key}" in ${type}-term memory`);
    }
    
    recall(key: string, type: 'short' | 'long'): unknown {
        const memory = type === 'short' 
            ? this.context.shortTermMemory 
            : this.context.longTermMemory;
        return memory.get(key);
    }
    
    forget(key: string, type: 'short' | 'long'): void {
        const memory = type === 'short' 
            ? this.context.shortTermMemory 
            : this.context.longTermMemory;
        memory.delete(key);
        
        if (type === 'long') {
            this.saveLongTermMemory();
        }
        
        console.log(`[AgentService] Forgot "${key}" from ${type}-term memory`);
    }
    
    // =========================================================================
    // Tool Management
    // =========================================================================
    
    registerTool(tool: IAgentTool): void {
        this.context.tools.set(tool.id, tool);
        console.log(`[AgentService] Registered tool: ${tool.id}`);
    }
    
    unregisterTool(id: string): void {
        this.context.tools.delete(id);
    }
    
    // =========================================================================
    // Private Helpers
    // =========================================================================
    
    private async determineCapability(
        input: string, 
        options?: IAgentOptions
    ): Promise<IAgentCapability | undefined> {
        // If specific capabilities requested, use those
        if (options?.capabilities?.length) {
            for (const capId of options.capabilities) {
                const cap = this.capabilities.get(capId);
                if (cap) return cap;
            }
        }
        
        // Simple keyword-based capability matching
        // In a real implementation, this would use LLM to choose
        const keywords: Record<string, string[]> = {
            'codeAnalysis': ['analyze', 'analysis', 'review', 'check', 'lint', 'metrics'],
            'codeCompletion': ['complete', 'finish', 'continue', 'suggest'],
            'refactoring': ['refactor', 'improve', 'clean', 'optimize'],
            'documentation': ['document', 'explain', 'describe', 'comment'],
            'testing': ['test', 'unit test', 'coverage']
        };
        
        const lowerInput = input.toLowerCase();
        for (const [capId, kws] of Object.entries(keywords)) {
            if (kws.some(kw => lowerInput.includes(kw))) {
                const cap = this.capabilities.get(capId);
                if (cap) return cap;
            }
        }
        
        // Return first available capability as fallback
        return this.capabilities.values().next().value;
    }
    
    private addToHistory(
        role: 'user' | 'assistant' | 'system',
        content: string,
        metadata?: Partial<IConversationMessage['metadata']>
    ): void {
        this.context.conversationHistory.push({
            role,
            content,
            timestamp: Date.now(),
            metadata
        });
        
        // Keep history manageable (last 100 messages)
        if (this.context.conversationHistory.length > 100) {
            this.context.conversationHistory.shift();
        }
    }
    
    private registerDefaultTools(): void {
        // File read tool
        this.registerTool({
            id: 'readFile',
            name: 'Read File',
            description: 'Read contents of a file',
            parameters: [
                { name: 'path', type: 'string', description: 'File path', required: true }
            ],
            execute: async (params) => {
                // Implementation would use core file service
                return { content: 'File content placeholder' };
            }
        });
        
        // Search tool
        this.registerTool({
            id: 'search',
            name: 'Search Workspace',
            description: 'Search for text in workspace',
            parameters: [
                { name: 'query', type: 'string', description: 'Search query', required: true },
                { name: 'maxResults', type: 'number', description: 'Max results', default: 10 }
            ],
            execute: async (params) => {
                // Implementation would use core search service
                return { results: [] };
            }
        });
    }
    
    private loadLongTermMemory(): void {
        // In a real implementation, this would load from persistent storage
        // For now, we start with empty memory
        console.log('[AgentService] Long-term memory loaded');
    }
    
    private saveLongTermMemory(): void {
        // In a real implementation, this would persist to storage
        console.log('[AgentService] Long-term memory saved');
    }
    
    private generateId(): string {
        return `response-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
