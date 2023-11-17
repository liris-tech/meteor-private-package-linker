import { symLinkPackages } from '../utils/meteor-packages.js';

import _ from 'lodash';

import fs from 'node:fs';

// =====================================================================================================================

export function linkPrivatePackages(privatePackagesMetaData) {
    const usedPackages = _.filter(privatePackagesMetaData, v => v.usedInProject);

    for (const { packageSrcPath, packageBuildPath } of usedPackages) {
        if (packageSrcPath !== packageBuildPath) {
            fs.cpSync(packageSrcPath, packageBuildPath, {recursive: true});
        }
    }

    symLinkPackages(_.map(usedPackages, 'packageName'), privatePackagesMetaData);
}