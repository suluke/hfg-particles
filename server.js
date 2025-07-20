const express         = require('express');
const rollup          = require('rollup');
const sass            = require('sass');
const buble           = require('@rollup/plugin-buble');
const typescript      = require('@rollup/plugin-typescript');
const fs              = require('fs-extra');
const resolve         = require('@rollup/plugin-node-resolve');
const commonjs        = require('@rollup/plugin-commonjs');
const replace         = require('@rollup/plugin-replace');
const json            = require('@rollup/plugin-json');
const string          = require('rollup-plugin-string');

const git             = require('git-rev');

const path            = require('path');
const PkgRoot         = __dirname;
const StaticDir       = 'static'; // must not be absolute since concatenated with `root` option
const StaticPath      = path.join(PkgRoot, StaticDir);

// Shared build functions
async function copyAssets() {
  console.log('Copying assets...');
  await fs.mkdirp(StaticPath);
  await fs.copy(path.join(PkgRoot, 'node_modules', 'font-awesome', 'fonts'), path.join(StaticPath, 'fonts'));
  await fs.copy(path.join(PkgRoot, 'node_modules', 'ffmpeg.js', 'ffmpeg-worker-mp4.js'), path.join(StaticPath, 'ffmpeg-worker-mp4.js'));
  console.log('✅ Assets copied');
}

function compileSassFile(sassPath, outputPath = null) {
  try {
    const result = sass.compile(sassPath, {
      style: 'expanded',
      loadPaths: [path.join(PkgRoot, 'node_modules')]
    });
    
    if (outputPath) {
      fs.ensureDirSync(path.dirname(outputPath));
      fs.writeFileSync(outputPath, result.css);
      console.log(`✅ Sass compiled: ${outputPath}`);
    }
    
    return result.css;
  } catch (error) {
    console.error('❌ Sass compilation failed:', error.message);
    if (error.span) {
      console.error(`At line ${error.span.start.line + 1}, column ${error.span.start.column + 1}`);
    }
    throw error;
  }
}

async function buildAllSass() {
  console.log('Building all Sass files...');
  const sassFile = path.join(PkgRoot, 'sass', 'styles.scss');
  const cssFile = path.join(StaticPath, 'styles.css');
  compileSassFile(sassFile, cssFile);
}

function getGitRevision() {
  return new Promise((resolve, reject) => {
    git.short(resolve);
  });
}

function createRollupConfig(gitrev, inputFile = 'main.bundle', outputFile = 'main.js') {
  // Try TypeScript extension first, then fallback to original
  const tsInput = path.join(PkgRoot, 'js', inputFile + '.ts');
  const jsInput = path.join(PkgRoot, 'js', inputFile);
  const inputPath = require('fs').existsSync(tsInput) ? tsInput : jsInput;
  
  return {
    input: inputPath,
    output: {
      file: path.join(StaticPath, outputFile),
      format: 'iife',
      sourcemap: true
    },
    plugins: [
      string({ include: '**/*.md' }),
      json(),
      typescript({
        target: 'ES2018',
        module: 'ESNext',
        lib: ['ES2018', 'DOM'],
        moduleResolution: 'node',
        allowJs: true,
        strict: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        forceConsistentCasingInFileNames: true,
        skipLibCheck: true,
        sourceMap: true,
        inlineSources: true,
        declaration: false,
        declarationMap: false
      }),
      replace({
        include: ['js/config.js', 'js/config.ts'],
        delimiters: [ '<@', '@>' ],
        values: {
          TIMESTAMP: new Date().toISOString(),
          GIT_REV: gitrev
        }
      }),
      buble({
        exclude: [ 'node_modules/ffmpeg.js/**' ]
      }),
      resolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs({
        exclude: [ 'node_modules/ffmpeg.js/**' ]
      }),
    ]
  };
}

async function buildJavaScript(gitrev, inputFile = 'main.bundle', outputFile = 'main.js') {
  console.log(`Building JavaScript: ${inputFile} -> ${outputFile}`);
  try {
    const config = createRollupConfig(gitrev, inputFile, outputFile);
    const bundle = await rollup.rollup(config);
    await bundle.write(config.output);
    console.log('✅ JavaScript compiled');
    console.log(`Generated: ${config.output.file}`);
  } catch (error) {
    console.error('❌ JavaScript compilation failed:', error.message);
    throw error;
  }
}

function createSassMiddleware() {
  return (req, res, next) => {
    if (req.url.endsWith('.css')) {
      const cssFile = req.url.replace(/\.css$/, '.scss');
      const sassPath = path.join(PkgRoot, 'sass', cssFile);
      const outPath = path.join(StaticPath, req.url);
      
      try {
        const css = compileSassFile(sassPath, outPath);
        res.sendFile(outPath);
      } catch (err) {
        console.error('Sass middleware error:', err.message);
        next();
      }
    } else {
      next();
    }
  };
}

function createJavaScriptMiddleware() {
  return async (req, res, next) => {
    if (req.url.endsWith('.js')) {
      try {
        const gitrev = await getGitRevision();
        const bundleName = path.basename(req.url, '.js') + '.bundle';
        const outputName = path.basename(req.url);
        
        await buildJavaScript(gitrev, bundleName, outputName);
        res.sendFile(path.join(StaticPath, outputName));
      } catch (err) {
        console.error('JavaScript middleware error:', err.message);
        next();
      }
    } else {
      next();
    }
  };
}

// Command line interface for build tasks
async function runBuildCommand(command) {
  try {
    const gitrev = await getGitRevision();
    
    switch (command) {
      case 'sass':
        await buildAllSass();
        break;
      case 'assets':
        await copyAssets();
        break;
      case 'js':
        await buildJavaScript(gitrev);
        break;
      case 'build':
        await copyAssets();
        await buildAllSass();
        await buildJavaScript(gitrev);
        console.log('✅ Full build completed');
        break;
      default:
        console.log('Available commands: sass, assets, js, build');
        process.exit(1);
    }
  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

// Check if running as build command
const buildCommand = process.argv[2];
if (buildCommand && ['sass', 'assets', 'js', 'build'].includes(buildCommand)) {
  runBuildCommand(buildCommand);
} else {
  // Start server
  copyAssets().then(() => {
    // Create middlewares
    const js = createJavaScriptMiddleware();
    const css = createSassMiddleware();

    // Static file server
    const statics = express.static(StaticPath);
    
    const server = express();
    server.get('/', (req, res) => {
      fs.copy(path.join(PkgRoot, 'index.html'), path.join(StaticPath, 'index.html')).then(
        () => res.sendFile(path.join(PkgRoot, StaticDir, 'index.html'))
      );
    });
    server.use(js);
    server.use(css);
    server.use(statics);

    server.listen(3000);
    console.log('🚀 Server running on http://localhost:3000');
  }).catch(err => {
    console.error(err)
    process.exit(1);
  });
}
