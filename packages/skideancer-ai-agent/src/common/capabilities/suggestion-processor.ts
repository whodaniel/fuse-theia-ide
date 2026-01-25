/**
 * @fuse/skideancer-ai-agent - Suggestion Processor Capability
 * Ported from SkIDEancer's advanced suggestion system
 * 
 * Features:
 * - Context-aware code completions
 * - Multi-language support
 * - Import analysis
 * - Refactoring suggestions
 * - Required import detection
 */

import { injectable } from '@theia/core/shared/inversify';
import {
    IAgentCapability,
    IAgentContext,
    IAgentResponse,
    IRange,
    ICodeEdit
} from './types';

export interface ISuggestionContext {
    precedingText: string;
    followingText: string;
    lineNumber: number;
    column: number;
    languageId: string;
    documentContext?: {
        imports: string[];
        definitions: string[];
        scope: string[];
    };
}

export interface IProcessedSuggestion {
    text: string;
    displayText: string;
    range: IRange;
    confidence: number;
    type: 'completion' | 'refactoring' | 'documentation' | 'test';
    detail?: string;
    documentation?: string;
    additionalEdits?: ICodeEdit[];
    requiredImports?: string[];
}

@injectable()
export class SuggestionProcessorCapability implements IAgentCapability {
    readonly id = 'suggestionProcessor';
    readonly name = 'Code Suggestions';
    readonly description = 'Provides context-aware code suggestions, completions, and refactoring';
    readonly version = '1.0.0';
    readonly provider = 'FuseAI';
    
    private readonly contextCache = new Map<string, ISuggestionContext>();
    
    async execute(context: IAgentContext): Promise<IAgentResponse> {
        const code = context.variables.get('code') as string || '';
        const cursorLine = context.variables.get('cursorLine') as number || 1;
        const cursorColumn = context.variables.get('cursorColumn') as number || 1;
        const language = context.language || 'typescript';
        
        const suggestionContext = await this.buildContext(code, cursorLine, cursorColumn, language);
        const suggestions = await this.generateSuggestions(suggestionContext, code);
        
        return {
            content: {
                suggestions,
                contextInfo: {
                    imports: suggestionContext.documentContext?.imports || [],
                    scope: suggestionContext.documentContext?.scope || []
                }
            },
            confidence: suggestions.length > 0 ? 0.8 : 0.3,
            explanation: `Generated ${suggestions.length} suggestions for ${language}`
        };
    }
    
    async buildContext(
        code: string,
        lineNumber: number,
        column: number,
        languageId: string
    ): Promise<ISuggestionContext> {
        const cacheKey = `${code.length}-${lineNumber}-${column}`;
        if (this.contextCache.has(cacheKey)) {
            return this.contextCache.get(cacheKey)!;
        }
        
        const lines = code.split('\n');
        const line = lines[lineNumber - 1] || '';
        const precedingText = line.substring(0, column - 1);
        const followingText = line.substring(column - 1);
        
        const documentContext = await this.extractDocumentContext(code, languageId);
        
        const context: ISuggestionContext = {
            precedingText,
            followingText,
            lineNumber,
            column,
            languageId,
            documentContext
        };
        
        // Cache for performance
        this.contextCache.set(cacheKey, context);
        if (this.contextCache.size > 100) {
            // Clear oldest entries
            const firstKey = this.contextCache.keys().next().value;
            if (firstKey) this.contextCache.delete(firstKey);
        }
        
        return context;
    }
    
    private async extractDocumentContext(code: string, languageId: string) {
        const imports: string[] = [];
        const definitions: string[] = [];
        const scope: string[] = [];
        
        const patterns = this.getLanguagePatterns(languageId);
        if (!patterns) {
            return { imports, definitions, scope };
        }
        
        // Extract imports
        const importMatches = code.match(patterns.importPattern);
        if (importMatches) {
            imports.push(...importMatches);
        }
        
        // Extract definitions
        const defMatches = code.match(patterns.definitionPattern);
        if (defMatches) {
            definitions.push(...defMatches);
        }
        
        return { imports, definitions, scope };
    }
    
