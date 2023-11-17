import { getPackageNames} from '../utils/meteor-packages.js';

import { getSubDirs } from '../utils/getSubDirs.js';

import fs from 'node:fs';
import path from 'node:path';

// =====================================================================================================================

export function cleanupPrivatePackages(privatePackagesMetaData, privatePackagesSrcPath, privatePackagesBuildPath) {
    if (privatePackagesSrcPath === privatePackagesBuildPath) {
        for (const packageName of getPackageNames(privatePackagesMetaData)) {
            const packageMetaData = privatePackagesMetaData[packageName];
            const buildPath = path.join(packageMetaData.packageSrcPath, 'packages');
            if (fs.existsSync(buildPath)) {
                fs.rmSync(path.join(packageMetaData.packageSrcPath, 'packages'), {recursive: true});
            }
        }
    }
    else {
        for (const subDir of getSubDirs(privatePackagesBuildPath)) {
            fs.rmSync(subDir, {recursive: true});
        }
    }
}