import { copyFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const webDir = join(root, 'www-ios');
// Keep the production HTML and its relative URLs byte-for-byte. Add new runtime
// paths here when the root game gains assets, including paths generated in JS.
const entryFiles = [
  'index.html', 'style.css', 'level-select.css', 'startpage-motion.js', 'ui-state.js',
  'rice-audio.js', 'soundtrack.js', 'audio-studio.js', 'ui-audio.js', 'game.js', 'level-select.js',
];
const assets = {
  'assets/audio': ['rice-rice-baby.mp3'],
  'assets/fonts': ['IBMPlexMono-Regular.ttf', 'IBM-Plex-Mono-OFL.txt'],
  'assets/game/environment': ['plate.png'],
  'assets/game/rice': ['formed.png'],
  'assets/level1': [
    'imgBlackSmoke2.png',
    'imgImage1.png',
    'imgImage4.png',
    'imgImage5.png',
    'imgMachineNormal1.png',
    'imgRiceBefore1.png',
    'imgRiceInaccurate1.png',
    'imgRiceShaped1.png',
    'imgSpongeNormal1.png',
    'imgSpongeSqueezed1.png',
    'imgWaterDrops2.png',
    'table.png',
  ],
  'assets/ui/elements/branding': ['logo-321-serve.svg', 'start-art-original.webp'],
  'assets/ui/elements/buttons': ['pause.svg'],
  'assets/ui/elements/buttons/unified': [
    'back.svg',
    'cancel.svg',
    'got-it.svg',
    'home-pause.svg',
    'home-result.svg',
    'quit.svg',
    'restart.svg',
    'resume.svg',
    'retry.svg',
    'select-level.svg',
    'settings-gear.svg',
    'start.svg',
  ],
  'assets/ui/elements/countdown': ['3.svg', '2.svg', '1.svg'],
  'assets/ui/elements/decorations': ['celebration-left.svg', 'celebration-right.svg'],
  'assets/ui/elements/feedback': ['on-beat.svg', 'too-early.svg', 'too-late.svg'],
  'assets/ui/elements/labels': ['progress-will-be-lost.svg'],
  'assets/ui/elements/modals': ['panel-base.svg'],
  'assets/ui/elements/result': ['label-on-beat.svg'],
  'assets/ui/elements/settings': ['label-music.svg', 'label-sfx.svg'],
  'assets/ui/elements/titles': ['nice-cuts.svg', 'paused.svg', 'quit-game.svg', 'settings.svg'],
  'assets/ui/elements/tutorial': ['listen-then-tap-card.svg'],
  'assets/ui/startpage-motion': [
    'background.png',
    'salmon-red.png',
    'egg.png',
    'salmon-orange.png',
    'clock-hands.png',
    'accent.png',
  ],
  'assets/ui/elements/result/percentages': Array.from({ length: 101 }, (_, score) =>
    String(score).padStart(3, '0') + '.svg'),
  'assets/ui/level-select': [1, 2, 3, 4].flatMap(level => [
    'level-' + level + '.svg', 'title-' + level + '.svg',
  ]),
};

await rm(webDir, { recursive: true, force: true });
const files = [...entryFiles, ...Object.entries(assets).flatMap(([dir, names]) =>
  names.map(name => join(dir, name)))];
for (const file of files) {
  const destination = join(webDir, file);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(root, file), destination);
}
console.log('Staged ' + files.length + ' web files for iOS.');
