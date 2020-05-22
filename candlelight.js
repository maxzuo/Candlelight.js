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

        toString() {
            let dateString = `${this.date.getUTCMonth() + 1}/${this.date.getUTCDate()}/${this.date.getUTCFullYear()}`
            return `Ticker: ${this.tickerName}\n\tDate: ${dateString}\n\tHigh: ${this.high}\n\tLow: ${this.low}\n\tOpen: ${this.open}\n\tClose: ${this.close}\n\tVolume: ${this.volume}\n`
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


            // handlers
            this.mousemovehandler = null
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
         * Gets the range of candles, provided start and end candle
         * 
         * Note: this will autoswap to the correct order
         * 
         * @param {Candle} sCandle the starting candle
         * @param {Candle} eCandle the ending candle
         * 
         * @returns {Candle[]} candle range
         */
        getCandleRange = (sCandle, eCandle) => {
            if (!(sCandle instanceof Candle) && !(eCandle instanceof Candle)) {
                throw Error("getCandleRange requires 2 Candle instances!")
            }

            let sIndex = this._candles.indexOf(sCandle)
            let eIndex = this._candles.indexOf(eCandle)

            if (eIndex < sIndex) {
                [sIndex, eIndex] = [eIndex, sIndex]
            }

            return this._candles.slice(sIndex, eIndex + 1)
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

            this._chart = chart


            // Set default event handlers  
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
            
            this._chart.removeEventListener('mousemove', this.mousemovehandler)
            this.mousemovehandler =  (e) => {

                let mouseX = e.offsetX
                let mouseY = e.offsetY

                const candleStep = (this._width) / this._data.count

                let candleIndex = Math.floor(mouseX / candleStep)
                let selectedCandle
                
                if (candleIndex < 0 || candleIndex >= this._data.count) {
                    selectedCandle = null
                } else {
                    selectedCandle = this._candles[candleIndex]
                } 

                handler(this, mouseX, mouseY, selectedCandle)
            }

            this._chart.addEventListener('mousemove', this.mousemovehandler)
        }

        /**
         * Sets the new drag handler for the chart.
         * 
         * @param {function} start new dragStart handler
         * @param {function} during new dragDuring handler
         * @param {function} completion new dragCompletion handler
         */
        setMouseDrag = ({start=() => {}, during=() => {}, completion=() => {}} = {}) => {
            let startX, startY, startCandle, endX, endY, endCandle, down
            
            this._chart.removeEventListener('mousedown', this.dragStartHandler)
            this._chart.removeEventListener('mouseup', this.dragCompletionHandler)
            this._chart.removeEventListener('mousemove', this.dragDuringHandler)


            const candleStep = (this._width) / this._data.count

            // Helper wrapper method for drag during handler
            
            this.dragStartHandler = (e) => {
                startX = e.offsetX
                startY = e.offsetY

                down = true

                let candleIndex = Math.floor(startX / candleStep)
                
                if (candleIndex < 0 || candleIndex >= this._data.count) {
                    startCandle = null
                } else {
                    startCandle = this._candles[candleIndex]
                }

                start(this, startX, startY, startCandle)
            }


            // Helper wrapper method for drag during handler
            this.dragDuringHandler = (e) => {
                if (!down) return
                let x = e.offsetX
                let y = e.offsetY
                let candle

                let candleIndex = Math.floor(x / candleStep)

                if (candleIndex < 0 || candleIndex >= this._data.count) {
                    candle = null
                } else {
                    candle = this._candles[candleIndex]
                }


                during(this, startX, startY, startCandle, x, y, candle)
            }

            // Helper wrapper method for drag completion handler
            this.dragCompletionHandler = (e) => {
                endX = e.offsetX
                endY = e.offsetY

                down = false

                let candleIndex = Math.floor(endX / candleStep)
                
                if (candleIndex < 0 || candleIndex >= this._data.count) {
                    endCandle = null
                } else {
                    endCandle = this._candles[candleIndex]
                }

                completion(this, startX, startY, startCandle, endX, endY, endCandle)
            }

            this._chart.addEventListener('mousedown', this.dragStartHandler)
            this._chart.addEventListener('mousemove', this.dragDuringHandler)
            this._chart.addEventListener('mouseup', this.dragCompletionHandler)
            
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

    let createHighlightBox = (parent, x, y, width, height, color="#ccf") => {
        let ns = parent.namespaceURI

        let box = document.createElementNS(ns, "rect")
        box.setAttribute("x", x)
        box.setAttribute("y", y)
        
        box.setAttribute("width", width)
        box.setAttribute("height", height)

        box.setAttribute("style", `
            fill: ${color};
            opacity: 50%;
            moz-opacity: 50%;
        `)

        parent.appendChild(box)
    }

    let mouseDragSelectCandlesStart = (candleChart, sX, sY, sCandle, x, y, candle, color="#ccf") => {

        if (!candleChart._chart) return candleChart, sX, sY, sCandle, x, y, candle

        let highlightBoxes = document.createElementNS(candleChart._chart.namespaceURI, "g")
        // let highlightNS = highlightBoxes.namespaceURI

        highlightBoxes.setAttribute('name', "highlightMouseDragDefault")

        let boxY = 0
        let height = candleChart._height
        let width = (candleChart._width) / candleChart._data.count
        let boxX = candleChart._candles.indexOf(sCandle) * width

        createHighlightBox(highlightBoxes, boxX, boxY, width * 1.1, height, color)
        
        candleChart._chart.appendChild(highlightBoxes)

        mouseDragSelectCandlesStart.highlightBoxes = highlightBoxes
        
        return candleChart, sX, sY, sCandle, x, y, candle
    }

    let mouseDragSelectCandlesDuring = (candleChart, sX, sY, sCandle, x, y, candle, color="#ccf") => {
        if (!candleChart._chart) return candleChart, sX, sY, sCandle, x, y, candle
        
        let highlightBoxes = mouseDragSelectCandlesStart.highlightBoxes

        let boxY = 0
        let height = candleChart._height
        let width = (candleChart._width) / candleChart._data.count
        
        let boxX = candleChart._candles.indexOf(candle) * width
        let startBoxX = candleChart._candles.indexOf(sCandle) * width

        if (!Math.floor(boxX - startBoxX)) return
        
        // let drawn = false

        highlightBoxes.innerHTML = ""

        const step = boxX < startBoxX ? width : -width

        for (let i = boxX; Math.abs(Math.floor(i - startBoxX)) > width / 2; i += step) {
            createHighlightBox(highlightBoxes, i, boxY, width * 1.1, height, color)
        }

        createHighlightBox(highlightBoxes, startBoxX, boxY, width * 1.1, height, color)
    }

    let mouseDragSelectCandlesCompletion = (candleChart, sX, sY, sCandle, x, y, candle, color="#ccf") => {
        if (!candleChart._chart) return candleChart, sX, sY, sCandle, x, y, candle


        // Delete selected candle boxes
        while (document.getElementsByName("highlightMouseDragDefault").length) // while loop dangerous! Find alternative in future references
            document.getElementsByName("highlightMouseDragDefault").forEach((el) => {
                candleChart._chart.removeChild(el)
            })
        

        return candleChart, sX, sY, sCandle, x, y, candle
    }


    let candle = {
        Chart: (width, height) => {
            if (!height || !width || height < 0 || width < 0)
                return null
            
            return new CandleChart(width, height)
        },
        mouseMoveShowPrices: mouseMoveShowPrices,
        setChartMouseDragDefault: (candleChart) => {
            candleChart.setMouseDrag({
                start: mouseDragSelectCandlesStart,
                during: mouseDragSelectCandlesDuring,
                completion: mouseDragSelectCandlesCompletion
            })
        },
        mouseDragSelectCandlesStart: mouseDragSelectCandlesStart,
        mouseDragSelectCandlesDuring: mouseDragSelectCandlesDuring,
        mouseDragSelectCandlesCompletion: mouseDragSelectCandlesCompletion,
    }

    return candle
})()