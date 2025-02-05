<div align="center">
    <centering>
    <img src="header.png" width='600px'/>
    </centering>
</div>


[Chart.js](http://www.chartjs.org/) plugin to draw vertical crosshair, zoom, interpolate values and sync chart interactions.

Requires [Chart.js](https://github.com/chartjs/Chart.js/releases) **3.4.0** or later.

## Documentation

- [Installation](https://chartjs-plugin-crosshair.netlify.com/installation)
- [Options](https://chartjs-plugin-crosshair.netlify.com/options)
- [Samples](https://chartjs-plugin-crosshair.netlify.com/samples)

## Example

```javascript
new Chart(ctx, {
  // ... data ...
  options: {
    // ... other options ...
    plugins: {
      tooltip: {
        mode: 'interpolate',
        intersect: false
      },
      crosshair: {
        line: {
          color: '#F66',  // crosshair line color
          width: 1        // crosshair line width
        },
        sync: {
          enabled: true,            // enable trace line syncing with other charts
          group: 1,                 // chart group
          suppressTooltips: false   // suppress tooltips when showing a synced tracer
        },
        zoom: {
          enabled: true,                                      // enable zooming
          zoomboxBackgroundColor: 'rgba(66,133,244,0.2)',     // background color of zoom box 
          zoomboxBorderColor: '#48F',                         // border color of zoom box
          zoomButtonText: 'Reset Zoom',                       // reset zoom button text
          zoomButtonClass: 'reset-zoom',                      // reset zoom button class
        },
        callbacks: {
          beforeZoom: () => function(start, end) {                  // called before zoom, return false to prevent zoom
            return true;
          },
          afterZoom: () => function(start, end) {                   // called after zoom
          }
        }
      }
    }
  }
});
```

## Development

You first need to install node dependencies (requires [Node.js](https://nodejs.org/)):

    > npm install

The following commands will then be available from the repository root:

    > npm run build            // build dist files
    > npm run build --watch    // build and watch for changes
    > npm run lint             // perform code linting
    > npm run docs             // generate GitBook documentation (`dist/docs`)
    > npm run samples          // prepare samples for release (`dist/samples`)
    > npm run package          // create an archive with dist files and samples
    > npm run netlify          // prepare Netlify artifacts (`dist/www`)

## License

`chartjs-plugin-crosshair` is available under the [MIT license](LICENSE.md).
