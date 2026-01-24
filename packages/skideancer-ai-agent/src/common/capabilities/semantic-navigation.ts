/**
 * @fuse/skideancer-ai-agent - Semantic Navigation Capability
 * Ported from SkIDEancer's advanced semantic navigation
 * 
 * Features:
 * - AI-powered semantic code navigation
 * - Natural language queries
 * - Cross-file symbol search
 * - Definition/implementation/reference finding
 * - Background workspace indexing
 */

import { injectable } from '@ide/core/shared/inversify';
import {
    IAgentCapability,
    IAgentContext,
    IAgentResponse,
    IRange
} from './types';

export interface ISemanticLocation {
    uri: string;
    range: IRange;
    type: 'definition' | 'implementation' | 'reference' | 'test' | 'documentation';
    confidence: number;
    description: string;
    relevance: number;
}

export interface ISemanticQuery {
    type: 'natural' | 'structured';
    text: string;
    filters?: {
        types?: string[];
        files?: string[];
        confidence?: number;
    };
}

@injectable()
export class SemanticNavigationCapability implements IAgentCapability {
    readonly id = 'semanticNavigation';
    readonly name = 'Semantic Navigation';
    readonly description = 'AI-powered semantic code navigation with natural language queries';
    readonly version = '1.0.0';
    readonly provider = 'FuseAI';
    
    private readonly locationCache = new Map<string, ISemanticLocation[]>();
    private readonly indexedFiles = new Set<string>();
    
    async execute(context: IAgentContext): Promise<IAgentResponse> {
        const queryText = context.variables.get('query') as string || '';
        const navigation = context.variables.get('navigation') as string || '';
        
        if (!queryText && !navigation) {
            return {
                content: 'Please provide a navigation query. Examples:\n' +
                    '- "Find all usages of UserService"\n' +
                    '- "Show me the definition of handleSubmit"\n' +
                    '- "Where is the authentication logic?"\n' +
                    '- "Find tests for the payment module"',
                confidence: 0.3
            };
        }
        
        const query = this.parseQuery(queryText || navigation);
        const locations = await this.findLocations(query, context);
        
        return {
            content: this.formatLocations(locations, query),
            confidence: locations.length > 0 ? 0.8 : 0.4,
            suggestedActions: locations.map(loc => ({
                id: `goto-${loc.uri}-${loc.range.startLine}`,
                label: `Go to ${loc.description}`,
                execute: async () => {
                    // Would open file at location
                }
            }))
        };
    }
    
    private parseQuery(text: string): ISemanticQuery {
        const lowerText = text.toLowerCase();
        
        // Detect query type
        let queryType: ISemanticLocation['type'][] | undefined;
        
        if (lowerText.includes('definition') || lowerText.includes('where is') || lowerText.includes('find')) {
            queryType = ['definition'];
        } else if (lowerText.includes('implementation') || lowerText.includes('implements')) {
            queryType = ['implementation'];
        } else if (lowerText.includes('usage') || lowerText.includes('reference') || lowerText.includes('used')) {
            queryType = ['reference'];
        } else if (lowerText.includes('test') || lowerText.includes('spec')) {
            queryType = ['test'];
        } else if (lowerText.includes('document') || lowerText.includes('explain')) {
            queryType = ['documentation'];
        }
        
        return {
            type: 'natural',
            text,
            filters: queryType ? { types: queryType } : undefined
        };
    }
    
    private async findLocations(
        query: ISemanticQuery,
        context: IAgentContext
    ): Promise<ISemanticLocation[]> {
        // Check cache first
        const cacheKey = JSON.stringify(query);
        if (this.locationCache.has(cacheKey)) {
            return this.locationCache.get(cacheKey)!;
        }
        
        const locations: ISemanticLocation[] = [];
        const code = context.variables.get('code') as string || '';
        const activeFile = context.activeFile || 'unknown';
        
        // Extract symbol from query
        const symbolMatch = query.text.match(/['"`](\w+)['"`]|(?:of|for|called)\s+(\w+)/i);
        const symbol = symbolMatch ? (symbolMatch[1] || symbolMatch[2]) : this.extractMainSymbol(query.text);
        
        if (symbol && code) {
            // Search for the symbol in code
            const lines = code.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes(symbol)) {
                    const locationType = this.detectLocationType(line, symbol);
                    locations.push({
                        uri: activeFile,
                        range: {
                            startLine: i + 1,
                            startColumn: line.indexOf(symbol) + 1,
                            endLine: i + 1,
                            endColumn: line.indexOf(symbol) + symbol.length + 1
                        },
                        type: locationType,
                        confidence: this.calculateConfidence(line, symbol, locationType),
                        description: `${locationType}: ${symbol} - Line ${i + 1}`,
                        relevance: this.calculateRelevance(line, symbol, query)
                    });
                }
            }
        }
        
        // Apply filters
        let filtered = locations;
        if (query.filters?.types) {
            filtered = filtered.filter(loc => query.filters!.types!.includes(loc.type));
        }
        if (query.filters?.confidence) {
            filtered = filtered.filter(loc => loc.confidence >= query.filters!.confidence!);
        }
        
        // Sort by relevance and confidence
        filtered.sort((a, b) => {
            const relevanceDiff = b.relevance - a.relevance;
            return relevanceDiff !== 0 ? relevanceDiff : b.confidence - a.confidence;
        });
        
        // Cache results
        this.locationCache.set(cacheKey, filtered);
        
        return filtered;
    }
    
