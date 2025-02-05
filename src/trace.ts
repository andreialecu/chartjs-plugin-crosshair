import { valueOrDefault } from 'chart.js/helpers';

const defaultOptions = {
  line: {
    color: '#F66',
    width: 1,
    dashPattern: []
  },
  sync: {
    enabled: true,
    group: 1,
    suppressTooltips: false
  },
  zoom: {
    enabled: true,
    zoomboxBackgroundColor: 'rgba(66,133,244,0.2)',
    zoomboxBorderColor: '#48F',
    zoomButtonText: 'Reset Zoom',
    zoomButtonClass: 'reset-zoom',
  },
  snap: {
    enabled: false,
  },
  callbacks: {
    beforeZoom: function(start: number, end: number) {
      return true;
    },
    afterZoom: function(start: number, end: number) {
    }
  }
};

interface Crosshair {
  enabled: boolean;
  suppressUpdate: boolean;
  x: number | null;
  originalData: any[];
  originalXRange: { min?: number | null; max?: number | null };
  dragStarted: boolean;
  dragStartX: number | null;
  dragEndX: number | null;
  suppressTooltips: boolean;
  ignoreNextEvents: number;
  reset: () => void;
  syncEventHandler?: (e: any) => void;
  resetZoomEventHandler?: (e: any) => void;
  button?: HTMLButtonElement | false;
  start?: number;
  end?: number;
  min?: number;
  max?: number;
}

interface ChartWithCrosshair extends Chart {
  crosshair: Crosshair;
  panZoom: (increment: number) => void;
}

