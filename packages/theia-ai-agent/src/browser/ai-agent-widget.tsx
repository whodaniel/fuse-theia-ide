/**
 * @fuse/theia-ai-agent - AI Agent Widget
 * 
 * The main UI widget for the AI Agent panel
 * Features:
 * - Chat-like interface for agent interactions
 * - Code analysis display
 * - Memory status
 * - Flow execution visualization
 */

import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { ReactWidget, Message } from '@theia/core/lib/browser';
import { AgentService, AIFlowService, IAgentResponse, IConversationMessage } from '../common/types';
import { AgentServiceImpl } from '../common/agent-service';
import { AIFlowServiceImpl } from '../common/ai-flow-service';
import { CodeAnalysisCapability } from '../common/capabilities/code-analysis';
import { SuggestionProcessorCapability } from '../common/capabilities/suggestion-processor';
import * as React from '@theia/core/shared/react';

@injectable()
export class AIAgentWidget extends ReactWidget {
    
    static readonly ID = 'ai-agent-widget';
    static readonly LABEL = 'AI Agent';
    
    @inject(AgentServiceImpl)
    protected readonly agentService: AgentServiceImpl;
    
    @inject(AIFlowServiceImpl)
    protected readonly flowService: AIFlowServiceImpl;
    
    @inject(CodeAnalysisCapability)
    protected readonly codeAnalysis: CodeAnalysisCapability;
    
    @inject(SuggestionProcessorCapability)
    protected readonly suggestionProcessor: SuggestionProcessorCapability;
    
    protected inputValue: string = '';
    protected isProcessing: boolean = false;
    
