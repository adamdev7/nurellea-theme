const path = require('path');
const sharp = require('sharp');

const src = 'C:/Users/adaml/.cursor/projects/c-Users-adaml-Downloads-Nurellea-Theme/assets';
const out = path.join(__dirname, '..', 'assets');

const jobs = [
  ['home-hero-scene.jpg', 'nl-home-hero', [1920, 960], 78],
  ['home-clouds.jpg', 'nl-home-clouds', [1920, 960], 70],
  ['home-gummy-splash.jpg', 'nl-home-splash', [900], 80],
  ['home-mascot-v2.jpg', 'nl-home-mascot', [600], 82],
  ['home-builder.jpg', 'nl-home-builder', [900, 480], 78],
  ['mush-lions-mane.jpg', 'nl-mush-lions-mane', [600], 80],
  ['mush-cordyceps.jpg', 'nl-mush-cordyceps', [600], 80],
  ['mush-reishi.jpg', 'nl-mush-reishi', [600], 80],
  ['mush-chaga.jpg', 'nl-mush-chaga', [600], 80],
  ['mush-shiitake.jpg', 'nl-mush-shiitake', [600], 80],
  ['mush-maitake.jpg', 'nl-mush-maitake', [600], 80],
  ['mush-tremella.jpg', 'nl-mush-tremella', [600], 80],
  ['mush-royal-sun.jpg', 'nl-mush-royal-sun', [600], 80],
  ['mush-white-button.jpg', 'nl-mush-white-button', [600], 80],
  ['mush-black-fungus.jpg', 'nl-mush-black-fungus', [600], 80],
  ['life-morning.jpg', 'nl-life-morning', [900, 480], 78],
  ['life-desk.jpg', 'nl-life-desk', [900, 480], 78],
  ['life-evening.jpg', 'nl-life-evening', [900, 480], 78],
  ['life-friends.jpg', 'nl-life-friends', [1100, 560], 78],
  ['life-portrait.jpg', 'nl-life-portrait', [900, 480], 78],
  ['life-walk.jpg', 'nl-life-walk', [900, 480], 78],
  ['life-kitchen.jpg', 'nl-life-kitchen', [900, 480], 78],
  ['life-hand.jpg', 'nl-life-hand', [700], 78],
  ['life-yoga.jpg', 'nl-life-yoga', [700], 78],
  ['compare-capsules.jpg', 'nl-compare-capsules', [360], 80],
  ['compare-mushroom-coffee.jpg', 'nl-compare-coffee', [360], 80],
];

const only = process.argv.slice(2);
if (only.length) jobs.splice(0, jobs.length, ...jobs.filter(([, name]) => only.includes(name)));

(async () => {
  for (const [file, name, widths, quality] of jobs) {
    for (const [i, w] of widths.entries()) {
      const suffix = i === 0 ? '' : `-${w}`;
      const dest = path.join(out, `${name}${suffix}.webp`);
      const info = await sharp(path.join(src, file)).resize({ width: w, withoutEnlargement: true }).webp({ quality }).toFile(dest);
      console.log(`${name}${suffix}.webp ${info.width}x${info.height} ${Math.round(info.size / 1024)}KB`);
    }
  }
})();
