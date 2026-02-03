/**
 * @fuse/skideancer-ai-agent - AI Agent View Contribution
 *
 * Contributes the AI Agent panel to the SkIDEancer workbench
 */

import { CommandRegistry, CommandService, MenuModelRegistry } from '@theia/core';
import {
  AbstractViewContribution,
  FrontendApplication,
  FrontendApplicationContribution,
} from '@theia/core/lib/browser';
import { inject, injectable, postConstruct } from '@theia/core/shared/inversify';

import { AIAgentWidget } from './ai-agent-widget';

export const AI_AGENT_WIDGET_FACTORY_ID = 'ai-agent-widget';

export const AIAgentCommands = {
  OPEN_AGENT: {
    id: 'ai-agent.open',
    label: 'SkIDEancer Agent: Open Panel',
  },
  ANALYZE_CODE: {
    id: 'ai-agent.analyze',
    label: 'SkIDEancer Agent: Analyze Current File',
  },
  CLEAR_CONTEXT: {
    id: 'ai-agent.clear-context',
    label: 'SkIDEancer Agent: Clear Memory',
  },
  SUGGEST: {
    id: 'ai-agent.suggest',
    label: 'SkIDEancer Agent: Get Suggestions',
  },
  OPEN_BROWSER_HUB: {
    id: 'browser-hub.open',
    label: 'TNF: Open Browser Hub',
  },
  OPEN_EXTENSIONS_HUB: {
    id: 'browser-hub.extensions',
    label: 'TNF: Open Extensions Hub',
  },
};

@injectable()
export class AIAgentViewContribution
  extends AbstractViewContribution<AIAgentWidget>
  implements FrontendApplicationContribution
{
  @inject(CommandService) protected readonly commandService: CommandService;

  constructor() {
    super({
      widgetId: AI_AGENT_WIDGET_FACTORY_ID,
      widgetName: 'SkIDEancer Agent',
      defaultWidgetOptions: {
        area: 'right',
        rank: 100,
      },
      toggleCommandId: AIAgentCommands.OPEN_AGENT.id,
    });
  }

  @postConstruct()
  protected init(): void {
    // console.log('[AIAgentViewContribution] Initialized');
  }

  async initializeLayout(_app: FrontendApplication): Promise<void> {
    // Optionally open the widget by default
    // await this.openView({ activate: false, reveal: true });
  }

  registerCommands(commands: CommandRegistry): void {
    super.registerCommands(commands);

    commands.registerCommand(AIAgentCommands.ANALYZE_CODE, {
      execute: () => this.analyzeCurrentFile(),
      isEnabled: () => true,
    });

    commands.registerCommand(AIAgentCommands.CLEAR_CONTEXT, {
      execute: () => this.clearContext(),
      isEnabled: () => true,
    });

    commands.registerCommand(AIAgentCommands.SUGGEST, {
      execute: () => this.getSuggestions(),
      isEnabled: () => true,
    });

    commands.registerCommand(AIAgentCommands.OPEN_BROWSER_HUB, {
      execute: () => this.openBrowserHub(),
      isEnabled: () => true,
    });

    commands.registerCommand(AIAgentCommands.OPEN_EXTENSIONS_HUB, {
      execute: () => this.openExtensionsHub(),
      isEnabled: () => true,
    });
  }

  registerMenus(menus: MenuModelRegistry): void {
    super.registerMenus(menus);

    // Add to View menu
    menus.registerMenuAction(['view'], {
      commandId: AIAgentCommands.OPEN_AGENT.id,
      label: 'SkIDEancer Agent',
      order: '0',
    });

    menus.registerMenuAction(['view'], {
      commandId: AIAgentCommands.OPEN_BROWSER_HUB.id,
      label: 'TNF Browser Hub',
      order: '1',
    });

    menus.registerMenuAction(['view'], {
      commandId: AIAgentCommands.OPEN_EXTENSIONS_HUB.id,
      label: 'TNF Extensions Hub',
      order: '2',
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

  private openBrowserHub(): void {
    const url = window.location.origin + '/static/browser-hub/enhanced-browser-hub.html';
    this.commandService.executeCommand('options.mini-browser.open', url);
  }

  private openExtensionsHub(): void {
    const url = window.location.origin + '/static/browser-hub/extensions.html';
    this.commandService.executeCommand('options.mini-browser.open', url);
  }
}
