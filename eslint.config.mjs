import { sync } from 'globby';
import { dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import shared from './eslint.shared.config.mjs';

const __filename = fileURLToPath(import.meta.url);
// __dirname is not defined in ES module scope
const __dirname = dirname(__filename);

/**
 * Add a prefix to a path glob
 * @param {string} prefix
 * @param {string | undefined} pathGlob
 * @returns {string}
 */
const addPrefix = (prefix, pathGlob = '**/*') => pathGlob.replace(/^(!?)(\.?\/)?/, `$1${prefix}/`);

/**
 * Merge ESLint config
 * @param {string | string[]} globs List of globs to findpath ESLint config
 * @returns {Promise<import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigArray>}
 */
const mergeESLintConfigs = async (globs) => {
  const localConfigFiles = sync(globs, { absolute: true });
  /** @type {import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigArray} */
  let localConfigs = [];
  for (const localConfigFile of localConfigFiles) {
    const module = await import(localConfigFile);
    const moduleConfig = await (module.default ?? module);
    /** @type {import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigArray} */
    const configArray = Array.isArray(moduleConfig) ? moduleConfig : [moduleConfig];
    const directory = relative(__dirname, dirname(localConfigFile));
    /**
     * Add the directory as prefix to the glob
     * @param {string} pathGlob
     * @returns {string}
     */
    const addDirectoryFn = (pathGlob) => addPrefix(directory, pathGlob);
    localConfigs = localConfigs.concat(
      configArray.map((config) => ({
        ...config,
        files: (config.files || ['**/*']).flat().map(addDirectoryFn),
        ...(
          config.ignores
            ? { ignores: config.ignores.map(addDirectoryFn) }
            : {}
        )
      }))
    );
  }

  return [
    ...shared,
    ...localConfigs
  ];
};

// eslint-disable-next-line unicorn/prefer-top-level-await
export default mergeESLintConfigs('**/eslint.local.config.mjs');
