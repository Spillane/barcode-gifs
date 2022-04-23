import { Canvas, createCanvas, loadImage } from 'canvas';
import { toCanvas } from 'qrcode';
import * as fs from 'fs';
import GifEncoder from 'gif-encoder';
import gm from 'gm';

interface Point {
  x: number;
  y: number;
}

interface Bound {
  topLeft: Point;
  width: number;
  height: number;
}

const CANVAS_W = 123;
const CANVAS_H = 123;

const PIXEL_SIZE = 3;
const RGB_SIZE = 4;
const BORDER_SIZE = 4;
const CORNER_MARKER_S = 8;
const STRIP_OFFSET = 6;
const QR_STRIP_SIZE = 24;
const MIDDLE_MARKER_S = 5;

const convert = function(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    gm(__dirname + path)
    .resize(CANVAS_W, CANVAS_H, '!')
    .write(__dirname + '/images/resized.gif', function (err) {
      if(err) reject(err);
      resolve(__dirname + '/images/resized.gif');
    })
  });
};

const getCanvasFromFrame = async function(path: string, frameNo: number): Promise<Canvas> {
  const framePath = await new Promise((resolve, reject) => {
    gm(path).write(__dirname + `/images/gif_frames/frame-${frameNo}.png`, function (err) {
      if(err) reject(err);
      resolve(__dirname + `/images/gif_frames/frame-${frameNo}.png`);
    });
  });

  const canvas = createCanvas(CANVAS_W, CANVAS_H);

  const image = await loadImage(framePath as string);

  const ctx = canvas.getContext('2d')
  
  ctx.drawImage(image, 0, 0, CANVAS_W, CANVAS_H);

  return canvas;
};

const generateFrame = async function(frameNo: number, gifPath: string): Promise<Canvas> {
  const overlayCtx = await (await getCanvasFromFrame(`${gifPath}[${frameNo}]`, frameNo)).getContext('2d');
  const canvas = createCanvas(CANVAS_W, CANVAS_H);
  toCanvas(canvas, 'https://youtu.be/LrBi4rX3TKg', { scale: 3, errorCorrectionLevel: 'H' });
  const WIDTH = canvas.width/PIXEL_SIZE;
  const HEIGHT = canvas.height/PIXEL_SIZE;
  const ctx = canvas.getContext('2d');
  const allowedPixels = [4*RGB_SIZE];
  const areasToNotTransform: Bound[] = [
    { topLeft: { x: 0, y: 0 }, width: BORDER_SIZE, height: HEIGHT },
    { topLeft: { x: 0, y: 0 }, width: WIDTH, height: BORDER_SIZE },
    { topLeft: { x: WIDTH - BORDER_SIZE, y: 0 }, width: BORDER_SIZE, height: HEIGHT },
    { topLeft: { x: 0, y: HEIGHT - BORDER_SIZE }, width: WIDTH, height: BORDER_SIZE },
    { topLeft: { x: BORDER_SIZE, y: BORDER_SIZE }, width: CORNER_MARKER_S, height: CORNER_MARKER_S },
    { topLeft: { x: WIDTH - BORDER_SIZE - CORNER_MARKER_S, y: BORDER_SIZE }, width: CORNER_MARKER_S, height: CORNER_MARKER_S },
    { topLeft: { x: BORDER_SIZE, y: HEIGHT - BORDER_SIZE - CORNER_MARKER_S }, width: CORNER_MARKER_S, height: CORNER_MARKER_S },
    { topLeft: { x: BORDER_SIZE + STRIP_OFFSET, y: BORDER_SIZE }, width: 1, height: HEIGHT },
    { topLeft: { x: BORDER_SIZE, y: BORDER_SIZE + STRIP_OFFSET }, width: WIDTH, height: 1 },
    { topLeft: { x: BORDER_SIZE + QR_STRIP_SIZE, y: BORDER_SIZE + QR_STRIP_SIZE }, width: MIDDLE_MARKER_S, height: MIDDLE_MARKER_S },
  ];
  
  for(var x = 0; x < canvas.width; x+=PIXEL_SIZE) {
    for(var y = 0; y < canvas.height; y+=PIXEL_SIZE) {
      if(!isInAnyBound(areasToNotTransform, { x, y })) {
        const imageData = ctx.getImageData(x, y, PIXEL_SIZE, PIXEL_SIZE);
        const overlayData = overlayCtx.getImageData(x, y, PIXEL_SIZE, PIXEL_SIZE).data;
        const data = imageData.data;
        for(var i = 0; i < data.length; i += RGB_SIZE) {
          if(!allowedPixels.includes(i)) {
            data[i] = overlayData[i];
            data[i + 1] = overlayData[i + 1];
            data[i + 2] = overlayData[i + 2];
          }
        }
        ctx.putImageData(imageData, x, y);
      }
    }
  }

  const out = fs.createWriteStream(__dirname + `/images/frames/frame-${frameNo}.png`);
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  out.on('finish', () =>  console.log('The PNG file was created.'));

  return canvas;
};

const isInAnyBound = function(bounds: Bound[], point: Point) {
  return bounds.some((bound) => isInBound(bound, point));
};

const isInBound = function(bound: Bound, point: Point) {
  return (
    point.x >= bound.topLeft.x*PIXEL_SIZE &&
    point.x < bound.topLeft.x*PIXEL_SIZE + bound.width*PIXEL_SIZE &&
    point.y >= bound.topLeft.y*PIXEL_SIZE &&
    point.y < bound.topLeft.y*PIXEL_SIZE + bound.height*PIXEL_SIZE
  );
};

const makeGif = async function() {
  const gifPath = await convert('/images/the_office.gif');

  var gif = new GifEncoder(123, 123);
  gif.setRepeat(50);
  var gifFile = require('fs').createWriteStream(__dirname + '/images/animated.gif');
  gif.pipe(gifFile);
  gif.writeHeader();
  
  for(var frameNo = 0; frameNo < 10; frameNo++) {
    const canvasFrame = await generateFrame(frameNo, gifPath);
    gif.addFrame(canvasFrame.getContext('2d').getImageData(0, 0, CANVAS_W, CANVAS_H).data);
  }
  
  gif.finish();
}

makeGif();