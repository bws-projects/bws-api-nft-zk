import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const pinataSDK = require('@pinata/sdk');


/**
 * Uplaod NFT metadata into IPFS server and return ipfs url.
 * @param {ipfsKey} string Pinata API key
 * @param {ipfsSecretKey} string Pinata API Secret key
 * @param {nftJson} nftJson NFT json
 * @returns IPFS Hash
 */
async function uploadJSONToIPFSAsync(ipfsKey, ipfsSecretKey, nftJson) {

  const pinata = new pinataSDK({ pinataApiKey: ipfsKey, pinataSecretApiKey: ipfsSecretKey });
  return pinata.pinJSONToIPFS(nftJson).then((result) => {
    return result.IpfsHash;
  }).catch((err) => {
    console.log(err);
    throw new Error(`error in uploading to ipfs ${err}`);
  });
}

export { uploadJSONToIPFSAsync };
