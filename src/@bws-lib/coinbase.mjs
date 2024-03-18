import * as crypto from "crypto";
import fetch from "node-fetch";


async function callCoinbaseExchangeRatesAsync(currency) {

    const response = await fetch("https://api.coinbase.com/v2/exchange-rates?currency=" + currency);
    const result = await response.json();
    return Number(result.data.rates.USD);

}


export { callCoinbaseExchangeRatesAsync }; 