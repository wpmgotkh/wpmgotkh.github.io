import pluginMermaid from '@kevingimbel/eleventy-plugin-mermaid';
import { alert } from '@mdit/plugin-alert';
import tailwindcss from '@tailwindcss/postcss';
import cssnano from 'cssnano';
import fs from 'fs';
import MarkdownIt from 'markdown-it';
import path from 'path';
import postcss from 'postcss';

const markdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
});

export default function (eleventyConfig) {
  eleventyConfig.setLibrary('md', markdownIt);
  eleventyConfig.amendLibrary('md', (mdLib) => mdLib.use(alert));

  eleventyConfig.addPlugin(pluginMermaid);

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

  eleventyConfig.addPairedShortcode('block', (content, classes = '') => {
    return `<div class="${classes}">${markdownIt.render(content)}</div>`;
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
