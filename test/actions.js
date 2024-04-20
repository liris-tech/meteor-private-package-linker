import { getPathOfPackage } from './utils.js';
import { main } from '../src/main.js';

import path from 'node:path';
import fs from 'node:fs';

// =====================================================================================================================

// These are the changes done to the file system for which we want to run the tests.
// We test whether the meteor-linker has the right response (symlink-ing files etc.) to these file changes below.
export const actions = {
    '1. building the sources': (paths) => {
        // calling the linker via main(). We expect it to copy the meteor packages from src to build directory
        // (if different) and symlink them according to their dependency topology:
        // A -> B -> C -> D
        // | -> C -> D
        return main(['--watch'], paths);
    },
    '2. Commenting useless line in .meteor/packages': (paths) => {
        const dotMeteorPackagesWithUselessLineCommented = [
            '# B this should not be taken into account because it is a comment',
            '# B neither should this', // CHANGE: commented this line
            'A # this should'
        ].join('\n');
        fs.writeFileSync(paths.dotMeteorPackagesPath, dotMeteorPackagesWithUselessLineCommented);
    },
    '3. Commenting package A in .meteor/packages': (paths) => {
        const dotMeteorPackagesWithPackageACommented = [
            '# B this should not be taken into account because it is a comment',
            '# B neither should this',
            '# A # this should' // CHANGE: commented package A
        ].join('\n');
        fs.writeFileSync(paths.dotMeteorPackagesPath, dotMeteorPackagesWithPackageACommented);
    },
    '4. Restoring package A in .meteor/packages': (paths) => {
        const dotMeteorPackagesAsInitially = [
            '# B this should not be taken into account because it is a comment',
            '# B neither should this',
            'A # this should'
        ].join('\n');
        fs.writeFileSync(paths.dotMeteorPackagesPath, dotMeteorPackagesAsInitially);
    },
    '5. Changing dependencies of package A. Removing package B': (paths) => {
        const packageDotJsOfA = [
            'Package.describe({',
            '\tname: "A"',
            '});',
            '',
            'Package.onUse(function(api) {',
            '//\tapi.use("B"); // some comment;', // CHANGE: commented dependency on package B
            '\tapi.use("C");',
            '})'
        ].join('\n');
        const pathToPackageDotJsOfA = path.join(getPathOfPackage('A', paths), 'package.js');
        fs.writeFileSync(pathToPackageDotJsOfA, packageDotJsOfA);

        return {packageDotJsOfA, pathToPackageDotJsOfA};
    },
    '6. Changing source file in package B': (paths) => {
        const sourceFileInB = 'const b=42;';
        const pathToSourceFileInB = path.join(getPathOfPackage('B', paths), 'entrypoint.js');
        fs.writeFileSync(pathToSourceFileInB, sourceFileInB);

        return {sourceFileInB, pathToSourceFileInB};
    },
    '7. Changing source file in package C': (paths) => {
        const sourceFileInC = 'const c=42;';
        const pathToSourceFileInC = path.join(getPathOfPackage('C', paths), 'src.js');
        fs.writeFileSync(pathToSourceFileInC, sourceFileInC);

        return { sourceFileInC, pathToSourceFileInC };
    },
    '8. Changing dependencies of package A. Restoring package B': (paths) => {
        const originalPackageDotJsOfA = [
            'Package.describe({',
            '\tname: "A"',
            '});',
            '',
            'Package.onUse(function(api) {',
            '\tapi.use("B"); // some comment;',
            '\tapi.use("C");',
            '})'
        ].join('\n');
        const pathToPackageDotJsOfA = path.join(getPathOfPackage('A', paths), 'package.js');
        const pathToSourceFileInB = path.join(getPathOfPackage('B', paths), 'entrypoint.js');
        const pathToSourceFileInC = path.join(getPathOfPackage('C', paths), 'src.js');

        fs.writeFileSync(pathToPackageDotJsOfA, originalPackageDotJsOfA);
        fs.writeFileSync(pathToSourceFileInB, 'const b=2;');
        fs.writeFileSync(pathToSourceFileInC, 'const c=3;');

        return { pathToPackageDotJsOfA, pathToSourceFileInB, pathToSourceFileInC };
    },
    '9. Adding a new source file to C': (paths) => {
        const addedSourceFileInC = 'const newSourceFile=true;';
        const pathToAddedSourceFileInC = path.join(getPathOfPackage('C', paths), 'new-src.js');
        fs.writeFileSync(pathToAddedSourceFileInC, addedSourceFileInC);

        return { addedSourceFileInC, pathToAddedSourceFileInC };
    },
    '10. Removing the new source file from C': (paths) => {
        fs.rmSync(path.join(getPathOfPackage('C', paths), 'new-src.js'));
    },
    '11. Renaming package B to Z': (paths) => {
        const packageDotJsOfB = [
            'Package.describe({',
            "\tname: 'Z', // some other comment", // CHANGE: name of package B -> Z
            '});',
            '',
            'Package.onUse(function(api) {',
            "\tapi.use('C');",
            '});'
        ].join('\n');
        const pathToPackageDotJsOfB = path.join(getPathOfPackage('B', paths), 'package.js');
        fs.writeFileSync(pathToPackageDotJsOfB, packageDotJsOfB);

        return { packageDotJsOfB, pathToPackageDotJsOfB };
    },
    '12. Changing dependencies of package A. Adding package Z': (paths) => {
        const packageDotJsOfAWithZ = [
            'Package.describe({',
            '\tname: "A"',
            '});',
            '',
            'Package.onUse(function(api) {',
            '\tapi.use("Z"); // some comment;', // CHANGE: adding package Z as dependency
            '\tapi.use("C");',
            '})'
        ].join('\n');
        const pathToPackageDotJsOfA = path.join(getPathOfPackage('A', paths), 'package.js');
        fs.writeFileSync(pathToPackageDotJsOfA, packageDotJsOfAWithZ);

        return { packageDotJsOfAWithZ }
    },
    '13. Renaming directory B to Z': (paths) => {
        const pathToDirectoryOfB = getPathOfPackage('B', paths);
        const pathToDirectoryOfZ = path.join(path.dirname(pathToDirectoryOfB), 'Z');
        fs.renameSync(pathToDirectoryOfB, pathToDirectoryOfZ);

        return { pathToDirectoryOfB, pathToDirectoryOfZ };
    },
    '14. Renaming source file in C': (paths) => {
        const pathToSourceFileInC = path.join(getPathOfPackage('C', paths), 'src.js');
        const pathToRenamedSourceFileInC = path.join(getPathOfPackage('C', paths), 'src-renamed.js');
        fs.renameSync(pathToSourceFileInC, pathToRenamedSourceFileInC);

        return { pathToSourceFileInC, pathToRenamedSourceFileInC };
    }
}
