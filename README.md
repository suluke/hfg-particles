# Image Particles
Visit the site at [suluke.github.io/hfg-particles](http://suluke.github.io/hfg-particles)

## Hacking
### Getting started
If you want to dive into the code and make changes, we recommend you do the following to get started:
1. Clone this repo (obviously)
1. Run `git submodule update --init`. This will populate the `static` subdirectory, which also includes some binary assets which we don't want to have in the `master` branch as of now.
1. You must have `nodejs` and `npm` installed
1. From inside this repo's directory, run `npm install`
1. Now start the development server by running `npm start`  
   Alternatively, there is also the `npm run start:dev` script, which will try to restart the server when you make deeper changes to the overall project setup
   (this mainly affects `server.js` and stuff inside `node_modules`).
1. Et voilá: If you navigate your webserver to `localhost:3000`, you should see the same webpage as on the [project website](suluke.github.io/hfg-particles)

### Deploying the site on your own server
After you have successfully set up the development environment on your local machine and navigated to `localhost:3000`, the development server will have processed all source files and written the results to the `static/` subdirectory.
The contents of this directory can be served statically by any file server of you choice.
> Because of this, we (the project maintainers) have the `gh-pages` branch checked out inside the `static/` directory.
> So whenever we want to update the live-site, we just `cd static/ && git commit -am "Update gh-pages build" && git push` - That's all for deployment :)

### Code overview
1. `package.json`: Some handy scripts live in this directory, like e.g. `npm run lint` or `npm run format`
1. `server.js`: Our development server is at the same time serving as our build system.
   This may sound weird to you, but we find this works quite well in practice and keeps the complexity low.
   We don't have live-reload, but hitting f5 when you need it shouldn't be all that complicated.
   In return, you will avoid having tens of file watchers as well as having to recompile the whole project on every file save.
1. `index.html`: The main entry point to the webapp.
1. `js/` directory: Application code. The entry is `main.bundle` (as can be seen from the `.bundle` suffix).
   We use es6 (transpiled by [bublé](https://www.npmjs.com/package/buble)), including module `import` syntax (statically bundled by [rollup](https://www.npmjs.com/package/rollup))
1. `sass/` directory: Styles, written in SCSS language and compiled by our server using [node-sass](https://www.npmjs.com/package/node-sass)

### Creating new effects
For the creation of a new effect, the following steps are required:
1. Create a new file where the effect will live in the future in `js/effects`, e.g. `js/effects/my-effect.js`
1. Add your effect to the effects list, which is found in `js/effects/index.js`
1. Write the necessary code. This usually involves the following steps:
   1. Create a class extending `Effect` (`js/effects/effect.js`) where you override the unimplemented methods with your own
   1. Create a class extending `ConfigUI` (also in `effect.js`) to describe the ui a user will see to change certain effect parameters

See commit [cdefd5c](https://github.com/suluke/hfg-particles/commit/cdefd5c67e3a50da6588f5e34a310aa36708f390) for a fairly complete example of this.

## Legal Info
See [LICENSE](LICENSE) file for legal information.
