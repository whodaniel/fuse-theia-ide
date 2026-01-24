/**
 * @fuse/skideancer-ai-agent - Common Types
 * Ported from SkIDEancer's advanced AI platform
 */

// ============================================================================
// Agent Types
// ============================================================================

export interface IAgentContext {
    /** Currently visible files in the editor */
    visibleFiles: string[];
    /** Current file being edited */
    activeFile?: string;
    /** Language of active file */
    language?: string;
    /** Workspace root path */
    workspaceRoot?: string;
    /** Project type detection */
    projectType?: string;
    /** Conversation history */
    conversationHistory: IConversationMessage[];
    /** Short-term memory (session-based) */
    shortTermMemory: Map<string, unknown>;
    /** Long-term memory (persisted) */
    longTermMemory: Map<string, unknown>;
    /** Variables for flow execution */
    variables: Map<string, unknown>;
    /** Registered tools */
    tools: Map<string, IAgentTool>;
}

export interface IConversationMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    metadata?: {
        confidence?: number;
        tokens?: number;
        provider?: string;
    };
}

export interface IAgentCapability {
    /** Unique identifier */
    id: string;
    /** Human-readable name */
    name: string;
    /** Description of what this capability does */
    description: string;
    /** Version string */
    version: string;
    /** Provider name */
    provider: string;
    /** Execute the capability */
    execute(context: IAgentContext): Promise<IAgentResponse>;
}

export interface IAgentResponse {
    /** Unique response ID */
    id?: string;
    /** Capability that generated this */
    capability?: string;
    /** Response content */
    content: string | object;
    /** Confidence score 0-1 */
    confidence: number;
    /** Optional explanation */
    explanation?: string;
    /** Suggested actions */
    suggestedActions?: IAgentAction[];
    /** Code edits to apply */
    edits?: ICodeEdit[];
}

export interface IAgentAction {
    id: string;
    label: string;
    description?: string;
    execute: () => Promise<void>;
}

export interface IAgentTool {
    id: string;
    name: string;
    description: string;
    parameters: IToolParameter[];
    execute: (params: Record<string, unknown>) => Promise<unknown>;
}

export interface IToolParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    description: string;
    required?: boolean;
    default?: unknown;
}

export interface IAgentOptions {
    /** Specific capabilities to use */
    capabilities?: string[];
    /** Maximum tokens for response */
    maxTokens?: number;
    /** Temperature for LLM */
    temperature?: number;
    /** Provider to use */
    provider?: string;
}

// ============================================================================
// Code Edit Types
// ============================================================================

export interface ICodeEdit {
    uri: string;
    range: IRange;
    newText: string;
}

export interface IRange {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}

// ============================================================================
// AI Flow Types (Advanced Flow)
// ============================================================================

export interface IAIFlowGraph {
    id: string;
    name: string;
    description?: string;
    nodes: IAIFlowNode[];
    edges: IAIFlowEdge[];
}

export interface IAIFlowNode {
    id: string;
    type: string;
    data: Record<string, unknown>;
    position?: { x: number; y: number };
}

export interface IAIFlowEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
}

export interface IAIFlowStep {
    id: string;
    name: string;
    description: string;
    execute(context: IAIFlowContext): Promise<IAIFlowResult>;
}

export interface IAIFlowContext {
    variables: Map<string, unknown>;
    previousResults: Map<string, IAIFlowResult>;
}

export interface IAIFlowResult {
    success: boolean;
    data?: unknown;
    error?: Error;
}

export interface IAIFlowExecution {
    id: string;
    status: AIFlowStepStatus;
    result?: unknown;
    error?: Error;
}

export enum AIFlowStepStatus {
    Pending = 'pending',
    Running = 'running',
    Completed = 'completed',
    Failed = 'failed',
    Cancelled = 'cancelled'
}

// ============================================================================
// Code Analysis Types
// ============================================================================

export interface ICodeAnalysisResult {
    suggestions: ICodeSuggestion[];
    diagnostics: ICodeDiagnostic[];
    metrics: ICodeMetrics;
}

