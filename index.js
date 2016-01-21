'use strict';

import fs from 'fs';
import fsExtra from 'fs-extra';
import jsonFile from '@exponent/json-file';
import path from 'path';
import spawnAsync from '@exponent/spawn-async';

async function getContentsAsync(dir) {
  // { images:
  //  [ { idiom: 'universal', scale: '1x' },
  //    { idiom: 'universal', scale: '2x', filename: 'user_icon@2x.png' },
  //    { idiom: 'universal', scale: '3x', filename: 'user_icon@3x.png' } ],
  // info: { version: 1, author: 'xcode' } }
  let contents = new jsonFile(path.join(dir, 'Contents.json'));
  return await contents.readAsync();
}

async function processAssetsDirAsync(dir, outputDir) {
  let assetDirs = await fs.promise.readdir(dir);
  let awaitables = [];
  for (let assetDir of assetDirs) {
    // console.log("assetDir: ", assetDir);
    if (assetDir !== 'Contents.json') {
      awaitables.push(processOneAssetAsync(path.join(dir, assetDir), outputDir));
    }
  }
  return await Promise.all(awaitables);
}

async function copyContentsAsync(dir, outputDir, imagesetName) {
  let srcPath = path.join(dir, 'Contents.json');
  let destPath = path.join(outputDir, imagesetName + '.Contents.json');
  console.log("Copying Contents.json from " + srcPath + " -> " + destPath);
  return await fsExtra.promise.copy(srcPath, destPath);
}

async function processOneAssetAsync(dir, outputDir) {
  // console.log("processOneAssetAsync", dir, outputDir);
  let contents = await getContentsAsync(dir);
  let images = contents.images;
  // console.log("images = ", images);
  if (!images) {
    throw new Error("No images found in directory " + dir);
  }
  let awaitables = [];
  let imagesetName;
  try {
    imagesetName = getImagesetNameFromPath(dir);
  } catch (err) {
    return null;
  }
  awaitables.push(copyContentsAsync(dir, outputDir, imagesetName));
  for (let image of images) {
    if (image.filename) {
      let srcFilename = path.join(dir, image.filename);
      let ext = path.extname(image.filename);
      let outputFilename = path.join(outputDir, imagesetName + '@' + image.scale + ext);
      awaitables.push(copyAndOptimizePngAsync(srcFilename, outputFilename));
    } else {
      // console.warn("Image entry but no filename:", image, dir);
    }
  }

  await Promise.all(awaitables);

}

function getImagesetNameFromPath(pth) {
  let basename = path.basename(pth);
  if (!basename.match(/\.imageset$/)) {
    throw new Error("Not an .imageset: " + path);
  }
  return basename.replace(/\.imageset$/, '');
}

async function copyAndOptimizePngAsync(srcPath, destPath) {
  console.log("\t", path.basename(srcPath), " -> ", path.basename(destPath));
  await fsExtra.promise.copy(srcPath, destPath);
  await optimizePngAsync(destPath);
}

async function optimizePngAsync(path) {
  // console.log("optipng " + path);
  return await spawnAsync('optipng', ['-o','7', path]);
}

processAssetsDirAsync('/Users/ccheever/Dropbox/ListApp/listapp-ios/ListApp/ListApp/Images.xcassets', '/Users/ccheever/projects/xcasset-extractor/tmp').then(console.log, console.error);
// processOneAssetAsync(
// getContentsAsync('/Users/ccheever/Dropbox/ListApp/listapp-ios/ListApp/ListApp/Images.xcassets/user_icon.imageset').then(console.log, console.error);
