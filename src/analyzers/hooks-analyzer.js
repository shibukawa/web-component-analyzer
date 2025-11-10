"use strict";
/**
 * Hooks Analyzer for extracting React hook usage from AST
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SWCHooksAnalyzer = void 0;
exports.createHooksAnalyzer = createHooksAnalyzer;
const hook_registry_1 = require("../utils/hook-registry");
/**
 * Implementation of Hooks Analyzer
 */
class SWCHooksAnalyzer {
    typeResolver;
    filePath;
    constructor(typeResolver, filePath) {
        this.typeResolver = typeResolver;
        this.filePath = filePath;
    }
    /**
     * Analyze hooks in the component body
     * @param body - Array of module items or statements from the component
     * @returns Array of HookInfo objects
     */
    async analyzeHooks(body) {
        console.log('🪝 Hooks Analyzer: Starting analysis');
        console.log('🪝 Body items count:', body.length);
        // Log each item type individually for better visibility
        const itemTypes = body.map(item => item.type);
        console.log('🪝 Body items types:', itemTypes);
        itemTypes.forEach((type, index) => {
            console.log(`🪝   [${index}]: ${type}`);
        });
        const hooksWithDeclarations = [];
        for (let i = 0; i < body.length; i++) {
            const item = body[i];
            console.log(`🪝 Processing item ${i}:`, item.type);
            this.traverseModuleItem(item, hooksWithDeclarations);
        }
        console.log('🪝 Hooks found:', hooksWithDeclarations.length);
        // Classify custom hooks if TypeResolver is available
        const hooks = [];
        for (const { hook, declaration } of hooksWithDeclarations) {
            if (declaration && !hook_registry_1.hookRegistry.getHookCategory(hook.hookName)) {
                // This is a custom hook - classify return values
                const classifiedHook = await this.classifyCustomHookReturnValues(hook, declaration);
                hooks.push(classifiedHook);
            }
            else {
                hooks.push(hook);
            }
        }
        if (hooks.length > 0) {
            hooks.forEach(h => {
                console.log(`🪝   ✅ ${h.hookName}:`, h.variables);
            });
        }
        return hooks;
    }
    /**
     * Traverse a module item to find hooks
     */
    traverseModuleItem(item, hooksWithDeclarations) {
        console.log('🪝 traverseModuleItem called with type:', item.type);
        // Handle function declarations
        if (item.type === 'FunctionDeclaration') {
            console.log('🪝 Found FunctionDeclaration');
            if (item.body) {
                this.extractHooksFromFunctionBody(item.body, hooksWithDeclarations);
            }
        }
        // Handle variable declarations
        else if (item.type === 'VariableDeclaration') {
            console.log('🪝 Found VariableDeclaration in traverseModuleItem');
            // Check if this is a hook call (e.g., const [count, setCount] = useState(0))
            // or an arrow function definition
            for (const decl of item.declarations) {
                if (decl.init) {
                    // Check for arrow function or function expression
                    if (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression') {
                        console.log('🪝 Found arrow/function expression in VariableDeclaration');
                        if (decl.init.body && decl.init.body.type === 'BlockStatement') {
                            this.extractHooksFromFunctionBody(decl.init.body, hooksWithDeclarations);
                        }
                    }
                    // Check for hook call
                    else if (decl.init.type === 'CallExpression') {
                        console.log('🪝 Found CallExpression in VariableDeclaration, checking if it\'s a hook...');
                        if (this.isHookCall(decl.init)) {
                            const hookInfo = this.extractHookInfo(item.declarations[0]);
                            if (hookInfo) {
                                console.log('🪝 ✅ Hook extracted from VariableDeclaration:', hookInfo.hookName, hookInfo.variables);
                                hooksWithDeclarations.push({ hook: hookInfo, declaration: item.declarations[0] });
                            }
                        }
                    }
                }
            }
        }
        // Handle export declarations
        else if (item.type === 'ExportDefaultDeclaration') {
            console.log('🪝 Found ExportDefaultDeclaration');
            const declaration = item.decl;
            if (declaration) {
                this.traverseDeclaration(declaration, hooksWithDeclarations);
            }
        }
        else if (item.type === 'ExportDeclaration') {
            console.log('🪝 Found ExportDeclaration');
            const declaration = item.declaration;
            if (declaration) {
                this.traverseDeclaration(declaration, hooksWithDeclarations);
            }
        }
        else {
            console.log('🪝 ⚠️ Unhandled item type in traverseModuleItem:', item.type);
            // This might be a statement from a function body, not a module item
            // Try to extract hooks directly from the statement
            this.extractHooksFromStatement(item, hooksWithDeclarations);
        }
    }
    /**
     * Traverse a declaration to find hooks
     */
    traverseDeclaration(declaration, hooksWithDeclarations) {
        if (declaration.type === 'FunctionDeclaration') {
            if (declaration.body) {
                this.extractHooksFromFunctionBody(declaration.body, hooksWithDeclarations);
            }
        }
        else if (declaration.type === 'ArrowFunctionExpression' || declaration.type === 'FunctionExpression') {
            if (declaration.body && declaration.body.type === 'BlockStatement') {
                this.extractHooksFromFunctionBody(declaration.body, hooksWithDeclarations);
            }
        }
        else if (declaration.type === 'VariableDeclaration') {
            for (const decl of declaration.declarations) {
                if (decl.init) {
                    if (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression') {
                        if (decl.init.body && decl.init.body.type === 'BlockStatement') {
                            this.extractHooksFromFunctionBody(decl.init.body, hooksWithDeclarations);
                        }
                    }
                }
            }
        }
    }
    /**
     * Extract hooks from a function body
     */
    extractHooksFromFunctionBody(body, hooksWithDeclarations) {
        console.log('🪝 Extracting hooks from function body, statements:', body.stmts.length);
        for (const statement of body.stmts) {
            console.log('🪝 Processing statement type:', statement.type);
            this.extractHooksFromStatement(statement, hooksWithDeclarations);
        }
    }
    /**
     * Extract hooks from a statement
     */
    extractHooksFromStatement(statement, hooksWithDeclarations) {
        if (statement.type === 'VariableDeclaration') {
            console.log('🪝 Found VariableDeclaration, declarations:', statement.declarations.length);
            for (const declaration of statement.declarations) {
                console.log('🪝 Declaration init type:', declaration.init?.type);
                if (declaration.init && this.isHookCall(declaration.init)) {
                    const hookInfo = this.extractHookInfo(declaration);
                    if (hookInfo) {
                        console.log('🪝 ✅ Hook extracted:', hookInfo.hookName, hookInfo.variables);
                        hooksWithDeclarations.push({ hook: hookInfo, declaration });
                    }
                    else {
                        console.log('🪝 ❌ Failed to extract hook info');
                    }
                }
                else if (declaration.init) {
                    console.log('🪝 ❌ Not a hook call');
                }
            }
        }
        else if (statement.type === 'ExpressionStatement') {
            // Handle hook calls without assignment (e.g., useEffect without return)
            if (this.isHookCall(statement.expression)) {
                const hookInfo = this.extractHookInfoFromExpression(statement.expression);
                if (hookInfo) {
                    hooksWithDeclarations.push({ hook: hookInfo });
                }
            }
        }
    }
    /**
     * Check if an expression is a hook call
     */
    isHookCall(expression) {
        if (expression.type !== 'CallExpression') {
            return false;
        }
        const callee = expression.callee;
        // Direct hook call: useState()
        if (callee.type === 'Identifier') {
            return callee.value.startsWith('use');
        }
        // Member expression: React.useState()
        if (callee.type === 'MemberExpression') {
            const property = callee.property;
            if (property.type === 'Identifier') {
                return property.value.startsWith('use');
            }
        }
        return false;
    }
    /**
     * Extract hook information from a variable declaration
     */
    extractHookInfo(declaration) {
        if (!declaration.init || declaration.init.type !== 'CallExpression') {
            return null;
        }
        const callExpression = declaration.init;
        const hookName = this.getHookName(callExpression);
        if (!hookName) {
            return null;
        }
        const category = hook_registry_1.hookRegistry.getHookCategory(hookName);
        // For custom hooks (not in registry), category will be null/undefined
        // We still want to extract them for type classification
        const variables = this.extractVariableNames(declaration.id);
        const dependencies = this.extractDependencies(callExpression);
        const isReadWritePair = this.isReadWritePair(variables);
        const isFunctionOnly = this.isFunctionOnly(callExpression, variables);
        return {
            hookName,
            category: category, // Allow undefined for custom hooks
            variables,
            dependencies,
            isReadWritePair,
            isFunctionOnly,
        };
    }
    /**
     * Extract hook information from a call expression (no assignment)
     */
    extractHookInfoFromExpression(callExpression) {
        const hookName = this.getHookName(callExpression);
        if (!hookName) {
            return null;
        }
        const category = hook_registry_1.hookRegistry.getHookCategory(hookName);
        // For custom hooks (not in registry), category will be null/undefined
        // We still want to extract them
        const dependencies = this.extractDependencies(callExpression);
        return {
            hookName,
            category: category, // Allow undefined for custom hooks
            variables: [],
            dependencies,
            isReadWritePair: false,
            isFunctionOnly: false,
        };
    }
    /**
     * Classify custom hook return values using TypeResolver
     * @param hookInfo - Hook information to classify
     * @param declaration - Variable declaration containing the hook call
     * @returns Updated HookInfo with type classifications
     */
    async classifyCustomHookReturnValues(hookInfo, declaration) {
        // Only classify custom hooks (not in registry)
        if (hook_registry_1.hookRegistry.getHookCategory(hookInfo.hookName)) {
            return hookInfo;
        }
        // Skip if no variables to classify
        if (hookInfo.variables.length === 0) {
            return hookInfo;
        }
        try {
            console.log(`🪝 Classifying custom hook: ${hookInfo.hookName} with variables:`, hookInfo.variables);
            // Use heuristic-based classification
            // TypeResolver can't resolve custom hook return types without the hook definition
            // So we'll classify based on naming patterns
            const variableTypes = new Map();
            for (const varName of hookInfo.variables) {
                // Common function name patterns
                const isFunctionName = /^(on|handle|set|get|update|delete|create|fetch|load|toggle|increment|decrement|dispatch|navigate|logout|login|submit)[A-Z]/.test(varName) ||
                    ['dispatch', 'navigate', 'logout', 'login', 'submit', 'reset', 'clear', 'increment', 'decrement'].includes(varName);
                variableTypes.set(varName, isFunctionName ? 'function' : 'data');
                console.log(`🪝   ${varName}: ${isFunctionName ? 'function' : 'data'}`);
            }
            return {
                ...hookInfo,
                variableTypes
            };
        }
        catch (error) {
            console.error('Failed to classify custom hook return values:', error);
            return hookInfo;
        }
    }
    /**
     * Get the hook name from a call expression
     */
    getHookName(callExpression) {
        const callee = callExpression.callee;
        if (callee.type === 'Identifier') {
            return callee.value;
        }
        if (callee.type === 'MemberExpression') {
            const property = callee.property;
            if (property.type === 'Identifier') {
                return property.value;
            }
        }
        return null;
    }
    /**
     * Extract variable names from a pattern (identifier or destructuring)
     */
    extractVariableNames(pattern) {
        const variables = [];
        if (pattern.type === 'Identifier') {
            variables.push(pattern.value);
        }
        else if (pattern.type === 'ArrayPattern') {
            for (const element of pattern.elements) {
                if (element && element.type !== 'RestElement') {
                    variables.push(...this.extractVariableNames(element));
                }
            }
        }
        else if (pattern.type === 'ObjectPattern') {
            for (const property of pattern.properties) {
                if (property.type === 'KeyValuePatternProperty') {
                    variables.push(...this.extractVariableNames(property.value));
                }
                else if (property.type === 'AssignmentPatternProperty') {
                    if (property.key.type === 'Identifier') {
                        variables.push(property.key.value);
                    }
                }
            }
        }
        return variables;
    }
    /**
     * Extract dependencies array from hook call
     */
    extractDependencies(callExpression) {
        // Dependencies are typically in the second argument for useEffect, useCallback, useMemo
        if (callExpression.arguments.length < 2) {
            return undefined;
        }
        const depsArg = callExpression.arguments[1];
        if (depsArg.spread || depsArg.expression.type !== 'ArrayExpression') {
            return undefined;
        }
        const arrayExpr = depsArg.expression;
        const dependencies = [];
        for (const element of arrayExpr.elements) {
            if (element && element.expression.type === 'Identifier') {
                dependencies.push(element.expression.value);
            }
        }
        return dependencies.length > 0 ? dependencies : undefined;
    }
    /**
     * Check if variables follow the [value, setValue] pattern
     */
    isReadWritePair(variables) {
        if (variables.length !== 2) {
            return false;
        }
        const [first, second] = variables;
        // Check if second variable is "set" + capitalized first variable
        const expectedSetter = 'set' + first.charAt(0).toUpperCase() + first.slice(1);
        return second === expectedSetter;
    }
    /**
     * Check if all variables are functions (for useContext classification)
     * This is a heuristic based on common naming patterns
     */
    isFunctionOnly(callExpression, variables) {
        // This is a simplified heuristic
        // In a real implementation, we would need type information
        // For now, we check if variable names suggest functions (common patterns)
        if (variables.length === 0) {
            return false;
        }
        // Common function name patterns
        const functionPatterns = [
            /^(on|handle)[A-Z]/, // onClick, handleClick
            /^(set|get|update|delete|create|fetch|load)[A-Z]/, // setUser, getUser
            /^(is|has|can|should)[A-Z]/, // isValid, hasPermission
            /^(dispatch|navigate|logout|login|submit)$/, // Common function names
        ];
        return variables.every(varName => functionPatterns.some(pattern => pattern.test(varName)));
    }
}
exports.SWCHooksAnalyzer = SWCHooksAnalyzer;
/**
 * Create a new Hooks Analyzer instance
 */
function createHooksAnalyzer(typeResolver, filePath) {
    return new SWCHooksAnalyzer(typeResolver, filePath);
}
