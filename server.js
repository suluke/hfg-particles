const express         = require('express');
const rollup          = require('express-middleware-rollup');
const sass            = require('node-sass-middleware');
const buble           = require('rollup-plugin-buble');
const fs              = require('fs-extra');
const resolve         = require('rollup-plugin-node-resolve');
const commonjs        = require('rollup-plugin-commonjs');
const replace         = require('rollup-plugin-replace');
const json            = require('rollup-plugin-json');

const git             = require('git-rev');

const path            = require('path');
const PkgRoot         = __dirname;
const StaticDir       = 'static'; // must not be absolute since concatenated with `root` option
const StaticPath      = path.join(PkgRoot, StaticDir);

fs.mkdirp(StaticPath)
.then(() => fs.copy(path.join(PkgRoot, 'node_modules', 'font-awesome', 'fonts'), path.join(StaticPath, 'fonts')))
.then(() => new Promise((res, rej) => git.short(res)))
.then((gitrev) => {
  // Javascript compilation
  const js = rollup({
    src: 'js',
    dest: StaticDir,
    root: PkgRoot,
    prefix: '/',
    serve: 'on-compile',
    rollupOpts: {
      plugins: [
        json(),
        replace({
          include: 'js/config.js',
          delimiters: [ '<@', '@>' ],
          values: {
            TIMESTAMP: new Date().toISOString(),
            GIT_REV: gitrev
          }
        }),
        buble(),
        resolve({
          main: true,
          extensions: [ '.js', '.json' ]
        }),
        commonjs({
          extensions: [ '.js', '.json' ],
          namedExports: {
            'node_modules/image-capture/lib/imagecapture.js': [ 'ImageCapture' ]
          }
        }),
      ]
    }
  });

  // Css compilation
  const css = sass({
    src: 'sass',
    dest: StaticDir,
    root: PkgRoot,
    prefix: '/',
    outputStyle: 'extended',
    includePaths: [
      path.join(PkgRoot, 'node_modules')
    ]
  });

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
})
.catch(err => {
  console.error(err)
});
