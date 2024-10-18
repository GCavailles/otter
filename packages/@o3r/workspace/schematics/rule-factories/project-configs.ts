import * as path from 'node:path';
import * as ts from 'typescript';
import { findConfigFileRelativePath } from '@o3r/schematics';
import type { Rule } from '@angular-devkit/schematics';

/**
 * Update the tsconfig generated by the Angular generators
 * extends the base tsconfig
 * force the outDir to ./dist
 * update input compiler files if needed
 * @param targetPath
 * @param tsconfigName
 * @param options
 */
export function updateProjectTsConfig(targetPath: string, tsconfigName: string, options = {updateInputFiles: false}): Rule {
  return (tree, context) => {
    const tsconfigPath = path.posix.join(targetPath, tsconfigName);
    if (!tree.exists(tsconfigPath)) {
      context.logger.warn(`The file ${tsconfigPath} was not found, the update will not be applied`);
      return tree;
    }

    const tsconfig = ts.parseConfigFileTextToJson(tsconfigPath, tree.readText(tsconfigPath));
    if (!tsconfig || !tsconfig.config) {
      context.logger.error(`Error parsing ${tsconfigPath}, the update will not be applied`, tsconfig?.error as any);
      return tree;
    }

    if (options?.updateInputFiles) {
      tsconfig.config = Object.fromEntries(Object.entries(tsconfig.config).filter(([propName, _]) => propName !== 'files'));
      tsconfig.config.exclude = ['**/*.spec.ts', '**/fixture/', '**/*.fixture.ts', '**/fixtures.ts'];
      tsconfig.config.include = ['./src/**/*.ts'];
    }
    const baseTsConfig = findConfigFileRelativePath(tree, ['tsconfig.base.json', 'tsconfig.json'], targetPath);
    if (baseTsConfig) {
      tsconfig.config.extends = baseTsConfig;
    }

    tsconfig.config.compilerOptions ||= {};
    tsconfig.config.compilerOptions.outDir = './dist';
    tree.overwrite(tsconfigPath, JSON.stringify(tsconfig.config, null, 2));
    return tree;
  };
}

