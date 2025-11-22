/**
 * Vue AST Analyzer for analyzing Vue 3 components with script setup
 * 
 * Analyzes Vue Single File Components (SFC) and extracts component information
 * including props, state, composables, lifecycle hooks, and template bindings.
 */

import type * as swc from '@swc/core';
import { ComponentAnalysis, JSXInfo, PropInfo, HookInfo, ProcessInfo } from './types';
import { VueSFCParser, ParsedVueSFC } from './vue-sfc-parser';
import { TypeResolver } from '../services/type-resolver';
import { ASTAnalyzer } from './ast-analyzer';
import { VuePropsAnalyzer } from '../analyzers/vue-props-analyzer';
import { VueStateAnalyzer, VueStateInfo } from '../analyzers/vue-state-analyzer';
import { VueComposablesAnalyzer } from '../analyzers/vue-composables-analyzer';
import { VueEmitsAnalyzer, VueEmitInfo, EmitCallInfo } from '../analyzers/vue-emits-analyzer';
import { VueTemplateAnalyzer, TemplateBinding } from '../analyzers/vue-template-analyzer';
import { SWCProcessAnalyzer } from '../analyzers/process-analyzer';
import type { ParserFunction } from './index';
import type { ParseResult } from './ast-parser';

/**
 * Vue AST Analyzer implementation
 * 
 * Coordinates Vue-specific analyzers to extract component information
 * from Vue SFC files with script setup syntax.
 */
export class VueASTAnalyzer implements ASTAnalyzer {
  private parserFn: ParserFunction;
  private sfcParser: VueSFCParser;
  private typeResolver?: TypeResolver;
  private propsAnalyzer: VuePropsAnalyzer;
  private stateAnalyzer: VueStateAnalyzer;
  private composablesAnalyzer: VueComposablesAnalyzer;
  private emitsAnalyzer: VueEmitsAnalyzer;
  private templateAnalyzer: VueTemplateAnalyzer;
  private processAnalyzer: SWCProcessAnalyzer;

  constructor(parserFn: ParserFunction, typeResolver?: TypeResolver) {
    this.parserFn = parserFn;
    this.sfcParser = new VueSFCParser();
    this.typeResolver = typeResolver;
    this.propsAnalyzer = new VuePropsAnalyzer(typeResolver);
    this.stateAnalyzer = new VueStateAnalyzer(typeResolver);
    this.composablesAnalyzer = new VueComposablesAnalyzer(typeResolver);
    this.emitsAnalyzer = new VueEmitsAnalyzer(typeResolver);
    this.templateAnalyzer = new VueTemplateAnalyzer();
    this.processAnalyzer = new SWCProcessAnalyzer();
  }

  /**
   * Analyze a Vue component from source code
   * 
   * @param source - Vue SFC source code or parsed SWC module
   * @param filePath - File path for type resolution
   * @param sourceCode - Original source code (if module is provided)
   * @returns Promise resolving to ComponentAnalysis or null if no component found
   */
  async analyze(
    source: swc.Module | string,
    filePath?: string,
    sourceCode?: string
  ): Promise<ComponentAnalysis | null> {
    // If source is a string, it's Vue SFC source code
    if (typeof source === 'string') {
      return this.analyzeVueSFC(source, filePath);
    }

    // If source is a module, it's already parsed (shouldn't happen for Vue)
    // This case is for interface compatibility with ASTAnalyzer
    console.warn('VueASTAnalyzer received parsed module instead of source code');
    return null;
  }

