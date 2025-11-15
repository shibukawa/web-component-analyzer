import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// Configure Monaco Editor environment
(window as any).MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript' || label === 'typescriptreact' || label === 'javascriptreact') {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

// Configure Monaco Editor languages
export function configureMonacoLanguages() {
  // TypeScript/JSX configuration is handled in monaco-types.ts
  // This function only sets up Vue and Svelte language support

  // Register Vue language if not already registered
  if (!monaco.languages.getLanguages().some(lang => lang.id === 'vue')) {
    monaco.languages.register({ id: 'vue' });
    
    // Basic Vue syntax highlighting
    monaco.languages.setMonarchTokensProvider('vue', {
      defaultToken: '',
      tokenPostfix: '.vue',
      
      brackets: [
        { open: '{', close: '}', token: 'delimiter.curly' },
        { open: '[', close: ']', token: 'delimiter.bracket' },
        { open: '(', close: ')', token: 'delimiter.parenthesis' },
        { open: '<', close: '>', token: 'delimiter.angle' }
      ],

      keywords: [
        'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
        'import', 'export', 'default', 'from', 'as', 'class', 'extends', 'new',
        'this', 'super', 'static', 'async', 'await', 'try', 'catch', 'throw'
      ],

      typeKeywords: [
        'string', 'number', 'boolean', 'any', 'void', 'never', 'unknown',
        'interface', 'type', 'enum'
      ],

      operators: [
        '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
        '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
        '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
        '%=', '<<=', '>>=', '>>>='
      ],

      tokenizer: {
        root: [
          [/<template>/, { token: 'tag', next: '@template' }],
          [/<script.*?>/, { token: 'tag', next: '@script' }],
          [/<style.*?>/, { token: 'tag', next: '@style' }],
        ],

        template: [
          [/<\/template>/, { token: 'tag', next: '@pop' }],
          [/<[a-zA-Z][\w-]*/, { token: 'tag', next: '@tag' }],
          [/{{/, { token: 'delimiter.curly', next: '@expression' }],
          [/[^<{]+/, 'string'],
        ],

        tag: [
          [/\/?>/, { token: 'tag', next: '@pop' }],
          [/[\w-]+/, 'attribute.name'],
          [/=/, 'delimiter'],
          [/"[^"]*"/, 'attribute.value'],
          [/'[^']*'/, 'attribute.value'],
        ],

        expression: [
          [/}}/, { token: 'delimiter.curly', next: '@pop' }],
          [/[a-zA-Z_]\w*/, 'variable'],
          [/[{}()\[\]]/, '@brackets'],
          [/\d+/, 'number'],
        ],

        script: [
          [/<\/script>/, { token: 'tag', next: '@pop' }],
          [/[a-zA-Z_]\w*/, {
            cases: {
              '@keywords': 'keyword',
              '@typeKeywords': 'type',
              '@default': 'identifier'
            }
          }],
          [/"[^"]*"/, 'string'],
          [/'[^']*'/, 'string'],
          [/`[^`]*`/, 'string'],
          [/\d+/, 'number'],
          [/[{}()\[\]]/, '@brackets'],
        ],

        style: [
          [/<\/style>/, { token: 'tag', next: '@pop' }],
          [/[^<]+/, 'string'],
        ],
      },
    });
  }

  // Register Svelte language if not already registered
  if (!monaco.languages.getLanguages().some(lang => lang.id === 'svelte')) {
    monaco.languages.register({ id: 'svelte' });
    
    // Basic Svelte syntax highlighting
    monaco.languages.setMonarchTokensProvider('svelte', {
      defaultToken: '',
      tokenPostfix: '.svelte',
      
      brackets: [
        { open: '{', close: '}', token: 'delimiter.curly' },
        { open: '[', close: ']', token: 'delimiter.bracket' },
        { open: '(', close: ')', token: 'delimiter.parenthesis' },
        { open: '<', close: '>', token: 'delimiter.angle' }
      ],

      keywords: [
        'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
        'import', 'export', 'default', 'from', 'as', 'class', 'extends', 'new',
        'this', 'super', 'static', 'async', 'await', 'try', 'catch', 'throw'
      ],

      svelteKeywords: [
        'each', 'if', 'else', 'await', 'then', 'catch', 'as', 'key'
      ],

      typeKeywords: [
        'string', 'number', 'boolean', 'any', 'void', 'never', 'unknown',
        'interface', 'type', 'enum'
      ],

      tokenizer: {
        root: [
          [/<script.*?>/, { token: 'tag', next: '@script' }],
          [/<style.*?>/, { token: 'tag', next: '@style' }],
          [/<[a-zA-Z][\w-]*/, { token: 'tag', next: '@tag' }],
          [/{#/, { token: 'delimiter.curly', next: '@svelteBlock' }],
          [/{\//, { token: 'delimiter.curly', next: '@svelteBlockEnd' }],
          [/{:/, { token: 'delimiter.curly', next: '@svelteBlock' }],
          [/{/, { token: 'delimiter.curly', next: '@expression' }],
          [/[^<{]+/, 'string'],
        ],

        script: [
          [/<\/script>/, { token: 'tag', next: '@pop' }],
          [/[a-zA-Z_]\w*/, {
            cases: {
              '@keywords': 'keyword',
              '@typeKeywords': 'type',
              '@default': 'identifier'
            }
          }],
          [/"[^"]*"/, 'string'],
          [/'[^']*'/, 'string'],
          [/`[^`]*`/, 'string'],
          [/\d+/, 'number'],
          [/[{}()\[\]]/, '@brackets'],
        ],

        style: [
          [/<\/style>/, { token: 'tag', next: '@pop' }],
          [/[^<]+/, 'string'],
        ],

        tag: [
          [/\/?>/, { token: 'tag', next: '@pop' }],
          [/[\w-]+/, 'attribute.name'],
          [/=/, 'delimiter'],
          [/"[^"]*"/, 'attribute.value'],
          [/'[^']*'/, 'attribute.value'],
          [/{/, { token: 'delimiter.curly', next: '@expression' }],
        ],

        svelteBlock: [
          [/}/, { token: 'delimiter.curly', next: '@pop' }],
          [/[a-zA-Z_]\w*/, {
            cases: {
              '@svelteKeywords': 'keyword',
              '@default': 'variable'
            }
          }],
          [/[{}()\[\]]/, '@brackets'],
        ],

        svelteBlockEnd: [
          [/}/, { token: 'delimiter.curly', next: '@pop' }],
          [/[a-zA-Z_]\w*/, 'keyword'],
        ],

        expression: [
          [/}/, { token: 'delimiter.curly', next: '@pop' }],
          [/[a-zA-Z_]\w*/, 'variable'],
          [/[{}()\[\]]/, '@brackets'],
          [/\d+/, 'number'],
          [/"[^"]*"/, 'string'],
          [/'[^']*'/, 'string'],
        ],
      },
    });
  }
}
