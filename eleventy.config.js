import fs from 'fs';
import path from 'path';

import tailwindcss from '@tailwindcss/postcss';
import cssnano from 'cssnano';
import postcss from 'postcss';

import { alert } from '@mdit/plugin-alert';

export default function (eleventyConfig) {
  eleventyConfig.amendLibrary('md', (mdLib) => mdLib.use(alert));

  eleventyConfig.addPassthroughCopy({
    'pages/names.json': 'names.json',
    'src/assets/js': 'assets/js',
  });

  eleventyConfig.on('eleventy.before', async () => {
    const tailwindInputPath = path.resolve('./src/assets/styles/index.css');

    const tailwindOutputPath = './dist/assets/styles/index.css';

    const cssContent = fs.readFileSync(tailwindInputPath, 'utf8');

    const outputDir = path.dirname(tailwindOutputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const result = await processor.process(cssContent, {
      from: tailwindInputPath,
      to: tailwindOutputPath,
    });

    fs.writeFileSync(tailwindOutputPath, result.css);
  });

  const processor = postcss([
    tailwindcss(),
    cssnano({
      preset: 'default',
    }),
  ]);

  return {
    dir: { includes: '/../src', input: 'pages', output: 'dist' },
  };
}
