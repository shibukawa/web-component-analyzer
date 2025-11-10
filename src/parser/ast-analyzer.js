"use strict";
/**
 * AST Analyzer for traversing and analyzing React component AST
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SWCASTAnalyzer = void 0;
const props_analyzer_1 = require("../analyzers/props-analyzer");
const hooks_analyzer_1 = require("../analyzers/hooks-analyzer");
const process_analyzer_1 = require("../analyzers/process-analyzer");
const jsx_analyzer_1 = require("../analyzers/jsx-analyzer");
/**
 * Implementation of AST Analyzer using visitor pattern
 */
class SWCASTAnalyzer {
    propsAnalyzer;
    processAnalyzer;
    jsxAnalyzer;
    typeResolver;
    constructor(typeResolver) {
        this.typeResolver = typeResolver;
        this.propsAnalyzer = new props_analyzer_1.SWCPropsAnalyzer(typeResolver);
        this.processAnalyzer = new process_analyzer_1.SWCProcessAnalyzer();
        this.jsxAnalyzer = new jsx_analyzer_1.SWCJSXAnalyzer();
    }
    /**
     * Analyze a parsed module to extract component information
     * @param module - The SWC module to analyze
     * @param filePath - Optional file path for type resolution
     * @returns Promise resolving to ComponentAnalysis object or null if no component found
     */
    async analyze(module, filePath) {
        // Find React component in the module
        const componentInfo = this.findReactComponent(module);
        if (!componentInfo) {
            console.log('🔍 AST Analyzer: No component found');
            return null;
        }
        const { name, type, body } = componentInfo;
        console.log('🔍 AST Analyzer: Component found:', name, 'type:', type);
        console.log('🔍 AST Analyzer: Body statements:', body.length);
        // Extract props using Props Analyzer (with type resolution if file path is available)
        const props = await this.propsAnalyzer.analyzeProps(module, filePath, name);
        // Extract hooks using Hooks Analyzer (with type resolution if available)
        console.log('🔍 AST Analyzer: Calling hooks analyzer...');
        const hooksAnalyzer = new hooks_analyzer_1.SWCHooksAnalyzer(this.typeResolver, filePath);
        const hooks = await hooksAnalyzer.analyzeHooks(body);
        console.log('🔍 AST Analyzer: Hooks returned:', hooks.length);
        // Extract processes using Process Analyzer
        const processes = this.processAnalyzer.analyzeProcesses(body);
        // Extract JSX output using JSX Analyzer
        const jsxOutput = this.extractJSXOutput(componentInfo);
        // Extract inline callbacks from JSX
        const inlineCallbacks = this.extractInlineCallbacksFromJSX(componentInfo);
        // Combine regular processes with inline callbacks
        const allProcesses = [...processes, ...inlineCallbacks];
        return {
            componentName: name,
            componentType: type,
            props,
            hooks,
            processes: allProcesses,
            jsxOutput,
        };
    }
    /**
     * Find React component definition in the module
     * @param module - The SWC module to search
     * @returns Component information or null
     */
    findReactComponent(module) {
        // First pass: look for inline exports (export default function App() {})
        for (const item of module.body) {
            // Check for export default declarations
            if (item.type === 'ExportDefaultDeclaration') {
                const componentInfo = this.extractComponentFromDeclaration(item.decl);
                if (componentInfo) {
                    return componentInfo;
                }
            }
            // Check for named export declarations
            if (item.type === 'ExportDeclaration') {
                const componentInfo = this.extractComponentFromDeclaration(item.declaration);
                if (componentInfo) {
                    return componentInfo;
                }
            }
        }
        // Second pass: look for function/class declarations that might be exported separately
        // (e.g., function App() {} ... export default App)
        for (const item of module.body) {
            // Check for function declarations
            if (item.type === 'FunctionDeclaration') {
                const componentInfo = this.extractComponentFromFunction(item);
                if (componentInfo) {
                    return componentInfo;
                }
            }
            // Check for variable declarations (arrow functions)
            if (item.type === 'VariableDeclaration') {
                const componentInfo = this.extractComponentFromVariableDeclaration(item);
                if (componentInfo) {
                    return componentInfo;
                }
            }
            // Check for class declarations
            if (item.type === 'ClassDeclaration') {
                const componentInfo = this.extractComponentFromClass(item);
                if (componentInfo) {
                    return componentInfo;
                }
            }
        }
        return null;
    }
    /**
     * Extract component from a declaration
     */
    extractComponentFromDeclaration(declaration) {
        if (!declaration) {
            return null;
        }
        if (declaration.type === 'FunctionDeclaration') {
            return this.extractComponentFromFunction(declaration);
        }
        if (declaration.type === 'ArrowFunctionExpression' || declaration.type === 'FunctionExpression') {
            return this.extractComponentFromFunctionExpression(declaration);
        }
        if (declaration.type === 'VariableDeclaration') {
            return this.extractComponentFromVariableDeclaration(declaration);
        }
        if (declaration.type === 'ClassDeclaration') {
            return this.extractComponentFromClass(declaration);
        }
        if (declaration.type === 'ClassExpression') {
            return this.extractComponentFromClassExpression(declaration);
        }
        return null;
    }
    /**
     * Extract component from function declaration
     */
    extractComponentFromFunction(func) {
        const name = func.identifier?.value || 'AnonymousComponent';
        // Check if function returns JSX
        if (!func.body || !this.hasJSXReturn(func.body)) {
            return null;
        }
        const body = this.extractFunctionBody(func.body);
        return {
            name,
            type: 'functional',
            body,
            node: func,
        };
    }
    /**
     * Extract component from function expression (arrow or regular)
     */
    extractComponentFromFunctionExpression(func) {
        const name = 'identifier' in func && func.identifier ? func.identifier.value : 'AnonymousComponent';
        if (!func.body) {
            return null;
        }
        // Check if function returns JSX
        if (func.body.type === 'BlockStatement') {
            if (!this.hasJSXReturn(func.body)) {
                return null;
            }
            const body = this.extractFunctionBody(func.body);
            return {
                name,
                type: 'functional',
                body,
                node: func,
            };
        }
        else {
            // Arrow function with expression body
            if (!this.isJSXExpression(func.body)) {
                return null;
            }
            return {
                name,
                type: 'functional',
                body: [],
                node: func,
            };
        }
    }
    /**
     * Extract component from variable declaration
     */
    extractComponentFromVariableDeclaration(varDecl) {
        for (const declarator of varDecl.declarations) {
            if (!declarator.init) {
                continue;
            }
            // Check for arrow function or function expression
            if (declarator.init.type === 'ArrowFunctionExpression' || declarator.init.type === 'FunctionExpression') {
                const name = declarator.id.type === 'Identifier' ? declarator.id.value : 'AnonymousComponent';
                if (!declarator.init.body) {
                    continue;
                }
                // Check if function returns JSX
                if (declarator.init.body.type === 'BlockStatement') {
                    if (!this.hasJSXReturn(declarator.init.body)) {
                        continue;
                    }
                    const body = this.extractFunctionBody(declarator.init.body);
                    return {
                        name,
                        type: 'functional',
                        body,
                        node: declarator.init,
                    };
                }
                else {
                    // Arrow function with expression body
                    if (!this.isJSXExpression(declarator.init.body)) {
                        continue;
                    }
                    return {
                        name,
                        type: 'functional',
                        body: [],
                        node: declarator.init,
                    };
                }
            }
        }
        return null;
    }
    /**
     * Extract component from class declaration
     */
    extractComponentFromClass(classDecl) {
        const name = classDecl.identifier?.value || 'AnonymousComponent';
        // Check if class extends React.Component or React.PureComponent
        if (!this.extendsReactComponent(classDecl)) {
            return null;
        }
        const body = this.extractClassBody(classDecl.body);
        return {
            name,
            type: 'class',
            body,
            node: classDecl,
        };
    }
    /**
     * Extract component from class expression
     */
    extractComponentFromClassExpression(classExpr) {
        const name = classExpr.identifier?.value || 'AnonymousComponent';
        // Check if class extends React.Component or React.PureComponent
        if (!classExpr.superClass) {
            return null;
        }
        const body = this.extractClassBody(classExpr.body);
        return {
            name,
            type: 'class',
            body,
            node: classExpr,
        };
    }
    /**
     * Check if a function body has a JSX return statement
     */
    hasJSXReturn(body) {
        for (const statement of body.stmts) {
            if (statement.type === 'ReturnStatement' && statement.argument) {
                if (this.isJSXExpression(statement.argument)) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Check if an expression is JSX
     */
    isJSXExpression(expression) {
        if (expression.type === 'JSXElement' || expression.type === 'JSXFragment') {
            return true;
        }
        // Check for JSX wrapped in parentheses
        if (expression.type === 'ParenthesisExpression') {
            return this.isJSXExpression(expression.expression);
        }
        // Check for conditional expressions that return JSX
        if (expression.type === 'ConditionalExpression') {
            return this.isJSXExpression(expression.consequent) || this.isJSXExpression(expression.alternate);
        }
        // Check for logical expressions that return JSX
        if (expression.type === 'BinaryExpression') {
            if (expression.operator === '&&' || expression.operator === '||') {
                return this.isJSXExpression(expression.right);
            }
        }
        return false;
    }
    /**
     * Check if class extends React.Component or React.PureComponent
     */
    extendsReactComponent(classDecl) {
        if (!classDecl.superClass) {
            return false;
        }
        const superClass = classDecl.superClass;
        // Check for direct Component or PureComponent
        if (superClass.type === 'Identifier') {
            return superClass.value === 'Component' || superClass.value === 'PureComponent';
        }
        // Check for React.Component or React.PureComponent
        if (superClass.type === 'MemberExpression') {
            const object = superClass.object;
            const property = superClass.property;
            if (object.type === 'Identifier' && object.value === 'React') {
                if (property.type === 'Identifier') {
                    return property.value === 'Component' || property.value === 'PureComponent';
                }
            }
        }
        return false;
    }
    /**
     * Extract function body as array of statements
     */
    extractFunctionBody(body) {
        return body.stmts;
    }
    /**
     * Extract class body as array of statements
     */
    extractClassBody(body) {
        const statements = [];
        for (const member of body) {
            if (member.type === 'ClassMethod' && member.function.body) {
                statements.push(...member.function.body.stmts);
            }
        }
        return statements;
    }
    /**
     * Extract JSX output from component
     */
    extractJSXOutput(componentInfo) {
        const defaultJSXInfo = {
            simplified: '',
            placeholders: [],
        };
        // For functional components, find return statement
        if (componentInfo.type === 'functional') {
            const node = componentInfo.node;
            if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
                if (node.body) {
                    const jsxInfo = this.findJSXInBlockStatement(node.body);
                    if (jsxInfo) {
                        return jsxInfo;
                    }
                }
            }
            else if (node.type === 'ArrowFunctionExpression') {
                if (node.body.type === 'BlockStatement') {
                    const jsxInfo = this.findJSXInBlockStatement(node.body);
                    if (jsxInfo) {
                        return jsxInfo;
                    }
                }
                else {
                    // Expression body
                    const jsxInfo = this.jsxAnalyzer.analyzeJSX(node.body);
                    if (jsxInfo) {
                        return jsxInfo;
                    }
                }
            }
        }
        // For class components, find render method
        if (componentInfo.type === 'class') {
            const node = componentInfo.node;
            if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
                const jsxInfo = this.findJSXInClassBody(node.body);
                if (jsxInfo) {
                    return jsxInfo;
                }
            }
        }
        return defaultJSXInfo;
    }
    /**
     * Find JSX in block statement
     */
    findJSXInBlockStatement(body) {
        for (const statement of body.stmts) {
            if (statement.type === 'ReturnStatement' && statement.argument) {
                const jsxInfo = this.jsxAnalyzer.analyzeJSX(statement);
                if (jsxInfo) {
                    return jsxInfo;
                }
            }
        }
        return null;
    }
    /**
     * Find JSX in class body (render method)
     */
    findJSXInClassBody(body) {
        for (const member of body) {
            if (member.type === 'ClassMethod') {
                const key = member.key;
                // Check if this is the render method
                if (key.type === 'Identifier' && key.value === 'render') {
                    if (member.function.body) {
                        return this.findJSXInBlockStatement(member.function.body);
                    }
                }
            }
        }
        return null;
    }
    /**
     * Extract inline callbacks from JSX
     */
    extractInlineCallbacksFromJSX(componentInfo) {
        const jsxNode = this.findJSXNodeFromComponent(componentInfo);
        if (!jsxNode) {
            return [];
        }
        return this.processAnalyzer.extractInlineCallbacks(jsxNode);
    }
    /**
     * Find JSX node from component
     */
    findJSXNodeFromComponent(componentInfo) {
        // For functional components, find return statement
        if (componentInfo.type === 'functional') {
            const node = componentInfo.node;
            if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression') {
                if (node.body) {
                    return this.findJSXNodeInBlockStatement(node.body);
                }
            }
            else if (node.type === 'ArrowFunctionExpression') {
                if (node.body.type === 'BlockStatement') {
                    return this.findJSXNodeInBlockStatement(node.body);
                }
                else {
                    // Expression body
                    return this.findJSXNodeInExpression(node.body);
                }
            }
        }
        // For class components, find render method
        if (componentInfo.type === 'class') {
            const node = componentInfo.node;
            if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
                return this.findJSXNodeInClassBody(node.body);
            }
        }
        return null;
    }
    /**
     * Find JSX node in block statement
     */
    findJSXNodeInBlockStatement(body) {
        for (const statement of body.stmts) {
            if (statement.type === 'ReturnStatement' && statement.argument) {
                return this.findJSXNodeInExpression(statement.argument);
            }
        }
        return null;
    }
    /**
     * Find JSX node in expression
     */
    findJSXNodeInExpression(expression) {
        if (expression.type === 'JSXElement' || expression.type === 'JSXFragment') {
            return expression;
        }
        // Check for JSX wrapped in parentheses
        if (expression.type === 'ParenthesisExpression') {
            return this.findJSXNodeInExpression(expression.expression);
        }
        // Check for conditional expressions that return JSX
        if (expression.type === 'ConditionalExpression') {
            const consequent = this.findJSXNodeInExpression(expression.consequent);
            if (consequent) {
                return consequent;
            }
            return this.findJSXNodeInExpression(expression.alternate);
        }
        // Check for logical expressions that return JSX
        if (expression.type === 'BinaryExpression') {
            if (expression.operator === '&&' || expression.operator === '||') {
                return this.findJSXNodeInExpression(expression.right);
            }
        }
        return null;
    }
    /**
     * Find JSX node in class body (render method)
     */
    findJSXNodeInClassBody(body) {
        for (const member of body) {
            if (member.type === 'ClassMethod') {
                const key = member.key;
                // Check if this is the render method
                if (key.type === 'Identifier' && key.value === 'render') {
                    if (member.function.body) {
                        return this.findJSXNodeInBlockStatement(member.function.body);
                    }
                }
            }
        }
        return null;
    }
}
exports.SWCASTAnalyzer = SWCASTAnalyzer;
