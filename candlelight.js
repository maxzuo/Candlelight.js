window.candle = (() => {

    class Candle {
        constructor(date, high, low, open, close, volume, dayDip, prevDip, tickerName) {
            this.high = high
            this.low = low
            this.open = open
            this.close = close
            this.dayDip = dayDip
            this.prevDip = prevDip
            this.volume = volume

            this.tickerName = tickerName
            if (typeof(date) == "string") {
                try {
                    this.date = new Date(date)
                } catch(e) {
                    this.date = date
                }
                
            } else if (date instanceof Date) {
                this.date = date
            } else {
                this.date = null
            }
        }
    }

    class CandleAnnotation {
        constructor(annotationType, color, startDate, endDate) {
            this.annotationType = annotationType
            this.color = color
            this.startDate = startDate
            this.endDate = endDate
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
            this.date = null
            this.volume = null

            this._annotations = []

            this._chart = null

            // Design presets
            this._background_color = 'white'
            this._lineWidth = 1.5
            this._minimumCandleWidth = 6
            this._maximumCandleWidth = 30
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
        setBackgroundStyle = (style, color) => {
            this._background_style = {
                style: style,
                color: color
            }
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

        /**
         * Load stock data for viewing
         * 
         * Data format either: will be updated to an object in future versions
         * 
         * [High, Low, Open, Close]
         * Or
         * [Date, High, Low, Open, Close, Volume, tickerName]
         * 
         * @param {number[][]} data
         */
        loadData = (data) => {
            if (!data || !data.length || data.length <=1)
                throw Error("Bad data provided")
            this._candles = []

            this._data.max = null
            this._data.min = null
            this._data.count = data.length

            for (let i = 0; i < data.length; i++) {
                let dDate, dhigh, dlow, dopen, dclose, dVolume, tickerName
                if (data[i].length == 4)
                    [dhigh, dlow, dopen, dclose] = data[i]
                else if (data[i].length == 7) {
                    [dDate, dhigh, dlow, dopen, dclose, dVolume, tickerName] = data[i]
                }
                if (!this._data.min || dlow < this._data.min)
                    this._data.min = dlow;
                if (!this._data.min || dhigh > this._data.max)
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

                let c  = new Candle(dDate, dhigh, dlow, dopen, dclose, dVolume, dayDip, prevDip, tickerName)
                this._candles.push(c)
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
            if (this._minimumCandleWidth * this._data.count > this._width){
                throw Error("Cannot draw within specified width: Not enough space")
            }
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
            if (this._background_style && this._background_style.style == 'stripes') {
                let color = "white"
                if (this._background_style.color)
                    color = this._background_style.color

                for (let i = 0; i < this._data.count / 5; i+=2) {
                    let stripe = document.createElementNS(chartNS, 'rect')
                    stripe.setAttribute('x', candleStep * i * 5)
                    stripe.setAttribute('width', candleStep * 5)
                    stripe.setAttribute('y', '0')
                    stripe.setAttribute('height', this._height)

                    stripe.setAttribute('style', "fill: " + color + "; stroke_width:0; stroke:0;")

                    chart.appendChild(stripe)
                }
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

            // chart.addEventListener("mousemove", this.mouseMoveShowPrices)

            this._chart = chart
            this.setMouseMove(mouseMoveShowPrices)

            
            return chart
        }

        /**
         * Sets the `mousemove` handler method. Handler will be provided
         * the mouse's position and the highlighted candle.
         * 
         * handler is provided with:
         * candleChart, x, y, candle
         * 
         * @param {function} handler new mouseMove handler
         * 
         */
        setMouseMove = (handler) => {
            let normalize = (price) => (price - this._data.min) / (this._data.max - this._data.min)

            

            this._chart.addEventListener('mousemove', (e) => {

                let mouseX = e.offsetX
                let mouseY = e.offsetY

                const candleStep = (this._width) / this._data.count

                let candleIndex = Math.floor(mouseX / candleStep)
                let selectedCandle
                
                if (candleIndex < 0 || candleIndex >= candleChart._data.count) {
                    selectedCandle = null
                } else {
                    selectedCandle = this._candles[candleIndex]
                } 

                handler(this, mouseX, mouseY, selectedCandle)
            })
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
            this._width = newWidth
        }

        get width() {
            return this._width
        }

        /**
         * @param {number} newHeight
         */
        set height(newHeight) {
            this._height = newHeight
        }

        get height() {
            return this._height
        }
        
    }

    let mouseMoveShowPrices = (candleChart, x, y, selectedCandle) => {

        if (!candleChart._chart) return
        let normalize = (price) => (price - candleChart._data.min) / (candleChart._data.max - candleChart._data.min)
        
        // Build floating information box
        const boxWidth = 220
        const boxHeight = 150
        const fontsize = 15
        
        // Get candle mouse is pointing to

        // If out of bounds, reset and exit
        if (!selectedCandle) {
            if (mouseMoveShowPrices.infobox) {
                try {
                    candleChart._chart.removeChild(mouseMoveShowPrices.infobox)    
                } catch (error) {
                    console.log(error)
                }
            }
            mouseMoveShowPrices.infobox = null
            return
        }

        const highY = (1 - normalize(selectedCandle.high)) * candleChart.height
        const lowY = (1 - normalize(selectedCandle.low)) * candleChart.height

        // Check if mouse is near ticker
        if (y < highY - 0.01 * candleChart.height || y > lowY + 0.01 * candleChart.height) {
            if (mouseMoveShowPrices.infobox) {
                try {
                    candleChart._chart.removeChild(mouseMoveShowPrices.infobox)    
                } catch (error) {
                    console.log(error)
                }
            }
            mouseMoveShowPrices.infobox = null
            return
        }

        let dateString

        if (!selectedCandle.date) {
            dateString = "N/A"
        } else if (typeof(selectedCandle.date) == "string") {
            dateString = selectedCandle.date
        } else if (selectedCandle.date instanceof Date) {
            dateString = `${selectedCandle.date.getUTCMonth() + 1}/${selectedCandle.date.getUTCDate()}/${selectedCandle.date.getUTCFullYear()}`
        } else {
            dateString = "N/A"
        }

        let highString = `High:  ${selectedCandle.high.toFixed(2)}`
        let lowString = `Low:   ${selectedCandle.low.toFixed(2)}`
        let openString = `Open: ${selectedCandle.open.toFixed(2)}`
        let closeString = `Close: ${selectedCandle.close.toFixed(2)}`

        let volumeString = `Volume:  ${selectedCandle.volume.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || "N/A"}`

        let detailStrings = [dateString, highString, lowString, openString, closeString, volumeString]

        let boxX, boxY

        if (x > candleChart.width - (boxWidth + 20)) {
            boxX = x - boxWidth
        } else {
            boxX = x + 20
        }

        if (y > candleChart.width - (boxHeight + 20)) {
            boxY = y - (boxHeight + 20)
        } else {
            boxY = y
        }

        if (mouseMoveShowPrices.infobox) {

            let [backgroundBox, ...textBoxes] = mouseMoveShowPrices.infobox.children

            backgroundBox.setAttribute('x', boxX)
            backgroundBox.setAttribute('y', boxY)

            textBoxes.forEach((textBox, i) => {
                textBox.setAttribute('x', boxX + 5)
                textBox.setAttribute('y', boxY + (i + 0.8) * fontsize * 1.6)
                textBox.textContent = detailStrings[i]
            })
        } else {
            // Create infobox container
            let infobox = document.createElementNS(candleChart._chart.namespaceURI, "g")
            let infoNS = infobox.namespaceURI

            // Create background box
            let backgroundBox = document.createElementNS(infoNS, "rect")
            backgroundBox.setAttribute('x', boxX)
            backgroundBox.setAttribute('y', boxY)

            backgroundBox.setAttribute('width', boxWidth)
            backgroundBox.setAttribute('height', boxHeight)

            backgroundBox.setAttribute('style', `
                fill:black;
                opacity: 65%;
                moz-opacity: 65%;

            `)

            infobox.appendChild(backgroundBox)

            // Create texts
            let i = 0.5

            let infoTextBox = (str) => {
                let textBox = document.createElementNS(infoNS, "text")
                textBox.textContent = str
                textBox.setAttribute('x', boxX + 5)
                textBox.setAttribute('y', boxY + i++ * fontsize * 2)
                textBox.setAttribute('font-size', fontsize)
                textBox.setAttribute('fill', 'white')
                textBox.setAttribute('font-family', 'Verdana')
                return textBox
            }

            detailStrings.forEach((s) => {
                infobox.appendChild(infoTextBox(s))
            })
            
            mouseMoveShowPrices.infobox = infobox

            candleChart._chart.appendChild(infobox)
        }
    }

    let candle = {
        Chart: (width, height) => {
            if (!height || !width || height < 0 || width < 0)
                return null
            
            return new CandleChart(width, height)
        },
        mouseMoveShowPrices: mouseMoveShowPrices
    }

    return candle
})()