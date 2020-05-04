window.candle = (() => {

    class Candle {
        constructor(high, low, open, close, dayDip, prevDip) {
            this.high = high;
            this.low = low;
            this.open = open;
            this.close = close;
            this.dayDip = dayDip;
            this.prevDip = prevDip;
        }
    }
    class CandleChart {
        constructor(width, height) {
            this._width = width
            this._height = height
            this._title = ""
            this._candles = []
            this._candleData = []
            this._data = {
                max: 0.0,
                min: 0.0,
                count: 0
            }
            this._annotations = []
            this._background_color = 'white'

            this._chart = null

            this._lineWidth = 1.5
            this._minimumCandleWidth = 4
            this._maximumCandleWidth = 20
            this._background_style = null
        }

        /**
         * Set background color of chart
         * 
         * @param {string} color
         */
        setBackgroundColor = (color) => {
            this._background_color = color
        }

        /**
         * Set style of background.
         * 
         * Currently supports 'stripes' and null/'none'
         * @param {string} style
         */
        setBackgroundStyle = (style) => {
            this._background_style = style
        }

        /**
         * Sets the line width used to draw candles, unless provided width is invalid
         * 
         * @param {number} width
         */
        setLineWidth = (width) => {
            if (width <= 0) return
            this._lineWidth = width
        }

        // High, Low, Open, Close
        /**
         * Load stock data for viewing
         * 
         * Use: HLOC
         * @param {number[][]} data
         */
        loadData = (data) => {
            if (!data || !data.length || data.length <=1)
                throw Error("Bad data provided")
            this._candles = []

            this._data.max = 0.0
            this._data.min = data[0][0]
            this._data.count = data.length

            for (let i = 0; i < data.length; i++) {

                let [dhigh, dlow, dopen, dclose] = data[i]

                if (dlow < this._data.min)
                    this._data.min = dlow;
                if (dhigh > this._data.max)
                    this._data.max = dhigh;
                
                let dayDip = false
                let prevDip = false

                if (dclose < dopen) {
                    dayDip = true
                }
                if (i > 0) {
                    let prevClose = data[i-1][3]
                    if (prevClose > dclose) {
                        prevDip = true
                    }
                }

                this._candles.push(new Candle(dhigh, dlow, dopen, dclose, dayDip, prevDip))
            }
        }

        /**
         * draw
         * 
         * heavy lifting of creating svg is done here.
         * Always restarts from beginning as of now.
         * 
         * @returns chart
         */
        draw = () => {
            this._chart = null
            if (this._minimumCandleWidth * this._data.count > this._width)
                throw Error("Cannot draw within specified width: Not enough space")
            
            let normalize = (price) => (price - this._data.min) / (this._data.max - this._data.min)
            let point = (x, y) => x + "," + y + " "
            
            // Initialize Chart object
            let chart = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            let chartNS = chart.namespaceURI
            chart.setAttribute('height', Math.floor(this._height))
            chart.setAttribute('width', Math.floor(this._width))

            // Calculate needed constants
            const candleWidth = Math.min(this._maximumCandleWidth, ((this._width) / this._data.count - 2 * this._lineWidth))
            const candleStep = (this._width) / this._data.count

            // Preset background colors
            chart.setAttribute('style', "background-color: " + this._background_color)

            // Set background style
            if (this._background_style == 'stripes') {
                
                for (let i = 0; i < this._data.count / 5; i+=2) {
                    console.log(i);
                    let stripe = document.createElementNS(chartNS, 'rect')
                    stripe.setAttribute('x', candleStep * i * 5)
                    stripe.setAttribute('width', candleStep * 5)
                    stripe.setAttribute('y', '0')
                    stripe.setAttribute('height', this._height)

                    stripe.setAttribute('style', "fill: white; stroke_width:0; stroke:0;")

                    chart.appendChild(stripe)
                }
            } else {
                
            }
            


            // Iterate through all the candles and draw candles as needed
            this._candles.forEach((candleData, i) => {
                const centerX = i * candleStep + Math.floor(candleWidth / 2) + this._lineWidth;
                const highY = (1 - normalize(candleData.high)) * this._height
                const lowY = (1 - normalize(candleData.low)) * this._height
                const open = (1 - normalize(candleData.open)) * this._height
                const close = (1 - normalize(candleData.close)) * this._height

                const topY = Math.min(open, close)
                const bottomY = Math.max(open, close)


                let outline = document.createElementNS(chartNS, 'polyline')
                
                let points = point(centerX, highY)
                             + point(centerX, topY)
                             + point(centerX - candleWidth / 2, topY)
                             + point(centerX - candleWidth / 2, bottomY)
                             + point(centerX, bottomY)
                             + point(centerX, lowY)
                             + point(centerX, bottomY)
                             + point(centerX + candleWidth / 2, bottomY)
                             + point(centerX + candleWidth / 2, topY)
                             + point(centerX, topY)

                let color = candleData.prevDip ? 'red' : 'black';
                let fill = candleData.dayDip ? color: 'none';

                outline.setAttribute('points', points)
                outline.setAttribute('style', "stroke:" + color + "; fill: " + fill + "; stroke-width: " + this._lineWidth)

                chart.appendChild(outline)
                
            })


            this._chart = chart
            return chart
        }

        /**
         * @param {string} newTitle
         */
        set title(newTitle) {
            return
        }

        /**
         * @param {string} newTitle
         */
        setTitle = (newTitle) => {
            if (typeof(newTitle) != 'string')
                return
            this._title = newTitle
        }

        getTitle = () => {
            return this.title
        }

        /**
         * @param {number} newWidth
         */
        set width(newWidth) {
            return
        }

        get width() {
            return this._width
        }

        /**
         * @param {number} newHeight
         */
        set height(newHeight) {
            return
        }

        get height() {
            return this._height
        }
        
    }

    let candle = {
        Chart: (width, height) => {
            if (!height || !width || height <= 0 || width <= 0)
                return null
            
            return new CandleChart(width, height)
        }
    }

    return candle
})()