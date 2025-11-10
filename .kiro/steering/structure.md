# Project Structure

## Directory Layout

```
.
├── src/                    # Source code
│   ├── extension.ts        # Main extension entry point
│   └── test/              # Test files
│       └── extension.test.ts
├── out/                    # Compiled JavaScript (gitignored)
├── node_modules/          # Dependencies (gitignored)
├── .vscode/               # VS Code workspace settings
├── .kiro/                 # Kiro AI assistant configuration
│   └── steering/          # AI steering rules
├── package.json           # Extension manifest and dependencies
├── tsconfig.json          # TypeScript configuration
├── eslint.config.mjs      # ESLint configuration
└── README.md              # Extension documentation
```

## Key Files

- **package.json**: Extension manifest defining commands, activation events, and metadata
- **src/extension.ts**: Main entry point with `activate()` and `deactivate()` functions
- **tsconfig.json**: TypeScript compiler settings with strict mode
- **eslint.config.mjs**: Linting rules for code quality

## Conventions

- All source code in `src/` directory
- Compiled output goes to `out/` directory
- Tests colocated in `src/test/` directory
- Extension commands registered in `activate()` function
- Commands prefixed with extension name: `web-component-analyzer.*`
