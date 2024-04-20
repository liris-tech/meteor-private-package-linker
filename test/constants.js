// Description of the private packages file structure:
// There are 4 packages A, B, C, and D.
// A depends on both B and C.
// B depends on C.
// C depends on D.
// These dependencies are encoded in their package.js file (as per the Meteor specifications).
// Each of the packages contains some fake source code as well.
export const packagesFileStructures = {
    packageA: [
        ['package.js', {content: [
                'Package.describe({',
                '\tname: "A"',
                '});',
                '',
                'Package.onUse(function(api) {',
                '\tapi.use("B"); // some comment;',
                '\tapi.use("C");',
                '})'
            ].join('\n')}],
        ['src', {dir: true},
            ['index.js', {content: [
                    'const a=1;'
                ].join('\n')}]]
    ],
    packageB: [
        ['package.js', {content: [
                'Package.describe({',
                "\tname: 'B', // some other comment",
                '});',
                '',
                'Package.onUse(function(api) {',
                "\tapi.use('C');",
                '});'
            ].join('\n')}],
        ['entrypoint.js', {content: [
                'const b=2;'
            ].join('\n')}]
    ],
    packageC: [
        ['package.js', {content: [
                'Package.describe({',
                "\tname: 'C'",
                '});',
                '',
                'Package.onUse(function(api) {',
                "\tapi.use('D');",
                '});'
            ].join('\n')}],
        ['src.js', {content: [
                'const c=3;'
            ].join('\n')}]
    ],
    packageD: [
        ['package.js', {content: [
                'Package.describe({',
                "\tname: 'D'",
                '});'
            ].join('\n')}],
        ['D.js', {content: [
                'const d=4;'
            ].join('\n')}]
    ]
};


// The following nested file structure describes the packages after having been built.
// Each package recursively contains its dependencies in a 'packages' subdirectory.
export const buildFileStructure = [
    ['A', {dir: true},
        ...packagesFileStructures.packageA,
        ['packages', {dir: true},
            ['B', {dir: true},
                ...packagesFileStructures.packageB,
                ['packages', {dir: true},
                    ['C', {dir: true},
                        ...packagesFileStructures.packageC,
                        ['packages', {dir: true},
                            ['D', {dir: true},
                                ...packagesFileStructures.packageD
                            ]
                        ]
                    ]
                ]
            ],
            ['C', {dir: true},
                ...packagesFileStructures.packageC,
                ['packages', {dir: true},
                    ['D', {dir: true},
                        ...packagesFileStructures.packageD
                    ]
                ]
            ]
        ]
    ],
    ['B', {dir: true},
        ...packagesFileStructures.packageB,
        ['packages', {dir: true},
            ['C', {dir: true},
                ...packagesFileStructures.packageC,
                ['packages', {dir: true},
                    ['D', {dir: true},
                        ...packagesFileStructures.packageD
                    ]
                ]
            ]
        ]
    ],
    ['C', {dir: true},
        ...packagesFileStructures.packageC,
        ['packages', {dir: true},
            ['D', {dir: true},
                ...packagesFileStructures.packageD
            ]
        ]
    ],
    ['D', {dir: true},
        ...packagesFileStructures.packageD
    ]
];

// Amount of time to wait between initiating file system changes and testing their result.
export const waitInMs = 50;