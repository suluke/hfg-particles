const express         = require('express');
const rollup          = require('express-middleware-rollup');
const sass            = require('node-sass-middleware');
const buble           = require('rollup-plugin-buble');
const fs              = require('fs-promise');

const path            = require('path');
const PkgRoot         = __dirname;
const StaticDir       = 'static'; // must not be absolute since concatenated with `root` option

// Javascript compilation
const js = rollup({
  src: 'js',
  dest: StaticDir,
  root: PkgRoot,
  prefix: '/',
  serve: 'on-compile',
  rollupOpts: {
    plugins: [buble()]
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
const StaticPath = path.join(PkgRoot, StaticDir);
const statics = express.static(StaticPath);

fs.mkdirp(StaticPath)
.then(() => fs.copy(path.join(PkgRoot, 'node_modules', 'font-awesome', 'fonts'), path.join(StaticPath, 'fonts')))
.then(() => fs.copy(path.join(PkgRoot, 'index.html'), path.join(StaticPath, 'index.html')))
.then(() => {
  const server = express();
  server.get('/', (req, res) => {
    res.sendFile(path.join(PkgRoot, StaticDir, 'index.html'));
  });
  server.use(js);
  server.use(css);
  server.use(statics);

  server.listen(3000);
})
.catch(err => {
  console.error(err)
});