  /**
   * Analyze Vue SFC source code
   * 
   * @param source - Vue SFC source code
   * @param filePath - File path for type resolution
   * @returns Promise resolving to ComponentAnalysis or null
   */
  private async analyzeVueSFC(
    source: string,
    filePath?: string
  ): Promise<ComponentAnalysis | null> {
    const startTime = Date.now();
    let partialResult: Partial<ComponentAnalysis> | null = null;

    try {
      // Step 1: Parse Vue SFC to extract script setup and template
      console.log('🔍 VueASTAnalyzer: Parsing Vue SFC...');
      
      let sfc: ParsedVueSFC;
      try {
        sfc = this.sfcParser.parse(source);
      } catch (error) {
        console.error('🔍 VueASTAnalyzer: SFC parsing failed:', error);
        // Return null for SFC parsing errors - let the caller handle it
        return null;
      }

      if (!sfc.script) {
        console.log('🔍 VueASTAnalyzer: No script setup section found');
        return null;
      }

      console.log('🔍 VueASTAnalyzer: Script setup found, lang:', sfc.script.lang);
      console.log('🔍 VueASTAnalyzer: Script line:', sfc.script.line);
      console.log('🔍 VueASTAnalyzer: Template found:', !!sfc.template);

      // Step 2: Parse script setup content using SWC
      let scriptModule: swc.Module | null;
      try {
        scriptModule = await this.parseScriptSetup(sfc.script.content, sfc.script.lang || 'js');
      } catch (error) {
        console.error('🔍 VueASTAnalyzer: Script setup parsing failed:', error);
        // Return null for script parsing errors
        return null;
      }

      if (!scriptModule) {
        console.log('🔍 VueASTAnalyzer: Failed to parse script setup');
        return null;
      }

      // Step 3: Analyze script setup to extract component information
      let scriptAnalysis: ScriptAnalysis;
      try {
        scriptAnalysis = await this.analyzeScriptSetup(scriptModule, filePath, sfc.script.content, sfc.script.line);
        
        // Store partial result for error recovery
        partialResult = {
          componentName: 'VueComponent',
          componentType: 'functional',
          props: scriptAnalysis.props,
          hooks: [],
          processes: scriptAnalysis.processes,
        };
      } catch (error) {
        console.error('🔍 VueASTAnalyzer: Script analysis failed:', error);
        // Return partial result if available
        return partialResult as ComponentAnalysis | null;
      }

      // Step 4: Analyze template if present
      let templateAnalysis: TemplateAnalysis | null = null;
      if (sfc.template) {
        try {
          // Set the template line offset for accurate line number tracking
          this.templateAnalyzer.setTemplateLineOffset(sfc.template.line);
          templateAnalysis = this.analyzeTemplate(sfc.template.content, scriptAnalysis);
        } catch (error) {
          console.error('🔍 VueASTAnalyzer: Template analysis failed:', error);
          // Continue with null template analysis - template is optional for DFD
        }
      }

      // Step 5: Combine analyses into ComponentAnalysis
      try {
        return this.combineAnalyses(scriptAnalysis, templateAnalysis);
      } catch (error) {
        console.error('🔍 VueASTAnalyzer: Failed to combine analyses:', error);
        // Return partial result if available
        return partialResult as ComponentAnalysis | null;
      }

    } catch (error) {
      console.error('🔍 VueASTAnalyzer: Unexpected error analyzing Vue SFC:', error);
      // Return partial result if available
      return partialResult as ComponentAnalysis | null;
    }
  }

  /**
   * Parse script setup content using provided parser function
   * 
   * @param content - Script setup content
   * @param lang - Language (ts or js)
   * @returns Promise resolving to parsed module or null
   */
  private async parseScriptSetup(content: string, lang: string): Promise<swc.Module | null> {
    try {
      // Use the injected parser function
      const filePath = `temp.${lang}`;
      console.log('🔍 VueASTAnalyzer: parseScriptSetup: content.length=' + content.length + ', lang=' + lang);
      console.log('🔍 VueASTAnalyzer: parseScriptSetup: content (first 100 chars)=' + content.substring(0, 100));
      const parseResult: ParseResult = await this.parserFn(content, filePath);

      // Handle parse errors
      if (parseResult.error) {
        const errorMessage = parseResult.error.message;
        const errorLocation = parseResult.error.line 
          ? ` at line ${parseResult.error.line}${parseResult.error.column ? `:${parseResult.error.column}` : ''}`
          : '';
        throw new Error(`Failed to parse script setup${errorLocation}: ${errorMessage}`);
      }

      // Return the parsed module
      return parseResult.module || null;
    } catch (error) {
      console.error('🔍 VueASTAnalyzer: Failed to parse script setup:', error);
      // Re-throw to allow caller to handle syntax errors
      throw error;
    }
  }

