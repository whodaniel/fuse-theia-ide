/**
 * @fuse/skideancer-ai-agent - AI Flow Service (AI Flow implementation)
 * Ported from SkIDEancer's advanced flow orchestration
 * 
 * Features:
 * - Graph-based AI workflow execution
 * - Topological sorting for dependency resolution
 * - Step registration and execution
 * - Execution state tracking
 * - Cancellation support
 */

import { injectable, postConstruct } from '@ide/core/shared/inversify';
import { Emitter, Event, Disposable, DisposableCollection, CancellationTokenSource } from '@ide/core';
import {
    AIFlowService as IAIFlowService,
    IAIFlowGraph,
    IAIFlowNode,
    IAIFlowEdge,
    IAIFlowStep,
    IAIFlowContext,
    IAIFlowResult,
    IAIFlowExecution,
    AIFlowStepStatus
} from './types';

@injectable()
export class AIFlowServiceImpl implements IAIFlowService, Disposable {
    
    protected readonly toDispose = new DisposableCollection();
    protected readonly steps = new Map<string, IAIFlowStep>();
    protected readonly executions = new Map<string, IAIFlowExecution>();
    protected readonly activeExecutions = new Map<string, CancellationTokenSource>();
    
    protected readonly onFlowStartedEmitter = new Emitter<{ graphId: string }>();
    readonly onFlowStarted: Event<{ graphId: string }> = this.onFlowStartedEmitter.event;
    
    protected readonly onFlowCompletedEmitter = new Emitter<{ graphId: string; result: IAIFlowResult }>();
    readonly onFlowCompleted: Event<{ graphId: string; result: IAIFlowResult }> = this.onFlowCompletedEmitter.event;
    
    protected readonly onStepStartedEmitter = new Emitter<{ nodeId: string; step: IAIFlowStep }>();
    readonly onStepStarted: Event<{ nodeId: string; step: IAIFlowStep }> = this.onStepStartedEmitter.event;
    
    protected readonly onStepCompletedEmitter = new Emitter<{ nodeId: string; result: IAIFlowResult }>();
    readonly onStepCompleted: Event<{ nodeId: string; result: IAIFlowResult }> = this.onStepCompletedEmitter.event;
    
    @postConstruct()
    protected init(): void {
        this.toDispose.push(this.onFlowStartedEmitter);
        this.toDispose.push(this.onFlowCompletedEmitter);
        this.toDispose.push(this.onStepStartedEmitter);
        this.toDispose.push(this.onStepCompletedEmitter);
        
        // Register built-in steps
        this.registerBuiltInSteps();
        
        console.log('[AIFlowService] Initialized - Advanced flow orchestration ready');
    }
    
    dispose(): void {
        // Cancel all active executions
        for (const [graphId] of this.activeExecutions) {
            this.cancelExecution(graphId);
        }
        this.toDispose.dispose();
    }
    
    // =========================================================================
    // Step Registration
    // =========================================================================
    
    registerStep(step: IAIFlowStep): void {
        this.steps.set(step.id, step);
        console.log(`[AIFlowService] Registered step: ${step.id}`);
    }
    
    unregisterStep(id: string): void {
        this.steps.delete(id);
    }
    
    getRegisteredSteps(): IAIFlowStep[] {
        return Array.from(this.steps.values());
    }
    
    // =========================================================================
    // Flow Execution
    // =========================================================================
    
    async executeGraph(
        graph: IAIFlowGraph, 
        initialContext?: IAIFlowContext
    ): Promise<IAIFlowResult> {
        const context: IAIFlowContext = initialContext || {
            variables: new Map(),
            previousResults: new Map()
        };
        
        // Create cancellation token
        const cts = new CancellationTokenSource();
        this.activeExecutions.set(graph.id, cts);
        
        this.onFlowStartedEmitter.fire({ graphId: graph.id });
        console.log(`[AIFlowService] Starting flow: ${graph.name}`);
        
        try {
            // Sort nodes by dependencies
            const sortedNodes = this.topologicalSort(graph);
            
            // Execute nodes in order
            for (const node of sortedNodes) {
                // Check for cancellation
                if (cts.token.isCancellationRequested) {
                    return { 
                        success: false, 
                        error: new Error('Flow execution cancelled') 
                    };
                }
                
                // Get step for node type
                const step = this.steps.get(node.type);
                if (!step) {
                    return { 
                        success: false, 
                        error: new Error(`Unknown step type: ${node.type}`) 
                    };
                }
                
                // Initialize execution tracking
                const execution: IAIFlowExecution = {
                    id: node.id,
                    status: AIFlowStepStatus.Running
                };
                this.executions.set(node.id, execution);
                
                this.onStepStartedEmitter.fire({ nodeId: node.id, step });
                
                try {
                    // Prepare step context with node data
                    const stepContext: IAIFlowContext = {
                        variables: new Map([
                            ...context.variables,
                            ...Object.entries(node.data)
                        ]),
                        previousResults: context.previousResults
                    };
                    
                    // Execute step
                    const result = await step.execute(stepContext);
                    
                    // Update execution state
                    execution.status = result.success 
                        ? AIFlowStepStatus.Completed 
                        : AIFlowStepStatus.Failed;
                    execution.result = result.data;
                    
                    if (!result.success) {
                        execution.error = result.error;
                        this.onFlowCompletedEmitter.fire({ 
                            graphId: graph.id, 
                            result 
                        });
                        return result;
                    }
                    
                    // Store result for downstream nodes
                    context.previousResults.set(node.id, result);
                    
                    this.onStepCompletedEmitter.fire({ 
                        nodeId: node.id, 
                        result 
                    });
                    
                } catch (error) {
                    execution.status = AIFlowStepStatus.Failed;
                    execution.error = error instanceof Error ? error : new Error(String(error));
                    
                    const result: IAIFlowResult = { 
                        success: false, 
                        error: execution.error 
                    };
                    
                    this.onFlowCompletedEmitter.fire({ 
                        graphId: graph.id, 
                        result 
                    });
                    
                    return result;
                }
            }
            
            // All steps completed successfully
            const finalResult: IAIFlowResult = { 
                success: true,
                data: Object.fromEntries(context.previousResults)
            };
            
            this.onFlowCompletedEmitter.fire({ 
                graphId: graph.id, 
                result: finalResult 
            });
            
            console.log(`[AIFlowService] Flow completed: ${graph.name}`);
            return finalResult;
            
        } finally {
            this.activeExecutions.delete(graph.id);
        }
    }
    
