import { init, parse } from '@umijs/bundler-utils/compiled/es-module-lexer';
import { Loader, transformSync } from '@umijs/bundler-utils/compiled/esbuild';
import { winPath } from '@umijs/utils';
import MagicString from 'magic-string';
import { extname } from 'path';
import type { IApi } from '../types';

export async function parseModule(opts: { content: string; path: string }) {
  let content = opts.content;

  if (opts.path.endsWith('.tsx') || opts.path.endsWith('.jsx')) {
    content = transformSync(content, {
      loader: extname(opts.path).slice(1) as Loader,
      format: 'esm',
    }).code;
  }

  await init;
  return [content, parse(content)] as const;
}

/**
 * import/export/await-import/require match regular expression
 *
 * WHY: REGEXP
 * ref: https://github.com/umijs/umi-next/pull/230
 *
 * TODO: more choices
 * 1. fork es-module-lexer, support jsx
 * 2. use sourcemap of esbuild
 */

export function slash(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * transform absolute import/export/await-import/require path
 * @note  use to vite can deps:
 *        transform to relative path for .umi dir imports
 *        prefix `@fs` for node_modules imports
 */
export default async function transformIEAR(
  { content, path }: { content: string; path: string },

  api: IApi,
) {
  // console.log('path: ', path);

  try {
    const [code, [imports, exports]] = await parseModule({
      content,
      path,
    });

    const ms = new MagicString(code);

    [...imports, ...exports].forEach((item) => {
      if (typeof item === 'string') {
      } else {
        if (path.includes('umi.ts')) {
          console.log('imports: ', item);
        }

        ms.overwrite(item.s, item.e, winPath(ms.slice(item.s, item.e)));
      }
    });

    return ms.toString();
  } catch (err) {
    console.log('err: ', err.errors);
    console.log('err path', path);
    return content;
  }

  // return content.replace(IEAR_REG_EXP, (_, prefix, quote, absPath) => {
  //   if (absPath.startsWith(api.paths.absTmpPath)) {
  //     // transform .umi absolute imports
  //     absPath = winPath(relative(dirname(path), absPath)).replace(
  //       // prepend ./ for same or sub level imports
  //       /^(?!\.\.\/)/,
  //       './',
  //     );
  //   } else if (isDepPath(absPath)) {
  //     // transform node_modules absolute imports
  //     // why @fs
  //     // 由于我们临时文件下大量绝对路径的引用，而绝对路径的引用不会被 Vite 预编译
  //     absPath = `@fs${absPath}`;
  //   }

  //   return `${prefix}${quote}${absPath}${quote}`;
  // });
}
