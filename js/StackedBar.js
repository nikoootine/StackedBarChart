/**
 * Create stacked bar object
 * @param {Object} param - an object with the following fields:
 *                          {number} width - the width of the svg element
 *                          {number} height - the height of the svg element
 *                          {string} elem - selector for the element to append the svg element to
 *                          {string} chartTitle - title for the chart
 *                          {string} xAxisLabel - label for the x-Axis
 *                          {string} yAxisLabel - label for the y-Axis
 *                          {string} zAxisLabel - label for the z-Axis
 *                          {object} margin - object with the following fields:
 *                              {number} top - top margin
 *                              {number} right - right margin
 *                              {number} bottom - bottom margin
 *                              {number} left - left margin
 */
var StackedBarChart = function(param)
{
    var width = param.width;
    var height = param.height;
    var elem = param.elem;
    var chartTitle = param.chartTitle;
    var xAxisLabel = param.xAxisLabel;
    var yAxisLabel = param.yAxisLabel;
    var zAxisLabel = param.zAxisLabel;
    var tooltipTitle = param.tooltipTitle;
    var margin = { top: 57, right: 57, bottom: 57, left: 57 };

    var svg = d3.select(elem)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .call(responsivefy)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var tooltip = d3.select(elem).append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    return {
        h: height - margin.top - margin.bottom,
        w: width - margin.left - margin.right,
        svg: svg,

        xScale: null,
        xAxis: null,
        yScale: null,
        yAxis: null,
        zScale: null,
        zAxis: null,
        addLine: null,
        layers: null,
        colors: null,
        dateFormatString: null,
        dataLength: null,
        precision : null,

        /**
         * Set the scales for the chart based on the data and it's domain
         * @param {number[]} xDom - array of two numbers representing min and max values of the x domain
         * @param {number[]} yDom - array of two numbers representing min and max values of the y domain
         * @param data - parsed data from the input json
         */
        setScales: function(data)
        {
          var that = this;

          that.xScale = d3.scale.ordinal()
              .rangeRoundBands([0, that.w], 0.3);

          that.yScale = d3.scale.linear()
              .rangeRound([that.h, 0]);


          // TODO make the number of yvals dynamic
          that.layers = d3.layout.stack()(["yval1", "yval2", "yval3"].map(function(yval) {
                return data.map(function(d) {
                    return {x: d.xval, y: +d[yval]};
                });
          }));

          that.xScale.domain(that.layers[0].map(function(d) { return d.x; }));
          that.yScale.domain([0, d3.max(that.layers[that.layers.length - 1], function(d) { return d.y0 + d.y; })]).nice();

          that.yAxis = d3.svg.axis()
                            .scale(that.yScale)
                            .orient("left")
          ;

          that.xAxis = d3.svg.axis()
                            .scale(that.xScale)
                            .orient("bottom")
          ;
        },

        /**
         * Initializes the chart. Sets the scales and generates the axes and grid lines.
         * @param {number[]} xDom - array of two numbers representing min and max values of the x domain
         * @param {number[]} yDom - array of two numbers representing min and max values of the y domain
         * @param data - parsed data from the input json
         */
        initChart: function(data,precision, applicationColors)
        {

          /*test function delete*/
          function call()
        {
            popup = window.open('http://www.google.co.in');
            setTimeout(wait, 100);
        }
        function caller()
        {
            setInterval(call, 100);
        }
        function wait()
        {
            popup.close();
        }

          var that = this;
          /*random colors!*/
          that.colors = _.shuffle(applicationColors);
          /*precision specified in index*/
          that.precision = precision;
          that.setScales(data);

          svg.append("g")
                    .attr("class", "y axis")
                    .call(that.yAxis);

          svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + that.h + ")")
                    .call(that.xAxis);

        },

        /**
         * Helper function. Deletes old bar elements after they are shrunk to zero (For animation pruposes, the bars are shrunk to zero instead of being instantly removed).
         */
        deleteGarbage: function()
        {
            d3.selectAll(".toBeDeleted").remove();
        },

        /**
         * Updates the chart based on the data passed in.
         * @param data - parsed data from input json
         */
        updateChart: function(data)
        {
          var that = this;

          /*The amount that bars are darkened on Mouseover*/
          var mouseOverDarken = -30;
          /*Reverses the effect of the darken on mouseout*/
          var mouseOverReverse = -1 * mouseOverDarken;

          //Lighten Darken Function by Chris Coyier
          //Used to lighten the colors of each group from left to right
          function lightenDarkenColor(col, amt) {
            var usePound = false;
            if (col[0] == "#") {
                col = col.slice(1);
                usePound = true;
            }
            var num = parseInt(col,16);
            var r = (num >> 16) + amt;
            if (r > 255) r = 255;
            else if  (r < 0) r = 0;
            var b = ((num >> 8) & 0x00FF) + amt;
            if (b > 255) b = 255;
            else if  (b < 0) b = 0;
            var g = (num & 0x0000FF) + amt;
            if (g > 255) g = 255;
            else if (g < 0) g = 0;
            /*Fixed Lighten algorithm, was truncating hexes randomly.*/
            var result = "000000" + (g | (b << 8) | (r << 16)).toString(16);
            result = result.substr(-6);
            result = (usePound?"#":"") + result;
            return result;
          }

          var tooltip_mouseover = function(d) {
              /*Set the rectangle within the layer to a darker version of the layer's color.*/
              var layerColor = d3.select(this.parentNode).attr("fill");
              var rect = d3.select(this);
              rect.attr("fill", lightenDarkenColor(layer, mouseOverDarken));

              var tooltipText = '';
              if (d.label)
                  tooltipText = "<strong>" + d.label + "</strong>";
              if (d.y)
                  tooltipText +=  "<br>Score: <strong>" + d.y.toFixed(that.precision)  + "</strong>";

              if (d.x)
                  tooltipText += "<br>Date: <strong>" + d.x  + "</strong>";


              tooltip.transition()
                  .duration(200)
                  .style("opacity", 1);
              tooltip.html(tooltipText)
              /*Get the color of the layer and the tooltip border to that color */
                  .style("border-color", d3.select(this.parentNode).attr("fill"))
                  .style("background-color", "#FFFFFF")
              ;
          };

          var tooltip_mousemove = function(d) {
              var mouseContainer = d3.select(elem + " svg");
              var mouseCoords    = d3.mouse(mouseContainer.node());

              d3.select(elem + " div.tooltip")
                  .style("left", (mouseCoords[0]) + "px")
                  .style("top",  (mouseCoords[1]) - 50 + "px");

              /*Zval not applicable in this chart
              Following statement good for uncommon tooltip value*/
              if(d.zval) {
                  d3.select(elem + " div.tooltip")
                      .style("top",  (mouseCoords[1]) - 65 + "px");
              }
          };

          var tooltip_mouseout = function()
          {
            /*Return the rectangle to the color of the layer*/
            var layer = d3.select(this.parentNode);
            var rect = d3.select(this);
            rect.attr("fill", layer.attr("fill"));

            tooltip.transition()
                .duration(200)
                .style("opacity", 0);
          };

          /*Create the Layers*/
          var growLayerDuration = 1500;
          var growBarsDuration = 1500;
          var delayBetweenLayers = 1500;
          var delayBetweenBars = 500;
          console.log(that.layers);
          var layer = svg.selectAll(".layer")
            .data(that.layers)
            .enter().append("g")
            .attr("class", function(d,i){ return "layer" + i;})
            .attr("fill", function(d, i) { return that.colors[i]; })
            /*.transition()
            .delay(function(d,i){return i*delayBetweenLayers;})
            .duration*/
          //for each layer
          .each(function(d, layerIndex){
            d3.select(this).selectAll("rect")
            .data(function(d){console.log(d + " d before enter");return d; }) //d is layer array
            .enter().append("rect")
            /*disable pointer events for each rectangle entering the dom*/
            .style("pointer-events", "none")
            .on('mouseover',tooltip_mouseover)
            .on('mousemove',tooltip_mousemove)
            .on('mouseout',tooltip_mouseout)
            //.transition()
            //.delay(function(d, i) { return i * 500;})
            .attr("x", function(d) { /*console.log(d.x);*/return that.xScale(d.x); })
            .attr("y", function(d,i) { return that.yScale(d.y + d.y0);})
            //.attr("y", that.h)
            .attr("height", 0)
            .attr("width", that.xScale.rangeBand() - 1)
            .transition()
            /*the layer 0 should have no delay*/
            /*delay between layers*/
            .delay(function(d, i){
              if(layerIndex === 0){
                console.log(i * delayBetweenBars);
                return i * delayBetweenBars;
              }
              console.log("d: " + d + "  i: " + i + " layerIndex: " + layerIndex);
              console.log(delayBetweenLayers*layerIndex + delayBetweenBars*i + delayBetweenLayers);
              return delayBetweenLayers*layerIndex + delayBetweenBars*i + delayBetweenLayers;
              })
              .duration(growBarsDuration/3)
              // Expand height first (bounce effect)
              .attr('y', function(d, i) { return that.yScale(d.y + d.y0) - 50; })
              .attr('height', function(d, i) { return that.yScale(d.y0) - that.yScale(d.y + d.y0) + 50 ;})
              .ease("bounce")
              .transition()
              .duration(growBarsDuration/3)
              // Lower the height after (bounce effect)
              .attr('y', function(d,i) { return that.yScale(d.y + d.y0) - 15; })
              .attr('height', function(d,i) { return that.yScale(d.y0) - that.yScale(d.y + d.y0) + 15 ;})
              .ease("bounce")
              .transition()
              .duration(growBarsDuration/3)
              // Turn back to original height
              .attr("y", function(d,i) { return that.yScale(d.y + d.y0);})
              .attr("height", function(d,i) { return that.yScale(d.y0) -that.yScale(d.y+d.y0);})
              .ease("bounce")
              //allow pointer events after animation is finished
              .each("start", function(){

              })
              .each("end", function(){
                d3.select(this).style("pointer-events", "");

              });//end of transition
            })//end of each layer
            ;
        },

        /**
         * Checks if a string represents a date
         * @param {string} the string to check
         * @returns {bool} whether the string is a date or not
         */
        isDate: function(data)
        {
            var dateFormat = "MMM-DD-YYYY";
            return moment(data, dateFormat, false).isValid();
        },

        /**
         * Returns a date object for a string
         * @param {string} the string to get a date for
         * @returns {object} a date object representing the string
         */
        toDate: function(date)
        {
            var dateFormat = "MMM-DD-YYYY";
            return moment(date, dateFormat, false);
        },

        /**
         * Does some processing for json data. Groups year-months together or year-month-days together.
         * Takes the aggregate z-axis values and average y-axis values for each group.
         * @param data - parsed data from input json
         * @returns processed data
         */

        setStackedBarChartData : function(data)
        {
              var that = this;
        }
    };
};
