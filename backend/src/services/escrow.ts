/**
 * TON Escrow Service — уникальный депозитный адрес на каждую сделку.
 * Ключ выводится детерминированно из mnemonic + dealId для изоляции средств.
 */

import { createHash } from 'crypto';
import { mnemonicToSeed } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';
import nacl from 'tweetnacl';

export interface EscrowInfo {
  address: string;
  amountNano: string;
}

/**
 * Генерирует уникальный escrow-адрес для сделки.
 * Детерминировано: один и тот же dealId всегда даёт один и тот же адрес.
 */
export async function generateEscrowAddressForDeal(dealId: string): Promise<string | null> {
  const mnemonic = process.env.TON_ESCROW_MNEMONIC;
  if (!mnemonic?.trim()) {
    console.warn('TON_ESCROW_MNEMONIC not set — unique escrow disabled');
    return null;
  }

  try {
    const seed = await mnemonicToSeed(mnemonic.trim().split(/\s+/));
    const dealSeed = createHash('sha256')
      .update(seed)
      .update(Buffer.from(dealId, 'utf8'))
      .digest();
    const keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(dealSeed));

    const wallet = WalletContractV4.create({
      workchain: 0,
      publicKey: Buffer.from(keyPair.publicKey),
    });

    return wallet.address.toString();
  } catch (e) {
    console.error('generateEscrowAddressForDeal failed:', e);
    return null;
  }
}

/**
 * Возвращает escrow-инфо для сделки. Адрес должен быть уже сохранён в Deal.
 */
export function getEscrowInfoForDeal(escrowAddress: string | null, amountNano: string): EscrowInfo | null {
  if (!escrowAddress) return null;
  return { address: escrowAddress, amountNano };
}

/**
 * Проверяет баланс на escrow-адресе (через TON API).
 */
export async function getEscrowBalance(address: string): Promise<bigint> {
  const endpoint =
    process.env.TON_NETWORK === 'testnet'
      ? 'https://testnet.toncenter.com/api/v2'
      : 'https://toncenter.com/api/v2';
  try {
    const res = await fetch(`${endpoint}/getAddressBalance?address=${encodeURIComponent(address)}`);
    const data = (await res.json()) as { result: string };
    return BigInt(data.result ?? '0');
  } catch (e) {
    console.error('getEscrowBalance failed:', e);
    return 0n;
  }
}
