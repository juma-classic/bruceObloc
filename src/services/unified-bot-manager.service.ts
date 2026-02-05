/**
 * Unified Bot Manager Service
 * Single source of truth for all bot operations - Raziel and Patel
 * Eliminates bot drift and provides unified parameter management
 */

export interface UnifiedBotParameters {
    // Core parameters - SINGLE SOURCE OF TRUTH
    stake: number;
    martingale: number;
    
    // Over/Under logic - UNIFIED SYSTEM
    predictionBeforeLoss: number;
    predictionAfterLoss: number;
    
    // Market configuration
    market: string;
    contractType: 'DIGITOVER' | 'DIGITUNDER';
    
    // Signal context
    signalType: 'HOT_COLD_ZONE' | 'DISTRIBUTION_DEVIATION';
    confidence: number;
    targetDigit?: number;
    
    // Enhanced predictions (long-press mode)
    enhancedMode?: boolean;
    enhancedPredictions?: {
        beforeLoss: number;
        afterLoss: number;
    };
}

export interface BotConfiguration {
    botName: 'RAZIEL' | 'PATEL';
    xmlFile: string;
    parameters: UnifiedBotParameters;
    blockMappings: BlockMapping[];
}

export interface BlockMapping {
    parameter: keyof UnifiedBotParameters;
    blockId?: string;
    fieldName?: string;
    variableName?: string;
    fallbackSelector?: string;
}

export interface BotLoadResult {
    success: boolean;
    botName: string;
    loadTime: number;
    parametersInjected: number;
    errors: string[];
    warnings: string[];
}

class UnifiedBotManagerService {
    private currentParameters: UnifiedBotParameters | null = null;
    private isLoading = false;
    private loadListeners: Array<(result: BotLoadResult) => void> = [];

    // UNIFIED OVER/UNDER LOGIC - SINGLE SOURCE OF TRUTH
    private readonly OVER_UNDER_LOGIC = {
        OVER: {
            predictionBeforeLoss: 2,
            predictionAfterLoss: 3,
            contractType: 'DIGITOVER' as const
        },
        UNDER: {
            predictionBeforeLoss: 7,
            predictionAfterLoss: 6,
            contractType: 'DIGITUNDER' as const
        }
    };

    // BOT CONFIGURATIONS - ELIMINATES DRIFT
    private readonly BOT_CONFIGS: Record<string, Omit<BotConfiguration, 'parameters'>> = {
        RAZIEL: {
            botName: 'RAZIEL',
            xmlFile: 'Raziel Over Under.xml',
            blockMappings: [
                // Stake mappings - BOTH blocks must be updated (using exact block IDs from XML)
                { parameter: 'stake', blockId: 'TDv/W;dNI84TFbp}8X8=', fieldName: 'NUM' },
                { parameter: 'stake', blockId: '9Z%4%dmqCp;/sSt8wGv#', fieldName: 'NUM' },
                
                // Martingale mapping (using exact block ID from XML)
                { parameter: 'martingale', blockId: 'Ib,Krc`nUJzn1KMo9)`A', fieldName: 'NUM' },
                
                // Prediction mappings (using exact block IDs from XML)
                { parameter: 'predictionBeforeLoss', blockId: '~]Q~lGg)3FCGB95VKA`b', fieldName: 'NUM' },
                { parameter: 'predictionAfterLoss', blockId: '(6)D~Nlfu/PCG*s5!9Qy', fieldName: 'NUM' },
                
                // Market and contract type
                { parameter: 'market', fieldName: 'SYMBOL_LIST' },
                { parameter: 'contractType', fieldName: 'TYPE_LIST' },
                { parameter: 'contractType', fieldName: 'PURCHASE_LIST' }
            ]
        },
        PATEL: {
            botName: 'PATEL',
            xmlFile: 'PATEL (with Entry).xml',
            blockMappings: [
                // Stake mappings - BOTH blocks must be updated (using exact block IDs from XML)
                { parameter: 'stake', blockId: 'NXTESPL-dgp,uEC?MS{L', fieldName: 'NUM' },
                { parameter: 'stake', blockId: 'P)ecQL^klyV-vtB4Yl]o', fieldName: 'NUM' },
                
                // Martingale mapping (using exact block ID from XML)
                { parameter: 'martingale', blockId: 'Ho(2Mt~+G07UT|gMt.7)', fieldName: 'NUM' },
                
                // Prediction mappings (using exact block IDs from XML)
                { parameter: 'predictionBeforeLoss', blockId: 'ds#,)MD-cK$O6Oiu=p8o', fieldName: 'NUM' },
                { parameter: 'predictionAfterLoss', blockId: '#~Ah/G7=NM2HbHHG]P8N', fieldName: 'NUM' },
                
                // Market mapping
                { parameter: 'market', fieldName: 'SYMBOL_LIST' },
                
                // Contract type - PATEL uses 'both' but we'll override in purchase blocks
                { parameter: 'contractType', fieldName: 'PURCHASE_LIST' }
            ]
        }
    };

