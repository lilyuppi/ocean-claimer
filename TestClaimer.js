import { OceanClaimer } from "./OceanClaimer.js";
// // // Replace this with your seed phrase
const seedPhrase = "";

const oceanClaimer = new OceanClaimer(seedPhrase);
console.log(oceanClaimer.walletAddress);
await oceanClaimer.syncInfo();
// await oceanClaimer.autoClaim();