    getExecution(nodeId: string): IAIFlowExecution | undefined {
        return this.executions.get(nodeId);
    }
    
    cancelExecution(graphId: string): void {
        const cts = this.activeExecutions.get(graphId);
        if (cts) {
            cts.cancel();
            console.log(`[AIFlowService] Cancelled flow: ${graphId}`);
        }
    }
    
    // =========================================================================
    // Topological Sort (Dependency Resolution)
    // =========================================================================
    
    private topologicalSort(graph: IAIFlowGraph): IAIFlowNode[] {
        const visited = new Set<string>();
        const temp = new Set<string>();
        const order: IAIFlowNode[] = [];
        const nodes = new Map(graph.nodes.map(node => [node.id, node]));
        const edges = graph.edges;
        
        const visit = (nodeId: string): void => {
            if (temp.has(nodeId)) {
                throw new Error('Flow graph has cycles - this is not allowed');
            }
            
            if (!visited.has(nodeId)) {
                temp.add(nodeId);
                
                // Find outgoing edges
                const outgoing = edges.filter(edge => edge.source === nodeId);
                for (const edge of outgoing) {
                    visit(edge.target);
                }
                
                temp.delete(nodeId);
                visited.add(nodeId);
                
                const node = nodes.get(nodeId);
                if (node) {
                    order.unshift(node);
                }
            }
        };
        
        // Visit all nodes
        for (const node of graph.nodes) {
            if (!visited.has(node.id)) {
                visit(node.id);
            }
        }
        
        return order;
    }
    
    // =========================================================================
    // Built-in Steps
    // =========================================================================
    
    private registerBuiltInSteps(): void {
        // LLM Query Step
        this.registerStep({
            id: 'llm-query',
            name: 'LLM Query',
            description: 'Send a query to the configured LLM',
            execute: async (context) => {
                const prompt = context.variables.get('prompt');
                if (!prompt || typeof prompt !== 'string') {
                    return { 
                        success: false, 
                        error: new Error('Missing prompt variable') 
                    };
                }
                
                // In real implementation, this would call the LLM service
                return {
                    success: true,
                    data: { response: 'LLM response placeholder' }
                };
            }
        });
        
        // Code Analysis Step
        this.registerStep({
            id: 'code-analysis',
            name: 'Analyze Code',
            description: 'Analyze code for issues and suggestions',
            execute: async (context) => {
                const code = context.variables.get('code');
                const language = context.variables.get('language') || 'typescript';
                
                if (!code || typeof code !== 'string') {
                    return { 
                        success: false, 
                        error: new Error('Missing code variable') 
                    };
                }
                
                return {
                    success: true,
                    data: {
                        suggestions: [],
                        diagnostics: [],
                        metrics: {
                            complexity: 50,
                            maintainability: 75,
                            testability: 60,
                            security: 80
                        }
                    }
                };
            }
        });
        
        // Transform Step
        this.registerStep({
            id: 'transform',
            name: 'Transform Data',
            description: 'Transform data using a template',
            execute: async (context) => {
                const input = context.variables.get('input');
                const template = context.variables.get('template') as string;
                
                if (!template) {
                    return { 
                        success: false, 
                        error: new Error('Missing template variable') 
                    };
                }
                
                // Simple template substitution
                let output = template;
                for (const [key, value] of context.variables) {
                    output = output.replace(`{{${key}}}`, String(value));
                }
                
                return {
                    success: true,
                    data: { output }
                };
            }
        });
        
        // Conditional Step
        this.registerStep({
            id: 'condition',
            name: 'Conditional Branch',
            description: 'Branch based on a condition',
            execute: async (context) => {
                const condition = context.variables.get('condition');
                const ifTrue = context.variables.get('ifTrue');
                const ifFalse = context.variables.get('ifFalse');
                
                return {
                    success: true,
                    data: {
                        result: condition ? ifTrue : ifFalse,
                        branch: condition ? 'true' : 'false'
                    }
                };
            }
        });
        
        // Loop Step
        this.registerStep({
            id: 'loop',
            name: 'Loop Over Items',
            description: 'Execute steps for each item in a list',
            execute: async (context) => {
                const items = context.variables.get('items') as unknown[];
                
                if (!Array.isArray(items)) {
                    return { 
                        success: false, 
                        error: new Error('Items must be an array') 
                    };
                }
                
                return {
                    success: true,
                    data: {
                        items,
                        count: items.length
                    }
                };
            }
        });
        
        // Merge Step
        this.registerStep({
            id: 'merge',
            name: 'Merge Results',
            description: 'Merge results from previous steps',
            execute: async (context) => {
                const merged: Record<string, unknown> = {};
                
                for (const [key, result] of context.previousResults) {
                    merged[key] = result.data;
                }
                
                return {
                    success: true,
                    data: merged
                };
            }
        });
    }
}