  /**
   * Analyze script setup section
   * 
   * @param module - Parsed AST module
   * @param filePath - File path for type resolution
   * @param sourceCode - Script setup source code
   * @returns Promise resolving to script analysis
   */
  private async analyzeScriptSetup(
    module: swc.Module,
    filePath?: string,
    sourceCode?: string,
    scriptLineOffset?: number
  ): Promise<ScriptAnalysis> {
    console.log('🔍 VueASTAnalyzer: Analyzing script setup...');
    console.log('🔍 VueASTAnalyzer: Module body statements:', module.body.length);

    try {
      // Set source code and line offset for line number calculation
      if (sourceCode) {
        console.log('🔍 VueASTAnalyzer: Setting source code, length:', sourceCode.length, 'lines:', sourceCode.split('\n').length);
        this.propsAnalyzer.setSourceCode(sourceCode);
        this.stateAnalyzer.setSourceCode(sourceCode);
        this.composablesAnalyzer.setSourceCode(sourceCode);
        this.emitsAnalyzer.setSourceCode(sourceCode);
      }
      
      // Set line offset for all analyzers
      if (scriptLineOffset !== undefined) {
        this.propsAnalyzer.setLineOffset(scriptLineOffset);
        this.stateAnalyzer.setLineOffset(scriptLineOffset);
        this.composablesAnalyzer.setLineOffset(scriptLineOffset);
        this.emitsAnalyzer.setLineOffset(scriptLineOffset);
      }

      // Analyze props using VuePropsAnalyzer
      let props: PropInfo[] = [];
      try {
        props = await this.propsAnalyzer.analyzeProps(module, filePath);
        console.log('🔍 VueASTAnalyzer: Found', props.length, 'props');
      } catch (error) {
        console.error('🔍 VueASTAnalyzer: Props analysis failed:', error);
        // Continue with empty props
      }

      // Analyze state using VueStateAnalyzer
      let state: VueStateInfo[] = [];
      try {
        state = await this.stateAnalyzer.analyzeState(module, filePath);
        console.log('🔍 VueASTAnalyzer: Found', state.length, 'state declarations');
      } catch (error) {
        console.error('🔍 VueASTAnalyzer: State analysis failed:', error);
        // Continue with empty state
      }

      // Analyze composables, lifecycle hooks, and watchers using VueComposablesAnalyzer
      let composables: HookInfo[] = [];
      let lifecycle: HookInfo[] = [];
      let watchers: HookInfo[] = [];
      try {
        const result = await this.composablesAnalyzer.analyzeComposablesAndLifecycle(module, filePath);
        composables = result.composables;
        lifecycle = result.lifecycle;
        watchers = result.watchers;
        console.log('🔍 VueASTAnalyzer: Found', composables.length, 'composables');
        console.log('🔍 VueASTAnalyzer: Found', lifecycle.length, 'lifecycle hooks');
        console.log('🔍 VueASTAnalyzer: Found', watchers.length, 'watchers');
      } catch (error) {
        console.error('🔍 VueASTAnalyzer: Composables/lifecycle analysis failed:', error);
        // Continue with empty arrays
      }

      // Analyze emits using VueEmitsAnalyzer
      let emits: VueEmitInfo[] = [];
      let emitCalls: EmitCallInfo[] = [];
      try {
        const result = await this.emitsAnalyzer.analyzeEmits(module, filePath);
        emits = result.emits;
        emitCalls = result.emitCalls;
        console.log('🔍 VueASTAnalyzer: Found', emits.length, 'emit definitions');
        console.log('🔍 VueASTAnalyzer: Found', emitCalls.length, 'emit calls');
      } catch (error) {
        console.error('🔍 VueASTAnalyzer: Emits analysis failed:', error);
        // Continue with empty arrays
      }

      // Analyze functions as processes using ProcessAnalyzer
      let functionProcesses: ProcessInfo[] = [];
      try {
        // Set source code and line offset for line number calculation
        if (sourceCode) {
          console.log('🔍 VueASTAnalyzer: Setting ProcessAnalyzer source code, length:', sourceCode.length, 'lines:', sourceCode.split('\n').length);
          this.processAnalyzer.setSourceCode(sourceCode);
        }
        if (scriptLineOffset !== undefined) {
          this.processAnalyzer.setLineOffset(scriptLineOffset);
        }
        functionProcesses = this.processAnalyzer.analyzeProcesses(module.body);
        console.log('🔍 VueASTAnalyzer: Found', functionProcesses.length, 'function processes');
      } catch (error) {
        console.error('🔍 VueASTAnalyzer: Function process analysis failed:', error);
        // Continue with empty array
      }

      // Convert lifecycle hooks and watchers to ProcessInfo objects
      const lifecycleProcesses = this.convertHooksToProcesses([...lifecycle, ...watchers]);
      
      // Combine all processes
      const processes = [...functionProcesses, ...lifecycleProcesses];
      
      return {
        props,
        state,
        composables,
        lifecycle,
        watchers,
        emits,
        emitCalls,
        processes,
      };
    } catch (error) {
      console.error('🔍 VueASTAnalyzer: Script setup analysis failed:', error);
      // Re-throw to allow caller to handle
      throw error;
    }
  }

