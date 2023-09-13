
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const moment = require("moment")
const axios = require("axios")

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


class BinanceAPI {

    getSignature(queryString) {

        const signature = crypto
            .createHmac(`sha256`, SECRETKEY)
            .update(queryString)
            .digest(`hex`);

        return signature
    }

    generateQueryString(params){
        let a = Object.keys(params).map(key => key + '=' + params[key]).join('&');
        return a
    }

    async requestPrivate(endpoint, param, method){

        try {
            param.recvWindow = 5000
            param.timestamp = moment().valueOf()

            
            let URL = `https://api.binance.com${endpoint}`
            let config = {
                headers: {
                    'X-MBX-APIKEY': APIKEY
                }
            };
            param.signature = this.getSignature(this.generateQueryString(param))
            config.params = param

            let result = null
            if (method === "get"){
                result =  await axios.get(URL, config)
            }else if (method === "post"){
                result =  await axios.post(URL, null, config)
            }

            return (result)? result.data: result

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async requestPublic(endpoint, params){
        try {

            let URL = `https://api.binance.com${endpoint}`
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


    async getBidPriceOnBinance(Coin){
        let price = 0;
        try {
            let response = await this.requestPublic('/api/v3/ticker/price', {
                symbol: Coin.toUpperCase() + "BTC"
            })

            price = response.price
            
        } catch (error) {
            console.log(error)
            this.getBidPriceOnBinance(Coin)
        }

        return price
    }

    async getAskPriceOnBinance(Coin){
        let price = 0;
        try {
            let response = await this.requestPublic('/api/v3/ticker/price', {
                symbol: Coin.toUpperCase() + "BTC"
            })

            price = response.price
            
        } catch (error) {
            console.log(error)
            this.getBidPriceOnBinance(Coin)
        }

        return price
    }

    async getSellOrderBookOnBinance(Coin){
        let df = {
            Price: [],
            Qty: [],
            Total: []
        };
        try {
            let response = await this.requestPublic('/api/v1/depth', {
                symbol: Coin.toUpperCase() + "BTC"
            })

            const bids = response.bids;

            for (const bid of bids) {
                const price = parseFloat(bid[0]);
                    const qty = parseFloat(bid[1]);
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

    async getBuyOrderBookOnBinance(Coin){
        let df = {
            Price: [],
            Qty: [],
            Total: []
        };
        try {
            let response = await this.requestPublic('/api/v1/depth', {
                symbol: Coin.toUpperCase() + "BTC"
            })

            const asks = response.asks;

            for (const ask of asks) {
                const price = parseFloat(ask[0]);
                    const qty = parseFloat(ask[1]);
                    const total = price * qty;

                    df.Price.push(price);
                    df.Qty.push(qty);
                    df.Total.push(total);
            }
            
        } catch (error) {
            console.log(error)
            this.getBuyOrderBookOnBinance(Coin)
        }
        return df;
    }

    async getSellOrderBookVolumeOnBinance(Coin, SellingPrice){
        let orderBookVolume2 = 0;
        let OB = {
            Price: [],
            Qty: [],
            Total: []
        };

        try {
            OB = await getSellOrderBookOnBinance(Coin);

            // Filter by SellingPrice
            OB.Price = OB.Price.filter((price, index) => price >= SellingPrice);
            OB.Qty = OB.Qty.slice(0, OB.Price.length);
            OB.Total = OB.Total.slice(0, OB.Price.length);

            // Calculate the sum of 'Total'
            orderBookVolume2 = OB.Total.reduce((acc, total) => acc + total, 0);
        } catch (error) {
            console.error(error);
            await new Promise((resolve) => setTimeout(resolve, 15000)); // Retry after 15 seconds
            orderBookVolume2 = await getSellOrderBookVolumeOnBinance(Coin, SellingPrice);
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

    async populateBinancePriceList(){
        let control = false;
        let markets2 = []
        let asks2 = []
        let bids2 = []
        try {

            let data = await this.requestPublic('/api/v1/ticker/24hr', {
            })

            const [coin, status] = await this.getBinanceTradingStatus();

            for (let i = 0; i < data.length; i++) {
                let cont = false;
    
                try {
                    for (let j = 0; j < coin.length; j++) {
                        if (coin[j] && data[i].symbol.includes(coin[j]) && status[j] === "TRADING") {
                            cont = true;
                            break;
                        }
                    }
    
                    if (cont) {
                        continue;
                    }
    
                    const sym = String(data[i].symbol);
                    const Coin1 = sym.slice(0, -3);
                    const Coin2 = sym.slice(-3);
                    markets2.push(`${Coin1}-${Coin2}`);
                    asks2.push(parseFloat(data[i].askPrice));
                    bids2.push(parseFloat(data[i].bidPrice));
                } catch (error) {
                    markets2.push(String(data[i].symbol));
                    asks2.push(0);
                    bids2.push(0);
                }
            }
            
        } catch (error) {
            console.error(error);
            control = true;
        }

        const BinancePriceList = {
            symbol: markets2,
            symbol2: markets2,
            AskPrice: asks2,
            BidPrice: bids2,
        };

        return BinancePriceList;
    }

    async getBinanceAddress(CointBought){

        try {
            
            let response = await this.requestPrivate('/sapi/v1/capital/deposit/address', {
                coin: CointBought
            }, "get")

            return response.address

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async sellOnBinance(pair){
        const [Coin1, Coin2] = pair.split("-");

        try {

            let bal = await getBalanceOnBinance(Coin1)
            let A = `${this.getStepSize(Coin1+Coin2)}`
            let qty = 0;
            const indexOfFirstNonZero = A.replace('.', '').indexOf('1');

            if (indexOfFirstNonZero === 0) {
                qty = String(Math.floor(bal));
            } else {
                const d = indexOfFirstNonZero;
                qty = String(roundDown(bal, d));
            }

            let order = await this.requestPrivate("/api/v3/order",{
                symbol: String(Coin1+Coin2),
                side: "SELL",
                type: "MARKET",
                quantity: qty
            }, "post")

            console.log(data)
            return order
            
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async getBalanceOnBinance(coin){
        let Balance = 0.0;
        try {
            let data = await this.requestPrivate("/api/v3/account", {}, "get")

            for (let i = 0; i < data.balances.length; i++) {
                if (data.balances[i].asset === coin) {
                    Balance = parseFloat(data.balances[i].free);
                    break; // Exit the loop once the balance is found
                }
            }
            return Balance;
            
        } catch (error) {
            console.log(error)
        }

        return Balance;
    }

    async downloadStepSize(){
        try {
            let data = await this.requestPublic("/api/v1/exchangeInfo", {})

            console.log(data);

            const Symbols = [];
            const Stepsizes = [];

            for (let i = 0; i < data.symbols.length; i++) {
                Symbols.push(data.symbols[i].symbol);
                Stepsizes.push(parseFloat(data.symbols[i].filters[1].stepSize));
            }

            const StepSizes = {
                symbol: Symbols,
                step: Stepsizes,
            };

            console.log(StepSizes);

            const jsonContent = JSON.stringify(StepSizes, null, 2);

            fs.writeFileSync('StepSizes.json', jsonContent);
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    getStepSize(Coin){
        try {
            const data = fs.readFileSync('StepSizes.json', 'utf8');
            const df = JSON.parse(data);
    
            const foundCoin = df.find((entry) => entry.symbol === Coin);
    
            if (foundCoin) {
                return parseFloat(foundCoin.step);
            } else {
                // Handle the case when the coin is not found
                console.error(`Coin ${Coin} not found in StepSizes.json`);
                return null; 
            }
        } catch (err) {
            console.error(err);
            // Handle errors when reading the file
            return null; // or throw an error
        }
    }

    async buyOnBinance(pair, Price){
        const [Coin1, Coin2] = pair.split("-");

        try {

            let bal = await getBalanceOnBinance(Coin2)
            let A = `${this.getStepSize(Coin1+Coin2)}`
            let qty = 0;
            bal = (bal*0.95) / Price

            const indexOfFirstNonZero = A.replace('.', '').indexOf('1');

            if (indexOfFirstNonZero === 0) {
                qty = String(Math.floor(bal));
            } else {
                const d = indexOfFirstNonZero;
                qty = String(roundDown(bal, d));
            }

            let order = await this.requestPrivate("/api/v3/order",{
                symbol: String(Coin1+Coin2),
                side: "BUY",
                type: "MARKET",
                quantity: qty
            }, "post")

            console.log(data)
            return order
            
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async getPriceOfRecentTradeOnBinance(pair){
        const [Coin1, Coin2] = pair.split("-");

        try {

            let data = this.requestPrivate("/api/v3/myTrades", {
                symbol: String(Coin1 + Coin2),
                limit:1
            })

            if (parseFloat(data[0].qty) === 0) {
                return getPriceOfRecentTradeOnBinance(pair);
            } else {
                return parseFloat(data[0].price);
            } 
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async getBinanceTradingStatus(){

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

    async getBinanceCoinStatus(){

        let coin = []
        let status = []

        try {
            let data = await this.requestPrivate("/sapi/v1/asset/assetDetail", {}, "get")
    
            for (const key in data) {
               coin.push(key);
               status.push(data.withdrawStatus)
            }
            
            return [coin, status]
                
        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async withdrawFromBinance(Coin,SaleOrPurchase,address, qty){
        console.log("WithdrawFromBinance...")
        try {

            let balance = await this.getBalanceOnBinance(Coin)

            if (balance <=0)
            return false;

            let param = {}

            if (SaleOrPurchase == 'Purchase'){
                param = {
                    asset: Coin, 
                    address: address, 
                    amount: String(balance),
                    name: "Binance"
                }
            }else{
                param = {
                    asset: Coin, 
                    address: address, 
                    amount: String(qty),
                    name: "Binance"
                }
            }

            await this.requestPrivate("/sapi/v1/capital/withdraw/apply", param, "post")

            return true;
            
        } catch (error) {
            this.withdrawFromBinance(Coin,SaleOrPurchase,address, qty)
        }
    }

    async initiateOnBinance(Pair, Price, address){
        try {
            const [Coin1, Coin2] = pair.split("-");
            await this.buyOnBinance(Pair, Price);
            await this.withdrawFromBinance(Coin1, "Purchase", address, "")
        } catch (error) {
            throw error
            console.log(error)
        }
    }

    async closeOnBinance(Pair, Price, address){
        try {
            const [Coin1, Coin2] = pair.split("-");
            const A = await his.getBalanceOnBinance(Coin2)
            await this.sellOnBinance(Pair)

            const B = await this.getBalanceOnBinance(Coin2)
            await this.withdrawFromBinance(Coin2, "Sale", address, B-A)
        } catch (error) {
            
        }
    }
}

module.exports = new BinanceAPI()