    @postConstruct()
    protected init(): void {
        this.id = AIAgentWidget.ID;
        this.title.label = AIAgentWidget.LABEL;
        this.title.caption = 'AI-Powered Code Assistant';
        this.title.iconClass = 'fa fa-robot';
        this.title.closable = true;
        
        this.addClass('ai-agent-widget');
        
        // Register capabilities
        this.agentService.registerCapability(this.codeAnalysis);
        this.agentService.registerCapability(this.suggestionProcessor);
        
        // Subscribe to context changes
        this.agentService.onDidChangeContext(() => this.update());
        this.agentService.onDidExecuteCapability(event => {
            console.log(`[AIAgentWidget] Capability executed: ${event.capability}`);
            this.update();
        });
        
        this.update();
    }
    
    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        const inputElement = this.node.querySelector('input');
        if (inputElement) {
            inputElement.focus();
        }
    }
    
    protected render(): React.ReactNode {
        const context = this.agentService.getContext();
        const history = context.conversationHistory;
        
        return (
            <div className="ai-agent-container">
                <style>{this.getStyles()}</style>
                
                {/* Header */}
                <div className="ai-agent-header">
                    <h3>🤖 AI Agent</h3>
                    <div className="memory-status">
                        <span title="Short-term memory items">
                            🧠 {context.shortTermMemory.size}
                        </span>
                        <span title="Long-term memory items">
                            💾 {context.longTermMemory.size}
                        </span>
                        <span title="Registered tools">
                            🔧 {context.tools.size}
                        </span>
                    </div>
                </div>
                
                {/* Active File */}
                {context.activeFile && (
                    <div className="active-file">
                        📄 {context.activeFile}
                    </div>
                )}
                
                {/* Conversation History */}
                <div className="conversation-container">
                    {history.length === 0 ? (
                        <div className="welcome-message">
                            <h4>Welcome to AI Agent!</h4>
                            <p>I can help you with:</p>
                            <ul>
                                <li>📊 Code analysis and metrics</li>
                                <li>💡 Suggestions and refactoring</li>
                                <li>🔒 Security vulnerability detection</li>
                                <li>📝 Documentation generation</li>
                            </ul>
                            <p>Try typing "analyze this code" or asking a question!</p>
                        </div>
                    ) : (
                        history.map((msg, idx) => this.renderMessage(msg, idx))
                    )}
                    
                    {this.isProcessing && (
                        <div className="message assistant processing">
                            <span className="spinner">⏳</span> Thinking...
                        </div>
                    )}
                </div>
                
                {/* Quick Actions */}
                <div className="quick-actions">
                    <button 
                        onClick={() => this.analyzeCurrentFile()}
                        disabled={this.isProcessing}
                    >
                        📊 Analyze
                    </button>
                    <button 
                        onClick={() => this.getSuggestions()}
                        disabled={this.isProcessing}
                    >
                        💡 Suggest
                    </button>
                    <button 
                        onClick={() => this.clearContext()}
                        disabled={this.isProcessing}
                    >
                        🗑️ Clear
                    </button>
                </div>
                
                {/* Input Area */}
                <div className="input-container">
                    <input
                        type="text"
                        placeholder="Ask me anything about your code..."
                        value={this.inputValue}
                        onChange={e => {
                            this.inputValue = e.target.value;
                            this.update();
                        }}
                        onKeyPress={e => {
                            if (e.key === 'Enter' && !this.isProcessing) {
                                this.sendMessage();
                            }
                        }}
                        disabled={this.isProcessing}
                    />
                    <button 
                        onClick={() => this.sendMessage()}
                        disabled={this.isProcessing || !this.inputValue.trim()}
                    >
                        Send
                    </button>
                </div>
            </div>
        );
    }
    
    private renderMessage(msg: IConversationMessage, idx: number): React.ReactNode {
        const isUser = msg.role === 'user';
        const icon = isUser ? '👤' : '🤖';
        
        return (
            <div 
                key={idx} 
                className={`message ${msg.role}`}
            >
                <div className="message-header">
                    <span className="icon">{icon}</span>
                    <span className="role">{isUser ? 'You' : 'Agent'}</span>
                    {msg.metadata?.confidence && (
                        <span className="confidence">
                            {Math.round(msg.metadata.confidence * 100)}% confident
                        </span>
                    )}
                </div>
                <div className="message-content">
                    {this.formatContent(msg.content)}
                </div>
            </div>
        );
    }
    
    private formatContent(content: string): React.ReactNode {
        // Handle markdown-like formatting
        const lines = content.split('\n');
        return lines.map((line, i) => {
            // Headers
            if (line.startsWith('## ')) {
                return <h4 key={i}>{line.substring(3)}</h4>;
            }
            // List items
            if (line.startsWith('- ')) {
                return <li key={i}>{line.substring(2)}</li>;
            }
            // Metrics with bold
            if (line.includes('**')) {
                const parts = line.split(/\*\*(.*?)\*\*/);
                return (
                    <p key={i}>
                        {parts.map((part, j) => 
                            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                        )}
                    </p>
                );
            }
            // Code indicators
            if (line.startsWith('❌') || line.startsWith('⚠️') || line.startsWith('💡') || line.startsWith('ℹ️') || line.startsWith('✅')) {
                return <p key={i} className="indicator">{line}</p>;
            }
            // Regular paragraph
            return line ? <p key={i}>{line}</p> : <br key={i} />;
        });
    }
    
    private async sendMessage(): Promise<void> {
        if (!this.inputValue.trim() || this.isProcessing) return;
        
        const input = this.inputValue;
        this.inputValue = '';
        this.isProcessing = true;
        this.update();
        
        try {
            await this.agentService.process(input);
        } catch (error) {
            console.error('[AIAgentWidget] Error processing message:', error);
        } finally {
            this.isProcessing = false;
            this.update();
        }
    }
    
    async analyzeCurrentFile(): Promise<void> {
        this.isProcessing = true;
        this.update();
        
        try {
            // In real implementation, get code from active editor
            const sampleCode = `
function calculateSum(numbers) {
    let sum = 0;
    for (let i = 0; i < numbers.length; i++) {
        sum += numbers[i];
    }
    console.log('Sum:', sum);
    return sum;
}

const apiKey = "sk-1234567890abcdef";
`;
            
            this.agentService.updateContext({
                variables: new Map([['code', sampleCode]])
            });
            
            await this.agentService.process('analyze this code', {
                capabilities: ['codeAnalysis']
            });
        } finally {
            this.isProcessing = false;
            this.update();
        }
    }
    
    async getSuggestions(): Promise<void> {
        this.isProcessing = true;
        this.update();
        
        try {
            await this.agentService.process('get suggestions for current code', {
                capabilities: ['suggestionProcessor']
            });
        } finally {
            this.isProcessing = false;
            this.update();
        }
    }
    
    clearContext(): void {
        this.agentService.clearContext();
        this.update();
    }
    
    private getStyles(): string {
        return `
            .ai-agent-container {
                display: flex;
                flex-direction: column;
                height: 100%;
                background: var(--theia-editor-background);
                color: var(--theia-foreground);
                font-family: var(--theia-ui-font-family);
            }
            
            .ai-agent-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid var(--theia-panel-border);
                background: var(--theia-sideBar-background);
            }
            
            .ai-agent-header h3 {
                margin: 0;
                font-size: 14px;
            }
            
            .memory-status {
                display: flex;
                gap: 12px;
                font-size: 12px;
                opacity: 0.8;
            }
            
            .active-file {
                padding: 8px 16px;
                font-size: 12px;
                background: var(--theia-editorWidget-background);
                border-bottom: 1px solid var(--theia-panel-border);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .conversation-container {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
            }
            
            .welcome-message {
                text-align: center;
                padding: 24px;
                opacity: 0.8;
            }
            
            .welcome-message h4 {
                margin-bottom: 16px;
            }
            
            .welcome-message ul {
                text-align: left;
                list-style: none;
                padding: 0;
                margin: 16px 0;
            }
            
            .welcome-message li {
                padding: 4px 0;
            }
            
            .message {
                margin-bottom: 16px;
                padding: 12px;
                border-radius: 8px;
            }
            
            .message.user {
                background: var(--theia-button-background);
                margin-left: 24px;
            }
            
            .message.assistant {
                background: var(--theia-editorWidget-background);
                margin-right: 24px;
            }
            
            .message.processing {
                opacity: 0.7;
            }
            
            .message-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
                font-size: 12px;
            }
            
            .message-header .icon {
                font-size: 16px;
            }
            
            .message-header .role {
                font-weight: bold;
            }
            
            .message-header .confidence {
                margin-left: auto;
                opacity: 0.7;
            }
            
            .message-content {
                font-size: 13px;
                line-height: 1.5;
            }
            
            .message-content h4 {
                margin: 12px 0 8px;
                font-size: 13px;
            }
            
            .message-content p {
                margin: 4px 0;
            }
            
            .message-content .indicator {
                padding: 4px 0;
            }
            
            .quick-actions {
                display: flex;
                gap: 8px;
                padding: 12px 16px;
                border-top: 1px solid var(--theia-panel-border);
            }
            
            .quick-actions button {
                flex: 1;
                padding: 8px;
                font-size: 12px;
                border: 1px solid var(--theia-button-border);
                background: var(--theia-button-secondaryBackground);
                color: var(--theia-button-foreground);
                border-radius: 4px;
                cursor: pointer;
            }
            
            .quick-actions button:hover:not(:disabled) {
                background: var(--theia-button-secondaryHoverBackground);
            }
            
            .quick-actions button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .input-container {
                display: flex;
                gap: 8px;
                padding: 12px 16px;
                border-top: 1px solid var(--theia-panel-border);
            }
            
            .input-container input {
                flex: 1;
                padding: 10px 12px;
                font-size: 13px;
                border: 1px solid var(--theia-input-border);
                background: var(--theia-input-background);
                color: var(--theia-input-foreground);
                border-radius: 4px;
            }
            
            .input-container input:focus {
                outline: none;
                border-color: var(--theia-focusBorder);
            }
            
            .input-container button {
                padding: 10px 20px;
                font-size: 13px;
                background: var(--theia-button-background);
                color: var(--theia-button-foreground);
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            
            .input-container button:hover:not(:disabled) {
                background: var(--theia-button-hoverBackground);
            }
            
            .input-container button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .spinner {
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
    }
}
