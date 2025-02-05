import { Interaction, Chart } from 'chart.js';

interface ChartPoint {
  x: number;
  y: number;
}

interface FakePoint {
  hasValue: () => boolean;
  tooltipPosition: () => { x: number; y: number };
  _model: { x: number; y: number };
  skip: boolean;
  stop: boolean;
  x: number;
  y: number;
}

export function Interpolate(chart: Chart, e: { x: number; y: number }, options: any) {
  const items: { datasetIndex: number; element: FakePoint; index: number }[] = [];

  for (let datasetIndex = 0; datasetIndex < chart.data.datasets.length; datasetIndex++) {
    if (!chart.data.datasets[datasetIndex].interpolate) {
      continue;
    }

    const meta = chart.getDatasetMeta(datasetIndex);
    if (meta.hidden) {
      continue;
    }

    const xScale = chart.scales[meta.xAxisID];
    const yScale = chart.scales[meta.yAxisID];

    const xValue = xScale.getValueForPixel(e.x);

    if (xValue > xScale.max || xValue < xScale.min) {
      continue;
    }

    const data = chart.data.datasets[datasetIndex].data as ChartPoint[];

    const index = data.findIndex((o) => o.x >= xValue);

    if (index === -1) {
      continue;
    }

    const prev = data[index - 1];
    const next = data[index];

    let interpolatedValue: number | undefined;
    if (prev && next) {
      const slope = (next.y - prev.y) / (next.x - prev.x);
      interpolatedValue = prev.y + (xValue - prev.x) * slope;
    }

    if (chart.data.datasets[datasetIndex].steppedLine && prev) {
      interpolatedValue = prev.y;
    }

    if (interpolatedValue === undefined || isNaN(interpolatedValue)) {
      continue;
    }

    const yPosition = yScale.getPixelForValue(interpolatedValue);

    if (isNaN(yPosition)) {
      continue;
    }

    const fakePoint: FakePoint = {
      hasValue: function() {
        return true;
      },
      tooltipPosition: function() {
        return this._model;
      },
      _model: { x: e.x, y: yPosition },
      skip: false,
      stop: false,
      x: xValue,
      y: interpolatedValue
    };

    items.push({ datasetIndex: datasetIndex, element: fakePoint, index: 0 });
  }

  const xItems = Interaction.modes.x(chart, e, options);
  for (let index = 0; index < xItems.length; index++) {
    const item = xItems[index];
    if (!chart.data.datasets[item.datasetIndex].interpolate) {
      items.push(item);
    }
  }

  return items;
}
