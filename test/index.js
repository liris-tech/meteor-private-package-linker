import { testSrcDirSameAsBuildDir } from './test-src-dir-same-as-build-dir.js';
import { testSrcDirDifferentFromBuildDir } from './test-src-dir-different-from-build-dir.js';
import { actions } from './actions.js';
import { packagesFileStructures } from './constants.js';
import { nukeDir } from './utils.js';

import { makeFileStructure } from '@liris-tech/hidash';
import _ from "lodash";

import path from 'node:path';

// =====================================================================================================================

// 1. ------------------------------------------------------------------------------------------------------------------
// Testing the situation where the source dir of the private packages is the same as the build dir.
// This is the default setup of a Meteor project.

nukeDir('./playground');

makeFileStructure(
    ['playground', {dir: true},
        ['packages', {dir: true},
            ['A', {dir: true}, ...packagesFileStructures.packageA],
            ['B', {dir: true}, ...packagesFileStructures.packageB],
            ['C', {dir: true}, ...packagesFileStructures.packageC],
            ['D', {dir: true}, ...packagesFileStructures.packageD],
        ],
        ['.meteor', {dir: true},
            ['packages', {
                content: [
                    '# B this should not be taken into account because it is a comment',
                    'B neither should this',
                    'A # this should'
                ].join('\n')
            }]
        ]
    ]
);

const pathsSameDirs = {
    dotMeteorPackagesPath: path.join('playground', '.meteor', 'packages'),
    privatePackagesSrcPath: path.join('playground', 'packages'),
    privatePackagesBuildPath: path.join('playground', 'packages')
}

console.log(`\nTesting linker with same location for the packages source files and build files:
    - packages source files & build @ ${pathsSameDirs.privatePackagesSrcPath}\n`);

const testResultsSameDirs = await testSrcDirSameAsBuildDir(actions, pathsSameDirs);

logTestResults(testResultsSameDirs);


// 2. ------------------------------------------------------------------------------------------------------------------
// Testing the situation where the source dir of the private packages is separate from the build dir that Meteor uses to
// build those packages.
// This allows the developer to structure its private packages in a more natural way.

nukeDir('./playground');

makeFileStructure(
    ['playground', {dir: true},
        ['meteor-packages', {dir: true},
            ['domain-A-B', {dir: true}, // Notice that we can have intermediate dirs to organize the source code.
                ['A', {dir: true}, ...packagesFileStructures.packageA],
                ['B', {dir: true}, ...packagesFileStructures.packageB],
            ],
            ['domain-C-D', {dir: true},
                ['C', {dir: true}, ...packagesFileStructures.packageC],
                ['D', {dir: true}, ...packagesFileStructures.packageD],
            ]
        ],
        ['build', {dir: true}],
        ['.meteor', {dir: true},
            ['packages', {content: [
                    '# B this should not be taken into account because it is a comment',
                    'B neither should this',
                    'A # this should'
                ].join('\n')}]
        ]
    ]
);

const pathsDifferentDirs =  {
    dotMeteorPackagesPath: path.join('playground', '.meteor', 'packages'),
    privatePackagesSrcPath: path.join('playground', 'meteor-packages'), // These are the files that the dev works on.
    privatePackagesBuildPath: path.join('playground', 'build') // That's where the linker writes and symlinks files.
}

console.log(`\n\nTesting linker with different locations for the packages source files and build files:
    - packages source files @ ${pathsDifferentDirs.privatePackagesSrcPath}
    - packages build path @ ${pathsDifferentDirs.privatePackagesBuildPath}\n`);

const testResultsDifferentDirs = await testSrcDirDifferentFromBuildDir(actions, pathsDifferentDirs);

logTestResults(testResultsDifferentDirs);

// ---------------------------------------------------------------------------------------------------------------------

const allTestResults = testResultsSameDirs.concat(testResultsDifferentDirs);

console.log(`\nResult: ${_.filter(allTestResults, 'passed').length}/${allTestResults.length} tests passed!`);

// ---------------------------------------------------------------------------------------------------------------------

function logTestResults(testResults) {
    for (const testResult of testResults) {
        console.log(testResult.description);
        console.log(`\t=> ${testResult.passed ? 'OK' : 'FAILED'}`);
    }
}