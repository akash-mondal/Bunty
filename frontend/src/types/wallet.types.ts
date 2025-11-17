export interface WalletConnection {
  address: string;
  network: 'testnet' | 'mainnet';
  connected: boolean;
  balance?: number;
}

export interface TransactionData {
  to: string;
  value: string;
  data?: string;
}

export interface WalletContextType {
  wallet: WalletConnection | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (txData: TransactionData) => Promise<string>;
  getBalance: () => Promise<number>;
}

// Lace Wallet API types (based on CIP-30 standard)
export interface LaceWalletAPI {
  enable: () => Promise<LaceAPI>;
  isEnabled: () => Promise<boolean>;
  name: string;
  icon: string;
  apiVersion: string;
}

export interface LaceAPI {
  getNetworkId: () => Promise<number>;
  getUsedAddresses: () => Promise<string[]>;
  getUnusedAddresses: () => Promise<string[]>;
  getChangeAddress: () => Promise<string>;
  getRewardAddresses: () => Promise<string[]>;
  getBalance: () => Promise<string>;
  signTx: (tx: string, partialSign?: boolean) => Promise<string>;
  signData: (address: string, payload: string) => Promise<{ signature: string; key: string }>;
  submitTx: (tx: string) => Promise<string>;
}

declare global {
  interface Window {
    cardano?: {
      lace?: LaceWalletAPI;
      [key: string]: LaceWalletAPI | undefined;
    };
  }
}
