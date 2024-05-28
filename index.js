import blessed from "blessed";
import contrib from "blessed-contrib";
import { OceanClaimer } from "./OceanClaimer.js";
import { readExcelFile } from "./utils.js";

// Replace your file path here
const filePath = "/Users/lilyuppi/Documents/WaveWallet.xlsx";

const screen = blessed.screen();
const table = contrib.table({
  keys: true,
  fg: "white",
  selectedFg: "white",
  selectedBg: "blue",
  interactive: true,
  label: "Ocean Claimer",
  width: "100%",
  height: "100%",
  border: { type: "line", fg: "cyan" },
  columnWidth: [5, 80, 10, 10, 5, 5, 7, 30, 30, 30],
});
table.focus();
screen.append(table);
screen.key(["escape", "q", "C-c"], function (ch, key) {
  return process.exit(0);
});
const headersConsole = [
  "ID",
  "WalletAddress",
  "SUI",
  "OCEAN",
  "Boat",
  "Mesh",
  "SeaFood",
  "LastClaimed",
  "NextClaimable",
  "Message",
];
const dataConsole = [];
function renderTable() {
  table.setData({
    headers: headersConsole,
    data: dataConsole.map((row) => {
      return [
        row.id,
        row.walletAddress,
        row.SUIBalance,
        row.oceanBalance,
        row.boat,
        row.mesh,
        row.seafood,
        row.lastClaimed,
        row.nextClaimable,
        row.message,
      ];
    }),
  });
}
renderTable();

function updateLog(rowIndex, updates) {
  if (dataConsole[rowIndex] === undefined) {
    dataConsole[rowIndex] = {
      id: "",
      walletAddress: "",
      SUIBalance: "",
      oceanBalance: "",
      boat: "",
      mesh: "",
      seafood: "",
      lastClaimed: "",
      nextClaimable: "",
      message: "",
    };
  }
  const row = dataConsole[rowIndex];
  Object.keys(updates).forEach((key) => {
    if (row.hasOwnProperty(key)) {
      row[key] = updates[key];
    }
  });
  renderTable();
  screen.render();
}

const oceanClaimers = new Map();
async function process(id, idx, seedPhrase) {
  const oceanClaimer = new OceanClaimer(seedPhrase);
  oceanClaimers.set(oceanClaimer.walletAddress, oceanClaimer);
  updateLog(id, {
    id: idx,
    walletAddress: oceanClaimer.walletAddress,
    message: "Syncing...",
  });
  oceanClaimer.eventEmitter.on("synced", async (data) => {
    updateLog(id, {
      boat: data.boat,
      mesh: data.mesh,
      seafood: data.seafood,
      lastClaimed: data.humanLastClaimed,
      nextClaimable: data.humanNextClaimable,
      message: "Wait for next claimable!",
    });
    const SUIBalance = await oceanClaimer.getSUIBalance();
    updateLog(id, {
      SUIBalance: Number(SUIBalance / 1000000000).toFixed(2),
    });
    const oceanBalance = await oceanClaimer.getOceanBalance();
    updateLog(id, {
      oceanBalance: Number(oceanBalance / 1000000000).toFixed(2),
    });
  });
  oceanClaimer.eventEmitter.on("claiming", (data) => {
    updateLog(id, {
      message: "Claiming...",
    });
  });
  oceanClaimer.eventEmitter.on("claimSuccess", (data) => {
    updateLog(id, {
      message: "Claimed!",
    });
  });
  oceanClaimer.eventEmitter.on("claimError", (data) => {
    updateLog(id, {
      message: data.error,
    });
  });
  oceanClaimer.eventEmitter.on("remainingTimeToClaimChanged", (data) => {
    updateLog(id, {
      message: "Next claimable " + data.remainingTimeToClaim,
    });
  });
  await oceanClaimer.syncInfo();
  oceanClaimer.autoClaim();
}

const data = readExcelFile(filePath);
for (let i = 0; i < data.length; i++) {
  const idx = data[i]["IDX"];
  const seedPhrase = data[i]["Seedphrase"];
  process(i, idx, seedPhrase);
}

// const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// while (true) {
//   await sleep(1000 * 60);
// }
screen.render();
