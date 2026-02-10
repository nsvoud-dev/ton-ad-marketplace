/**
 * Генерация GramJS StringSession для TELEGRAM_MTProto_SESSION.
 * Запуск: TELEGRAM_API_ID=... TELEGRAM_API_HASH=... node scripts/gramjs-session.js
 */

const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const readline = require('readline');

const apiId = parseInt(process.env.TELEGRAM_API_ID || '0', 10);
const apiHash = process.env.TELEGRAM_API_HASH || '';

if (!apiId || !apiHash) {
  console.error('Set TELEGRAM_API_ID and TELEGRAM_API_HASH');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const prompt = (q) => new Promise((r) => rl.question(q, r));

async function main() {
  const client = new TelegramClient(new StringSession(''), apiId, apiHash, {});
  await client.start({
    phoneNumber: async () => await prompt('Phone (e.g. +79001234567): '),
    password: async () => await prompt('2FA password (if any): '),
    phoneCode: async () => await prompt('Code from Telegram: '),
    onError: (e) => console.error(e),
  });
  console.log('\nSession string (copy to TELEGRAM_MTProto_SESSION):\n');
  console.log(client.session.save());
  rl.close();
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
