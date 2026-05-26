import { NormalizedAsset, NormalizedTransactionType } from '../types';

/**
 * Maps raw asset strings (case-insensitive) to normalized asset symbols.
 * Extend this map to support additional assets.
 */
export const ASSET_NORMALIZATION_MAP: Record<string, NormalizedAsset> = {
  btc: NormalizedAsset.BTC,
  bitcoin: NormalizedAsset.BTC,
  xbt: NormalizedAsset.BTC,
  eth: NormalizedAsset.ETH,
  ethereum: NormalizedAsset.ETH,
  sol: NormalizedAsset.SOL,
  solana: NormalizedAsset.SOL,
  usdt: NormalizedAsset.USDT,
  tether: NormalizedAsset.USDT,
  matic: NormalizedAsset.MATIC,
  polygon: NormalizedAsset.MATIC,
  link: NormalizedAsset.LINK,
  chainlink: NormalizedAsset.LINK,
};

/**
 * Maps raw transaction type strings (case-insensitive) to normalized types.
 * Handles synonyms and directional pairs.
 */
export const TYPE_NORMALIZATION_MAP: Record<string, NormalizedTransactionType> = {
  buy: NormalizedTransactionType.BUY,
  purchase: NormalizedTransactionType.BUY,
  sell: NormalizedTransactionType.SELL,
  dispose: NormalizedTransactionType.SELL,
  sale: NormalizedTransactionType.SELL,
  transfer_in: NormalizedTransactionType.TRANSFER_IN,
  transfer_out: NormalizedTransactionType.TRANSFER_OUT,
  deposit: NormalizedTransactionType.TRANSFER_IN,
  withdrawal: NormalizedTransactionType.TRANSFER_OUT,
  withdraw: NormalizedTransactionType.TRANSFER_OUT,
};

/**
 * Defines which transaction types are considered "counterparts" of each other
 * for cross-source reconciliation (user TRANSFER_OUT ↔ exchange TRANSFER_IN).
 */
export const TRANSFER_COUNTERPART_MAP: Partial<
  Record<NormalizedTransactionType, NormalizedTransactionType>
> = {
  [NormalizedTransactionType.TRANSFER_OUT]: NormalizedTransactionType.TRANSFER_IN,
  [NormalizedTransactionType.TRANSFER_IN]: NormalizedTransactionType.TRANSFER_OUT,
};
