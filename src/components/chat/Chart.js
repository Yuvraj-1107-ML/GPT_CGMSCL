import React, { useEffect, useRef } from 'react';
import { convertVisualizationToECharts } from '../../utils/visualizationUtils';

/**
 * Chart Component
 * Renders charts based on visualization config from API
 */
function Chart({ visualization, data }) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    if (!visualization || !data) return;

    let checkEChartsInterval;
    let resizeHandler;

    const renderChart = () => {
      if (!chartRef.current) return;

      try {
        // Convert visualization config to ECharts config
        const echartsConfig = convertVisualizationToECharts(visualization, data);
        
        if (!echartsConfig) {
          console.warn('Failed to convert visualization to ECharts config');
          return;
        }

        // Dispose existing chart instance if any
        if (chartInstanceRef.current) {
          chartInstanceRef.current.dispose();
        }

        // Initialize new chart
        chartInstanceRef.current = window.echarts.init(chartRef.current);
        chartInstanceRef.current.setOption(echartsConfig, true);

        // Handle window resize
        resizeHandler = () => {
          if (chartInstanceRef.current) {
            chartInstanceRef.current.resize();
          }
        };

        window.addEventListener('resize', resizeHandler);
      } catch (error) {
        console.error('Error rendering chart:', error);
      }
    };

    // Wait for ECharts to load
    checkEChartsInterval = setInterval(() => {
      if (typeof window.echarts !== 'undefined') {
        clearInterval(checkEChartsInterval);
        renderChart();
      }
    }, 100);

    // Cleanup on unmount
    return () => {
      if (checkEChartsInterval) {
        clearInterval(checkEChartsInterval);
      }
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, [visualization, data]);

  if (!visualization || !data) {
    return null;
  }

  return (
    <div className="chart-container" style={{
      width: '100%',
      height: '400px',
      margin: '15px 0',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '10px',
      backgroundColor: '#fff'
    }}>
      <div 
        ref={chartRef}
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
}

export default Chart;
