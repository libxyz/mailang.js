import { MaiVM, MarketData } from '../interpreter';

// 扩展MarketData接口以支持成交量
interface ExtendedMarketData extends MarketData {
  volume: number;
}

describe('Multi-Candle Interpreter Tests', () => {
  // 模拟多根K线数据
  const candleSeries: ExtendedMarketData[] = [
    { T: 1609459200, O: 100, H: 105, L: 98, C: 102, volume: 1000000 }, // K线1
    { T: 1609462800, O: 102, H: 108, L: 101, C: 106, volume: 1100000 }, // K线2
    { T: 1609466400, O: 106, H: 110, L: 104, C: 107, volume: 1200000 }, // K线3
    { T: 1609470000, O: 107, H: 112, L: 105, C: 109, volume: 1300000 }, // K线4
    { T: 1609473600, O: 109, H: 115, L: 108, C: 113, volume: 1400000 }, // K线5
    { T: 1609477200, O: 113, H: 118, L: 111, C: 115, volume: 1500000 }, // K线6
    { T: 1609480800, O: 115, H: 120, L: 114, C: 117, volume: 1600000 }, // K线7
    { T: 1609484400, O: 117, H: 122, L: 116, C: 119, volume: 1700000 }, // K线8
    { T: 1609488000, O: 119, H: 125, L: 118, C: 121, volume: 1800000 }, // K线9
    { T: 1609491600, O: 121, H: 127, L: 120, C: 124, volume: 1900000 }, // K线10
  ];

  describe('Global Variables State Management', () => {
    test('should maintain simple global variables across multiple candle executions', () => {
      const code = `
        VARIABLE: counter := 0;
        counter := counter + 1;
        counter : counter;
      `;

      const executor = new MaiVM(code);

      // 执行多根K线
      const results = candleSeries.map(candle =>
        executor.execute({ T: candle.T, O: candle.O, H: candle.H, L: candle.L, C: candle.C })
      );

      // 验证全局变量递增
      expect(results[0].globalVars.get('counter')).toBe(1);
      expect(results[1].globalVars.get('counter')).toBe(2);
      expect(results[9].globalVars.get('counter')).toBe(10);
    });

    test('should maintain global variables across multiple candle executions', () => {
      const code = `
        VARIABLE: total_volume := 0;
        VARIABLE: candle_count := 0;
        VARIABLE: prev_close := 0;

        // Update global variables
        volume_value := 1000000;
        total_volume := total_volume + volume_value;
        candle_count := candle_count + 1;

        // Calculate price change from previous close
        price_change := 0;
        price_change_pct := 0;
        IF candle_count > 1 THEN BEGIN
          price_change := C - prev_close;
          price_change_pct := price_change / prev_close * 100;
        END;

        // Store current close for next candle
        prev_close := C;

        // Output current state
        total_volume : total_volume;
        candle_count : candle_count;
      `;

      const executor = new MaiVM(code);

      // 执行多根K线
      const results = candleSeries.map(candle =>
        executor.execute({ T: candle.T, O: candle.O, H: candle.H, L: candle.L, C: candle.C })
      );

      // 验证第一根K线
      expect(results[0].globalVars.get('total_volume')).toBe(1000000);
      expect(results[0].globalVars.get('candle_count')).toBe(1);
      expect(results[0].output.total_volume).toBe(1000000);
      expect(results[0].output.candle_count).toBe(1);

      // 验证第二根K线
      expect(results[1].globalVars.get('total_volume')).toBe(2000000);
      expect(results[1].globalVars.get('candle_count')).toBe(2);
      expect(results[1].vars.get('price_change')).toBe(4); // 106 - 102
      expect(results[1].vars.get('price_change_pct')).toBeCloseTo(3.92, 2);

      // 验证最后一根K线
      expect(results[9].globalVars.get('total_volume')).toBe(10000000);
      expect(results[9].globalVars.get('candle_count')).toBe(10);
    });

    test('should maintain running maximum and minimum prices', () => {
      const code = `
        VARIABLE: max_price := 0;
        VARIABLE: min_price := 999999;
        VARIABLE: price_range := 0;

        // Update max and min prices
        IF H > max_price THEN BEGIN
          max_price := H;
        END;
        IF L < min_price THEN BEGIN
          min_price := L;
        END;

        // Calculate overall price range
        price_range := max_price - min_price;

        // Output results
        max_price : max_price;
        min_price : min_price;
        price_range : price_range;
      `;

      const executor = new MaiVM(code);
      const results = candleSeries.map(candle =>
        executor.execute({ T: candle.T, O: candle.O, H: candle.H, L: candle.L, C: candle.C })
      );

      // 验证价格范围逐渐扩大
      expect(results[0].globalVars.get('max_price')).toBe(105);
      expect(results[0].globalVars.get('min_price')).toBe(98);
      expect(results[0].globalVars.get('price_range')).toBe(7);

      // 验证运行中的最大值和最小值
      expect(results[9].globalVars.get('max_price')).toBe(127); // 系列中的最高价
      expect(results[9].globalVars.get('min_price')).toBe(98); // 系列中的最低价
      expect(results[9].globalVars.get('price_range')).toBe(29); // 127 - 98
    });

    test('should handle session-based global variables', () => {
      const code = `
        VARIABLE: session_high := 0;
        VARIABLE: session_low := 999999;
        VARIABLE: session_start := 0;

        // Reset session at the beginning (first candle indicator)
        IF session_start = 0 THEN BEGIN
          session_high := H;
          session_low := L;
          session_start := 1;
        END;

        // Update session high/low
        IF H > session_high THEN BEGIN
          session_high := H;
        END;
        IF L < session_low THEN BEGIN
          session_low := L;
        END;

        // Output session data
        session_high : session_high;
        session_low : session_low;
      `;

      const executor = new MaiVM(code);

      // 执行前几根K线
      const results = candleSeries.slice(0, 5).map(candle => executor.execute(candle));

      // 验证会话状态
      expect(results[0].globalVars.get('session_start')).toBe(1);
      expect(results[4].globalVars.get('session_high')).toBe(115); // 前5根K线的最高价
      expect(results[4].globalVars.get('session_low')).toBe(98); // 前5根K线的最低价
    });
  });

  describe('Stateful Indicators (MA, EMA, etc.)', () => {
    test('should correctly calculate Moving Average across multiple candles', () => {
      const code = `
        // Calculate 3-period moving average of closing prices
        ma3 := MA(C, 3);
        ma3 : ma3;
      `;

      const executor = new MaiVM(code);
      const results = candleSeries.map(candle =>
        executor.execute({ T: candle.T, O: candle.O, H: candle.H, L: candle.L, C: candle.C })
      );

      // 验证MA计算
      // 第1-2根K线：数据不足，应该返回null
      expect(results[0].output.ma3).toBe(null);
      expect(results[1].output.ma3).toBe(null);

      // 第3根K线：应该计算前3根K线的平均值 (102+106+107)/3
      expect(results[2].output.ma3).toBeCloseTo(105, 2);

      // 第4根K线：应该计算第2-4根K线的平均值 (106+107+109)/3
      expect(results[3].output.ma3).toBeCloseTo(107.33, 2);

      // 第10根K线：应该计算第8-10根K线的平均值
      expect(results[9].output.ma3).toBeCloseTo((119 + 121 + 124) / 3, 2);
    });

    test('should maintain separate state for different MA periods', () => {
      const code = `
        // Calculate multiple moving averages
        ma3 := MA(C, 3);
        ma5 := MA(C, 5);
        ma3_display : ma3;
        ma5_display : ma5;
      `;

      const executor = new MaiVM(code);
      const results = candleSeries.map(candle =>
        executor.execute({ T: candle.T, O: candle.O, H: candle.H, L: candle.L, C: candle.C })
      );

      // 验证不同周期的MA有不同的状态
      // 第3根K线：MA3有值，MA5还为null
      expect(results[2].vars.get('ma3')).toBeCloseTo(105, 2);
      expect(results[2].vars.get('ma5')).toBe(null);

      // 第5根K线：MA3和MA5都应该有值
      expect(results[4].vars.get('ma3')).toBeCloseTo(109.67, 2); // (107+109+113)/3
      expect(results[4].vars.get('ma5')).toBeCloseTo(107.4, 2); // (102+106+107+109+113)/5
    });

    test('should handle multiple calls to same indicator with different parameters', () => {
      const code = `
        // Multiple MA calls with different periods
        short_ma := MA(C, 2);
        medium_ma := MA(C, 4);
        long_ma := MA(C, 6);

        short_ma_display : short_ma;
        medium_ma_display : medium_ma;
        long_ma_display : long_ma;
      `;

      const executor = new MaiVM(code);
      const results = candleSeries.map(candle =>
        executor.execute({ T: candle.T, O: candle.O, H: candle.H, L: candle.L, C: candle.C })
      );

      // 第4根K线验证
      expect(results[3].vars.get('short_ma')).toBeCloseTo(108, 2); // (107+109)/2
      expect(results[3].vars.get('medium_ma')).toBeCloseTo(106, 2); // (106+107+109)/3 - should be 3 periods, not 4
      expect(results[3].vars.get('long_ma')).toBe(null); // 还不够6个数据点
    });

    test('should handle indicator state reset properly', () => {
      const code = `
        // Calculate moving average
        current_ma := MA(C, 3);
        current_ma : current_ma;
      `;

      const executor = new MaiVM(code);

      // 执行前5根K线
      const firstBatch = candleSeries
        .slice(0, 5)
        .map(candle => executor.execute({ T: candle.T, O: candle.O, H: candle.H, L: candle.L, C: candle.C }));

      // 验证第5根K线的MA值
      expect(firstBatch[4].vars.get('current_ma')).toBeCloseTo(109.67, 2); // (107+109+113)/3

      // 创建新的executor来模拟状态重置
      const newExecutor = new MaiVM(code);
      const secondBatch = candleSeries
        .slice(5, 8)
        .map(candle => newExecutor.execute({ T: candle.T, O: candle.O, H: candle.H, L: candle.L, C: candle.C }));

      // 验证新的executor从空状态开始
      expect(secondBatch[0].vars.get('current_ma')).toBe(null); // 第一根K线数据不足
      expect(secondBatch[1].vars.get('current_ma')).toBe(null); // 第二根K线数据不足
      expect(secondBatch[2].vars.get('current_ma')).toBeCloseTo(117, 2); // (115+117+119)/3 = 117
    });
  });
});
