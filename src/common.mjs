
import { ethers } from "ethers";

import { sendEventBridgeMessageAsync } from "./@bws-lib/AWSWrapper.mjs";

import { getNetworkGasPrice, getNetworkCurrency } from "./@bws-lib/network.mjs";
import { callCoinbaseExchangeRatesAsync } from "./@bws-lib/coinbase.mjs";

import { log, FatalError } from "@blockchain-web-services/bws-library-node-common";


function validateRequest(request) {

    if (!request) {
        throw new FatalError("request is null");
    }

    if (request.operation !== "new" && request.operation !== "list" && request.operation !== "transfer") {
        throw new FatalError("invalid operation");
    }
}

async function sendSnapshotEventAsync(request) {
    return await sendEventBridgeMessageAsync(
        {
            jobId: request.jobId
        },
        process.env.ENVIRONMENT + "-bws-api-solutions-snapshot-eventbus",
        request.solution,
        "snapshot"
    );
}

async function getEstimateAsync(request, config, contract) {


    let gasEstimate = 0;
    try {
        switch (request.operation) {
            case "new": {
                // TODO: use a sample IPFS URI (as the NFT is not created yet)
                // we use the image url for now to estimate the gas
                const uri = request.parameters.image;

                // await contract.connect();
                const safeMintGas = await contract.mintWithTokenURI.estimateGas(config.contractOwner, uri);

                gasEstimate = Number(safeMintGas);
                break;
            }
            case "transfer": {
                const toAddress = request.parameters.toAddress;

                // await contract.connect();
                const safeMintGas = await contract.safeTransferFrom.estimateGas(config.contractOwner, toAddress);

                gasEstimate = Number(safeMintGas);
                break;
            }
            case "list":
                // ! for clarity: the list handler do not call the contract but user may call estimate also for this operation.
                gasEstimate = 0;
                break;
        }

        //   console.log("gasEstimate: ", gasEstimate);
    } catch (error) {
        throw new Error(`error in estimating gas ${error}`);
    }

    return gasEstimate;
}

async function getContractCallEstimatesAsync(contract, request, provider) {
    let estimates = {
        estimatedGas: 0, //Gwei
        estimatedInNetworkCurrency: 0,
        networkCurrencyPrice: 0,
        usd: 0,
    };

    // Estimate gas
    const gasEstimateNum = await getEstimateAsync(contract, request);
    //   console.log("gasEstimateNum: ", gasEstimateNum);

    // Get network-specific gas price
    // TODO: replace with real-time value
    const currentGasPriceInGwei = await getNetworkGasPrice(provider);
    //   console.log("currentGasPriceInGwei :", currentGasPriceInGwei);

    // Get the currency used in the network
    let networkCurrency = getNetworkCurrency(request.network);
    //   console.log("networkCurrency :", networkCurrency);
    // Get the current exchange rate for the network currency to USD
    const networkCurrencyPrice = await callCoinbaseExchangeRatesAsync(networkCurrency);
    //   console.log("networkCurrencyPrice: :", networkCurrencyPrice);

    estimates.estimatedGas = gasEstimateNum;
    // Calculate total cost in network currency
    estimates.estimatedInNetworkCurrency = gasEstimateNum * currentGasPriceInGwei * 1e-9;
    estimates.networkCurrencyPrice = networkCurrencyPrice; //token price
    estimates.usd = estimates.estimatedInNetworkCurrency * networkCurrencyPrice;
    //   console.log("estimates.usd : ", estimates.usd);
    //Format the value into 6 decimals
    estimates.usd = estimates.usd.toFixed(6);

    return estimates;
}

async function getGasLimit(request, config, contract, provider) {
    try {
        let gasLimit;
        // Fetch the balance
        const balanceWei = await provider.getBalance(config.contractOwner);
        const balanceGWei = ethers.formatUnits(balanceWei.toString(), "gwei");
        console.log("balanceGWei : ", balanceGWei);

        //get estimate
        const gasEstimateNum = await getEstimateAsync(request, config, contract);

        //Increase gasLimit
        gasLimit = gasEstimateNum + 50000;
        console.log("gasLimit: ", gasLimit);

        if (balanceGWei < gasLimit) {
            throw new FatalError("no funds to call operation. Estimated gasLimit:" + gasLimit + ", balance:" + balanceGWei);
        } else {
            return gasLimit;
        }
    } catch (error) {
        throw new Error(`Error in getGasLimit: ${error}`);
    }
}

export { validateRequest, sendSnapshotEventAsync, getEstimateAsync, getGasLimit, getContractCallEstimatesAsync };