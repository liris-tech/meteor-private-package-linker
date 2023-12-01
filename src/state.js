import {getEnvPaths} from './update-env-paths.js';
import {
    computePrivatePackagesMetaData,
    setPrivatePackagesMetaDataByPackageName
} from './update-private-packages-meta-data.js';
import {
    registerFileWatcher,
    unregisterAllFileWatchers,
    unregisterFileWatcher
} from './update-file-watchers.js';
import {
    copyPackagesFromSrcToBuildAndLinkDeps,
    unlinkDepsFromPackages,
    unlinkDepsFromPackage,
    symLinkDepsIntoPackage
} from './update-links.js';

import {
    cleanupBuildDir,
    getPackageNamesWith,
    getPackageNames
}  from './utils.js';

import _ from 'lodash';

// =====================================================================================================================

export const STATE = {
    privatePackagesMetaData: {},
    fileWatchers: {},
    dotMeteorPackagesPath: '',
    privatePackagesSrcPath: '',
    privatePackagesBuildPath: '',

    params: {
      watcherOptions: {
          dotMeteorPackages() {
              return {
                  path: this.dotMeteorPackagesPath,
                  type: 'dotMeteorPackages',
                  eventTypes: ['change']
              }
          },
          singlePackageSrc(packageName) {
              return {
                  packageName,
                  path: this.privatePackagesMetaData[packageName].packageSrcPath,
                  type: 'singlePackageSrc',
                  chokidarOptions: {
                      ignoreInitial: true,
                      ignore: '**/packages',
                      followSymlinks: false
                  },
                  eventTypes: ['change']
              }
          },
          packagesSrc() {
              return {
                  path: this.privatePackagesSrcPath,
                  type: 'packagesSrcPath',
                  chokidarOptions: {
                      ignoreInitial: true,
                      ignore: '**/packages',
                      followSymlinks: false
                  },
                  eventTypes: ['add', 'unlink']
              }
          }
      }
    },

    init({paths={}} = {}) {
        if (!this.dotMeteorPackagesPath && !this.privatePackagesSrcPath && !this.privatePackagesBuildPath) {
            this.updateEnvPaths({op: 'init', paths})
        }
        cleanupBuildDir(this);
        this.updatePrivatePackagesMetaData({op: 'init'});
        this.updateLinks({op: 'init'});
        this.updateFileWatchers({op: 'init'});
    },

    updateEnvPaths({op, paths={}} = {}) {
        if (op === 'init') {
            const { dotMeteorPackagesPath, privatePackagesSrcPath, privatePackagesBuildPath } = getEnvPaths(paths);
            this.dotMeteorPackagesPath = dotMeteorPackagesPath;
            this.privatePackagesSrcPath = privatePackagesSrcPath;
            this.privatePackagesBuildPath = privatePackagesBuildPath;
        }
        else {
            throw new Error(`op ${op} not implemented for updatePaths method`)
        }
    },

    updatePrivatePackagesMetaData({op, selector={}, transform={}} = {}) {
        if (op === 'init') {
            this.privatePackagesMetaData = computePrivatePackagesMetaData(this);
        }
        else if (op === 'set') {
            if (_.isEqual(_.keys(selector), ['packageNames'])) {
                const packageNames = selector.packageNames ?? [];
                for (const packageName of packageNames) {
                    setPrivatePackagesMetaDataByPackageName(this.privatePackagesMetaData, packageNames, transform);
                }
            }
            else {
                throw new Error(`only {packageNames: ...} has been implemented as selector of op: ${op} in updatePrivatePackagesMetaData method`);
            }
        }
        else {
            throw new Error(`op ${op} not implemented for updatePrivatePackagesMetaData method`)
        }
    },

    updateFileWatchers({op, options={}}) {
        if (op === 'init') {
            unregisterAllFileWatchers(this.fileWatchers);

            registerFileWatcher(this.fileWatchers, this.params.watcherOptions.dotMeteorPackages.call(this));

            this.updateFileWatchers({
                op: 'register',
                options: {packageNames: getPackageNames(this.privatePackagesMetaData)}
            });

            registerFileWatcher(this.fileWatchers, this.params.watcherOptions.packagesSrc.call(this));
        }
        else if (op === 'register') {
            if (_.isEqual(_.keys(options), ['packageNames'])) {
                for (const packageName of options.packageNames) {
                    registerFileWatcher(
                        this.fileWatchers,
                        this.params.watcherOptions.singlePackageSrc.call(this, packageName)
                    );
                }
            }
            else {
                throw new Error(`options ${options} not supported for op: ${op} in updateFileWatchers`);
            }
        }
        else if (op === 'unregister') {
            if (_.isEqual(_.keys(options), ['packageNames'])) {
                for (const packageName of options.packageNames) {
                    unregisterFileWatcher(this.fileWatchers, this.privatePackagesMetaData[packageName].packageSrcPath);
                }
            }
            else {
                throw new Error(`options ${options} not supported for op: ${op} in updateFileWatchers`);
            }
        }
        else {
            throw new Error(`op ${op} not implemented for updateFileWatchers method`)
        }
    },

    updateLinks({op, packageNames, depNames }) {
        if (op === 'init') {
            copyPackagesFromSrcToBuildAndLinkDeps({
                packageNames: getPackageNamesWith(this.privatePackagesMetaData, {usedInProject: true}),
                privatePackagesMetaData: this.privatePackagesMetaData
            });
        }
        else if (op === 'link') {
            copyPackagesFromSrcToBuildAndLinkDeps({
                packageNames,
                privatePackagesMetaData: this.privatePackagesMetaData});
        }
        else if (op === 'unlink') {
            unlinkDepsFromPackages({
                packageNames,
                privatePackagesMetaData: this.privatePackagesMetaData});
        }
        else if (op === 'linkDeps') {
            const packageName = _.first(packageNames);
            symLinkDepsIntoPackage({ depNames, packageName, privatePackagesMetaData: this.privatePackagesMetaData });
        }
        else if (op === 'unlinkDeps') {
            const packageName = _.first(packageNames);
            unlinkDepsFromPackage({depNames, packageName, privatePackagesMetaData: this.privatePackagesMetaData});
        }
        else {
            throw new Error(`op ${op} not implemented for updateLinks method`)
        }
    }
};