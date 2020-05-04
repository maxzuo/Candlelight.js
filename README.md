# Candlelight.js
Candlelight.js - a fast, lightweight library for drawing beautiful interactive stock charts for the web.

As of now, Candlelight.js is simply a pure ES6 library built for raw web apps. Support for React/Node will be in the works once current development for ES6 is stable.

## Usage
Include the `candlelight.js` file in the `<head></head>` section of your code, with the following line of code:
```html
<script src='candlelight.js'></script>
```

Candlelight can be accessed globally using the variable name `candle`. To instantiate a `CandleChart` object, run:
```javascript
candle.Chart(width, height)
```

`CandleChart`s have the following methods:
- `loadData(data)`. Where `data` is a `number[][]` in the format `[[High, Low, Open, Close], ...]`.
- `draw()`. Returns an `<svg>` object which is the rendered chart.

## Development
Current development is currently focused on:
- titles and axes.
- adding customizable interactiveness to these charts