  /**
   * Analyze template section
   * 
   * @param template - Template HTML content
   * @param scriptAnalysis - Script analysis for context
   * @returns Template analysis
   */
  private analyzeTemplate(
    template: string,
    scriptAnalysis: ScriptAnalysis
  ): TemplateAnalysis {
    console.log('🔍 VueASTAnalyzer: Analyzing template...');
    console.log('🔍 VueASTAnalyzer: Template length:', template.length);

    try {
      // Use the template analyzer to extract bindings
      const bindings = this.templateAnalyzer.analyzeTemplate(template);
      
      console.log('🔍 VueASTAnalyzer: Found', bindings.length, 'template bindings');

      // Extract conditional structures (v-if)
      const conditionalStructures = this.templateAnalyzer.extractConditionalStructures(template);
      console.log('🔍 VueASTAnalyzer: Found', conditionalStructures.length, 'conditional structures');

      // Extract loop structures (v-for)
      const loopStructures = this.templateAnalyzer.extractLoopStructures(template);
      console.log('🔍 VueASTAnalyzer: Found', loopStructures.length, 'loop structures');

      // Extract elements with event handlers
      const elementsWithEventHandlers = this.templateAnalyzer.extractElementsWithEventHandlers(template);
      console.log('🔍 VueASTAnalyzer: Found', elementsWithEventHandlers.length, 'elements with event handlers');

      // Extract elements with v-bind attributes
      const elementsWithVBind = this.templateAnalyzer.extractElementsWithVBind(template);
      console.log('🔍 VueASTAnalyzer: Found', elementsWithVBind.length, 'elements with v-bind');

      // Extract elements with v-model directive
      const elementsWithVModel = this.templateAnalyzer.extractElementsWithVModel(template);
      console.log('🔍 VueASTAnalyzer: Found', elementsWithVModel.length, 'elements with v-model');

      // Extract elements with v-show directive
      const elementsWithVShow = this.templateAnalyzer.extractElementsWithVShow(template);
      console.log('🔍 VueASTAnalyzer: Found', elementsWithVShow.length, 'elements with v-show');

      return {
        bindings,
        conditionalStructures,
        loopStructures,
        elementsWithEventHandlers,
        elementsWithVBind,
        elementsWithVModel,
        elementsWithVShow,
      };
    } catch (error) {
      console.error('🔍 VueASTAnalyzer: Template analysis failed:', error);
      // Return empty bindings on error
      return {
        bindings: [],
        conditionalStructures: [],
        loopStructures: [],
        elementsWithEventHandlers: [],
      };
    }
  }

  /**
   * Convert lifecycle hooks and watchers to ProcessInfo objects
   * 
   * @param hooks - Array of HookInfo objects (lifecycle hooks and watchers)
   * @returns Array of ProcessInfo objects
   */
  private convertHooksToProcesses(hooks: HookInfo[]): any[] {
    const processes: any[] = [];
    
    for (const hook of hooks) {
      // Determine process type based on hook name
      let processType: string;
      if (hook.hookName === 'watch' || hook.hookName === 'watchEffect') {
        processType = 'watcher';
      } else {
        processType = 'lifecycle'; // onMounted, onUpdated, etc.
      }
      
      // Extract state modifications from hook (if present)
      const stateModifications = (hook as any).stateModifications || [];
      
      // Extract cleanup detection from hook (if present)
      const hasCleanup = (hook as any).hasCleanup;
      
      // Combine dependencies and state modifications for references
      const references = [...(hook.dependencies || []), ...stateModifications];
      
      processes.push({
        name: hook.hookName,
        type: processType,
        dependencies: hook.dependencies || [],
        references, // Include both dependencies (reads) and state modifications (writes)
        externalCalls: [],
        line: hook.line,
        column: hook.column,
        stateModifications, // Store state modifications for edge creation
        hasCleanup, // Store cleanup detection for watchEffect
      });
    }
    
    return processes;
  }

