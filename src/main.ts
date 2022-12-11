import { ethers } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

const abi = ['function totalBurned() public view returns (uint256)'];

async function fetchBurnedTokens() {
  const provider = new JsonRpcProvider(process.env.RPC_URL);
  const contract = new ethers.Contract(
    process.env.CONTRACT_ADDR as string,
    abi,
    provider
  );

  const totalBurned = await contract.totalBurned();

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(totalBurned.div((1e18).toString()).toNumber());
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);

  async function updateBotName() {
    const name = await fetchBurnedTokens();
    client.guilds.cache.forEach((guild) => {
      guild.members.me?.setNickname(name);
    });
  }

  setTimeout(() => {
    updateBotName();
    setTimeout(updateBotName, Number(process.env.INTERVAL as string) * 1000);
  }, 0);
});
client.login(process.env.APP_KEY);