    /**
     * Create unified parameters from signal data
     */
    public createUnifiedParameters(
        signalData: {
            action: 'OVER' | 'UNDER';
            market: string;
            confidence: number;
            targetDigit?: number;
            signalType: 'HOT_COLD_ZONE' | 'DISTRIBUTION_DEVIATION';
            enhancedMode?: boolean;
            enhancedPredictions?: { beforeLoss: number; afterLoss: number };
        },
        customSettings?: { stake: number; martingale: number }
    ): UnifiedBotParameters {
        
        // Get unified over/under logic
        const logic = this.OVER_UNDER_LOGIC[signalData.action];
        
        // Use enhanced predictions if available, otherwise use unified logic
        let predictionBeforeLoss = logic.predictionBeforeLoss;
        let predictionAfterLoss = logic.predictionAfterLoss;
        
        if (signalData.enhancedMode && signalData.enhancedPredictions) {
            predictionBeforeLoss = signalData.enhancedPredictions.beforeLoss;
            predictionAfterLoss = signalData.enhancedPredictions.afterLoss;
            console.log('🔥 Using enhanced predictions:', { predictionBeforeLoss, predictionAfterLoss });
        }

        const parameters: UnifiedBotParameters = {
            // Core parameters
            stake: customSettings?.stake || 1,
            martingale: customSettings?.martingale || 2.2,
            
            // Unified over/under logic
            predictionBeforeLoss,
            predictionAfterLoss,
            
            // Market configuration
            market: signalData.market,
            contractType: logic.contractType,
            
            // Signal context
            signalType: signalData.signalType,
            confidence: signalData.confidence,
            targetDigit: signalData.targetDigit,
            
            // Enhanced mode
            enhancedMode: signalData.enhancedMode,
            enhancedPredictions: signalData.enhancedPredictions
        };

        // Store as current parameters
        this.currentParameters = parameters;
        
        console.log('🎯 Unified parameters created:', parameters);
        return parameters;
    }

