'use strict';

function TelegramChart(element, options) {
  this.element = element;
  this.widget = null;
  this.options = options;
  this.data = [];
  this.ts = [];

  // Widget settings
  this.widgetWidth = null;
  this.widgetHeight = null;
  this.widgetRatio = null;
  this.widgetMaxHeight = 360;

  // SVG settings
  this.svgWidth = null;
  this.svgStepX = null;
  this.svgStepY = null;
  this.svgLineInterval = null;
  this.countLines = 24;

  this.constants = {
    xmlns: 'http://www.w3.org/2000/svg',
  };

  // Boundary Values
  this.minVal = null;
  this.maxVal = null;
  this.maxCount = null;

  // Chart main frame
  this.chartSVG = null;
  this.chartGraphList = [];

  // Navigator preview
  this.navigatorFrame = null;
  this.navigatorSVG = null;
  this.navigatorGraphList = [];

  this.prepareData();
  this.init();
  this.setup();
};

TelegramChart.prototype = {
  prepareData: function() {
    var options = this.options;
    var tsList = [];
    var data = this.options.columns.reduce(function(result, column) {
      var key = column.shift();

      if (key === 'x') {
        tsList = column;
      } else if (key.charAt(0) === 'y') {
        result.push({
          name: options.names[key],
          color: options.colors[key],
          points: column
        });
      }

      return result;
    }, []);

    this.data = data;
    this.ts = tsList;
  },
  init: function() {
    this.widget = this.createDivElement(['tgchart-widget-wrapper']);
    this.element.appendChild(this.widget);

    this.widgetWidth = this.widget.offsetWidth;
    this.widgetHeight = this.widget.offsetHeight;

    this.maxVal = this.helper.getMathMax(this.data, 'points');
    this.minVal = this.helper.getMathMin(this.data, 'points');
    this.maxCount = this.helper.getMaxCount(this.data, 'points');

    this.svgStepX = Math.round(this.widgetWidth / this.countLines);
    this.svgLineInterval = Math.round(Math.ceil(((this.maxVal - this.minVal) * 1.25) / 6) / 25) * 25;
    this.svgStepY = Math.round((this.maxVal - this.minVal) / this.widgetMaxHeight);

    this.svgWidth = this.maxCount * this.svgStepX;
    this.widgetRatio = this.widgetWidth / this.svgWidth;
  },
  setup: function() {
    var graphList = this.generateGraphList(this.svgStepX, this.svgStepY);

    // Chart: SVG + Graph List
    this.chartGraphList = this.cloneGraphList(graphList);
    this.chartSVG = this.generateChartSVG(this.chartGraphList);

    // Navigator
    this.navigatorGraphList = this.cloneGraphList(graphList);
    this.navigatorSVG = this.generateNavigatorSVG(this.navigatorGraphList);

    this.drawChartFrame();
    this.drawNavigatorFrame();
    
    window.addEventListener('resize', this.onResize.bind(this))
  },
  helper: {
    getMathMax: function(data, propKey) {
      return Math.max.apply(null, data.map(function(d) {
        return Math.max.apply(null, d[propKey]);
      }));
    },
    getMathMin: function(data, propKey) {
      return Math.min.apply(null, data.map(function(d) {
        return Math.min.apply(null, d[propKey]);
      }));
    },
    getMaxCount: function(data, propKey) {
      return Math.max.apply(null, data.map(function(d) {
        return d[propKey].length;
      })) - 1;
    }
  },
  onResize: function(e) {
    if (this.widgetWidth !== this.widget.offsetWidth) {
      return false;
    }
  },
  cloneGraphList: function(graphList) {
    return graphList.map(function(graph) {
      return graph.cloneNode();
    });
  },
  generateNavigatorSVG: function(graphs) {
    var width = (this.maxCount + 0) * this.svgStepX,
        height = (this.maxVal - this.minVal) / this.svgStepY,
        viewBox = [0, 0, width, height].join(' ');

    var ratio = this.widget.offsetWidth / width;

    var node = document.createElementNS(this.constants.xmlns, 'svg');
    node.setAttribute('xmlns', this.constants.xmlns);
    node.setAttribute('width', '100%');
    node.setAttribute('height', (height * ratio) + 20);
    node.setAttribute('viewBox', viewBox);

    graphs.forEach(function(graph) {
      this.appendChild(graph);
    }, node);

    return node;
  },
  generateChartSVG: function(graphs) {
    var width = this.maxCount * this.svgStepX,
        height = (this.maxVal - this.minVal) / this.svgStepY,
        viewBox = [width - this.widgetWidth, 0, width, height].join(' ');

    var node = document.createElementNS(this.constants.xmlns, 'svg');
    node.setAttribute('xmlns', this.constants.xmlns);
    node.setAttribute('width', width);
    node.setAttribute('height', height);
    node.setAttribute('viewBox', viewBox);

    for (var i = 5; i >= 0; i--) {
      var element = document.createElementNS(this.constants.xmlns, 'line');
      
      element.setAttribute('x1', 0);
      element.setAttribute('y1', (i * this.svgLineInterval) / this.svgStepY);
      element.setAttribute('x2', width);
      element.setAttribute('y2', (i * this.svgLineInterval) / this.svgStepY);
      element.setAttribute('stroke', '#f1f1f1');

      node.appendChild(element);
    }

    graphs.forEach(function(graph) {
      this.appendChild(graph);
    }, node);

    return node;
  },
  generateGraphList: function(stepX, stepY) {
    var self = this;

    if (!this.data || !this.data.length) return [];

    return [].reduce.call(
      this.data,
      function(nodeList, graph) {
        return nodeList.concat([self.createGraph({
          points: self.convertGraphPointsToString(graph.points, stepX, stepY),
          stroke: graph.color,
          fill: 'none',
          'stroke-width': 2
        })]);
      },
      []
    );

    var node = this.createGraph();
  },
  createGraph: function(attrList) {
    return [].reduce.call(
      Object.getOwnPropertyNames(attrList),
      function(node, attrName) {
        node.setAttribute(attrName, attrList[attrName]);
        return node;
      },
      document.createElementNS(this.constants.xmlns, 'polyline')
    );
  },
  convertGraphPointsToString: function(points, stepX, stepY) {
    if (!points || !stepX || !stepY) return '';

    return points.reduce(function(result, val, i) {
      return result += [(i * stepX), (val / stepY) + ' '].join(',');
    }, '');
  },
  createDivElement: function(classes, styles) {
    var elem = document.createElement('div');

    elem.setAttribute('class', (classes || []).join(' '));
    
    Object.getOwnPropertyNames(styles || {}).forEach(function(prop) {
      elem.style[prop] = styles[prop];
    });

    return elem;
  },

  // Drawer
  drawChartFrame: function() {
    var wrapper = this.createDivElement(['tgchart-frame-wrapper']);
    var svg = this.createDivElement(['tgchart-frame-svg']);

    svg.addEventListener('mouseenter', function(e) {
      // 
    });
    svg.addEventListener('mouseleave', function(e) {
      // 
    });

    svg.appendChild(this.chartSVG);
    wrapper.appendChild(svg);

    this.widget.appendChild(wrapper)
  },
  drawNavigatorFrame: function() {
    var caretWidth = this.countLines * (this.svgStepX * this.widgetRatio),
        caretLeftOffset = this.widgetWidth - caretWidth,
        chartSVG = this.chartSVG,
        widgetRatio = this.widgetRatio;

    var wrapper = this.createDivElement(['tgchart-navigator-wrapper']);
    var svg = this.createDivElement(['tgchart-navigator-svg']);
    var dropzone = this.createDivElement(['tgchart-navigator-dropzone']);
    var caret = this.createDivElement(['tgchart-navigator-caret-wrapper', ['draggable']], {
      width: caretWidth + 'px',
      left: caretLeftOffset + 'px'
    });

    // Mouse
    caret.addEventListener('mousedown', function(e) {
      var offsetLeft = e.target.offsetLeft,
          startX = e.pageX - offsetLeft;

      e.target.style.cursor = 'grabbing';

      caret.onmousemove = function(e) {
        var left = e.pageX - startX;
        if (left < 0) left = 0;
        if (left > caretLeftOffset) left = caretLeftOffset;
        e.target.style.left = left + 'px';

        var chartViewBox = (chartSVG.getAttribute('viewBox') || '').split(' ');
        chartViewBox[0] = left / widgetRatio;
        chartSVG.setAttribute('viewBox', chartViewBox.join(' '));
      };
    }, false);
    caret.addEventListener('mouseup', function(e) {
      e.target.style.cursor = 'grab';
      caret.onmousemove = null;
    }, false);


    this.navigatorGraphList.forEach(function(graph) {
      graph.setAttribute('stroke-width', 5);
    });

    svg.appendChild(this.navigatorSVG);
    dropzone.appendChild(caret);
    wrapper.appendChild(svg);
    wrapper.appendChild(dropzone);

    this.widget.appendChild(wrapper);
  },
  drawControlBar: function() {
    var wrapper = this.createDivElement(['tgchart-control-wrapper']);
  }
};