export const CrosshairPlugin = {
  id: 'crosshair',

  afterInit: function(chart: ChartWithCrosshair) {
    if (!chart.config.options.scales.x) {
      return;
    }

    const xScaleType = chart.config.options.scales.x.type;

    if (xScaleType !== 'linear' && xScaleType !== 'time' && xScaleType !== 'category' && xScaleType !== 'logarithmic') {
      return;
    }

    if (chart.options.plugins.crosshair === undefined) {
      chart.options.plugins.crosshair = defaultOptions;
    }

    chart.crosshair = {
      enabled: false,
      suppressUpdate: false,
      x: null,
      originalData: [],
      originalXRange: {},
      dragStarted: false,
      dragStartX: null,
      dragEndX: null,
      suppressTooltips: false,
      ignoreNextEvents: 0,
      reset: function() {
        this.resetZoom(chart, false, false);
      }.bind(this)
    };

    const syncEnabled = this.getOption(chart, 'sync', 'enabled');
    if (syncEnabled) {
      chart.crosshair.syncEventHandler = function(e: any) {
        this.handleSyncEvent(chart, e);
      }.bind(this);

      chart.crosshair.resetZoomEventHandler = function(e: any) {
        const syncGroup = this.getOption(chart, 'sync', 'group');

        if (e.chartId !== chart.id && e.syncGroup === syncGroup) {
          this.resetZoom(chart, true);
        }
      }.bind(this);

      window.addEventListener('sync-event', chart.crosshair.syncEventHandler);
      window.addEventListener('reset-zoom-event', chart.crosshair.resetZoomEventHandler);
    }

    chart.panZoom = this.panZoom.bind(this, chart);
  },

  afterDestroy: function(chart: ChartWithCrosshair) {
    const syncEnabled = this.getOption(chart, 'sync', 'enabled');
    if (syncEnabled) {
      window.removeEventListener('sync-event', chart.crosshair.syncEventHandler!);
      window.removeEventListener('reset-zoom-event', chart.crosshair.resetZoomEventHandler!);
    }
  },

  panZoom: function(chart: ChartWithCrosshair, increment: number) {
    if (chart.crosshair.originalData.length === 0) {
      return;
    }
    const diff = chart.crosshair.end! - chart.crosshair.start!;
    const min = chart.crosshair.min!;
    const max = chart.crosshair.max!;
    if (increment < 0) { // left
      chart.crosshair.start = Math.max(chart.crosshair.start! + increment, min);
      chart.crosshair.end = chart.crosshair.start === min ? min + diff : chart.crosshair.end! + increment;
    } else { // right
      chart.crosshair.end = Math.min(chart.crosshair.end! + increment, chart.crosshair.max!);
      chart.crosshair.start = chart.crosshair.end === max ? max - diff : chart.crosshair.start! + increment;
    }

    this.doZoom(chart, chart.crosshair.start, chart.crosshair.end);
  },

  getOption: function(chart: ChartWithCrosshair, category: string, name: string) {
    return valueOrDefault(chart.options.plugins.crosshair[category] ? chart.options.plugins.crosshair[category][name] : undefined, defaultOptions[category][name]);
  },

  getXScale: function(chart: ChartWithCrosshair) {
    return chart.data.datasets.length ? chart.scales[chart.getDatasetMeta(0).xAxisID] : null;
  },
  getYScale: function(chart: ChartWithCrosshair) {
    return chart.scales[chart.getDatasetMeta(0).yAxisID];
  },

  handleSyncEvent: function(chart: ChartWithCrosshair, e: any) {
    const syncGroup = this.getOption(chart, 'sync', 'group');

    if (e.chartId === chart.id) {
      return;
    }

    if (e.syncGroup !== syncGroup) {
      return;
    }

    const xScale = this.getXScale(chart);

    if (!xScale) {
      return;
    }

    const buttons = (e.original.native.buttons === undefined ? e.original.native.which : e.original.native.buttons);
    if (e.original.type === 'mouseup') {
      buttons = 0;
    }

    const newEvent = {
      type: e.original.type == "click" ? "mousemove" : e.original.type,
      chart: chart,
      x: xScale.getPixelForValue(e.xValue),
      y: e.original.y,
      native: {
        buttons: buttons
      },
      stop: true
    };
    chart._eventHandler(newEvent);
  },

  afterEvent: function(chart: ChartWithCrosshair, event: any) {
    if (chart.config.options.scales.x.length == 0) {
      return;
    }

    let e = event.event;

    const xScaleType = chart.config.options.scales.x.type;

    if (xScaleType !== 'linear' && xScaleType !== 'time' && xScaleType !== 'category' && xScaleType !== 'logarithmic') {
      return;
    }

    const xScale = this.getXScale(chart);

    if (!xScale) {
      return;
    }

    if(chart.crosshair.ignoreNextEvents > 0) {
      chart.crosshair.ignoreNextEvents -= 1;
      return;
    }

    const buttons = (e.native.buttons === undefined ? e.native.which : e.native.buttons);
    if (e.native.type === 'mouseup') {
      buttons = 0;
    }

    const syncEnabled = this.getOption(chart, 'sync', 'enabled');
    const syncGroup = this.getOption(chart, 'sync', 'group');

    if (!e.stop && syncEnabled) {
      const event = new CustomEvent('sync-event');
      event.chartId = chart.id;
      event.syncGroup = syncGroup;
      event.original = e;
      event.xValue = xScale.getValueForPixel(e.x);
      window.dispatchEvent(event);
    }

    const suppressTooltips = this.getOption(chart, 'sync', 'suppressTooltips');

    chart.crosshair.suppressTooltips = e.stop && suppressTooltips;

    chart.crosshair.enabled = (e.type !== 'mouseout' && (e.x > xScale.getPixelForValue(xScale.min) && e.x < xScale.getPixelForValue(xScale.max)));

    if (!chart.crosshair.enabled && !chart.crosshair.suppressUpdate) {
      if (e.x > xScale.getPixelForValue(xScale.max)) {
        chart.crosshair.suppressUpdate = true;
        chart.update('none');
      }
      chart.crosshair.dragStarted = false;
      return false;
    }
    chart.crosshair.suppressUpdate = false;

    const zoomEnabled = this.getOption(chart, 'zoom', 'enabled');

    if (buttons === 1 && !chart.crosshair.dragStarted && zoomEnabled) {
      chart.crosshair.dragStartX = e.x;
      chart.crosshair.dragStarted = true;
    }

    if (chart.crosshair.dragStarted && buttons === 0) {
      chart.crosshair.dragStarted = false;

      const start = xScale.getValueForPixel(chart.crosshair.dragStartX!);
      const end = xScale.getValueForPixel(chart.crosshair.x!);

      if (Math.abs(chart.crosshair.dragStartX! - chart.crosshair.x!) > 1) {
        this.doZoom(chart, start, end);
      }
      chart.update('none');
    }

    chart.crosshair.x = e.x;

    chart.draw();
  },

  afterDraw: function(chart: ChartWithCrosshair) {
    if (!chart.crosshair.enabled) {
      return;
    }

    if (chart.crosshair.dragStarted) {
      this.drawZoombox(chart);
    } else {
      this.drawTraceLine(chart);
      this.interpolateValues(chart);
      this.drawTracePoints(chart);
    }

    return true;
  },

  beforeTooltipDraw: function(chart: ChartWithCrosshair) {
    return !chart.crosshair.dragStarted && !chart.crosshair.suppressTooltips;
  },

  resetZoom: function(chart: ChartWithCrosshair, stop: boolean = false, update: boolean = true) {
    if (update) {
      if (chart.crosshair.originalData.length > 0) {
        for (let datasetIndex = 0; datasetIndex < chart.data.datasets.length; datasetIndex++) {
          const dataset = chart.data.datasets[datasetIndex];
          dataset.data = chart.crosshair.originalData.shift(0);
        }
      }

      if (chart.crosshair.originalXRange.min) {
        chart.options.scales.x.min = chart.crosshair.originalXRange.min;
        chart.crosshair.originalXRange.min = null;
      } else {
        delete chart.options.scales.x.min;
      }
      if (chart.crosshair.originalXRange.max) {
        chart.options.scales.x.max = chart.crosshair.originalXRange.max;
        chart.crosshair.originalXRange.max = null;
      } else {
        delete chart.options.scales.x.max;
      }
    }

    if (chart.crosshair.button && chart.crosshair.button.parentNode) {
      chart.crosshair.button.parentNode.removeChild(chart.crosshair.button);
      chart.crosshair.button = false;
    }

    const syncEnabled = this.getOption(chart, 'sync', 'enabled');

    if (!stop && update && syncEnabled) {
      const syncGroup = this.getOption(chart, 'sync', 'group');

      const event = new CustomEvent('reset-zoom-event');
      event.chartId = chart.id;
      event.syncGroup = syncGroup;
      window.dispatchEvent(event);
    }
    if (update) {
      chart.update('none');
    }
  },

  doZoom: function(chart: ChartWithCrosshair, start: number, end: number) {
    if (start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }

    const beforeZoomCallback = valueOrDefault(chart.options.plugins.crosshair.callbacks ? chart.options.plugins.crosshair.callbacks.beforeZoom : undefined, defaultOptions.callbacks.beforeZoom);

    if (!beforeZoomCallback(start, end)) {
      return false;
    }

    chart.crosshair.dragStarted = false;

    if (chart.options.scales.x.min && chart.crosshair.originalData.length === 0) {
      chart.crosshair.originalXRange.min = chart.options.scales.x.min;
    }
    if (chart.options.scales.x.max && chart.crosshair.originalData.length === 0) {
      chart.crosshair.originalXRange.max = chart.options.scales.x.max;
    }

    if (!chart.crosshair.button) {
      const button = document.createElement('button');

      const buttonText = this.getOption(chart, 'zoom', 'zoomButtonText');
      const buttonClass = this.getOption(chart, 'zoom', 'zoomButtonClass');

      const buttonLabel = document.createTextNode(buttonText);
      button.appendChild(buttonLabel);
      button.className = buttonClass;
      button.addEventListener('click', function() {
        this.resetZoom(chart);
      }.bind(this));
      chart.canvas.parentNode.appendChild(button);
      chart.crosshair.button = button;
    }

    chart.options.scales.x.min = start;
    chart.options.scales.x.max = end;

    const storeOriginals = (chart.crosshair.originalData.length === 0) ? true : false;

    const filterDataset = (chart.config.options.scales.x.type !== 'category');

    if (filterDataset) {
      for (let datasetIndex = 0; datasetIndex < chart.data.datasets.length; datasetIndex++) {
        const newData: any[] = [];

        let index = 0;
        let started = false;
        let stop = false;
        if (storeOriginals) {
          chart.crosshair.originalData[datasetIndex] = chart.data.datasets[datasetIndex].data;
        }

        const sourceDataset = chart.crosshair.originalData[datasetIndex];

        for (let oldDataIndex = 0; oldDataIndex < sourceDataset.length; oldDataIndex++) {
          const oldData = sourceDataset[oldDataIndex];
          const oldDataX = oldData.x !== undefined ? oldData.x : NaN;

          if (oldDataX >= start && !started && index > 0) {
            newData.push(sourceDataset[index - 1]);
            started = true;
          }
          if (oldDataX >= start && oldDataX <= end) {
            newData.push(oldData);
          }
          if (oldDataX > end && !stop && index < sourceDataset.length) {
            newData.push(oldData);
            stop = true;
          }
          index += 1;
        }

        chart.data.datasets[datasetIndex].data = newData;
      }
    }

    chart.crosshair.start = start;
    chart.crosshair.end = end;

    if (storeOriginals) {
      const xAxes = this.getXScale(chart);
      chart.crosshair.min = xAxes.min;
      chart.crosshair.max = xAxes.max;
    }

    chart.crosshair.ignoreNextEvents = 2;

    chart.update('none');

    const afterZoomCallback = this.getOption(chart, 'callbacks', 'afterZoom');

    afterZoomCallback(start, end);
  },

  drawZoombox: function(chart: ChartWithCrosshair) {
    const yScale = this.getYScale(chart);

    const borderColor = this.getOption(chart, 'zoom', 'zoomboxBorderColor');
    const fillColor = this.getOption(chart, 'zoom', 'zoomboxBackgroundColor');

    chart.ctx.beginPath();
    chart.ctx.rect(chart.crosshair.dragStartX!, yScale.getPixelForValue(yScale.max), chart.crosshair.x! - chart.crosshair.dragStartX!, yScale.getPixelForValue(yScale.min) - yScale.getPixelForValue(yScale.max));
    chart.ctx.lineWidth = 1;
    chart.ctx.strokeStyle = borderColor;
    chart.ctx.fillStyle = fillColor;
    chart.ctx.fill();
    chart.ctx.fillStyle = '';
    chart.ctx.stroke();
    chart.ctx.closePath();
  },

  drawTraceLine: function(chart: ChartWithCrosshair) {
    const yScale = this.getYScale(chart);

    const lineWidth = this.getOption(chart, 'line', 'width');
    const color = this.getOption(chart, 'line', 'color');
    const dashPattern = this.getOption(chart, 'line', 'dashPattern');
    const snapEnabled = this.getOption(chart, 'snap', 'enabled');

    let lineX = chart.crosshair.x!;

    if (snapEnabled && chart._active.length) {
      lineX = chart._active[0].element.x;
    }

    chart.ctx.beginPath();
    chart.ctx.setLineDash(dashPattern);
    chart.ctx.moveTo(lineX, yScale.getPixelForValue(yScale.max));
    chart.ctx.lineWidth = lineWidth;
    chart.ctx.strokeStyle = color;
    chart.ctx.lineTo(lineX, yScale.getPixelForValue(yScale.min));
    chart.ctx.stroke();
    chart.ctx.setLineDash([]);
  },

  drawTracePoints: function(chart: ChartWithCrosshair) {
    for (let chartIndex = 0; chartIndex < chart.data.datasets.length; chartIndex++) {
      const dataset = chart.data.datasets[chartIndex];
      const meta = chart.getDatasetMeta(chartIndex);

      const yScale = chart.scales[meta.yAxisID];

      if (meta.hidden || !dataset.interpolate) {
        continue;
      }

      chart.ctx.beginPath();
      chart.ctx.arc(chart.crosshair.x!, yScale.getPixelForValue(dataset.interpolatedValue), 3, 0, 2 * Math.PI, false);
      chart.ctx.fillStyle = 'white';
      chart.ctx.lineWidth = 2;
      chart.ctx.strokeStyle = dataset.borderColor;
      chart.ctx.fill();
      chart.ctx.stroke();
    }
  },

  interpolateValues: function(chart: ChartWithCrosshair) {
    for (let chartIndex = 0; chartIndex < chart.data.datasets.length; chartIndex++) {
      const dataset = chart.data.datasets[chartIndex];
      const meta = chart.getDatasetMeta(chartIndex);

      const xScale = chart.scales[meta.xAxisID];
      const xValue = xScale.getValueForPixel(chart.crosshair.x!);

      if (meta.hidden || !dataset.interpolate) {
        continue;
      }

      const data = dataset.data;
      const index = data.findIndex((o: any) => o.x >= xValue);
      const prev = data[index - 1];
      const next = data[index];

      if (chart.data.datasets[chartIndex].steppedLine && prev) {
        dataset.interpolatedValue = prev.y;
      } else if (prev && next) {
        const slope = (next.y - prev.y) / (next.x - prev.x);
        dataset.interpolatedValue = prev.y + (xValue - prev.x) * slope;
      } else {
        dataset.interpolatedValue = NaN;
      }
    }
  }
};