    /**
     * Load bot with unified parameters - MAIN ENTRY POINT
     */
    public async loadBot(
        botName: 'RAZIEL' | 'PATEL',
        parameters: UnifiedBotParameters,
        autoStart = true
    ): Promise<BotLoadResult> {
        
        if (this.isLoading) {
            throw new Error('Bot loading already in progress');
        }

        // Validate parameters
        const validation = this.validateParameters(parameters);
        if (!validation.isValid) {
            throw new Error(`Parameter validation failed: ${validation.errors.join(', ')}`);
        }

        this.isLoading = true;
        const startTime = performance.now();
        const result: BotLoadResult = {
            success: false,
            botName,
            loadTime: 0,
            parametersInjected: 0,
            errors: [],
            warnings: []
        };

        try {
            console.log(`🤖 Loading ${botName} bot with unified parameters...`);
            console.log('📊 Parameters:', parameters);
            
            // Get bot configuration
            const config = this.getBotConfiguration(botName, parameters);
            
            // Load XML file
            const xmlContent = await this.loadBotXML(config.xmlFile);
            
            // Inject parameters into XML
            const { configuredXML, injectedCount, errors, warnings } = 
                await this.injectParameters(xmlContent, config);
            
            result.parametersInjected = injectedCount;
            result.errors = errors;
            result.warnings = warnings;
            
            // Validate that critical parameters were injected
            if (injectedCount < 3) { // At minimum: stake, martingale, predictions
                result.warnings.push(`Only ${injectedCount} parameters injected, expected at least 3`);
            }
            
            // Load into bot builder
            await this.loadIntoBotBuilder(configuredXML, config);
            
            // Auto-start if requested
            if (autoStart) {
                await this.autoStartBot();
            }
            
            result.success = true;
            result.loadTime = performance.now() - startTime;
            
            console.log(`✅ ${botName} bot loaded successfully in ${result.loadTime.toFixed(0)}ms`);
            console.log(`📊 Injection summary: ${injectedCount} parameters, ${errors.length} errors, ${warnings.length} warnings`);
            
            // Notify listeners
            this.notifyLoadListeners(result);
            
            return result;
            
        } catch (error) {
            result.success = false;
            result.loadTime = performance.now() - startTime;
            result.errors.push((error as Error).message);
            
            console.error(`❌ Failed to load ${botName} bot:`, error);
            
            // Notify listeners of failure
            this.notifyLoadListeners(result);
            
            throw error;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Validate unified parameters
     */
    private validateParameters(parameters: UnifiedBotParameters): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Validate stake
        if (!parameters.stake || parameters.stake <= 0) {
            errors.push('Stake must be greater than 0');
        }

        // Validate martingale
        if (!parameters.martingale || parameters.martingale < 1) {
            errors.push('Martingale must be greater than or equal to 1');
        }

        // Validate predictions
        if (parameters.predictionBeforeLoss < 0 || parameters.predictionBeforeLoss > 9) {
            errors.push('Prediction before loss must be between 0 and 9');
        }

        if (parameters.predictionAfterLoss < 0 || parameters.predictionAfterLoss > 9) {
            errors.push('Prediction after loss must be between 0 and 9');
        }

        // Validate market
        if (!parameters.market || parameters.market.trim() === '') {
            errors.push('Market is required');
        }

        // Validate contract type
        if (!['DIGITOVER', 'DIGITUNDER'].includes(parameters.contractType)) {
            errors.push('Contract type must be DIGITOVER or DIGITUNDER');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get bot configuration with parameters
     */
    private getBotConfiguration(botName: 'RAZIEL' | 'PATEL', parameters: UnifiedBotParameters): BotConfiguration {
        const baseConfig = this.BOT_CONFIGS[botName];
        if (!baseConfig) {
            throw new Error(`Unknown bot: ${botName}`);
        }

        return {
            ...baseConfig,
            parameters
        };
    }

    /**
     * Load bot XML file
     */
    private async loadBotXML(xmlFile: string): Promise<string> {
        try {
            const response = await fetch(`/${xmlFile}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${xmlFile}: ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Failed to load ${xmlFile}:`, error);
            throw error;
        }
    }

    /**
     * Inject parameters into XML - ROBUST IMPLEMENTATION
     */
    private async injectParameters(
        xmlContent: string, 
        config: BotConfiguration
    ): Promise<{
        configuredXML: string;
        injectedCount: number;
        errors: string[];
        warnings: string[];
    }> {
        
        let configuredXML = xmlContent;
        let injectedCount = 0;
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            console.log('🔧 Injecting parameters into XML...');
            
            // Parse XML
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
            
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                throw new Error(`XML parsing failed: ${parseError.textContent}`);
            }

            // Process each block mapping
            for (const mapping of config.blockMappings) {
                try {
                    const value = config.parameters[mapping.parameter];
                    if (value === undefined || value === null) {
                        warnings.push(`Parameter ${mapping.parameter} is undefined`);
                        continue;
                    }

                    let injected = false;

                    // Try block ID first (most specific)
                    if (mapping.blockId && mapping.fieldName) {
                        const block = xmlDoc.querySelector(`block[id="${mapping.blockId}"] field[name="${mapping.fieldName}"]`);
                        if (block) {
                            block.textContent = value.toString();
                            injected = true;
                            injectedCount++;
                            console.log(`✅ Injected ${mapping.parameter}=${value} via block ID ${mapping.blockId}`);
                        }
                    }

                    // Try field name (broader search)
                    if (!injected && mapping.fieldName) {
                        const fields = xmlDoc.querySelectorAll(`field[name="${mapping.fieldName}"]`);
                        if (fields.length > 0) {
                            fields.forEach(field => {
                                field.textContent = value.toString();
                                injected = true;
                                injectedCount++;
                            });
                            console.log(`✅ Injected ${mapping.parameter}=${value} via field name ${mapping.fieldName} (${fields.length} fields)`);
                        }
                    }

                    // Try variable name
                    if (!injected && mapping.variableName) {
                        const varFields = xmlDoc.querySelectorAll(`field[name="VAR"]`);
                        varFields.forEach(varField => {
                            if (varField.textContent === mapping.variableName) {
                                const block = varField.closest('block');
                                const numField = block?.querySelector('value[name="VALUE"] block[type="math_number"] field[name="NUM"]');
                                if (numField) {
                                    numField.textContent = value.toString();
                                    injected = true;
                                    injectedCount++;
                                    console.log(`✅ Injected ${mapping.parameter}=${value} via variable ${mapping.variableName}`);
                                }
                            }
                        });
                    }

                    if (!injected) {
                        warnings.push(`Failed to inject ${mapping.parameter}=${value}`);
                    }

                } catch (error) {
                    errors.push(`Error injecting ${mapping.parameter}: ${(error as Error).message}`);
                }
            }

            // Serialize back to XML
            const serializer = new XMLSerializer();
            configuredXML = serializer.serializeToString(xmlDoc);

            console.log(`🔧 Parameter injection completed: ${injectedCount} parameters injected`);

        } catch (error) {
            errors.push(`XML processing failed: ${(error as Error).message}`);
            console.warn('XML processing failed, using string replacement fallback');
            
            // Fallback to string replacement
            const fallbackResult = this.injectParametersWithStringReplacement(xmlContent, config);
            configuredXML = fallbackResult.configuredXML;
            injectedCount += fallbackResult.injectedCount;
        }

        return { configuredXML, injectedCount, errors, warnings };
    }

    /**
     * Fallback string replacement method
     */
    private injectParametersWithStringReplacement(
        xmlContent: string,
        config: BotConfiguration
    ): { configuredXML: string; injectedCount: number } {
        
        let configuredXML = xmlContent;
        let injectedCount = 0;

        console.log('🔄 Using string replacement fallback...');

        // Replace specific patterns for each bot
        if (config.botName === 'RAZIEL') {
            // Stake replacements
            configuredXML = configuredXML.replace(
                /(<block type="math_number" id="TDv\/W;dNI84TFbp}8X8=">[\s]*<field name="NUM">)2(<\/field>)/,
                `$1${config.parameters.stake}$2`
            );
            configuredXML = configuredXML.replace(
                /(<block type="math_number" id="9Z%4%dmqCp;\/sSt8wGv#">[\s]*<field name="NUM">)2(<\/field>)/,
                `$1${config.parameters.stake}$2`
            );
            injectedCount += 2;

            // Martingale replacement
            configuredXML = configuredXML.replace(
                /(<block type="math_number" id="Ib,Krc`nUJzn1KMo9\)`A">[\s]*<field name="NUM">)2(<\/field>)/,
                `$1${config.parameters.martingale}$2`
            );
            injectedCount++;

            // Prediction replacements
            configuredXML = configuredXML.replace(
                /(<block type="math_number" id="~\]Q~lGg\)3FCGB95VKA`b">[\s]*<field name="NUM">)2(<\/field>)/,
                `$1${config.parameters.predictionBeforeLoss}$2`
            );
            configuredXML = configuredXML.replace(
                /(<block type="math_number" id="\(6\)D~Nlfu\/PCG\*s5!9Qy">[\s]*<field name="NUM">)3(<\/field>)/,
                `$1${config.parameters.predictionAfterLoss}$2`
            );
            injectedCount += 2;

        } else if (config.botName === 'PATEL') {
            // PATEL-specific string replacements (using exact values from XML)
            configuredXML = configuredXML.replace(
                /(<block type="math_number" id="NXTESPL-dgp,uEC\?MS\{L">[\s]*<field name="NUM">)3\.27(<\/field>)/,
                `$1${config.parameters.stake}$2`
            );
            configuredXML = configuredXML.replace(
                /(<block type="math_number" id="P\)ecQL\^klyV-vtB4Yl\]o">[\s]*<field name="NUM">)3\.27(<\/field>)/,
                `$1${config.parameters.stake}$2`
            );
            injectedCount += 2;

            // Martingale (default value is 2 in PATEL XML)
            configuredXML = configuredXML.replace(
                /(<block type="math_number" id="Ho\(2Mt~\+G07UT\|gMt\.7\)">[\s]*<field name="NUM">)2(<\/field>)/,
                `$1${config.parameters.martingale}$2`
            );
            injectedCount++;

            // Predictions (PATEL defaults: before=1, after=3)
            configuredXML = configuredXML.replace(
                /(<block type="math_number" id="ds#,\)MD-cK\$O6Oiu=p8o">[\s]*<field name="NUM">)1(<\/field>)/,
                `$1${config.parameters.predictionBeforeLoss}$2`
            );
            configuredXML = configuredXML.replace(
                /(<block type="math_number" id="#~Ah\/G7=NM2HbHHG\]P8N">[\s]*<field name="NUM">)3(<\/field>)/,
                `$1${config.parameters.predictionAfterLoss}$2`
            );
            injectedCount += 2;
        }

        // Market and contract type replacements (common)
        configuredXML = configuredXML.replace(
            /<field name="SYMBOL_LIST">[^<]*<\/field>/g,
            `<field name="SYMBOL_LIST">${config.parameters.market}</field>`
        );
        configuredXML = configuredXML.replace(
            /<field name="TYPE_LIST">[^<]*<\/field>/g,
            `<field name="TYPE_LIST">${config.parameters.contractType}</field>`
        );
        configuredXML = configuredXML.replace(
            /<field name="PURCHASE_LIST">[^<]*<\/field>/g,
            `<field name="PURCHASE_LIST">${config.parameters.contractType}</field>`
        );
        injectedCount += 3;

        console.log(`✅ String replacement completed: ${injectedCount} parameters injected`);
        return { configuredXML, injectedCount };
    }

    /**
     * Load configured bot into builder - DIRECT INJECTION
     */
    private async loadIntoBotBuilder(xmlContent: string, config: BotConfiguration): Promise<void> {
        console.log('🤖 Loading bot into builder...');

        // Ensure correct app ID is set (82255 for production trading)
        this.ensureCorrectAppId(xmlContent);

        // Method 1: Use load modal (most reliable)
        if (typeof window !== 'undefined') {
            const windowGlobals = window as any;
            if (windowGlobals.load_modal?.loadStrategyToBuilder) {
                // Switch to Bot Builder tab first
                await this.switchToBotBuilderTab();
                
                const botObject = {
                    id: `${config.botName.toLowerCase()}-unified-${Date.now()}`,
                    name: `${config.botName} Bot (Unified)`,
                    xml: xmlContent,
                    save_type: 'LOCAL'
                };

                await windowGlobals.load_modal.loadStrategyToBuilder(botObject);
                console.log('✅ Bot loaded via load modal');
                return;
            }
        }

        // Method 2: Try alternative load modal store
        if (typeof window !== 'undefined') {
            const windowGlobals = window as any;
            if (windowGlobals.load_modal_store?.loadStrategyToBuilder) {
                await this.switchToBotBuilderTab();
                
                const botObject = {
                    id: `${config.botName.toLowerCase()}-unified-${Date.now()}`,
                    name: `${config.botName} Bot (Unified)`,
                    xml: xmlContent,
                    save_type: 'LOCAL'
                };

                await windowGlobals.load_modal_store.loadStrategyToBuilder(botObject);
                console.log('✅ Bot loaded via load modal store');
                return;
            }
        }

        // Method 3: Direct Blockly injection (with improved error handling)
        if (typeof window !== 'undefined' && (window as any).Blockly) {
            const blockly = (window as any).Blockly;
            if (blockly.getMainWorkspace) {
                const workspace = blockly.getMainWorkspace();
                if (workspace && workspace.clear) {
                    try {
                        // Switch to Bot Builder tab first
                        await this.switchToBotBuilderTab();
                        
                        // Clear workspace
                        workspace.clear();
                        
                        // Try different Blockly XML methods
                        let domXml;
                        if (blockly.Xml?.textToDom) {
                            domXml = blockly.Xml.textToDom(xmlContent);
                        } else if (blockly.utils?.xml?.textToDom) {
                            domXml = blockly.utils.xml.textToDom(xmlContent);
                        } else if (blockly.Xml?.textToDomDocument) {
                            domXml = blockly.Xml.textToDomDocument(xmlContent);
                        } else {
                            // Fallback: use browser DOMParser
                            const parser = new DOMParser();
                            domXml = parser.parseFromString(xmlContent, 'text/xml');
                        }
                        
                        // Load XML into workspace
                        if (blockly.Xml?.domToWorkspace) {
                            blockly.Xml.domToWorkspace(domXml, workspace);
                        } else if (blockly.serialization?.workspaces?.load) {
                            blockly.serialization.workspaces.load(domXml, workspace);
                        } else {
                            throw new Error('No suitable Blockly XML loading method found');
                        }
                        
                        console.log('✅ Bot loaded directly into Blockly workspace');
                        return;
                    } catch (error) {
                        console.warn('❌ Direct Blockly injection failed:', error);
                        // Continue to next method
                    }
                }
            }
        }

        // Method 4: Event dispatch (fallback)
        const loadEvent = new CustomEvent('unified.bot.load', {
            detail: {
                botName: config.botName,
                xmlContent: xmlContent,
                parameters: config.parameters
            },
            bubbles: true,
            cancelable: true
        });
        window.dispatchEvent(loadEvent);

        console.log('✅ Bot loading event dispatched');
    }

    /**
     * Ensure correct app ID is configured for Deriv API
     */
    private ensureCorrectAppId(xmlContent: string): void {
        // Set the correct app ID for production trading
        const APP_ID = '82255';
        
        if (typeof window !== 'undefined') {
            const windowGlobals = window as any;
            
            // Set app ID in various possible locations
            if (windowGlobals.api_base) {
                windowGlobals.api_base.app_id = APP_ID;
                console.log(`✅ App ID set to ${APP_ID} in api_base`);
            }
            
            if (windowGlobals.DerivAPI) {
                windowGlobals.DerivAPI.app_id = APP_ID;
                console.log(`✅ App ID set to ${APP_ID} in DerivAPI`);
            }
            
            // Set in localStorage for persistence
            localStorage.setItem('config.app_id', APP_ID);
            localStorage.setItem('deriv_app_id', APP_ID);
            
            console.log(`✅ App ID ${APP_ID} configured for production trading`);
        }
    }

    /**
     * Switch to Bot Builder tab
     */
    private async switchToBotBuilderTab(): Promise<void> {
        if (typeof window !== 'undefined') {
            const windowGlobals = window as any;
            if (windowGlobals.dashboard_store?.setActiveTab) {
                windowGlobals.dashboard_store.setActiveTab(1); // BOT_BUILDER tab
                console.log('✅ Switched to Bot Builder tab');
                
                // Wait for tab to load
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
    }

    /**
     * Debug Blockly API availability
     */
    private debugBlocklyAPI(): void {
        if (typeof window !== 'undefined' && (window as any).Blockly) {
            const blockly = (window as any).Blockly;
            console.log('🔍 Blockly API Debug:', {
                hasBlockly: !!blockly,
                hasXml: !!blockly.Xml,
                hasTextToDom: !!blockly.Xml?.textToDom,
                hasUtilsXml: !!blockly.utils?.xml,
                hasUtilsTextToDom: !!blockly.utils?.xml?.textToDom,
                hasSerialization: !!blockly.serialization,
                hasWorkspaces: !!blockly.serialization?.workspaces,
                hasGetMainWorkspace: !!blockly.getMainWorkspace,
                availableMethods: Object.keys(blockly.Xml || {})
            });
        } else {
            console.log('🔍 Blockly not available on window');
        }
    }

    /**
     * Auto-start bot after loading
     */
    private async autoStartBot(): Promise<void> {
        console.log('🚀 Auto-starting bot...');

        // Wait for bot to fully load
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try multiple methods to start the bot
        const startMethods = [
            () => {
                const runButton = document.querySelector('button[data-testid="run-button"]') as HTMLButtonElement;
                if (runButton && !runButton.disabled) {
                    runButton.click();
                    return true;
                }
                return false;
            },
            () => {
                const runButtons = document.querySelectorAll('button');
                for (const button of runButtons) {
                    if (button.textContent?.toLowerCase().includes('run') && !button.disabled) {
                        button.click();
                        return true;
                    }
                }
                return false;
            },
            () => {
                // Dispatch run event
                const runEvent = new CustomEvent('bot.run', {
                    detail: { source: 'unified-bot-manager' },
                    bubbles: true,
                    cancelable: true
                });
                window.dispatchEvent(runEvent);
                return true;
            }
        ];

        for (const method of startMethods) {
            try {
                if (method()) {
                    console.log('✅ Bot auto-started successfully');
                    return;
                }
            } catch (error) {
                console.warn('Auto-start method failed:', error);
            }
        }

        console.warn('⚠️ Auto-start failed, manual start required');
    }

    /**
     * Get current parameters
     */
    public getCurrentParameters(): UnifiedBotParameters | null {
        return this.currentParameters;
    }

    /**
     * Update parameters (reactive)
     */
    public updateParameters(updates: Partial<UnifiedBotParameters>): void {
        if (!this.currentParameters) {
            console.warn('No current parameters to update');
            return;
        }

        this.currentParameters = { ...this.currentParameters, ...updates };
        console.log('🔄 Parameters updated:', updates);

        // Dispatch parameter update event
        const updateEvent = new CustomEvent('unified.parameters.updated', {
            detail: { parameters: this.currentParameters, updates },
            bubbles: true,
            cancelable: true
        });
        window.dispatchEvent(updateEvent);
    }

    /**
     * Add load listener
     */
    public addLoadListener(listener: (result: BotLoadResult) => void): void {
        this.loadListeners.push(listener);
    }

    /**
     * Remove load listener
     */
    public removeLoadListener(listener: (result: BotLoadResult) => void): void {
        const index = this.loadListeners.indexOf(listener);
        if (index > -1) {
            this.loadListeners.splice(index, 1);
        }
    }

    /**
     * Notify load listeners
     */
    private notifyLoadListeners(result: BotLoadResult): void {
        this.loadListeners.forEach(listener => {
            try {
                listener(result);
            } catch (error) {
                console.error('Load listener error:', error);
            }
        });
    }

    /**
     * Check if currently loading
     */
    public isCurrentlyLoading(): boolean {
        return this.isLoading;
    }

    /**
     * Get available bots
     */
    public getAvailableBots(): string[] {
        return Object.keys(this.BOT_CONFIGS);
    }
}

export const unifiedBotManager = new UnifiedBotManagerService();