export interface ICodeSuggestion {
    range: IRange;
    message: string;
    severity: 'hint' | 'info' | 'warning' | 'error';
    fixes?: ICodeFix[];
}

export interface ICodeDiagnostic {
    range: IRange;
    message: string;
    severity: 'warning' | 'error';
    source: string;
    code?: string;
}

export interface ICodeMetrics {
    /** Cyclomatic complexity (0-100) */
    complexity: number;
    /** Maintainability index (0-100) */
    maintainability: number;
    /** Testability score (0-100) */
    testability: number;
    /** Security score (0-100) */
    security: number;
}

export interface ICodeFix {
    title: string;
    edits: ICodeEdit[];
    isPreferred?: boolean;
}

// ============================================================================
// LLM Provider Types
// ============================================================================

export interface ILLMProviderOptions {
    apiKey?: string;
    baseUrl?: string;
    modelId?: string;
    organizationId?: string;
    maxRetries?: number;
    timeout?: number;
}

export interface ILLMMessage {
    role: 'system' | 'user' | 'assistant' | 'function';
    content: string;
    name?: string;
    functionCall?: {
        name: string;
        arguments: string;
    };
}

export interface ILLMResponse {
    type: 'text' | 'functionCall' | 'error';
    content?: string;
    functionCall?: {
        name: string;
        arguments: string;
    };
    error?: Error;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface ILLMModelInfo {
    id: string;
    name: string;
    provider: string;
    maxTokens: number;
    contextWindow: number;
    supportsFunctionCalling: boolean;
    supportsStreaming: boolean;
}

// ============================================================================
// Service Interfaces
// ============================================================================

export const AgentService = Symbol('AgentService');
export interface AgentService {
    /** Get all registered capabilities */
    getCapabilities(): Promise<IAgentCapability[]>;
    
    /** Process user input through the agent */
    process(input: string, options?: IAgentOptions): Promise<IAgentResponse>;
    
    /** Get suggestions based on current context */
    suggest(context: Partial<IAgentContext>): Promise<IAgentResponse[]>;
    
    /** Explain a previous response */
    explain(response: IAgentResponse): Promise<string>;
    
    /** Register a new capability */
    registerCapability(capability: IAgentCapability): void;
    
    /** Unregister a capability */
    unregisterCapability(id: string): void;
    
    /** Register a tool */
    registerTool(tool: IAgentTool): void;
    
    /** Get current context */
    getContext(): IAgentContext;
    
    /** Update context */
    updateContext(context: Partial<IAgentContext>): void;
    
    /** Clear conversation and short-term memory */
    clearContext(): void;
    
    /** Store in memory */
    remember(key: string, value: unknown, type: 'short' | 'long'): void;
    
    /** Retrieve from memory */
    recall(key: string, type: 'short' | 'long'): unknown;
    
    /** Remove from memory */
    forget(key: string, type: 'short' | 'long'): void;
}

export const AIFlowService = Symbol('AIFlowService');
export interface AIFlowService {
    /** Register a step type */
    registerStep(step: IAIFlowStep): void;
    
    /** Execute a flow graph */
    executeGraph(graph: IAIFlowGraph, context?: IAIFlowContext): Promise<IAIFlowResult>;
    
    /** Get execution status */
    getExecution(nodeId: string): IAIFlowExecution | undefined;
    
    /** Cancel an execution */
    cancelExecution(graphId: string): void;
}

export const CodeAnalysisService = Symbol('CodeAnalysisService');
export interface CodeAnalysisService {
    /** Analyze code and return results */
    analyze(content: string, languageId: string): Promise<ICodeAnalysisResult>;
    
    /** Generate fixes for a suggestion */
    generateFixes(suggestion: ICodeSuggestion, content: string): Promise<ICodeFix[]>;
    
    /** Get metrics for code */
    getMetrics(content: string, languageId: string): Promise<ICodeMetrics>;
}
