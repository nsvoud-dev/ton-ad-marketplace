export const config = {
  port: parseInt(process.env.API_PORT ?? '3001', 10),
  host: process.env.API_HOST ?? '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  tonNetwork: process.env.TON_NETWORK ?? 'mainnet',
  escrowMnemonic: process.env.TON_ESCROW_MNEMONIC ?? '',
} as const;
