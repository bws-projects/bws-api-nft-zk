import { ethers } from "ethers";
import { callCoinbaseExchangeRatesAsync } from "./coinbase.mjs";
const { BigNumber } = ethers;

const wei = ethers.parseUnits("1", "wei");

import { log, FatalError } from "@blockchain-web-services/bws-library-node-common";

const timeout = (ms) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error("Timed out"));
    }, ms);
  });
};

const getTransactionReceiptAsync = async (txHash, provider) => {
  return provider.getTransactionReceipt(txHash);
};

const getTransactionReceiptWithTimeoutAsync = async (txHash, provider, timeoutInMillis) => {
  try {
    return await Promise.race([
      getTransactionReceiptAsync(txHash, provider),
      timeout(timeoutInMillis ?? 5000)
    ]);
  } catch (error) {
    if (error.message === "Timed out") {
      console.error("Transaction Timeout Error: ", error);
    }
    else {
      throw new FatalError(`Error in getTransactionReceiptWithTimeoutAsync ${error}`);
    }
  }
};

function getNetworkCurrency(network) {
  var networkCurrency = "ETH";
  switch (network) {
    case "ethereum":
    case "sepolia":
      networkCurrency = "ETH";
      break;
    case "polygon":
    case "mumbai":
      networkCurrency = "MATIC";
      break;
    default:
      throw new Error("network not supported");
  }
  return networkCurrency;
}

async function getNetworkGasPrice(provider) {
  // Get the current gas price.
  const gasPrice = (await provider.getFeeData()).gasPrice;

  // Convert the gas price from wei to Gwei
  const gasPriceInGwei = ethers.formatUnits(gasPrice.toString(), "gwei");
  return gasPriceInGwei;
}



export {
  wei,
  timeout,
  getTransactionReceiptAsync,
  getTransactionReceiptWithTimeoutAsync,
  getNetworkCurrency,
  getNetworkGasPrice,
};