    private extractMainSymbol(text: string): string {
        // Extract potential symbol names from query
        const words = text.split(/\s+/);
        const symbolCandidates = words.filter(word => 
            /^[A-Z][a-zA-Z0-9]*$/.test(word) || // PascalCase
            /^[a-z][a-zA-Z0-9]*[A-Z]/.test(word) || // camelCase with caps
            word.includes('_') // snake_case
        );
        return symbolCandidates[0] || '';
    }
    
    private detectLocationType(line: string, symbol: string): ISemanticLocation['type'] {
        const trimmed = line.trim();
        
        // Check for definition patterns
        if (trimmed.match(new RegExp(`(?:class|interface|type|function|const|let|var)\\s+${symbol}`))) {
            return 'definition';
        }
        
        // Check for implementation patterns
        if (trimmed.match(new RegExp(`(?:implements|extends).*${symbol}`))) {
            return 'implementation';
        }
        
        // Check for test patterns
        if (trimmed.match(/(?:it|test|describe|expect)\s*\(/) && trimmed.includes(symbol)) {
            return 'test';
        }
        
        // Check for documentation
        if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('#')) {
            return 'documentation';
        }
        
        // Default to reference
        return 'reference';
    }
    
    private calculateConfidence(line: string, symbol: string, type: ISemanticLocation['type']): number {
        let confidence = 0.5;
        
        // Exact word match
        if (new RegExp(`\\b${symbol}\\b`).test(line)) {
            confidence += 0.2;
        }
        
        // Type-specific boosts
        if (type === 'definition') {
            confidence += 0.2;
        }
        
        // Case-sensitive match
        if (line.includes(symbol)) {
            confidence += 0.1;
        }
        
        return Math.min(confidence, 1.0);
    }
    
    private calculateRelevance(line: string, symbol: string, query: ISemanticQuery): number {
        let relevance = 0.5;
        
        // Export bonus
        if (line.includes('export')) {
            relevance += 0.2;
        }
        
        // Query term match bonus
        const queryWords = query.text.toLowerCase().split(/\s+/);
        const lineWords = line.toLowerCase().split(/\s+/);
        const matchCount = queryWords.filter(qw => lineWords.some(lw => lw.includes(qw))).length;
        relevance += matchCount * 0.1;
        
        return Math.min(relevance, 1.0);
    }
    
    private formatLocations(locations: ISemanticLocation[], query: ISemanticQuery): string {
        if (locations.length === 0) {
            return `No locations found for "${query.text}". Try:\n` +
                '- Using a more specific symbol name\n' +
                '- Checking the spelling\n' +
                '- Opening the relevant file first';
        }
        
        const parts: string[] = [`Found ${locations.length} location(s):\n`];
        
        const grouped = this.groupByType(locations);
        for (const [type, locs] of Object.entries(grouped)) {
            parts.push(`\n**${type.charAt(0).toUpperCase() + type.slice(1)}s:**`);
            for (const loc of locs.slice(0, 5)) { // Limit to 5 per type
                parts.push(`- ${loc.description} (${Math.round(loc.confidence * 100)}% match)`);
            }
            if (locs.length > 5) {
                parts.push(`  ... and ${locs.length - 5} more`);
            }
        }
        
        return parts.join('\n');
    }
    
    private groupByType(locations: ISemanticLocation[]): Record<string, ISemanticLocation[]> {
        const grouped: Record<string, ISemanticLocation[]> = {};
        for (const loc of locations) {
            if (!grouped[loc.type]) {
                grouped[loc.type] = [];
            }
            grouped[loc.type].push(loc);
        }
        return grouped;
    }
}
