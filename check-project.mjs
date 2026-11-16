import {readFileSync} from 'node:fs';
const expected=JSON.parse(readFileSync(new URL('./.firebaserc',import.meta.url),'utf8')).projects.default;
const actual=process.env.GCLOUD_PROJECT||process.env.FIREBASE_PROJECT;
if(actual!==expected){console.error(`Deploy refused: expected ${expected}, received ${actual||'no explicit project'}. Pass --project ${expected}.`);process.exit(1);}
console.log(`Verified deployment project: ${actual}`);