  /**
   * Combine script and template analyses into ComponentAnalysis
   * 
   * @param scriptAnalysis - Script analysis
   * @param templateAnalysis - Template analysis (optional)
   * @returns ComponentAnalysis
   */
  private combineAnalyses(
    scriptAnalysis: ScriptAnalysis,
    templateAnalysis: TemplateAnalysis | null
  ): ComponentAnalysis {
    // Extract component name from file path or use default
    const componentName = 'VueComponent'; // TODO: Extract from file path

    // Convert Vue state to HookInfo objects for DFD builder
    const stateHooks: HookInfo[] = scriptAnalysis.state.map(state => ({
      hookName: state.type, // 'ref', 'reactive', or 'computed'
      category: 'state-management',
      variables: [state.name],
      line: state.line,
      column: state.column,
      variableTypes: new Map([[state.name, 'data']]),
      metadata: {
        vueStateType: state.type,
        dataType: state.dataType
      }
    }));

    // Map Vue-specific structures to ComponentAnalysis format
    return {
      componentName,
      componentType: 'functional', // Vue 3 script setup is always functional
      props: scriptAnalysis.props,
      hooks: [
        ...stateHooks,
        ...scriptAnalysis.composables,
        ...scriptAnalysis.lifecycle,
        ...scriptAnalysis.watchers,
      ],
      processes: scriptAnalysis.processes,
      jsxOutput: this.createJSXOutputFromTemplate(templateAnalysis),
      vueState: scriptAnalysis.state, // Preserve original Vue state info for DFD builder
      vueEmits: scriptAnalysis.emits,
      vueEmitCalls: scriptAnalysis.emitCalls,
      vueTemplateBindings: templateAnalysis?.bindings || [],
      vueConditionalStructures: templateAnalysis?.conditionalStructures || [],
      vueLoopStructures: templateAnalysis?.loopStructures || [],
      vueElementsWithEventHandlers: templateAnalysis?.elementsWithEventHandlers || [],
      vueElementsWithVBind: templateAnalysis?.elementsWithVBind || [],
      vueElementsWithVModel: templateAnalysis?.elementsWithVModel || [],
      vueElementsWithVShow: templateAnalysis?.elementsWithVShow || [],
    } as ComponentAnalysis;
  }

  /**
   * Create JSXInfo from template analysis
   * 
   * @param templateAnalysis - Template analysis (optional)
   * @returns JSXInfo
   */
  private createJSXOutputFromTemplate(templateAnalysis: TemplateAnalysis | null): JSXInfo {
    if (!templateAnalysis || templateAnalysis.bindings.length === 0) {
      return {
        simplified: '',
        placeholders: [],
        elements: [],
      };
    }

    // Convert template bindings to JSX placeholders
    const placeholders: any[] = [];
    const elements: any[] = [];

    // Group bindings by type
    const bindingsByType = new Map<string, TemplateBinding[]>();
    for (const binding of templateAnalysis.bindings) {
      const key = binding.type;
      if (!bindingsByType.has(key)) {
        bindingsByType.set(key, []);
      }
      bindingsByType.get(key)!.push(binding);
    }

    // Create placeholders for each binding
    let placeholderId = 0;
    for (const binding of templateAnalysis.bindings) {
      const id = `template_${binding.type}_${placeholderId++}`;
      
      placeholders.push({
        id,
        originalExpression: binding.variable,
        variables: [binding.variable],
        tagName: binding.target || 'template',
        attributeName: binding.target,
      });

      // Create element info for template outputs
      if (binding.type === 'mustache' || binding.type === 'v-bind') {
        elements.push({
          tagName: binding.target || 'template',
          attributes: binding.target ? { [binding.target]: binding.variable } : {},
          children: [],
        });
      }
    }

    return {
      simplified: '<template>...</template>',
      placeholders,
      elements,
    };
  }
}

/**
 * Script analysis result
 */
interface ScriptAnalysis {
  props: PropInfo[];
  state: VueStateInfo[];
  composables: HookInfo[];
  lifecycle: HookInfo[];
  watchers: HookInfo[];
  emits: VueEmitInfo[];
  emitCalls: EmitCallInfo[];
  processes: any[]; // Will be ProcessInfo[]
}

/**
 * Template analysis result
 */
interface TemplateAnalysis {
  bindings: TemplateBinding[];
  conditionalStructures?: any[]; // VueConditionalStructure[]
  loopStructures?: any[]; // VueLoopStructure[]
  elementsWithEventHandlers?: Array<{
    tagName: string;
    event: string;
    handler: string;
    line?: number;
    column?: number;
  }>;
  elementsWithVBind?: Array<{
    tagName: string;
    attribute: string;
    variable: string;
    line?: number;
    column?: number;
  }>;
  elementsWithVModel?: Array<{
    tagName: string;
    variable: string;
    line?: number;
    column?: number;
  }>;
  elementsWithVShow?: Array<{
    tagName: string;
    condition: string;
    variables: string[];
    line?: number;
    column?: number;
  }>;
}
