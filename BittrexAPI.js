
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const moment = require("moment")
const axios = require("axios")
const { v4: uuidv4 } = require('uuid');

const localDir = path.join(__dirname, '../');
const folderName = path.join(localDir, '_log');

const SECRETKEY = "";
const APIKEY = "";

try {
    fs.mkdirSync(folderName);
} catch (e) {
    if (e.code !== 'EEXIST') {
        console.error(`Failed to create folder '${folderName}': ${e}`);
    }
}

const current_time = new Date().toLocaleString();

fs.appendFileSync(path.join(folderName, 'running.log'), current_time + '\n');


class BitrexAPI {

    getSignature(presign) {

        const signature = crypto
            .createHmac(`sha512`, SECRETKEY)
            .update(queryString)
            .digest(`hex`);

        return signature
    }

    generateContentHash(body){
        createHash("sha512").update(JSON.stringify(body)).digest("hex");
    }

    generateQueryString(params){
        let a = Object.keys(params).map(key => key + '=' + params[key]).join('&');
        return a
    }

    async requestPrivate(endpoint, body, method){

        try {

            let timestamp = moment().valueOf();
            let contentHash = this.generateContentHash(body)
            let URL = `https://api.Bittrex.com${endpoint}`
            let presign = [timestamp, URL, method, contentHash].join('')
            let config = {
                Headers: {
                    "Api-Key": APIKEY,
                    "Api-Timestamp": timestamp,
                    "Api-Content-Hash": contentHash,
                    "Api-Signature": this.getSignature(presign)
                }
            };

            let result = null
            if (method === "get"){
                config.param = this.generateQueryString(body)
                result =  await axios.get(URL, config)
            }else if (method === "post"){
                result =  await axios.post(URL, body, config)
            }else if (method === "delete"){
                result =  await axios.delete(URL, body, config)
            }

            return (result)? result.data: result

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async requestPublic(endpoint, params){
        try {

            let URL = `https://bittrex.com${endpoint}`
            let config = {
            };
            config.params = params
            let result =  await axios.get(URL, config)
            return result.data
        } catch (error) {
            console.log(error)
            throw error
        }
    }


    async getBidPriceOnBittrex(Coin){
        let price = 0;
        try {
            let response = await this.requestPublic(`/v3/markets/BTC-${Coin}/ticker`, {})
            price = response.bidRate
            
        } catch (error) {
            console.log(error)
            this.getBidPriceOnBittrex(Coin)
        }

        return price
    }

    async getAskPriceOnBittrex(Coin){
        let price = 0;
        try {
            let response = await this.requestPublic(`/v3/markets/BTC-${Coin}/ticker`, {})
            price = response.askRate
            
        } catch (error) {
            console.log(error)
            this.getBidPriceOnBittrex(Coin)
        }

        return price
    }

    async getSellOrderBookOnBittrex(Coin){
        let df = {
            Price: [],
            Qty: [],
            Total: []
        };
        try {
            let response = await this.requestPublic(`/v3/markets/BTC-${Coin}/orderbook`, {
            })

            const bids = response.bid;

            for (const bid of bids) {
                const price = parseFloat(bid["rate"]);
                    const qty = parseFloat(bid["quantity"]);
                    const total = price * qty;

                    df.Price.push(price);
                    df.Qty.push(qty);
                    df.Total.push(total);
            }
            
        } catch (error) {
            console.log(error)
            this.getSellOrderBook(Coin)
        }
        return df;
    }

    async getBuyOrderBookOnBittrex(Coin){
        let df = {
            Price: [],
            Qty: [],
            Total: []
        };
        try {
            let response = await this.requestPublic(`/v3/markets/BTC-${Coin}/orderbook`, {
            })

            const asks = response.ask;

            for (const ask of asks) {
                const price = parseFloat(ask["rate"]);
                    const qty = parseFloat(ask["quantity"]);
                    const total = price * qty;

                    df.Price.push(price);
                    df.Qty.push(qty);
                    df.Total.push(total);
            }
            
        } catch (error) {
            console.log(error)
            this.getBuyOrderBookOnBittrex(Coin)
        }
        return df;
    }

    async getSellOrderBookVolumeOnBittrex(Coin, SellingPrice){
        let orderBookVolume2 = 0;
        let OB = {
            Price: [],
            Qty: [],
            Total: []
        };

        try {
            OB = await getSellOrderBookOnBittrex(Coin);

            // Filter by SellingPrice
            OB.Price = OB.Price.filter((price, index) => price >= SellingPrice);
            OB.Qty = OB.Qty.slice(0, OB.Price.length);
            OB.Total = OB.Total.slice(0, OB.Price.length);

            // Calculate the sum of 'Total'
            orderBookVolume2 = OB.Total.reduce((acc, total) => acc + total, 0);
        } catch (error) {
            console.error(error);
            await new Promise((resolve) => setTimeout(resolve, 15000)); // Retry after 15 seconds
            orderBookVolume2 = await getSellOrderBookVolumeOnBittrex(Coin, SellingPrice);
        }

        return orderBookVolume2;
    }

    roundDown(n, d) {
        d = parseInt('1' + '0'.repeat(d));
        return Math.floor(n * d) / d;
    }

    roundUp(n, d) {
        d = parseInt('1' + '0'.repeat(d));
        return Math.ceil(n * d) / d;
    }

    print_full(x) {
        for (const row of x) {
            console.log(row);
        }
    }

    async populateBittrexPriceList(){
        let control = false;
        let markets = []
        let markets3 = []
        let asks = []
        let bids = []
        try {

            let data = await this.requestPublic('/v3/markets/tickers', {
            })

            const [bittcoin, bitstatus] = await this.getBittrexCoinStatus();

            for (let i = 0; i < data.length; i++) {
                let cont = false;
    
                try {
                    const marketName = String(data[i].symbol);
                    const [Coin1, Coin2] = marketName.split('-');
                    
                    for (let j = 0; j < bittcoin.length; j++) {
                        if (bittcoin[j] && marketName.includes(bittcoin[j]) && bitstatus[j] === "ONLINE") {
                            cont = true;
                            break;
                        }
                    }
    
                    if (cont) {
                        continue;
                    }
    
                    markets.push(Coin2 + Coin1);
                    markets3.push(Coin2 + '-' + Coin1);
                    asks.push(parseFloat(data[i].askRate));
                    bids.push(parseFloat(data[i].bidRate));
                } catch (error) {
                    markets.push(Coin2 + Coin1);
                    markets3.push(Coin2 + '-' + Coin1);
                    asks.push(0);
                    bids.push(0);
                }
            }
    
        } catch (error) {
            console.error(error);
            control = true;
        }

        const BittrexPriceList = {
            symbol: markets3,
            symbol2: markets3,
            AskPrice: asks,
            BidPrice: bids,
        };

        return BittrexPriceList;
    }

    async buyOnBittrex(pair, Price){
        const [Coin1, Coin2] = pair.split("-");

        try {

            let bal = await getBalanceOnBittrex(Coin2)
            bal = (bal*0.95) / Price


            let qty = String(Math.floor(bal));


            let order = await this.requestPrivate("/v3/orders",{
                "marketSymbol": String(Coin2) +"-"+String(Coin1),
                "direction": "BUY",
                "type": "LIMIT",
                "quantity": parseFloat(qty),
                "limit": parseFloat(Price),
                "clientOrderId": uuidv4,
                "useAwards": false
              }, "post")

            console.log(data)
            return order
            
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async sellOnBittrex(pair){
        const [Coin1, Coin2] = pair.split("-");

        try {

            let bal = await GetBittrexCoinBalance(Coin2)

            let qty = String(Math.floor(bal));


            let order = await this.requestPrivate("/v3/orders",{
                "marketSymbol": String(Coin2) +"-"+String(Coin1),
                "direction": "SELL",
                "type": "LIMIT",
                "quantity": parseFloat(qty),
                "limit": parseFloat(Price),
                "clientOrderId": uuidv4,
                "useAwards": false
              }, "post")

            console.log(data)
            return order
            
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async GetBittrexCoinBalance(coin){
        let Balance = 0.0;
        try {
            let data = await this.requestPrivate(`/v3/balances/${Coin}`, {}, "get")
            Balance = data.available
            return Balance;
            
        } catch (error) {
            console.log(error)
        }

        return Balance;
    }

    async getBittrexAddress(coin){

        try {
            let address = ""
            let data = await this.requestPrivate('/v3/addresses', {
            }, "get")

            for (let i = 0; i < data.length; i++) {
                if (data[i].currencySymbol === coin) {
                    address = parseFloat(data[i].cryptoAddress);
                    break; // Exit the loop once the balance is found
                }
            }

            return address

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async getRecentTradeValueBittrex(pair){
        // const [Coin1, Coin2] = pair.split("-");

        try {

            let data = this.requestPrivate(`/v3/orders/closed`, {
                marketSymbol: pair
            },"get")

            if (data.length > 0){
                return data[0].quantity
            }else{
                return 0
            }
            
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async getOpenOrdersOnBittrex(){
        try {

            let data = this.requestPrivate("/v3/orders/open", {
            }, "get")

            if (data.length > 0){
                return data[0].id
            }else{
                return null
            }
            
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async cancelTradesOnBittrex(OrderId){

        try {

            let data = this.requestPrivate(`/v3/orders/${OrderId}`, {
            }, "delete")
            console.log(data)
            return true
            
        } catch (error) {
            console.log(error)
            
            throw error
        }
    }

    async getBittrexCoinBalanceForUnsettledTrade(Coin){

        let Balance = 0.0;
        try {
            let data = await this.requestPrivate(`/v3/balances/${Coin}`, {}, "get")
            Balance = data.total
            return Balance;
            
        } catch (error) {
            console.log(error)
        }

        return Balance;

    }
    async getBittrexTradingStatus(){

        let coin = []
        let status = []
        try {

            let data2 = await this.requestPublic("/api/v1/exchangeInfo", {})
            for (let i = 0; i < data2.symbols.length; i++) {
                coin.push(data2.symbols[i].symbol);
                status.push(data2.symbols[i].status);
            }
    
            return [coin, status];
            
        } catch (error) {
            console.log(error)
        }

        return [coin, status];
    }

    async getBittrexCoinStatus(){

        let bittcoin = []
        let bittstatus = []

        try {
            let data = await this.requestPublic("/v3/currencies", {}, "get")
    
            for (let index = 0; index < data.length; index++) {
                const element = data[index];
                bittcoin.push(element.symbol);
                bittstatus.push(element.status)
            }
          
            return [bittcoin, bittstatus]
                
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async withdrawFromBittrex(Coin,SaleOrPurchase,address, qty){
        console.log("WithdrawFromBittrex...")
        try {

            let balance = await this.GetBittrexCoinBalance(Coin)

            if (balance <=0)
            return false;

            let param = {}

            if (SaleOrPurchase == 'Purchase'){
                param = {
                    "currencySymbol": String(Coin),
                    "quantity": balance,
                    "cryptoAddress": address,
                    "fundsTransferMethodId": uuidv4(),
                    "clientWithdrawalId": uuidv4()
                  }
            }else{
                param = {
                    "currencySymbol": String(Coin),
                    "quantity": qty,
                    "cryptoAddress": address,
                    "fundsTransferMethodId": uuidv4(),
                    "clientWithdrawalId": uuidv4()
                  }
            }

            await this.requestPrivate("/v3/withdrawals", param, "post")

            return true;
            
        } catch (error) {
            this.withdrawFromBittrex(Coin,SaleOrPurchase,address, qty)
        }
    }

    async initiateOnBittrex(Pair, Price, address){
        try {
            const [Coin1, Coin2] = pair.split("-");
            await this.buyOnBittrex(Pair, Price);
            await this.withdrawFromBittrex(Coin1, "Purchase", address, "")
        } catch (error) {
            throw error
            console.log(error)
        }
    }

    async closeOnBittrex(pair, price, address) {
        try {
            const [coin1, coin2] = pair.split('-');
    
            let A = await this.GetBittrexCoinBalance(coin2);
            let C = 1;
            let counter = 1;
            let incre = 1;
        
            while (C > 0.5) {
                counter++;
                await this.sellOnBittrex(pair, price);
                C = await this.getBittrexCoinBalanceForUnsettledTrade(coin1);
                console.log(C);
        
                if (C > 0.5) {
                    const openOrders = await this.getOpenOrdersOnBittrex();
                    await this.cancelTradesOnBittrex(openOrders);
                    incre = incre * (counter / 2);
                    const priceAdj2 = 1 - incre;
                }
            }
        
            const B = await this.GetBittrexCoinBalance(coin2);
            await this.withdrawFromBittrex(coin2, 'Sale', address, B - A);
        } catch (error) {
            console.log(error)
        }
        
    }
}

module.exports = new BitrexAPI()