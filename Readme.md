## To install
```
npm i && bower i
```

## To view:
```
gulp build
```
Visit /build/index.html


## To work on:
```
gulp watch
```

## About the layout / setup

The shared folder contains all assets that do not get compiled and all precompiled files:
* fonts
* images
* javascript
* pages
* partials
* sass

We use [nunjucks](https://github.com/mozilla/nunjucks) to render templates into html.

We use [sass](http://sass-lang.com), [bootstrap](http://getbootstrap.com) and [BEM](https://en.bem.info/) for our css styles.

Finally, we use [gulp](http://gulpjs.com) to compile and build our html templates.