    private getLanguagePatterns(languageId: string): {
        importPattern: RegExp;
        definitionPattern: RegExp;
        scopePattern: RegExp;
    } | null {
        const patterns: Record<string, {
            importPattern: RegExp;
            definitionPattern: RegExp;
            scopePattern: RegExp;
        }> = {
            typescript: {
                importPattern: /import\s+.*?from\s+['"].*?['"]/g,
                definitionPattern: /(class|interface|type|function|const|let|var)\s+(\w+)/g,
                scopePattern: /^(?:export\s+)?(?:class|namespace)\s+(\w+)/
            },
            javascript: {
                importPattern: /import\s+.*?from\s+['"].*?['"]|require\(['"].*?['"]\)/g,
                definitionPattern: /(class|function|const|let|var)\s+(\w+)/g,
                scopePattern: /^(?:export\s+)?(?:class)\s+(\w+)/
            },
            python: {
                importPattern: /(?:from\s+\S+\s+)?import\s+\S+/g,
                definitionPattern: /(?:class|def)\s+(\w+)/g,
                scopePattern: /^(?:class|def)\s+(\w+)/
            },
            java: {
                importPattern: /import\s+[\w.]+;/g,
                definitionPattern: /(class|interface|enum)\s+(\w+)/g,
                scopePattern: /^(?:public\s+)?(?:class|interface)\s+(\w+)/
            },
            go: {
                importPattern: /import\s+(?:\([^)]+\)|"[^"]+")/g,
                definitionPattern: /(func|type|var|const)\s+(\w+)/g,
                scopePattern: /^(?:func|type)\s+(\w+)/
            },
            rust: {
                importPattern: /use\s+[\w:]+;/g,
                definitionPattern: /(fn|struct|enum|trait|impl)\s+(\w+)/g,
                scopePattern: /^(?:pub\s+)?(?:fn|struct|impl)\s+(\w+)/
            }
        };
        
        return patterns[languageId] || null;
    }
    
    private async generateSuggestions(
        context: ISuggestionContext,
        code: string
    ): Promise<IProcessedSuggestion[]> {
        const suggestions: IProcessedSuggestion[] = [];
        const { precedingText, languageId, lineNumber, column } = context;
        
        // Code completion suggestions based on context
        if (precedingText.endsWith('.')) {
            // Method/property access
            const completions = this.generatePropertyCompletions(precedingText, languageId);
            suggestions.push(...completions.map(c => ({
                ...c,
                range: this.createRange(lineNumber, column, lineNumber, column)
            })));
        }
        
        // Import suggestions
        if (this.needsImport(precedingText, context.documentContext?.imports || [])) {
            const importSuggestions = this.generateImportSuggestions(precedingText, languageId);
            suggestions.push(...importSuggestions);
        }
        
        // Function/method completion
        if (precedingText.match(/\bfunction\s*$|=>\s*$/)) {
            suggestions.push({
                text: '{\n  \n}',
                displayText: 'Function body',
                range: this.createRange(lineNumber, column, lineNumber, column),
                confidence: 0.9,
                type: 'completion',
                detail: 'Insert function body'
            });
        }
        
        // Refactoring suggestions
        const refactorings = this.checkForRefactorings(code, lineNumber);
        suggestions.push(...refactorings);
        
        // Documentation suggestions
        if (this.needsDocumentation(code, lineNumber)) {
            suggestions.push({
                text: this.generateDocComment(languageId),
                displayText: 'Add documentation',
                range: this.createRange(lineNumber, 0, lineNumber, 0),
                confidence: 0.7,
                type: 'documentation',
                detail: 'Generate documentation comment'
            });
        }
        
        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }
    
    private generatePropertyCompletions(
        precedingText: string,
        languageId: string
    ): Omit<IProcessedSuggestion, 'range'>[] {
        const suggestions: Omit<IProcessedSuggestion, 'range'>[] = [];
        
        // Common array methods
        if (precedingText.match(/\[\]\.$/)) {
            const arrayMethods = ['map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every', 'includes'];
            for (const method of arrayMethods) {
                suggestions.push({
                    text: `${method}()`,
                    displayText: method,
                    confidence: 0.85,
                    type: 'completion',
                    detail: `Array.${method}()`,
                    documentation: `Array method: ${method}`
                });
            }
        }
        
        // Common string methods
        if (precedingText.match(/['"`].*['"`]\.$/)) {
            const stringMethods = ['toLowerCase', 'toUpperCase', 'trim', 'split', 'replace', 'includes', 'startsWith', 'endsWith'];
            for (const method of stringMethods) {
                suggestions.push({
                    text: `${method}()`,
                    displayText: method,
                    confidence: 0.85,
                    type: 'completion',
                    detail: `String.${method}()`,
                    documentation: `String method: ${method}`
                });
            }
        }
        
        // Promise methods
        if (precedingText.match(/Promise\.$/)) {
            for (const method of ['all', 'race', 'resolve', 'reject', 'allSettled']) {
                suggestions.push({
                    text: `${method}()`,
                    displayText: method,
                    confidence: 0.9,
                    type: 'completion',
                    detail: `Promise.${method}()`
                });
            }
        }
        
        return suggestions;
    }
    
    private generateImportSuggestions(
        text: string,
        languageId: string
    ): IProcessedSuggestion[] {
        const suggestions: IProcessedSuggestion[] = [];
        
        // Common React imports
        if (text.includes('useState') || text.includes('useEffect')) {
            suggestions.push({
                text: "import { useState, useEffect } from 'react';",
                displayText: 'Import React hooks',
                range: this.createRange(1, 0, 1, 0),
                confidence: 0.95,
                type: 'completion',
                detail: 'Add React hooks import',
                requiredImports: ['react']
            });
        }
        
        // Common lodash
        if (text.includes('_.')) {
            suggestions.push({
                text: "import _ from 'lodash';",
                displayText: 'Import lodash',
                range: this.createRange(1, 0, 1, 0),
                confidence: 0.9,
                type: 'completion',
                requiredImports: ['lodash']
            });
        }
        
        return suggestions;
    }
    
    private needsImport(text: string, existingImports: string[]): boolean {
        const commonPatterns = ['useState', 'useEffect', '_.', 'axios', 'moment'];
        return commonPatterns.some(p => 
            text.includes(p) && !existingImports.some(i => i.includes(p.replace('_.', 'lodash')))
        );
    }
    
    private checkForRefactorings(code: string, lineNumber: number): IProcessedSuggestion[] {
        const suggestions: IProcessedSuggestion[] = [];
        const lines = code.split('\n');
        const line = lines[lineNumber - 1] || '';
        
        // Suggest extracting long conditions
        if (line.includes('if') && line.length > 80) {
            suggestions.push({
                text: '',
                displayText: 'Extract condition to variable',
                range: this.createRange(lineNumber, 0, lineNumber, line.length),
                confidence: 0.7,
                type: 'refactoring',
                detail: 'Extract complex condition to a named boolean variable'
            });
        }
        
        // Suggest async/await for .then chains
        if (line.includes('.then(') || line.includes('.catch(')) {
            suggestions.push({
                text: '',
                displayText: 'Convert to async/await',
                range: this.createRange(lineNumber, 0, lineNumber, line.length),
                confidence: 0.75,
                type: 'refactoring',
                detail: 'Convert Promise chain to async/await syntax'
            });
        }
        
        return suggestions;
    }
    
    private needsDocumentation(code: string, lineNumber: number): boolean {
        const lines = code.split('\n');
        const line = lines[lineNumber - 1] || '';
        const prevLine = lines[lineNumber - 2] || '';
        
        // Check if current line is a function/class definition without docs
        const needsDocs = /^(?:export\s+)?(?:async\s+)?(?:function|class|interface|type)\s+\w+/.test(line.trim());
        const hasDocs = prevLine.trim().endsWith('*/') || prevLine.trim().startsWith('//');
        
        return needsDocs && !hasDocs;
    }
    
    private generateDocComment(languageId: string): string {
        if (languageId === 'python') {
            return '"""\n    Description here.\n    \n    Args:\n        \n    Returns:\n        \n    """\n';
        }
        
        // JSDoc style for most languages
        return '/**\n * Description here.\n * \n * @param \n * @returns \n */\n';
    }
    
    private createRange(
        startLine: number,
        startColumn: number,
        endLine: number,
        endColumn: number
    ): IRange {
        return { startLine, startColumn, endLine, endColumn };
    }
}
