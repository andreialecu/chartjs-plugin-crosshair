import { Chart, Interaction } from 'chart.js';
import { Interpolate } from './interpolate';
import { CrosshairPlugin } from './trace';

Chart.register(CrosshairPlugin);
Interaction.modes.interpolate = Interpolate;

export { CrosshairPlugin, Interpolate };
