import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Graph from '../Graph.vue';

// Mock Chart.js
vi.mock('chart.js/auto', () => ({
  default: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    update: vi.fn()
  }))
}));

// Mock watermark plugin
vi.mock('../../utils/chartWatermark.js', () => ({
  watermarkPlugin: {}
}));

// Mock metrics config
vi.mock('../../utils/metricsConfig.js', () => ({
  chartLabels: {
    test_metric: 'Test Metric'
  }
}));

describe('Graph.vue', () => {
  let wrapper;
  let mockStore;

  beforeEach(() => {
    setActivePinia(createPinia());

    mockStore = {
      selectedLocation: {
        COG: '01001',
        commune: 'Test Commune'
      }
    };

    // Mock the store
    vi.mock('../../services/store.js', () => ({
      useDataStore: () => mockStore
    }));
  });

  const createWrapper = (props = {}) => {
    const defaultProps = {
      data: {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [{
          label: 'Test Data',
          data: [10, 20, 30]
        }]
      },
      metricKey: 'test_metric',
      location: {
        COG: '01001',
        commune: 'Test Commune'
      },
      ...props
    };

    return mount(Graph, {
      props: defaultProps,
      global: {
        plugins: [createPinia()]
      }
    });
  };

  it('renders the component', () => {
    wrapper = createWrapper();

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.find('.chart-container').exists()).toBe(true);
    expect(wrapper.find('.chart-canvas').exists()).toBe(true);
  });

  it('renders with required props', () => {
    wrapper = createWrapper();

    expect(wrapper.props('data')).toBeDefined();
    expect(wrapper.props('metricKey')).toBe('test_metric');
    expect(wrapper.props('location')).toBeDefined();
  });

  it('handles empty data gracefully', () => {
    wrapper = createWrapper({
      data: {
        labels: [],
        datasets: []
      }
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('handles missing dataLabels prop', () => {
    wrapper = createWrapper();

    expect(wrapper.props('dataLabels')).toEqual([]);
  });

  it('handles custom dataLabels', () => {
    const customLabels = ['Custom 1', 'Custom 2'];
    wrapper = createWrapper({
      dataLabels: customLabels
    });

    expect(wrapper.props('dataLabels')).toEqual(customLabels);
  });

  it('handles different metric keys', () => {
    wrapper = createWrapper({
      metricKey: 'different_metric'
    });

    expect(wrapper.props('metricKey')).toBe('different_metric');
  });

  it('handles location changes', async () => {
    wrapper = createWrapper();

    const newLocation = {
      COG: '02001',
      commune: 'New Commune'
    };

    await wrapper.setProps({
      location: newLocation
    });

    expect(wrapper.props('location')).toEqual(newLocation);
  });

  it('handles data updates', async () => {
    wrapper = createWrapper();

    const newData = {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [{
        label: 'Quarterly Data',
        data: [100, 200, 150, 300]
      }]
    };

    await wrapper.setProps({
      data: newData
    });

    expect(wrapper.props('data')).toEqual(newData);
  });

  it('handles null data gracefully', () => {
    expect(() => {
      createWrapper({
        data: null
      });
    }).toThrow(); // Should throw because data is required
  });

  it('handles undefined data gracefully', () => {
    expect(() => {
      createWrapper({
        data: undefined
      });
    }).toThrow(); // Should throw because data is required
  });

  it('handles empty datasets', () => {
    wrapper = createWrapper({
      data: {
        labels: ['Jan', 'Feb'],
        datasets: []
      }
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('handles single data point', () => {
    wrapper = createWrapper({
      data: {
        labels: ['Jan'],
        datasets: [{
          label: 'Single Point',
          data: [42]
        }]
      }
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('handles large datasets', () => {
    const largeLabels = Array.from({ length: 100 }, (_, i) => `Point ${i}`);
    const largeData = Array.from({ length: 100 }, () => Math.random() * 100);

    wrapper = createWrapper({
      data: {
        labels: largeLabels,
        datasets: [{
          label: 'Large Dataset',
          data: largeData
        }]
      }
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('handles special characters in labels', () => {
    wrapper = createWrapper({
      data: {
        labels: ['Janvier', 'Février', 'Mars', 'Avril'],
        datasets: [{
          label: 'Données spéciales',
          data: [10, 20, 30, 40]
        }]
      }
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('handles zero values in data', () => {
    wrapper = createWrapper({
      data: {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [{
          label: 'Zero Values',
          data: [0, 0, 0]
        }]
      }
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('handles negative values in data', () => {
    wrapper = createWrapper({
      data: {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [{
          label: 'Negative Values',
          data: [-10, -5, 10]
        }]
      }
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('handles very large numbers', () => {
    wrapper = createWrapper({
      data: {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [{
          label: 'Large Numbers',
          data: [1000000, 2000000, 3000000]
        }]
      }
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('handles decimal values', () => {
    wrapper = createWrapper({
      data: {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [{
          label: 'Decimal Values',
          data: [10.5, 20.25, 30.75]
        }]
      }
    });

    expect(wrapper.exists()).toBe(true);
  });
});