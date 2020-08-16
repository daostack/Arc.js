// the version of the redeemer contract to use.
// we can specify multiple versions, and try to find them in the order given
export const PACKAGE_VERSION = [0, 1, 6]
export const LATEST_ARC_VERSION = `0.1.2-rc.${PACKAGE_VERSION[2]}`
export const ABI_DIR = './abis'
export const REDEEMER_CONTRACT_VERSIONS = [
  LATEST_ARC_VERSION
]
// used for a workaround
export const CONTRIBUTION_REWARD_DUMMY_VERSION = LATEST_ARC_VERSION
