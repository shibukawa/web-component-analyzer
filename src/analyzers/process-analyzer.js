"use strict";
/**
 * Process Analyzer for extracting processes (functions) from React components
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SWCProcessAnalyzer = void 0;
exports.createProcessAnalyzer = createProcessAnalyzer;
/**
 * Implementation of Process Analyzer
 */
class SWCProcessAnalyzer {
    /**
     * Analyze processes in the component body
     * @param body - Array of module items or statements from the component
     * @returns Array of ProcessInfo objects
     */
    analyzeProcesses(body) {
        const processes = [];
        for (const item of body) {
            // Check if this is a Statement (from function body) or ModuleItem (from module)
            if ('type' in item) {
                // Try to process as Statement first (for function body items)
                if (this.isStatement(item)) {
                    this.extractProcessesFromStatement(item, processes);
                }
                else {
                    // Process as ModuleItem
                    this.traverseModuleItem(item, processes);
                }
            }
        }
        return processes;
    }
    /**
     * Check if an item is a Statement (not a ModuleItem)
     */
    isStatement(item) {
        // Statements that can appear in function bodies
        const statementTypes = [
            'VariableDeclaration',
            'ExpressionStatement',
            'ReturnStatement',
            'IfStatement',
            'ForStatement',
            'WhileStatement',
            'BlockStatement',
            'FunctionDeclaration',
        ];
        return statementTypes.includes(item.type);
    }
    /**
     * Traverse a module item to find processes
     */
    traverseModuleItem(item, processes) {
        // Handle function declarations
        if (item.type === 'FunctionDeclaration') {
            if (item.body) {
                this.extractProcessesFromFunctionBody(item.body, processes);
            }
        }
        // Handle variable declarations (arrow functions)
        else if (item.type === 'VariableDeclaration') {
            for (const decl of item.declarations) {
                if (decl.init) {
                    if (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression') {
                        if (decl.init.body && decl.init.body.type === 'BlockStatement') {
                            this.extractProcessesFromFunctionBody(decl.init.body, processes);
                        }
                    }
                }
            }
        }
        // Handle export declarations
        else if (item.type === 'ExportDefaultDeclaration') {
            const declaration = item.decl;
            if (declaration) {
                this.traverseDeclaration(declaration, processes);
            }
        }
        else if (item.type === 'ExportDeclaration') {
            const declaration = item.declaration;
            if (declaration) {
                this.traverseDeclaration(declaration, processes);
            }
        }
    }
    /**
     * Traverse a declaration to find processes
     */
    traverseDeclaration(declaration, processes) {
        if (declaration.type === 'FunctionDeclaration') {
            if (declaration.body) {
                this.extractProcessesFromFunctionBody(declaration.body, processes);
            }
        }
        else if (declaration.type === 'ArrowFunctionExpression' || declaration.type === 'FunctionExpression') {
            if (declaration.body && declaration.body.type === 'BlockStatement') {
                this.extractProcessesFromFunctionBody(declaration.body, processes);
            }
        }
        else if (declaration.type === 'VariableDeclaration') {
            for (const decl of declaration.declarations) {
                if (decl.init) {
                    if (decl.init.type === 'ArrowFunctionExpression' || decl.init.type === 'FunctionExpression') {
                        if (decl.init.body && decl.init.body.type === 'BlockStatement') {
                            this.extractProcessesFromFunctionBody(decl.init.body, processes);
                        }
                    }
                }
            }
        }
    }
    /**
     * Extract processes from a function body
     */
    extractProcessesFromFunctionBody(body, processes) {
        for (const statement of body.stmts) {
            this.extractProcessesFromStatement(statement, processes);
        }
    }
    /**
     * Extract processes from a statement
     */
    extractProcessesFromStatement(statement, processes) {
        if (statement.type === 'VariableDeclaration') {
            for (const declaration of statement.declarations) {
                // Check for hook-based processes (useEffect, useCallback, useMemo)
                if (declaration.init && this.isProcessHook(declaration.init)) {
                    const processInfo = this.extractProcessFromHook(declaration);
                    if (processInfo) {
                        processes.push(processInfo);
                    }
                }
                // Check for event handlers and custom functions
                else if (declaration.init && this.isFunctionExpression(declaration.init)) {
                    const processInfo = this.extractProcessFromFunction(declaration);
                    if (processInfo) {
                        processes.push(processInfo);
                    }
                }
            }
        }
        // Handle function declarations
        else if (statement.type === 'FunctionDeclaration') {
            const processInfo = this.extractProcessFromFunctionDeclaration(statement);
            if (processInfo) {
                processes.push(processInfo);
            }
        }
        // Handle expression statements (e.g., useEffect() without assignment)
        else if (statement.type === 'ExpressionStatement') {
            if (this.isProcessHook(statement.expression)) {
                const processInfo = this.extractProcessFromHookExpression(statement.expression);
                if (processInfo) {
                    processes.push(processInfo);
                }
            }
        }
    }
    /**
     * Check if an expression is a process hook (useEffect, useLayoutEffect, useInsertionEffect, useCallback, useMemo, useImperativeHandle)
     */
    isProcessHook(expression) {
        if (expression.type !== 'CallExpression') {
            return false;
        }
        const callee = expression.callee;
        // Direct hook call
        if (callee.type === 'Identifier') {
            return ['useEffect', 'useLayoutEffect', 'useInsertionEffect', 'useCallback', 'useMemo', 'useImperativeHandle'].includes(callee.value);
        }
        // Member expression: React.useEffect()
        if (callee.type === 'MemberExpression') {
            const property = callee.property;
            if (property.type === 'Identifier') {
                return ['useEffect', 'useLayoutEffect', 'useInsertionEffect', 'useCallback', 'useMemo', 'useImperativeHandle'].includes(property.value);
            }
        }
        return false;
    }
    /**
     * Check if an expression is a function expression
     */
    isFunctionExpression(expression) {
        return expression.type === 'ArrowFunctionExpression' || expression.type === 'FunctionExpression';
    }
    /**
     * Extract process information from a hook call
     */
    extractProcessFromHook(declaration) {
        if (!declaration.init || declaration.init.type !== 'CallExpression') {
            return null;
        }
        const callExpression = declaration.init;
        const hookName = this.getHookName(callExpression);
        if (!hookName || !['useEffect', 'useLayoutEffect', 'useInsertionEffect', 'useCallback', 'useMemo', 'useImperativeHandle'].includes(hookName)) {
            return null;
        }
        const name = this.getVariableName(declaration.id);
        const dependencies = this.extractDependencies(callExpression);
        const { references, externalCalls, cleanupProcess } = this.analyzeFunction(callExpression);
        return {
            name: name || hookName,
            type: hookName,
            dependencies,
            references,
            externalCalls,
            cleanupProcess,
        };
    }
    /**
     * Extract process information from a hook expression (without variable assignment)
     */
    extractProcessFromHookExpression(callExpression) {
        const hookName = this.getHookName(callExpression);
        if (!hookName || !['useEffect', 'useLayoutEffect', 'useInsertionEffect', 'useCallback', 'useMemo', 'useImperativeHandle'].includes(hookName)) {
            return null;
        }
        const dependencies = this.extractDependencies(callExpression);
        const { references, externalCalls, cleanupProcess } = this.analyzeFunction(callExpression);
        return {
            name: hookName,
            type: hookName,
            dependencies,
            references,
            externalCalls,
            cleanupProcess,
            line: callExpression.span?.start ? this.getLineNumber(callExpression.span.start) : undefined,
            column: callExpression.span?.start ? this.getColumnNumber(callExpression.span.start) : undefined,
        };
    }
    /**
     * Extract cleanup function from useEffect, useLayoutEffect, or useInsertionEffect
     */
    extractCleanupFunction(func) {
        if (!func.body || func.body.type !== 'BlockStatement') {
            return undefined;
        }
        // Look for return statement that returns a function
        for (const statement of func.body.stmts) {
            if (statement.type === 'ReturnStatement' && statement.argument) {
                const returnExpr = statement.argument;
                // Check if returning a function
                if (returnExpr.type === 'ArrowFunctionExpression' || returnExpr.type === 'FunctionExpression') {
                    const { references, externalCalls } = this.analyzeFunctionBody(returnExpr);
                    return {
                        name: 'cleanup',
                        type: 'cleanup',
                        references,
                        externalCalls,
                        line: returnExpr.span?.start ? this.getLineNumber(returnExpr.span.start) : undefined,
                        column: returnExpr.span?.start ? this.getColumnNumber(returnExpr.span.start) : undefined,
                    };
                }
            }
        }
        return undefined;
    }
    /**
     * Get line number from span position (placeholder - needs actual implementation)
     */
    getLineNumber(position) {
        // This is a simplified version - in reality, you'd need to track line breaks
        return 0;
    }
    /**
     * Get column number from span position (placeholder - needs actual implementation)
     */
    getColumnNumber(position) {
        return position;
    }
    /**
     * Extract process information from a function expression
     */
    extractProcessFromFunction(declaration) {
        if (!declaration.init || !this.isFunctionExpression(declaration.init)) {
            return null;
        }
        const name = this.getVariableName(declaration.id);
        if (!name) {
            return null;
        }
        const functionExpr = declaration.init;
        const { references, externalCalls } = this.analyzeFunctionBody(functionExpr);
        // Determine if it's an event handler or custom function
        const isEventHandler = this.isEventHandlerName(name);
        return {
            name,
            type: isEventHandler ? 'event-handler' : 'custom-function',
            references,
            externalCalls,
        };
    }
    /**
     * Extract process information from a function declaration
     */
    extractProcessFromFunctionDeclaration(funcDecl) {
        const name = funcDecl.identifier?.value;
        if (!name) {
            return null;
        }
        const { references, externalCalls } = this.analyzeFunctionBody(funcDecl);
        // Determine if it's an event handler or custom function
        const isEventHandler = this.isEventHandlerName(name);
        return {
            name,
            type: isEventHandler ? 'event-handler' : 'custom-function',
            references,
            externalCalls,
        };
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
     * Get variable name from a pattern
     */
    getVariableName(pattern) {
        if (pattern.type === 'Identifier') {
            return pattern.value;
        }
        return null;
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
     * Analyze a function (from hook call) to extract references and external calls
     */
    analyzeFunction(callExpression) {
        // The function is the first argument
        if (callExpression.arguments.length === 0) {
            return { references: [], externalCalls: [] };
        }
        const firstArg = callExpression.arguments[0];
        if (firstArg.spread) {
            return { references: [], externalCalls: [] };
        }
        const funcExpr = firstArg.expression;
        if (funcExpr.type === 'ArrowFunctionExpression' || funcExpr.type === 'FunctionExpression') {
            const result = this.analyzeFunctionBody(funcExpr);
            // Check for cleanup function (return statement in useEffect)
            const cleanupProcess = this.extractCleanupFunction(funcExpr);
            return {
                ...result,
                cleanupProcess,
            };
        }
        return { references: [], externalCalls: [] };
    }
    /**
     * Analyze a function body to extract variable references and external calls
     */
    analyzeFunctionBody(func) {
        const references = new Set();
        const externalCalls = [];
        // Handle arrow function with expression body
        if (func.type === 'ArrowFunctionExpression' && func.body.type !== 'BlockStatement') {
            this.extractReferencesFromExpression(func.body, references, externalCalls);
        }
        // Handle block statement body
        else if (func.body && func.body.type === 'BlockStatement') {
            this.extractReferencesFromBlockStatement(func.body, references, externalCalls);
        }
        return {
            references: Array.from(references),
            externalCalls,
        };
    }
    /**
     * Extract references from a block statement
     */
    extractReferencesFromBlockStatement(block, references, externalCalls) {
        for (const statement of block.stmts) {
            this.extractReferencesFromStatement(statement, references, externalCalls);
        }
    }
    /**
     * Extract references from a statement
     */
    extractReferencesFromStatement(statement, references, externalCalls) {
        switch (statement.type) {
            case 'ExpressionStatement':
                this.extractReferencesFromExpression(statement.expression, references, externalCalls);
                break;
            case 'VariableDeclaration':
                for (const decl of statement.declarations) {
                    if (decl.init) {
                        this.extractReferencesFromExpression(decl.init, references, externalCalls);
                    }
                }
                break;
            case 'ReturnStatement':
                if (statement.argument) {
                    this.extractReferencesFromExpression(statement.argument, references, externalCalls);
                }
                break;
            case 'IfStatement':
                this.extractReferencesFromExpression(statement.test, references, externalCalls);
                this.extractReferencesFromStatement(statement.consequent, references, externalCalls);
                if (statement.alternate) {
                    this.extractReferencesFromStatement(statement.alternate, references, externalCalls);
                }
                break;
            case 'BlockStatement':
                this.extractReferencesFromBlockStatement(statement, references, externalCalls);
                break;
            case 'ForStatement':
                if (statement.init) {
                    if (statement.init.type === 'VariableDeclaration') {
                        this.extractReferencesFromStatement(statement.init, references, externalCalls);
                    }
                    else {
                        this.extractReferencesFromExpression(statement.init, references, externalCalls);
                    }
                }
                if (statement.test) {
                    this.extractReferencesFromExpression(statement.test, references, externalCalls);
                }
                if (statement.update) {
                    this.extractReferencesFromExpression(statement.update, references, externalCalls);
                }
                this.extractReferencesFromStatement(statement.body, references, externalCalls);
                break;
            case 'WhileStatement':
                this.extractReferencesFromExpression(statement.test, references, externalCalls);
                this.extractReferencesFromStatement(statement.body, references, externalCalls);
                break;
        }
    }
    /**
     * Extract references from an expression
     */
    extractReferencesFromExpression(expression, references, externalCalls) {
        switch (expression.type) {
            case 'Identifier':
                references.add(expression.value);
                break;
            case 'MemberExpression':
                this.extractReferencesFromExpression(expression.object, references, externalCalls);
                break;
            case 'CallExpression':
                this.handleCallExpression(expression, references, externalCalls);
                break;
            case 'BinaryExpression':
                this.extractReferencesFromExpression(expression.left, references, externalCalls);
                this.extractReferencesFromExpression(expression.right, references, externalCalls);
                break;
            case 'UnaryExpression':
            case 'UpdateExpression':
                this.extractReferencesFromExpression(expression.argument, references, externalCalls);
                break;
            case 'ConditionalExpression':
                this.extractReferencesFromExpression(expression.test, references, externalCalls);
                this.extractReferencesFromExpression(expression.consequent, references, externalCalls);
                this.extractReferencesFromExpression(expression.alternate, references, externalCalls);
                break;
            case 'ArrayExpression':
                for (const element of expression.elements) {
                    if (element && !element.spread) {
                        this.extractReferencesFromExpression(element.expression, references, externalCalls);
                    }
                }
                break;
            case 'ObjectExpression':
                for (const prop of expression.properties) {
                    if (prop.type === 'KeyValueProperty') {
                        this.extractReferencesFromExpression(prop.value, references, externalCalls);
                    }
                    else if (prop.type === 'SpreadElement') {
                        // SpreadElement.arguments can be various types including Super and Import
                        // We only process regular expressions
                        try {
                            const spreadArg = prop.arguments;
                            if (spreadArg && typeof spreadArg === 'object' && 'type' in spreadArg) {
                                this.extractReferencesFromExpression(spreadArg, references, externalCalls);
                            }
                        }
                        catch {
                            // Skip if we can't process this spread element
                        }
                    }
                }
                break;
            case 'ArrowFunctionExpression':
            case 'FunctionExpression':
                // Don't traverse into nested functions
                break;
            case 'AssignmentExpression':
                this.extractReferencesFromExpression(expression.right, references, externalCalls);
                break;
            case 'AwaitExpression':
                this.extractReferencesFromExpression(expression.argument, references, externalCalls);
                break;
            case 'JSXElement':
            case 'JSXFragment':
                // Handle JSX expressions
                this.extractReferencesFromJSX(expression, references, externalCalls);
                break;
        }
    }
    /**
     * Handle call expressions to detect external function calls
     */
    handleCallExpression(callExpr, references, externalCalls) {
        const callee = callExpr.callee;
        // Check if it's an external function call (member expression like api.sendData)
        if (callee.type === 'MemberExpression') {
            const functionName = this.getMemberExpressionName(callee);
            // Check if it's likely an external call (not a built-in method)
            if (functionName && this.isExternalCall(functionName)) {
                const args = this.extractCallArguments(callExpr);
                externalCalls.push({
                    functionName,
                    arguments: args,
                });
            }
            // Still extract references from the object
            this.extractReferencesFromExpression(callee.object, references, externalCalls);
        }
        // Handle direct function calls
        else if (callee.type === 'Identifier') {
            references.add(callee.value);
        }
        else if (callee.type !== 'Super' && callee.type !== 'Import') {
            // Only process if it's a valid expression type
            this.extractReferencesFromExpression(callee, references, externalCalls);
        }
        // Extract references from arguments
        for (const arg of callExpr.arguments) {
            if (!arg.spread) {
                // arg.expression can be various types, use type assertion after checking
                const argExpr = arg.expression;
                if (argExpr && typeof argExpr === 'object' && 'type' in argExpr) {
                    this.extractReferencesFromExpression(argExpr, references, externalCalls);
                }
            }
        }
    }
    /**
     * Get the full name of a member expression (e.g., "api.sendData")
     */
    getMemberExpressionName(memberExpr) {
        const parts = [];
        // Get the property name
        if (memberExpr.property.type === 'Identifier') {
            parts.unshift(memberExpr.property.value);
        }
        else {
            return null;
        }
        // Get the object name
        let current = memberExpr.object;
        while (current.type === 'MemberExpression') {
            if (current.property.type === 'Identifier') {
                parts.unshift(current.property.value);
            }
            current = current.object;
        }
        if (current.type === 'Identifier') {
            parts.unshift(current.value);
        }
        return parts.length > 1 ? parts.join('.') : null;
    }
    /**
     * Check if a function call is external (not a built-in or internal method)
     */
    isExternalCall(functionName) {
        // Common patterns for external calls
        const externalPatterns = [
            /^api\./,
            /^logger\./,
            /^analytics\./,
            /^fetch\./,
            /^axios\./,
            /^http\./,
            /^service\./,
            /^client\./,
            /Ref\.current\./, // Pattern for ref.current.method() - imperative handle calls
        ];
        // Built-in methods to exclude
        const builtInMethods = [
            'console.log',
            'console.error',
            'console.warn',
            'Math.',
            'Object.',
            'Array.',
            'String.',
            'Number.',
            'Date.',
            'JSON.',
        ];
        // Check if it matches external patterns
        const isExternal = externalPatterns.some(pattern => pattern.test(functionName));
        // Check if it's a built-in method
        const isBuiltIn = builtInMethods.some(method => functionName.startsWith(method));
        return isExternal && !isBuiltIn;
    }
    /**
     * Extract argument variable names from a call expression
     */
    extractCallArguments(callExpr) {
        const args = [];
        for (const arg of callExpr.arguments) {
            if (!arg.spread && arg.expression.type === 'Identifier') {
                args.push(arg.expression.value);
            }
        }
        return args;
    }
    /**
     * Extract references from JSX
     */
    extractReferencesFromJSX(jsx, references, externalCalls) {
        if (jsx.type === 'JSXElement') {
            // Extract from attributes
            for (const attr of jsx.opening.attributes) {
                if (attr.type === 'JSXAttribute' && attr.value) {
                    if (attr.value.type === 'JSXExpressionContainer') {
                        this.extractReferencesFromExpression(attr.value.expression, references, externalCalls);
                    }
                }
            }
            // Extract from children
            for (const child of jsx.children) {
                if (child.type === 'JSXExpressionContainer') {
                    this.extractReferencesFromExpression(child.expression, references, externalCalls);
                }
                else if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
                    this.extractReferencesFromJSX(child, references, externalCalls);
                }
            }
        }
        else if (jsx.type === 'JSXFragment') {
            // Extract from fragment children
            for (const child of jsx.children) {
                if (child.type === 'JSXExpressionContainer') {
                    this.extractReferencesFromExpression(child.expression, references, externalCalls);
                }
                else if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
                    this.extractReferencesFromJSX(child, references, externalCalls);
                }
            }
        }
    }
    /**
     * Check if a function name suggests it's an event handler
     */
    isEventHandlerName(name) {
        const eventHandlerPatterns = [
            /^on[A-Z]/, // onClick, onChange
            /^handle[A-Z]/, // handleClick, handleChange
        ];
        return eventHandlerPatterns.some(pattern => pattern.test(name));
    }
    /**
     * Extract inline callbacks from JSX attributes
     * @param jsxNode - The JSX element or fragment to analyze
     * @returns Array of ProcessInfo objects for inline callbacks
     */
    extractInlineCallbacks(jsxNode) {
        const processes = [];
        const inlineCallbackCounter = { count: 0 };
        this.traverseJSXForInlineCallbacks(jsxNode, processes, inlineCallbackCounter);
        return processes;
    }
    /**
     * Traverse JSX tree to find inline callbacks
     */
    traverseJSXForInlineCallbacks(node, processes, counter) {
        if (node.type === 'JSXElement') {
            // Check attributes for inline callbacks
            for (const attr of node.opening.attributes) {
                if (attr.type === 'JSXAttribute') {
                    this.extractInlineCallbackFromAttribute(attr, processes, counter);
                }
            }
            // Traverse children
            for (const child of node.children) {
                if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
                    this.traverseJSXForInlineCallbacks(child, processes, counter);
                }
            }
        }
        else if (node.type === 'JSXFragment') {
            // Traverse fragment children
            for (const child of node.children) {
                if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
                    this.traverseJSXForInlineCallbacks(child, processes, counter);
                }
            }
        }
    }
    /**
     * Extract inline callback from JSX attribute
     */
    extractInlineCallbackFromAttribute(attr, processes, counter) {
        // Check if attribute name is an event handler (starts with "on")
        const attrName = attr.name.type === 'Identifier' ? attr.name.value : null;
        if (!attrName || !attrName.startsWith('on')) {
            return;
        }
        // Check if value is an expression container
        if (!attr.value || attr.value.type !== 'JSXExpressionContainer') {
            return;
        }
        const expression = attr.value.expression;
        // Check if expression is an inline arrow function or function expression
        if (expression.type === 'ArrowFunctionExpression' || expression.type === 'FunctionExpression') {
            const processInfo = this.extractProcessFromInlineCallback(expression, attrName, counter);
            if (processInfo) {
                processes.push(processInfo);
            }
        }
    }
    /**
     * Extract process information from inline callback
     */
    extractProcessFromInlineCallback(func, attrName, counter) {
        // Generate a unique name for the inline callback
        const name = `inline_${attrName}_${counter.count++}`;
        const { references, externalCalls } = this.analyzeFunctionBody(func);
        return {
            name,
            type: 'event-handler',
            references,
            externalCalls,
        };
    }
}
exports.SWCProcessAnalyzer = SWCProcessAnalyzer;
/**
 * Create a new Process Analyzer instance
 */
function createProcessAnalyzer() {
    return new SWCProcessAnalyzer();
}
