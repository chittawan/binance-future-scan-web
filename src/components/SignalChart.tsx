import React, { useEffect, useRef, useState } from 'react';
import { signalService, configService } from '../services/api';

interface SignalChartProps {
  symbol: string;
  interval?: string;
  onClose?: () => void;
  symbolList?: string[]; // List of symbols for navigation
  onSymbolChange?: (symbol: string) => void; // Callback when symbol changes
  trend?: string; // Trend from ScanSignalPage (Bullish/Bearish/Neutral)
}

interface CandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
  signal?: string;
  resultSignal?: string;
  sigLabel?: string; // L or S label from TradingView logic
}

const SignalChart: React.FC<SignalChartProps> = ({ symbol, interval = '1h', onClose, symbolList = [], onSymbolChange, trend }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [currentSymbol, setCurrentSymbol] = useState<string>(symbol);
  const [editingSymbol, setEditingSymbol] = useState<string>(symbol);
  const [isEditingSymbol, setIsEditingSymbol] = useState<boolean>(false);
  const [showMA, setShowMA] = useState<boolean>(true);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isAddingSymbol, setIsAddingSymbol] = useState<boolean>(false);
  const [addSymbolMessage, setAddSymbolMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [symbolAdded, setSymbolAdded] = useState<boolean>(false);
  const [configSymbols, setConfigSymbols] = useState<string[]>([]);

  // Load config symbols to check if current symbol is in SIGNAL_SYMBOL
  useEffect(() => {
    const loadConfigSymbols = async () => {
      try {
        const currentConfig = await configService.getConfig();
        const symbols = Array.isArray(currentConfig.SIGNAL_SYMBOL)
          ? currentConfig.SIGNAL_SYMBOL
          : currentConfig.SIGNAL_SYMBOL
            ? [currentConfig.SIGNAL_SYMBOL]
            : [];
        setConfigSymbols(symbols);
      } catch (error) {
        console.error('Failed to load config symbols:', error);
        setConfigSymbols([]);
      }
    };
    loadConfigSymbols();
  }, [currentSymbol]); // Reload when symbol changes

  // Update currentSymbol when prop changes
  useEffect(() => {
    setCurrentSymbol(symbol);
    setEditingSymbol(symbol);
    setSymbolAdded(false); // Reset symbolAdded when symbol changes
  }, [symbol]);

  useEffect(() => {
    loadData();
  }, [currentSymbol, interval]);

  // Handle keyboard navigation (ESC, Arrow keys)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
        return;
      }

      // Left/Right arrows: navigate through candles
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        if (!data || !data.open || data.open.length === 0) return;

        event.preventDefault();
        const totalCandles = data.open.length;

        if (event.key === 'ArrowLeft') {
          // Move to previous candle
          if (selectedIndex === null) {
            // If nothing selected, select the last candle
            setSelectedIndex(totalCandles - 1);
          } else if (selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1);
          }
        } else if (event.key === 'ArrowRight') {
          // Move to next candle
          if (selectedIndex === null) {
            // If nothing selected, select the first candle
            setSelectedIndex(0);
          } else if (selectedIndex < totalCandles - 1) {
            setSelectedIndex(selectedIndex + 1);
          }
        }
        return;
      }

      // Up/Down arrows: navigate between symbols (if symbol list exists)
      if (symbolList.length === 0) return;

      const currentIndex = symbolList.indexOf(currentSymbol);
      if (currentIndex === -1) return;

      let newIndex = currentIndex;

      // Up = previous symbol (wrap to last if at first)
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        newIndex = currentIndex === 0 ? symbolList.length - 1 : currentIndex - 1;
      }
      // Down = next symbol (wrap to first if at last)
      else if (event.key === 'ArrowDown') {
        event.preventDefault();
        newIndex = currentIndex === symbolList.length - 1 ? 0 : currentIndex + 1;
      }

      if (newIndex !== currentIndex && symbolList[newIndex]) {
        const newSymbol = symbolList[newIndex];
        setCurrentSymbol(newSymbol);
        onSymbolChange?.(newSymbol);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSymbol, symbolList, onClose, onSymbolChange, data, selectedIndex]);

  useEffect(() => {
    if (data && canvasRef.current) {
      // Set canvas size based on container
      const canvas = canvasRef.current;
      const container = canvas.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        const isMobile = window.innerWidth < 768;
        // On mobile, use full width with minimal padding, smaller height
        const maxWidth = isMobile ? rect.width - 16 : Math.min(1200, rect.width - 32);
        const aspectRatio = isMobile ? 0.5 : 600 / 1200; // Taller on mobile for better visibility
        canvas.width = maxWidth;
        canvas.height = Math.min(isMobile ? 400 : 600, maxWidth * aspectRatio);
      }
      drawChart();
    }
  }, [data, selectedIndex, showMA]);

  useEffect(() => {
    const handleResize = () => {
      if (data && canvasRef.current) {
        const canvas = canvasRef.current;
        const container = canvas.parentElement;
        if (container) {
          const rect = container.getBoundingClientRect();
          const isMobile = window.innerWidth < 768;
          const maxWidth = isMobile ? rect.width - 16 : Math.min(1200, rect.width - 32);
          const aspectRatio = isMobile ? 0.5 : 600 / 1200;
          canvas.width = maxWidth;
          canvas.height = Math.min(isMobile ? 400 : 600, maxWidth * aspectRatio);
        }
        drawChart();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await signalService.getCandles({ symbol: currentSymbol, interval, isDebug: true });
      setData(response);
    } catch (err: any) {
      console.error('Failed to load signal data:', err);
      setError(err.response?.data?.error || 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive padding for mobile (iPhone)
    const isMobile = window.innerWidth < 768;
    const padding = isMobile
      ? { top: 40, right: 50, bottom: 50, left: 40 }  // Smaller padding on mobile
      : { top: 60, right: 100, bottom: 80, left: 80 }; // Desktop padding
    const width = canvas.width;
    const height = canvas.height;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas with Binance dark theme
    ctx.fillStyle = '#0B0E11'; // binance-dark
    ctx.fillRect(0, 0, width, height);

    const candles: CandleData[] = data.open.map((_: any, i: number) => ({
      open: data.open[i],
      high: data.high[i],
      low: data.low[i],
      close: data.close[i],
      timestamp: data.timestamp[i],
      signal: data.signals[i],
      //resultSignal: data.result_signals[i],
      sigLabel: data.sig_labels ? data.sig_labels[i] : (data.result_signals[i] === 'LONG' ? 'L' : data.result_signals[i] === 'SHORT' ? 'S' : ''), // Use sig_labels from backend if available
    }));

    if (candles.length === 0) return;

    // Find min/max for scaling - use only high values for max, but include low for min
    const highValues = candles.map(c => c.high);
    const lowValues = candles.map(c => c.low);
    const minPrice = Math.min(...lowValues);
    const maxPrice = Math.max(...highValues); // Use only high for max
    const priceRange = maxPrice - minPrice || 1;
    const pricePadding = priceRange * 0.1;

    const minPriceScaled = minPrice - pricePadding;
    const maxPriceScaled = maxPrice + pricePadding;
    const scaledRange = maxPriceScaled - minPriceScaled;

    // Calculate candle width
    const candleWidth = chartWidth / candles.length;
    const optimalCandleWidth = Math.min(candleWidth * 0.7, 20);

    // Draw grid lines with Binance theme colors
    ctx.strokeStyle = '#2B3139'; // binance-gray-light
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Price labels with Binance text color (right side)
      const price = maxPriceScaled - (scaledRange / 5) * i;
      ctx.fillStyle = '#848E9C'; // binance-text-secondary
      ctx.font = isMobile ? '10px monospace' : '12px monospace';
      ctx.textAlign = 'left';
      // Adjust price precision for mobile (fewer decimals)
      const priceStr = isMobile ? price.toFixed(4) : price.toFixed(6);
      ctx.fillText(priceStr, width - padding.right + 8, y + 4);
    }

    // Draw time labels with Binance theme (TradingView Expert style)
    ctx.fillStyle = '#848E9C'; // binance-text-secondary
    ctx.font = isMobile ? '9px monospace' : '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Calculate optimal number of time labels based on chart width (TradingView style)
    // Fewer labels on mobile for better readability
    const minLabelWidth = isMobile ? 50 : 60; // Minimum width per label in pixels
    const maxLabels = Math.floor(chartWidth / minLabelWidth);
    const timeStep = Math.max(1, Math.floor(candles.length / maxLabels));

    // Draw time labels with proper spacing
    for (let i = 0; i < candles.length; i += timeStep) {
      const x = padding.left + (i / candles.length) * chartWidth;
      const date = new Date(candles[i].timestamp);
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      // Draw background for better readability (TradingView style)
      const textWidth = ctx.measureText(timeStr).width;
      const bgWidth = textWidth + (isMobile ? 6 : 8);
      const bgHeight = isMobile ? 14 : 16;
      const bgX = x - bgWidth / 2;
      const bgY = height - padding.bottom + (isMobile ? 3 : 5);

      ctx.fillStyle = '#0B0E11'; // Dark background
      ctx.fillRect(bgX, bgY, bgWidth, bgHeight);

      // Draw time text
      ctx.fillStyle = '#848E9C'; // binance-text-secondary
      ctx.fillText(timeStr, x, bgY + 2);
    }

    // Signal color mapping (TradingView script colors - line 77)
    // bColor = Green ? #3fff00 : Blue ? color.blue : LBlue ? color.aqua : Red ? #fb0707 : Orange ? color.orange : Yellow ? color.yellow : color.black
    // TradingView standard colors:
    // - color.blue = #2962FF (TradingView standard blue)
    // - color.aqua = #00BCD4 (TradingView standard aqua/cyan)
    // - color.orange = #FF9800 (TradingView standard orange)
    // - color.yellow = #FFEB3B (TradingView standard yellow)
    const getSignalColor = (signal: string, isBullish: boolean): { body: string; wick: string } => {
      const signalColors: Record<string, { body: string; wick: string }> = {
        // Exact colors from TradingView script line 77
        'GreenOnly': { body: '#3fff00', wick: '#3fff00' },      // Green: #3fff00 (exact from script)
        'Blue': { body: '#2962FF', wick: '#2962FF' },           // Blue: color.blue = #2962FF (TradingView standard)
        'LBlue': { body: '#00BCD4', wick: '#00BCD4' },         // LBlue: color.aqua = #00BCD4 (TradingView standard aqua)
        'Red': { body: '#fb0707', wick: '#fb0707' },           // Red: #fb0707 (exact from script)
        'Orange': { body: '#FF9800', wick: '#FF9800' },        // Orange: color.orange = #FF9800 (TradingView standard)
        'Yellow': { body: '#FFEB3B', wick: '#FFEB3B' },        // Yellow: color.yellow = #FFEB3B (TradingView standard)
        'GreenRed': { body: '#90EE90', wick: '#90EE90' },     // GreenRed: light green (used in conditions, not in bColor)
        'NOW': { body: '#FFEB3B', wick: '#FFEB3B' },           // NOW: use yellow as default
      };

      if (signal && signal !== 'None' && signal !== 'NONE' && signalColors[signal]) {
        return signalColors[signal];
      }

      // Default: green for bullish, red for bearish (TradingView default)
      return isBullish
        ? { body: '#3fff00', wick: '#3fff00' }  // Use TradingView green (#3fff00)
        : { body: '#fb0707', wick: '#fb0707' }; // Use TradingView red (#fb0707)
    };

    // Enable anti-aliasing for smoother rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw EMA lines from API data
    if (showMA) {
      const ema7 = data.original_ema_7 || [];
      const ema25 = data.original_ema_25 || [];
      const ema50 = data.original_ema_50 || [];

      // Helper function to draw EMA line
      const drawEMALine = (emaData: (number | null)[], color: string, lineWidth: number, isDashed: boolean = false) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash(isDashed ? [5, 5] : []);
        ctx.beginPath();

        let firstPoint = true;
        for (let i = 0; i < emaData.length; i++) {
          const value = emaData[i];
          if (value === null || value === undefined) continue;

          const x = padding.left + (i / candles.length) * chartWidth;
          const y = padding.top + chartHeight - ((value - minPriceScaled) / scaledRange) * chartHeight;

          if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
          } else {
            // Use quadratic curve for smoother lines
            const prevValue = emaData[i - 1];
            if (prevValue !== null && prevValue !== undefined) {
              const prevX = padding.left + ((i - 1) / candles.length) * chartWidth;
              const prevY = padding.top + chartHeight - ((prevValue - minPriceScaled) / scaledRange) * chartHeight;
              const midX = (prevX + x) / 2;
              const midY = (prevY + y) / 2;
              ctx.quadraticCurveTo(prevX, prevY, midX, midY);
            }
          }
        }
        ctx.stroke();
      };

      // Draw EMA 7 (fast, blue)
      if (ema7.length > 0) {
        drawEMALine(ema7, '#2962FF', 2);
      }

      // Draw EMA 25 (medium, gold)
      if (ema25.length > 0) {
        drawEMALine(ema25, '#F0B90B', 2);
      }

      // Draw EMA 50 (slow, red) - dashed line
      if (ema50.length > 0) {
        drawEMALine(ema50, '#FF3333', 2, true);
      }
    }

    // Draw close price line for smoother visualization
    if (candles.length > 1) {
      ctx.strokeStyle = 'rgba(234, 236, 239, 0.3)';
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();

      for (let i = 0; i < candles.length; i++) {
        const x = padding.left + (i / candles.length) * chartWidth;
        const y = padding.top + chartHeight - ((candles[i].close - minPriceScaled) / scaledRange) * chartHeight;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = padding.left + ((i - 1) / candles.length) * chartWidth;
          const prevY = padding.top + chartHeight - ((candles[i - 1].close - minPriceScaled) / scaledRange) * chartHeight;
          const midX = (prevX + x) / 2;
          const midY = (prevY + y) / 2;
          ctx.quadraticCurveTo(prevX, prevY, midX, midY);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw candlesticks with signal-based coloring
    candles.forEach((candle, index) => {
      const x = padding.left + (index / candles.length) * chartWidth;
      const isBullish = candle.close >= candle.open;
      const openY = padding.top + chartHeight - ((candle.open - minPriceScaled) / scaledRange) * chartHeight;
      const closeY = padding.top + chartHeight - ((candle.close - minPriceScaled) / scaledRange) * chartHeight;
      const highY = padding.top + chartHeight - ((candle.high - minPriceScaled) / scaledRange) * chartHeight;
      const lowY = padding.top + chartHeight - ((candle.low - minPriceScaled) / scaledRange) * chartHeight;

      // Use sub-pixel positioning for smoother rendering
      const candleX = Math.round(x - optimalCandleWidth / 2) + 0.5;
      const bodyTop = Math.round(Math.min(openY, closeY)) + 0.5;
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));

      // Get colors based on signal
      const colors = getSignalColor(candle.signal || '', isBullish);

      // Draw wick with signal color (smooth rendering)
      //ctx.strokeStyle = colors.wick;
      ctx.strokeStyle = 'rgba(209, 209, 209, 0.51)';
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      // Use sub-pixel positioning for smoother lines
      const smoothX = Math.round(x) + 0.5;
      ctx.moveTo(smoothX, highY);
      ctx.lineTo(smoothX, lowY);
      ctx.stroke();

      // Draw body with signal color (TradingView style: line 273)
      // color = show_ca_plot ? bColor : (open < close ? color.green : color.red)
      // bordercolor = open < close ? color.green : color.red
      const borderColor = isBullish ? '#0ECB81' : '#F6465D'; // Standard green/red border

      if (candle.signal && candle.signal !== 'None' && candle.signal !== 'NONE') {
        // Signal-based candles: filled with signal color, border is green/red based on open/close
        ctx.fillStyle = colors.body;
        ctx.fillRect(candleX, bodyTop, optimalCandleWidth, bodyHeight);

        // Border color based on open/close (TradingView bordercolor)
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(candleX, bodyTop, optimalCandleWidth, bodyHeight);
      } else if (candle.signal == "None" || candle.signal == "NONE") {
        // Standard candles: filled or outlined based on open/close
        if (isBullish) {
          ctx.strokeStyle = "#555555";
          ctx.fillStyle = "#555555";
          ctx.fillRect(candleX, bodyTop, optimalCandleWidth, bodyHeight);
        } else {
          ctx.strokeStyle = "#555555";
          ctx.strokeRect(candleX, bodyTop, optimalCandleWidth, bodyHeight);
          ctx.fillRect(candleX, bodyTop, optimalCandleWidth, bodyHeight);
        }
      } else {
        ctx.strokeStyle = "#555555";
        ctx.fillStyle = "#555555";
        ctx.fillRect(candleX, bodyTop, optimalCandleWidth, bodyHeight);
      }

      // Draw signal indicator as small horizontal line above candle (TradingView style)
      // if (candle.signal && candle.signal !== 'None' && candle.signal !== 'NONE') {
      //   // Match TradingView script colors exactly (line 77)
      //   const signalColors: Record<string, string> = {
      //     'GreenOnly': '#3fff00',    // Green: #3fff00 (exact from script)
      //     'Blue': '#2962FF',         // Blue: color.blue = #2962FF (TradingView standard)
      //     'LBlue': '#00BCD4',        // LBlue: color.aqua = #00BCD4 (TradingView standard aqua)
      //     'Red': '#fb0707',          // Red: #fb0707 (exact from script)
      //     'Orange': '#FF9800',       // Orange: color.orange = #FF9800 (TradingView standard)
      //     'Yellow': '#FFEB3B',       // Yellow: color.yellow = #FFEB3B (TradingView standard)
      //     'GreenRed': '#90EE90',     // GreenRed: light green (used in conditions)
      //     'None': '#000000',          // NONE: yellow
      //   };
      // 
      //   const signalColor = signalColors[candle.signal] || '#000000';
      //   ctx.strokeStyle = signalColor;
      //   ctx.lineWidth = 2;
      //   ctx.beginPath();
      //   ctx.moveTo(x - 6, highY - 6);
      //   ctx.lineTo(x + 6, highY - 6);
      //   ctx.stroke();
      // }

      // Draw SigLabel (L/S labels from TradingView logic - lines 249-267)
      // Use sigLabel from backend if available, otherwise fallback to resultSignal
      const labelText = candle.sigLabel || (candle.resultSignal === 'LONG' ? 'L' : candle.resultSignal === 'SHORT' ? 'S' : '');

      if (labelText && (labelText === 'L' || labelText === 'S' || labelText === 'SL')) {
        const signalColor = labelText === 'L' ? '#0ECB81' : '#F6465D'; // Green for L, Red for S/SL

        // Draw box background (TradingView style: label.style_label_up for L, label.style_label_down for S)
        const textWidth = ctx.measureText(labelText).width;
        const boxWidth = textWidth + 6;
        const boxHeight = 14;
        const boxX = x - boxWidth / 2;

        // Position: L below candle (label_up), S above candle (label_down) - TradingView style
        const boxY = labelText === 'L' ? lowY + 8 : highY - 22;

        ctx.fillStyle = signalColor;
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        // Draw text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = isMobile ? 'bold 9px sans-serif' : 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, x, boxY + boxHeight / 2);
      }
    });

    // Draw current signal info with Binance theme
    if (data.sig) {
      ctx.fillStyle = '#EAECEF'; // binance-text
      ctx.font = isMobile ? 'bold 11px sans-serif' : 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      // Shorter text on mobile
      const signalText = isMobile
        ? `${data.sig.position} | ${data.sig.trend}`
        : `Signal: ${data.sig.candle} | Trend: ${data.sig.trend} | Position: ${data.sig.position}`;
      ctx.fillText(signalText, padding.left, isMobile ? 20 : 30);
    }

    // Draw vertical dashed line and time label for selected candle
    if (selectedIndex !== null && selectedIndex >= 0 && selectedIndex < candles.length) {
      const selectedX = padding.left + (selectedIndex / candles.length) * chartWidth;

      // Draw vertical dashed line
      ctx.strokeStyle = 'rgba(234, 236, 239, 0.8)'; // Light gray/white color
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(selectedX, padding.top);
      ctx.lineTo(selectedX, height - padding.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw time label at bottom
      const selectedDate = new Date(candles[selectedIndex].timestamp);
      const timeStr = `${selectedDate.getHours().toString().padStart(2, '0')}:${selectedDate.getMinutes().toString().padStart(2, '0')}`;

      // Draw background box for time label
      ctx.fillStyle = '#1E2329'; // binance-gray background
      const textWidth = ctx.measureText(timeStr).width;
      const boxWidth = textWidth + 8;
      const boxHeight = 20;
      const boxX = selectedX - boxWidth / 2;
      const boxY = height - padding.bottom + 5;
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

      // Draw time text
      ctx.fillStyle = '#EAECEF'; // binance-text
      ctx.font = isMobile ? '10px monospace' : '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(timeStr, selectedX, boxY + (isMobile ? 2 : 4));
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!data || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isMobile = window.innerWidth < 768;
    const paddingLeft = isMobile ? 40 : 80;
    const paddingRight = isMobile ? 50 : 100;
    const chartWidth = canvas.width - paddingLeft - paddingRight;

    const index = Math.floor(((x - paddingLeft) / chartWidth) * data.open.length);
    if (index >= 0 && index < data.open.length) {
      setSelectedIndex(index === selectedIndex ? null : index);
    }
  };

  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!data || !canvasRef.current) return;

    e.preventDefault(); // Prevent scrolling
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    const x = touch.clientX - rect.left;
    const isMobile = window.innerWidth < 768;
    const paddingLeft = isMobile ? 40 : 80;
    const paddingRight = isMobile ? 50 : 100;
    const chartWidth = canvas.width - paddingLeft - paddingRight;

    const index = Math.floor(((x - paddingLeft) / chartWidth) * data.open.length);
    if (index >= 0 && index < data.open.length) {
      setSelectedIndex(index === selectedIndex ? null : index);
    }
  };

  // Handle touch swipe for symbol navigation (mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (symbolList.length === 0) return;
    // Don't process if touch is on canvas (let canvas handle it)
    const target = e.target as HTMLElement;
    if (target.tagName === 'CANVAS') return;

    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchStartX(touch.clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (symbolList.length === 0 || touchStartY === null || touchStartX === null) {
      setTouchStartY(null);
      setTouchStartX(null);
      return;
    }

    // Don't process if touch is on canvas (let canvas handle it)
    const target = e.target as HTMLElement;
    if (target.tagName === 'CANVAS') {
      setTouchStartY(null);
      setTouchStartX(null);
      return;
    }

    const touch = e.changedTouches[0];
    const touchEndY = touch.clientY;
    const touchEndX = touch.clientX;
    const deltaY = Math.abs(touchStartY - touchEndY);
    const deltaX = touchStartX - touchEndX;
    const minSwipeDistance = 50; // Minimum distance for a swipe

    // Only process if it's a horizontal swipe (deltaX > deltaY) and significant enough
    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > deltaY) {
      const currentIndex = symbolList.indexOf(currentSymbol);
      if (currentIndex === -1) {
        setTouchStartY(null);
        setTouchStartX(null);
        return;
      }

      let newIndex = currentIndex;

      // Swipe left (positive deltaX) = previous symbol
      if (deltaX > 0) {
        newIndex = currentIndex === 0 ? symbolList.length - 1 : currentIndex - 1;
      }
      // Swipe right (negative deltaX) = next symbol
      else {
        newIndex = currentIndex === symbolList.length - 1 ? 0 : currentIndex + 1;
      }

      if (newIndex !== currentIndex && symbolList[newIndex]) {
        const newSymbol = symbolList[newIndex];
        setCurrentSymbol(newSymbol);
        setSelectedIndex(null); // Reset selection when changing symbol
        onSymbolChange?.(newSymbol);
      }
    }

    setTouchStartY(null);
    setTouchStartX(null);
  };

  const handleSymbolKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newSymbol = editingSymbol.trim().toUpperCase();
      if (newSymbol && newSymbol !== currentSymbol) {
        setCurrentSymbol(newSymbol);
        setSelectedIndex(null); // Reset selection when changing symbol
        onSymbolChange?.(newSymbol);
      }
      setIsEditingSymbol(false);
    } else if (e.key === 'Escape') {
      setEditingSymbol(currentSymbol);
      setIsEditingSymbol(false);
    }
  };

  const handleSymbolBlur = () => {
    setEditingSymbol(currentSymbol);
    setIsEditingSymbol(false);
  };

  // Check if current symbol is in the config SIGNAL_SYMBOL (case-insensitive)
  const isSymbolInConfig = configSymbols.length > 0 && configSymbols.some(s => s.toUpperCase() === currentSymbol.toUpperCase());

  // Handle adding symbol to config
  const handleAddSymbol = async () => {
    if (!currentSymbol || isAddingSymbol) return;

    try {
      setIsAddingSymbol(true);
      setAddSymbolMessage(null);

      // Get current config
      const currentConfig = await configService.getConfig();

      // Prepare new SIGNAL_SYMBOL array
      const currentSymbols = Array.isArray(currentConfig.SIGNAL_SYMBOL)
        ? [...currentConfig.SIGNAL_SYMBOL]
        : currentConfig.SIGNAL_SYMBOL
          ? [currentConfig.SIGNAL_SYMBOL]
          : [];

      // Normalize symbol to uppercase
      const normalizedSymbol = currentSymbol.toUpperCase();

      // Add new symbol if not already present (case-insensitive check)
      const symbolExists = currentSymbols.some(s => s.toUpperCase() === normalizedSymbol);
      if (!symbolExists) {
        currentSymbols.push(normalizedSymbol);
      }

      // Update config
      const result = await configService.updateConfig({
        SIGNAL_SYMBOL: currentSymbols,
      });

      if (result.error) {
        setAddSymbolMessage({ type: 'error', text: result.error });
      } else {
        setAddSymbolMessage({ type: 'success', text: `${currentSymbol} added to symbols list` });
        setSymbolAdded(true); // Hide button after successful add
        // Update configSymbols state to reflect the change
        setConfigSymbols(currentSymbols);
        // Update symbolList by calling onSymbolChange to trigger parent update
        // The parent should reload config symbols
        setTimeout(() => {
          setAddSymbolMessage(null);
        }, 3000);
      }
    } catch (error: any) {
      console.error('Failed to add symbol:', error);
      setAddSymbolMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to add symbol to config',
      });
    } finally {
      setIsAddingSymbol(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0B0E11]/80 flex items-center justify-center z-50 p-4">
        <div className="bg-binance-gray border border-binance-gray-border rounded-lg p-8 max-w-4xl w-full">
          <div className="text-center text-binance-text-secondary">Loading chart data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-[#0B0E11]/80 flex items-center justify-center z-50 p-4">
        <div className="bg-binance-gray border border-binance-gray-border rounded-lg p-8 max-w-4xl w-full">
          <div className="text-center text-binance-red mb-4">{error}</div>
          <button onClick={loadData} className="btn-primary mx-auto block">
            Retry
          </button>
          {onClose && (
            <button onClick={onClose} className="btn-secondary mx-auto block mt-2">
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-[#0B0E11]/80 flex items-center justify-center z-50 p-2 sm:p-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="bg-binance-gray border border-binance-gray-border rounded-lg p-3 sm:p-6 max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3">
          <div className="flex-1 min-w-0">
            {isEditingSymbol ? (
              <input
                type="text"
                value={editingSymbol}
                onChange={(e) => setEditingSymbol(e.target.value)}
                onKeyDown={handleSymbolKeyDown}
                onBlur={handleSymbolBlur}
                className="text-xl sm:text-2xl font-bold text-binance-text bg-binance-gray-light border border-binance-gray-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-binance-yellow w-full sm:w-auto"
                autoFocus
              />
            ) : (
              <h2
                className="text-xl sm:text-2xl font-bold text-binance-text cursor-pointer hover:text-binance-yellow transition-colors break-words"
                onClick={() => setIsEditingSymbol(true)}
                title="Click to edit symbol"
              >
                {currentSymbol}
              </h2>
            )}
            <p className="text-xs sm:text-sm text-binance-text-secondary mt-1">Interval: {interval}</p>
            {symbolList.length > 0 && (
              <p className="text-[10px] sm:text-xs text-binance-text-secondary mt-1 break-words">
                <span className="hidden sm:inline">↑↓ change symbol ({symbolList.indexOf(currentSymbol) + 1}/{symbolList.length}) | ←→ navigate</span>
                <span className="sm:hidden">Swipe ←→ change symbol ({symbolList.indexOf(currentSymbol) + 1}/{symbolList.length}) | Tap navigate</span>
              </p>
            )}
            {symbolList.length === 0 && (
              <p className="text-[10px] sm:text-xs text-binance-text-secondary mt-1">
                ←→ to navigate candles
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0 ml-auto sm:ml-0">
            <button
              onClick={() => setShowMA(!showMA)}
              className={`px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded transition-colors ${showMA
                ? 'bg-binance-yellow text-binance-dark hover:bg-yellow-500'
                : 'bg-binance-gray-light text-binance-text hover:bg-binance-gray-border'
                }`}
              title="Toggle EMA lines"
            >
              <span className="hidden sm:inline">Show MA</span>
              <span className="sm:hidden">MA</span>
            </button>
            <button
              onClick={loadData}
              className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-binance-gray-light text-binance-text rounded hover:bg-binance-gray-border transition-colors"
            >
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">↻</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-binance-gray-light text-binance-text rounded hover:bg-binance-gray-border transition-colors"
                title="Close (ESC)"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Signal Info */}
        {data?.sig && (
          <div className="mb-3 sm:mb-4 p-2 sm:p-4 bg-binance-gray-light rounded-lg border border-binance-gray-border relative">
            {/* Add Symbol Button - Binance Theme - Top Right */}
            {!isSymbolInConfig && !symbolAdded && (
              <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex flex-col items-end gap-2 z-10">
                <button
                  onClick={handleAddSymbol}
                  disabled={isAddingSymbol}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${isAddingSymbol
                    ? 'bg-binance-yellow/70 text-binance-dark cursor-wait'
                    : 'bg-binance-yellow text-binance-dark hover:bg-yellow-500 active:bg-yellow-600'
                    }`}
                >
                  {isAddingSymbol ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 border-2 border-binance-dark border-t-transparent rounded-full animate-spin"></span>
                      <span className="hidden sm:inline">Adding...</span>
                      <span className="sm:hidden">...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 3V11M3 7H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <span className="hidden sm:inline">Add to Symbols</span>
                      <span className="sm:hidden">Add</span>
                    </span>
                  )}
                </button>
                {addSymbolMessage && (
                  <div
                    className={`text-[10px] sm:text-xs px-2 py-1 rounded text-right ${addSymbolMessage.type === 'success'
                      ? 'bg-binance-green/20 text-binance-green border border-binance-green/30'
                      : 'bg-binance-red/20 text-binance-red border border-binance-red/30'
                      }`}
                    style={{ maxWidth: '200px' }}
                  >
                    {addSymbolMessage.text}
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 flex-1">
                {/* Signal */}
                <div>
                  <div className="text-[10px] sm:text-xs text-binance-text-secondary mb-1.5">Signal</div>
                  <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-binance-gray border border-binance-gray-border">
                    <span className="text-sm sm:text-base font-semibold text-binance-text">
                      {data.sig.candle || 'NONE'}
                    </span>
                  </div>
                </div>

                {/* Trend */}
                <div>
                  <div className="text-[10px] sm:text-xs text-binance-text-secondary mb-1.5">Trend</div>
                  <div className="inline-flex items-center px-2.5 py-1 rounded-md">
                    {(() => {
                      // Use trend from props (from ScanSignalPage) if available, otherwise fallback to data.sig.trend
                      const trendValue = (trend || data.sig.trend || 'NEUTRAL').toUpperCase();
                      const isBullish = trendValue === 'BULLISH' || trendValue === 'LONG';
                      const isBearish = trendValue === 'BEARISH' || trendValue === 'SHORT';
                      const bgColor = isBullish
                        ? 'bg-binance-green/20 border border-binance-green/30'
                        : isBearish
                          ? 'bg-binance-red/20 border border-binance-red/30'
                          : 'bg-binance-text-secondary/20 border border-binance-text-secondary/30';
                      const textColor = isBullish
                        ? 'text-binance-green'
                        : isBearish
                          ? 'text-binance-red'
                          : 'text-binance-text-secondary';

                      return (
                        <span className={`text-sm sm:text-base font-semibold ${bgColor} ${textColor} px-2.5 py-1 rounded-md`}>
                          {trendValue}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Position - from API data.sig.position */}
                <div>
                  <div className="text-[10px] sm:text-xs text-binance-text-secondary mb-1.5">Position</div>
                  <div className="inline-flex items-center px-2.5 py-1 rounded-md">
                    {(() => {
                      const position = data.sig.position?.toUpperCase() || 'NONE';
                      // Use position from API directly (LONG/SHORT/NONE)
                      const isLong = position === 'LONG';
                      const isShort = position === 'SHORT';
                      const bgColor = isLong
                        ? 'bg-binance-green/20 border border-binance-green/30'
                        : isShort
                          ? 'bg-binance-red/20 border border-binance-red/30'
                          : 'bg-binance-text-secondary/20 border border-binance-text-secondary/30';
                      const textColor = isLong
                        ? 'text-binance-green'
                        : isShort
                          ? 'text-binance-red'
                          : 'text-binance-text-secondary';

                      return (
                        <span className={`text-sm sm:text-base font-semibold ${bgColor} ${textColor} px-2.5 py-1 rounded-md`}>
                          {position}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-binance-gray-border">
              <div className="text-[10px] sm:text-xs text-binance-text-secondary">
                Time: <span className="text-binance-text font-medium">{new Date(data.sig.time).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="bg-binance-dark rounded-lg p-2 sm:p-4 border border-binance-gray-border overflow-x-auto">
          <canvas
            ref={canvasRef}
            width={1200}
            height={600}
            onClick={handleCanvasClick}
            onTouchStart={handleCanvasTouch}
            onTouchMove={handleCanvasTouch}
            className="w-full h-auto cursor-crosshair"
            style={{ maxWidth: '100%', height: 'auto', touchAction: 'none' }}
          />
        </div>

      </div>
    </div>
  );
};

export default SignalChart;

