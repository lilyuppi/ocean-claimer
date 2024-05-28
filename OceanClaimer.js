import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import Moment from "moment/moment.js";
import EventEmitter from "node:events";

const USER_FIELD_OBJECT_ID =
  "0x4846a1f1030deffd9dea59016402d832588cf7e0c27b9e4c1a63d2b5e152873a";
const PACKAGE_OBJECT_ID =
  "0x2c68443db9e8c813b194010c11040a3ce59f47e4eb97a2ec805371505dad7459";
const MODULE_NAME = "game";
const GAME_INFO = {
  gasFee: 3000,
  initReward: "1000000000",
  ref1: 2000,
  ref2: 500,
  boatLevel: [
    {
      fishing_time: 20000,
      price_upgrade: "20000000000",
    },
    {
      fishing_time: 30000,
      price_upgrade: "40000000000",
    },
    {
      fishing_time: 40000,
      price_upgrade: "60000000000",
    },
    {
      fishing_time: 60000,
      price_upgrade: "100000000000",
    },
    {
      fishing_time: 120000,
      price_upgrade: "160000000000",
    },
    {
      fishing_time: 240000,
      price_upgrade: "320000000000",
    },
  ],
  meshLevel: [
    {
      price_upgrade: "20000000000",
      speed: 10000,
    },
    {
      price_upgrade: "100000000000",
      speed: 15000,
    },
    {
      price_upgrade: "200000000000",
      speed: 20000,
    },
    {
      price_upgrade: "400000000000",
      speed: 25000,
    },
    {
      price_upgrade: "2000000000000",
      speed: 30000,
    },
    {
      price_upgrade: "4000000000000",
      speed: 50000,
    },
  ],
  fishTypeLevel: [
    {
      rate: 10000,
    },
    {
      rate: 12500,
    },
    {
      rate: 15000,
    },
    {
      rate: 17500,
    },
    {
      rate: 20000,
    },
    {
      rate: 25000,
    },
  ],
  specialBoost: [],
  seafoodInfos: [
    {
      enable: false,
      level: 0,
      price: "1000000000",
    },
    {
      enable: true,
      level: 1,
      price: "1000000000",
    },
    {
      enable: true,
      level: 2,
      price: "1000000000",
    },
    {
      enable: true,
      level: 3,
      price: "2000000000",
    },
    {
      enable: true,
      level: 4,
      price: "3000000000",
    },
    {
      enable: true,
      level: 5,
      price: "5000000000",
    },
  ],
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class ClaimerEventEmitter extends EventEmitter {}

class OceanClaimer {
  #client = new SuiClient({ url: getFullnodeUrl("mainnet") });
  #keypair;
  #walletAddress;
  #boat;
  #mesh;
  #seafood;
  #lastClaimed;
  #nextClaimable;
  #remainingTimeToClaim;
  #autoClaim = true;
  #timerClaim;
  #timerUpdateRemainingTime;
  #eventEmitter = new ClaimerEventEmitter();
  constructor(seedPhrase) {
    this.#keypair = Ed25519Keypair.deriveKeypair(seedPhrase);
    this.#walletAddress = this.#keypair.getPublicKey().toSuiAddress();
  }

  get walletAddress() {
    return this.#walletAddress;
  }

  getSUIBalance = async () => {
    const { totalBalance } = await this.#client.getBalance({
      owner: this.#walletAddress,
      coinType: "0x2::sui::SUI",
    });
    return totalBalance;
  };

  getOceanBalance = async () => {
    const { totalBalance } = await this.#client.getBalance({
      owner: this.#walletAddress,
      coinType:
        "0xa8816d3a6e3136e86bc2873b1f94a15cadc8af2703c075f2d546c2ae367f4df9::ocean::OCEAN",
    });
    return totalBalance;
  };

  get eventEmitter() {
    return this.#eventEmitter;
  }

  getNextClaimable(lastTimeClaimed, units) {
    // Ocean define 20000 unit = 2 hours, we divide by 10000 to find hours
    const hours = units / 10000;
    const milliseconds = hours * 60 * 60 * 1000;
    // Add the milliseconds to the given date
    const nextTimeClamable = new Date(lastTimeClaimed + milliseconds);
    return nextTimeClamable.getTime();
  }

  syncInfo = async () => {
    const result = await this.#client.getDynamicFieldObject({
      parentId: USER_FIELD_OBJECT_ID,
      name: {
        type: "address",
        value: this.#walletAddress,
      },
    });
    // console.log(result);
    if (result?.data?.content?.fields) {
      const fields = result.data.content.fields;
      this.#boat = fields.boat;
      this.#mesh = fields.mesh;
      this.#seafood = fields.seafood;
      this.#lastClaimed = parseInt(fields.last_claim);
      if (this.#lastClaimed) {
        this.#nextClaimable = this.getNextClaimable(
          this.#lastClaimed,
          GAME_INFO.boatLevel[this.#boat].fishing_time
        );
        this.#remainingTimeToClaim = this.#nextClaimable - Date.now();
      } else {
        this.#nextClaimable = -1;
      }
      // console.table({
      //   address: this.#walletAddress,
      //   boat: this.#boat,
      //   mesh: this.#mesh,
      //   seafood: this.#seafood,
      //   lastClaimed: this.#lastClaimed,
      //   nextClaimable: this.#nextClaimable,
      //   remainingTimeToClaim: this.#remainingTimeToClaim,
      //   humanLastClaimed: new Date(this.#lastClaimed).toLocaleString("en-US", {
      //     timeZone: "Asia/Bangkok",
      //   }),
      //   humanNextClaimable: new Date(this.#nextClaimable).toLocaleString(
      //     "en-US",
      //     { timeZone: "Asia/Bangkok" }
      //   ),
      //   humanRemainingTimeToClaim: new Moment(this.#nextClaimable).fromNow(),
      // });
      this.#eventEmitter.emit("synced", {
        address: this.#walletAddress,
        boat: this.#boat,
        mesh: this.#mesh,
        seafood: this.#seafood,
        lastClaimed: this.#lastClaimed,
        nextClaimable: this.#nextClaimable,
        remainingTimeToClaim: this.#remainingTimeToClaim,
        humanLastClaimed: new Date(this.#lastClaimed).toLocaleString("en-US", {
          timeZone: "Asia/Bangkok",
        }),
        humanNextClaimable: new Date(this.#nextClaimable).toLocaleString(
          "en-US",
          { timeZone: "Asia/Bangkok" }
        ),
        humanRemainingTimeToClaim: new Moment(this.#nextClaimable).fromNow(),
      });
      return {
        boat: this.#boat,
        mesh: this.#mesh,
        seafood: this.#seafood,
        lastClaimed: this.#lastClaimed,
        nextClaimable: this.#nextClaimable,
        remainingTimeToClaim: this.#remainingTimeToClaim,
        humanLastClaimed: new Date(this.#lastClaimed).toLocaleString("en-US", {
          timeZone: "Asia/Bangkok",
        }),
        humanNextClaimable: new Date(this.#nextClaimable).toLocaleString(
          "en-US",
          { timeZone: "Asia/Bangkok" }
        ),
        humanRemainingTimeToClaim: new Moment(this.#nextClaimable).fromNow(),
      };
    }
    return null;
  };

  claimable() {
    return this.#nextClaimable < Date.now();
  }

  claim = async () => {
    if (this.claimable()) {
      this.#eventEmitter.emit("claiming", {
        address: this.#walletAddress,
      });
      const tx = new TransactionBlock();
      const functionName = "claim";
      // Add a Move call to claim the ocean
      tx.moveCall({
        target: `${PACKAGE_OBJECT_ID}::${MODULE_NAME}::${functionName}`,
        arguments: [
          tx.object(
            "0x4846a1f1030deffd9dea59016402d832588cf7e0c27b9e4c1a63d2b5e152873a"
          ),
          tx.object(
            "0x0000000000000000000000000000000000000000000000000000000000000006"
          ),
        ],
      });
      tx.setSender(this.#walletAddress);
      // Sign and execute the transaction
      try {
        const result = await this.#client.signAndExecuteTransactionBlock({
          transactionBlock: tx,
          signer: this.#keypair,
          requestType: "WaitForLocalExecution", // or 'WaitForEffectsCert'
          options: {
            showEffects: true,
          },
        });
        // console.log(result);
        // console.log(`[${this.#walletAddress}] Claimed Ocean successfully.`);
        this.#eventEmitter.emit("claimSucess", {
          address: this.#walletAddress,
          result,
        });
        return result;
      } catch (error) {
        // console.error(error);
        this.#eventEmitter.emit("claimError", {
          address: this.#walletAddress,
          error: "Claim failed, retry!",
        });
        return null;
      }
    } else {
      // console.log(`[${this.#walletAddress}] Not claimable yet.`);
      this.#eventEmitter.emit("claimError", {
        address: this.#walletAddress,
        error: "Not claimable yet.",
      });
      return null;
    }
  };

  autoClaim = async () => {
    if (this.#autoClaim) {
      if (this.#timerUpdateRemainingTime) {
        clearInterval(this.#timerUpdateRemainingTime);
      }
      await this.claim();
      await sleep(1000 * 10);
      await this.syncInfo();
      if (this.#timerClaim) {
        clearTimeout(this.#timerClaim);
      }
      this.#timerClaim = setTimeout(
        this.autoClaim,
        this.#remainingTimeToClaim + 1000
      );
      const humanRemainingTimeToClaim = new Moment(
        this.#nextClaimable
      ).fromNow();
      this.#timerUpdateRemainingTime = setInterval(
        () =>
          this.#eventEmitter.emit("remainingTimeToClaimChanged", {
            address: this.#walletAddress,
            remainingTimeToClaim: humanRemainingTimeToClaim,
          }),
        1000
      );
      // console.log(
      //   `[${this.#walletAddress}] Next claim in ${humanRemainingTimeToClaim}.`
      // );
    }
  };
}

export { OceanClaimer };
