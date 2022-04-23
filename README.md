# barcode-gifs

Make a QR code with a gif embedded

## Getting Started

### Dependencies

* Uses the npm module gm which requires the following to be run
```
brew install imagemagick
brew install graphicsmagick
```

### Installing

```
npm install
```

### Executing program

* Change the URL in the `toCanvas` method call (Doesn't handle different sized QR codes atm but should handle youtube share links)
* Add the desired gif to the images folder and change the `convert` path
```
npm run generate
```
* Should generate a gif called `animated.gif` in the images folder