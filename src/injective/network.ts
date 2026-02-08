import { Network } from '@injectivelabs/networks';

export function getNetworkFromEnv(): Network {
  const raw = (process.env.INJ_NETWORK || 'mainnet').toLowerCase();

  switch (raw) {
    case 'testnet':
      return Network.Testnet;
    case 'devnet':
      return Network.Devnet;
    case 'devnet1':
      return Network.Devnet1;
    case 'devnet2':
      return Network.Devnet2;
    case 'devnet3':
      return Network.Devnet3;
    case 'local':
      return Network.Local;
    case 'mainnet':
    default:
      return Network.Mainnet;
  }
}
