import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const ctx = await esbuild.context({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  external: [
    'vscode',
    '@swc/core',
    '@swc/wasm',
    '@swc/core-*',
  ],
  format: 'cjs',
  platform: 'node',
  sourcemap: true,
  minify: !watch,
  target: 'es2022',
  logLevel: 'info',
});

if (watch) {
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log('✓ Extension bundled successfully');
}
