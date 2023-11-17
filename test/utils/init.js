import fs from 'node:fs';
import path from 'node:path';


export function setupFakeMeteorProject(fakeProjectPath) {
    fs.mkdirSync(path.join('playground', 'fake-meteor-project', '.meteor'), {recursive: true});
}

setupFakeMeteorProject();