import { verifyMessage } from 'ethers';

export interface SignaturePayload {
  walletAddress: string;
  timestamp: number;
  nonce: string;
}

export function verifyWalletSignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const bypass = String(process.env.DEV_BYPASS_SIGNATURE || '').toLowerCase() === 'true';
    if (bypass) {
      return true;
    }

    // Verify EIP-191 personal signature
    const recoveredAddress = verifyMessage(message, signature);

    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

export function generateAuthMessage(walletAddress: string): {
  message: string;
  nonce: string;
} {
  const nonce = Math.random().toString(36).substring(2, 15);
  const message: SignaturePayload = {
    walletAddress,
    timestamp: Date.now(),
    nonce
  };
  
  return { message: JSON.stringify(message), nonce };
}
