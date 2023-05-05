import { ethers } from 'ethers';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { sprintf } from 'sprintf-js';
import dotenv from 'dotenv';

dotenv.config();

const interval = 30 * 1000;

const statsInfo = [
  {
    contractAddr: '0x19a243aF9099dF1a9044933E2298aEc7319A17D6',
    channelIds: [
      // copy from discord, note: works best with voice channel
      '1104030707648573480',
    ],
    fmt: '📆・NFTs Sold %d',
  },
  {
    contractAddr: '0x60bF843c6DD7b5b02DFF142a89879a93D3f56835',
    channelIds: [
      // copy from discord, note: works best with voice channel
      '1104030740976521267',
    ],
    fmt: '📆・Amps Sold %d/200',
  },
];

const provider = new StaticJsonRpcProvider(
  'https://dataseed2.redlightscan.finance'
);

const abi = ['function totalSupply() public view returns (uint256)'];

const cache: {
  [key: string]: {
    lastUpdated: number;
    totalSupply: number;
  };
} = {};

async function fetchStats() {
  const stats = [];

  for (const { contractAddr, ...info } of statsInfo) {
    const contract = new ethers.Contract(contractAddr, abi, provider);

    stats.push({
      info,
      totalSupply: +(await contract.totalSupply()),
    });
  }

  return stats;
}

async function updateChannelNames(client: Client) {
  const stats = await fetchStats();
  const now = new Date().getTime() / 1000;

  for (const {
    info: { channelIds, fmt },
    totalSupply,
  } of stats) {
    for (const channelId of channelIds) {
      if (totalSupply === cache[channelId]?.totalSupply) {
        continue;
      }

      // Channel names can only be updated once every 10min
      if (now - 600 < cache[channelId]?.lastUpdated) {
        continue;
      }

      client.guilds.cache.forEach(async (guild) => {
        const channel = guild.channels.resolve(channelId);
        if (!channel) {
          return;
        }
        const name = sprintf(fmt, totalSupply);
        try {
          await channel.setName(name);
        } catch (e) {
          console.log('FAILED to update channel name:', e);
          return;
        }
        console.log('Updated name:', channelId, name);
        cache[channelId] = {
          lastUpdated: now,
          totalSupply,
        };
      });
    }
  }
}

function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client
    .once(Events.ClientReady, async (c) => {
      console.log(`Ready! Logged in as ${c.user.tag}`);

      let i = 0;
      (function loop() {
        setTimeout(
          async () => {
            await updateChannelNames(client);
            loop();
          },
          ++i > 1 ? interval : 0
        );
      })();
    })
    .login(process.env.APP_KEY);
}
main();
