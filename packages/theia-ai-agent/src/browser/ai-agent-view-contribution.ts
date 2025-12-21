/**
 * @fuse/theia-ai-agent - AI Agent View Contribution
 * 
 * Contributes the AI Agent panel to the Theia workbench
 */

import { injectable, inject, postConstruct } from '@theia/core/shared/inversify';
import { AbstractViewContribution, FrontendApplicationContribution, FrontendApplication } from '@theia/core/lib/browser';
import { Command, CommandRegistry, MenuModelRegistry } from '@theia/core';
import { AIAgentWidget } from './ai-agent-widget';

export const AI_AGENT_WIDGET_FACTORY_ID = 'ai-agent-widget';

export const AIAgentCommands = {
    OPEN_AGENT: {
        id: 'ai-agent.open',
        label: 'AI Agent: Open Panel'
    },
    ANALYZE_CODE: {
        id: 'ai-agent.analyze',
        label: 'AI Agent: Analyze Current File'
    },
    CLEAR_CONTEXT: {
        id: 'ai-agent.clear-context',
        label: 'AI Agent: Clear Memory'
    },
    SUGGEST: {
        id: 'ai-agent.suggest',
        label: 'AI Agent: Get Suggestions'
    }
};

@injectable()
export class AIAgentViewContribution extends AbstractViewContribution<AIAgentWidget> implements FrontendApplicationContribution {
    
    constructor() {
        super({
            widgetId: AI_AGENT_WIDGET_FACTORY_ID,
            widgetName: 'AI Agent',
            defaultWidgetOptions: {
                area: 'right',
                rank: 100
            },
            toggleCommandId: AIAgentCommands.OPEN_AGENT.id
        });
    }
    
    @postConstruct()
    protected init(): void {
        console.log('[AIAgentViewContribution] Initialized');
    }
    
    async initializeLayout(app: FrontendApplication): Promise<void> {
        // Optionally open the widget by default
        // await this.openView({ activate: false, reveal: true });
    }
    
    registerCommands(commands: CommandRegistry): void {
        super.registerCommands(commands);
        
        commands.registerCommand(AIAgentCommands.ANALYZE_CODE, {
            execute: () => this.analyzeCurrentFile(),
            isEnabled: () => true
        });
        
        commands.registerCommand(AIAgentCommands.CLEAR_CONTEXT, {
            execute: () => this.clearContext(),
            isEnabled: () => true
        });
        
        commands.registerCommand(AIAgentCommands.SUGGEST, {
            execute: () => this.getSuggestions(),
            isEnabled: () => true
        });
    }
    
    registerMenus(menus: MenuModelRegistry): void {
        super.registerMenus(menus);
        
        // Add to View menu
        menus.registerMenuAction(['view'], {
            commandId: AIAgentCommands.OPEN_AGENT.id,
            label: 'AI Agent',
            order: '0'
        });
    }
    
    private async analyzeCurrentFile(): Promise<void> {
        const widget = await this.openView({ activate: true });
        if (widget) {
            widget.analyzeCurrentFile();
        }
    }
    
    private async clearContext(): Promise<void> {
        const widget = await this.openView({ activate: true });
        if (widget) {
            widget.clearContext();
        }
    }
    
    private async getSuggestions(): Promise<void> {
        const widget = await this.openView({ activate: true });
        if (widget) {
            widget.getSuggestions();
        }
    }
}
